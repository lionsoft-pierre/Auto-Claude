# Story 2.4: Artifact Viewing and Editing

Status: ready-for-dev

## Story

As a **Technical Founder**,
I want **to view and edit planning artifacts after generation**,
so that **I can refine them as my understanding evolves**.

## Acceptance Criteria

1. **AC1: Artifact List Display**
   - **Given** planning artifacts exist for a project
   - **When** the user opens the artifact panel
   - **Then** a list of all artifacts is displayed with type and status
   - **And** artifacts are sorted by creation order

2. **AC2: Artifact Viewing**
   - **Given** the artifact list is displayed
   - **When** the user clicks on an artifact
   - **Then** the artifact content renders in a viewer panel
   - **And** markdown formatting is properly displayed

3. **AC3: Edit Mode**
   - **Given** an artifact is displayed in the viewer
   - **When** the user clicks "Edit"
   - **Then** the artifact opens in edit mode
   - **And** the user can modify the markdown content

4. **AC4: Save Changes**
   - **Given** an artifact is being edited
   - **When** the user saves changes
   - **Then** the artifact file is updated
   - **And** the `updated_at` timestamp in frontmatter is set
   - **And** the change is reflected immediately in the viewer

## Tasks / Subtasks

- [ ] **Task 1: Create ArtifactPanel component** (AC: #1)
  - [ ] 1.1: Create `apps/frontend/src/renderer/components/planning/ArtifactPanel.tsx`
  - [ ] 1.2: Implement collapsible sidebar panel layout
  - [ ] 1.3: Display artifact list with type icons
  - [ ] 1.4: Show artifact status badges (draft, in_review, approved)
  - [ ] 1.5: Sort artifacts by workflow order (Brief → PRD → Architecture → Epics → Stories)

- [ ] **Task 2: Create ArtifactViewer component** (AC: #2)
  - [ ] 2.1: Create `apps/frontend/src/renderer/components/planning/ArtifactViewer.tsx`
  - [ ] 2.2: Implement markdown rendering using existing renderer
  - [ ] 2.3: Add scroll sync for large documents
  - [ ] 2.4: Display artifact metadata header (title, status, last updated)

- [ ] **Task 3: Create ArtifactEditor component** (AC: #3, #4)
  - [ ] 3.1: Create `apps/frontend/src/renderer/components/planning/ArtifactEditor.tsx`
  - [ ] 3.2: Implement textarea-based editor for markdown
  - [ ] 3.3: Add live preview option (split view)
  - [ ] 3.4: Add Save and Cancel buttons
  - [ ] 3.5: Implement unsaved changes warning

- [ ] **Task 4: Integrate with artifactStore** (AC: #1, #2, #4)
  - [ ] 4.1: Add `loadArtifactContent` action to load full content
  - [ ] 4.2: Add `updateArtifact` action for saving edits
  - [ ] 4.3: Track `editingArtifact` state for edit mode
  - [ ] 4.4: Implement optimistic UI updates

- [ ] **Task 5: Add IPC handlers for editing** (AC: #4)
  - [ ] 5.1: Add IPC handler `planning:artifact:update` - Update artifact content
  - [ ] 5.2: Update artifact frontmatter on save
  - [ ] 5.3: Validate artifact after edit
  - [ ] 5.4: Return updated artifact metadata

- [ ] **Task 6: Integrate into PlanningView layout** (AC: #1, #2)
  - [ ] 6.1: Add artifact panel toggle button to PlanningHeader
  - [ ] 6.2: Implement sliding panel from right side
  - [ ] 6.3: Handle panel resize (or fixed width)
  - [ ] 6.4: Persist panel open state in user preferences

- [ ] **Task 7: Add i18n translations** (AC: #1, #2, #3, #4)
  - [ ] 7.1: Add artifact panel labels to `en/planning.json`
  - [ ] 7.2: Add artifact panel labels to `fr/planning.json`
  - [ ] 7.3: Add edit mode labels and confirmation messages

- [ ] **Task 8: Write tests** (AC: all)
  - [ ] 8.1: Unit tests for artifact list sorting
  - [ ] 8.2: Component tests for ArtifactViewer markdown rendering
  - [ ] 8.3: Component tests for ArtifactEditor save flow
  - [ ] 8.4: Test unsaved changes warning

## Dev Notes

### Critical Implementation Rules

1. **Markdown Rendering**: Use existing markdown renderer from Insights
2. **i18n Required**: All labels and messages via translations
3. **Unsaved Changes**: Warn before navigation with unsaved edits
4. **Performance**: Load artifact content lazily (list shows metadata only)

### ArtifactPanel Layout

```
┌─────────────────────────────────────────────────────────┐
│ Planning Mode Header                        [Artifacts] │
├───────────────────────────────────┬─────────────────────┤
│                                   │ Artifact Panel      │
│                                   ├─────────────────────┤
│        Chat Area                  │ ▸ Product Brief ✓   │
│                                   │ ▸ PRD ✓             │
│                                   │ ▸ Architecture ●    │
│                                   │ ▸ Epics ○           │
│                                   │ ▸ Stories ○         │
│                                   │                     │
├───────────────────────────────────┴─────────────────────┤
│ Chat Input                                              │
└─────────────────────────────────────────────────────────┘

Legend: ✓ approved  ● current  ○ upcoming
```

### ArtifactPanel Component

```tsx
// ArtifactPanel.tsx
import { useTranslation } from 'react-i18next';
import { useArtifactStore } from '../../stores/planning/artifactStore';
import { cn } from '@/shared/utils';
import { FileText, CheckCircle, Circle, Loader2 } from 'lucide-react';

const ARTIFACT_ORDER = ['product-brief', 'prd', 'architecture', 'epics', 'stories'];

const STATUS_ICONS = {
  draft: Circle,
  in_review: Loader2,
  approved: CheckCircle,
};

export const ArtifactPanel: React.FC = () => {
  const { t } = useTranslation(['planning']);
  const { artifacts, selectedArtifact, selectArtifact } = useArtifactStore();

  const sortedArtifacts = [...artifacts].sort(
    (a, b) => ARTIFACT_ORDER.indexOf(a.type) - ARTIFACT_ORDER.indexOf(b.type)
  );

  return (
    <div className="w-64 border-l bg-background p-4">
      <h3 className="font-semibold mb-4">{t('planning:artifacts.title')}</h3>

      <ul className="space-y-2">
        {sortedArtifacts.map((artifact) => {
          const StatusIcon = STATUS_ICONS[artifact.status];
          return (
            <li key={artifact.id}>
              <button
                onClick={() => selectArtifact(artifact.id)}
                className={cn(
                  'w-full flex items-center gap-2 p-2 rounded-md text-left',
                  'hover:bg-muted transition-colors',
                  selectedArtifact?.id === artifact.id && 'bg-muted'
                )}
              >
                <FileText className="h-4 w-4" />
                <span className="flex-1 truncate">{artifact.title}</span>
                <StatusIcon className={cn(
                  'h-4 w-4',
                  artifact.status === 'approved' && 'text-green-500',
                  artifact.status === 'in_review' && 'text-yellow-500 animate-spin',
                  artifact.status === 'draft' && 'text-gray-400',
                )} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
```

### ArtifactViewer Component

```tsx
// ArtifactViewer.tsx
import { useTranslation } from 'react-i18next';
import { useArtifactStore } from '../../stores/planning/artifactStore';
import { MarkdownRenderer } from '@/shared/components/MarkdownRenderer';
import { Button } from '@/shared/components/ui/button';
import { Edit, X } from 'lucide-react';

export const ArtifactViewer: React.FC = () => {
  const { t } = useTranslation(['planning']);
  const { selectedArtifact, setEditingMode, clearSelection } = useArtifactStore();

  if (!selectedArtifact) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="font-semibold">{selectedArtifact.title}</h2>
          <p className="text-sm text-muted-foreground">
            {t('planning:artifacts.lastUpdated', {
              date: new Date(selectedArtifact.updatedAt).toLocaleDateString()
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditingMode(true)}>
            <Edit className="h-4 w-4 mr-1" />
            {t('planning:artifacts.edit')}
          </Button>
          <Button variant="ghost" size="sm" onClick={clearSelection}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <MarkdownRenderer content={selectedArtifact.content} />
      </div>
    </div>
  );
};
```

### ArtifactEditor Component

```tsx
// ArtifactEditor.tsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useArtifactStore } from '../../stores/planning/artifactStore';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { Save, X, Eye, EyeOff } from 'lucide-react';
import { MarkdownRenderer } from '@/shared/components/MarkdownRenderer';

export const ArtifactEditor: React.FC = () => {
  const { t } = useTranslation(['planning']);
  const { selectedArtifact, updateArtifact, setEditingMode } = useArtifactStore();

  const [content, setContent] = useState(selectedArtifact?.content ?? '');
  const [showPreview, setShowPreview] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    setContent(selectedArtifact?.content ?? '');
    setHasUnsavedChanges(false);
  }, [selectedArtifact?.id]);

  const handleContentChange = (value: string) => {
    setContent(value);
    setHasUnsavedChanges(value !== selectedArtifact?.content);
  };

  const handleSave = async () => {
    if (selectedArtifact) {
      await updateArtifact(selectedArtifact.type, content);
      setHasUnsavedChanges(false);
      setEditingMode(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (!confirm(t('planning:artifacts.unsavedChangesWarning'))) {
        return;
      }
    }
    setEditingMode(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">
          {t('planning:artifacts.editing', { title: selectedArtifact?.title })}
        </h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button variant="default" size="sm" onClick={handleSave} disabled={!hasUnsavedChanges}>
            <Save className="h-4 w-4 mr-1" />
            {t('planning:artifacts.save')}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Editor/Preview */}
      <div className={cn('flex-1 flex', showPreview && 'divide-x')}>
        <Textarea
          className={cn('flex-1 resize-none font-mono text-sm p-4', showPreview && 'w-1/2')}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder={t('planning:artifacts.editorPlaceholder')}
        />
        {showPreview && (
          <div className="w-1/2 overflow-auto p-4">
            <MarkdownRenderer content={content} />
          </div>
        )}
      </div>
    </div>
  );
};
```

### i18n Keys

```json
// en/planning.json
{
  "artifacts": {
    "title": "Artifacts",
    "edit": "Edit",
    "save": "Save",
    "cancel": "Cancel",
    "editing": "Editing: {{title}}",
    "lastUpdated": "Last updated: {{date}}",
    "editorPlaceholder": "Edit markdown content...",
    "unsavedChangesWarning": "You have unsaved changes. Are you sure you want to discard them?",
    "saveSuccess": "Artifact saved successfully",
    "saveError": "Failed to save artifact"
  }
}

// fr/planning.json
{
  "artifacts": {
    "title": "Artefacts",
    "edit": "Modifier",
    "save": "Enregistrer",
    "cancel": "Annuler",
    "editing": "Modification: {{title}}",
    "lastUpdated": "Dernière mise à jour: {{date}}",
    "editorPlaceholder": "Modifier le contenu markdown...",
    "unsavedChangesWarning": "Vous avez des modifications non enregistrées. Voulez-vous vraiment les ignorer?",
    "saveSuccess": "Artefact enregistré avec succès",
    "saveError": "Échec de l'enregistrement de l'artefact"
  }
}
```

### Project Structure Notes

**New files to create:**
- `apps/frontend/src/renderer/components/planning/ArtifactPanel.tsx`
- `apps/frontend/src/renderer/components/planning/ArtifactViewer.tsx`
- `apps/frontend/src/renderer/components/planning/ArtifactEditor.tsx`

**Existing files to modify:**
- `apps/frontend/src/renderer/views/PlanningView.tsx` - Add artifact panel
- `apps/frontend/src/renderer/stores/planning/artifactStore.ts` - Add editing state
- Main process IPC handlers - Add update handler

### References

- [Source: architecture.md#new-frontend-structure] - Component structure
- [Source: project-context.md#framework-specific-rules] - React patterns

### Test Scope

**Unit** - This story focuses on:
- Artifact list sorting
- Markdown rendering
- Edit save/cancel flows
- Unsaved changes detection

### Performance Requirements

- Artifact list loads instantly (metadata cached)
- Full content loaded on selection (lazy loading)
- Markdown rendering < 200ms for large documents
- Edit save completes < 1 second (NFR4)

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### File List
