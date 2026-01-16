# Story 2.1: BMAD Workflow Execution Engine

Status: ready-for-dev

## Story

As a **Technical Founder**,
I want **the system to execute BMAD workflow steps and present methodology questions**,
so that **I can be guided through structured planning without knowing BMAD internals**.

## Acceptance Criteria

1. **AC1: Workflow Initialization**
   - **Given** a new BMAD planning session is started
   - **When** the workflow begins
   - **Then** the system loads the first BMAD workflow (product-brief)
   - **And** presents the initial discovery questions to the user

2. **AC2: Question Presentation**
   - **Given** the BMAD workflow is executing
   - **When** the system needs user input
   - **Then** methodology-specific questions are presented in the chat
   - **And** the user can respond conversationally

3. **AC3: Step Progression**
   - **Given** the user has answered workflow questions
   - **When** a workflow step is complete
   - **Then** the system automatically progresses to the next step
   - **And** the workflow progress indicator updates

4. **AC4: Workflow Chain Execution**
   - **Given** the BMAD workflow sequence
   - **When** executing the full chain
   - **Then** workflows execute in order: Brief → PRD → Architecture → Epics → Stories
   - **And** each workflow uses outputs from previous workflows as context

## Tasks / Subtasks

- [ ] **Task 1: Create workflow runner backend** (AC: #1, #4)
  - [ ] 1.1: Create `apps/backend/planning/workflow_runner.py`
  - [ ] 1.2: Implement `WorkflowRunner` class with BMAD workflow loading
  - [ ] 1.3: Define workflow sequence: `['product-brief', 'prd', 'architecture', 'epics', 'stories']`
  - [ ] 1.4: Load workflow configurations from `_bmad/bmm/workflows/` directory
  - [ ] 1.5: Create `WorkflowStep` data class with step metadata

- [ ] **Task 2: Implement Claude Agent SDK integration** (AC: #2)
  - [ ] 2.1: Create `planning/agent_executor.py` for Claude interactions
  - [ ] 2.2: Load BMAD workflow prompts as system context
  - [ ] 2.3: Stream responses back to frontend via existing IPC
  - [ ] 2.4: Handle conversation history for multi-turn interactions

- [ ] **Task 3: Implement workflow state management** (AC: #3, #4)
  - [ ] 3.1: Track `current_workflow` in session state
  - [ ] 3.2: Track `current_step` within workflow
  - [ ] 3.3: Update `completed_workflows` array on workflow completion
  - [ ] 3.4: Persist state to `session.json` after each step

- [ ] **Task 4: Create IPC handlers for workflow execution** (AC: #1, #3)
  - [ ] 4.1: Add IPC handler `planning:workflow:start` - Start workflow execution
  - [ ] 4.2: Add IPC handler `planning:workflow:step` - Progress to next step
  - [ ] 4.3: Add IPC handler `planning:workflow:status` - Get current workflow state
  - [ ] 4.4: Add streaming channel `planning:workflow:stream` for AI responses

- [ ] **Task 5: Implement context passing between workflows** (AC: #4)
  - [ ] 5.1: Load previous workflow outputs as context for next workflow
  - [ ] 5.2: Parse artifact content for key context extraction
  - [ ] 5.3: Build cumulative context: Brief → Brief+PRD → Brief+PRD+Architecture
  - [ ] 5.4: Inject context into Claude system prompt

- [ ] **Task 6: Connect frontend to workflow execution** (AC: #2, #3)
  - [ ] 6.1: Add `startWorkflow` action to sessionStore
  - [ ] 6.2: Add `progressWorkflow` action to sessionStore
  - [ ] 6.3: Subscribe to workflow stream in PlanningChat component
  - [ ] 6.4: Update progress indicator on workflow state changes

- [ ] **Task 7: Add i18n translations** (AC: #2)
  - [ ] 7.1: Add workflow status messages to `en/planning.json`
  - [ ] 7.2: Add workflow status messages to `fr/planning.json`
  - [ ] 7.3: Add error messages for workflow failures

- [ ] **Task 8: Write tests** (AC: all)
  - [ ] 8.1: Unit tests for WorkflowRunner class
  - [ ] 8.2: Unit tests for workflow state transitions
  - [ ] 8.3: Integration tests for IPC workflow handlers
  - [ ] 8.4: Test context accumulation across workflows

## Dev Notes

### Critical Implementation Rules

1. **Claude Agent SDK**: Use `create_client()` from `core.client`, NEVER raw Anthropic API
2. **i18n Required**: All user-facing messages via `useTranslation()`
3. **File-based IPC**: Follow existing patterns, not HTTP APIs
4. **State Persistence**: Save to `session.json` after every state change

### BMAD Workflow Configuration

```python
# workflow_runner.py
from pathlib import Path
from dataclasses import dataclass
from typing import Optional

BMAD_WORKFLOW_SEQUENCE = [
    'product-brief',
    'prd',
    'architecture',
    'epics',
    'stories'
]

@dataclass
class WorkflowConfig:
    id: str
    name: str
    workflow_path: Path
    output_artifact: str
    required_inputs: list[str]

WORKFLOW_CONFIGS: dict[str, WorkflowConfig] = {
    'product-brief': WorkflowConfig(
        id='product-brief',
        name='Product Brief',
        workflow_path=Path('_bmad/bmm/workflows/1-analysis/create-product-brief/'),
        output_artifact='product-brief.md',
        required_inputs=[]
    ),
    'prd': WorkflowConfig(
        id='prd',
        name='PRD',
        workflow_path=Path('_bmad/bmm/workflows/2-plan-workflows/prd/'),
        output_artifact='prd.md',
        required_inputs=['product-brief.md']
    ),
    # ... etc
}
```

### Workflow Runner Pattern

```python
# workflow_runner.py
from core.client import create_client

class WorkflowRunner:
    def __init__(self, project_dir: Path, session_dir: Path):
        self.project_dir = project_dir
        self.session_dir = session_dir
        self.current_workflow: Optional[str] = None
        self.current_step: int = 0

    async def start_workflow(self, workflow_id: str) -> None:
        """Initialize and start a BMAD workflow."""
        config = WORKFLOW_CONFIGS[workflow_id]
        self.current_workflow = workflow_id
        self.current_step = 0

        # Load workflow instructions
        workflow_md = self._load_workflow_instructions(config)

        # Build context from previous artifacts
        context = self._build_context(config.required_inputs)

        # Create Claude client with workflow system prompt
        self.client = create_client(
            project_dir=str(self.project_dir),
            spec_dir=str(self.session_dir),
            model="claude-sonnet-4-5-20250929",
            agent_type="planning"
        )

        # Start agent session
        await self._execute_workflow(workflow_md, context)

    def _build_context(self, required_inputs: list[str]) -> str:
        """Load previous artifacts as context."""
        context_parts = []
        for artifact_name in required_inputs:
            artifact_path = self.session_dir / artifact_name
            if artifact_path.exists():
                content = artifact_path.read_text()
                context_parts.append(f"## {artifact_name}\n\n{content}")
        return "\n\n".join(context_parts)
```

### IPC Handler Pattern

```typescript
// Main process - planning IPC handlers
ipcMain.handle('planning:workflow:start', async (event, { sessionId, workflowId }) => {
  const runner = new WorkflowRunner(projectDir, sessionDir);
  await runner.startWorkflow(workflowId);
  return { status: 'started', workflowId };
});

ipcMain.handle('planning:workflow:step', async (event, { sessionId }) => {
  const session = await loadSession(sessionId);
  const nextWorkflow = getNextWorkflow(session.completed_workflows);
  if (nextWorkflow) {
    await startWorkflow(sessionId, nextWorkflow);
    return { status: 'progressed', workflowId: nextWorkflow };
  }
  return { status: 'complete' };
});
```

### Frontend Store Integration

```typescript
// sessionStore.ts additions
interface SessionState {
  // ... existing
  workflowStatus: 'idle' | 'executing' | 'awaiting_input' | 'complete';

  startWorkflow: (workflowId: string) => Promise<void>;
  progressWorkflow: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  workflowStatus: 'idle',

  startWorkflow: async (workflowId) => {
    set({ workflowStatus: 'executing' });
    await window.electronAPI.startPlanningWorkflow(workflowId);
  },

  progressWorkflow: async () => {
    const result = await window.electronAPI.progressPlanningWorkflow();
    if (result.status === 'complete') {
      set({ workflowStatus: 'complete' });
    }
  },
}));
```

### Project Structure Notes

**New files to create:**
- `apps/backend/planning/workflow_runner.py`
- `apps/backend/planning/agent_executor.py`
- `apps/backend/planning/__init__.py`

**Existing files to modify:**
- `apps/frontend/src/renderer/stores/planning/sessionStore.ts` - Add workflow actions
- `apps/frontend/src/renderer/components/planning/PlanningChat.tsx` - Connect to workflow
- Main process IPC handlers - Add workflow handlers

### References

- [Source: architecture.md#workflow-orchestration] - Workflow execution design
- [Source: architecture.md#bmad-integration] - BMAD workflow loading
- [Source: CLAUDE.md#claude-agent-sdk-integration] - SDK usage patterns
- [Source: core/client.py] - create_client() function

### Test Scope

**Integration** - This story touches:
- Backend Python workflow execution
- Claude Agent SDK integration
- Frontend-backend IPC communication
- Session state persistence

### Performance Requirements

- Workflow initialization < 2 seconds
- Streaming response latency < 500ms (NFR1)
- State persistence after each step (crash recovery)

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### File List
