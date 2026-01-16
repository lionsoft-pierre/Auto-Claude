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
  StorySummary,
  Story,
  StoryStatus,
  StoryConversionResult,
  Sprint,
  SprintAssignment,
  SprintQueue,
  PriorityUpdate,
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

  // Story operations (Story 3.1, 3.2)
  listPlanningStories: (projectId: string) => Promise<IPCResult<StorySummary[]>>;
  generatePlanningStories: (projectId: string) => void;
  loadPlanningStory: (projectId: string, storyId: string) => Promise<IPCResult<Story>>;
  updatePlanningStory: (projectId: string, storyId: string, content: string) => Promise<IPCResult<Story>>;
  setStoryStatus: (projectId: string, storyId: string, status: StoryStatus) => Promise<IPCResult>;

  // Story generation events (Story 3.1)
  onPlanningStoriesProgress: (callback: (projectId: string, progress: { current: number; total: number; storyTitle: string }) => void) => IpcListenerCleanup;
  onPlanningStoriesComplete: (callback: (projectId: string, count: number) => void) => IpcListenerCleanup;
  onPlanningStoriesError: (callback: (projectId: string, error: string) => void) => IpcListenerCleanup;

  // Story to task conversion (Story 3.3)
  convertStoryToTask: (projectId: string, storyId: string) => Promise<IPCResult<StoryConversionResult>>;
  convertStoriesToTasks: (projectId: string, storyIds: string[]) => Promise<IPCResult<StoryConversionResult[]>>;
  checkStoryDuplicate: (projectId: string, storyId: string) => Promise<IPCResult<{ isDuplicate: boolean; existingTaskId?: string }>>;

  // Sprint management operations (Story 4.1)
  listSprints: (projectId: string) => Promise<IPCResult<SprintQueue>>;
  createSprint: (projectId: string, name: string) => Promise<IPCResult<Sprint>>;
  deleteSprint: (projectId: string, sprintId: string) => Promise<IPCResult>;
  assignTaskToSprint: (projectId: string, taskId: string, sprintId: string, storyId?: string) => Promise<IPCResult<SprintAssignment>>;
  unassignTaskFromSprint: (projectId: string, taskId: string) => Promise<IPCResult>;

  // Sprint queue operations (Story 4.2)
  getSprintQueue: (projectId: string, sprintId: string) => Promise<IPCResult<SprintAssignment[]>>;
  reorderSprintQueue: (projectId: string, sprintId: string, priorities: PriorityUpdate[]) => Promise<IPCResult>;

  // Sprint status operations (Story 4.3)
  startSprint: (projectId: string, sprintId: string) => Promise<IPCResult<Sprint>>;
  completeSprint: (projectId: string, sprintId: string) => Promise<IPCResult<Sprint>>;
  onSprintStatusChanged: (callback: (projectId: string, sprint: Sprint) => void) => IpcListenerCleanup;
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
    invokeIpc(IPC_CHANNELS.PLANNING_GIT_VIEW, projectId, commitHash, artifactPath),

  // Story operations (Story 3.1, 3.2)
  listPlanningStories: (projectId: string): Promise<IPCResult<StorySummary[]>> =>
    invokeIpc(IPC_CHANNELS.PLANNING_STORIES_LIST, projectId),

  generatePlanningStories: (projectId: string): void =>
    sendIpc(IPC_CHANNELS.PLANNING_STORIES_GENERATE, projectId),

  loadPlanningStory: (projectId: string, storyId: string): Promise<IPCResult<Story>> =>
    invokeIpc(IPC_CHANNELS.PLANNING_STORY_LOAD, projectId, storyId),

  updatePlanningStory: (projectId: string, storyId: string, content: string): Promise<IPCResult<Story>> =>
    invokeIpc(IPC_CHANNELS.PLANNING_STORY_UPDATE, projectId, storyId, content),

  setStoryStatus: (projectId: string, storyId: string, status: StoryStatus): Promise<IPCResult> =>
    invokeIpc(IPC_CHANNELS.PLANNING_STORY_SET_STATUS, projectId, storyId, status),

  // Story generation events (Story 3.1)
  onPlanningStoriesProgress: (callback: (projectId: string, progress: { current: number; total: number; storyTitle: string }) => void): IpcListenerCleanup =>
    createIpcListener(IPC_CHANNELS.PLANNING_STORIES_PROGRESS, callback),

  onPlanningStoriesComplete: (callback: (projectId: string, count: number) => void): IpcListenerCleanup =>
    createIpcListener(IPC_CHANNELS.PLANNING_STORIES_COMPLETE, callback),

  onPlanningStoriesError: (callback: (projectId: string, error: string) => void): IpcListenerCleanup =>
    createIpcListener(IPC_CHANNELS.PLANNING_STORIES_ERROR, callback),

  // Story to task conversion (Story 3.3)
  convertStoryToTask: (projectId: string, storyId: string): Promise<IPCResult<StoryConversionResult>> =>
    invokeIpc(IPC_CHANNELS.PLANNING_STORY_CONVERT, projectId, storyId),

  convertStoriesToTasks: (projectId: string, storyIds: string[]): Promise<IPCResult<StoryConversionResult[]>> =>
    invokeIpc(IPC_CHANNELS.PLANNING_STORIES_CONVERT_ALL, projectId, storyIds),

  checkStoryDuplicate: (projectId: string, storyId: string): Promise<IPCResult<{ isDuplicate: boolean; existingTaskId?: string }>> =>
    invokeIpc(IPC_CHANNELS.PLANNING_STORY_CHECK_DUPLICATE, projectId, storyId),

  // Sprint management operations (Story 4.1)
  listSprints: (projectId: string): Promise<IPCResult<SprintQueue>> =>
    invokeIpc(IPC_CHANNELS.PLANNING_SPRINT_LIST, projectId),

  createSprint: (projectId: string, name: string): Promise<IPCResult<Sprint>> =>
    invokeIpc(IPC_CHANNELS.PLANNING_SPRINT_CREATE, projectId, name),

  deleteSprint: (projectId: string, sprintId: string): Promise<IPCResult> =>
    invokeIpc(IPC_CHANNELS.PLANNING_SPRINT_DELETE, projectId, sprintId),

  assignTaskToSprint: (projectId: string, taskId: string, sprintId: string, storyId?: string): Promise<IPCResult<SprintAssignment>> =>
    invokeIpc(IPC_CHANNELS.PLANNING_SPRINT_ASSIGN, projectId, taskId, sprintId, storyId),

  unassignTaskFromSprint: (projectId: string, taskId: string): Promise<IPCResult> =>
    invokeIpc(IPC_CHANNELS.PLANNING_SPRINT_UNASSIGN, projectId, taskId),

  // Sprint queue operations (Story 4.2)
  getSprintQueue: (projectId: string, sprintId: string): Promise<IPCResult<SprintAssignment[]>> =>
    invokeIpc(IPC_CHANNELS.PLANNING_QUEUE_GET, projectId, sprintId),

  reorderSprintQueue: (projectId: string, sprintId: string, priorities: PriorityUpdate[]): Promise<IPCResult> =>
    invokeIpc(IPC_CHANNELS.PLANNING_QUEUE_REORDER, projectId, sprintId, priorities),

  // Sprint status operations (Story 4.3)
  startSprint: (projectId: string, sprintId: string): Promise<IPCResult<Sprint>> =>
    invokeIpc(IPC_CHANNELS.PLANNING_SPRINT_START, projectId, sprintId),

  completeSprint: (projectId: string, sprintId: string): Promise<IPCResult<Sprint>> =>
    invokeIpc(IPC_CHANNELS.PLANNING_SPRINT_COMPLETE, projectId, sprintId),

  onSprintStatusChanged: (callback: (projectId: string, sprint: Sprint) => void): IpcListenerCleanup =>
    createIpcListener(IPC_CHANNELS.PLANNING_SPRINT_STATUS_CHANGED, callback)
});
