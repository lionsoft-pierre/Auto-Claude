# Data Models Reference

This document provides a complete reference for all data models used in Auto-Claude's implementation plan system. Understanding these models is essential for building features that interact with specs, plans, or subtasks.

**Target Audience:** Developers building features that read, write, or modify implementation plans.

---

## Overview

Auto-Claude uses a hierarchical data model for managing implementation work:

```
Implementation Plan
├── metadata (workflow_type, version, timestamps)
├── phases[]
│   ├── Phase 1
│   │   ├── subtasks[]
│   │   │   ├── Subtask 1-1
│   │   │   │   └── verification
│   │   │   └── Subtask 1-2
│   │   └── depends_on[]
│   └── Phase 2
│       └── subtasks[]
└── qa_signoff
```

**Key Files:**
| File | Purpose |
|------|---------|
| `implementation_plan/enums.py` | Enum definitions (status, types) |
| `implementation_plan/subtask.py` | Subtask model |
| `implementation_plan/phase.py` | Phase model |
| `implementation_plan/verification.py` | Verification model |
| `implementation_plan/factories.py` | Factory functions for creating models |

---

## Enumerations

### WorkflowType

Defines the type of development workflow, which affects phase structure:

```python
class WorkflowType(str, Enum):
    FEATURE = "feature"          # Multi-service feature (phases = services)
    REFACTOR = "refactor"        # Stage-based (add new, migrate, remove old)
    INVESTIGATION = "investigation"  # Bug hunting (investigate, hypothesize, fix)
    MIGRATION = "migration"      # Data migration (prepare, test, execute, cleanup)
    SIMPLE = "simple"            # Single-service, minimal overhead
    DEVELOPMENT = "development"  # General development work
    ENHANCEMENT = "enhancement"  # Improving existing features
```

**Usage:**
```python
from implementation_plan.enums import WorkflowType

# In implementation_plan.json
{
    "workflow_type": "feature",
    ...
}
```

### PhaseType

Categorizes phases within a workflow:

```python
class PhaseType(str, Enum):
    SETUP = "setup"              # Project scaffolding, environment setup
    IMPLEMENTATION = "implementation"  # Writing code
    INVESTIGATION = "investigation"    # Research, debugging, analysis
    INTEGRATION = "integration"  # Wiring services together
    CLEANUP = "cleanup"          # Removing old code, polish
```

### SubtaskStatus

Tracks the state of individual subtasks:

```python
class SubtaskStatus(str, Enum):
    PENDING = "pending"          # Not started
    IN_PROGRESS = "in_progress"  # Currently being worked on
    COMPLETED = "completed"      # Completed successfully
    BLOCKED = "blocked"          # Can't start (dependency not met)
    FAILED = "failed"            # Attempted but failed
```

**State Transitions:**
```
                    ┌──────────────┐
                    │   PENDING    │
                    └──────┬───────┘
                           │ start()
                           ▼
┌──────────┐       ┌──────────────┐       ┌──────────────┐
│  BLOCKED │◄──────│ IN_PROGRESS  │──────►│  COMPLETED   │
└──────────┘       └──────┬───────┘       └──────────────┘
                          │ fail()
                          ▼
                   ┌──────────────┐
                   │    FAILED    │
                   └──────────────┘
```

### VerificationType

How to verify subtask completion:

```python
class VerificationType(str, Enum):
    COMMAND = "command"      # Run a shell command
    API = "api"              # Make an API request
    BROWSER = "browser"      # Browser automation check
    COMPONENT = "component"  # Component renders correctly
    MANUAL = "manual"        # Requires human verification
    NONE = "none"            # No verification needed
```

---

## Subtask Model

A single unit of implementation work.

### Schema

```python
@dataclass
class Subtask:
    # Required
    id: str                          # Unique identifier (e.g., "subtask-1-2")
    description: str                 # What needs to be done

    # Status
    status: SubtaskStatus = PENDING  # Current state

    # Scoping
    service: str | None = None       # Which service (backend, frontend, worker)
    all_services: bool = False       # True for integration subtasks

    # Files
    files_to_modify: list[str] = []  # Existing files to change
    files_to_create: list[str] = []  # New files to create
    patterns_from: list[str] = []    # Files to read for patterns

    # Verification
    verification: Verification | None = None

    # Investigation subtasks
    expected_output: str | None = None  # Knowledge/decision expected
    actual_output: str | None = None    # What was discovered

    # Tracking
    started_at: str | None = None    # ISO timestamp
    completed_at: str | None = None  # ISO timestamp
    session_id: int | None = None    # Which session completed this

    # Self-Critique
    critique_result: dict | None = None  # Results from self-critique
```

### JSON Example

```json
{
  "id": "subtask-1-2",
  "description": "Create user authentication endpoint",
  "status": "pending",
  "service": "backend",
  "files_to_modify": ["app/main.py"],
  "files_to_create": ["app/routes/auth.py", "app/models/user.py"],
  "patterns_from": ["app/routes/posts.py"],
  "verification": {
    "type": "command",
    "run": "pytest tests/test_auth.py -v"
  }
}
```

### Methods

```python
subtask = Subtask(id="subtask-1-1", description="Add auth endpoint")

# Start work
subtask.start(session_id=3)
# Sets status=IN_PROGRESS, started_at=now(), clears stale data

# Complete successfully
subtask.complete(output="Implemented JWT auth with refresh tokens")
# Sets status=COMPLETED, completed_at=now()

# Mark as failed
subtask.fail(reason="Test suite failed: 3 failures")
# Sets status=FAILED, clears completed_at

# Serialize
data = subtask.to_dict()

# Deserialize
subtask = Subtask.from_dict(data)
```

---

## Phase Model

A group of subtasks with dependencies.

### Schema

```python
@dataclass
class Phase:
    phase: int                       # Phase number (1, 2, 3...)
    name: str                        # Human-readable name
    type: PhaseType = IMPLEMENTATION # Phase category
    subtasks: list[Subtask] = []     # Subtasks in this phase
    depends_on: list[int] = []       # Phase numbers that must complete first
    parallel_safe: bool = False      # Can subtasks run in parallel?
```

### JSON Example

```json
{
  "phase": 1,
  "name": "Backend API",
  "type": "implementation",
  "subtasks": [
    {
      "id": "subtask-1-1",
      "description": "Create User model",
      "status": "completed"
    },
    {
      "id": "subtask-1-2",
      "description": "Create auth endpoints",
      "status": "in_progress"
    }
  ],
  "depends_on": [],
  "parallel_safe": false
}
```

### Methods

```python
phase = Phase(phase=1, name="Backend API")

# Check completion
if phase.is_complete():
    print("All subtasks done!")

# Get pending work
pending = phase.get_pending_subtasks()

# Get progress
done, total = phase.get_progress()
print(f"Progress: {done}/{total}")

# Serialize
data = phase.to_dict()

# Deserialize
phase = Phase.from_dict(data, fallback_phase=1)
```

---

## Verification Model

Defines how to verify subtask completion.

### Schema

```python
@dataclass
class Verification:
    type: VerificationType           # How to verify

    # For COMMAND type
    run: str | None = None           # Shell command to execute

    # For API type
    url: str | None = None           # API endpoint URL
    method: str | None = None        # HTTP method (GET, POST, etc.)
    expect_status: int | None = None # Expected HTTP status code
    expect_contains: str | None = None  # Expected response content

    # For BROWSER/MANUAL type
    scenario: str | None = None      # Description of what to check
```

### JSON Examples

**Command Verification:**
```json
{
  "type": "command",
  "run": "pytest tests/test_auth.py -v"
}
```

**API Verification:**
```json
{
  "type": "api",
  "url": "http://localhost:3000/api/users",
  "method": "GET",
  "expect_status": 200,
  "expect_contains": "\"users\":"
}
```

**Browser Verification:**
```json
{
  "type": "browser",
  "url": "http://localhost:3000/login",
  "scenario": "Login form renders with email and password fields"
}
```

**Manual Verification:**
```json
{
  "type": "manual",
  "scenario": "Verify email notifications are sent correctly"
}
```

---

## Implementation Plan Structure

The complete plan stored in `implementation_plan.json`.

### Full Schema

```json
{
  "version": "2.0",
  "workflow_type": "feature",
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T14:45:00Z",

  "phases": [
    {
      "phase": 1,
      "name": "Backend API",
      "type": "implementation",
      "subtasks": [...],
      "depends_on": [],
      "parallel_safe": false
    },
    {
      "phase": 2,
      "name": "Frontend Components",
      "type": "implementation",
      "subtasks": [...],
      "depends_on": [1],
      "parallel_safe": true
    },
    {
      "phase": 3,
      "name": "Integration",
      "type": "integration",
      "subtasks": [...],
      "depends_on": [1, 2],
      "parallel_safe": false
    }
  ],

  "qa_signoff": {
    "status": "pending",
    "reviewer": null,
    "approved_at": null,
    "issues": []
  }
}
```

### QA Sign-off Structure

```json
{
  "qa_signoff": {
    "status": "approved" | "rejected" | "pending",
    "reviewer": "qa_reviewer_agent",
    "approved_at": "2025-01-15T16:00:00Z",
    "issues": [
      {
        "severity": "blocker" | "major" | "minor",
        "description": "WebSocket reconnection fails",
        "location": "app/websocket.py:45",
        "suggested_fix": "Add exponential backoff"
      }
    ]
  }
}
```

---

## Working with Plans in Code

### Loading a Plan

```python
from pathlib import Path
import json
from implementation_plan.phase import Phase
from implementation_plan.subtask import Subtask

def load_plan(spec_dir: Path) -> list[Phase]:
    """Load implementation plan from spec directory."""
    plan_file = spec_dir / "implementation_plan.json"

    with open(plan_file) as f:
        data = json.load(f)

    phases = []
    for i, phase_data in enumerate(data.get("phases", [])):
        phase = Phase.from_dict(phase_data, fallback_phase=i + 1)
        phases.append(phase)

    return phases
```

### Finding Next Subtask

```python
def get_next_subtask(phases: list[Phase]) -> Subtask | None:
    """Get the next pending subtask respecting dependencies."""
    completed_phases = {
        p.phase for p in phases if p.is_complete()
    }

    for phase in phases:
        # Check dependencies
        if not all(dep in completed_phases for dep in phase.depends_on):
            continue

        # Find first pending subtask
        pending = phase.get_pending_subtasks()
        if pending:
            return pending[0]

    return None
```

### Updating Subtask Status

```python
def mark_subtask_complete(
    spec_dir: Path,
    subtask_id: str,
    output: str | None = None
) -> bool:
    """Mark a subtask as completed and save the plan."""
    plan_file = spec_dir / "implementation_plan.json"

    with open(plan_file) as f:
        data = json.load(f)

    # Find and update subtask
    for phase in data.get("phases", []):
        for subtask in phase.get("subtasks", []):
            if subtask.get("id") == subtask_id:
                subtask["status"] = "completed"
                subtask["completed_at"] = datetime.now().isoformat()
                if output:
                    subtask["actual_output"] = output

                # Save updated plan
                with open(plan_file, "w") as f:
                    json.dump(data, f, indent=2)
                return True

    return False
```

### Checking Build Completion

```python
def is_build_complete(spec_dir: Path) -> bool:
    """Check if all subtasks are completed."""
    phases = load_plan(spec_dir)
    return all(phase.is_complete() for phase in phases)
```

---

## Backwards Compatibility

The codebase maintains backwards compatibility with older terminology:

| Old Term | New Term | Alias Location |
|----------|----------|----------------|
| `chunk` | `subtask` | `subtask.py`: `Chunk = Subtask` |
| `chunks` | `subtasks` | `phase.py`: `chunks` property |
| `ChunkStatus` | `SubtaskStatus` | `enums.py`: `ChunkStatus = SubtaskStatus` |

**In JSON files**, both `chunks` and `subtasks` keys are supported:
```json
{
  "phases": [
    {
      "subtasks": [...],  // Preferred
      "chunks": [...]     // Also supported (backwards compat)
    }
  ]
}
```

---

## Validation

### Required Fields

| Model | Required Fields |
|-------|----------------|
| Subtask | `id`, `description` |
| Phase | `phase`, `name` |
| Verification | `type` |

### ID Format Convention

Subtask IDs follow the pattern: `subtask-{phase}-{index}`

```
subtask-1-1  → Phase 1, Subtask 1
subtask-1-2  → Phase 1, Subtask 2
subtask-2-1  → Phase 2, Subtask 1
```

### Status Validation

```python
from implementation_plan.enums import SubtaskStatus

def validate_subtask_status(status: str) -> bool:
    """Check if status is valid."""
    try:
        SubtaskStatus(status)
        return True
    except ValueError:
        return False
```

---

## Related Documentation

- [Agent System](./agents.md) - How agents create and execute plans
- [Backend Architecture](./architecture.md) - Overall backend structure
- [Phase Protocol](../phase-protocol.md) - Status communication with frontend
