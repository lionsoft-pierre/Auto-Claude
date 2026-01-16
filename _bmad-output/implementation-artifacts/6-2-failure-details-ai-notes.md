# Story 6.2: Failure Details and AI Notes

Status: ready-for-dev

## Story

As a **Technical Founder**,
I want **to view failure details and AI notes for failed stories**,
so that **I can understand what went wrong and fix issues**.

## Acceptance Criteria

1. **AC1: Failure Details Panel**
   - **Given** the sprint dashboard shows failed stories
   - **When** the user clicks on a failed story
   - **Then** the failure details panel opens
   - **And** AI notes explaining the failure are displayed

2. **AC2: Detailed Failure Information**
   - **Given** failure details are displayed
   - **When** the user reviews the notes
   - **Then** they see: error description, attempted solutions, AI observations
   - **And** links to relevant code or logs are provided

3. **AC3: Full Context Access**
   - **Given** the failure details panel is open
   - **When** the user wants to see full context
   - **Then** they can open the story file
   - **And** view the complete Failure Log section

4. **AC4: Retry Action**
   - **Given** a failed story has been reviewed
   - **When** the user is ready to retry
   - **Then** they can update the story and re-queue it for execution
   - **And** the story status changes back to "pending"

## Tasks / Subtasks

- [ ] **Task 1: Create FailureDetailsPanel component** (AC: #1, #2)
  - [ ] 1.1: Create `apps/frontend/src/renderer/components/planning/FailureDetailsPanel.tsx`
  - [ ] 1.2: Display as slide-over panel from right
  - [ ] 1.3: Show failure summary at top
  - [ ] 1.4: Display AI analysis sections

- [ ] **Task 2: Parse and display failure log** (AC: #2)
  - [ ] 2.1: Parse Failure Log section from story markdown
  - [ ] 2.2: Display error summary prominently
  - [ ] 2.3: Show AI analysis in readable format
  - [ ] 2.4: Display suggested fixes with code blocks

- [ ] **Task 3: Add artifact links** (AC: #2, #3)
  - [ ] 3.1: Parse artifact links from failure log
  - [ ] 3.2: Display as clickable links
  - [ ] 3.3: Open logs in viewer or external app
  - [ ] 3.4: Show "View Full Story" button

- [ ] **Task 4: Implement retry functionality** (AC: #4)
  - [ ] 4.1: Add "Retry" button to failure panel
  - [ ] 4.2: Show edit option before retry
  - [ ] 4.3: Reset story status to pending
  - [ ] 4.4: Re-add to sprint queue with same priority

- [ ] **Task 5: Create failure summary component** (AC: #1)
  - [ ] 5.1: Create compact failure summary for list view
  - [ ] 5.2: Show error type and brief description
  - [ ] 5.3: Show attempt count
  - [ ] 5.4: Add "View Details" button

- [ ] **Task 6: Add IPC handlers for failure data** (AC: #2, #4)
  - [ ] 6.1: Add IPC handler `planning:failure:get` - Get failure details
  - [ ] 6.2: Add IPC handler `planning:story:retry` - Retry failed story
  - [ ] 6.3: Parse failure log from story file

- [ ] **Task 7: Add i18n translations** (AC: #1, #2, #4)
  - [ ] 7.1: Add failure panel labels to `en/planning.json`
  - [ ] 7.2: Add failure panel labels to `fr/planning.json`
  - [ ] 7.3: Add section headers and button labels

- [ ] **Task 8: Write tests** (AC: all)
  - [ ] 8.1: Unit tests for failure log parsing
  - [ ] 8.2: Component tests for FailureDetailsPanel
  - [ ] 8.3: Test retry functionality
  - [ ] 8.4: Test artifact link handling

## Dev Notes

### Critical Implementation Rules

1. **Readable AI Notes**: Format AI analysis for easy reading
2. **Actionable Suggestions**: Highlight suggested fixes prominently
3. **i18n Required**: All labels via translations
4. **Easy Retry**: One-click retry after review

### Failure Details Panel Layout

```
┌──────────────────────────────────────────────────────┐
│ Failure Details                              [Close] │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Story: Artifact Review and Approval                  │
│ Status: Failed | Attempt: 1 | Duration: 12m 34s      │
│                                                      │
├──────────────────────────────────────────────────────┤
│ Error Summary                                        │
│ ─────────────────────────────────────────────        │
│ QA validation failed: 2 of 4 acceptance criteria    │
│ not met.                                             │
│                                                      │
├──────────────────────────────────────────────────────┤
│ AI Analysis                                          │
│ ─────────────────────────────────────────────        │
│ The implementation correctly handles the happy       │
│ path but fails on edge cases:                        │
│                                                      │
│ 1. AC2 Not Met: The input validation doesn't        │
│    handle empty strings...                           │
│                                                      │
│ 2. AC4 Not Met: The loading state is set but        │
│    never cleared on error...                         │
│                                                      │
├──────────────────────────────────────────────────────┤
│ Suggested Fixes                                      │
│ ─────────────────────────────────────────────        │
│ 1. Add explicit empty string check before regex      │
│                                                      │
│ 2. Add error handling to clear loading state:        │
│    ┌────────────────────────────────────────────┐   │
│    │ } catch (error) {                          │   │
│    │   setIsLoading(false);  // Add this        │   │
│    │   setError(error.message);                 │   │
│    │ }                                          │   │
│    └────────────────────────────────────────────┘   │
│                                                      │
├──────────────────────────────────────────────────────┤
│ Artifacts                                            │
│ ─────────────────────────────────────────────        │
│ 📄 Agent Logs    📄 QA Report                        │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│  [View Full Story]  [Edit Story]  [Retry Story]     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### FailureDetailsPanel Component

```tsx
// FailureDetailsPanel.tsx
import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet';
import { Button } from '@/shared/components/ui/button';
import { MarkdownRenderer } from '@/shared/components/MarkdownRenderer';
import { FileText, RefreshCw, Edit, ExternalLink } from 'lucide-react';

interface Props {
  storyId: string;
  open: boolean;
  onClose: () => void;
}

export const FailureDetailsPanel: React.FC<Props> = ({ storyId, open, onClose }) => {
  const { t } = useTranslation(['planning']);
  const [failureData, setFailureData] = useState<FailureData | null>(null);

  useEffect(() => {
    if (open && storyId) {
      loadFailureDetails(storyId);
    }
  }, [open, storyId]);

  const loadFailureDetails = async (id: string) => {
    const data = await window.electronAPI.getFailureDetails(id);
    setFailureData(data);
  };

  const handleRetry = async () => {
    await window.electronAPI.retryStory(storyId);
    onClose();
  };

  if (!failureData) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('planning:failure.title')}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Story Info */}
          <div>
            <h3 className="font-medium">{failureData.storyTitle}</h3>
            <p className="text-sm text-muted-foreground">
              {t('planning:failure.attempt', { number: failureData.attemptNumber })} |
              {t('planning:failure.duration', { value: formatDuration(failureData.duration) })}
            </p>
          </div>

          {/* Error Summary */}
          <Section title={t('planning:failure.errorSummary')}>
            <p className="text-red-600">{failureData.summary}</p>
          </Section>

          {/* AI Analysis */}
          <Section title={t('planning:failure.aiAnalysis')}>
            <MarkdownRenderer content={failureData.analysis} />
          </Section>

          {/* Suggested Fixes */}
          <Section title={t('planning:failure.suggestedFixes')}>
            <MarkdownRenderer content={failureData.fixes} />
          </Section>

          {/* Artifacts */}
          <Section title={t('planning:failure.artifacts')}>
            <div className="flex gap-2">
              {failureData.artifacts.map((artifact) => (
                <Button
                  key={artifact.path}
                  variant="outline"
                  size="sm"
                  onClick={() => openArtifact(artifact.path)}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  {artifact.name}
                </Button>
              ))}
            </div>
          </Section>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => viewStory(storyId)}>
              <ExternalLink className="h-4 w-4 mr-1" />
              {t('planning:failure.viewStory')}
            </Button>
            <Button variant="outline" onClick={() => editStory(storyId)}>
              <Edit className="h-4 w-4 mr-1" />
              {t('planning:failure.editStory')}
            </Button>
            <Button onClick={handleRetry}>
              <RefreshCw className="h-4 w-4 mr-1" />
              {t('planning:failure.retry')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h4 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">
      {title}
    </h4>
    <div className="pl-0">{children}</div>
  </div>
);
```

### Failure Log Parser

```typescript
// failureLogParser.ts
interface FailureLogEntry {
  attemptNumber: number;
  timestamp: string;
  duration: string;
  phase: string;
  summary: string;
  analysis: string;
  fixes: string;
  rawError: string;
  artifacts: { name: string; path: string }[];
}

export function parseFailureLog(storyContent: string): FailureLogEntry[] {
  const entries: FailureLogEntry[] = [];

  // Find Failure Log section
  const failureLogMatch = storyContent.match(/## Failure Log\n([\s\S]*?)(?=\n## |$)/);
  if (!failureLogMatch) return entries;

  const failureLogContent = failureLogMatch[1];

  // Parse individual attempts
  const attemptPattern = /### Attempt (\d+) - ([\d\-T:Z]+)\n([\s\S]*?)(?=### Attempt|$)/g;
  let match;

  while ((match = attemptPattern.exec(failureLogContent)) !== null) {
    const [, attemptNum, timestamp, content] = match;

    const entry: FailureLogEntry = {
      attemptNumber: parseInt(attemptNum),
      timestamp,
      duration: extractSection(content, 'Duration'),
      phase: extractSection(content, 'Phase'),
      summary: extractSection(content, 'Error Summary'),
      analysis: extractSection(content, 'AI Analysis'),
      fixes: extractSection(content, 'Suggested Fixes'),
      rawError: extractCodeBlock(content, 'Raw Error Output'),
      artifacts: parseArtifactLinks(content),
    };

    entries.push(entry);
  }

  return entries;
}

function extractSection(content: string, sectionName: string): string {
  const pattern = new RegExp(`#### ${sectionName}\\n([\\s\\S]*?)(?=####|$)`);
  const match = content.match(pattern);
  return match ? match[1].trim() : '';
}
```

### Retry Story Action

```typescript
// In storyStore or sprintStore
retryStory: async (storyId: string) => {
  // 1. Update story status
  await window.electronAPI.updateStoryStatus(storyId, 'pending');

  // 2. Update sprint queue assignment
  await window.electronAPI.updateAssignmentStatus(storyId, 'pending');

  // Clear failure fields
  await window.electronAPI.clearAssignmentFailure(storyId);

  // Refresh local state
  set((state) => ({
    stories: state.stories.map(s =>
      s.id === storyId ? { ...s, status: 'pending' } : s
    ),
  }));
},
```

### i18n Keys

```json
// en/planning.json
{
  "failure": {
    "title": "Failure Details",
    "attempt": "Attempt {{number}}",
    "duration": "Duration: {{value}}",
    "errorSummary": "Error Summary",
    "aiAnalysis": "AI Analysis",
    "suggestedFixes": "Suggested Fixes",
    "artifacts": "Artifacts",
    "viewStory": "View Full Story",
    "editStory": "Edit Story",
    "retry": "Retry Story",
    "retryConfirm": "Reset this story to pending and re-queue for execution?",
    "retrySuccess": "Story queued for retry"
  }
}

// fr/planning.json
{
  "failure": {
    "title": "Détails de l'échec",
    "attempt": "Tentative {{number}}",
    "duration": "Durée: {{value}}",
    "errorSummary": "Résumé de l'erreur",
    "aiAnalysis": "Analyse IA",
    "suggestedFixes": "Corrections suggérées",
    "artifacts": "Artefacts",
    "viewStory": "Voir la story complète",
    "editStory": "Modifier la story",
    "retry": "Réessayer",
    "retryConfirm": "Remettre cette story en attente et la relancer?",
    "retrySuccess": "Story remise en file d'attente"
  }
}
```

### Project Structure Notes

**New files to create:**
- `apps/frontend/src/renderer/components/planning/FailureDetailsPanel.tsx`
- `apps/frontend/src/renderer/components/planning/FailureSummary.tsx`
- `apps/frontend/src/renderer/utils/failureLogParser.ts`

**Existing files to modify:**
- `apps/frontend/src/renderer/components/planning/StoryStatusList.tsx` - Add failure click handler
- `apps/frontend/src/renderer/stores/planning/storyStore.ts` - Add retry action

### References

- [Source: Story 5.3] - Failure log format
- [Source: architecture.md#error-handling] - Error display patterns

### Test Scope

**Unit** - This story focuses on:
- Failure log parsing
- Panel rendering
- Retry flow
- Artifact link handling

### Performance Requirements

- Failure details load < 1 second
- Panel opens smoothly (CSS transition)
- Retry action responds < 500ms

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References
N/A - Implementation proceeded without errors

### Completion Notes List
- Created FailureDetailsPanel slide-over component with Sheet UI
- Implemented failure log parser utility to extract failure data from story markdown
- Added multiple attempt selector for viewing different failure attempts
- Added retry functionality with confirmation dialog
- Added IPC handlers: `planning:failure:get` and `planning:story:retry`
- Added API methods: `getFailureDetails` and `retryStory` in planning-api.ts
- Added i18n translations for failure panel (en/planning.json and fr/planning.json)
- Panel displays: error summary, AI analysis, suggested fixes, raw error, and artifacts
- Integrated with StoryStatusList for "View Details" action on failed stories

### File List
**New Files:**
- `apps/frontend/src/renderer/components/planning/FailureDetailsPanel.tsx` - Slide-over panel for failure details
- `apps/frontend/src/renderer/utils/failureLogParser.ts` - Utility for parsing failure logs from markdown

**Modified Files:**
- `apps/frontend/src/main/ipc-handlers/planning-handlers.ts` - Added failure details and retry handlers
- `apps/frontend/src/preload/api/modules/planning-api.ts` - Added API methods
- `apps/frontend/src/shared/constants/ipc.ts` - Added IPC channel constants
- `apps/frontend/src/shared/i18n/locales/en/planning.json` - Added failure translations
- `apps/frontend/src/shared/i18n/locales/fr/planning.json` - Added French failure translations
