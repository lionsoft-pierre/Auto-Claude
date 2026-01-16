import { IPC_CHANNELS } from '../../../shared/constants';
import type {
  PlanningSession,
  Methodology,
  PlanningStreamChunk,
  IPCResult
} from '../../../shared/types';
import { invokeIpc, createIpcListener, sendIpc, type IpcListenerCleanup } from './ipc-utils';

/**
 * Planning API operations
 */
export interface PlanningAPI {
  // Session operations
  createPlanningSession: (projectId: string, projectName: string, methodology: Methodology) => Promise<IPCResult<PlanningSession>>;
  loadPlanningSession: (projectId: string) => Promise<IPCResult<PlanningSession | null>>;
  savePlanningSession: (session: PlanningSession) => Promise<IPCResult>;

  // Chat operations (Story 1.2)
  sendPlanningMessage: (projectId: string, sessionId: string, message: string) => void;
  onPlanningChatStream: (callback: (projectId: string, chunk: PlanningStreamChunk) => void) => IpcListenerCleanup;
  onPlanningChatError: (callback: (projectId: string, error: string) => void) => IpcListenerCleanup;
}

/**
 * Creates the Planning API implementation
 */
export const createPlanningAPI = (): PlanningAPI => ({
  // Session operations
  createPlanningSession: (projectId: string, projectName: string, methodology: Methodology): Promise<IPCResult<PlanningSession>> =>
    invokeIpc(IPC_CHANNELS.PLANNING_SESSION_CREATE, projectId, projectName, methodology),

  loadPlanningSession: (projectId: string): Promise<IPCResult<PlanningSession | null>> =>
    invokeIpc(IPC_CHANNELS.PLANNING_SESSION_LOAD, projectId),

  savePlanningSession: (session: PlanningSession): Promise<IPCResult> =>
    invokeIpc(IPC_CHANNELS.PLANNING_SESSION_SAVE, session),

  // Chat operations (Story 1.2)
  sendPlanningMessage: (projectId: string, sessionId: string, message: string): void =>
    sendIpc(IPC_CHANNELS.PLANNING_CHAT_SEND, projectId, sessionId, message),

  onPlanningChatStream: (callback: (projectId: string, chunk: PlanningStreamChunk) => void): IpcListenerCleanup =>
    createIpcListener(IPC_CHANNELS.PLANNING_CHAT_STREAM, callback),

  onPlanningChatError: (callback: (projectId: string, error: string) => void): IpcListenerCleanup =>
    createIpcListener(IPC_CHANNELS.PLANNING_CHAT_ERROR, callback)
});
