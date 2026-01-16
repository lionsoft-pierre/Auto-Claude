# Story 1.4: Workflow Progress Indicator

Status: done

## Story

As a **Technical Founder**,
I want **to see my planning progress and current workflow step**,
so that **I know where I am in the methodology and what's coming next**.

## Acceptance Criteria

1. **AC1: Progress Display**
   - **Given** an active BMAD planning session
   - **When** the Planning Mode view renders
   - **Then** a workflow progress indicator shows the current step
   - **And** completed steps are visually marked as done
   - **And** upcoming steps are visible but dimmed

2. **AC2: Progress Update**
   - **Given** the workflow progress indicator is displayed
   - **When** the user completes a workflow step
   - **Then** the indicator updates to show the new current step
   - **And** the previous step is marked as completed

3. **AC3: BMAD Artifact Chain**
   - **Given** the BMAD workflow is in progress
   - **When** the user views the progress indicator
   - **Then** they see the full artifact chain: Brief → PRD → Architecture → Epics → Stories
   - **And** the current position in the chain is highlighted

## Tasks / Subtasks

- [ ] **Task 1: Create WorkflowProgress component** (AC: #1, #3)
  - [ ] 1.1: Create `apps/frontend/src/renderer/components/planning/WorkflowProgress.tsx`
  - [ ] 1.2: Define BMAD workflow steps array: `['product-brief', 'prd', 'architecture', 'epics', 'stories']`
  - [ ] 1.3: Implement stepper UI with visual states (completed, current, upcoming)
  - [ ] 1.4: Style with Tailwind: completed=green, current=blue, upcoming=gray/dimmed
  - [ ] 1.5: Make steps clickable for future navigation (disabled if not completed)

- [ ] **Task 2: Create workflow step type definitions** (AC: #1, #2)
  - [ ] 2.1: Define `WorkflowStep` type in sessionStore types
  - [ ] 2.2: Define `WorkflowStepStatus` enum: `'completed' | 'current' | 'upcoming'`
  - [ ] 2.3: Add `getStepStatus` selector to sessionStore

- [ ] **Task 3: Integrate progress into PlanningView** (AC: #1, #3)
  - [ ] 3.1: Create `PlanningHeader.tsx` with workflow progress display
  - [ ] 3.2: Import and use `WorkflowProgress` component in header
  - [ ] 3.3: Position progress indicator above chat area
  - [ ] 3.4: Ensure responsive layout (collapse on mobile)

- [ ] **Task 4: Implement progress state derivation** (AC: #2)
  - [ ] 4.1: Add `deriveWorkflowProgress` function to sessionStore
  - [ ] 4.2: Derive step status from `completed_workflows` array
  - [ ] 4.3: Handle edge case: no session (show all steps as upcoming)
  - [ ] 4.4: Handle edge case: session complete (all steps completed)

- [ ] **Task 5: Add step transition animations** (AC: #2)
  - [ ] 5.1: Add subtle transition when step status changes
  - [ ] 5.2: Use CSS transitions for color/opacity changes
  - [ ] 5.3: Optional: Add checkmark animation for completion

- [ ] **Task 6: Add i18n translations** (AC: #1, #3)
  - [ ] 6.1: Add workflow step labels to `en/planning.json`
  - [ ] 6.2: Add workflow step labels to `fr/planning.json`
  - [ ] 6.3: Add accessibility labels for screen readers

- [ ] **Task 7: Write tests** (AC: all)
  - [ ] 7.1: Unit tests for `deriveWorkflowProgress` function
  - [ ] 7.2: Unit tests for step status computation
  - [ ] 7.3: Component tests for WorkflowProgress rendering states

## Dev Notes

### Critical Implementation Rules

1. **i18n Required**: All step labels via `useTranslation()`
2. **Both Languages**: Translations in BOTH `en/planning.json` AND `fr/planning.json`
3. **Derived State**: Progress is computed from session state, not stored separately
4. **Accessibility**: Include aria-labels for screen reader users

### BMAD Workflow Steps

The BMAD methodology follows a fixed sequence:

```typescript
const BMAD_WORKFLOW_STEPS = [
  { id: 'product-brief', labelKey: 'planning:steps.productBrief', icon: Lightbulb },
  { id: 'prd', labelKey: 'planning:steps.prd', icon: FileText },
  { id: 'architecture', labelKey: 'planning:steps.architecture', icon: Boxes },
  { id: 'epics', labelKey: 'planning:steps.epics', icon: Layers },
  { id: 'stories', labelKey: 'planning:steps.stories', icon: BookOpen },
] as const;
```

### Step Status Derivation

```typescript
// In sessionStore.ts
type WorkflowStepStatus = 'completed' | 'current' | 'upcoming';

const deriveWorkflowProgress = (session: PlanningSession | null): Map<string, WorkflowStepStatus> => {
  const statusMap = new Map<string, WorkflowStepStatus>();

  if (!session) {
    // No session - all steps upcoming
    BMAD_WORKFLOW_STEPS.forEach(step => statusMap.set(step.id, 'upcoming'));
    return statusMap;
  }

  const completedSet = new Set(session.completed_workflows);
  let foundCurrent = false;

  BMAD_WORKFLOW_STEPS.forEach(step => {
    if (completedSet.has(step.id)) {
      statusMap.set(step.id, 'completed');
    } else if (!foundCurrent) {
      statusMap.set(step.id, 'current');
      foundCurrent = true;
    } else {
      statusMap.set(step.id, 'upcoming');
    }
  });

  return statusMap;
};
```

### WorkflowProgress Component Pattern

```tsx
// WorkflowProgress.tsx
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '../../stores/planning/sessionStore';
import { cn } from '@/shared/utils';

export const WorkflowProgress: React.FC = () => {
  const { t } = useTranslation(['planning']);
  const session = useSessionStore((state) => state.session);
  const progress = deriveWorkflowProgress(session);

  return (
    <nav aria-label={t('planning:progress.ariaLabel')} className="flex items-center gap-2">
      {BMAD_WORKFLOW_STEPS.map((step, index) => {
        const status = progress.get(step.id) ?? 'upcoming';
        return (
          <React.Fragment key={step.id}>
            {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400" />}
            <WorkflowStep step={step} status={status} />
          </React.Fragment>
        );
      })}
    </nav>
  );
};

const WorkflowStep: React.FC<{ step: typeof BMAD_WORKFLOW_STEPS[number]; status: WorkflowStepStatus }> = ({ step, status }) => {
  const { t } = useTranslation(['planning']);
  const Icon = step.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors',
        status === 'completed' && 'bg-green-100 text-green-800',
        status === 'current' && 'bg-blue-100 text-blue-800 font-medium',
        status === 'upcoming' && 'bg-gray-100 text-gray-400',
      )}
      aria-current={status === 'current' ? 'step' : undefined}
    >
      {status === 'completed' && <Check className="h-4 w-4" />}
      {status !== 'completed' && <Icon className="h-4 w-4" />}
      <span>{t(step.labelKey)}</span>
    </div>
  );
};
```

### i18n Keys Structure

```json
// en/planning.json
{
  "steps": {
    "productBrief": "Product Brief",
    "prd": "PRD",
    "architecture": "Architecture",
    "epics": "Epics",
    "stories": "Stories"
  },
  "progress": {
    "ariaLabel": "Planning workflow progress",
    "completed": "Completed",
    "current": "In Progress",
    "upcoming": "Upcoming"
  }
}

// fr/planning.json
{
  "steps": {
    "productBrief": "Brief Produit",
    "prd": "PRD",
    "architecture": "Architecture",
    "epics": "Epics",
    "stories": "Stories"
  },
  "progress": {
    "ariaLabel": "Progression du workflow de planification",
    "completed": "Terminé",
    "current": "En cours",
    "upcoming": "À venir"
  }
}
```

### Project Structure Notes

**New files to create:**
- `apps/frontend/src/renderer/components/planning/WorkflowProgress.tsx`
- `apps/frontend/src/renderer/components/planning/PlanningHeader.tsx`

**Existing files to modify:**
- `apps/frontend/src/renderer/views/PlanningView.tsx` - Add header with progress
- `apps/frontend/src/renderer/stores/planning/sessionStore.ts` - Add derivation selector
- `apps/frontend/src/shared/i18n/locales/en/planning.json` - Add step labels
- `apps/frontend/src/shared/i18n/locales/fr/planning.json` - Add step labels

### References

- [Source: architecture.md#session-state-structure] - Session fields: `completed_workflows`, `current_step`
- [Source: project-context.md#internationalization-critical] - i18n requirements
- [Source: project-context.md#accessibility-standards] - ARIA patterns

### Test Scope

**Unit** - This story focuses on:
- Progress derivation logic
- Step status computation
- Component rendering states

### Performance Requirements

- Progress indicator renders instantly (derived from session state)
- Transitions should be smooth (CSS only, no JS animation libraries)
- No re-renders on unrelated state changes (selector optimization)

### Accessibility Notes

- Use `aria-current="step"` on current step
- Include `aria-label` on nav container
- Ensure sufficient color contrast for all states
- Support keyboard navigation for future step clicking feature

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Date

2026-01-16

### Git Commit

`bbe94e80` - story1.4 - add workflow progress indicator component

### Completion Notes List

1. **All tasks completed successfully:**
   - Created WorkflowProgress component with BMAD workflow steps
   - Added WorkflowStepStatus type ('completed' | 'current' | 'upcoming')
   - Implemented deriveWorkflowProgress function for status computation
   - Integrated progress indicator into PlanningView header
   - Added CSS transitions for smooth state changes
   - Added i18n translations for workflow steps and progress states (EN/FR)
   - Added 13 unit tests for workflow progress logic

2. **Implementation Decisions:**
   - BMAD workflow steps: Brief → PRD → Architecture → Epics → Stories
   - Step IDs use simple names: 'brief', 'prd', 'architecture', 'epics', 'stories'
   - Icons: Lightbulb, FileText, Boxes, Layers, BookOpen (from lucide-react)
   - Status colors: completed=green, current=primary with ring, upcoming=muted/dimmed
   - ChevronRight separators between steps turn green when previous step completed

3. **Accessibility:**
   - `aria-label` on nav container for screen readers
   - `aria-current="step"` on current step
   - Labels hidden on mobile (icons only), shown on larger screens

4. **Architecture Notes:**
   - Progress derived from session.completedWorkflows array (not stored separately)
   - When all steps completed, no step is marked as 'current'
   - Handles out-of-order completion gracefully (finds first non-completed)

### File List

**Created:**
- `apps/frontend/src/renderer/components/planning/WorkflowProgress.tsx`
- `apps/frontend/src/renderer/__tests__/workflow-progress.test.ts`

**Modified:**
- `apps/frontend/src/renderer/components/planning/PlanningView.tsx` - Added WorkflowProgress to header
- `apps/frontend/src/renderer/stores/planning/sessionStore.ts` - Export WorkflowStepStatus type
- `apps/frontend/src/shared/types/planning.ts` - Added WorkflowStepStatus type
- `apps/frontend/src/shared/i18n/locales/en/planning.json` - Added workflow step and progress translations
- `apps/frontend/src/shared/i18n/locales/fr/planning.json` - Added workflow step and progress translations
