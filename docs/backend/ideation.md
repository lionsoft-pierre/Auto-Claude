# Ideation Module

This document explains Auto-Claude's ideation system, which uses AI agents to analyze your codebase and generate improvement ideas across multiple categories.

**Target Audience:** Developers building features that involve code analysis, idea generation, or project insights.

---

## Overview

The ideation module runs AI-powered analysis to generate actionable improvement ideas for your project. It analyzes code patterns, architecture, security, performance, and more to suggest enhancements.

**Key Capabilities:**
- Multi-category idea generation (code, UI/UX, security, performance, docs, quality)
- Parallel execution for faster analysis
- Project context awareness (roadmap, kanban integration)
- Priority scoring and categorization
- Incremental updates (append mode)

**Output Location:** `.auto-claude/ideation/`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   IdeationOrchestrator                          │
│           (apps/backend/ideation/runner.py)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ ProjectIndex  │    │ PhaseExecutor │    │ OutputStreamer│
│    Phase      │    │               │    │               │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │
        ▼                     ▼
┌───────────────┐    ┌───────────────────────────────────┐
│ Project       │    │        Parallel Execution         │
│ Analyzer      │    ├───────────────┬───────────────────┤
└───────────────┘    │ IdeationGen   │ IdeationGenerator │
                     │ (6 types)     │ (per type)        │
                     └───────────────┴───────────────────┘
                              │
                              ▼
                     ┌───────────────┐
                     │ IdeaPrioritizer│
                     │ & Formatter   │
                     └───────────────┘
```

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| **IdeationOrchestrator** | `runner.py` | Main entry point, orchestrates all phases |
| **IdeationConfigManager** | `config.py` | Configuration and component initialization |
| **ProjectAnalyzer** | `analyzer.py` | Gathers project context (roadmap, kanban) |
| **IdeationGenerator** | `generator.py` | Runs AI agents for each idea type |
| **PhaseExecutor** | `phase_executor.py` | Executes ideation phases |
| **IdeaPrioritizer** | `prioritizer.py` | Scores and ranks ideas |
| **IdeationFormatter** | `formatter.py` | Formats output files |
| **OutputStreamer** | `output_streamer.py` | Streams results as they complete |

---

## Ideation Types

The system generates ideas across six categories:

| Type | Label | Prompt File | Focus |
|------|-------|-------------|-------|
| `code_improvements` | Code Improvements | `ideation_code_improvements.md` | Better algorithms, cleaner code |
| `ui_ux_improvements` | UI/UX Improvements | `ideation_ui_ux.md` | User experience, accessibility |
| `documentation_gaps` | Documentation Gaps | `ideation_documentation.md` | Missing docs, unclear APIs |
| `security_hardening` | Security Hardening | `ideation_security.md` | Vulnerabilities, best practices |
| `performance_optimizations` | Performance Optimizations | `ideation_performance.md` | Speed, memory, efficiency |
| `code_quality` | Code Quality & Refactoring | `ideation_code_quality.md` | Technical debt, patterns |

---

## Execution Phases

The orchestrator runs through four phases:

### Phase 1: Project Analysis

Analyzes project structure and creates an index:

```python
# Output: .auto-claude/ideation/project_index.json
{
  "project_name": "my-project",
  "tech_stack": ["python", "typescript", "react"],
  "directories": {...},
  "key_files": [...],
  "services": ["backend", "frontend"]
}
```

### Phase 2: Context & Graph Hints (Parallel)

Runs two tasks in parallel:
1. **Context Gathering**: Loads roadmap, kanban, existing specs
2. **Graph Hints**: Queries Graphiti memory for relevant history

```python
# Runs concurrently
context_task = phase_executor.execute_context()
hints_task = phase_executor.execute_graph_hints()
await asyncio.gather(context_task, hints_task)
```

### Phase 3: Idea Generation (Parallel)

Runs all enabled ideation types **in parallel**:

```python
# All 6 types run concurrently
ideation_tasks = [
    stream_ideation_result("code_improvements", ...),
    stream_ideation_result("ui_ux_improvements", ...),
    stream_ideation_result("security_hardening", ...),
    stream_ideation_result("performance_optimizations", ...),
    stream_ideation_result("documentation_gaps", ...),
    stream_ideation_result("code_quality", ...),
]
await asyncio.gather(*ideation_tasks)
```

Each type gets its own AI agent with a specialized prompt.

### Phase 4: Merge & Finalize

Combines all generated ideas into a single output:

```python
# Output: .auto-claude/ideation/ideation.json
{
  "ideas": [...],
  "summary": {
    "total": 42,
    "by_type": {
      "code_improvements": 8,
      "security_hardening": 6,
      ...
    }
  }
}
```

---

## Data Models

### IdeationConfig

Configuration for ideation generation:

```python
@dataclass
class IdeationConfig:
    project_dir: Path                # Project to analyze
    output_dir: Path                 # Output directory
    enabled_types: list[str]         # Which types to generate
    include_roadmap_context: bool    # Include roadmap files
    include_kanban_context: bool     # Include kanban board
    max_ideas_per_type: int          # Max ideas per category
    model: str                       # Claude model to use
    refresh: bool                    # Force regeneration
    append: bool                     # Preserve existing ideas
```

### IdeationPhaseResult

Result from a single phase execution:

```python
@dataclass
class IdeationPhaseResult:
    phase: str                       # Phase name
    ideation_type: str | None        # Type if ideation phase
    success: bool                    # Whether phase succeeded
    output_files: list[str]          # Files created
    ideas_count: int                 # Number of ideas generated
    errors: list[str]                # Any errors encountered
    retries: int                     # Retry count
```

### Idea Structure

Individual idea in the output:

```json
{
  "id": "idea-001",
  "type": "security_hardening",
  "title": "Add rate limiting to API endpoints",
  "description": "The API endpoints lack rate limiting...",
  "priority": "high",
  "effort": "medium",
  "impact": "high",
  "files_affected": [
    "apps/backend/routes/api.py",
    "apps/backend/middleware/rate_limit.py"
  ],
  "implementation_hints": [
    "Use redis-based rate limiter",
    "Configure per-endpoint limits"
  ],
  "related_specs": []
}
```

---

## Usage

### CLI Usage

```bash
cd apps/backend

# Run full ideation generation
python -m ideation.runner --project-dir /path/to/project

# Specific types only
python -m ideation.runner --types security_hardening,performance_optimizations

# Force refresh (regenerate all)
python -m ideation.runner --refresh

# Append mode (keep existing ideas)
python -m ideation.runner --append
```

### Programmatic Usage

```python
from pathlib import Path
from ideation.runner import IdeationOrchestrator

# Create orchestrator
orchestrator = IdeationOrchestrator(
    project_dir=Path("/path/to/project"),
    output_dir=None,  # Uses .auto-claude/ideation by default
    enabled_types=["security_hardening", "performance_optimizations"],
    include_roadmap_context=True,
    include_kanban_context=True,
    max_ideas_per_type=5,
    model="sonnet",
    thinking_level="medium",
    refresh=False,
    append=False,
)

# Run ideation
success = await orchestrator.run()

if success:
    print(f"Ideas saved to: {orchestrator.output_dir}/ideation.json")
```

### Frontend Integration

The frontend displays ideation results in the "Ideation" view:

```typescript
// Load ideation results
const ideation = await window.electronAPI.loadIdeation();

// Filter by type
const securityIdeas = ideation.ideas.filter(i => i.type === 'security_hardening');

// Sort by priority
const sorted = ideation.ideas.sort((a, b) =>
  priorityOrder[a.priority] - priorityOrder[b.priority]
);
```

---

## Output Files

Generated files in `.auto-claude/ideation/`:

| File | Purpose |
|------|---------|
| `project_index.json` | Project structure analysis |
| `context.json` | Gathered context (roadmap, kanban) |
| `hints.json` | Graph memory hints |
| `code_improvements.json` | Code improvement ideas |
| `ui_ux_improvements.json` | UI/UX ideas |
| `documentation_gaps.json` | Documentation ideas |
| `security_hardening.json` | Security ideas |
| `performance_optimizations.json` | Performance ideas |
| `code_quality.json` | Code quality ideas |
| `ideation.json` | **Merged final output** |
| `screenshots/` | UI screenshots for UX analysis |

---

## Configuration Options

### Model Selection

```python
# Default: sonnet (good balance of speed/quality)
model = "sonnet"

# For deeper analysis
model = "opus"

# For faster, cheaper runs
model = "haiku"
```

### Thinking Level

Controls extended thinking token budget:

```python
thinking_level = "low"     # Minimal thinking
thinking_level = "medium"  # Default, balanced
thinking_level = "high"    # Deep analysis
thinking_level = "ultrathink"  # Maximum reasoning
```

### Type Selection

Enable/disable specific ideation types:

```python
# All types (default)
enabled_types = [
    "code_improvements",
    "ui_ux_improvements",
    "documentation_gaps",
    "security_hardening",
    "performance_optimizations",
    "code_quality",
]

# Security focus only
enabled_types = ["security_hardening"]

# Performance and code quality
enabled_types = ["performance_optimizations", "code_quality"]
```

---

## Customizing Prompts

Each ideation type uses a specialized prompt in `apps/backend/prompts/`:

| Type | Prompt File |
|------|-------------|
| code_improvements | `ideation_code_improvements.md` |
| ui_ux_improvements | `ideation_ui_ux.md` |
| documentation_gaps | `ideation_documentation.md` |
| security_hardening | `ideation_security.md` |
| performance_optimizations | `ideation_performance.md` |
| code_quality | `ideation_code_quality.md` |

**Prompt Structure:**
```markdown
## YOUR ROLE - [TYPE] IDEATION AGENT

You analyze codebases to identify [specific focus area].

## PHASE 0: LOAD CONTEXT
[Context loading instructions]

## PHASE 1: ANALYZE
[Analysis instructions]

## PHASE 2: GENERATE IDEAS
[Idea generation guidelines]

## OUTPUT FORMAT
[JSON schema for ideas]
```

---

## Error Handling

The system uses retry logic and graceful degradation:

```python
MAX_RETRIES = 3

async def stream_ideation_result(ideation_type, executor, max_retries):
    for attempt in range(max_retries):
        try:
            result = await executor.execute_ideation(ideation_type)
            if result.success:
                return result
        except Exception as e:
            if attempt == max_retries - 1:
                return IdeationPhaseResult(
                    phase="ideation",
                    ideation_type=ideation_type,
                    success=False,
                    errors=[str(e)],
                    ...
                )
```

**Graceful Degradation:**
- If one ideation type fails, others continue
- Graph hints are optional (won't block execution)
- Partial results are still saved

---

## Performance Considerations

### Parallel Execution

All 6 ideation types run in parallel, significantly reducing total time:

```
Sequential: ~30-60 minutes (5-10 min × 6 types)
Parallel:   ~10-15 minutes (longest single type)
```

### Token Usage

Each ideation type makes 1-3 AI calls:
- Initial analysis: ~2-4K tokens
- Idea generation: ~4-8K tokens
- Refinement (if needed): ~2-4K tokens

**Total per run:** ~50-100K tokens (varies by project size)

### Caching

Project index is cached and reused:
```python
# Skip if already exists and not refreshing
if project_index.exists() and not self.refresh:
    return cached_index
```

---

## Related Documentation

- [Backend Architecture](./architecture.md) - Overall backend structure
- [Agent System](./agents.md) - How AI agents are orchestrated
- [Memory System](./memory.md) - Graphiti integration for context
