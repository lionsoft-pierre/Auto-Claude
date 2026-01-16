# Story 4.1: Sprint Tagging and Assignment

Status: dev-complete

## Story

As a **Technical Founder**,
I want **to tag tasks with sprint indicators and assign them to sprints**,
so that **I can organize work into executable batches**.

## Acceptance Criteria

1. **AC1: Sprint Assignment**
   - **Given** tasks exist in the Kanban Backlog
   - **When** the user selects a task
   - **Then** they can assign it to a sprint via dropdown or tag
   - **And** the sprint tag appears as a colored indicator on the task

2. **AC2: Sprint Creation**
   - **Given** the user wants to create a new sprint
   - **When** they click "New Sprint"
   - **Then** a sprint is created with a name and status "not started"
   - **And** the sprint appears in the sprint selector

3. **AC3: Visual Sprint Indicators**
   - **Given** tasks are assigned to a sprint
   - **When** the user views the Kanban board
   - **Then** sprint-tagged tasks show their sprint indicator
   - **And** different sprints have different colored tags

4. **AC4: Sprint Unassignment**
   - **Given** a task is assigned to a sprint
   - **When** the user wants to remove it from the sprint
   - **Then** they can unassign the task
   - **And** the sprint tag is removed

## Tasks / Subtasks

- [ ] **Task 1: Create sprintStore** (AC: #1, #2)
  - [ ] 1.1: Create `apps/frontend/src/renderer/stores/planning/sprintStore.ts`
  - [ ] 1.2: Define `Sprint` interface with id, name, status, color
  - [ ] 1.3: Implement `createSprint`, `deleteSprint` actions
  - [ ] 1.4: Implement `assignTaskToSprint`, `unassignTask` actions
  - [ ] 1.5: Persist sprint data to `sprint-queue.json`

- [ ] **Task 2: Create sprint management UI** (AC: #2)
  - [ ] 2.1: Create `SprintManager.tsx` component
  - [ ] 2.2: Display list of sprints with status
  - [ ] 2.3: Add "New Sprint" button with name input
  - [ ] 2.4: Assign unique colors to sprints automatically
  - [ ] 2.5: Add delete sprint option (with confirmation)

- [ ] **Task 3: Implement sprint assignment on tasks** (AC: #1, #4)
  - [ ] 3.1: Add sprint selector dropdown to task detail
  - [ ] 3.2: Show available sprints in dropdown
  - [ ] 3.3: Handle sprint assignment on selection
  - [ ] 3.4: Add "Remove from Sprint" option

- [ ] **Task 4: Create SprintBadge component** (AC: #3)
  - [ ] 4.1: Create `SprintBadge.tsx` component
  - [ ] 4.2: Display sprint name with colored background
  - [ ] 4.3: Support different color schemes
  - [ ] 4.4: Add to task card in Kanban view

- [ ] **Task 5: Integrate with taskStore** (AC: #1, #4)
  - [ ] 5.1: Add `sprintId` field to task type
  - [ ] 5.2: Update task on sprint assignment
  - [ ] 5.3: Clear `sprintId` on unassignment
  - [ ] 5.4: Sync with sprint-queue.json

- [ ] **Task 6: Create IPC handlers for sprints** (AC: #1, #2)
  - [ ] 6.1: Add IPC handler `planning:sprint:create` - Create new sprint
  - [ ] 6.2: Add IPC handler `planning:sprint:delete` - Delete sprint
  - [ ] 6.3: Add IPC handler `planning:sprint:assign` - Assign task to sprint
  - [ ] 6.4: Add IPC handler `planning:sprint:list` - List all sprints

- [ ] **Task 7: Add i18n translations** (AC: #1, #2, #3, #4)
  - [ ] 7.1: Add sprint labels to `en/planning.json`
  - [ ] 7.2: Add sprint labels to `fr/planning.json`
  - [ ] 7.3: Add status and action messages

- [ ] **Task 8: Write tests** (AC: all)
  - [ ] 8.1: Unit tests for sprintStore actions
  - [ ] 8.2: Component tests for SprintManager
  - [ ] 8.3: Test sprint assignment flow
  - [ ] 8.4: Test color assignment logic

## Dev Notes

### Critical Implementation Rules

1. **Dedicated Sprint Queue**: Per architecture - separate `sprint-queue.json`
2. **Color Uniqueness**: Each sprint gets a unique color from palette
3. **i18n Required**: All labels via translations
4. **Task Schema Extension**: Add `sprintId` to existing task type

### Sprint Data Structure

```typescript
// sprintStore.ts
interface Sprint {
  id: string;
  name: string;
  status: 'not_started' | 'in_progress' | 'completed';
  color: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

interface SprintQueue {
  sprints: Sprint[];
  assignments: {
    taskId: string;
    storyId: string;
    sprintId: string;
    priority: number;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
  }[];
}
```

### Sprint-Queue.json Format

```json
{
  "sprints": [
    {
      "id": "sprint-1",
      "name": "Sprint 1: Core Planning",
      "status": "not_started",
      "color": "#3B82F6",
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ],
  "assignments": [
    {
      "taskId": "task-001",
      "storyId": "story-uuid",
      "sprintId": "sprint-1",
      "priority": 1,
      "status": "pending"
    }
  ]
}
```

### Color Palette for Sprints

```typescript
const SPRINT_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

function getNextSprintColor(existingSprints: Sprint[]): string {
  const usedColors = new Set(existingSprints.map(s => s.color));
  return SPRINT_COLORS.find(c => !usedColors.has(c)) ?? SPRINT_COLORS[0];
}
```

### Sprint Store Implementation

```typescript
// sprintStore.ts
import { create } from 'zustand';

interface SprintState {
  sprints: Sprint[];
  assignments: SprintAssignment[];

  createSprint: (name: string) => Promise<Sprint>;
  deleteSprint: (id: string) => Promise<void>;
  assignTaskToSprint: (taskId: string, sprintId: string) => Promise<void>;
  unassignTask: (taskId: string) => Promise<void>;
  loadSprints: () => Promise<void>;
}

export const useSprintStore = create<SprintState>((set, get) => ({
  sprints: [],
  assignments: [],

  createSprint: async (name) => {
    const color = getNextSprintColor(get().sprints);
    const sprint: Sprint = {
      id: `sprint-${Date.now()}`,
      name,
      status: 'not_started',
      color,
      createdAt: new Date(),
    };

    await window.electronAPI.createSprint(sprint);
    set((state) => ({ sprints: [...state.sprints, sprint] }));
    return sprint;
  },

  assignTaskToSprint: async (taskId, sprintId) => {
    const assignment: SprintAssignment = {
      taskId,
      storyId: '', // Will be populated from task
      sprintId,
      priority: get().assignments.filter(a => a.sprintId === sprintId).length + 1,
      status: 'pending',
    };

    await window.electronAPI.assignTaskToSprint(assignment);
    set((state) => ({
      assignments: [...state.assignments.filter(a => a.taskId !== taskId), assignment]
    }));
  },

  unassignTask: async (taskId) => {
    await window.electronAPI.unassignTask(taskId);
    set((state) => ({
      assignments: state.assignments.filter(a => a.taskId !== taskId)
    }));
  },

  // ... other actions
}));
```

### SprintBadge Component

```tsx
// SprintBadge.tsx
import { useSprintStore } from '../../stores/planning/sprintStore';

interface Props {
  sprintId: string;
  size?: 'sm' | 'md';
}

export const SprintBadge: React.FC<Props> = ({ sprintId, size = 'sm' }) => {
  const sprint = useSprintStore(state =>
    state.sprints.find(s => s.id === sprintId)
  );

  if (!sprint) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
      style={{
        backgroundColor: `${sprint.color}20`,
        color: sprint.color,
        borderColor: sprint.color,
        borderWidth: 1,
      }}
    >
      {sprint.name}
    </span>
  );
};
```

### Sprint Selector in Task Detail

```tsx
// SprintSelector.tsx
import { useTranslation } from 'react-i18next';
import { useSprintStore } from '../../stores/planning/sprintStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

interface Props {
  taskId: string;
  currentSprintId?: string;
}

export const SprintSelector: React.FC<Props> = ({ taskId, currentSprintId }) => {
  const { t } = useTranslation(['planning']);
  const { sprints, assignTaskToSprint, unassignTask } = useSprintStore();

  const handleChange = async (value: string) => {
    if (value === 'none') {
      await unassignTask(taskId);
    } else {
      await assignTaskToSprint(taskId, value);
    }
  };

  return (
    <Select value={currentSprintId ?? 'none'} onValueChange={handleChange}>
      <SelectTrigger>
        <SelectValue placeholder={t('planning:sprint.selectSprint')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">{t('planning:sprint.noSprint')}</SelectItem>
        {sprints.map(sprint => (
          <SelectItem key={sprint.id} value={sprint.id}>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: sprint.color }}
              />
              {sprint.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
```

### i18n Keys

```json
// en/planning.json
{
  "sprint": {
    "title": "Sprints",
    "newSprint": "New Sprint",
    "createSprint": "Create Sprint",
    "sprintName": "Sprint Name",
    "selectSprint": "Select Sprint",
    "noSprint": "No Sprint",
    "assignToSprint": "Assign to Sprint",
    "removeFromSprint": "Remove from Sprint",
    "delete": "Delete Sprint",
    "deleteConfirm": "Are you sure you want to delete this sprint? Tasks will be unassigned.",
    "status": {
      "not_started": "Not Started",
      "in_progress": "In Progress",
      "completed": "Completed"
    }
  }
}

// fr/planning.json
{
  "sprint": {
    "title": "Sprints",
    "newSprint": "Nouveau Sprint",
    "createSprint": "Créer un Sprint",
    "sprintName": "Nom du Sprint",
    "selectSprint": "Sélectionner un Sprint",
    "noSprint": "Aucun Sprint",
    "assignToSprint": "Assigner au Sprint",
    "removeFromSprint": "Retirer du Sprint",
    "delete": "Supprimer le Sprint",
    "deleteConfirm": "Êtes-vous sûr de vouloir supprimer ce sprint? Les tâches seront désassignées.",
    "status": {
      "not_started": "Non commencé",
      "in_progress": "En cours",
      "completed": "Terminé"
    }
  }
}
```

### Project Structure Notes

**New files to create:**
- `apps/frontend/src/renderer/stores/planning/sprintStore.ts`
- `apps/frontend/src/renderer/components/planning/SprintManager.tsx`
- `apps/frontend/src/renderer/components/planning/SprintBadge.tsx`
- `apps/frontend/src/renderer/components/planning/SprintSelector.tsx`

**Existing files to modify:**
- `apps/frontend/src/renderer/stores/taskStore.ts` - Add sprintId field
- `apps/frontend/src/renderer/components/TaskCard.tsx` - Add sprint badge
- `apps/frontend/src/renderer/components/TaskDetail.tsx` - Add sprint selector
- Main process IPC handlers - Add sprint handlers

### References

- [Source: architecture.md#sprint-execution-architecture] - Sprint queue design
- [Source: architecture.md#dedicated-sprint-queue] - Separate sprint-queue.json

### Test Scope

**Unit** - This story focuses on:
- Sprint CRUD operations
- Task assignment/unassignment
- Color management
- UI components

### Performance Requirements

- Sprint operations < 500ms
- Sprint list renders instantly
- Badge rendering adds minimal overhead to Kanban

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5

### Debug Log References
N/A - No errors during implementation

### Completion Notes List
- Created sprint types in planning.ts (Sprint, SprintAssignment, SprintQueue, SprintStatus, SprintAssignmentStatus, SprintStats, PriorityUpdate)
- Added 11 IPC channels for sprint operations (list, create, delete, assign, unassign, queue get/reorder, start, complete, status changed)
- Implemented IPC handlers with sprint queue persistence to sprint-queue.json
- Created sprint-store.ts with Zustand for state management
- Created SprintBadge.tsx, SprintSelector.tsx, SprintStatusBadge.tsx, SprintList.tsx components
- Added i18n translations for sprints in both English and French
- Updated browser-mock.ts with sprint mocks

### File List
- apps/frontend/src/shared/types/planning.ts - Added sprint types
- apps/frontend/src/shared/constants/ipc.ts - Added sprint IPC channels
- apps/frontend/src/shared/types/ipc.ts - Added sprint methods to ElectronAPI
- apps/frontend/src/preload/api/modules/planning-api.ts - Added sprint API
- apps/frontend/src/main/ipc-handlers/planning-handlers.ts - Added sprint handlers
- apps/frontend/src/renderer/stores/sprint-store.ts - New sprint store
- apps/frontend/src/renderer/components/planning/sprints/SprintBadge.tsx - New
- apps/frontend/src/renderer/components/planning/sprints/SprintSelector.tsx - New
- apps/frontend/src/renderer/components/planning/sprints/SprintStatusBadge.tsx - New
- apps/frontend/src/renderer/components/planning/sprints/SprintList.tsx - New
- apps/frontend/src/shared/i18n/locales/en/planning.json - Added sprints section
- apps/frontend/src/shared/i18n/locales/fr/planning.json - Added sprints section
- apps/frontend/src/renderer/lib/browser-mock.ts - Added sprint mocks
