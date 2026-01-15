# Phase Event Protocol

This document explains the structured communication protocol between the Python backend and TypeScript frontend for execution phase synchronization.

**Target Audience:** Developers building features that involve build progress, status updates, or agent execution monitoring.

---

## Overview

Auto-Claude uses a **structured event protocol** to communicate execution phases from the Python backend to the Electron frontend. This enables real-time UI updates (task card badges, progress bars, phase indicators) without polling.

**Protocol Format:**
```
__EXEC_PHASE__:{"phase":"coding","message":"Implementing auth","progress":45,"subtask":"subtask-1-2"}
```

**Key Files:**
| Location | File | Purpose |
|----------|------|---------|
| Backend | `apps/backend/core/phase_event.py` | Emit phase events to stdout |
| Frontend | `apps/frontend/src/shared/constants/phase-protocol.ts` | Protocol constants and validation |
| Frontend | `apps/frontend/src/main/agent/phase-event-schema.ts` | Zod schema for parsing |
| Frontend | `apps/frontend/src/main/agent/phase-event-parser.ts` | Event parsing logic |

---

## Execution Phases

Phases represent the current stage of a build execution. They flow in a defined order:

```
idle → planning → coding → qa_review → qa_fixing → complete
                                ↑           ↓         ↓
                                └───────────┘       failed
```

### Phase Definitions

| Phase | Description | Emitted By |
|-------|-------------|------------|
| `idle` | Initial state before any backend events | Frontend only |
| `planning` | Planner agent creating implementation plan | Backend |
| `coding` | Coder agent implementing subtasks | Backend |
| `qa_review` | QA Reviewer validating acceptance criteria | Backend |
| `qa_fixing` | QA Fixer resolving reported issues | Backend |
| `complete` | Build finished successfully | Backend |
| `failed` | Build failed with error | Backend |

### Phase Order Index

Used for regression detection (preventing backwards transitions):

```typescript
const PHASE_ORDER_INDEX = {
  idle: -1,
  planning: 0,
  coding: 1,
  qa_review: 2,
  qa_fixing: 3,
  complete: 4,
  failed: 99
};
```

---

## Protocol Specification

### Message Format

```
__EXEC_PHASE__:{json_payload}
```

**Marker Prefix:** `__EXEC_PHASE__:` (must match exactly)

**JSON Payload Schema:**
```typescript
interface PhaseEventPayload {
  phase: BackendPhase;      // Required: Current execution phase
  message?: string;         // Optional: Human-readable status message
  progress?: number;        // Optional: 0-100 progress percentage
  subtask?: string;         // Optional: Current subtask ID (e.g., "subtask-1-2")
}

type BackendPhase = 'planning' | 'coding' | 'qa_review' | 'qa_fixing' | 'complete' | 'failed';
```

### Examples

**Phase transition:**
```
__EXEC_PHASE__:{"phase":"planning","message":"Creating implementation plan"}
```

**Progress update:**
```
__EXEC_PHASE__:{"phase":"coding","message":"Implementing auth endpoint","progress":45}
```

**Subtask tracking:**
```
__EXEC_PHASE__:{"phase":"coding","message":"Working on subtask","subtask":"subtask-2-3","progress":67}
```

**Completion:**
```
__EXEC_PHASE__:{"phase":"complete","message":"Build finished successfully","progress":100}
```

**Failure:**
```
__EXEC_PHASE__:{"phase":"failed","message":"Test suite failed: 3 failures"}
```

---

## Backend Implementation

### Emitting Phase Events (Python)

**Location:** `apps/backend/core/phase_event.py`

```python
from core.phase_event import emit_phase, ExecutionPhase

# Simple phase transition
emit_phase(ExecutionPhase.PLANNING, "Creating implementation plan")

# With progress
emit_phase(ExecutionPhase.CODING, "Implementing feature", progress=45)

# With subtask tracking
emit_phase(
    ExecutionPhase.CODING,
    "Working on authentication",
    progress=67,
    subtask="subtask-2-3"
)

# Completion
emit_phase(ExecutionPhase.COMPLETE, "Build finished successfully", progress=100)

# Failure
emit_phase(ExecutionPhase.FAILED, "Build failed: test failures")
```

### ExecutionPhase Enum

```python
class ExecutionPhase(str, Enum):
    PLANNING = "planning"
    CODING = "coding"
    QA_REVIEW = "qa_review"
    QA_FIXING = "qa_fixing"
    COMPLETE = "complete"
    FAILED = "failed"
```

### emit_phase Function

```python
def emit_phase(
    phase: ExecutionPhase | str,
    message: str = "",
    *,
    progress: int | None = None,
    subtask: str | None = None,
) -> None:
    """Emit structured phase event to stdout for frontend parsing.

    Args:
        phase: Current execution phase
        message: Human-readable status message
        progress: Optional progress percentage (0-100, clamped if out of range)
        subtask: Optional subtask ID being worked on
    """
```

---

## Frontend Implementation

### Parsing Phase Events (TypeScript)

**Location:** `apps/frontend/src/main/agent/phase-event-parser.ts`

The frontend parses stdout from agent processes, looking for lines starting with `__EXEC_PHASE__:`.

```typescript
import { PHASE_MARKER_PREFIX } from '../../shared/constants/phase-protocol';
import { validatePhaseEvent } from './phase-event-schema';

function parseAgentOutput(line: string): PhaseEventPayload | null {
  if (!line.startsWith(PHASE_MARKER_PREFIX)) {
    return null;
  }

  const jsonStr = line.slice(PHASE_MARKER_PREFIX.length);
  try {
    const data = JSON.parse(jsonStr);
    const result = validatePhaseEvent(data);
    if (result.success) {
      return result.data;
    }
  } catch (e) {
    console.error('Failed to parse phase event:', e);
  }
  return null;
}
```

### Zod Schema Validation

**Location:** `apps/frontend/src/main/agent/phase-event-schema.ts`

```typescript
import { z } from 'zod';
import { BACKEND_PHASES } from '../../shared/constants/phase-protocol';

export const PhaseEventSchema = z.object({
  phase: z.enum(BACKEND_PHASES),
  message: z.string().default(''),
  progress: z.number().int().min(0).max(100).optional(),
  subtask: z.string().optional()
});

export type PhaseEventPayload = z.infer<typeof PhaseEventSchema>;

export function validatePhaseEvent(data: unknown): ParseResult {
  const result = PhaseEventSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
```

### Phase Transition Validation

**Location:** `apps/frontend/src/shared/constants/phase-protocol.ts`

```typescript
/**
 * Check if a phase transition would be a regression.
 * Used to prevent fallback text matching from going backwards.
 */
export function wouldPhaseRegress(
  currentPhase: ExecutionPhase,
  newPhase: ExecutionPhase
): boolean {
  const currentIndex = PHASE_ORDER_INDEX[currentPhase];
  const newIndex = PHASE_ORDER_INDEX[newPhase];
  return newIndex < currentIndex;
}

/**
 * Validate phase transition based on completed phases.
 * Prevents multiple phases from being active simultaneously.
 */
export function isValidPhaseTransition(
  currentPhase: ExecutionPhase,
  newPhase: ExecutionPhase,
  completedPhases: CompletablePhase[] = []
): boolean {
  // Terminal phases can't transition
  if (isTerminalPhase(currentPhase)) return false;

  // idle can transition to any active phase
  if (currentPhase === 'idle') return true;

  // Same phase is always valid (progress update)
  if (currentPhase === newPhase) return true;

  // Can always go to failed
  if (newPhase === 'failed') return true;

  // QA fixing can go back to QA review
  if (currentPhase === 'qa_fixing' && newPhase === 'qa_review') return true;

  // Check prerequisites for other transitions
  const prerequisites = {
    planning: [],
    coding: ['planning'],
    qa_review: ['coding'],
    qa_fixing: ['qa_review'],
    complete: ['qa_review', 'qa_fixing'],
  };

  return prerequisites[newPhase]?.some(p => completedPhases.includes(p)) ?? true;
}
```

---

## Usage Patterns

### When to Emit Phase Events

1. **Phase Transitions** - When moving to a new execution phase
2. **Progress Updates** - Periodically during long-running operations
3. **Subtask Changes** - When starting work on a new subtask
4. **Completion/Failure** - At the end of execution

### Best Practices

**DO:**
- Emit at phase boundaries (planning start, coding start, etc.)
- Include meaningful messages for debugging
- Update progress incrementally for better UX
- Always emit `complete` or `failed` at the end

**DON'T:**
- Emit too frequently (rate limit to ~1/second for progress)
- Skip the final `complete`/`failed` event
- Emit `idle` from backend (frontend-only state)
- Transition backwards except `qa_fixing` → `qa_review`

### Example: Full Build Lifecycle

```python
# Planning phase
emit_phase(ExecutionPhase.PLANNING, "Analyzing spec and creating plan")
# ... planner runs ...
emit_phase(ExecutionPhase.PLANNING, "Plan created", progress=100)

# Coding phase
emit_phase(ExecutionPhase.CODING, "Starting implementation")
emit_phase(ExecutionPhase.CODING, "Subtask 1/5", subtask="subtask-1-1", progress=20)
emit_phase(ExecutionPhase.CODING, "Subtask 2/5", subtask="subtask-1-2", progress=40)
# ... more subtasks ...
emit_phase(ExecutionPhase.CODING, "All subtasks complete", progress=100)

# QA phase
emit_phase(ExecutionPhase.QA_REVIEW, "Running QA validation")
# If issues found:
emit_phase(ExecutionPhase.QA_FIXING, "Fixing reported issues")
emit_phase(ExecutionPhase.QA_REVIEW, "Re-running QA validation")

# Completion
emit_phase(ExecutionPhase.COMPLETE, "Build finished successfully", progress=100)
```

---

## Synchronization Requirements

**CRITICAL:** Phase values must stay synchronized between:

| Component | File | Constant |
|-----------|------|----------|
| Python Backend | `core/phase_event.py` | `ExecutionPhase` enum |
| TypeScript Frontend | `shared/constants/phase-protocol.ts` | `BACKEND_PHASES` array |

If you add a new phase:
1. Add to Python `ExecutionPhase` enum
2. Add to TypeScript `BACKEND_PHASES` array
3. Add to `PHASE_ORDER_INDEX` with appropriate order
4. Update transition validation logic if needed

---

## Debugging

### View Raw Phase Events

```bash
# Run backend with output visible
python apps/backend/run.py --spec 001 2>&1 | grep "__EXEC_PHASE__"
```

### Test Phase Emission

```python
# Quick test
from core.phase_event import emit_phase, ExecutionPhase
emit_phase(ExecutionPhase.CODING, "Test message", progress=50)
# Output: __EXEC_PHASE__:{"phase":"coding","message":"Test message","progress":50}
```

### Frontend Debug Mode

Set `DEBUG=true` environment variable to see phase parsing logs in the Electron console.

---

## Related Documentation

- [Backend Architecture](./backend/architecture.md) - Agent orchestration overview
- [Backend Agents](./backend/agents.md) - Agent lifecycle and session management
- [Frontend Architecture](./frontend/architecture.md) - Electron process model
- [Electron IPC](./frontend/electron-ipc.md) - Frontend-backend communication
