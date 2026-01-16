# Story 6.3: Kanban Sprint Filtering and Context

Status: ready-for-dev

## Story

As a **Technical Founder**,
I want **to filter the Kanban board by sprint and see story context on tasks**,
so that **I can focus on specific sprint work and access full context**.

## Acceptance Criteria

1. **AC1: Sprint Filter**
   - **Given** the Kanban board is displayed
   - **When** the user selects a sprint filter
   - **Then** only tasks from that sprint are shown
   - **And** the filter completes within 1 second

2. **AC2: Filter Clear**
   - **Given** sprint filtering is active
   - **When** the user clears the filter
   - **Then** all tasks are shown again
   - **And** sprint indicators remain visible on tasks

3. **AC3: Story Link on Task**
   - **Given** a task created from a story is displayed
   - **When** the user views task details
   - **Then** a "View Story" link is visible
   - **And** context links to PRD/architecture are accessible

4. **AC4: Story Navigation**
   - **Given** the user clicks "View Story" on a task
   - **When** the story opens
   - **Then** the full story content is displayed in the artifact viewer
   - **And** the user can navigate to linked artifacts

## Tasks / Subtasks

- [ ] **Task 1: Add sprint filter to Kanban toolbar** (AC: #1, #2)
  - [ ] 1.1: Create sprint filter dropdown component
  - [ ] 1.2: Add to existing Kanban toolbar
  - [ ] 1.3: Show "All Sprints" option
  - [ ] 1.4: Display sprint color indicator in dropdown

- [ ] **Task 2: Implement filter logic in taskStore** (AC: #1, #2)
  - [ ] 2.1: Add `sprintFilter` state to taskStore
  - [ ] 2.2: Create `filteredTasks` selector
  - [ ] 2.3: Filter tasks by sprintId
  - [ ] 2.4: Handle "All" filter case

- [ ] **Task 3: Update TaskCard with sprint badge** (AC: #2)
  - [ ] 3.1: Show sprint badge on task cards
  - [ ] 3.2: Use sprint color from sprintStore
  - [ ] 3.3: Make badge small and unobtrusive
  - [ ] 3.4: Show even when filter is active

- [ ] **Task 4: Add story link to TaskDetail** (AC: #3)
  - [ ] 4.1: Check if task has storyPath
  - [ ] 4.2: Display "View Story" button if story exists
  - [ ] 4.3: Show story title preview
  - [ ] 4.4: Display acceptance criteria summary

- [ ] **Task 5: Implement story navigation** (AC: #4)
  - [ ] 5.1: Open story in artifact viewer on click
  - [ ] 5.2: Navigate to Planning view if not already there
  - [ ] 5.3: Select story in artifact panel
  - [ ] 5.4: Enable back navigation to Kanban

- [ ] **Task 6: Add context links preview** (AC: #3)
  - [ ] 6.1: Display context links from story
  - [ ] 6.2: Show PRD and architecture links
  - [ ] 6.3: Make links clickable
  - [ ] 6.4: Open linked artifacts in viewer

- [ ] **Task 7: Add i18n translations** (AC: #1, #3)
  - [ ] 7.1: Add filter labels to `en/tasks.json` or `planning.json`
  - [ ] 7.2: Add filter labels to `fr/tasks.json` or `planning.json`
  - [ ] 7.3: Add story link labels

- [ ] **Task 8: Write tests** (AC: all)
  - [ ] 8.1: Unit tests for filter logic
  - [ ] 8.2: Component tests for filter dropdown
  - [ ] 8.3: Test story navigation
  - [ ] 8.4: Test performance (< 1s filter)

## Dev Notes

### Critical Implementation Rules

1. **Fast Filter**: Filter renders < 1 second (NFR5)
2. **Preserve Badges**: Sprint badges visible even when filtered
3. **i18n Required**: All labels via translations
4. **Seamless Navigation**: Story opens smoothly in viewer

### Sprint Filter in Kanban Toolbar

```
┌──────────────────────────────────────────────────────────────┐
│ Kanban Board                                                 │
├──────────────────────────────────────────────────────────────┤
│ Filter: [All Sprints ▼]  Search: [____________]  [+ New]    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Backlog      │  In Progress  │  Review       │  Done       │
│  ───────────  │  ───────────  │  ───────────  │  ─────────  │
│               │               │               │              │
│  ┌─────────┐  │  ┌─────────┐  │               │              │
│  │ Task 1  │  │  │ Task 3  │  │               │              │
│  │ Sprint1 │  │  │ Sprint1 │  │               │              │
│  └─────────┘  │  └─────────┘  │               │              │
│               │               │               │              │
│  ┌─────────┐  │               │               │              │
│  │ Task 2  │  │               │               │              │
│  │ Sprint2 │  │               │               │              │
│  └─────────┘  │               │               │              │
│               │               │               │              │
└──────────────────────────────────────────────────────────────┘
```

### Sprint Filter Component

```tsx
// SprintFilter.tsx
import { useTranslation } from 'react-i18next';
import { useSprintStore } from '../../stores/planning/sprintStore';
import { useTaskStore } from '../../stores/taskStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

export const SprintFilter: React.FC = () => {
  const { t } = useTranslation(['planning', 'tasks']);
  const { sprints } = useSprintStore();
  const { sprintFilter, setSprintFilter } = useTaskStore();

  return (
    <Select value={sprintFilter ?? 'all'} onValueChange={(v) => setSprintFilter(v === 'all' ? null : v)}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder={t('tasks:filter.selectSprint')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          {t('tasks:filter.allSprints')}
        </SelectItem>
        {sprints.map((sprint) => (
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

### Task Store Filter Integration

```typescript
// In taskStore.ts
interface TaskState {
  tasks: Task[];
  sprintFilter: string | null;

  setSprintFilter: (sprintId: string | null) => void;
  getFilteredTasks: () => Task[];
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  sprintFilter: null,

  setSprintFilter: (sprintId) => set({ sprintFilter: sprintId }),

  getFilteredTasks: () => {
    const { tasks, sprintFilter } = get();
    if (!sprintFilter) return tasks;
    return tasks.filter(t => t.sprintId === sprintFilter);
  },
}));

// Selector for use in components
export const useFilteredTasks = () => {
  const tasks = useTaskStore(state => state.tasks);
  const sprintFilter = useTaskStore(state => state.sprintFilter);

  return useMemo(() => {
    if (!sprintFilter) return tasks;
    return tasks.filter(t => t.sprintId === sprintFilter);
  }, [tasks, sprintFilter]);
};
```

### TaskCard with Sprint Badge

```tsx
// In TaskCard.tsx
import { SprintBadge } from '../planning/SprintBadge';

export const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
  return (
    <div className="p-3 bg-background border rounded-lg shadow-sm">
      <div className="flex items-start justify-between">
        <h4 className="font-medium text-sm">{task.name}</h4>
        {task.sprintId && (
          <SprintBadge sprintId={task.sprintId} size="sm" />
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
        {task.description}
      </p>

      {task.storyPath && (
        <div className="mt-2 text-xs text-blue-500">
          <FileText className="h-3 w-3 inline mr-1" />
          {t('tasks:fromStory')}
        </div>
      )}
    </div>
  );
};
```

### TaskDetail with Story Link

```tsx
// In TaskDetail.tsx - add story section
{task.storyPath && (
  <div className="border-t pt-4 mt-4">
    <h4 className="font-medium text-sm mb-2">
      {t('tasks:storyContext')}
    </h4>

    <div className="space-y-2">
      {/* Story Link */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigateToStory(task.storyId)}
      >
        <FileText className="h-4 w-4 mr-2" />
        {t('tasks:viewStory')}
      </Button>

      {/* Acceptance Criteria Summary */}
      {task.acceptanceCriteriaSummary && (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">{t('tasks:acceptanceCriteria')}:</span>
          <p>{task.acceptanceCriteriaSummary}</p>
        </div>
      )}

      {/* Context Links */}
      {task.contextLinks && (
        <div className="flex gap-2">
          {task.contextLinks.map(link => (
            <Button
              key={link.id}
              variant="ghost"
              size="sm"
              onClick={() => navigateToArtifact(link.path, link.section)}
            >
              {link.type}: {link.title}
            </Button>
          ))}
        </div>
      )}
    </div>
  </div>
)}
```

### Story Navigation

```typescript
// Navigation utility
export function navigateToStory(storyId: string) {
  // Use routing or state to navigate
  const router = useRouter();

  // Navigate to Planning view with story selected
  router.push(`/planning?story=${storyId}`);

  // Or use store-based navigation
  useArtifactStore.getState().selectStoryById(storyId);
  useSidebarStore.getState().setView('planning');
}

export function navigateToArtifact(artifactPath: string, section?: string) {
  const artifactStore = useArtifactStore.getState();
  const artifact = artifactStore.findByPath(artifactPath);

  if (artifact) {
    artifactStore.selectArtifact(artifact.id);
    if (section) {
      // Scroll to section after render
      setTimeout(() => {
        document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }
}
```

### i18n Keys

```json
// en/tasks.json (or planning.json)
{
  "filter": {
    "selectSprint": "Filter by Sprint",
    "allSprints": "All Sprints",
    "clearFilter": "Clear Filter"
  },
  "storyContext": "Story Context",
  "viewStory": "View Story",
  "fromStory": "From Story",
  "acceptanceCriteria": "Acceptance Criteria",
  "contextLinks": "Related Documents"
}

// fr/tasks.json (or planning.json)
{
  "filter": {
    "selectSprint": "Filtrer par Sprint",
    "allSprints": "Tous les Sprints",
    "clearFilter": "Effacer le filtre"
  },
  "storyContext": "Contexte de la Story",
  "viewStory": "Voir la Story",
  "fromStory": "Issue d'une Story",
  "acceptanceCriteria": "Critères d'acceptation",
  "contextLinks": "Documents liés"
}
```

### Project Structure Notes

**New files to create:**
- `apps/frontend/src/renderer/components/tasks/SprintFilter.tsx`

**Existing files to modify:**
- `apps/frontend/src/renderer/stores/taskStore.ts` - Add filter state
- `apps/frontend/src/renderer/components/TaskCard.tsx` - Add sprint badge
- `apps/frontend/src/renderer/components/TaskDetail.tsx` - Add story link
- `apps/frontend/src/renderer/views/KanbanView.tsx` - Add filter to toolbar

### References

- [Source: architecture.md#story-to-task-integration] - Task-story linking
- [Source: NFR5] - 1 second filter requirement

### Test Scope

**Unit** - This story focuses on:
- Filter logic performance
- Task rendering with badges
- Navigation to story
- Context link handling

### Performance Requirements

- Filter renders < 1 second (NFR5)
- Badge rendering minimal overhead
- Navigation is instant

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### File List
