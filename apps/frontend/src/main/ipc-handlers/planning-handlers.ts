import { ipcMain, BrowserWindow } from 'electron';
import path from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { IPC_CHANNELS } from '../../shared/constants';
import type { IPCResult, PlanningSession, Methodology, PlanningStreamChunk } from '../../shared/types';
import { projectStore } from '../project-store';

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
}
