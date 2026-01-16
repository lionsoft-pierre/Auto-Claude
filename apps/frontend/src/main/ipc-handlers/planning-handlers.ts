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
  CheckpointEntry,
  StorySummary,
  Story,
  StoryStatus,
  StoryMetadata,
  StoryConversionResult,
  TestScope
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

  // ============================================================
  // Story 3.1, 3.2: Story Management Handlers
  // ============================================================

  /**
   * Parse story frontmatter from markdown content
   */
  const parseStoryFrontmatter = (content: string): { metadata: Partial<StoryMetadata>; body: string } => {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return { metadata: {}, body: content };
    }

    const yamlContent = match[1];
    const body = match[2];

    const metadata: Partial<StoryMetadata> = {};
    const lines = yamlContent.split('\n');
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim().replace(/^['"]|['"]$/g, '');

        switch (key) {
          case 'id': metadata.id = value; break;
          case 'number': metadata.number = parseInt(value, 10); break;
          case 'title': metadata.title = value; break;
          case 'epic': metadata.epic = value; break;
          case 'status': metadata.status = value as StoryStatus; break;
          case 'test_scope':
          case 'testScope': metadata.testScope = value as TestScope; break;
          case 'created_at':
          case 'createdAt': metadata.createdAt = value; break;
          case 'updated_at':
          case 'updatedAt': metadata.updatedAt = value; break;
        }
      }
    }

    return { metadata, body };
  };

  /**
   * Build content with story frontmatter
   */
  const buildStoryContentWithFrontmatter = (metadata: StoryMetadata, content: string): string => {
    const frontmatter = `---
id: ${metadata.id}
number: ${metadata.number}
title: ${metadata.title}
epic: ${metadata.epic}
status: ${metadata.status}
testScope: ${metadata.testScope}
createdAt: ${metadata.createdAt}${metadata.updatedAt ? `\nupdatedAt: ${metadata.updatedAt}` : ''}
---

`;
    return frontmatter + content;
  };

  /**
   * Send story progress to all renderer windows
   */
  const sendStoryProgress = (projectId: string, progress: { current: number; total: number; storyTitle: string }): void => {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      win.webContents.send(IPC_CHANNELS.PLANNING_STORIES_PROGRESS, projectId, progress);
    }
  };

  /**
   * Send story complete to all renderer windows
   */
  const sendStoryComplete = (projectId: string, count: number): void => {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      win.webContents.send(IPC_CHANNELS.PLANNING_STORIES_COMPLETE, projectId, count);
    }
  };

  /**
   * Send story error to all renderer windows
   */
  const sendStoryError = (projectId: string, error: string): void => {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      win.webContents.send(IPC_CHANNELS.PLANNING_STORIES_ERROR, projectId, error);
    }
  };

  // List all stories
  ipcMain.handle(
    IPC_CHANNELS.PLANNING_STORIES_LIST,
    async (_, projectId: string): Promise<IPCResult<StorySummary[]>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      try {
        const storiesDir = path.join(project.path, '.auto-claude', 'planning', 'stories');
        const stories: StorySummary[] = [];

        if (!existsSync(storiesDir)) {
          return { success: true, data: [] };
        }

        const storyFiles = readdirSync(storiesDir).filter(f => f.endsWith('.md') && !f.includes('.rejected'));

        for (const filename of storyFiles) {
          const filePath = path.join(storiesDir, filename);
          const content = readFileSync(filePath, 'utf-8');
          const { metadata } = parseStoryFrontmatter(content);

          stories.push({
            id: metadata.id || randomUUID(),
            number: metadata.number || 0,
            title: metadata.title || filename.replace('.md', ''),
            epic: metadata.epic || '',
            status: metadata.status || 'draft',
            testScope: metadata.testScope || 'unit',
            filePath
          });
        }

        // Sort by number
        stories.sort((a, b) => a.number - b.number);

        return { success: true, data: stories };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list stories'
        };
      }
    }
  );

  // Generate stories from epics (async with progress events)
  ipcMain.on(
    IPC_CHANNELS.PLANNING_STORIES_GENERATE,
    async (_, projectId: string) => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        sendStoryError(projectId, 'Project not found');
        return;
      }

      try {
        const planningDir = path.join(project.path, '.auto-claude', 'planning');
        const epicsPath = path.join(planningDir, 'epics.md');
        const storiesDir = path.join(planningDir, 'stories');

        if (!existsSync(epicsPath)) {
          sendStoryError(projectId, 'Epics document not found');
          return;
        }

        // Ensure stories directory exists
        if (!existsSync(storiesDir)) {
          mkdirSync(storiesDir, { recursive: true });
        }

        // Read epics content
        const epicsContent = readFileSync(epicsPath, 'utf-8');

        // Parse epics to extract story definitions
        // This is a simple parser - in production, you'd use Claude to generate stories
        const epicRegex = /## Epic \d+[:\s]+([^\n]+)/g;
        const storyRegex = /### Story \d+[:\s]+([^\n]+)/g;

        const epics: { title: string; stories: string[] }[] = [];
        let currentEpic: { title: string; stories: string[] } | null = null;
        let match;

        // Split content by epic headers
        const epicSections = epicsContent.split(/(?=## Epic \d+)/);

        for (const section of epicSections) {
          const epicMatch = section.match(/## Epic \d+[:\s]+([^\n]+)/);
          if (epicMatch) {
            currentEpic = { title: epicMatch[1].trim(), stories: [] };
            epics.push(currentEpic);

            // Find stories in this epic section
            const storyMatches = section.matchAll(/### Story \d+[:\s]+([^\n]+)/g);
            for (const storyMatch of storyMatches) {
              currentEpic.stories.push(storyMatch[1].trim());
            }
          }
        }

        // Generate story files
        let storyCounter = 0;
        const totalStories = epics.reduce((sum, e) => sum + e.stories.length, 0);

        for (const epic of epics) {
          const epicSlug = epic.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);

          for (const storyTitle of epic.stories) {
            storyCounter++;
            sendStoryProgress(projectId, { current: storyCounter, total: totalStories, storyTitle });

            const storySlug = storyTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
            const filename = `story-${storyCounter.toString().padStart(3, '0')}-${storySlug}.md`;
            const filePath = path.join(storiesDir, filename);

            // Skip if story already exists
            if (existsSync(filePath)) {
              continue;
            }

            const now = new Date().toISOString();
            const metadata: StoryMetadata = {
              id: randomUUID(),
              number: storyCounter,
              title: storyTitle,
              epic: epicSlug,
              status: 'draft',
              testScope: 'unit',
              createdAt: now
            };

            const storyContent = `# Story ${storyCounter}: ${storyTitle}

## Story

As a **Technical Founder**,
I want **${storyTitle.toLowerCase()}**,
so that **the system provides this functionality**.

## Acceptance Criteria

1. **AC1: [Acceptance Criterion 1]**
   - **Given** [context]
   - **When** [action]
   - **Then** [outcome]

## Tasks / Subtasks

- [ ] **Task 1: [Task name]** (AC: #1)
  - [ ] 1.1: [Subtask]

## Dev Notes

### Context Links
- **Epic**: ${epic.title}

### Test Scope
**Unit** - Default test scope

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### File List
`;

            const fullContent = buildStoryContentWithFrontmatter(metadata, storyContent);
            writeFileSync(filePath, fullContent, 'utf-8');

            // Small delay to allow UI updates
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }

        sendStoryComplete(projectId, storyCounter);
      } catch (error) {
        sendStoryError(projectId, error instanceof Error ? error.message : 'Failed to generate stories');
      }
    }
  );

  // Load a specific story
  ipcMain.handle(
    IPC_CHANNELS.PLANNING_STORY_LOAD,
    async (_, projectId: string, storyId: string): Promise<IPCResult<Story>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      try {
        const storiesDir = path.join(project.path, '.auto-claude', 'planning', 'stories');

        if (!existsSync(storiesDir)) {
          return { success: false, error: 'Stories directory not found' };
        }

        const storyFiles = readdirSync(storiesDir).filter(f => f.endsWith('.md') && !f.includes('.rejected'));

        for (const filename of storyFiles) {
          const filePath = path.join(storiesDir, filename);
          const rawContent = readFileSync(filePath, 'utf-8');
          const { metadata, body } = parseStoryFrontmatter(rawContent);

          if (metadata.id === storyId) {
            const fullMetadata: StoryMetadata = {
              id: metadata.id || storyId,
              number: metadata.number || 0,
              title: metadata.title || '',
              epic: metadata.epic || '',
              status: metadata.status || 'draft',
              testScope: metadata.testScope || 'unit',
              createdAt: metadata.createdAt || new Date().toISOString(),
              updatedAt: metadata.updatedAt
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

        return { success: false, error: 'Story not found' };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to load story'
        };
      }
    }
  );

  // Update a story
  ipcMain.handle(
    IPC_CHANNELS.PLANNING_STORY_UPDATE,
    async (_, projectId: string, storyId: string, content: string): Promise<IPCResult<Story>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      try {
        const storiesDir = path.join(project.path, '.auto-claude', 'planning', 'stories');

        if (!existsSync(storiesDir)) {
          return { success: false, error: 'Stories directory not found' };
        }

        const storyFiles = readdirSync(storiesDir).filter(f => f.endsWith('.md') && !f.includes('.rejected'));

        for (const filename of storyFiles) {
          const filePath = path.join(storiesDir, filename);
          const rawContent = readFileSync(filePath, 'utf-8');
          const { metadata } = parseStoryFrontmatter(rawContent);

          if (metadata.id === storyId) {
            const now = new Date().toISOString();
            const fullMetadata: StoryMetadata = {
              id: metadata.id || storyId,
              number: metadata.number || 0,
              title: metadata.title || '',
              epic: metadata.epic || '',
              status: metadata.status || 'draft',
              testScope: metadata.testScope || 'unit',
              createdAt: metadata.createdAt || now,
              updatedAt: now
            };

            const fullContent = buildStoryContentWithFrontmatter(fullMetadata, content);

            // Atomic write
            const tempPath = filePath + '.tmp';
            writeFileSync(tempPath, fullContent, 'utf-8');
            renameSync(tempPath, filePath);

            return {
              success: true,
              data: {
                metadata: fullMetadata,
                content,
                filePath
              }
            };
          }
        }

        return { success: false, error: 'Story not found' };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update story'
        };
      }
    }
  );

  // Set story status (for clarity test workflow)
  ipcMain.handle(
    IPC_CHANNELS.PLANNING_STORY_SET_STATUS,
    async (_, projectId: string, storyId: string, status: StoryStatus): Promise<IPCResult> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      try {
        const storiesDir = path.join(project.path, '.auto-claude', 'planning', 'stories');

        if (!existsSync(storiesDir)) {
          return { success: false, error: 'Stories directory not found' };
        }

        const storyFiles = readdirSync(storiesDir).filter(f => f.endsWith('.md') && !f.includes('.rejected'));

        for (const filename of storyFiles) {
          const filePath = path.join(storiesDir, filename);
          const rawContent = readFileSync(filePath, 'utf-8');
          const { metadata, body } = parseStoryFrontmatter(rawContent);

          if (metadata.id === storyId) {
            const now = new Date().toISOString();
            const fullMetadata: StoryMetadata = {
              id: metadata.id || storyId,
              number: metadata.number || 0,
              title: metadata.title || '',
              epic: metadata.epic || '',
              status,
              testScope: metadata.testScope || 'unit',
              createdAt: metadata.createdAt || now,
              updatedAt: now
            };

            const fullContent = buildStoryContentWithFrontmatter(fullMetadata, body);
            writeFileSync(filePath, fullContent, 'utf-8');

            return { success: true };
          }
        }

        return { success: false, error: 'Story not found' };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to set story status'
        };
      }
    }
  );

  // ============================================================
  // Story 3.3: Story to Task Conversion Handlers
  // ============================================================

  // Check for duplicate story->task conversion
  ipcMain.handle(
    IPC_CHANNELS.PLANNING_STORY_CHECK_DUPLICATE,
    async (_, projectId: string, storyId: string): Promise<IPCResult<{ isDuplicate: boolean; existingTaskId?: string }>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      try {
        // Check tasks.json for existing task with this storyId
        const tasksPath = path.join(project.path, '.auto-claude', 'tasks.json');
        if (!existsSync(tasksPath)) {
          return { success: true, data: { isDuplicate: false } };
        }

        const tasksContent = readFileSync(tasksPath, 'utf-8');
        const tasks = JSON.parse(tasksContent);

        for (const task of tasks) {
          if (task.storyId === storyId) {
            return { success: true, data: { isDuplicate: true, existingTaskId: task.id } };
          }
        }

        return { success: true, data: { isDuplicate: false } };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to check duplicate'
        };
      }
    }
  );

  // Convert a single story to a task
  ipcMain.handle(
    IPC_CHANNELS.PLANNING_STORY_CONVERT,
    async (_, projectId: string, storyId: string): Promise<IPCResult<StoryConversionResult>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      try {
        // Load the story
        const storiesDir = path.join(project.path, '.auto-claude', 'planning', 'stories');
        if (!existsSync(storiesDir)) {
          return { success: false, error: 'Stories directory not found' };
        }

        let story: Story | null = null;
        const storyFiles = readdirSync(storiesDir).filter(f => f.endsWith('.md') && !f.includes('.rejected'));

        for (const filename of storyFiles) {
          const filePath = path.join(storiesDir, filename);
          const rawContent = readFileSync(filePath, 'utf-8');
          const { metadata, body } = parseStoryFrontmatter(rawContent);

          if (metadata.id === storyId) {
            story = {
              metadata: {
                id: metadata.id || storyId,
                number: metadata.number || 0,
                title: metadata.title || '',
                epic: metadata.epic || '',
                status: metadata.status || 'draft',
                testScope: metadata.testScope || 'unit',
                createdAt: metadata.createdAt || new Date().toISOString(),
                updatedAt: metadata.updatedAt
              },
              content: body,
              filePath
            };
            break;
          }
        }

        if (!story) {
          return {
            success: true,
            data: { storyId, taskId: '', success: false, error: 'Story not found' }
          };
        }

        // Generate task description from story
        const userStoryMatch = story.content.match(/As a \*\*.*?\*\*,[\s\S]*?so that \*\*.*?\*\*/);
        const description = userStoryMatch?.[0] || story.metadata.title;

        // Extract acceptance criteria summary
        const acMatches = story.content.matchAll(/\*\*AC\d+: ([^*]+)\*\*/g);
        const acceptanceCriteriaSummary = Array.from(acMatches, m => m[1]).join(', ');

        // Create task
        const now = new Date().toISOString();
        const taskId = `task-${story.metadata.number}`;
        const task = {
          id: taskId,
          specId: '',
          projectId,
          title: story.metadata.title,
          description,
          status: 'backlog',
          subtasks: [],
          logs: [],
          createdAt: now,
          updatedAt: now,
          // Planning fields (Story 3.3)
          storyId: story.metadata.id,
          storyPath: story.filePath,
          acceptanceCriteriaSummary,
          testScope: story.metadata.testScope,
          epicId: story.metadata.epic,
          convertedAt: now
        };

        // Load existing tasks and add new one
        const tasksPath = path.join(project.path, '.auto-claude', 'tasks.json');
        let tasks = [];
        if (existsSync(tasksPath)) {
          const tasksContent = readFileSync(tasksPath, 'utf-8');
          tasks = JSON.parse(tasksContent);
        }

        tasks.push(task);
        writeFileSync(tasksPath, JSON.stringify(tasks, null, 2));

        // Update story status to in_progress
        const storyNow = new Date().toISOString();
        const updatedMetadata: StoryMetadata = {
          ...story.metadata,
          status: 'in_progress',
          updatedAt: storyNow
        };
        const fullContent = buildStoryContentWithFrontmatter(updatedMetadata, story.content);
        writeFileSync(story.filePath, fullContent, 'utf-8');

        return {
          success: true,
          data: { storyId, taskId, success: true }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to convert story to task'
        };
      }
    }
  );

  // Convert multiple stories to tasks
  ipcMain.handle(
    IPC_CHANNELS.PLANNING_STORIES_CONVERT_ALL,
    async (_, projectId: string, storyIds: string[]): Promise<IPCResult<StoryConversionResult[]>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      const results: StoryConversionResult[] = [];

      for (const storyId of storyIds) {
        try {
          // Use the single conversion handler logic
          const result = await new Promise<IPCResult<StoryConversionResult>>((resolve) => {
            // We need to replicate the logic here since we can't call ipcMain.handle from within
            const storiesDir = path.join(project.path, '.auto-claude', 'planning', 'stories');
            if (!existsSync(storiesDir)) {
              resolve({ success: true, data: { storyId, taskId: '', success: false, error: 'Stories directory not found' } });
              return;
            }

            let story: Story | null = null;
            const storyFiles = readdirSync(storiesDir).filter(f => f.endsWith('.md') && !f.includes('.rejected'));

            for (const filename of storyFiles) {
              const filePath = path.join(storiesDir, filename);
              const rawContent = readFileSync(filePath, 'utf-8');
              const { metadata, body } = parseStoryFrontmatter(rawContent);

              if (metadata.id === storyId) {
                story = {
                  metadata: {
                    id: metadata.id || storyId,
                    number: metadata.number || 0,
                    title: metadata.title || '',
                    epic: metadata.epic || '',
                    status: metadata.status || 'draft',
                    testScope: metadata.testScope || 'unit',
                    createdAt: metadata.createdAt || new Date().toISOString(),
                    updatedAt: metadata.updatedAt
                  },
                  content: body,
                  filePath
                };
                break;
              }
            }

            if (!story) {
              resolve({ success: true, data: { storyId, taskId: '', success: false, error: 'Story not found' } });
              return;
            }

            // Generate task
            const userStoryMatch = story.content.match(/As a \*\*.*?\*\*,[\s\S]*?so that \*\*.*?\*\*/);
            const description = userStoryMatch?.[0] || story.metadata.title;
            const acMatches = story.content.matchAll(/\*\*AC\d+: ([^*]+)\*\*/g);
            const acceptanceCriteriaSummary = Array.from(acMatches, m => m[1]).join(', ');

            const now = new Date().toISOString();
            const taskId = `task-${story.metadata.number}`;
            const task = {
              id: taskId,
              specId: '',
              projectId,
              title: story.metadata.title,
              description,
              status: 'backlog',
              subtasks: [],
              logs: [],
              createdAt: now,
              updatedAt: now,
              storyId: story.metadata.id,
              storyPath: story.filePath,
              acceptanceCriteriaSummary,
              testScope: story.metadata.testScope,
              epicId: story.metadata.epic,
              convertedAt: now
            };

            // Add to tasks
            const tasksPath = path.join(project.path, '.auto-claude', 'tasks.json');
            let tasks = [];
            if (existsSync(tasksPath)) {
              const tasksContent = readFileSync(tasksPath, 'utf-8');
              tasks = JSON.parse(tasksContent);
            }
            tasks.push(task);
            writeFileSync(tasksPath, JSON.stringify(tasks, null, 2));

            // Update story status
            const updatedMetadata: StoryMetadata = {
              ...story.metadata,
              status: 'in_progress',
              updatedAt: now
            };
            const fullContent = buildStoryContentWithFrontmatter(updatedMetadata, story.content);
            writeFileSync(story.filePath, fullContent, 'utf-8');

            resolve({ success: true, data: { storyId, taskId, success: true } });
          });

          if (result.data) {
            results.push(result.data);
          }
        } catch (error) {
          results.push({
            storyId,
            taskId: '',
            success: false,
            error: error instanceof Error ? error.message : 'Conversion failed'
          });
        }
      }

      return { success: true, data: results };
    }
  );
}
