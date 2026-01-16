import { ipcMain, BrowserWindow } from 'electron';
import path from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, renameSync, unlinkSync } from 'fs';
import { randomUUID } from 'crypto';
import { execSync } from 'child_process';
import { IPC_CHANNELS } from '../../shared/constants';
import type {
  IPCResult,
  PlanningSession,
  PlanningSessionSummary,
  Methodology,
  PlanningStreamChunk,
  WorkflowStep,
  ArtifactSummary,
  PlanningArtifact,
  ArtifactType,
  ArtifactMetadata,
  ArtifactStatus,
  CheckpointResult,
  CheckpointEntry
} from '../../shared/types';
import { projectStore } from '../project-store';

/**
 * BMAD workflow sequence
 */
const WORKFLOW_SEQUENCE: WorkflowStep[] = ['brief', 'prd', 'architecture', 'epics', 'stories'];

/**
 * Artifact filenames mapping
 */
const ARTIFACT_FILENAMES: Record<string, string> = {
  'product-brief': 'product-brief.md',
  'prd': 'prd.md',
  'architecture': 'architecture.md',
  'epics': 'epics.md'
};

/**
 * Artifact titles mapping
 */
const ARTIFACT_TITLES: Record<string, string> = {
  'product-brief': 'Product Brief',
  'prd': 'PRD',
  'architecture': 'Architecture',
  'epics': 'Epics'
};

/**
 * Get the planning session file path for a project
 */
function getSessionFilePath(projectPath: string): string {
  return path.join(projectPath, '.auto-claude', 'planning', 'session.json');
}

/**
 * Ensure the planning directory exists
 */
function ensurePlanningDir(projectPath: string): void {
  const planningDir = path.join(projectPath, '.auto-claude', 'planning');
  if (!existsSync(planningDir)) {
    mkdirSync(planningDir, { recursive: true });
  }
}

/**
 * Send a stream chunk to all renderer windows
 */
function sendStreamChunk(projectId: string, chunk: PlanningStreamChunk): void {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    win.webContents.send(IPC_CHANNELS.PLANNING_CHAT_STREAM, projectId, chunk);
  }
}

/**
 * Send an error to all renderer windows
 */
function sendChatError(projectId: string, error: string): void {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    win.webContents.send(IPC_CHANNELS.PLANNING_CHAT_ERROR, projectId, error);
  }
}

/**
 * Get the artifact file path for a type
 */
function getArtifactFilePath(projectPath: string, artifactType: ArtifactType): string {
  const planningDir = path.join(projectPath, '.auto-claude', 'planning');
  if (artifactType === 'story') {
    return path.join(planningDir, 'stories');
  }
  const filename = ARTIFACT_FILENAMES[artifactType] || `${artifactType}.md`;
  return path.join(planningDir, filename);
}

/**
 * Parse YAML frontmatter from markdown content
 */
function parseFrontmatter(content: string): { metadata: Partial<ArtifactMetadata>; body: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { metadata: {}, body: content };
  }

  const yamlContent = match[1];
  const body = match[2];

  // Simple YAML parsing (key: value format)
  const metadata: Partial<ArtifactMetadata> = {};
  const lines = yamlContent.split('\n');
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim().replace(/^['"]|['"]$/g, '');

      switch (key) {
        case 'id': metadata.id = value; break;
        case 'title': metadata.title = value; break;
        case 'type': metadata.type = value as ArtifactType; break;
        case 'status': metadata.status = value as ArtifactStatus; break;
        case 'created_at':
        case 'createdAt': metadata.createdAt = value; break;
        case 'updated_at':
        case 'updatedAt': metadata.updatedAt = value; break;
        case 'workflow_step':
        case 'workflowStep': metadata.workflowStep = value as WorkflowStep; break;
        case 'author': metadata.author = value; break;
        case 'approved_at':
        case 'approvedAt': metadata.approvedAt = value; break;
      }
    }
  }

  return { metadata, body };
}

/**
 * Build content with YAML frontmatter
 */
function buildContentWithFrontmatter(metadata: ArtifactMetadata, content: string): string {
  const frontmatter = `---
id: ${metadata.id}
title: ${metadata.title}
type: ${metadata.type}
status: ${metadata.status}
createdAt: ${metadata.createdAt}
updatedAt: ${metadata.updatedAt}
workflowStep: ${metadata.workflowStep}
author: ${metadata.author}${metadata.approvedAt ? `\napprovedAt: ${metadata.approvedAt}` : ''}
---

`;
  return frontmatter + content;
}

/**
 * Get next workflow in sequence
 */
function getNextWorkflow(completedWorkflows: WorkflowStep[]): WorkflowStep | null {
  for (const step of WORKFLOW_SEQUENCE) {
    if (!completedWorkflows.includes(step)) {
      return step;
    }
  }
  return null;
}

/**
 * Map workflow step to artifact type
 */
function workflowStepToArtifactType(step: WorkflowStep): ArtifactType {
  switch (step) {
    case 'brief': return 'product-brief';
    case 'prd': return 'prd';
    case 'architecture': return 'architecture';
    case 'epics': return 'epics';
    case 'stories': return 'story';
    default: return 'product-brief';
  }
}

/**
 * Register all planning-related IPC handlers
 */
export function registerPlanningHandlers(): void {
  // Create a new planning session
  ipcMain.handle(
    IPC_CHANNELS.PLANNING_SESSION_CREATE,
    async (_, projectId: string, projectName: string, methodology: Methodology): Promise<IPCResult<PlanningSession>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      try {
        ensurePlanningDir(project.path);

        const now = new Date().toISOString();
        const session: PlanningSession = {
          id: randomUUID(),
          projectId,
          projectName,
          methodology,
          status: 'idle',
          createdAt: now,
          updatedAt: now,
          currentWorkflow: null,
          currentStep: 0,
          completedWorkflows: [],
          artifacts: {},
          context: {},
          messages: []
        };

        const sessionPath = getSessionFilePath(project.path);
        writeFileSync(sessionPath, JSON.stringify(session, null, 2));

        return { success: true, data: session };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create planning session'
        };
      }
    }
  );

  // Load an existing planning session
  ipcMain.handle(
    IPC_CHANNELS.PLANNING_SESSION_LOAD,
    async (_, projectId: string): Promise<IPCResult<PlanningSession | null>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      try {
        const sessionPath = getSessionFilePath(project.path);

        if (!existsSync(sessionPath)) {
          return { success: true, data: null };
        }

        const content = readFileSync(sessionPath, 'utf-8');
        const session = JSON.parse(content) as PlanningSession;

        // Ensure messages array exists (for backward compatibility)
        if (!session.messages) {
          session.messages = [];
        }

        // Ensure projectId exists (for backward compatibility with Story 1.3)
        if (!session.projectId) {
          session.projectId = projectId;
        }

        return { success: true, data: session };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to load planning session'
        };
      }
    }
  );

  // Save an existing planning session
  ipcMain.handle(
    IPC_CHANNELS.PLANNING_SESSION_SAVE,
    async (_, session: PlanningSession): Promise<IPCResult> => {
      // Find the project by matching session.projectName or by using any available project
      // that has a matching session file (we need to get the project path somehow)
      // Since session doesn't include projectId directly, we'll need to find it
      const projects = projectStore.getProjects();

      let targetProject = null;
      for (const project of projects) {
        const sessionPath = getSessionFilePath(project.path);
        if (existsSync(sessionPath)) {
          try {
            const content = readFileSync(sessionPath, 'utf-8');
            const existingSession = JSON.parse(content) as PlanningSession;
            if (existingSession.id === session.id) {
              targetProject = project;
              break;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }

      if (!targetProject) {
        return { success: false, error: 'Project not found for session' };
      }

      try {
        ensurePlanningDir(targetProject.path);

        // Update the updatedAt timestamp
        const updatedSession = {
          ...session,
          updatedAt: new Date().toISOString()
        };

        const sessionPath = getSessionFilePath(targetProject.path);
        writeFileSync(sessionPath, JSON.stringify(updatedSession, null, 2));

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to save planning session'
        };
      }
    }
  );

  // Handle chat message send (Story 1.2)
  // This handler receives messages and will spawn a backend process
  // For now, we implement a placeholder that echoes back
  // TODO: Task 4 will implement the actual backend planning process
  ipcMain.on(
    IPC_CHANNELS.PLANNING_CHAT_SEND,
    async (_, projectId: string, sessionId: string, message: string) => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        sendChatError(projectId, 'Project not found');
        return;
      }

      try {
        // TODO: In Task 4, this will spawn the backend planning process
        // For now, send a placeholder response to test the streaming infrastructure
        const placeholderResponse = `I received your message: "${message}"\n\nThe backend planning process integration will be implemented in a future update. For now, this is a placeholder response to verify the chat infrastructure is working correctly.\n\nSession ID: ${sessionId}`;

        // Simulate streaming by sending chunks
        const words = placeholderResponse.split(' ');
        for (let i = 0; i < words.length; i++) {
          const chunk: PlanningStreamChunk = {
            type: 'text',
            content: (i > 0 ? ' ' : '') + words[i]
          };
          sendStreamChunk(projectId, chunk);

          // Small delay to simulate streaming
          await new Promise((resolve) => setTimeout(resolve, 30));
        }

        // Send done signal
        sendStreamChunk(projectId, { type: 'done' });
      } catch (error) {
        sendChatError(
          projectId,
          error instanceof Error ? error.message : 'Failed to process message'
        );
      }
    }
  );

  // List all planning sessions across all projects (Story 1.3)
  ipcMain.handle(
    IPC_CHANNELS.PLANNING_SESSIONS_LIST,
    async (): Promise<IPCResult<PlanningSessionSummary[]>> => {
      try {
        const projects = projectStore.getProjects();
        const sessions: PlanningSessionSummary[] = [];

        for (const project of projects) {
          const sessionPath = getSessionFilePath(project.path);

          if (existsSync(sessionPath)) {
            try {
              const content = readFileSync(sessionPath, 'utf-8');
              const session = JSON.parse(content) as PlanningSession;

              // Create summary with essential fields
              const summary: PlanningSessionSummary = {
                id: session.id,
                projectId: session.projectId || project.id,
                projectName: session.projectName,
                methodology: session.methodology,
                status: session.status,
                createdAt: session.createdAt,
                updatedAt: session.updatedAt,
                currentWorkflow: session.currentWorkflow,
                messageCount: session.messages?.length || 0
              };

              sessions.push(summary);
            } catch {
              // Skip corrupted session files
              continue;
            }
          }
        }

        // Sort by updatedAt descending (most recent first)
        sessions.sort((a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

        return { success: true, data: sessions };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list planning sessions'
        };
      }
    }
  );

  // ============================================================
  // Story 2.1: Workflow Execution Handlers
  // ============================================================

  // Start a workflow
  ipcMain.handle(
    IPC_CHANNELS.PLANNING_WORKFLOW_START,
    async (_, projectId: string, workflowId: WorkflowStep): Promise<IPCResult> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      try {
        // Load session and update workflow state
        const sessionPath = getSessionFilePath(project.path);
        if (!existsSync(sessionPath)) {
          return { success: false, error: 'No planning session found' };
        }

        const content = readFileSync(sessionPath, 'utf-8');
        const session = JSON.parse(content) as PlanningSession;

        session.currentWorkflow = workflowId;
        session.status = 'in_progress';
        session.updatedAt = new Date().toISOString();

        writeFileSync(sessionPath, JSON.stringify(session, null, 2));

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to start workflow'
        };
      }
    }
  );

  // Advance to next workflow
  ipcMain.handle(
    IPC_CHANNELS.PLANNING_WORKFLOW_ADVANCE,
    async (_, projectId: string): Promise<IPCResult<{ nextWorkflow: WorkflowStep | null }>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      try {
        const sessionPath = getSessionFilePath(project.path);
        if (!existsSync(sessionPath)) {
          return { success: false, error: 'No planning session found' };
        }

        const content = readFileSync(sessionPath, 'utf-8');
        const session = JSON.parse(content) as PlanningSession;

        const nextWorkflow = getNextWorkflow(session.completedWorkflows);
        session.currentWorkflow = nextWorkflow;
        session.updatedAt = new Date().toISOString();

        if (!nextWorkflow) {
          session.status = 'completed';
        }

        writeFileSync(sessionPath, JSON.stringify(session, null, 2));

        return { success: true, data: { nextWorkflow } };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to advance workflow'
        };
      }
    }
  );

  // Get workflow status
  ipcMain.handle(
    IPC_CHANNELS.PLANNING_WORKFLOW_STATUS,
    async (_, projectId: string): Promise<IPCResult<{ status: string; currentWorkflow: WorkflowStep | null }>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      try {
        const sessionPath = getSessionFilePath(project.path);
        if (!existsSync(sessionPath)) {
          return { success: true, data: { status: 'idle', currentWorkflow: null } };
        }

        const content = readFileSync(sessionPath, 'utf-8');
        const session = JSON.parse(content) as PlanningSession;

        return {
          success: true,
          data: {
            status: session.status,
            currentWorkflow: session.currentWorkflow
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get workflow status'
        };
      }
    }
  );

  // ============================================================
  // Story 2.2, 2.3, 2.4: Artifact Handlers
  // ============================================================

  /**
   * Helper function to load an artifact by ID
   * Used by update, approve, and reject handlers
   */
  const loadArtifactById = (projectPath: string, artifactId: string): PlanningArtifact | null => {
    const planningDir = path.join(projectPath, '.auto-claude', 'planning');

    // Search for artifact by ID in all files
    const allFiles = [
      ...Object.values(ARTIFACT_FILENAMES).map(f => path.join(planningDir, f)),
    ];

    // Add story files
    const storiesDir = path.join(planningDir, 'stories');
    if (existsSync(storiesDir)) {
      const storyFiles = readdirSync(storiesDir).filter(f => f.endsWith('.md'));
      allFiles.push(...storyFiles.map(f => path.join(storiesDir, f)));
    }

    for (const filePath of allFiles) {
      if (!existsSync(filePath)) continue;

      const rawContent = readFileSync(filePath, 'utf-8');
      const { metadata, body } = parseFrontmatter(rawContent);

      if (metadata.id === artifactId) {
        const fullMetadata: ArtifactMetadata = {
          id: metadata.id || artifactId,
          title: metadata.title || '',
          type: metadata.type || 'product-brief',
          status: metadata.status || 'draft',
          createdAt: metadata.createdAt || new Date().toISOString(),
          updatedAt: metadata.updatedAt || new Date().toISOString(),
          workflowStep: metadata.workflowStep || 'brief',
          author: metadata.author || 'user',
          approvedAt: metadata.approvedAt
        };

        return {
          metadata: fullMetadata,
          content: body,
          filePath
        };
      }
    }

    return null;
  };

  // List all artifacts
  ipcMain.handle(
    IPC_CHANNELS.PLANNING_ARTIFACT_LIST,
    async (_, projectId: string): Promise<IPCResult<ArtifactSummary[]>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      try {
        const planningDir = path.join(project.path, '.auto-claude', 'planning');
        const artifacts: ArtifactSummary[] = [];

        // Check each artifact type
        for (const [type, filename] of Object.entries(ARTIFACT_FILENAMES)) {
          const filePath = path.join(planningDir, filename);
          if (existsSync(filePath)) {
            const content = readFileSync(filePath, 'utf-8');
            const { metadata } = parseFrontmatter(content);

            artifacts.push({
              id: metadata.id || randomUUID(),
              title: metadata.title || ARTIFACT_TITLES[type] || type,
              type: (type as ArtifactType),
              status: metadata.status || 'draft',
              updatedAt: metadata.updatedAt || new Date().toISOString(),
              filePath
            });
          }
        }

        // Check for stories
        const storiesDir = path.join(planningDir, 'stories');
        if (existsSync(storiesDir)) {
          const storyFiles = readdirSync(storiesDir).filter(f => f.endsWith('.md'));
          for (const filename of storyFiles) {
            const filePath = path.join(storiesDir, filename);
            const content = readFileSync(filePath, 'utf-8');
            const { metadata } = parseFrontmatter(content);

            artifacts.push({
              id: metadata.id || randomUUID(),
              title: metadata.title || filename.replace('.md', ''),
              type: 'story',
              status: metadata.status || 'draft',
              updatedAt: metadata.updatedAt || new Date().toISOString(),
              filePath
            });
          }
        }

        return { success: true, data: artifacts };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list artifacts'
        };
      }
    }
  );

  // Load a specific artifact
  ipcMain.handle(
    IPC_CHANNELS.PLANNING_ARTIFACT_LOAD,
    async (_, projectId: string, artifactId: string): Promise<IPCResult<PlanningArtifact>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      try {
        const planningDir = path.join(project.path, '.auto-claude', 'planning');

        // Search for artifact by ID in all files
        const allFiles = [
          ...Object.values(ARTIFACT_FILENAMES).map(f => path.join(planningDir, f)),
        ];

        // Add story files
        const storiesDir = path.join(planningDir, 'stories');
        if (existsSync(storiesDir)) {
          const storyFiles = readdirSync(storiesDir).filter(f => f.endsWith('.md'));
          allFiles.push(...storyFiles.map(f => path.join(storiesDir, f)));
        }

        for (const filePath of allFiles) {
          if (!existsSync(filePath)) continue;

          const rawContent = readFileSync(filePath, 'utf-8');
          const { metadata, body } = parseFrontmatter(rawContent);

          if (metadata.id === artifactId) {
            const fullMetadata: ArtifactMetadata = {
              id: metadata.id || artifactId,
              title: metadata.title || '',
              type: metadata.type || 'product-brief',
              status: metadata.status || 'draft',
              createdAt: metadata.createdAt || new Date().toISOString(),
              updatedAt: metadata.updatedAt || new Date().toISOString(),
              workflowStep: metadata.workflowStep || 'brief',
              author: metadata.author || 'user',
              approvedAt: metadata.approvedAt
            };

            return {
              success: true,
              data: {
                metadata: fullMetadata,
                content: body,
                filePath
              }
            };
          }
        }

        return { success: false, error: 'Artifact not found' };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to load artifact'
        };
      }
    }
  );

  // Save a new artifact
  ipcMain.handle(
    IPC_CHANNELS.PLANNING_ARTIFACT_SAVE,
    async (_, projectId: string, type: ArtifactType, content: string, title: string): Promise<IPCResult<PlanningArtifact>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      try {
        ensurePlanningDir(project.path);

        const now = new Date().toISOString();
        const metadata: ArtifactMetadata = {
          id: randomUUID(),
          title,
          type,
          status: 'draft',
          createdAt: now,
          updatedAt: now,
          workflowStep: type === 'product-brief' ? 'brief' : type === 'story' ? 'stories' : type as WorkflowStep,
          author: 'user'
        };

        const fullContent = buildContentWithFrontmatter(metadata, content);
        const filePath = getArtifactFilePath(project.path, type);

        // Ensure stories directory exists for story type
        if (type === 'story') {
          const storiesDir = path.join(project.path, '.auto-claude', 'planning', 'stories');
          if (!existsSync(storiesDir)) {
            mkdirSync(storiesDir, { recursive: true });
          }
        }

        // Atomic write: write to temp file then rename
        const tempPath = filePath + '.tmp';
        writeFileSync(tempPath, fullContent, 'utf-8');
        renameSync(tempPath, filePath);

        return {
          success: true,
          data: {
            metadata,
            content,
            filePath
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to save artifact'
        };
      }
    }
  );

  // Update an existing artifact
  ipcMain.handle(
    IPC_CHANNELS.PLANNING_ARTIFACT_UPDATE,
    async (_, projectId: string, artifactId: string, content: string): Promise<IPCResult<PlanningArtifact>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      try {
        // First find the artifact
        const artifact = loadArtifactById(project.path, artifactId);
        if (!artifact) {
          return { success: false, error: 'Artifact not found' };
        }

        const updatedMetadata: ArtifactMetadata = {
          ...artifact.metadata,
          updatedAt: new Date().toISOString()
        };

        const fullContent = buildContentWithFrontmatter(updatedMetadata, content);

        // Atomic write
        const tempPath = artifact.filePath + '.tmp';
        writeFileSync(tempPath, fullContent, 'utf-8');
        renameSync(tempPath, artifact.filePath);

        return {
          success: true,
          data: {
            metadata: updatedMetadata,
            content,
            filePath: artifact.filePath
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update artifact'
        };
      }
    }
  );

  // Approve an artifact
  ipcMain.handle(
    IPC_CHANNELS.PLANNING_ARTIFACT_APPROVE,
    async (_, projectId: string, artifactId: string): Promise<IPCResult> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      try {
        // First find the artifact
        const artifact = loadArtifactById(project.path, artifactId);
        if (!artifact) {
          return { success: false, error: 'Artifact not found' };
        }
        const now = new Date().toISOString();
        const updatedMetadata: ArtifactMetadata = {
          ...artifact.metadata,
          status: 'approved',
          approvedAt: now,
          updatedAt: now
        };

        const fullContent = buildContentWithFrontmatter(updatedMetadata, artifact.content);
        writeFileSync(artifact.filePath, fullContent, 'utf-8');

        // Update session to mark workflow as completed
        const sessionPath = getSessionFilePath(project.path);
        if (existsSync(sessionPath)) {
          const sessionContent = readFileSync(sessionPath, 'utf-8');
          const session = JSON.parse(sessionContent) as PlanningSession;

          // Add to completed workflows if not already there
          const workflowStep = artifact.metadata.workflowStep;
          if (workflowStep && !session.completedWorkflows.includes(workflowStep)) {
            session.completedWorkflows.push(workflowStep);
          }

          // Update artifacts map
          session.artifacts[artifact.metadata.type] = artifact.filePath;
          session.updatedAt = now;

          writeFileSync(sessionPath, JSON.stringify(session, null, 2));
        }

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to approve artifact'
        };
      }
    }
  );

  // Reject an artifact (archive and allow regeneration)
  ipcMain.handle(
    IPC_CHANNELS.PLANNING_ARTIFACT_REJECT,
    async (_, projectId: string, artifactId: string): Promise<IPCResult> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      try {
        // First find the artifact
        const artifact = loadArtifactById(project.path, artifactId);
        if (!artifact) {
          return { success: false, error: 'Artifact not found' };
        }

        // Archive the rejected artifact with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archivePath = artifact.filePath.replace('.md', `.rejected-${timestamp}.md`);
        renameSync(artifact.filePath, archivePath);

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to reject artifact'
        };
      }
    }
  );

  // ============================================================
  // Story 2.6: Git Checkpoint Handlers
  // ============================================================

  // Create a git checkpoint
  ipcMain.handle(
    IPC_CHANNELS.PLANNING_GIT_CHECKPOINT,
    async (_, projectId: string): Promise<IPCResult<CheckpointResult>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      try {
        const planningDir = path.join(project.path, '.auto-claude', 'planning');
        const now = new Date();
        const timestamp = now.toISOString();

        // Check if we're in a git repo
        try {
          execSync('git rev-parse --git-dir', { cwd: project.path, stdio: 'pipe' });
        } catch {
          return {
            success: false,
            data: {
              success: false,
              errorMessage: 'Not a git repository',
              timestamp
            }
          };
        }

        // Check for changes in planning directory
        const status = execSync(`git status --porcelain "${planningDir}"`, {
          cwd: project.path,
          encoding: 'utf-8'
        }).trim();

        if (!status) {
          return {
            success: true,
            data: {
              success: false,
              errorMessage: 'No changes to commit',
              timestamp
            }
          };
        }

        // Stage planning directory
        execSync(`git add "${planningDir}"`, { cwd: project.path, stdio: 'pipe' });

        // Create commit
        const message = `Planning checkpoint: ${now.toISOString().slice(0, 16).replace('T', ' ')}`;
        execSync(`git commit -m "${message}"`, { cwd: project.path, stdio: 'pipe' });

        // Get commit hash
        const commitHash = execSync('git rev-parse HEAD', {
          cwd: project.path,
          encoding: 'utf-8'
        }).trim();

        return {
          success: true,
          data: {
            success: true,
            commitHash,
            timestamp
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create checkpoint'
        };
      }
    }
  );

  // List git checkpoints
  ipcMain.handle(
    IPC_CHANNELS.PLANNING_GIT_HISTORY,
    async (_, projectId: string): Promise<IPCResult<CheckpointEntry[]>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      try {
        // Check if we're in a git repo
        try {
          execSync('git rev-parse --git-dir', { cwd: project.path, stdio: 'pipe' });
        } catch {
          return { success: true, data: [] };
        }

        // Get checkpoint commits
        const log = execSync(
          'git log --oneline --grep="Planning checkpoint:" -20 --format="%H|%s|%ci"',
          { cwd: project.path, encoding: 'utf-8' }
        ).trim();

        if (!log) {
          return { success: true, data: [] };
        }

        const checkpoints: CheckpointEntry[] = log.split('\n').filter(Boolean).map(line => {
          const parts = line.split('|');
          return {
            hash: parts[0] || '',
            message: parts[1] || '',
            date: parts[2] || ''
          };
        });

        return { success: true, data: checkpoints };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list checkpoints'
        };
      }
    }
  );

  // View artifact at specific checkpoint
  ipcMain.handle(
    IPC_CHANNELS.PLANNING_GIT_VIEW,
    async (_, projectId: string, commitHash: string, artifactPath: string): Promise<IPCResult<string>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      try {
        // Get relative path from project root
        const relativePath = path.relative(project.path, artifactPath);

        const content = execSync(`git show "${commitHash}:${relativePath}"`, {
          cwd: project.path,
          encoding: 'utf-8'
        });

        return { success: true, data: content };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to view artifact at checkpoint'
        };
      }
    }
  );
}
