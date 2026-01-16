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
