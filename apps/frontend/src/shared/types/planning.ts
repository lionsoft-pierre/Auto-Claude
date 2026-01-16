/**
 * Planning session types for methodology-driven development
 */

/**
 * Planning session methodology types
 */
export type Methodology = 'bmad';

/**
 * Session status types
 */
export type SessionStatus = 'idle' | 'in_progress' | 'completed';

/**
 * BMAD workflow steps
 */
export type WorkflowStep = 'brief' | 'prd' | 'architecture' | 'epics' | 'stories';

/**
 * Workflow step visual status (Story 1.4)
 */
export type WorkflowStepStatus = 'completed' | 'current' | 'upcoming';

/**
 * Chat message role
 */
export type ChatMessageRole = 'user' | 'assistant';

/**
 * Chat message in a planning session
 */
export interface PlanningChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: string;
}

/**
 * Chat status phases
 */
export type PlanningChatPhase = 'idle' | 'thinking' | 'streaming' | 'complete' | 'error';

/**
 * Chat status for UI feedback
 */
export interface PlanningChatStatus {
  phase: PlanningChatPhase;
  message?: string;
  error?: string;
}

/**
 * Streaming chunk types from backend
 */
export interface PlanningStreamChunk {
  type: 'text' | 'done' | 'error';
  content?: string;
  error?: string;
}

/**
 * Planning session state persisted to session.json
 */
export interface PlanningSession {
  id: string;
  projectId: string;
  projectName: string;
  methodology: Methodology;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  currentWorkflow: WorkflowStep | null;
  currentStep: number;
  completedWorkflows: WorkflowStep[];
  artifacts: Record<string, string>;
  context: Record<string, unknown>;
  messages: PlanningChatMessage[];
}

/**
 * Summary of a planning session for listing (Story 1.3)
 */
export interface PlanningSessionSummary {
  id: string;
  projectId: string;
  projectName: string;
  methodology: Methodology;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  currentWorkflow: WorkflowStep | null;
  messageCount: number;
}

/**
 * Artifact status for review workflow (Story 2.2, 2.3)
 */
export type ArtifactStatus = 'draft' | 'in_review' | 'approved';

/**
 * Artifact type mapping to workflow steps
 */
export type ArtifactType = 'product-brief' | 'prd' | 'architecture' | 'epics' | 'story';

/**
 * Artifact metadata stored in YAML frontmatter (Story 2.2)
 */
export interface ArtifactMetadata {
  id: string;
  title: string;
  type: ArtifactType;
  status: ArtifactStatus;
  createdAt: string;
  updatedAt: string;
  workflowStep: WorkflowStep;
  author: string;
  approvedAt?: string;
}

/**
 * Full artifact with content (Story 2.2)
 */
export interface PlanningArtifact {
  metadata: ArtifactMetadata;
  content: string;
  filePath: string;
}

/**
 * Artifact summary for listing (Story 2.4)
 */
export interface ArtifactSummary {
  id: string;
  title: string;
  type: ArtifactType;
  status: ArtifactStatus;
  updatedAt: string;
  filePath: string;
}

/**
 * Review state for artifact approval flow (Story 2.3)
 */
export type ReviewState = 'none' | 'pending' | 'revising';

/**
 * Workflow execution status (Story 2.1)
 */
export type WorkflowExecutionStatus = 'idle' | 'executing' | 'awaiting_review' | 'complete';

/**
 * Git checkpoint result (Story 2.6)
 */
export interface CheckpointResult {
  success: boolean;
  commitHash?: string;
  errorMessage?: string;
  timestamp: string;
}

/**
 * Git checkpoint entry (Story 2.6)
 */
export interface CheckpointEntry {
  hash: string;
  message: string;
  date: string;
}

/**
 * Story status for clarity test workflow (Story 3.1, 3.2)
 */
export type StoryStatus = 'draft' | 'ready' | 'needs_refinement' | 'in_progress' | 'completed' | 'failed';

/**
 * Test scope for stories (Story 3.1)
 */
export type TestScope = 'unit' | 'integration' | 'e2e';

/**
 * Story metadata stored in YAML frontmatter (Story 3.1)
 */
export interface StoryMetadata {
  id: string;
  number: number;
  title: string;
  epic: string;
  status: StoryStatus;
  testScope: TestScope;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Full story with content (Story 3.1, 3.2)
 */
export interface Story {
  metadata: StoryMetadata;
  content: string;
  filePath: string;
}

/**
 * Story summary for listing (Story 3.2)
 */
export interface StorySummary {
  id: string;
  number: number;
  title: string;
  epic: string;
  status: StoryStatus;
  testScope: TestScope;
  filePath: string;
}

/**
 * Story group by epic for display (Story 3.2)
 */
export interface StoryGroup {
  epicId: string;
  epicTitle: string;
  stories: StorySummary[];
}

/**
 * Task fields for story reference (Story 3.3)
 */
export interface PlanningTaskFields {
  storyId?: string;
  storyPath?: string;
  acceptanceCriteriaSummary?: string;
  testScope?: TestScope;
  epicId?: string;
  convertedAt?: string;
}

/**
 * Story to task conversion result (Story 3.3)
 */
export interface StoryConversionResult {
  storyId: string;
  taskId: string;
  success: boolean;
  error?: string;
}
