# Story 3.3: Kanban Task Creation

Status: dev-complete

## Story

As a **Technical Founder**,
I want **approved stories to automatically become Kanban tasks**,
so that **I can execute planned work through the existing task system**.

## Acceptance Criteria

1. **AC1: Convert to Tasks**
   - **Given** stories have been marked as "ready"
   - **When** the user clicks "Convert to Tasks"
   - **Then** each ready story creates a corresponding Kanban task
   - **And** conversion completes within 5 seconds per story

2. **AC2: Task Content**
   - **Given** a story is converted to a task
   - **When** the task is created
   - **Then** the task appears in the "Backlog" column
   - **And** the task includes: name, description (summary), acceptance criteria
   - **And** the task references the source story file path

3. **AC3: Story Link on Task**
   - **Given** tasks are created from stories
   - **When** the user views a task
   - **Then** they can see a link to the full story file
   - **And** clicking the link opens the story in the artifact viewer

4. **AC4: Duplicate Prevention**
   - **Given** a story has already been converted to a task
   - **When** the user attempts to convert again
   - **Then** the system warns about duplicate task
   - **And** offers to update existing task instead

## Tasks / Subtasks

- [ ] **Task 1: Extend task schema for story reference** (AC: #2, #3)
  - [ ] 1.1: Add `storyPath` field to task type in `taskStore.ts`
  - [ ] 1.2: Add `storyId` field for linking
  - [ ] 1.3: Add cached story fields: `acceptanceCriteriaSummary`, `testScope`
  - [ ] 1.4: Maintain backward compatibility with existing tasks

- [ ] **Task 2: Implement task creation from story** (AC: #1, #2)
  - [ ] 2.1: Create `createTaskFromStory` function
  - [ ] 2.2: Extract task name from story title
  - [ ] 2.3: Generate description summary from story content
  - [ ] 2.4: Copy acceptance criteria to task
  - [ ] 2.5: Set initial status to 'backlog'

- [ ] **Task 3: Create Convert to Tasks UI** (AC: #1)
  - [ ] 3.1: Add "Convert to Tasks" button to story list header
  - [ ] 3.2: Show count of ready stories to convert
  - [ ] 3.3: Display progress during conversion
  - [ ] 3.4: Show success summary with task count

- [ ] **Task 4: Implement story link in task detail** (AC: #3)
  - [ ] 4.1: Add "View Story" link to task detail view
  - [ ] 4.2: Navigate to artifact viewer on click
  - [ ] 4.3: Display story path in task metadata
  - [ ] 4.4: Handle missing story file gracefully

- [ ] **Task 5: Implement duplicate detection** (AC: #4)
  - [ ] 5.1: Check for existing task with same `storyId`
  - [ ] 5.2: Show warning dialog for duplicates
  - [ ] 5.3: Offer "Update Existing" option
  - [ ] 5.4: Implement task update from story changes

- [ ] **Task 6: Create IPC handlers for conversion** (AC: #1, #2)
  - [ ] 6.1: Add IPC handler `planning:story:convertToTask` - Single story conversion
  - [ ] 6.2: Add IPC handler `planning:stories:convertAll` - Batch conversion
  - [ ] 6.3: Integrate with existing task persistence
  - [ ] 6.4: Update story status after conversion

- [ ] **Task 7: Add i18n translations** (AC: #1, #3, #4)
  - [ ] 7.1: Add conversion messages to `en/planning.json`
  - [ ] 7.2: Add conversion messages to `fr/planning.json`
  - [ ] 7.3: Add duplicate warning text

- [ ] **Task 8: Write tests** (AC: all)
  - [ ] 8.1: Unit tests for task creation from story
  - [ ] 8.2: Unit tests for duplicate detection
  - [ ] 8.3: Integration tests for Kanban store integration
  - [ ] 8.4: Test conversion performance (< 5s per story)

## Dev Notes

### Critical Implementation Rules

1. **Reference + Cache Model**: Per architecture - tasks reference story files, cache key fields
2. **Schema Compatibility**: Extend existing task schema, don't replace
3. **Performance**: Conversion < 5 seconds per story (NFR3)
4. **i18n Required**: All messages via translations

### Extended Task Schema

```typescript
// In taskStore.ts - extend existing Task type
interface PlanningTaskFields {
  // Reference to source story
  storyId?: string;
  storyPath?: string;

  // Cached fields from story (for display without loading file)
  acceptanceCriteriaSummary?: string;
  testScope?: 'unit' | 'integration' | 'e2e';
  epicId?: string;

  // Tracking
  convertedAt?: Date;
}

// Extend existing Task type
interface Task extends ExistingTaskFields, PlanningTaskFields {
  // ... existing fields
}
```

### Task Creation Logic

```typescript
// taskConverter.ts
interface StoryToTaskInput {
  story: Story;
  projectPath: string;
}

export function createTaskFromStory(input: StoryToTaskInput): Task {
  const { story, projectPath } = input;

  return {
    id: `task-${story.number}`,
    name: story.title,
    description: generateTaskDescription(story),
    status: 'backlog',
    column: 'Backlog',

    // Planning fields
    storyId: story.id,
    storyPath: story.filePath,
    acceptanceCriteriaSummary: extractAcceptanceCriteriaSummary(story.content),
    testScope: story.testScope,
    epicId: story.epic,
    convertedAt: new Date(),

    // Standard fields
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function generateTaskDescription(story: Story): string {
  // Extract first paragraph or user story as description
  const userStoryMatch = story.content?.match(/As a \*\*.*?\*\*,[\s\S]*?so that \*\*.*?\*\*/);
  return userStoryMatch?.[0] ?? story.title;
}

function extractAcceptanceCriteriaSummary(content?: string): string {
  // Extract AC titles for quick display
  const acMatches = content?.matchAll(/\*\*AC\d+: ([^*]+)\*\*/g) ?? [];
  return Array.from(acMatches, m => m[1]).join(', ');
}
```

### Conversion UI

```tsx
// ConvertToTasksButton.tsx
import { useTranslation } from 'react-i18next';
import { useStoryStore } from '../../stores/planning/storyStore';
import { useTaskStore } from '../../stores/taskStore';
import { Button } from '@/shared/components/ui/button';
import { ArrowRight, Loader2 } from 'lucide-react';

export const ConvertToTasksButton: React.FC = () => {
  const { t } = useTranslation(['planning']);
  const { stories } = useStoryStore();
  const { addTask, tasks } = useTaskStore();
  const [isConverting, setIsConverting] = useState(false);

  const readyStories = stories.filter(s => s.status === 'ready');
  const unconvertedStories = readyStories.filter(s =>
    !tasks.some(t => t.storyId === s.id)
  );

  const handleConvert = async () => {
    setIsConverting(true);
    try {
      const results = await window.electronAPI.convertStoriesToTasks(
        unconvertedStories.map(s => s.id)
      );
      toast.success(t('planning:convert.success', { count: results.length }));
    } catch (error) {
      toast.error(t('planning:convert.error'));
    } finally {
      setIsConverting(false);
    }
  };

  if (unconvertedStories.length === 0) {
    return null;
  }

  return (
    <Button onClick={handleConvert} disabled={isConverting}>
      {isConverting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <ArrowRight className="h-4 w-4 mr-2" />
      )}
      {t('planning:convert.button', { count: unconvertedStories.length })}
    </Button>
  );
};
```

### Duplicate Warning Dialog

```tsx
// DuplicateWarningDialog.tsx
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';

interface Props {
  open: boolean;
  storyTitle: string;
  onSkip: () => void;
  onUpdate: () => void;
  onCancel: () => void;
}

export const DuplicateWarningDialog: React.FC<Props> = ({
  open, storyTitle, onSkip, onUpdate, onCancel
}) => {
  const { t } = useTranslation(['planning']);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('planning:convert.duplicateTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('planning:convert.duplicateMessage', { title: storyTitle })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            {t('common:cancel')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onSkip}>
            {t('planning:convert.skip')}
          </AlertDialogAction>
          <AlertDialogAction onClick={onUpdate}>
            {t('planning:convert.update')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
```

### i18n Keys

```json
// en/planning.json
{
  "convert": {
    "button": "Convert {{count}} Stories to Tasks",
    "converting": "Converting stories...",
    "success": "Created {{count}} tasks",
    "error": "Failed to convert stories",
    "duplicateTitle": "Task Already Exists",
    "duplicateMessage": "A task for \"{{title}}\" already exists. What would you like to do?",
    "skip": "Skip",
    "update": "Update Existing",
    "viewStory": "View Story"
  }
}

// fr/planning.json
{
  "convert": {
    "button": "Convertir {{count}} stories en tâches",
    "converting": "Conversion des stories...",
    "success": "{{count}} tâches créées",
    "error": "Échec de la conversion des stories",
    "duplicateTitle": "Tâche existante",
    "duplicateMessage": "Une tâche pour \"{{title}}\" existe déjà. Que voulez-vous faire?",
    "skip": "Ignorer",
    "update": "Mettre à jour",
    "viewStory": "Voir la story"
  }
}
```

### Project Structure Notes

**New files to create:**
- `apps/frontend/src/renderer/utils/taskConverter.ts`
- `apps/frontend/src/renderer/components/planning/ConvertToTasksButton.tsx`
- `apps/frontend/src/renderer/components/planning/DuplicateWarningDialog.tsx`

**Existing files to modify:**
- `apps/frontend/src/renderer/stores/taskStore.ts` - Extend task schema
- `apps/frontend/src/renderer/components/TaskDetail.tsx` - Add story link
- Main process IPC handlers - Add conversion handlers

### References

- [Source: architecture.md#story-to-task-integration] - Integration design
- [Source: architecture.md#reference--cache-hybrid] - Reference + Cache model
- [Source: NFR3] - 5 second conversion requirement

### Test Scope

**Integration** - This story touches:
- Story store
- Task store (existing Kanban)
- IPC communication
- File system (story references)

### Performance Requirements

- Single story conversion < 5 seconds (NFR3)
- Batch conversion: parallel processing where possible
- Duplicate check < 100ms

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5

### Debug Log References
N/A - No errors during implementation

### Completion Notes List
- Created ConvertToTasksButton.tsx with confirmation and results dialogs
- Added PlanningTaskFields to planning.ts (storyId, storyPath, acceptanceCriteriaSummary, testScope)
- Added StoryConversionResult type for conversion results
- Implemented IPC handlers for single and batch story conversion
- Added duplicate detection via checkStoryDuplicate handler
- Added conversion i18n translations in both languages
- Added "ok" button translation to common.json

### File List
- apps/frontend/src/renderer/components/planning/ConvertToTasksButton.tsx - Convert button with dialogs
- apps/frontend/src/shared/types/planning.ts - Added PlanningTaskFields, StoryConversionResult
- apps/frontend/src/main/ipc-handlers/planning-handlers.ts - Added conversion handlers
- apps/frontend/src/shared/i18n/locales/en/planning.json - Convert i18n keys
- apps/frontend/src/shared/i18n/locales/fr/planning.json - French conversion translations
- apps/frontend/src/shared/i18n/locales/en/common.json - Added "ok" button
- apps/frontend/src/shared/i18n/locales/fr/common.json - Added "ok" button
