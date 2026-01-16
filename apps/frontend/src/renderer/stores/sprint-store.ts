import { create } from 'zustand';
import type {
  Sprint,
  SprintAssignment,
  SprintQueue,
  SprintStatus,
  SprintStats,
  PriorityUpdate
} from '../../shared/types';

interface SprintState {
  // Data
  sprints: Sprint[];
  assignments: SprintAssignment[];
  selectedSprintId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setSprintQueue: (queue: SprintQueue) => void;
  addSprint: (sprint: Sprint) => void;
  removeSprint: (sprintId: string) => void;
  updateSprint: (sprintId: string, updates: Partial<Sprint>) => void;
  addAssignment: (assignment: SprintAssignment) => void;
  removeAssignment: (taskId: string) => void;
  updateAssignments: (sprintId: string, assignments: SprintAssignment[]) => void;
  selectSprint: (sprintId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearSprints: () => void;

  // Selectors
  getSelectedSprint: () => Sprint | undefined;
  getSprintAssignments: (sprintId: string) => SprintAssignment[];
  getSprintStats: (sprintId: string) => SprintStats;
  getTaskSprint: (taskId: string) => Sprint | undefined;
  getTaskAssignment: (taskId: string) => SprintAssignment | undefined;
}

export const useSprintStore = create<SprintState>((set, get) => ({
  sprints: [],
  assignments: [],
  selectedSprintId: null,
  isLoading: false,
  error: null,

  setSprintQueue: (queue) => set({
    sprints: queue.sprints,
    assignments: queue.assignments
  }),

  addSprint: (sprint) => set((state) => ({
    sprints: [...state.sprints, sprint]
  })),

  removeSprint: (sprintId) => set((state) => ({
    sprints: state.sprints.filter(s => s.id !== sprintId),
    assignments: state.assignments.filter(a => a.sprintId !== sprintId),
    selectedSprintId: state.selectedSprintId === sprintId ? null : state.selectedSprintId
  })),

  updateSprint: (sprintId, updates) => set((state) => ({
    sprints: state.sprints.map(s =>
      s.id === sprintId ? { ...s, ...updates } : s
    )
  })),

  addAssignment: (assignment) => set((state) => {
    // Remove existing assignment for this task if any
    const filtered = state.assignments.filter(a => a.taskId !== assignment.taskId);
    return { assignments: [...filtered, assignment] };
  }),

  removeAssignment: (taskId) => set((state) => ({
    assignments: state.assignments.filter(a => a.taskId !== taskId)
  })),

  updateAssignments: (sprintId, newAssignments) => set((state) => {
    // Replace all assignments for this sprint with new ones
    const otherAssignments = state.assignments.filter(a => a.sprintId !== sprintId);
    return { assignments: [...otherAssignments, ...newAssignments] };
  }),

  selectSprint: (sprintId) => set({ selectedSprintId: sprintId }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  clearSprints: () => set({
    sprints: [],
    assignments: [],
    selectedSprintId: null
  }),

  getSelectedSprint: () => {
    const state = get();
    return state.sprints.find(s => s.id === state.selectedSprintId);
  },

  getSprintAssignments: (sprintId) => {
    const state = get();
    return state.assignments
      .filter(a => a.sprintId === sprintId)
      .sort((a, b) => a.priority - b.priority);
  },

  getSprintStats: (sprintId) => {
    const state = get();
    const assignments = state.assignments.filter(a => a.sprintId === sprintId);
    return {
      total: assignments.length,
      completed: assignments.filter(a => a.status === 'completed').length,
      failed: assignments.filter(a => a.status === 'failed').length,
      pending: assignments.filter(a => a.status === 'pending').length,
      inProgress: assignments.filter(a => a.status === 'in_progress').length
    };
  },

  getTaskSprint: (taskId) => {
    const state = get();
    const assignment = state.assignments.find(a => a.taskId === taskId);
    if (!assignment) return undefined;
    return state.sprints.find(s => s.id === assignment.sprintId);
  },

  getTaskAssignment: (taskId) => {
    const state = get();
    return state.assignments.find(a => a.taskId === taskId);
  }
}));

// ============================================================================
// API Functions
// ============================================================================

/**
 * Load sprints for a project
 */
export async function loadSprints(projectId: string): Promise<void> {
  const store = useSprintStore.getState();
  store.setLoading(true);
  store.setError(null);

  try {
    const result = await window.electronAPI.listSprints(projectId);
    if (result.success && result.data) {
      store.setSprintQueue(result.data);
    } else {
      store.setError(result.error || 'Failed to load sprints');
    }
  } catch (error) {
    store.setError(error instanceof Error ? error.message : 'Unknown error');
  } finally {
    store.setLoading(false);
  }
}

/**
 * Create a new sprint
 */
export async function createSprint(
  projectId: string,
  name: string
): Promise<Sprint | null> {
  const store = useSprintStore.getState();

  try {
    const result = await window.electronAPI.createSprint(projectId, name);
    if (result.success && result.data) {
      store.addSprint(result.data);
      return result.data;
    }
    store.setError(result.error || 'Failed to create sprint');
    return null;
  } catch (error) {
    store.setError(error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Delete a sprint
 */
export async function deleteSprint(
  projectId: string,
  sprintId: string
): Promise<boolean> {
  const store = useSprintStore.getState();

  try {
    const result = await window.electronAPI.deleteSprint(projectId, sprintId);
    if (result.success) {
      store.removeSprint(sprintId);
      return true;
    }
    store.setError(result.error || 'Failed to delete sprint');
    return false;
  } catch (error) {
    store.setError(error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

/**
 * Assign a task to a sprint
 */
export async function assignTaskToSprint(
  projectId: string,
  taskId: string,
  sprintId: string,
  storyId?: string
): Promise<SprintAssignment | null> {
  const store = useSprintStore.getState();

  try {
    const result = await window.electronAPI.assignTaskToSprint(projectId, taskId, sprintId, storyId);
    if (result.success && result.data) {
      store.addAssignment(result.data);
      return result.data;
    }
    store.setError(result.error || 'Failed to assign task to sprint');
    return null;
  } catch (error) {
    store.setError(error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Unassign a task from its sprint
 */
export async function unassignTaskFromSprint(
  projectId: string,
  taskId: string
): Promise<boolean> {
  const store = useSprintStore.getState();

  try {
    const result = await window.electronAPI.unassignTaskFromSprint(projectId, taskId);
    if (result.success) {
      store.removeAssignment(taskId);
      return true;
    }
    store.setError(result.error || 'Failed to unassign task');
    return false;
  } catch (error) {
    store.setError(error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

/**
 * Reorder sprint queue
 */
export async function reorderSprintQueue(
  projectId: string,
  sprintId: string,
  priorities: PriorityUpdate[]
): Promise<boolean> {
  const store = useSprintStore.getState();

  try {
    const result = await window.electronAPI.reorderSprintQueue(projectId, sprintId, priorities);
    if (result.success) {
      // Update local assignments with new priorities
      const currentAssignments = store.getSprintAssignments(sprintId);
      const updatedAssignments = currentAssignments.map(a => {
        const update = priorities.find(p => p.taskId === a.taskId);
        return update ? { ...a, priority: update.priority } : a;
      });
      store.updateAssignments(sprintId, updatedAssignments);
      return true;
    }
    store.setError(result.error || 'Failed to reorder queue');
    return false;
  } catch (error) {
    store.setError(error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

/**
 * Start a sprint
 */
export async function startSprint(
  projectId: string,
  sprintId: string
): Promise<Sprint | null> {
  const store = useSprintStore.getState();

  try {
    const result = await window.electronAPI.startSprint(projectId, sprintId);
    if (result.success && result.data) {
      store.updateSprint(sprintId, result.data);
      return result.data;
    }
    store.setError(result.error || 'Failed to start sprint');
    return null;
  } catch (error) {
    store.setError(error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Complete a sprint
 */
export async function completeSprint(
  projectId: string,
  sprintId: string
): Promise<Sprint | null> {
  const store = useSprintStore.getState();

  try {
    const result = await window.electronAPI.completeSprint(projectId, sprintId);
    if (result.success && result.data) {
      store.updateSprint(sprintId, result.data);
      return result.data;
    }
    store.setError(result.error || 'Failed to complete sprint');
    return null;
  } catch (error) {
    store.setError(error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Subscribe to sprint status changes
 */
export function subscribeToSprintChanges(projectId: string): () => void {
  const cleanup = window.electronAPI.onSprintStatusChanged((changedProjectId, sprint) => {
    if (changedProjectId === projectId) {
      const store = useSprintStore.getState();
      store.updateSprint(sprint.id, sprint);
    }
  });
  return cleanup;
}
