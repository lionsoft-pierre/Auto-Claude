import { IPC_CHANNELS } from '../../../shared/constants';
import type {
  PlanningSession,
  PlanningSessionSummary,
  Methodology,
  PlanningStreamChunk,
  WorkflowStep,
  ArtifactSummary,
  PlanningArtifact,
  ArtifactType,
  CheckpointResult,
  CheckpointEntry,
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

  // Session management (Story 1.3)
  listPlanningSessions: () => Promise<IPCResult<PlanningSessionSummary[]>>;

  // Workflow operations (Story 2.1)
  startPlanningWorkflow: (projectId: string, workflowId: WorkflowStep) => Promise<IPCResult>;
  advancePlanningWorkflow: (projectId: string) => Promise<IPCResult<{ nextWorkflow: WorkflowStep | null }>>;
  getPlanningWorkflowStatus: (projectId: string) => Promise<IPCResult<{ status: string; currentWorkflow: WorkflowStep | null }>>;

  // Artifact operations (Story 2.2, 2.3, 2.4)
  listPlanningArtifacts: (projectId: string) => Promise<IPCResult<ArtifactSummary[]>>;
  loadPlanningArtifact: (projectId: string, artifactId: string) => Promise<IPCResult<PlanningArtifact>>;
  savePlanningArtifact: (projectId: string, type: ArtifactType, content: string, title: string) => Promise<IPCResult<PlanningArtifact>>;
  updatePlanningArtifact: (projectId: string, artifactId: string, content: string) => Promise<IPCResult<PlanningArtifact>>;
  approvePlanningArtifact: (projectId: string, artifactId: string) => Promise<IPCResult>;
  rejectPlanningArtifact: (projectId: string, artifactId: string) => Promise<IPCResult>;

  // Git checkpoint operations (Story 2.6)
  createPlanningCheckpoint: (projectId: string) => Promise<IPCResult<CheckpointResult>>;
  listPlanningCheckpoints: (projectId: string) => Promise<IPCResult<CheckpointEntry[]>>;
  viewArtifactAtCheckpoint: (projectId: string, commitHash: string, artifactPath: string) => Promise<IPCResult<string>>;
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
    createIpcListener(IPC_CHANNELS.PLANNING_CHAT_ERROR, callback),

  // Session management (Story 1.3)
  listPlanningSessions: (): Promise<IPCResult<PlanningSessionSummary[]>> =>
    invokeIpc(IPC_CHANNELS.PLANNING_SESSIONS_LIST),

  // Workflow operations (Story 2.1)
  startPlanningWorkflow: (projectId: string, workflowId: WorkflowStep): Promise<IPCResult> =>
    invokeIpc(IPC_CHANNELS.PLANNING_WORKFLOW_START, projectId, workflowId),

  advancePlanningWorkflow: (projectId: string): Promise<IPCResult<{ nextWorkflow: WorkflowStep | null }>> =>
    invokeIpc(IPC_CHANNELS.PLANNING_WORKFLOW_ADVANCE, projectId),

  getPlanningWorkflowStatus: (projectId: string): Promise<IPCResult<{ status: string; currentWorkflow: WorkflowStep | null }>> =>
    invokeIpc(IPC_CHANNELS.PLANNING_WORKFLOW_STATUS, projectId),

  // Artifact operations (Story 2.2, 2.3, 2.4)
  listPlanningArtifacts: (projectId: string): Promise<IPCResult<ArtifactSummary[]>> =>
    invokeIpc(IPC_CHANNELS.PLANNING_ARTIFACT_LIST, projectId),

  loadPlanningArtifact: (projectId: string, artifactId: string): Promise<IPCResult<PlanningArtifact>> =>
    invokeIpc(IPC_CHANNELS.PLANNING_ARTIFACT_LOAD, projectId, artifactId),

  savePlanningArtifact: (projectId: string, type: ArtifactType, content: string, title: string): Promise<IPCResult<PlanningArtifact>> =>
    invokeIpc(IPC_CHANNELS.PLANNING_ARTIFACT_SAVE, projectId, type, content, title),

  updatePlanningArtifact: (projectId: string, artifactId: string, content: string): Promise<IPCResult<PlanningArtifact>> =>
    invokeIpc(IPC_CHANNELS.PLANNING_ARTIFACT_UPDATE, projectId, artifactId, content),

  approvePlanningArtifact: (projectId: string, artifactId: string): Promise<IPCResult> =>
    invokeIpc(IPC_CHANNELS.PLANNING_ARTIFACT_APPROVE, projectId, artifactId),

  rejectPlanningArtifact: (projectId: string, artifactId: string): Promise<IPCResult> =>
    invokeIpc(IPC_CHANNELS.PLANNING_ARTIFACT_REJECT, projectId, artifactId),

  // Git checkpoint operations (Story 2.6)
  createPlanningCheckpoint: (projectId: string): Promise<IPCResult<CheckpointResult>> =>
    invokeIpc(IPC_CHANNELS.PLANNING_GIT_CHECKPOINT, projectId),

  listPlanningCheckpoints: (projectId: string): Promise<IPCResult<CheckpointEntry[]>> =>
    invokeIpc(IPC_CHANNELS.PLANNING_GIT_HISTORY, projectId),

  viewArtifactAtCheckpoint: (projectId: string, commitHash: string, artifactPath: string): Promise<IPCResult<string>> =>
    invokeIpc(IPC_CHANNELS.PLANNING_GIT_VIEW, projectId, commitHash, artifactPath)
});
