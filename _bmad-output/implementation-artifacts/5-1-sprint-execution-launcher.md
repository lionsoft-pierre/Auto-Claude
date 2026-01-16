# Story 5.1: Sprint Execution Launcher

Status: ready-for-dev

## Story

As a **Technical Founder**,
I want **to start sprint execution that runs automatically**,
so that **the AI works on my sprint while I sleep**.

## Acceptance Criteria

1. **AC1: Start Sprint Execution**
   - **Given** a sprint has prioritized stories
   - **When** the user clicks "Start Sprint"
   - **Then** the sprint execution begins
   - **And** the sprint status changes to "in_progress"

2. **AC2: Automatic Story Pickup**
   - **Given** sprint execution is running
   - **When** a story completes
   - **Then** the AI automatically picks the next prioritized story
   - **And** execution continues without manual intervention

3. **AC3: Background Execution**
   - **Given** sprint execution is active
   - **When** the user closes the application
   - **Then** execution continues in the background
   - **And** results are available when the app reopens

4. **AC4: Priority-Based Selection**
   - **Given** the sprint queue has stories
   - **When** execution picks the next story
   - **Then** it selects the highest priority story with status "pending"
   - **And** marks it as "in_progress"

## Tasks / Subtasks

- [ ] **Task 1: Create sprint executor backend** (AC: #1, #2, #4)
  - [ ] 1.1: Create `apps/backend/planning/sprint_executor.py`
  - [ ] 1.2: Implement `SprintExecutor` class
  - [ ] 1.3: Load sprint queue from `sprint-queue.json`
  - [ ] 1.4: Implement story pickup logic (highest priority pending)
  - [ ] 1.5: Implement execution loop with auto-pickup

- [ ] **Task 2: Implement background process** (AC: #3)
  - [ ] 2.1: Create long-running background process for execution
  - [ ] 2.2: Detach from Electron main process
  - [ ] 2.3: Handle process persistence across app restarts
  - [ ] 2.4: Implement status file for cross-process communication

- [ ] **Task 3: Create start sprint UI** (AC: #1)
  - [ ] 3.1: Add "Start Sprint" button to SprintQueueView
  - [ ] 3.2: Show confirmation dialog with story count
  - [ ] 3.3: Disable button when sprint already running
  - [ ] 3.4: Show execution status indicator

- [ ] **Task 4: Implement story status updates** (AC: #2, #4)
  - [ ] 4.1: Update story status to 'in_progress' when picked
  - [ ] 4.2: Update sprint-queue.json on status change
  - [ ] 4.3: Emit status change events for UI updates
  - [ ] 4.4: Handle concurrent access to queue file

- [ ] **Task 5: Create execution status monitoring** (AC: #2, #3)
  - [ ] 5.1: Create status polling mechanism for frontend
  - [ ] 5.2: Display current executing story
  - [ ] 5.3: Show execution progress (X of Y)
  - [ ] 5.4: Add "Stop Sprint" button for manual halt

- [ ] **Task 6: Add IPC handlers for execution** (AC: #1, #3)
  - [ ] 6.1: Add IPC handler `planning:sprint:execute` - Start execution
  - [ ] 6.2: Add IPC handler `planning:sprint:stop` - Stop execution
  - [ ] 6.3: Add IPC handler `planning:sprint:status` - Get execution status
  - [ ] 6.4: Add IPC event `planning:execution:progress` - Progress updates

- [ ] **Task 7: Add i18n translations** (AC: #1, #3)
  - [ ] 7.1: Add execution messages to `en/planning.json`
  - [ ] 7.2: Add execution messages to `fr/planning.json`
  - [ ] 7.3: Add progress and status messages

- [ ] **Task 8: Write tests** (AC: all)
  - [ ] 8.1: Unit tests for SprintExecutor class
  - [ ] 8.2: Unit tests for story pickup logic
  - [ ] 8.3: Integration tests for background execution
  - [ ] 8.4: Test execution persistence across app restart

## Dev Notes

### Critical Implementation Rules

1. **Background Execution**: Must run independently of Electron UI
2. **Priority Order**: Always pick highest priority pending story
3. **State Persistence**: Save state to file for crash recovery
4. **NFR6/NFR7**: Continue running despite individual failures

### Sprint Executor Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Electron App                         │
│  ┌──────────────┐       ┌───────────────────────────┐  │
│  │   Frontend   │◄─────►│      Main Process         │  │
│  │  (React UI)  │  IPC  │  (Sprint Control)         │  │
│  └──────────────┘       └───────────┬───────────────┘  │
└─────────────────────────────────────┼───────────────────┘
                                      │ spawn
                                      ▼
                          ┌───────────────────────────┐
                          │   Background Process      │
                          │   (sprint_executor.py)    │
                          │                           │
                          │  ┌─────────────────────┐  │
                          │  │  Execution Loop     │  │
                          │  │  1. Pick story      │  │
                          │  │  2. Execute         │  │
                          │  │  3. Update status   │  │
                          │  │  4. Pick next       │  │
                          │  └─────────────────────┘  │
                          │                           │
                          │  ┌─────────────────────┐  │
                          │  │  sprint-queue.json  │◄─┼──► Shared State
                          │  └─────────────────────┘  │
                          └───────────────────────────┘
```

### Sprint Executor Implementation

```python
# sprint_executor.py
import asyncio
import json
from pathlib import Path
from datetime import datetime
from typing import Optional
import signal

class SprintExecutor:
    def __init__(self, project_dir: Path, sprint_id: str):
        self.project_dir = project_dir
        self.sprint_id = sprint_id
        self.queue_path = project_dir / '.auto-claude' / 'planning' / 'sprint-queue.json'
        self.status_path = project_dir / '.auto-claude' / 'planning' / 'execution-status.json'
        self.running = False

    async def execute(self):
        """Main execution loop."""
        self.running = True
        self._update_sprint_status('in_progress')
        self._write_execution_status('running')

        try:
            while self.running:
                story = self._pick_next_story()
                if not story:
                    # No more stories, sprint complete
                    break

                self._update_story_status(story['taskId'], 'in_progress')
                self._write_execution_status('executing', current_story=story['taskId'])

                try:
                    await self._execute_story(story)
                    self._update_story_status(story['taskId'], 'completed')
                except Exception as e:
                    self._update_story_status(story['taskId'], 'failed', str(e))
                    # Continue with next story (non-blocking)

            self._update_sprint_status('completed')
            self._write_execution_status('completed')

        except Exception as e:
            self._write_execution_status('error', error=str(e))
            raise

    def _pick_next_story(self) -> Optional[dict]:
        """Pick highest priority pending story."""
        queue = self._load_queue()
        assignments = queue.get('assignments', [])

        pending = [a for a in assignments
                   if a['sprintId'] == self.sprint_id and a['status'] == 'pending']

        if not pending:
            return None

        # Sort by priority (1 = highest)
        pending.sort(key=lambda x: x['priority'])
        return pending[0]

    def _update_story_status(self, task_id: str, status: str, error: str = None):
        """Update story status in queue file."""
        queue = self._load_queue()

        for assignment in queue['assignments']:
            if assignment['taskId'] == task_id:
                assignment['status'] = status
                assignment['updatedAt'] = datetime.utcnow().isoformat()
                if error:
                    assignment['failureReason'] = error
                break

        self._save_queue(queue)

    def stop(self):
        """Stop execution gracefully."""
        self.running = False

    def _write_execution_status(self, status: str, **kwargs):
        """Write current execution status to file for UI polling."""
        data = {
            'status': status,
            'sprintId': self.sprint_id,
            'timestamp': datetime.utcnow().isoformat(),
            **kwargs
        }
        self.status_path.write_text(json.dumps(data), encoding='utf-8')
```

### Background Process Launcher

```typescript
// In main process
import { spawn } from 'child_process';
import path from 'path';

let executorProcess: ChildProcess | null = null;

ipcMain.handle('planning:sprint:execute', async (event, { sprintId }) => {
  if (executorProcess) {
    return { error: 'Sprint already running' };
  }

  const pythonPath = path.join(__dirname, '../../backend/.venv/bin/python');
  const scriptPath = path.join(__dirname, '../../backend/planning/sprint_executor.py');

  executorProcess = spawn(pythonPath, [scriptPath, '--sprint', sprintId, '--project', projectDir], {
    detached: true, // Run independently
    stdio: 'ignore',
  });

  executorProcess.unref(); // Don't wait for process

  executorProcess.on('exit', () => {
    executorProcess = null;
  });

  return { status: 'started', pid: executorProcess.pid };
});

ipcMain.handle('planning:sprint:stop', async () => {
  if (executorProcess) {
    executorProcess.kill('SIGTERM');
    executorProcess = null;
    return { status: 'stopped' };
  }
  return { status: 'not_running' };
});
```

### Start Sprint UI

```tsx
// StartSprintButton.tsx
import { useTranslation } from 'react-i18next';
import { useSprintStore } from '../../stores/planning/sprintStore';
import { Button } from '@/shared/components/ui/button';
import { Play, Square, Loader2 } from 'lucide-react';

interface Props {
  sprintId: string;
}

export const StartSprintButton: React.FC<Props> = ({ sprintId }) => {
  const { t } = useTranslation(['planning']);
  const sprint = useSprintStore(state => state.sprints.find(s => s.id === sprintId));
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = async () => {
    const confirmed = await confirm(t('planning:execution.startConfirm'));
    if (!confirmed) return;

    setIsStarting(true);
    try {
      await window.electronAPI.startSprintExecution(sprintId);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async () => {
    await window.electronAPI.stopSprintExecution();
  };

  if (sprint?.status === 'in_progress') {
    return (
      <Button variant="destructive" onClick={handleStop}>
        <Square className="h-4 w-4 mr-2" />
        {t('planning:execution.stop')}
      </Button>
    );
  }

  if (sprint?.status === 'completed') {
    return null;
  }

  return (
    <Button onClick={handleStart} disabled={isStarting}>
      {isStarting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Play className="h-4 w-4 mr-2" />
      )}
      {t('planning:execution.start')}
    </Button>
  );
};
```

### i18n Keys

```json
// en/planning.json
{
  "execution": {
    "start": "Start Sprint",
    "stop": "Stop Sprint",
    "startConfirm": "Start sprint execution? The AI will work through all queued stories automatically.",
    "running": "Sprint running...",
    "executing": "Executing: {{story}}",
    "progress": "{{completed}} of {{total}} stories",
    "completed": "Sprint completed",
    "stopped": "Sprint stopped"
  }
}

// fr/planning.json
{
  "execution": {
    "start": "Démarrer le Sprint",
    "stop": "Arrêter le Sprint",
    "startConfirm": "Démarrer l'exécution du sprint? L'IA travaillera automatiquement sur toutes les stories en file.",
    "running": "Sprint en cours...",
    "executing": "Exécution: {{story}}",
    "progress": "{{completed}} sur {{total}} stories",
    "completed": "Sprint terminé",
    "stopped": "Sprint arrêté"
  }
}
```

### Project Structure Notes

**New files to create:**
- `apps/backend/planning/sprint_executor.py`
- `apps/frontend/src/renderer/components/planning/StartSprintButton.tsx`
- `apps/frontend/src/renderer/components/planning/ExecutionStatus.tsx`

**Existing files to modify:**
- `apps/frontend/src/renderer/components/planning/SprintQueueView.tsx` - Add start button
- Main process IPC handlers - Add execution handlers

### References

- [Source: architecture.md#sprint-execution-architecture] - Execution design
- [Source: NFR6, NFR7] - Retry logic, no crash on failure
- [Source: NFR23] - Separate sprint and story execution logic

### Test Scope

**Integration** - This story touches:
- Backend Python execution
- Background process management
- IPC communication
- File-based state sharing

### Performance Requirements

- Sprint start < 5 seconds
- Story pickup < 1 second
- Status file updates in real-time

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### File List
