# State Management with Zustand

This document covers Auto Claude's state management architecture using Zustand, including store patterns, state slicing strategies, persistence approaches, and performance optimization techniques.

**Target Audience:** Developers working with or extending the application's state management layer.

**What You'll Learn:**
- Why Zustand was chosen over Redux or Context API
- Store architecture patterns and organization strategies
- State slicing techniques for modularity and performance
- Persistence strategies (localStorage, IPC-based, buffer management)
- Best practices for actions, selectors, and side effects
- Real code examples from production stores

---

## 🎯 Why Zustand?

Auto Claude uses **Zustand** as its primary state management solution. Here's why:

### Comparison with Alternatives

| Feature | Zustand | Redux | Context API |
|---------|---------|-------|-------------|
| **Bundle Size** | ~1KB | ~8KB | Built-in |
| **Boilerplate** | Minimal | High | Medium |
| **TypeScript Support** | Excellent | Good | Good |
| **Performance** | Fine-grained subscriptions | Selector-based | Re-renders on any change |
| **DevTools** | Yes (via middleware) | Yes | No |
| **Learning Curve** | Gentle | Steep | Gentle |
| **Async Actions** | Built-in | Requires middleware | Manual |

### Key Advantages

**1. Simplicity**
```typescript
// Zustand - One file, clear and concise
const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 }))
}))

// Redux - Requires actions, reducers, types, and setup
// (Would need 3-4 files for equivalent functionality)
```

**2. Performance**
```typescript
// Only re-renders when 'tasks' change, not entire store
const tasks = useTaskStore((state) => state.tasks)

// Context API would re-render on ANY store change
```

**3. No Provider Wrapping**
```typescript
// Zustand - Use anywhere, no Provider needed
const tasks = useTaskStore((state) => state.tasks)

// Context API - Must wrap entire tree
<StoreProvider>
  <App />
</StoreProvider>
```

---

## 🏗️ Store Architecture

### Core Store Structure

Every Zustand store in Auto Claude follows this pattern:

```typescript
// 1. Define the state interface
interface TaskState {
  // State
  tasks: Task[];
  selectedTaskId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions (mutate state)
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;

  // Selectors (computed values)
  getSelectedTask: () => Task | undefined;
  getTasksByStatus: (status: TaskStatus) => Task[];
}

// 2. Create the store
export const useTaskStore = create<TaskState>((set, get) => ({
  // Initial state
  tasks: [],
  selectedTaskId: null,
  isLoading: false,
  error: null,

  // Actions
  setTasks: (tasks) => set({ tasks }),

  addTask: (task) =>
    set((state) => ({
      tasks: [...state.tasks, task]
    })),

  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, ...updates } : t
      )
    })),

  // Selectors
  getSelectedTask: () => {
    const state = get();
    return state.tasks.find((t) => t.id === state.selectedTaskId);
  },

  getTasksByStatus: (status) => {
    const state = get();
    return state.tasks.filter((t) => t.status === status);
  }
}));
```

### Store Organization

Auto Claude has **14 specialized stores**, each handling a specific domain:

```
src/renderer/stores/
├── task-store.ts              # Task/spec state and operations
├── project-store.ts           # Projects, tabs, and selection
├── settings-store.ts          # User preferences and app settings
├── terminal-store.ts          # Terminal sessions and status
├── roadmap-store.ts           # Roadmap features and generation
├── context-store.ts           # Project index and memory status
├── insights-store.ts          # Chat history and AI conversations
├── ideation-store.ts          # Code analysis and suggestions
├── github-store.ts            # GitHub integration state
├── changelog-store.ts         # Release notes and changelogs
├── release-store.ts           # Release management
├── file-explorer-store.ts     # File tree navigation
├── claude-profile-store.ts    # Claude API profile data
└── rate-limit-store.ts        # API rate limiting tracking
```

**Pattern:** One store per feature domain. Stores are kept focused and independent.

---

## 📦 State Slicing Patterns

### Pattern 1: Flat State with Computed Selectors

**Use Case:** Simple state that needs filtering or transformation

```typescript
// From task-store.ts
interface TaskState {
  tasks: Task[];
  selectedTaskId: string | null;

  // Selectors provide computed views
  getSelectedTask: () => Task | undefined;
  getTasksByStatus: (status: TaskStatus) => Task[];
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  selectedTaskId: null,

  getSelectedTask: () => {
    const state = get();
    return state.tasks.find((t) => t.id === state.selectedTaskId);
  },

  getTasksByStatus: (status) => {
    const state = get();
    return state.tasks.filter((t) => t.status === status);
  }
}));

// Usage in component - only re-renders when tasks change
function TaskList() {
  const tasks = useTaskStore((state) => state.tasks);
  const getTasksByStatus = useTaskStore((state) => state.getTasksByStatus);

  const inProgressTasks = getTasksByStatus('in_progress');
  return <div>{/* Render tasks */}</div>;
}
```

### Pattern 2: Nested State with Multiple Concerns

**Use Case:** Store handles multiple related but distinct concerns

```typescript
// From context-store.ts - handles both project index and memory
interface ContextState {
  // Project Index concern
  projectIndex: ProjectIndex | null;
  indexLoading: boolean;
  indexError: string | null;

  // Memory concern
  memoryStatus: GraphitiMemoryStatus | null;
  memoryState: GraphitiMemoryState | null;
  memoryLoading: boolean;
  memoryError: string | null;

  // Search concern
  searchResults: ContextSearchResult[];
  searchLoading: boolean;
  searchQuery: string;

  // Actions for each concern
  setProjectIndex: (index: ProjectIndex | null) => void;
  setMemoryStatus: (status: GraphitiMemoryStatus | null) => void;
  setSearchResults: (results: ContextSearchResult[]) => void;
}
```

**Why?** Keeps related concerns in one place while maintaining clear boundaries.

### Pattern 3: Derived State via Selectors

**Use Case:** Expensive computations that shouldn't run on every render

```typescript
// From roadmap-store.ts
export function getFeatureStats(roadmap: Roadmap | null): {
  total: number;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
  byComplexity: Record<string, number>;
} {
  if (!roadmap) {
    return {
      total: 0,
      byPriority: {},
      byStatus: {},
      byComplexity: {}
    };
  }

  const byPriority: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const byComplexity: Record<string, number> = {};

  roadmap.features.forEach((feature) => {
    byPriority[feature.priority] = (byPriority[feature.priority] || 0) + 1;
    byStatus[feature.status] = (byStatus[feature.status] || 0) + 1;
    byComplexity[feature.complexity] = (byComplexity[feature.complexity] || 0) + 1;
  });

  return {
    total: roadmap.features.length,
    byPriority,
    byStatus,
    byComplexity
  };
}

// Usage - memoized with useMemo if needed
function RoadmapStats() {
  const roadmap = useRoadmapStore((state) => state.roadmap);
  const stats = useMemo(() => getFeatureStats(roadmap), [roadmap]);

  return <div>{/* Display stats */}</div>;
}
```

### Pattern 4: State with Optimistic Updates

**Use Case:** Immediate UI feedback while persisting to backend

```typescript
// From task-store.ts
updateTaskStatus: (taskId, status) =>
  set((state) => ({
    tasks: state.tasks.map((t) => {
      if (t.id !== taskId && t.specId !== taskId) return t;

      // Optimistic update - UI responds immediately
      const executionProgress = status === 'backlog'
        ? { phase: 'idle' as ExecutionPhase, phaseProgress: 0, overallProgress: 0 }
        : t.executionProgress;

      return { ...t, status, executionProgress, updatedAt: new Date() };
    })
  })),

// Helper function handles persistence
export async function persistTaskStatus(
  taskId: string,
  status: TaskStatus
): Promise<boolean> {
  const store = useTaskStore.getState();

  try {
    // Update local state first for immediate feedback
    store.updateTaskStatus(taskId, status);

    // Persist to file
    const result = await window.electronAPI.updateTaskStatus(taskId, status);
    if (!result.success) {
      console.error('Failed to persist task status:', result.error);
      // Could revert optimistic update here if needed
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error persisting task status:', error);
    return false;
  }
}
```

---

## 💾 Persistence Strategies

Auto Claude uses multiple persistence strategies depending on the data's characteristics:

### Strategy 1: No Persistence (Ephemeral State)

**Use Case:** UI state that doesn't need to survive app restarts

```typescript
// From terminal-store.ts
interface TerminalState {
  activeTerminalId: string | null;  // Current active terminal (ephemeral)
  terminals: Terminal[];             // Session data (persisted separately)

  setActiveTerminal: (id: string | null) => void;
}

// No persistence - resets to null on app restart
```

### Strategy 2: localStorage Persistence

**Use Case:** Simple settings or UI preferences (small data, browser-specific)

```typescript
// From task-store.ts - Draft management
const DRAFT_KEY_PREFIX = 'task-creation-draft';

function getDraftKey(projectId: string): string {
  return `${DRAFT_KEY_PREFIX}-${projectId}`;
}

export function saveDraft(draft: TaskDraft): void {
  try {
    const key = getDraftKey(draft.projectId);
    const draftToStore = {
      ...draft,
      // Optimization: Don't store large data in localStorage
      images: draft.images.map(img => ({
        ...img,
        data: undefined // Only thumbnails, not full images
      })),
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(key, JSON.stringify(draftToStore));
  } catch (error) {
    console.error('Failed to save draft:', error);
  }
}

export function loadDraft(projectId: string): TaskDraft | null {
  try {
    const key = getDraftKey(projectId);
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const draft = JSON.parse(stored);
    draft.savedAt = new Date(draft.savedAt);
    return draft as TaskDraft;
  } catch (error) {
    console.error('Failed to load draft:', error);
    return null;
  }
}
```

**⚠️ Limitation:** localStorage has size limits (~5-10MB). Not suitable for large datasets.

### Strategy 3: IPC-Based Persistence

**Use Case:** Data that needs to persist across app restarts and be accessible to main process

```typescript
// From project-store.ts - Tab state persistence
const saveTabStateTimeout: ReturnType<typeof setTimeout> | null = null;

function saveTabStateToMain(): void {
  // Debounce to avoid excessive IPC calls
  if (saveTabStateTimeout) {
    clearTimeout(saveTabStateTimeout);
  }

  saveTabStateTimeout = setTimeout(async () => {
    const store = useProjectStore.getState();
    const tabState = {
      openProjectIds: store.openProjectIds,
      activeProjectId: store.activeProjectId,
      tabOrder: store.tabOrder
    };

    try {
      await window.electronAPI.saveTabState(tabState);
    } catch (err) {
      console.error('[ProjectStore] Failed to save tab state:', err);
    }
  }, 100); // 100ms debounce
}

// Load on startup
export async function loadProjects(): Promise<void> {
  const store = useProjectStore.getState();

  // Load tab state from main process
  const tabStateResult = await window.electronAPI.getTabState();
  if (tabStateResult.success && tabStateResult.data) {
    useProjectStore.setState({
      openProjectIds: tabStateResult.data.openProjectIds || [],
      activeProjectId: tabStateResult.data.activeProjectId || null,
      tabOrder: tabStateResult.data.tabOrder || []
    });
  }

  // Load projects
  const result = await window.electronAPI.getProjects();
  if (result.success && result.data) {
    store.setProjects(result.data);
  }
}
```

**Benefits:**
- Data stored on disk (main process has filesystem access)
- Survives app crashes and restarts
- Can be accessed by both renderer and main processes

### Strategy 4: External Buffer Management (Performance Optimization)

**Use Case:** High-frequency updates that would cause performance issues in React state

```typescript
// From terminal-store.ts - Terminal output buffering
// Terminal output is NOT stored in Zustand to avoid triggering React re-renders

import { terminalBufferManager } from '../lib/terminal-buffer-manager';

export const useTerminalStore = create<TerminalState>((set, get) => ({
  terminals: [],

  // DEPRECATED: Use terminalBufferManager directly
  // Kept for backward compatibility, but does NOT trigger React re-renders
  appendOutput: (id: string, data: string) => {
    terminalBufferManager.append(id, data);
    // No React state update - this is the key performance improvement!
  },

  clearOutputBuffer: (id: string) => {
    terminalBufferManager.clear(id);
  }
}));

// Terminal component reads directly from buffer manager
function TerminalView({ terminalId }: Props) {
  const terminal = useTerminalStore((state) =>
    state.terminals.find(t => t.id === terminalId)
  );

  useEffect(() => {
    // xterm.js reads from buffer manager, not Zustand
    const buffer = terminalBufferManager.get(terminalId);
    xtermInstance.write(buffer);
  }, [terminalId]);

  return <div ref={xtermRef} />;
}
```

**Why?** Terminal output can arrive at 60+ updates/second. Storing in Zustand would cause excessive re-renders and freeze the UI.

---

## 🎬 Actions and State Updates

### Pattern 1: Simple State Updates

```typescript
// From settings-store.ts
setSettings: (settings) => set({ settings }),

updateSettings: (updates) =>
  set((state) => ({
    settings: { ...state.settings, ...updates }
  })),
```

### Pattern 2: Complex State Transformations

```typescript
// From task-store.ts - Update task from implementation plan
updateTaskFromPlan: (taskId, plan) =>
  set((state) => ({
    tasks: state.tasks.map((t) => {
      if (t.id !== taskId && t.specId !== taskId) return t;

      // Extract subtasks from plan
      const subtasks: Subtask[] = plan.phases.flatMap((phase) =>
        phase.subtasks.map((subtask) => ({
          id: subtask.id,
          title: subtask.description,
          description: subtask.description,
          status: subtask.status,
          files: [],
          verification: subtask.verification as Subtask['verification']
        }))
      );

      // Determine status based on subtasks
      const allCompleted = subtasks.length > 0 && subtasks.every((s) => s.status === 'completed');
      const anyInProgress = subtasks.some((s) => s.status === 'in_progress');
      const anyFailed = subtasks.some((s) => s.status === 'failed');

      let status: TaskStatus = t.status;
      let reviewReason: ReviewReason | undefined = t.reviewReason;

      if (allCompleted) {
        status = t.metadata?.sourceType === 'manual' ? 'human_review' : 'ai_review';
        reviewReason = t.metadata?.sourceType === 'manual' ? 'completed' : undefined;
      } else if (anyFailed) {
        status = 'human_review';
        reviewReason = 'errors';
      } else if (anyInProgress) {
        status = 'in_progress';
        reviewReason = undefined;
      }

      return {
        ...t,
        title: plan.feature || t.title,
        subtasks,
        status,
        reviewReason,
        updatedAt: new Date()
      };
    })
  })),
```

### Pattern 3: Array Mutations (Immutable)

```typescript
// From roadmap-store.ts
addFeature: (featureData) => {
  const newId = `feature-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const newFeature: RoadmapFeature = {
    ...featureData,
    id: newId
  };

  set((state) => {
    if (!state.roadmap) return state;

    return {
      roadmap: {
        ...state.roadmap,
        features: [...state.roadmap.features, newFeature], // Immutable append
        updatedAt: new Date()
      }
    };
  });

  return newId;
},

deleteFeature: (featureId) =>
  set((state) => {
    if (!state.roadmap) return state;

    return {
      roadmap: {
        ...state.roadmap,
        features: state.roadmap.features.filter((f) => f.id !== featureId), // Immutable filter
        updatedAt: new Date()
      }
    };
  }),

reorderFeatures: (phaseId, featureIds) =>
  set((state) => {
    if (!state.roadmap) return state;

    // Reconstruct array in new order
    const phaseFeatures = featureIds
      .map((id) => state.roadmap!.features.find((f) => f.id === id))
      .filter((f): f is RoadmapFeature => f !== undefined);

    const otherFeatures = state.roadmap.features.filter(
      (f) => f.phaseId !== phaseId
    );

    return {
      roadmap: {
        ...state.roadmap,
        features: [...otherFeatures, ...phaseFeatures], // Immutable concatenation
        updatedAt: new Date()
      }
    };
  }),
```

**⚠️ Critical:** Always return new objects/arrays. Never mutate state directly!

### Pattern 4: Conditional State Updates

```typescript
// From project-store.ts
closeProjectTab: (projectId) => {
  const state = get();
  const newOpenProjectIds = state.openProjectIds.filter(id => id !== projectId);
  const newTabOrder = state.tabOrder.filter(id => id !== projectId);

  // If closing the active project, select another one
  let newActiveProjectId = state.activeProjectId;
  if (state.activeProjectId === projectId) {
    const remainingTabs = newTabOrder.length > 0 ? newTabOrder : [];
    newActiveProjectId = remainingTabs.length > 0 ? remainingTabs[0] : null;
  }

  set({
    openProjectIds: newOpenProjectIds,
    tabOrder: newTabOrder,
    activeProjectId: newActiveProjectId
  });

  saveTabStateToMain();
},
```

---

## 🔍 Selectors and Computed Values

### Pattern 1: Inline Selectors (Simple)

```typescript
// Usage - extract only what you need
function TaskCard({ taskId }: Props) {
  const task = useTaskStore((state) =>
    state.tasks.find(t => t.id === taskId)
  );

  if (!task) return null;
  return <div>{task.title}</div>;
}
```

**Benefits:** Fine-grained subscriptions. Component only re-renders when that specific task changes.

### Pattern 2: Store-Level Selectors (Reusable)

```typescript
// From task-store.ts
interface TaskState {
  tasks: Task[];

  // Selectors defined in store
  getSelectedTask: () => Task | undefined;
  getTasksByStatus: (status: TaskStatus) => Task[];
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],

  getSelectedTask: () => {
    const state = get();
    return state.tasks.find((t) => t.id === state.selectedTaskId);
  },

  getTasksByStatus: (status) => {
    const state = get();
    return state.tasks.filter((t) => t.status === status);
  }
}));

// Usage
function TaskList() {
  const getTasksByStatus = useTaskStore((state) => state.getTasksByStatus);
  const inProgressTasks = getTasksByStatus('in_progress');

  return <div>{/* Render */}</div>;
}
```

### Pattern 3: External Selector Functions (Complex)

```typescript
// From roadmap-store.ts - Defined outside store
export function getFeaturesByPhase(
  roadmap: Roadmap | null,
  phaseId: string
): RoadmapFeature[] {
  if (!roadmap) return [];
  return roadmap.features.filter((f) => f.phaseId === phaseId);
}

export function getFeaturesByPriority(
  roadmap: Roadmap | null,
  priority: string
): RoadmapFeature[] {
  if (!roadmap) return [];
  return roadmap.features.filter((f) => f.priority === priority);
}

// Usage with memoization
function RoadmapPhaseView({ phaseId }: Props) {
  const roadmap = useRoadmapStore((state) => state.roadmap);
  const features = useMemo(
    () => getFeaturesByPhase(roadmap, phaseId),
    [roadmap, phaseId]
  );

  return <div>{/* Render features */}</div>;
}
```

---

## 🔄 Async Operations and Side Effects

### Pattern 1: Helper Functions for IPC Calls

```typescript
// From task-store.ts - Helper functions outside store
export async function loadTasks(projectId: string): Promise<void> {
  const store = useTaskStore.getState();
  store.setLoading(true);
  store.setError(null);

  try {
    const result = await window.electronAPI.getTasks(projectId);
    if (result.success && result.data) {
      store.setTasks(result.data);
    } else {
      store.setError(result.error || 'Failed to load tasks');
    }
  } catch (error) {
    store.setError(error instanceof Error ? error.message : 'Unknown error');
  } finally {
    store.setLoading(false);
  }
}

export async function createTask(
  projectId: string,
  title: string,
  description: string,
  metadata?: TaskMetadata
): Promise<Task | null> {
  const store = useTaskStore.getState();

  try {
    const result = await window.electronAPI.createTask(projectId, title, description, metadata);
    if (result.success && result.data) {
      store.addTask(result.data);
      return result.data;
    } else {
      store.setError(result.error || 'Failed to create task');
      return null;
    }
  } catch (error) {
    store.setError(error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

// Usage in component
function CreateTaskButton({ projectId }: Props) {
  const handleCreate = async () => {
    const task = await createTask(projectId, 'New Task', 'Description');
    if (task) {
      console.log('Task created:', task.id);
    }
  };

  return <button onClick={handleCreate}>Create Task</button>;
}
```

**Why helper functions?**
- Keeps store definition clean
- Centralizes error handling
- Makes async operations testable
- Allows reuse across components

### Pattern 2: Event Listeners in useEffect

```typescript
// From components - Subscribe to backend events
function TaskListView({ projectId }: Props) {
  const tasks = useTaskStore((state) => state.tasks);

  useEffect(() => {
    // Initial load
    loadTasks(projectId);

    // Subscribe to task updates
    const cleanup = window.electronAPI.onTaskUpdate((updatedTask) => {
      useTaskStore.getState().updateTask(updatedTask.id, updatedTask);
    });

    return cleanup; // Cleanup on unmount
  }, [projectId]);

  return <div>{/* Render tasks */}</div>;
}
```

### Pattern 3: Data Migration on Load

```typescript
// From roadmap-store.ts - Migrate legacy data
function migrateRoadmapIfNeeded(roadmap: Roadmap): Roadmap {
  let needsMigration = false;

  const migratedFeatures = roadmap.features.map((feature) => {
    const migratedFeature = { ...feature };

    // Migrate 'idea' status to 'under_review' (Canny-compatible)
    if ((feature.status as string) === 'idea') {
      migratedFeature.status = 'under_review';
      needsMigration = true;
    }

    // Add default source if missing
    if (!feature.source) {
      migratedFeature.source = { provider: 'internal' } as FeatureSource;
      needsMigration = true;
    }

    return migratedFeature;
  });

  if (needsMigration) {
    console.log('[Roadmap] Migrated roadmap data to latest schema');
    return {
      ...roadmap,
      features: migratedFeatures,
      updatedAt: new Date()
    };
  }

  return roadmap;
}

export async function loadRoadmap(projectId: string): Promise<void> {
  const store = useRoadmapStore.getState();
  const result = await window.electronAPI.getRoadmap(projectId);

  if (result.success && result.data) {
    // Apply migration
    const migratedRoadmap = migrateRoadmapIfNeeded(result.data);
    store.setRoadmap(migratedRoadmap);

    // Persist if migration occurred
    if (migratedRoadmap !== result.data) {
      window.electronAPI.saveRoadmap(projectId, migratedRoadmap);
    }
  }
}
```

---

## ⚡ Performance Optimization Techniques

### Technique 1: Debouncing State Persistence

**Problem:** Frequent state updates cause excessive IPC calls

**Solution:** Debounce persistence operations

```typescript
// From project-store.ts
let saveTabStateTimeout: ReturnType<typeof setTimeout> | null = null;

function saveTabStateToMain(): void {
  // Clear any pending save
  if (saveTabStateTimeout) {
    clearTimeout(saveTabStateTimeout);
  }

  // Debounce saves to avoid excessive IPC calls
  saveTabStateTimeout = setTimeout(async () => {
    const store = useProjectStore.getState();
    const tabState = {
      openProjectIds: store.openProjectIds,
      activeProjectId: store.activeProjectId,
      tabOrder: store.tabOrder
    };

    try {
      await window.electronAPI.saveTabState(tabState);
    } catch (err) {
      console.error('[ProjectStore] Failed to save tab state:', err);
    }
  }, 100); // Only save after 100ms of inactivity
}
```

### Technique 2: Fine-Grained Subscriptions

**Problem:** Component re-renders on any store change

**Solution:** Subscribe only to specific slices

```typescript
// ❌ Bad - Re-renders on any task store change
function TaskCard() {
  const store = useTaskStore();
  return <div>{store.tasks[0]?.title}</div>;
}

// ✅ Good - Only re-renders when tasks array changes
function TaskCard() {
  const tasks = useTaskStore((state) => state.tasks);
  return <div>{tasks[0]?.title}</div>;
}

// ✅ Better - Only re-renders when specific task changes
function TaskCard({ taskId }: Props) {
  const task = useTaskStore((state) =>
    state.tasks.find(t => t.id === taskId)
  );
  return <div>{task?.title}</div>;
}
```

### Technique 3: Shallow Equality Checks

```typescript
import { shallow } from 'zustand/shallow';

// Compare arrays/objects by value, not reference
function TaskList() {
  const taskIds = useTaskStore(
    (state) => state.tasks.map(t => t.id),
    shallow  // Only re-render if array contents change
  );

  return <div>{taskIds.length} tasks</div>;
}
```

### Technique 4: Bypassing State for High-Frequency Updates

**Problem:** Terminal output arrives 60+ times per second

**Solution:** Store outside React state entirely

```typescript
// From terminal-store.ts
// Terminal buffers are NOT in Zustand - they're in a separate singleton

// lib/terminal-buffer-manager.ts
class TerminalBufferManager {
  private buffers = new Map<string, string>();

  append(terminalId: string, data: string): void {
    const existing = this.buffers.get(terminalId) || '';
    this.buffers.set(terminalId, existing + data);
  }

  get(terminalId: string): string {
    return this.buffers.get(terminalId) || '';
  }

  clear(terminalId: string): void {
    this.buffers.set(terminalId, '');
  }
}

export const terminalBufferManager = new TerminalBufferManager();

// Store only references terminal metadata, not output
export const useTerminalStore = create<TerminalState>((set, get) => ({
  terminals: [/* Terminal metadata only */],

  // This does NOT trigger React re-renders
  appendOutput: (id: string, data: string) => {
    terminalBufferManager.append(id, data);
  }
}));
```

---

## 🎓 Best Practices

### 1. Keep State Normalized

**❌ Avoid nested references:**
```typescript
// Bad - Duplicated task data
interface ProjectState {
  projects: {
    id: string;
    tasks: Task[];  // Task data duplicated here
  }[];
}
```

**✅ Use IDs for relationships:**
```typescript
// Good - Single source of truth
interface ProjectState {
  projects: Project[];
}

interface TaskState {
  tasks: Task[];  // Task data here
}

// Link via IDs
function getTasksForProject(projectId: string) {
  return useTaskStore((state) =>
    state.tasks.filter(t => t.projectId === projectId)
  );
}
```

### 2. Use TypeScript Strictly

```typescript
// ✅ Define complete interfaces
interface TaskState {
  tasks: Task[];
  selectedTaskId: string | null;
  isLoading: boolean;
  error: string | null;

  // Document return types
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
}

// ✅ Use the interface in create<T>
export const useTaskStore = create<TaskState>((set, get) => ({ ... }));
```

### 3. Separate Business Logic from Store

```typescript
// ❌ Bad - Business logic in store
addTask: (task) => {
  // Too much logic here
  const validated = validateTask(task);
  if (!validated) return;

  const enriched = enrichWithMetadata(task);
  set((state) => ({ tasks: [...state.tasks, enriched] }));

  // Side effects in store action
  window.electronAPI.saveTask(enriched);
}

// ✅ Good - Business logic in helper function
export async function createTask(taskData: CreateTaskInput): Promise<Task | null> {
  // Validation
  if (!validateTask(taskData)) {
    return null;
  }

  // Enrichment
  const enriched = enrichWithMetadata(taskData);

  // Persistence
  const result = await window.electronAPI.saveTask(enriched);
  if (!result.success) {
    return null;
  }

  // State update
  useTaskStore.getState().addTask(result.data);
  return result.data;
}
```

### 4. Clean Up Listeners

```typescript
// ❌ Bad - Memory leak
useEffect(() => {
  window.electronAPI.onTaskUpdate((task) => {
    useTaskStore.getState().updateTask(task.id, task);
  });
}, []); // Listener never removed!

// ✅ Good - Returns cleanup function
useEffect(() => {
  const cleanup = window.electronAPI.onTaskUpdate((task) => {
    useTaskStore.getState().updateTask(task.id, task);
  });
  return cleanup; // Cleanup on unmount
}, []);
```

### 5. Handle Loading and Error States

```typescript
// ✅ Always include loading and error states
interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// ✅ Use them in components
function TaskList() {
  const tasks = useTaskStore((state) => state.tasks);
  const isLoading = useTaskStore((state) => state.isLoading);
  const error = useTaskStore((state) => state.error);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage message={error} />;
  return <div>{/* Render tasks */}</div>;
}
```

---

## 🔍 Debugging Zustand Stores

### DevTools Integration

```typescript
import { devtools } from 'zustand/middleware';

export const useTaskStore = create<TaskState>()(
  devtools(
    (set, get) => ({
      tasks: [],
      addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
    }),
    { name: 'TaskStore' } // Shows in Redux DevTools
  )
);
```

### Logging State Changes

```typescript
// Add logging middleware for development
const log = (config) => (set, get, api) =>
  config(
    (...args) => {
      console.log('[Store] Previous:', get());
      set(...args);
      console.log('[Store] Updated:', get());
    },
    get,
    api
  );

export const useTaskStore = create<TaskState>()(
  log((set, get) => ({
    tasks: [],
    addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  }))
);
```

### Inspecting Store State

```typescript
// In browser console or component
console.log('Current tasks:', useTaskStore.getState().tasks);

// Subscribe to changes
const unsubscribe = useTaskStore.subscribe((state) => {
  console.log('Store updated:', state);
});

// Clean up
unsubscribe();
```

---

## 🔗 Related Documentation

- **[Frontend Architecture](./architecture.md)** - Electron processes and communication patterns
- **[Component System](./components.md)** - React component patterns and UI library usage
- **[Electron IPC](./electron-ipc.md)** - IPC communication for backend integration
- **[Testing Guide](../testing.md)** - Testing stores and state management

---

## 📚 Further Reading

- [Zustand Official Documentation](https://zustand-demo.pmnd.rs/)
- [Zustand GitHub Repository](https://github.com/pmndrs/zustand)
- [Immer for Immutable Updates](https://immerjs.github.io/immer/) (optional middleware)
- [Redux DevTools](https://github.com/reduxjs/redux-devtools) (compatible with Zustand)

**Happy state managing! 🎉**
