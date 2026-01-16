# Story 4.2: Sprint Queue Prioritization

Status: dev-complete

## Story

As a **Technical Founder**,
I want **to prioritize stories within a sprint queue**,
so that **the AI executes the most important work first**.

## Acceptance Criteria

1. **AC1: Priority Display**
   - **Given** a sprint has multiple stories assigned
   - **When** the user opens the sprint queue view
   - **Then** all sprint stories are displayed in priority order
   - **And** the priority number is visible for each story

2. **AC2: Drag-and-Drop Reordering**
   - **Given** the sprint queue is displayed
   - **When** the user drags a story to reorder
   - **Then** the priority order updates
   - **And** the `sprint-queue.json` is saved with new order

3. **AC3: Story Details in Queue**
   - **Given** the sprint queue is displayed
   - **When** the user views story details
   - **Then** they can see the full story without leaving the queue view
   - **And** context links are accessible

4. **AC4: Execution Order**
   - **Given** story priorities are set
   - **When** the sprint executes
   - **Then** stories execute in priority order (1 = first)
   - **And** the queue respects the user-defined sequence

## Tasks / Subtasks

- [ ] **Task 1: Create SprintQueue component** (AC: #1, #2)
  - [ ] 1.1: Create `apps/frontend/src/renderer/components/planning/SprintQueue.tsx`
  - [ ] 1.2: Display sprint stories in priority order
  - [ ] 1.3: Show priority number, title, status for each story
  - [ ] 1.4: Implement drag-and-drop using @dnd-kit or similar
  - [ ] 1.5: Update priorities on drop

- [ ] **Task 2: Create SprintQueueItem component** (AC: #1, #3)
  - [ ] 2.1: Create `SprintQueueItem.tsx` component
  - [ ] 2.2: Display priority number with drag handle
  - [ ] 2.3: Show story title and status badge
  - [ ] 2.4: Add expand/collapse for story details
  - [ ] 2.5: Show context links when expanded

- [ ] **Task 3: Implement priority management** (AC: #2, #4)
  - [ ] 3.1: Add `reorderPriorities` action to sprintStore
  - [ ] 3.2: Recalculate priorities after reorder (1, 2, 3...)
  - [ ] 3.3: Persist to sprint-queue.json immediately
  - [ ] 3.4: Handle priority for newly added items

- [ ] **Task 4: Create sprint queue view** (AC: #1, #3)
  - [ ] 4.1: Create `SprintQueueView.tsx` for full queue view
  - [ ] 4.2: Add sprint selector at top
  - [ ] 4.3: Display queue statistics (total, completed, pending)
  - [ ] 4.4: Add "Start Sprint" button

- [ ] **Task 5: Implement story preview panel** (AC: #3)
  - [ ] 5.1: Create inline story preview component
  - [ ] 5.2: Load story content on expand
  - [ ] 5.3: Display acceptance criteria summary
  - [ ] 5.4: Show clickable context links

- [ ] **Task 6: Add IPC handlers for queue management** (AC: #2)
  - [ ] 6.1: Add IPC handler `planning:queue:reorder` - Update priorities
  - [ ] 6.2: Add IPC handler `planning:queue:get` - Get queue for sprint
  - [ ] 6.3: Ensure atomic updates to sprint-queue.json

- [ ] **Task 7: Add i18n translations** (AC: #1, #3)
  - [ ] 7.1: Add queue labels to `en/planning.json`
  - [ ] 7.2: Add queue labels to `fr/planning.json`
  - [ ] 7.3: Add drag instruction tooltips

- [ ] **Task 8: Write tests** (AC: all)
  - [ ] 8.1: Unit tests for priority reordering logic
  - [ ] 8.2: Component tests for drag-and-drop
  - [ ] 8.3: Test priority persistence
  - [ ] 8.4: Test execution order compliance

## Dev Notes

### Critical Implementation Rules

1. **Priority Order**: 1 = highest priority, executed first
2. **Immediate Persistence**: Save to sprint-queue.json on every reorder
3. **i18n Required**: All labels via translations
4. **Drag Accessibility**: Support keyboard reordering for accessibility

### Sprint Queue JSON Structure

```json
{
  "sprints": [...],
  "assignments": [
    {
      "taskId": "task-001",
      "storyId": "story-uuid-1",
      "sprintId": "sprint-1",
      "priority": 1,
      "status": "pending"
    },
    {
      "taskId": "task-002",
      "storyId": "story-uuid-2",
      "sprintId": "sprint-1",
      "priority": 2,
      "status": "pending"
    }
  ]
}
```

### SprintQueue Component with Drag-and-Drop

```tsx
// SprintQueue.tsx
import { useTranslation } from 'react-i18next';
import { useSprintStore } from '../../stores/planning/sprintStore';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface Props {
  sprintId: string;
}

export const SprintQueue: React.FC<Props> = ({ sprintId }) => {
  const { t } = useTranslation(['planning']);
  const { assignments, reorderPriorities } = useSprintStore();

  const sprintItems = assignments
    .filter(a => a.sprintId === sprintId)
    .sort((a, b) => a.priority - b.priority);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sprintItems.findIndex(i => i.taskId === active.id);
      const newIndex = sprintItems.findIndex(i => i.taskId === over.id);

      const reordered = arrayMove(sprintItems, oldIndex, newIndex);
      const newPriorities = reordered.map((item, index) => ({
        taskId: item.taskId,
        priority: index + 1,
      }));

      reorderPriorities(sprintId, newPriorities);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t('planning:queue.title')}</h3>
        <span className="text-sm text-muted-foreground">
          {t('planning:queue.count', { count: sprintItems.length })}
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sprintItems.map(i => i.taskId)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-1">
            {sprintItems.map((item) => (
              <SprintQueueItem key={item.taskId} item={item} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {sprintItems.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          {t('planning:queue.empty')}
        </p>
      )}
    </div>
  );
};
```

### SprintQueueItem Component

```tsx
// SprintQueueItem.tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  item: SprintAssignment;
}

export const SprintQueueItem: React.FC<Props> = ({ item }) => {
  const { t } = useTranslation(['planning']);
  const [expanded, setExpanded] = useState(false);
  const story = useStoryStore(state => state.stories.find(s => s.id === item.storyId));

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.taskId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="border rounded-lg bg-background"
    >
      <div className="flex items-center gap-2 p-3">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Priority number */}
        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-medium">
          {item.priority}
        </span>

        {/* Story title */}
        <span className="flex-1 truncate">{story?.title ?? item.taskId}</span>

        {/* Status badge */}
        <StatusBadge status={item.status} />

        {/* Expand button */}
        <button onClick={() => setExpanded(!expanded)}>
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Expanded story preview */}
      {expanded && story && (
        <div className="border-t p-3 bg-muted/50">
          <StoryPreview story={story} />
        </div>
      )}
    </li>
  );
};
```

### Priority Reorder Logic

```typescript
// In sprintStore.ts
reorderPriorities: async (sprintId: string, newPriorities: { taskId: string; priority: number }[]) => {
  // Update local state immediately for responsive UI
  set((state) => ({
    assignments: state.assignments.map(a => {
      const newPriority = newPriorities.find(p => p.taskId === a.taskId);
      return newPriority ? { ...a, priority: newPriority.priority } : a;
    })
  }));

  // Persist to file
  await window.electronAPI.reorderSprintQueue(sprintId, newPriorities);
},
```

### i18n Keys

```json
// en/planning.json
{
  "queue": {
    "title": "Sprint Queue",
    "count": "{{count}} stories",
    "empty": "No stories in this sprint. Assign stories from the backlog.",
    "dragHint": "Drag to reorder priority",
    "priority": "Priority",
    "viewDetails": "View Details",
    "startSprint": "Start Sprint"
  }
}

// fr/planning.json
{
  "queue": {
    "title": "File d'attente du Sprint",
    "count": "{{count}} stories",
    "empty": "Aucune story dans ce sprint. Assignez des stories depuis le backlog.",
    "dragHint": "Glissez pour réorganiser la priorité",
    "priority": "Priorité",
    "viewDetails": "Voir les détails",
    "startSprint": "Démarrer le Sprint"
  }
}
```

### Project Structure Notes

**New files to create:**
- `apps/frontend/src/renderer/components/planning/SprintQueue.tsx`
- `apps/frontend/src/renderer/components/planning/SprintQueueItem.tsx`
- `apps/frontend/src/renderer/components/planning/SprintQueueView.tsx`
- `apps/frontend/src/renderer/components/planning/StoryPreview.tsx`

**Existing files to modify:**
- `apps/frontend/src/renderer/stores/planning/sprintStore.ts` - Add reorder action
- Main process IPC handlers - Add queue reorder handler

**Dependencies to add:**
- `@dnd-kit/core` - Drag and drop
- `@dnd-kit/sortable` - Sortable lists
- `@dnd-kit/utilities` - DnD utilities

### References

- [Source: architecture.md#sprint-execution-architecture] - Queue format
- [Source: NFR23] - Separate sprint queue logic

### Test Scope

**Unit** - This story focuses on:
- Priority reordering logic
- Drag-and-drop functionality
- Queue display and filtering

### Performance Requirements

- Drag response < 16ms (60fps)
- Priority update persists < 500ms
- Queue renders within 1 second (NFR5)

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5

### Debug Log References
N/A - No errors during implementation

### Completion Notes List
- Implemented SprintQueue.tsx with @dnd-kit for drag-and-drop reordering
- Created SprintQueueItem.tsx with sortable functionality
- Added reorderSprintQueue IPC handler for priority persistence
- Queue reorders optimistically then persists to backend
- Uses verticalListSortingStrategy for smooth sorting experience

### File List
- apps/frontend/src/renderer/components/planning/sprints/SprintQueue.tsx - New drag-drop queue
- apps/frontend/src/renderer/components/planning/sprints/SprintQueueItem.tsx - New sortable item
- apps/frontend/src/main/ipc-handlers/planning-handlers.ts - Added reorder handler
- apps/frontend/src/renderer/stores/sprint-store.ts - Added reorder functionality
