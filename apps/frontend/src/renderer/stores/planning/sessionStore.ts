import { create } from 'zustand';
import type {
  Methodology,
  SessionStatus,
  WorkflowStep,
  PlanningSession,
  PlanningChatMessage,
  PlanningChatStatus,
  PlanningChatPhase,
  PlanningStreamChunk
} from '../../../shared/types/planning';

// Re-export types for convenience
export type {
  Methodology,
  SessionStatus,
  WorkflowStep,
  PlanningSession,
  PlanningChatMessage,
  PlanningChatStatus,
  PlanningChatPhase,
  PlanningStreamChunk
};

/**
 * Initial chat status
 */
const initialChatStatus: PlanningChatStatus = {
  phase: 'idle',
  message: ''
};

/**
 * Session store state
 */
interface SessionState {
  // Data
  session: PlanningSession | null;
  isLoading: boolean;
  error: string | null;

  // Chat state
  chatStatus: PlanningChatStatus;
  streamingContent: string;

  // Actions
  setSession: (session: PlanningSession | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  createSession: (projectId: string, projectName: string, methodology: Methodology) => Promise<void>;
  loadSession: (projectId: string) => Promise<void>;
  saveSession: () => Promise<void>;
  clearSession: () => void;
  updateSessionStatus: (status: SessionStatus) => void;
  advanceWorkflow: (completedWorkflow: WorkflowStep, nextWorkflow: WorkflowStep | null) => void;

  // Chat actions
  setChatStatus: (status: PlanningChatStatus) => void;
  addMessage: (message: PlanningChatMessage) => void;
  appendStreamingContent: (content: string) => void;
  clearStreamingContent: () => void;
  finalizeStreamingMessage: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  // Initial state
  session: null,
  isLoading: false,
  error: null,
  chatStatus: initialChatStatus,
  streamingContent: '',

  // Actions
  setSession: (session) => set({ session }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  createSession: async (projectId: string, projectName: string, methodology: Methodology) => {
    set({ isLoading: true, error: null });

    try {
      const result = await window.electronAPI.createPlanningSession(projectId, projectName, methodology);

      if (result.success && result.data) {
        set({ session: result.data, isLoading: false });
      } else {
        set({ error: result.error || 'Failed to create session', isLoading: false });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to create session',
        isLoading: false
      });
    }
  },

  loadSession: async (projectId: string) => {
    set({ isLoading: true, error: null });

    try {
      const result = await window.electronAPI.loadPlanningSession(projectId);

      if (result.success && result.data) {
        set({ session: result.data, isLoading: false });
      } else {
        // No session found is not an error
        set({ session: null, isLoading: false });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load session',
        isLoading: false
      });
    }
  },

  saveSession: async () => {
    const { session } = get();
    if (!session) return;

    try {
      const result = await window.electronAPI.savePlanningSession(session);

      if (!result.success) {
        set({ error: result.error || 'Failed to save session' });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to save session'
      });
    }
  },

  clearSession: () => set({
    session: null,
    error: null,
    chatStatus: initialChatStatus,
    streamingContent: ''
  }),

  updateSessionStatus: (status: SessionStatus) => {
    const { session } = get();
    if (!session) return;

    set({
      session: {
        ...session,
        status,
        updatedAt: new Date().toISOString()
      }
    });
  },

  advanceWorkflow: (completedWorkflow: WorkflowStep, nextWorkflow: WorkflowStep | null) => {
    const { session } = get();
    if (!session) return;

    const completedWorkflows = session.completedWorkflows.includes(completedWorkflow)
      ? session.completedWorkflows
      : [...session.completedWorkflows, completedWorkflow];

    set({
      session: {
        ...session,
        completedWorkflows,
        currentWorkflow: nextWorkflow,
        currentStep: session.currentStep + 1,
        updatedAt: new Date().toISOString()
      }
    });
  },

  // Chat actions
  setChatStatus: (status: PlanningChatStatus) => set({ chatStatus: status }),

  addMessage: (message: PlanningChatMessage) =>
    set((state) => {
      if (!state.session) return state;

      return {
        session: {
          ...state.session,
          messages: [...state.session.messages, message],
          updatedAt: new Date().toISOString()
        }
      };
    }),

  appendStreamingContent: (content: string) =>
    set((state) => ({
      streamingContent: state.streamingContent + content
    })),

  clearStreamingContent: () => set({ streamingContent: '' }),

  finalizeStreamingMessage: () =>
    set((state) => {
      const content = state.streamingContent;

      if (!content || !state.session) {
        return { streamingContent: '' };
      }

      const newMessage: PlanningChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content,
        timestamp: new Date().toISOString()
      };

      return {
        streamingContent: '',
        session: {
          ...state.session,
          messages: [...state.session.messages, newMessage],
          updatedAt: new Date().toISOString()
        }
      };
    })
}));

/**
 * Helper to check if a session exists for a project
 */
export async function checkSessionExists(projectId: string): Promise<boolean> {
  try {
    const result = await window.electronAPI.loadPlanningSession(projectId);
    return result.success && result.data !== null;
  } catch {
    return false;
  }
}

/**
 * Send a chat message to the planning backend
 */
export function sendPlanningMessage(projectId: string, message: string): void {
  const store = useSessionStore.getState();
  const { session } = store;

  if (!session) return;

  // Add user message to session
  const userMessage: PlanningChatMessage = {
    id: `msg-${Date.now()}`,
    role: 'user',
    content: message,
    timestamp: new Date().toISOString()
  };
  store.addMessage(userMessage);

  // Clear streaming state and set thinking status
  store.clearStreamingContent();
  store.setChatStatus({
    phase: 'thinking',
    message: 'Processing your message...'
  });

  // Send to main process
  window.electronAPI.sendPlanningMessage(projectId, session.id, message);
}

/**
 * Setup IPC listeners for planning chat
 */
export function setupPlanningChatListeners(): () => void {
  const store = useSessionStore.getState;

  // Listen for streaming chunks
  const unsubStreamChunk = window.electronAPI.onPlanningChatStream(
    (_projectId: string, chunk: PlanningStreamChunk) => {
      switch (chunk.type) {
        case 'text':
          if (chunk.content) {
            store().appendStreamingContent(chunk.content);
            store().setChatStatus({
              phase: 'streaming',
              message: 'Receiving response...'
            });
          }
          break;
        case 'done':
          // Finalize any remaining content
          store().finalizeStreamingMessage();
          store().setChatStatus({
            phase: 'complete',
            message: ''
          });
          // Save session after message completes
          store().saveSession();
          break;
        case 'error':
          store().setChatStatus({
            phase: 'error',
            error: chunk.error
          });
          break;
      }
    }
  );

  // Listen for errors
  const unsubError = window.electronAPI.onPlanningChatError((_projectId: string, error: string) => {
    store().setChatStatus({
      phase: 'error',
      error
    });
  });

  // Return cleanup function
  return () => {
    unsubStreamChunk();
    unsubError();
  };
}
