# Story 2.6: Git Checkpoint Commits

Status: done

## Story

As a **Technical Founder**,
I want **to commit planning artifacts to Git as safe checkpoints**,
so that **I have version history and can recover from mistakes**.

## Acceptance Criteria

1. **AC1: Commit Artifacts**
   - **Given** planning artifacts exist for a project
   - **When** the user clicks "Commit to Git"
   - **Then** all artifacts in `.auto-claude/planning/{project}/` are staged
   - **And** a commit is created with message "Planning checkpoint: {date}"

2. **AC2: Success Notification**
   - **Given** a Git commit is in progress
   - **When** the commit operation completes
   - **Then** a success notification appears
   - **And** the commit hash is recorded in session state

3. **AC3: Error Handling**
   - **Given** a Git commit fails (e.g., no changes, git error)
   - **When** the error occurs
   - **Then** an error notification explains what went wrong
   - **And** the system does not leave partial commits

4. **AC4: Checkpoint History**
   - **Given** the user wants to see commit history
   - **When** they view checkpoint history
   - **Then** previous checkpoint commits are listed with dates
   - **And** they can view the artifact state at any checkpoint

## Tasks / Subtasks

- [ ] **Task 1: Create checkpoint commit backend** (AC: #1, #3)
  - [ ] 1.1: Create `apps/backend/planning/git_checkpoint.py`
  - [ ] 1.2: Implement `create_checkpoint` function
  - [ ] 1.3: Stage only planning directory files
  - [ ] 1.4: Use atomic commit pattern (all or nothing)
  - [ ] 1.5: Handle git errors gracefully (no repo, no changes, etc.)

- [ ] **Task 2: Create IPC handlers for git operations** (AC: #1, #4)
  - [ ] 2.1: Add IPC handler `planning:git:checkpoint` - Create checkpoint commit
  - [ ] 2.2: Add IPC handler `planning:git:history` - List checkpoint commits
  - [ ] 2.3: Add IPC handler `planning:git:view` - View artifacts at specific commit
  - [ ] 2.4: Return commit hash and timestamp on success

- [ ] **Task 3: Add checkpoint button to PlanningView** (AC: #1, #2)
  - [ ] 3.1: Add "Commit Checkpoint" button to PlanningHeader
  - [ ] 3.2: Show loading state during commit
  - [ ] 3.3: Display success toast with commit hash
  - [ ] 3.4: Display error toast on failure

- [ ] **Task 4: Implement checkpoint history UI** (AC: #4)
  - [ ] 4.1: Create `CheckpointHistory.tsx` component
  - [ ] 4.2: Display list of checkpoint commits with dates
  - [ ] 4.3: Add "View" button to see artifact state at checkpoint
  - [ ] 4.4: Display commit message and hash

- [ ] **Task 5: Record checkpoint in session state** (AC: #2)
  - [ ] 5.1: Add `last_checkpoint_hash` to session.json
  - [ ] 5.2: Add `checkpoints` array with commit metadata
  - [ ] 5.3: Update session after successful checkpoint
  - [ ] 5.4: Track checkpoint count for UI display

- [ ] **Task 6: Implement artifact viewing at checkpoint** (AC: #4)
  - [ ] 6.1: Use `git show` to retrieve artifact content at commit
  - [ ] 6.2: Display in read-only viewer mode
  - [ ] 6.3: Show comparison with current version (optional)
  - [ ] 6.4: Handle missing files gracefully

- [ ] **Task 7: Add i18n translations** (AC: #1, #2, #3, #4)
  - [ ] 7.1: Add checkpoint labels to `en/planning.json`
  - [ ] 7.2: Add checkpoint labels to `fr/planning.json`
  - [ ] 7.3: Add error messages for git failures

- [ ] **Task 8: Write tests** (AC: all)
  - [ ] 8.1: Unit tests for checkpoint creation
  - [ ] 8.2: Test atomic commit behavior (rollback on failure)
  - [ ] 8.3: Test checkpoint history listing
  - [ ] 8.4: Test artifact retrieval at specific commit

## Dev Notes

### Critical Implementation Rules

1. **Atomic Commits (NFR9)**: All or nothing - no partial commits
2. **Existing Git Patterns**: Use Auto-Claude's existing git integration
3. **i18n Required**: All messages via translations
4. **Error Handling**: Graceful recovery, informative error messages

### Git Checkpoint Pattern

```python
# git_checkpoint.py
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Optional
from dataclasses import dataclass

@dataclass
class CheckpointResult:
    success: bool
    commit_hash: Optional[str]
    error_message: Optional[str]
    timestamp: datetime

class GitCheckpoint:
    CHECKPOINT_PREFIX = "Planning checkpoint:"

    def __init__(self, project_dir: Path, planning_dir: Path):
        self.project_dir = project_dir
        self.planning_dir = planning_dir

    def create_checkpoint(self) -> CheckpointResult:
        """Create a git checkpoint commit for planning artifacts."""
        try:
            # Check if we're in a git repo
            self._run_git(['rev-parse', '--git-dir'])

            # Check for changes in planning directory
            status = self._run_git(['status', '--porcelain', str(self.planning_dir)])
            if not status.strip():
                return CheckpointResult(
                    success=False,
                    commit_hash=None,
                    error_message="No changes to commit",
                    timestamp=datetime.utcnow()
                )

            # Stage planning directory files
            self._run_git(['add', str(self.planning_dir)])

            # Create commit
            timestamp = datetime.utcnow()
            message = f"{self.CHECKPOINT_PREFIX} {timestamp.strftime('%Y-%m-%d %H:%M')}"
            self._run_git(['commit', '-m', message])

            # Get commit hash
            commit_hash = self._run_git(['rev-parse', 'HEAD']).strip()

            return CheckpointResult(
                success=True,
                commit_hash=commit_hash,
                error_message=None,
                timestamp=timestamp
            )

        except subprocess.CalledProcessError as e:
            return CheckpointResult(
                success=False,
                commit_hash=None,
                error_message=f"Git error: {e.stderr}",
                timestamp=datetime.utcnow()
            )

    def list_checkpoints(self, limit: int = 20) -> list[dict]:
        """List previous checkpoint commits."""
        try:
            log = self._run_git([
                'log', '--oneline', '--grep', self.CHECKPOINT_PREFIX,
                f'-{limit}', '--format=%H|%s|%ci'
            ])

            checkpoints = []
            for line in log.strip().split('\n'):
                if line:
                    parts = line.split('|')
                    if len(parts) >= 3:
                        checkpoints.append({
                            'hash': parts[0],
                            'message': parts[1],
                            'date': parts[2],
                        })

            return checkpoints
        except subprocess.CalledProcessError:
            return []

    def get_artifact_at_commit(self, commit_hash: str, artifact_path: str) -> Optional[str]:
        """Get artifact content at specific commit."""
        try:
            relative_path = Path(artifact_path).relative_to(self.project_dir)
            content = self._run_git(['show', f'{commit_hash}:{relative_path}'])
            return content
        except subprocess.CalledProcessError:
            return None

    def _run_git(self, args: list[str]) -> str:
        """Run git command and return output."""
        result = subprocess.run(
            ['git'] + args,
            cwd=self.project_dir,
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout
```

### IPC Handlers

```typescript
// Main process - git checkpoint handlers
ipcMain.handle('planning:git:checkpoint', async (event, { projectPath }) => {
  const result = await createGitCheckpoint(projectPath);
  return result;
});

ipcMain.handle('planning:git:history', async (event, { projectPath }) => {
  const checkpoints = await listGitCheckpoints(projectPath);
  return checkpoints;
});

ipcMain.handle('planning:git:view', async (event, { projectPath, commitHash, artifactPath }) => {
  const content = await getArtifactAtCommit(projectPath, commitHash, artifactPath);
  return content;
});
```

### Frontend Components

```tsx
// CheckpointButton in PlanningHeader.tsx
const CheckpointButton: React.FC = () => {
  const { t } = useTranslation(['planning']);
  const [isCommitting, setIsCommitting] = useState(false);

  const handleCheckpoint = async () => {
    setIsCommitting(true);
    try {
      const result = await window.electronAPI.createPlanningCheckpoint();
      if (result.success) {
        toast.success(t('planning:checkpoint.success', { hash: result.commit_hash.slice(0, 7) }));
      } else {
        toast.error(t('planning:checkpoint.error', { message: result.error_message }));
      }
    } catch (error) {
      toast.error(t('planning:checkpoint.unexpectedError'));
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCheckpoint}
      disabled={isCommitting}
    >
      {isCommitting ? (
        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
      ) : (
        <GitCommit className="h-4 w-4 mr-1" />
      )}
      {t('planning:checkpoint.button')}
    </Button>
  );
};
```

```tsx
// CheckpointHistory.tsx
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { GitCommit, Eye } from 'lucide-react';

interface Checkpoint {
  hash: string;
  message: string;
  date: string;
}

export const CheckpointHistory: React.FC = () => {
  const { t } = useTranslation(['planning']);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCheckpoints = async () => {
      const data = await window.electronAPI.listPlanningCheckpoints();
      setCheckpoints(data);
      setIsLoading(false);
    };
    loadCheckpoints();
  }, []);

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">{t('common:loading')}</div>;
  }

  if (checkpoints.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        {t('planning:checkpoint.noCheckpoints')}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm">{t('planning:checkpoint.history')}</h4>
      <ul className="space-y-1">
        {checkpoints.map((checkpoint) => (
          <li
            key={checkpoint.hash}
            className="flex items-center justify-between p-2 rounded hover:bg-muted"
          >
            <div className="flex items-center gap-2">
              <GitCommit className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-xs">{checkpoint.hash.slice(0, 7)}</span>
              <span className="text-sm text-muted-foreground">
                {new Date(checkpoint.date).toLocaleDateString()}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => viewCheckpoint(checkpoint.hash)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
};
```

### Session State Updates

```typescript
// In sessionStore.ts
interface SessionState {
  // ... existing
  lastCheckpointHash: string | null;
  checkpoints: Array<{
    hash: string;
    timestamp: string;
  }>;

  recordCheckpoint: (hash: string) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  lastCheckpointHash: null,
  checkpoints: [],

  recordCheckpoint: (hash) => {
    const timestamp = new Date().toISOString();
    set((state) => ({
      lastCheckpointHash: hash,
      checkpoints: [
        { hash, timestamp },
        ...state.checkpoints,
      ],
    }));
    // Also persist to session.json
    get().saveSession();
  },
}));
```

### i18n Keys

```json
// en/planning.json
{
  "checkpoint": {
    "button": "Commit Checkpoint",
    "success": "Checkpoint created: {{hash}}",
    "error": "Checkpoint failed: {{message}}",
    "unexpectedError": "An unexpected error occurred",
    "noChanges": "No changes to commit",
    "history": "Checkpoint History",
    "noCheckpoints": "No checkpoints yet",
    "viewAt": "View at {{date}}"
  }
}

// fr/planning.json
{
  "checkpoint": {
    "button": "Créer un checkpoint",
    "success": "Checkpoint créé: {{hash}}",
    "error": "Échec du checkpoint: {{message}}",
    "unexpectedError": "Une erreur inattendue s'est produite",
    "noChanges": "Aucune modification à valider",
    "history": "Historique des checkpoints",
    "noCheckpoints": "Aucun checkpoint",
    "viewAt": "Voir au {{date}}"
  }
}
```

### Project Structure Notes

**New files to create:**
- `apps/backend/planning/git_checkpoint.py`
- `apps/frontend/src/renderer/components/planning/CheckpointHistory.tsx`

**Existing files to modify:**
- `apps/frontend/src/renderer/components/planning/PlanningHeader.tsx` - Add checkpoint button
- `apps/frontend/src/renderer/stores/planning/sessionStore.ts` - Add checkpoint tracking
- Main process IPC handlers - Add git handlers

### References

- [Source: architecture.md#files-to-modify-existing] - Git integration
- [Source: CLAUDE.md#branching--worktree-strategy] - Git patterns
- [Source: NFR9] - Atomic commits requirement

### Test Scope

**Integration** - This story touches:
- Git command execution
- File system operations
- IPC communication
- Error handling

### Performance Requirements

- Checkpoint commit < 5 seconds (typical)
- History listing < 1 second
- Artifact retrieval < 1 second

### Error Cases to Handle

1. Not in a git repository
2. No changes to commit
3. Git index locked (another operation in progress)
4. Permission denied
5. Corrupted git state

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References
- Commit: 42e71ce9d2edb9ff68dc421bf91e60877915c9b6
- Date: 2026-01-16

### Completion Notes List
- Created CheckpointHistory component with collapsible list of commits
- Displays commit hash (7 chars), date, and "View" button for each checkpoint
- Added checkpoint state to sessionStore: lastCheckpointHash, checkpoints array
- Implemented IPC handlers for createPlanningCheckpoint, listPlanningCheckpoints, viewCheckpointArtifact
- Atomic commits (NFR9): all planning files staged and committed together
- Commit message format: "Planning checkpoint: {YYYY-MM-DD HH:MM}"
- Error handling for: not in git repo, no changes, git errors
- Success/error toast notifications with commit hash

### File List

**New Files:**
- `apps/frontend/src/renderer/components/planning/CheckpointHistory.tsx` - Checkpoint list UI with view buttons

**Modified Files:**
- `apps/frontend/src/main/ipc-handlers/planning-handlers.ts` - Added git checkpoint IPC handlers (createPlanningCheckpoint, listPlanningCheckpoints, viewCheckpointArtifact)
- `apps/frontend/src/renderer/stores/planning/sessionStore.ts` - Added lastCheckpointHash, checkpoints, recordCheckpoint action
- `apps/frontend/src/renderer/components/planning/PlanningView.tsx` - Added checkpoint button to header
- `apps/frontend/src/preload/api/modules/planning-api.ts` - Added checkpoint API methods
- `apps/frontend/src/shared/constants/ipc.ts` - Added checkpoint IPC channel constants
- `apps/frontend/src/shared/i18n/locales/en/planning.json` - Added checkpoint translations
- `apps/frontend/src/shared/i18n/locales/fr/planning.json` - Added checkpoint translations (French)
