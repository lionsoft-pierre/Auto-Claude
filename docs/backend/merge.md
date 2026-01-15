# Merge System

This document explains Auto-Claude's intelligent merge system for combining changes from parallel task branches into the main codebase.

**Target Audience:** Developers working on merge functionality, conflict resolution, or multi-task orchestration.

---

## Overview

Auto-Claude uses a sophisticated **intent-aware merge system** that goes beyond traditional line-based git merging. The system:

1. **Tracks file evolution** across task branches
2. **Analyzes semantic changes** (not just text diffs)
3. **Detects conflicts** at the semantic level (function changes, import additions, etc.)
4. **Auto-merges** deterministically where possible
5. **Uses AI** for ambiguous conflicts that require understanding intent

**Key Principle:** Maximize automation, minimize AI token usage, maintain correctness.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     MergeOrchestrator                           │
│  (Main coordinator - apps/backend/merge/orchestrator.py)        │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ FileEvolution   │  │ SemanticAnalyzer│  │ ConflictDetector│
│ Tracker         │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Baseline +      │  │ Parse changes   │  │ Find overlapping│
│ Task Snapshots  │  │ (AST-like)      │  │ modifications   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   AutoMerger    │  │  MergePipeline  │  │   AIResolver    │
│ (Deterministic) │  │  (Coordinator)  │  │ (Claude-powered)│
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| **MergeOrchestrator** | `orchestrator.py` | Main entry point, coordinates entire pipeline |
| **FileEvolutionTracker** | `file_evolution/tracker.py` | Tracks file changes across tasks |
| **SemanticAnalyzer** | `semantic_analyzer.py` | Parses code changes semantically |
| **ConflictDetector** | `conflict_detector.py` | Identifies conflicts between tasks |
| **AutoMerger** | `auto_merger/merger.py` | Deterministic merge strategies |
| **AIResolver** | `ai_resolver/resolver.py` | Claude-powered conflict resolution |
| **MergePipeline** | `merge_pipeline.py` | Orchestrates merge stages |
| **ConflictResolver** | `conflict_resolver.py` | Combines auto + AI resolution |

---

## Merge Pipeline Stages

### Stage 1: File Evolution Loading

The system tracks how files change from a baseline through task modifications.

```python
from merge.orchestrator import MergeOrchestrator

orchestrator = MergeOrchestrator(project_dir)

# Load evolution data from git
orchestrator.evolution_tracker.refresh_from_git(
    task_id="task-001",
    worktree_path=worktree_path,
    target_branch="main"
)
```

**Data Captured:**
- **Baseline content**: File state on target branch before task started
- **Task snapshot**: File state after task modifications
- **Semantic changes**: Parsed changes (functions added, imports modified, etc.)

### Stage 2: Semantic Analysis

Changes are analyzed at the **semantic level**, not just as text diffs:

```
Text Diff:                    Semantic Analysis:
- import foo                  IMPORT_REMOVED: foo
+ import bar                  IMPORT_ADDED: bar
+ import baz                  IMPORT_ADDED: baz

+ def new_func():             FUNCTION_ADDED: new_func
+     return 42
```

**Change Types:**
- `IMPORT_ADDED` / `IMPORT_REMOVED` / `IMPORT_MODIFIED`
- `FUNCTION_ADDED` / `FUNCTION_REMOVED` / `FUNCTION_MODIFIED`
- `CLASS_ADDED` / `CLASS_REMOVED` / `CLASS_MODIFIED`
- `VARIABLE_ADDED` / `VARIABLE_MODIFIED`
- `EXPORT_ADDED` / `EXPORT_REMOVED`
- `BODY_MODIFICATION` (catch-all for unparsed changes)

### Stage 3: Conflict Detection

Conflicts are detected when multiple tasks modify the same semantic region:

```python
# Example: Two tasks both modify the same function
Task A: FUNCTION_MODIFIED: authenticate() - added logging
Task B: FUNCTION_MODIFIED: authenticate() - changed return type

# Conflict detected!
ConflictRegion(
    file_path="auth.py",
    location="authenticate",
    tasks_involved=["task-a", "task-b"],
    severity=ConflictSeverity.MEDIUM,
    can_auto_merge=False
)
```

**Conflict Severity:**
- `LOW`: Different regions, can auto-merge
- `MEDIUM`: Same region, may conflict
- `HIGH`: Same code, likely incompatible

### Stage 4: Auto-Merge (Deterministic)

Many conflicts can be resolved deterministically without AI:

**Auto-Merge Strategies:**

| Strategy | When Applied | Example |
|----------|--------------|---------|
| `AppendStrategy` | Non-overlapping additions | Both tasks add different functions |
| `ImportStrategy` | Import additions | Combine import statements |
| `HooksStrategy` | React hook additions | Merge useEffect hooks |
| `PropsStrategy` | Component prop additions | Combine prop additions |
| `OrderingStrategy` | Order-independent changes | Combine exports |

**Location:** `apps/backend/merge/auto_merger/strategies/`

```python
# Example: Import merging
Baseline:
    import { foo } from 'lib';

Task A:
    import { foo, bar } from 'lib';

Task B:
    import { foo, baz } from 'lib';

Auto-Merged Result:
    import { foo, bar, baz } from 'lib';
```

### Stage 5: AI Resolution (Ambiguous Conflicts)

When deterministic strategies fail, Claude resolves the conflict:

```python
from merge.ai_resolver import create_claude_resolver

resolver = create_claude_resolver()

result = resolver.resolve(
    file_path="auth.py",
    baseline_content=baseline,
    task_changes=[
        {"task_id": "task-a", "content": task_a_content, "intent": "Add logging"},
        {"task_id": "task-b", "content": task_b_content, "intent": "Change return type"},
    ],
    conflict_region=conflict
)
```

**AI Resolution Considers:**
- The original intent of each task
- The baseline code structure
- Language-specific merging patterns
- Semantic compatibility of changes

---

## Data Models

### MergeOrchestrator

Main entry point for merge operations:

```python
from merge.orchestrator import MergeOrchestrator, TaskMergeRequest

orchestrator = MergeOrchestrator(
    project_dir=Path("/path/to/project"),
    storage_dir=Path(".auto-claude"),  # Optional
    enable_ai=True,                     # Use AI for ambiguous conflicts
    dry_run=False                       # Actually write files
)
```

### TaskMergeRequest

Request to merge a specific task:

```python
@dataclass
class TaskMergeRequest:
    task_id: str           # Task identifier (e.g., "task-001-feature")
    worktree_path: Path    # Path to task's git worktree
    intent: str = ""       # Human description of task's purpose
    priority: int = 0      # Higher = merge first in conflicts
```

### MergeReport

Complete report from a merge operation:

```python
@dataclass
class MergeReport:
    started_at: datetime
    completed_at: datetime | None
    tasks_merged: list[str]
    file_results: dict[str, MergeResult]  # path -> result
    stats: MergeStats
    success: bool
    error: str | None
```

### MergeStats

Statistics from merge operation:

```python
@dataclass
class MergeStats:
    files_processed: int = 0
    files_auto_merged: int = 0        # Merged without AI
    files_ai_merged: int = 0          # Required AI assistance
    files_need_review: int = 0        # Couldn't resolve automatically
    files_failed: int = 0             # Failed to merge
    conflicts_detected: int = 0
    conflicts_auto_resolved: int = 0
    conflicts_ai_resolved: int = 0
    ai_calls_made: int = 0
    estimated_tokens_used: int = 0
    duration_seconds: float = 0.0
```

### MergeDecision

Outcome of a file merge:

```python
class MergeDecision(Enum):
    AUTO_MERGED = "auto_merged"         # Merged deterministically
    AI_MERGED = "ai_merged"             # AI resolved conflicts
    DIRECT_COPY = "direct_copy"         # Copy task version directly
    NEEDS_HUMAN_REVIEW = "needs_review" # Couldn't resolve
    NO_CHANGES = "no_changes"           # File unchanged
    FAILED = "failed"                   # Merge failed
```

---

## Usage Examples

### Merge a Single Task

```python
from pathlib import Path
from merge.orchestrator import MergeOrchestrator

orchestrator = MergeOrchestrator(Path("/project"))

# Merge task changes into main
report = orchestrator.merge_task(
    task_id="task-001-add-auth",
    worktree_path=Path(".worktrees/task-001-add-auth"),
    target_branch="main"
)

if report.success:
    print(f"Merged {report.stats.files_processed} files")
    print(f"Auto-merged: {report.stats.files_auto_merged}")
    print(f"AI-merged: {report.stats.files_ai_merged}")
else:
    print(f"Merge failed: {report.error}")
```

### Merge Multiple Tasks

```python
from merge.orchestrator import MergeOrchestrator, TaskMergeRequest

orchestrator = MergeOrchestrator(project_dir)

# Define merge requests
requests = [
    TaskMergeRequest(
        task_id="task-001-auth",
        worktree_path=Path(".worktrees/task-001"),
        intent="Add JWT authentication",
        priority=2  # Merge first
    ),
    TaskMergeRequest(
        task_id="task-002-ui",
        worktree_path=Path(".worktrees/task-002"),
        intent="Update login UI",
        priority=1
    ),
]

# Merge all tasks
report = orchestrator.merge_tasks(requests, target_branch="main")

# Check results
for file_path, result in report.file_results.items():
    print(f"{file_path}: {result.decision.value}")
```

### Preview Merge (Dry Run)

```python
# Preview what would happen without executing
preview = orchestrator.preview_merge(
    task_ids=["task-001", "task-002"]
)

print(f"Files to merge: {preview['summary']['total_files']}")
print(f"Potential conflicts: {preview['summary']['conflict_files']}")
print(f"Auto-mergeable: {preview['summary']['auto_mergeable']}")

for conflict in preview['conflicts']:
    print(f"  {conflict['file']}: {conflict['location']} ({conflict['severity']})")
```

### Apply Merged Files

```python
# After successful merge, apply to project
if report.success:
    orchestrator.apply_to_project(report)

# Or write to separate directory first
orchestrator.write_merged_files(report, output_dir=Path("merge_preview"))
```

---

## File Evolution Tracking

The system tracks how files evolve from baseline through task modifications.

### Storage Structure

```
.auto-claude/
├── merge_data/
│   ├── baselines/           # File states before any task changes
│   │   └── {file_hash}.txt
│   └── task_snapshots/      # File states after each task
│       └── {task_id}/
│           └── {file_path}.json
├── merge_output/            # Merged file results
└── merge_reports/           # JSON reports from merge operations
```

### Baseline Capture

Baselines are captured when a task branch is created:

```python
# Automatic baseline capture
evolution_tracker.capture_baseline(
    file_path="src/auth.py",
    content=original_content,
    commit_hash="abc123"
)
```

### Task Snapshots

Each task's modifications are tracked:

```python
# Task snapshot structure
{
    "task_id": "task-001",
    "file_path": "src/auth.py",
    "content_hash": "def456",
    "semantic_changes": [
        {
            "type": "FUNCTION_ADDED",
            "name": "verify_token",
            "location": {"start_line": 45, "end_line": 60}
        },
        {
            "type": "IMPORT_ADDED",
            "name": "jwt",
            "location": {"start_line": 3}
        }
    ],
    "captured_at": "2025-01-15T10:30:00"
}
```

---

## Auto-Merge Strategies

### AppendStrategy

Combines non-overlapping additions:

```python
# Task A adds function foo()
# Task B adds function bar()
# Result: Both functions included in order
```

### ImportStrategy

Intelligently merges import statements:

```python
# Handles:
# - Named imports: { foo, bar }
# - Default imports: import Foo
# - Namespace imports: import * as Foo
# - Side-effect imports: import 'styles.css'
```

### HooksStrategy (React)

Merges React hook calls:

```python
# Task A: useEffect(() => { /* A logic */ }, [depA])
# Task B: useEffect(() => { /* B logic */ }, [depB])
# Result: Both hooks preserved in component
```

### PropsStrategy (React/Vue)

Combines component prop additions:

```python
# Task A: adds 'disabled' prop
# Task B: adds 'loading' prop
# Result: Component accepts both props
```

### OrderingStrategy

Handles order-independent changes:

```python
# Export statements, array entries, object properties
# Where order doesn't affect semantics
```

---

## AI Resolver

When deterministic strategies fail, Claude resolves conflicts:

### Configuration

```python
from merge.ai_resolver import AIResolver, create_claude_resolver

# Default Claude resolver
resolver = create_claude_resolver()

# Custom configuration
resolver = AIResolver(
    model="claude-sonnet-4",
    max_tokens=4096,
    temperature=0.1
)
```

### Resolution Process

1. **Context Assembly**: Gather baseline, all task versions, conflict info
2. **Prompt Construction**: Build structured prompt explaining the conflict
3. **Claude Analysis**: AI understands intent and proposes resolution
4. **Validation**: Verify merged code is syntactically valid
5. **Result**: Return merged content with explanation

### Prompt Structure

```markdown
## Merge Conflict Resolution

### File: src/auth.py

### Baseline (before any changes):
```python
{baseline_content}
```

### Task A Changes (intent: Add JWT authentication):
```python
{task_a_content}
```

### Task B Changes (intent: Add rate limiting):
```python
{task_b_content}
```

### Conflict Region: authenticate() function

Please merge these changes, preserving both intents.
```

---

## Integration with Build Pipeline

### When Merging Occurs

1. **User runs `--merge`**: After reviewing completed spec in worktree
2. **Multi-task completion**: When parallel tasks finish
3. **Conflict resolution**: When manual intervention is needed

### CLI Integration

```bash
# Merge a completed spec
python run.py --spec 001 --merge

# Preview merge without applying
python run.py --spec 001 --merge --preview

# Force merge (skip conflict checks)
python run.py --spec 001 --merge --force
```

### Worktree Flow

```
main branch
    │
    ├── Spec 001 started → worktree created
    │   └── auto-claude/spec-001 branch
    │
    ├── Spec 002 started → worktree created
    │   └── auto-claude/spec-002 branch
    │
    │   ... both specs complete ...
    │
    ├── User runs --merge for spec-001
    │   └── MergeOrchestrator merges into main
    │
    └── User runs --merge for spec-002
        └── MergeOrchestrator handles conflicts with spec-001 changes
```

---

## Debugging

### Enable Debug Output

```bash
export DEBUG=true
python run.py --spec 001 --merge
```

### View Merge Reports

```bash
# Reports saved to .auto-claude/merge_reports/
cat .auto-claude/merge_reports/task-001_*.json | jq .
```

### Check Evolution Data

```python
from merge.orchestrator import MergeOrchestrator

orchestrator = MergeOrchestrator(project_dir)

# Get file evolution
evolution = orchestrator.evolution_tracker.get_file_evolution("src/auth.py")
print(f"Baseline: {evolution.baseline_hash}")
print(f"Tasks: {[s.task_id for s in evolution.task_snapshots]}")

# Get pending conflicts
conflicts = orchestrator.get_pending_conflicts()
for file_path, regions in conflicts:
    print(f"{file_path}: {len(regions)} conflicts")
```

---

## Key Implementation Files

| File | Purpose |
|------|---------|
| `merge/orchestrator.py` | Main entry point and coordination |
| `merge/models.py` | Data models (MergeStats, MergeReport, etc.) |
| `merge/types.py` | Type definitions (MergeResult, MergeDecision, etc.) |
| `merge/semantic_analyzer.py` | Code change parsing |
| `merge/conflict_detector.py` | Conflict identification |
| `merge/conflict_resolver.py` | Combines auto + AI resolution |
| `merge/auto_merger/merger.py` | Deterministic merge logic |
| `merge/auto_merger/strategies/` | Individual merge strategies |
| `merge/ai_resolver/resolver.py` | Claude-powered resolution |
| `merge/ai_resolver/prompts.py` | AI prompt templates |
| `merge/file_evolution/tracker.py` | File change tracking |
| `merge/file_evolution/storage.py` | Evolution data persistence |
| `merge/merge_pipeline.py` | Stage orchestration |
| `merge/git_utils.py` | Git operations |

---

## Related Documentation

- [Backend Architecture](./architecture.md) - Overall backend structure
- [Backend Agents](./agents.md) - Agent lifecycle and sessions
- [Security Model](./security.md) - Sandboxing and worktree isolation
- [Phase Protocol](../phase-protocol.md) - Frontend-backend communication
