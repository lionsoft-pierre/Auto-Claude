# Story 3.2: Story Review and Editing

Status: ready-for-dev

## Story

As a **Technical Founder**,
I want **to review and edit stories before converting to tasks**,
so that **I can apply the "clarity test" and ensure stories are implementation-ready**.

## Acceptance Criteria

1. **AC1: Story List Display**
   - **Given** stories have been generated
   - **When** the user views the story list
   - **Then** all stories are displayed with title, epic, and status
   - **And** stories are grouped by epic

2. **AC2: Story Detail View**
   - **Given** the story list is displayed
   - **When** the user clicks on a story
   - **Then** the full story content is displayed
   - **And** acceptance criteria are clearly visible

3. **AC3: Story Editing**
   - **Given** a story is displayed
   - **When** the user identifies needed changes
   - **Then** they can edit the story content directly
   - **And** changes are saved to the story file

4. **AC4: Clarity Test Status**
   - **Given** stories are being reviewed
   - **When** the user applies the "clarity test" (could I implement this myself?)
   - **Then** they can mark stories as "ready" or "needs refinement"
   - **And** the status is updated in the story frontmatter

## Tasks / Subtasks

- [ ] **Task 1: Create StoryList component** (AC: #1)
  - [ ] 1.1: Create `apps/frontend/src/renderer/components/planning/StoryList.tsx`
  - [ ] 1.2: Display stories grouped by epic
  - [ ] 1.3: Show title, status badge, and test scope
  - [ ] 1.4: Implement collapsible epic sections
  - [ ] 1.5: Add story count per epic

- [ ] **Task 2: Create StoryDetail component** (AC: #2)
  - [ ] 2.1: Create `apps/frontend/src/renderer/components/planning/StoryDetail.tsx`
  - [ ] 2.2: Render full story content with markdown
  - [ ] 2.3: Highlight acceptance criteria section
  - [ ] 2.4: Display context links as clickable items
  - [ ] 2.5: Show story metadata in header

- [ ] **Task 3: Implement story editing** (AC: #3)
  - [ ] 3.1: Add "Edit" button to StoryDetail
  - [ ] 3.2: Switch to edit mode with textarea
  - [ ] 3.3: Implement save and cancel actions
  - [ ] 3.4: Update frontmatter `updated_at` on save
  - [ ] 3.5: Show unsaved changes warning

- [ ] **Task 4: Implement clarity test workflow** (AC: #4)
  - [ ] 4.1: Add "Mark Ready" and "Needs Refinement" buttons
  - [ ] 4.2: Update story status in frontmatter
  - [ ] 4.3: Show clarity test tooltip explaining the concept
  - [ ] 4.4: Filter stories by status (ready vs needs refinement)

- [ ] **Task 5: Create storyStore for state management** (AC: #1, #2)
  - [ ] 5.1: Create `apps/frontend/src/renderer/stores/planning/storyStore.ts`
  - [ ] 5.2: Implement `loadStories`, `selectStory`, `updateStory` actions
  - [ ] 5.3: Group stories by epic for display
  - [ ] 5.4: Track selected story and edit state

- [ ] **Task 6: Add IPC handlers for stories** (AC: #3, #4)
  - [ ] 6.1: Add IPC handler `planning:story:load` - Load single story content
  - [ ] 6.2: Add IPC handler `planning:story:update` - Save story changes
  - [ ] 6.3: Add IPC handler `planning:story:setStatus` - Update story status

- [ ] **Task 7: Add i18n translations** (AC: #1, #2, #3, #4)
  - [ ] 7.1: Add story list labels to `en/planning.json`
  - [ ] 7.2: Add story list labels to `fr/planning.json`
  - [ ] 7.3: Add clarity test explanation text

- [ ] **Task 8: Write tests** (AC: all)
  - [ ] 8.1: Component tests for StoryList grouping
  - [ ] 8.2: Component tests for StoryDetail rendering
  - [ ] 8.3: Unit tests for storyStore actions
  - [ ] 8.4: Test status transition logic

## Dev Notes

### Critical Implementation Rules

1. **i18n Required**: All labels and messages via translations
2. **Clarity Test**: Explain concept in tooltip - "Could I implement this myself?"
3. **Consistent Editing**: Reuse patterns from ArtifactEditor
4. **Status Persistence**: Update frontmatter on status change

### Story Status Flow

```
draft → ready (passes clarity test)
draft → needs_refinement (needs more detail)
needs_refinement → ready (after editing)
ready → in_progress (converted to task, execution started)
in_progress → completed (execution succeeded)
in_progress → failed (execution failed)
```

### StoryList Component

```tsx
// StoryList.tsx
import { useTranslation } from 'react-i18next';
import { useStoryStore } from '../../stores/planning/storyStore';
import { ChevronDown, ChevronRight, FileText } from 'lucide-react';

interface StoryGroup {
  epicId: string;
  epicTitle: string;
  stories: Story[];
}

export const StoryList: React.FC = () => {
  const { t } = useTranslation(['planning']);
  const { stories, selectStory, selectedStory } = useStoryStore();
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());

  // Group stories by epic
  const groups = useMemo(() => groupStoriesByEpic(stories), [stories]);

  const toggleEpic = (epicId: string) => {
    const next = new Set(expandedEpics);
    if (next.has(epicId)) {
      next.delete(epicId);
    } else {
      next.add(epicId);
    }
    setExpandedEpics(next);
  };

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">{t('planning:stories.title')}</h3>

      {groups.map((group) => (
        <div key={group.epicId} className="border rounded-lg">
          <button
            onClick={() => toggleEpic(group.epicId)}
            className="w-full flex items-center justify-between p-3 hover:bg-muted"
          >
            <span className="font-medium">{group.epicTitle}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {group.stories.length} {t('planning:stories.count')}
              </span>
              {expandedEpics.has(group.epicId) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          </button>

          {expandedEpics.has(group.epicId) && (
            <ul className="border-t">
              {group.stories.map((story) => (
                <li key={story.id}>
                  <button
                    onClick={() => selectStory(story.id)}
                    className={cn(
                      'w-full flex items-center gap-2 p-2 pl-6 hover:bg-muted',
                      selectedStory?.id === story.id && 'bg-muted'
                    )}
                  >
                    <FileText className="h-4 w-4" />
                    <span className="flex-1 text-left truncate">{story.title}</span>
                    <StatusBadge status={story.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
};
```

### Clarity Test Tooltip

```tsx
// ClarityTestTooltip.tsx
import { useTranslation } from 'react-i18next';
import { HelpCircle } from 'lucide-react';
import { Tooltip } from '@/shared/components/ui/tooltip';

export const ClarityTestTooltip: React.FC = () => {
  const { t } = useTranslation(['planning']);

  return (
    <Tooltip content={t('planning:clarityTest.explanation')}>
      <HelpCircle className="h-4 w-4 text-muted-foreground" />
    </Tooltip>
  );
};
```

### Story Store

```typescript
// storyStore.ts
import { create } from 'zustand';

interface Story {
  id: string;
  number: number;
  title: string;
  epic: string;
  status: 'draft' | 'ready' | 'needs_refinement' | 'in_progress' | 'completed' | 'failed';
  testScope: 'unit' | 'integration' | 'e2e';
  content?: string;
  filePath: string;
}

interface StoryState {
  stories: Story[];
  selectedStory: Story | null;
  isEditing: boolean;

  loadStories: () => Promise<void>;
  selectStory: (id: string) => Promise<void>;
  updateStory: (id: string, content: string) => Promise<void>;
  setStoryStatus: (id: string, status: Story['status']) => Promise<void>;
  setEditing: (editing: boolean) => void;
}

export const useStoryStore = create<StoryState>((set, get) => ({
  stories: [],
  selectedStory: null,
  isEditing: false,

  loadStories: async () => {
    const stories = await window.electronAPI.listPlanningStories();
    set({ stories });
  },

  selectStory: async (id) => {
    const story = get().stories.find(s => s.id === id);
    if (story && !story.content) {
      const content = await window.electronAPI.loadPlanningStory(id);
      const fullStory = { ...story, content };
      set({ selectedStory: fullStory });
    } else {
      set({ selectedStory: story ?? null });
    }
  },

  updateStory: async (id, content) => {
    await window.electronAPI.updatePlanningStory(id, content);
    set((state) => ({
      stories: state.stories.map(s =>
        s.id === id ? { ...s, content } : s
      ),
      selectedStory: state.selectedStory?.id === id
        ? { ...state.selectedStory, content }
        : state.selectedStory,
    }));
  },

  setStoryStatus: async (id, status) => {
    await window.electronAPI.setStoryStatus(id, status);
    set((state) => ({
      stories: state.stories.map(s =>
        s.id === id ? { ...s, status } : s
      ),
      selectedStory: state.selectedStory?.id === id
        ? { ...state.selectedStory, status }
        : state.selectedStory,
    }));
  },

  setEditing: (editing) => set({ isEditing: editing }),
}));
```

### i18n Keys

```json
// en/planning.json
{
  "stories": {
    "title": "Stories",
    "count": "stories",
    "markReady": "Mark Ready",
    "needsRefinement": "Needs Refinement",
    "edit": "Edit",
    "save": "Save",
    "cancel": "Cancel"
  },
  "clarityTest": {
    "explanation": "The clarity test: Could you implement this story yourself based only on its description and acceptance criteria? If yes, it's ready. If not, it needs more detail.",
    "label": "Clarity Test"
  },
  "storyStatus": {
    "draft": "Draft",
    "ready": "Ready",
    "needs_refinement": "Needs Refinement",
    "in_progress": "In Progress",
    "completed": "Completed",
    "failed": "Failed"
  }
}

// fr/planning.json
{
  "stories": {
    "title": "Stories",
    "count": "stories",
    "markReady": "Marquer prêt",
    "needsRefinement": "Besoin de raffinement",
    "edit": "Modifier",
    "save": "Enregistrer",
    "cancel": "Annuler"
  },
  "clarityTest": {
    "explanation": "Le test de clarté: Pourriez-vous implémenter cette story vous-même en vous basant uniquement sur sa description et ses critères d'acceptation? Si oui, elle est prête. Sinon, elle a besoin de plus de détails.",
    "label": "Test de clarté"
  },
  "storyStatus": {
    "draft": "Brouillon",
    "ready": "Prêt",
    "needs_refinement": "Besoin de raffinement",
    "in_progress": "En cours",
    "completed": "Terminé",
    "failed": "Échec"
  }
}
```

### Project Structure Notes

**New files to create:**
- `apps/frontend/src/renderer/components/planning/StoryList.tsx`
- `apps/frontend/src/renderer/components/planning/StoryDetail.tsx`
- `apps/frontend/src/renderer/stores/planning/storyStore.ts`

**Existing files to modify:**
- `apps/frontend/src/renderer/views/PlanningView.tsx` - Add story list panel
- Main process IPC handlers - Add story handlers

### References

- [Source: architecture.md#story-file-format] - Story structure
- [Source: product-brief] - Clarity test concept

### Test Scope

**Unit** - This story focuses on:
- Story list rendering and grouping
- Story status management
- Edit/save flows

### Performance Requirements

- Story list loads instantly (metadata only)
- Full story content loaded on selection
- Status updates < 500ms

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### File List
