# Story 2.3: Artifact Review and Approval

Status: ready-for-dev

## Story

As a **Technical Founder**,
I want **to review and approve generated artifacts before finalizing**,
so that **I can ensure quality and make corrections before moving forward**.

## Acceptance Criteria

1. **AC1: Review Presentation**
   - **Given** an artifact has been generated
   - **When** the artifact generation completes
   - **Then** the system presents the artifact for user review
   - **And** asks for explicit approval before proceeding

2. **AC2: Revision Requests**
   - **Given** an artifact is presented for review
   - **When** the user reviews the content
   - **Then** they can request changes by describing what needs modification
   - **And** the AI updates the artifact based on feedback

3. **AC3: Approval Flow**
   - **Given** an artifact has been revised
   - **When** the user is satisfied with the changes
   - **Then** they can approve the artifact
   - **And** the workflow proceeds to the next step
   - **And** the artifact is marked as finalized in its frontmatter

4. **AC4: Rejection and Regeneration**
   - **Given** the user wants to reject an artifact
   - **When** they indicate rejection
   - **Then** the artifact is regenerated from the current workflow step
   - **And** previous context is preserved

## Tasks / Subtasks

- [ ] **Task 1: Implement review state in workflow** (AC: #1, #3)
  - [ ] 1.1: Add `awaiting_review` state to workflow runner
  - [ ] 1.2: Pause workflow execution after artifact generation
  - [ ] 1.3: Store pending artifact reference in session state
  - [ ] 1.4: Track review attempts count for metrics

- [ ] **Task 2: Create review UI components** (AC: #1)
  - [ ] 2.1: Create `ArtifactReviewPrompt.tsx` component
  - [ ] 2.2: Display artifact summary in chat with review options
  - [ ] 2.3: Add "Approve", "Request Changes", "Reject" action buttons
  - [ ] 2.4: Style buttons distinctly (green approve, yellow revise, red reject)

- [ ] **Task 3: Implement revision request handling** (AC: #2)
  - [ ] 3.1: Create revision input mode in chat interface
  - [ ] 3.2: Send revision feedback to Claude agent
  - [ ] 3.3: Stream revised artifact back to user
  - [ ] 3.4: Update artifact file with revisions

- [ ] **Task 4: Implement approval flow** (AC: #3)
  - [ ] 4.1: Add IPC handler `planning:artifact:approve` - Mark artifact approved
  - [ ] 4.2: Update artifact frontmatter status to `approved`
  - [ ] 4.3: Add approval timestamp to frontmatter
  - [ ] 4.4: Trigger workflow progression after approval

- [ ] **Task 5: Implement rejection and regeneration** (AC: #4)
  - [ ] 5.1: Add IPC handler `planning:artifact:reject` - Reject current artifact
  - [ ] 5.2: Archive rejected artifact with timestamp suffix
  - [ ] 5.3: Reset workflow step to regenerate artifact
  - [ ] 5.4: Preserve conversation context for regeneration

- [ ] **Task 6: Update session store with review state** (AC: #1, #3)
  - [ ] 6.1: Add `reviewState` to sessionStore: `'none' | 'pending' | 'revising'`
  - [ ] 6.2: Add `pendingArtifact` reference to sessionStore
  - [ ] 6.3: Implement `approveArtifact`, `requestRevision`, `rejectArtifact` actions
  - [ ] 6.4: Sync review state with backend

- [ ] **Task 7: Add i18n translations** (AC: #1, #2, #3, #4)
  - [ ] 7.1: Add review prompt text to `en/planning.json`
  - [ ] 7.2: Add review prompt text to `fr/planning.json`
  - [ ] 7.3: Add button labels and status messages

- [ ] **Task 8: Write tests** (AC: all)
  - [ ] 8.1: Unit tests for review state transitions
  - [ ] 8.2: Unit tests for artifact status updates
  - [ ] 8.3: Test revision request handling
  - [ ] 8.4: Test rejection and regeneration flow

## Dev Notes

### Critical Implementation Rules

1. **Explicit Approval Required**: Never auto-approve artifacts
2. **State Persistence**: Save review state to session.json
3. **i18n Required**: All button labels and prompts via translations
4. **Context Preservation**: Keep conversation history through revision cycles

### Review Flow State Machine

```
┌─────────────┐
│  generating │
└──────┬──────┘
       │ artifact complete
       ▼
┌─────────────┐     approve      ┌─────────────┐
│   pending   │─────────────────►│  approved   │
│   review    │                  │  (proceed)  │
└──────┬──────┘                  └─────────────┘
       │
       │ request changes
       ▼
┌─────────────┐
│   revising  │◄────────────┐
└──────┬──────┘             │
       │ revision complete  │ more changes
       ▼                    │
┌─────────────┐─────────────┘
│   pending   │
│   review    │
└──────┬──────┘
       │ reject
       ▼
┌─────────────┐
│regenerating │
└─────────────┘
```

### Review UI Component

```tsx
// ArtifactReviewPrompt.tsx
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '../../stores/planning/sessionStore';
import { Button } from '@/shared/components/ui/button';
import { Check, RefreshCw, X } from 'lucide-react';

interface Props {
  artifactType: string;
  artifactTitle: string;
}

export const ArtifactReviewPrompt: React.FC<Props> = ({ artifactType, artifactTitle }) => {
  const { t } = useTranslation(['planning']);
  const { approveArtifact, requestRevision, rejectArtifact } = useSessionStore();

  return (
    <div className="border rounded-lg p-4 bg-muted/50">
      <p className="text-sm text-muted-foreground mb-3">
        {t('planning:review.prompt', { artifact: artifactTitle })}
      </p>

      <div className="flex gap-2">
        <Button
          variant="default"
          className="bg-green-600 hover:bg-green-700"
          onClick={() => approveArtifact(artifactType)}
        >
          <Check className="h-4 w-4 mr-1" />
          {t('planning:review.approve')}
        </Button>

        <Button
          variant="secondary"
          onClick={() => requestRevision(artifactType)}
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          {t('planning:review.requestChanges')}
        </Button>

        <Button
          variant="destructive"
          onClick={() => rejectArtifact(artifactType)}
        >
          <X className="h-4 w-4 mr-1" />
          {t('planning:review.reject')}
        </Button>
      </div>
    </div>
  );
};
```

### Backend Review Handling

```python
# In workflow_runner.py
class WorkflowRunner:
    async def handle_artifact_review(self, action: str, feedback: Optional[str] = None):
        """Handle user review action for pending artifact."""
        if action == 'approve':
            await self._approve_artifact()
        elif action == 'revise':
            await self._revise_artifact(feedback)
        elif action == 'reject':
            await self._reject_and_regenerate()

    async def _approve_artifact(self):
        """Mark artifact as approved and proceed."""
        artifact_path = self._get_current_artifact_path()
        self._update_artifact_status(artifact_path, 'approved')

        # Add approval metadata
        self._add_approval_timestamp(artifact_path)

        # Mark workflow step as complete
        self.session['completed_workflows'].append(self.current_workflow)
        self._save_session()

        # Proceed to next workflow
        next_workflow = self._get_next_workflow()
        if next_workflow:
            await self.start_workflow(next_workflow)

    async def _revise_artifact(self, feedback: str):
        """Request Claude to revise the artifact."""
        # Load current artifact content
        artifact = self.artifact_manager.load_artifact(self.current_workflow)

        # Build revision prompt
        revision_prompt = f"""
The user has requested changes to the {self.current_workflow} artifact.

Current artifact:
{artifact.content}

User feedback:
{feedback}

Please revise the artifact based on this feedback.
"""

        # Get revised content from Claude
        revised_content = await self._execute_revision(revision_prompt)

        # Update artifact with revision
        self.artifact_manager.update_artifact(self.current_workflow, revised_content)

        # Return to pending review state
        self._set_review_state('pending')
```

### Session Store Review State

```typescript
// sessionStore.ts additions
interface SessionState {
  // ... existing
  reviewState: 'none' | 'pending' | 'revising';
  pendingArtifact: { type: string; title: string } | null;

  approveArtifact: (artifactType: string) => Promise<void>;
  requestRevision: (artifactType: string) => void;
  submitRevisionFeedback: (feedback: string) => Promise<void>;
  rejectArtifact: (artifactType: string) => Promise<void>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  reviewState: 'none',
  pendingArtifact: null,

  approveArtifact: async (artifactType) => {
    await window.electronAPI.approvePlanningArtifact(artifactType);
    set({ reviewState: 'none', pendingArtifact: null });
  },

  requestRevision: (artifactType) => {
    set({ reviewState: 'revising' });
    // UI switches to revision input mode
  },

  submitRevisionFeedback: async (feedback) => {
    set({ reviewState: 'pending' }); // Back to pending after revision
    await window.electronAPI.revisePlanningArtifact(feedback);
  },

  rejectArtifact: async (artifactType) => {
    await window.electronAPI.rejectPlanningArtifact(artifactType);
    set({ reviewState: 'none', pendingArtifact: null });
    // Workflow will regenerate
  },
}));
```

### i18n Keys

```json
// en/planning.json
{
  "review": {
    "prompt": "Please review the generated {{artifact}}. You can approve it, request changes, or reject it to regenerate.",
    "approve": "Approve",
    "requestChanges": "Request Changes",
    "reject": "Reject & Regenerate",
    "revisionPlaceholder": "Describe the changes you'd like...",
    "submitRevision": "Submit Feedback",
    "approved": "Artifact approved",
    "revising": "Revising artifact...",
    "regenerating": "Regenerating artifact..."
  }
}

// fr/planning.json
{
  "review": {
    "prompt": "Veuillez examiner le {{artifact}} généré. Vous pouvez l'approuver, demander des modifications, ou le rejeter pour le régénérer.",
    "approve": "Approuver",
    "requestChanges": "Demander des modifications",
    "reject": "Rejeter et régénérer",
    "revisionPlaceholder": "Décrivez les modifications souhaitées...",
    "submitRevision": "Soumettre",
    "approved": "Artefact approuvé",
    "revising": "Révision en cours...",
    "regenerating": "Régénération en cours..."
  }
}
```

### Project Structure Notes

**New files to create:**
- `apps/frontend/src/renderer/components/planning/ArtifactReviewPrompt.tsx`

**Existing files to modify:**
- `apps/backend/planning/workflow_runner.py` - Add review handling
- `apps/frontend/src/renderer/stores/planning/sessionStore.ts` - Add review state
- `apps/frontend/src/renderer/components/planning/PlanningChat.tsx` - Integrate review UI
- Main process IPC handlers - Add review handlers

### References

- [Source: architecture.md#workflow-orchestration] - Review step in workflow
- [Source: project-context.md#error-handling] - Graceful recovery on rejection

### Test Scope

**Unit** - This story focuses on:
- Review state machine transitions
- Artifact status updates
- Frontend review component rendering

### Performance Requirements

- Review prompt renders instantly
- Approval/rejection actions respond < 500ms
- Revision streaming maintains responsiveness

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### File List
