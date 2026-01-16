/**
 * Unit tests for Planning Session Store
 * Tests Zustand store for planning session state management (synchronous operations)
 *
 * Note: Async IPC operations (createSession, loadSession, saveSession) are tested
 * via integration tests that run with jsdom environment.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useSessionStore } from '../stores/planning/sessionStore';
import type {
  PlanningSession,
  Methodology,
  SessionStatus,
  WorkflowStep,
  PlanningChatMessage,
  PlanningChatStatus
} from '../../shared/types/planning';

// Helper to create test session
function createTestSession(overrides: Partial<PlanningSession> = {}): PlanningSession {
  const now = new Date().toISOString();
  return {
    id: `session-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    projectId: `project-${Date.now()}`,
    projectName: 'Test Project',
    methodology: 'bmad' as Methodology,
    status: 'idle' as SessionStatus,
    createdAt: now,
    updatedAt: now,
    currentWorkflow: null,
    currentStep: 0,
    completedWorkflows: [],
    artifacts: {},
    context: {},
    messages: [],
    ...overrides
  };
}

// Helper to create test chat message
function createTestMessage(overrides: Partial<PlanningChatMessage> = {}): PlanningChatMessage {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    role: 'user',
    content: 'Test message',
    timestamp: new Date().toISOString(),
    ...overrides
  };
}

describe('Planning Session Store', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useSessionStore.setState({
      session: null,
      isLoading: false,
      error: null,
      isDirty: false,
      lastSavedAt: null,
      isSaving: false,
      chatStatus: { phase: 'idle', message: '' },
      streamingContent: ''
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have null session initially', () => {
      expect(useSessionStore.getState().session).toBeNull();
    });

    it('should not be loading initially', () => {
      expect(useSessionStore.getState().isLoading).toBe(false);
    });

    it('should have no error initially', () => {
      expect(useSessionStore.getState().error).toBeNull();
    });
  });

  describe('setSession', () => {
    it('should set session', () => {
      const session = createTestSession();

      useSessionStore.getState().setSession(session);

      expect(useSessionStore.getState().session).toBeDefined();
      expect(useSessionStore.getState().session?.projectName).toBe('Test Project');
    });

    it('should clear session with null', () => {
      useSessionStore.setState({ session: createTestSession() });

      useSessionStore.getState().setSession(null);

      expect(useSessionStore.getState().session).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('should set loading state to true', () => {
      useSessionStore.getState().setLoading(true);

      expect(useSessionStore.getState().isLoading).toBe(true);
    });

    it('should set loading state to false', () => {
      useSessionStore.setState({ isLoading: true });

      useSessionStore.getState().setLoading(false);

      expect(useSessionStore.getState().isLoading).toBe(false);
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      useSessionStore.getState().setError('Test error');

      expect(useSessionStore.getState().error).toBe('Test error');
    });

    it('should clear error with null', () => {
      useSessionStore.setState({ error: 'Previous error' });

      useSessionStore.getState().setError(null);

      expect(useSessionStore.getState().error).toBeNull();
    });
  });

  describe('clearSession', () => {
    it('should clear session and error', () => {
      useSessionStore.setState({
        session: createTestSession(),
        error: 'Some error'
      });

      useSessionStore.getState().clearSession();

      expect(useSessionStore.getState().session).toBeNull();
      expect(useSessionStore.getState().error).toBeNull();
    });

    it('should not affect loading state', () => {
      useSessionStore.setState({
        session: createTestSession(),
        isLoading: true
      });

      useSessionStore.getState().clearSession();

      expect(useSessionStore.getState().isLoading).toBe(true);
    });
  });

  describe('updateSessionStatus', () => {
    it('should update session status', () => {
      const session = createTestSession({ status: 'idle' });
      useSessionStore.setState({ session });

      useSessionStore.getState().updateSessionStatus('in_progress');

      expect(useSessionStore.getState().session?.status).toBe('in_progress');
    });

    it('should update updatedAt timestamp', () => {
      const originalDate = '2024-01-01T00:00:00.000Z';
      const session = createTestSession({ updatedAt: originalDate });
      useSessionStore.setState({ session });

      useSessionStore.getState().updateSessionStatus('completed');

      expect(useSessionStore.getState().session?.updatedAt).not.toBe(originalDate);
    });

    it('should not update if no session exists', () => {
      useSessionStore.setState({ session: null });

      useSessionStore.getState().updateSessionStatus('in_progress');

      expect(useSessionStore.getState().session).toBeNull();
    });

    it('should preserve other session properties', () => {
      const session = createTestSession({
        projectName: 'My Project',
        methodology: 'bmad',
        currentWorkflow: 'brief',
        currentStep: 1,
        completedWorkflows: []
      });
      useSessionStore.setState({ session });

      useSessionStore.getState().updateSessionStatus('in_progress');

      const updatedSession = useSessionStore.getState().session;
      expect(updatedSession?.projectName).toBe('My Project');
      expect(updatedSession?.methodology).toBe('bmad');
      expect(updatedSession?.currentWorkflow).toBe('brief');
    });
  });

  describe('advanceWorkflow', () => {
    it('should add completed workflow and set next workflow', () => {
      const session = createTestSession({
        completedWorkflows: [],
        currentWorkflow: 'brief',
        currentStep: 0
      });
      useSessionStore.setState({ session });

      useSessionStore.getState().advanceWorkflow('brief', 'prd');

      const state = useSessionStore.getState();
      expect(state.session?.completedWorkflows).toContain('brief');
      expect(state.session?.currentWorkflow).toBe('prd');
      expect(state.session?.currentStep).toBe(1);
    });

    it('should not duplicate completed workflows', () => {
      const session = createTestSession({
        completedWorkflows: ['brief' as WorkflowStep],
        currentWorkflow: 'prd',
        currentStep: 1
      });
      useSessionStore.setState({ session });

      useSessionStore.getState().advanceWorkflow('brief', 'architecture');

      const state = useSessionStore.getState();
      expect(state.session?.completedWorkflows.filter((w) => w === 'brief')).toHaveLength(1);
    });

    it('should set currentWorkflow to null when completing final workflow', () => {
      const session = createTestSession({
        completedWorkflows: ['brief', 'prd', 'architecture', 'epics'] as WorkflowStep[],
        currentWorkflow: 'stories',
        currentStep: 4
      });
      useSessionStore.setState({ session });

      useSessionStore.getState().advanceWorkflow('stories', null);

      expect(useSessionStore.getState().session?.currentWorkflow).toBeNull();
      expect(useSessionStore.getState().session?.completedWorkflows).toContain('stories');
    });

    it('should update updatedAt timestamp', () => {
      const originalDate = '2024-01-01T00:00:00.000Z';
      const session = createTestSession({ updatedAt: originalDate });
      useSessionStore.setState({ session });

      useSessionStore.getState().advanceWorkflow('brief', 'prd');

      expect(useSessionStore.getState().session?.updatedAt).not.toBe(originalDate);
    });

    it('should not advance if no session exists', () => {
      useSessionStore.setState({ session: null });

      useSessionStore.getState().advanceWorkflow('brief', 'prd');

      expect(useSessionStore.getState().session).toBeNull();
    });

    it('should increment currentStep by 1', () => {
      const session = createTestSession({
        completedWorkflows: ['brief', 'prd'] as WorkflowStep[],
        currentWorkflow: 'architecture',
        currentStep: 2
      });
      useSessionStore.setState({ session });

      useSessionStore.getState().advanceWorkflow('architecture', 'epics');

      expect(useSessionStore.getState().session?.currentStep).toBe(3);
    });

    it('should handle workflow progression through all BMAD steps', () => {
      const session = createTestSession({
        completedWorkflows: [],
        currentWorkflow: 'brief',
        currentStep: 0
      });
      useSessionStore.setState({ session });

      // Advance through all workflows
      const workflows: [WorkflowStep, WorkflowStep | null][] = [
        ['brief', 'prd'],
        ['prd', 'architecture'],
        ['architecture', 'epics'],
        ['epics', 'stories'],
        ['stories', null]
      ];

      for (const [completed, next] of workflows) {
        useSessionStore.getState().advanceWorkflow(completed, next);
      }

      const state = useSessionStore.getState();
      expect(state.session?.completedWorkflows).toEqual(['brief', 'prd', 'architecture', 'epics', 'stories']);
      expect(state.session?.currentWorkflow).toBeNull();
      expect(state.session?.currentStep).toBe(5);
    });
  });

  describe('Chat State - Initial State', () => {
    it('should have idle chat status initially', () => {
      const { chatStatus } = useSessionStore.getState();
      expect(chatStatus.phase).toBe('idle');
      expect(chatStatus.message).toBe('');
    });

    it('should have empty streaming content initially', () => {
      expect(useSessionStore.getState().streamingContent).toBe('');
    });
  });

  describe('setChatStatus', () => {
    it('should set chat status to thinking', () => {
      const status: PlanningChatStatus = { phase: 'thinking', message: 'Processing...' };

      useSessionStore.getState().setChatStatus(status);

      const { chatStatus } = useSessionStore.getState();
      expect(chatStatus.phase).toBe('thinking');
      expect(chatStatus.message).toBe('Processing...');
    });

    it('should set chat status to streaming', () => {
      const status: PlanningChatStatus = { phase: 'streaming', message: 'Receiving response...' };

      useSessionStore.getState().setChatStatus(status);

      expect(useSessionStore.getState().chatStatus.phase).toBe('streaming');
    });

    it('should set chat status with error', () => {
      const status: PlanningChatStatus = { phase: 'error', error: 'Connection failed' };

      useSessionStore.getState().setChatStatus(status);

      const { chatStatus } = useSessionStore.getState();
      expect(chatStatus.phase).toBe('error');
      expect(chatStatus.error).toBe('Connection failed');
    });

    it('should set chat status to complete', () => {
      useSessionStore.setState({ chatStatus: { phase: 'streaming', message: 'Receiving...' } });

      useSessionStore.getState().setChatStatus({ phase: 'complete', message: '' });

      expect(useSessionStore.getState().chatStatus.phase).toBe('complete');
    });
  });

  describe('addMessage', () => {
    it('should add user message to session', () => {
      const session = createTestSession({ messages: [] });
      useSessionStore.setState({ session });

      const message = createTestMessage({ role: 'user', content: 'Hello' });
      useSessionStore.getState().addMessage(message);

      const { session: updatedSession } = useSessionStore.getState();
      expect(updatedSession?.messages).toHaveLength(1);
      expect(updatedSession?.messages[0].content).toBe('Hello');
      expect(updatedSession?.messages[0].role).toBe('user');
    });

    it('should add assistant message to session', () => {
      const session = createTestSession({ messages: [] });
      useSessionStore.setState({ session });

      const message = createTestMessage({ role: 'assistant', content: 'Hi there!' });
      useSessionStore.getState().addMessage(message);

      const { session: updatedSession } = useSessionStore.getState();
      expect(updatedSession?.messages[0].role).toBe('assistant');
    });

    it('should append message to existing messages', () => {
      const existingMessage = createTestMessage({ id: 'msg-1', content: 'First' });
      const session = createTestSession({ messages: [existingMessage] });
      useSessionStore.setState({ session });

      const newMessage = createTestMessage({ id: 'msg-2', content: 'Second' });
      useSessionStore.getState().addMessage(newMessage);

      const { session: updatedSession } = useSessionStore.getState();
      expect(updatedSession?.messages).toHaveLength(2);
      expect(updatedSession?.messages[0].content).toBe('First');
      expect(updatedSession?.messages[1].content).toBe('Second');
    });

    it('should update session updatedAt timestamp', () => {
      const originalDate = '2024-01-01T00:00:00.000Z';
      const session = createTestSession({ updatedAt: originalDate, messages: [] });
      useSessionStore.setState({ session });

      const message = createTestMessage();
      useSessionStore.getState().addMessage(message);

      expect(useSessionStore.getState().session?.updatedAt).not.toBe(originalDate);
    });

    it('should not modify state if no session exists', () => {
      useSessionStore.setState({ session: null });

      const message = createTestMessage();
      useSessionStore.getState().addMessage(message);

      expect(useSessionStore.getState().session).toBeNull();
    });
  });

  describe('appendStreamingContent', () => {
    it('should append content to empty streaming content', () => {
      useSessionStore.getState().appendStreamingContent('Hello');

      expect(useSessionStore.getState().streamingContent).toBe('Hello');
    });

    it('should append content to existing streaming content', () => {
      useSessionStore.setState({ streamingContent: 'Hello' });

      useSessionStore.getState().appendStreamingContent(' world');

      expect(useSessionStore.getState().streamingContent).toBe('Hello world');
    });

    it('should handle multiple appends', () => {
      useSessionStore.getState().appendStreamingContent('The ');
      useSessionStore.getState().appendStreamingContent('quick ');
      useSessionStore.getState().appendStreamingContent('brown ');
      useSessionStore.getState().appendStreamingContent('fox');

      expect(useSessionStore.getState().streamingContent).toBe('The quick brown fox');
    });
  });

  describe('clearStreamingContent', () => {
    it('should clear streaming content', () => {
      useSessionStore.setState({ streamingContent: 'Some content' });

      useSessionStore.getState().clearStreamingContent();

      expect(useSessionStore.getState().streamingContent).toBe('');
    });

    it('should work on already empty content', () => {
      useSessionStore.setState({ streamingContent: '' });

      useSessionStore.getState().clearStreamingContent();

      expect(useSessionStore.getState().streamingContent).toBe('');
    });
  });

  describe('finalizeStreamingMessage', () => {
    it('should create assistant message from streaming content', () => {
      const session = createTestSession({ messages: [] });
      useSessionStore.setState({ session, streamingContent: 'Complete response' });

      useSessionStore.getState().finalizeStreamingMessage();

      const { session: updatedSession, streamingContent } = useSessionStore.getState();
      expect(streamingContent).toBe('');
      expect(updatedSession?.messages).toHaveLength(1);
      expect(updatedSession?.messages[0].role).toBe('assistant');
      expect(updatedSession?.messages[0].content).toBe('Complete response');
    });

    it('should clear streaming content after finalization', () => {
      const session = createTestSession({ messages: [] });
      useSessionStore.setState({ session, streamingContent: 'Response' });

      useSessionStore.getState().finalizeStreamingMessage();

      expect(useSessionStore.getState().streamingContent).toBe('');
    });

    it('should update session updatedAt timestamp', () => {
      const originalDate = '2024-01-01T00:00:00.000Z';
      const session = createTestSession({ updatedAt: originalDate, messages: [] });
      useSessionStore.setState({ session, streamingContent: 'Response' });

      useSessionStore.getState().finalizeStreamingMessage();

      expect(useSessionStore.getState().session?.updatedAt).not.toBe(originalDate);
    });

    it('should not create message if streaming content is empty', () => {
      const session = createTestSession({ messages: [] });
      useSessionStore.setState({ session, streamingContent: '' });

      useSessionStore.getState().finalizeStreamingMessage();

      expect(useSessionStore.getState().session?.messages).toHaveLength(0);
    });

    it('should not modify state if no session exists', () => {
      useSessionStore.setState({ session: null, streamingContent: 'Orphan content' });

      useSessionStore.getState().finalizeStreamingMessage();

      expect(useSessionStore.getState().session).toBeNull();
      expect(useSessionStore.getState().streamingContent).toBe('');
    });

    it('should append to existing messages', () => {
      const existingMessage = createTestMessage({ role: 'user', content: 'Question' });
      const session = createTestSession({ messages: [existingMessage] });
      useSessionStore.setState({ session, streamingContent: 'Answer' });

      useSessionStore.getState().finalizeStreamingMessage();

      const { session: updatedSession } = useSessionStore.getState();
      expect(updatedSession?.messages).toHaveLength(2);
      expect(updatedSession?.messages[0].content).toBe('Question');
      expect(updatedSession?.messages[1].content).toBe('Answer');
    });
  });

  describe('clearSession with chat state', () => {
    it('should reset chat status when clearing session', () => {
      useSessionStore.setState({
        session: createTestSession(),
        chatStatus: { phase: 'streaming', message: 'Active' },
        streamingContent: 'In progress...'
      });

      useSessionStore.getState().clearSession();

      const { chatStatus, streamingContent } = useSessionStore.getState();
      expect(chatStatus.phase).toBe('idle');
      expect(chatStatus.message).toBe('');
      expect(streamingContent).toBe('');
    });
  });

  describe('Persistence State (Story 1.3)', () => {
    describe('Initial persistence state', () => {
      it('should have isDirty false initially', () => {
        expect(useSessionStore.getState().isDirty).toBe(false);
      });

      it('should have lastSavedAt null initially', () => {
        expect(useSessionStore.getState().lastSavedAt).toBeNull();
      });

      it('should have isSaving false initially', () => {
        expect(useSessionStore.getState().isSaving).toBe(false);
      });
    });

    describe('markDirty', () => {
      it('should mark session as dirty', () => {
        useSessionStore.getState().markDirty();

        expect(useSessionStore.getState().isDirty).toBe(true);
      });

      it('should preserve existing state when marking dirty', () => {
        const session = createTestSession();
        useSessionStore.setState({ session, isDirty: false });

        useSessionStore.getState().markDirty();

        expect(useSessionStore.getState().session).toEqual(session);
        expect(useSessionStore.getState().isDirty).toBe(true);
      });
    });

    describe('State modifications should mark dirty', () => {
      it('should mark dirty when updating session status', () => {
        const session = createTestSession({ status: 'idle' });
        useSessionStore.setState({ session, isDirty: false });

        useSessionStore.getState().updateSessionStatus('in_progress');

        expect(useSessionStore.getState().isDirty).toBe(true);
      });

      it('should mark dirty when advancing workflow', () => {
        const session = createTestSession({
          currentWorkflow: 'brief',
          completedWorkflows: []
        });
        useSessionStore.setState({ session, isDirty: false });

        useSessionStore.getState().advanceWorkflow('brief', 'prd');

        expect(useSessionStore.getState().isDirty).toBe(true);
      });

      it('should mark dirty when adding message', () => {
        const session = createTestSession({ messages: [] });
        useSessionStore.setState({ session, isDirty: false });

        const message = createTestMessage();
        useSessionStore.getState().addMessage(message);

        expect(useSessionStore.getState().isDirty).toBe(true);
      });

      it('should mark dirty when finalizing streaming message', () => {
        const session = createTestSession({ messages: [] });
        useSessionStore.setState({ session, isDirty: false, streamingContent: 'Test content' });

        useSessionStore.getState().finalizeStreamingMessage();

        expect(useSessionStore.getState().isDirty).toBe(true);
      });
    });

    describe('clearSession with persistence state', () => {
      it('should reset isDirty when clearing session', () => {
        useSessionStore.setState({
          session: createTestSession(),
          isDirty: true,
          lastSavedAt: new Date().toISOString(),
          isSaving: false
        });

        useSessionStore.getState().clearSession();

        const { isDirty, lastSavedAt, isSaving } = useSessionStore.getState();
        expect(isDirty).toBe(false);
        expect(lastSavedAt).toBeNull();
        expect(isSaving).toBe(false);
      });
    });
  });
});
