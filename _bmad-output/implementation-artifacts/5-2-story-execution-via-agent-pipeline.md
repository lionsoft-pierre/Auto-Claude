# Story 5.2: Story Execution via Agent Pipeline

Status: done

## Story

As a **Technical Founder**,
I want **stories to execute using the existing Auto-Claude agent pipeline**,
so that **planned work is built the same way as regular tasks**.

## Acceptance Criteria

1. **AC1: Agent Pipeline Integration**
   - **Given** a story is picked for execution
   - **When** execution begins
   - **Then** the story is executed via the existing Auto-Claude agent pipeline
   - **And** the full story context (acceptance criteria, links) is provided to the agent

2. **AC2: Completion Handling**
   - **Given** a story is executing
   - **When** the implementation completes and tests pass
   - **Then** the story status is updated to "completed"
   - **And** the task in Kanban is also marked complete

3. **AC3: Context Loading**
   - **Given** story execution is in progress
   - **When** the agent needs story context
   - **Then** it reads the full story file from the reference path
   - **And** has access to PRD and architecture via links

4. **AC4: Status Sync**
   - **Given** a story completes successfully
   - **When** updating the sprint queue
   - **Then** the story entry shows status "completed"
   - **And** the timestamp is recorded

## Tasks / Subtasks

- [ ] **Task 1: Create story-to-spec converter** (AC: #1, #3)
  - [ ] 1.1: Create `apps/backend/planning/story_to_spec.py`
  - [ ] 1.2: Convert story markdown to spec format
  - [ ] 1.3: Extract acceptance criteria as spec requirements
  - [ ] 1.4: Include context links in spec context

- [ ] **Task 2: Integrate with existing agent pipeline** (AC: #1)
  - [ ] 2.1: Create wrapper to invoke `run.py` with story-based spec
  - [ ] 2.2: Pass story context to planner agent
  - [ ] 2.3: Configure worktree for story execution
  - [ ] 2.4: Handle agent session lifecycle

- [ ] **Task 3: Implement context loading** (AC: #3)
  - [ ] 3.1: Load full story file content
  - [ ] 3.2: Parse and load linked PRD sections
  - [ ] 3.3: Parse and load linked architecture sections
  - [ ] 3.4: Build comprehensive context for agent

- [ ] **Task 4: Implement completion detection** (AC: #2)
  - [ ] 4.1: Monitor agent pipeline completion
  - [ ] 4.2: Detect QA pass/fail result
  - [ ] 4.3: Mark story as completed on QA pass
  - [ ] 4.4: Mark story as failed on QA fail (with notes)

- [ ] **Task 5: Sync status with Kanban task** (AC: #2, #4)
  - [ ] 5.1: Find linked Kanban task by storyId
  - [ ] 5.2: Update task status on story completion
  - [ ] 5.3: Move task to appropriate Kanban column
  - [ ] 5.4: Record completion timestamp

- [ ] **Task 6: Update sprint queue on completion** (AC: #4)
  - [ ] 6.1: Update assignment status in sprint-queue.json
  - [ ] 6.2: Record completion timestamp
  - [ ] 6.3: Trigger sprint completion check
  - [ ] 6.4: Emit completion event for UI

- [ ] **Task 7: Add logging and monitoring** (AC: #1, #2)
  - [ ] 7.1: Log execution start/end for each story
  - [ ] 7.2: Capture agent output for debugging
  - [ ] 7.3: Record execution duration
  - [ ] 7.4: Store logs in story directory

- [ ] **Task 8: Write tests** (AC: all)
  - [ ] 8.1: Unit tests for story-to-spec conversion
  - [ ] 8.2: Unit tests for context loading
  - [ ] 8.3: Integration tests for agent pipeline
  - [ ] 8.4: Test status sync across stores

## Dev Notes

### Critical Implementation Rules

1. **Existing Pipeline**: Use existing `run.py` and agent infrastructure
2. **Full Context**: Provide complete story context to agents
3. **Status Sync**: Keep story, task, and queue status aligned
4. **Claude Agent SDK**: All agent interaction via SDK (never raw API)

### Story-to-Spec Conversion

```python
# story_to_spec.py
from pathlib import Path
import json
import yaml
from typing import Optional

class StoryToSpecConverter:
    def __init__(self, planning_dir: Path):
        self.planning_dir = planning_dir

    def convert_story_to_spec(self, story_path: Path) -> dict:
        """Convert a story markdown file to spec format."""
        content = story_path.read_text(encoding='utf-8')
        frontmatter, body = self._parse_frontmatter(content)

        # Extract key sections
        acceptance_criteria = self._extract_acceptance_criteria(body)
        tasks = self._extract_tasks(body)
        context_links = self._extract_context_links(body)

        # Build spec structure
        spec = {
            'id': frontmatter.get('id'),
            'name': frontmatter.get('title'),
            'description': self._extract_user_story(body),
            'acceptance_criteria': acceptance_criteria,
            'tasks': tasks,
            'context': self._load_context(context_links),
            'test_scope': frontmatter.get('test_scope', 'unit'),
        }

        return spec

    def _load_context(self, links: list[dict]) -> dict:
        """Load referenced documents for context."""
        context = {}

        for link in links:
            artifact_path = self.planning_dir / link['file']
            if artifact_path.exists():
                content = artifact_path.read_text(encoding='utf-8')
                if link.get('section'):
                    content = self._extract_section(content, link['section'])
                context[link['type']] = content

        return context

    def _extract_acceptance_criteria(self, body: str) -> list[dict]:
        """Extract acceptance criteria from markdown."""
        criteria = []
        # Parse AC sections with Given/When/Then
        ac_pattern = r'\*\*AC(\d+): ([^*]+)\*\*\s*\n([\s\S]*?)(?=\*\*AC|\Z)'
        # ... implementation
        return criteria
```

### Agent Pipeline Integration

```python
# In sprint_executor.py
async def _execute_story(self, story: dict):
    """Execute a single story via the agent pipeline."""
    # Load story file
    story_path = self._get_story_path(story['storyId'])

    # Convert to spec format
    converter = StoryToSpecConverter(self.planning_dir)
    spec = converter.convert_story_to_spec(story_path)

    # Create spec directory for execution
    spec_dir = self._create_spec_from_story(spec)

    # Execute via existing pipeline
    from run import run_spec

    result = await run_spec(
        spec_dir=spec_dir,
        project_dir=self.project_dir,
        headless=True,  # No interactive prompts
    )

    if result['qa_status'] == 'passed':
        return {'status': 'completed'}
    else:
        return {
            'status': 'failed',
            'reason': result.get('qa_notes', 'QA validation failed'),
        }
```

### Context Building

```python
def build_agent_context(story_spec: dict, planning_dir: Path) -> str:
    """Build comprehensive context for the agent."""
    context_parts = []

    # Story details
    context_parts.append(f"# Story: {story_spec['name']}")
    context_parts.append(f"\n{story_spec['description']}")

    # Acceptance criteria
    context_parts.append("\n## Acceptance Criteria")
    for ac in story_spec['acceptance_criteria']:
        context_parts.append(f"\n### {ac['name']}")
        context_parts.append(f"- Given: {ac['given']}")
        context_parts.append(f"- When: {ac['when']}")
        context_parts.append(f"- Then: {ac['then']}")

    # Context from linked documents
    if 'prd' in story_spec['context']:
        context_parts.append("\n## Relevant PRD Sections")
        context_parts.append(story_spec['context']['prd'])

    if 'architecture' in story_spec['context']:
        context_parts.append("\n## Relevant Architecture Decisions")
        context_parts.append(story_spec['context']['architecture'])

    return '\n'.join(context_parts)
```

### Status Synchronization

```python
class StatusSynchronizer:
    def __init__(self, project_dir: Path):
        self.project_dir = project_dir
        self.queue_path = project_dir / '.auto-claude' / 'planning' / 'sprint-queue.json'
        self.tasks_path = project_dir / '.auto-claude' / 'tasks.json'

    def sync_story_completion(self, story_id: str, status: str, notes: str = None):
        """Sync completion status across all stores."""
        # 1. Update sprint queue
        self._update_queue_status(story_id, status, notes)

        # 2. Update Kanban task
        self._update_task_status(story_id, status)

        # 3. Update story file frontmatter
        self._update_story_frontmatter(story_id, status)

    def _update_task_status(self, story_id: str, status: str):
        """Update linked Kanban task status."""
        tasks = json.loads(self.tasks_path.read_text())

        for task in tasks:
            if task.get('storyId') == story_id:
                task['status'] = 'done' if status == 'completed' else 'review'
                task['column'] = 'Done' if status == 'completed' else 'Review'
                task['updatedAt'] = datetime.utcnow().isoformat()
                break

        self.tasks_path.write_text(json.dumps(tasks, indent=2))
```

### Execution Logging

```python
class ExecutionLogger:
    def __init__(self, story_dir: Path):
        self.log_path = story_dir / 'execution.log'
        self.start_time = None

    def start(self, story_id: str):
        self.start_time = datetime.utcnow()
        self._write(f"=== Execution Started: {story_id} ===")
        self._write(f"Time: {self.start_time.isoformat()}")

    def log(self, message: str):
        self._write(message)

    def complete(self, status: str):
        end_time = datetime.utcnow()
        duration = (end_time - self.start_time).total_seconds()
        self._write(f"=== Execution {status.upper()} ===")
        self._write(f"Duration: {duration:.1f} seconds")

    def _write(self, message: str):
        with open(self.log_path, 'a') as f:
            f.write(f"{datetime.utcnow().isoformat()} | {message}\n")
```

### Project Structure Notes

**New files to create:**
- `apps/backend/planning/story_to_spec.py`
- `apps/backend/planning/status_synchronizer.py`
- `apps/backend/planning/execution_logger.py`

**Existing files to modify:**
- `apps/backend/planning/sprint_executor.py` - Add story execution
- `apps/backend/run.py` - Support spec from story format

### References

- [Source: CLAUDE.md#core-pipeline] - Existing agent pipeline
- [Source: architecture.md#story-to-task-integration] - Story execution flow
- [Source: CLAUDE.md#claude-agent-sdk-integration] - SDK usage

### Test Scope

**Integration** - This story touches:
- Story-to-spec conversion
- Existing agent pipeline
- Multiple status stores
- File system operations

### Performance Requirements

- Story context loading < 2 seconds
- Agent pipeline integration is transparent
- Status sync is immediate

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References
- Date: 2026-01-16
- Conversation with Pierre continuing Epic 5 implementation

### Completion Notes List
- Created StoryToSpecConverter class for converting story markdown to spec format
- Implemented acceptance criteria extraction with Given/When/Then parsing
- Created context loading from linked PRD and architecture documents
- Implemented build_agent_context function for comprehensive agent context
- Created StatusSynchronizer for keeping story, task, and queue aligned
- Added status mapping between story status and Kanban column
- Implemented story file frontmatter updates on completion
- Created spec directory creation from story data

### File List

**New Files:**
- `apps/backend/planning/story_to_spec.py` - StoryToSpecConverter class with context loading
- `apps/backend/planning/status_synchronizer.py` - StatusSynchronizer class for cross-store sync

**Modified Files:**
- `apps/backend/planning/sprint_executor.py` - Integrated story-to-spec conversion and agent pipeline
- `apps/backend/planning/__init__.py` - Added new exports
