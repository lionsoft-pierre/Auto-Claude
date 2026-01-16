# Story 5.4: Non-Blocking Failure Handling

Status: ready-for-dev

## Story

As a **Technical Founder**,
I want **failed stories not to block the sprint**,
so that **overnight execution maximizes throughput**.

## Acceptance Criteria

1. **AC1: Continue After Failure**
   - **Given** a story fails during sprint execution
   - **When** the failure is handled
   - **Then** the sprint execution continues with the next story
   - **And** failed stories do not block remaining work

2. **AC2: Automatic Next Story Pickup**
   - **Given** the sprint queue has remaining stories
   - **When** one story fails
   - **Then** the next prioritized story is automatically picked
   - **And** the sprint continues until all stories are attempted

3. **AC3: Dependency Handling**
   - **Given** some stories depend on a failed story
   - **When** the failed story is detected
   - **Then** dependent stories are skipped (if dependencies defined)
   - **And** non-dependent stories continue execution

4. **AC4: Retry Logic**
   - **Given** sprint execution encounters transient errors
   - **When** an error is detected (network, timeout)
   - **Then** the system retries with exponential backoff
   - **And** marks as failed only after retry exhaustion

## Tasks / Subtasks

- [ ] **Task 1: Implement non-blocking execution loop** (AC: #1, #2)
  - [ ] 1.1: Wrap story execution in try-catch
  - [ ] 1.2: Log failure and continue on exception
  - [ ] 1.3: Update failed story status without stopping
  - [ ] 1.4: Pick next story after failure handling

- [ ] **Task 2: Implement retry logic** (AC: #4)
  - [ ] 2.1: Create `RetryPolicy` class with exponential backoff
  - [ ] 2.2: Configure max retries (default: 3)
  - [ ] 2.3: Configure base delay and max delay
  - [ ] 2.4: Distinguish transient vs permanent failures

- [ ] **Task 3: Implement dependency checking** (AC: #3)
  - [ ] 3.1: Parse story dependencies from context links
  - [ ] 3.2: Build dependency graph for sprint stories
  - [ ] 3.3: Skip stories whose dependencies failed
  - [ ] 3.4: Mark skipped stories with reason

- [ ] **Task 4: Create failure classification** (AC: #4)
  - [ ] 4.1: Classify transient errors (network, timeout, rate limit)
  - [ ] 4.2: Classify permanent errors (code errors, test failures)
  - [ ] 4.3: Only retry transient errors
  - [ ] 4.4: Fail immediately on permanent errors

- [ ] **Task 5: Update sprint completion logic** (AC: #1, #2)
  - [ ] 5.1: Complete sprint when all stories are attempted
  - [ ] 5.2: Include failed and skipped counts in completion
  - [ ] 5.3: Generate sprint summary report
  - [ ] 5.4: Mark sprint as completed (not failed) even with failures

- [ ] **Task 6: Add skip status to queue** (AC: #3)
  - [ ] 6.1: Add 'skipped' status to assignment states
  - [ ] 6.2: Record skip reason (dependency failure)
  - [ ] 6.3: Display skipped stories separately in UI
  - [ ] 6.4: Allow manual execution of skipped stories

- [ ] **Task 7: Add i18n translations** (AC: #1, #3, #4)
  - [ ] 7.1: Add retry messages to `en/planning.json`
  - [ ] 7.2: Add retry messages to `fr/planning.json`
  - [ ] 7.3: Add skip and dependency messages

- [ ] **Task 8: Write tests** (AC: all)
  - [ ] 8.1: Unit tests for retry policy
  - [ ] 8.2: Unit tests for dependency graph
  - [ ] 8.3: Integration tests for non-blocking execution
  - [ ] 8.4: Test sprint completion with mixed results

## Dev Notes

### Critical Implementation Rules

1. **Never Stop on Failure**: Sprint must continue after any story failure
2. **Retry Transient Only**: Don't retry code/test failures
3. **Complete Sprint**: Mark sprint complete when all stories attempted
4. **NFR6/NFR7**: Continue through transient errors, no crash on failure

### Execution Flow with Failures

```
┌─────────────────────────────────────────────────────────────┐
│                    Sprint Execution Loop                     │
│                                                              │
│   ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────┐  │
│   │ Story 1 │────►│ Story 2 │────►│ Story 3 │────►│ ... │  │
│   │   ✓     │     │   ✗     │     │   ✓     │     │     │  │
│   └─────────┘     └────┬────┘     └─────────┘     └─────┘  │
│                        │                                     │
│                        ▼                                     │
│                  ┌───────────┐                              │
│                  │ Log Failure│                              │
│                  │ Continue   │                              │
│                  └───────────┘                              │
│                                                              │
│   Sprint completes with: 2 completed, 1 failed, 0 skipped   │
└─────────────────────────────────────────────────────────────┘
```

### Retry Policy Implementation

```python
# retry_policy.py
import asyncio
from enum import Enum
from typing import TypeVar, Callable
import random

class ErrorType(Enum):
    TRANSIENT = "transient"  # Network, timeout, rate limit
    PERMANENT = "permanent"  # Code error, test failure

class RetryPolicy:
    def __init__(
        self,
        max_retries: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        jitter: bool = True,
    ):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.jitter = jitter

    def calculate_delay(self, attempt: int) -> float:
        """Calculate delay with exponential backoff."""
        delay = min(self.base_delay * (2 ** attempt), self.max_delay)
        if self.jitter:
            delay = delay * (0.5 + random.random())
        return delay

    async def execute_with_retry(
        self,
        func: Callable,
        classify_error: Callable[[Exception], ErrorType],
    ):
        """Execute function with retry logic."""
        last_error = None

        for attempt in range(self.max_retries + 1):
            try:
                return await func()
            except Exception as e:
                last_error = e
                error_type = classify_error(e)

                if error_type == ErrorType.PERMANENT:
                    # Don't retry permanent errors
                    raise

                if attempt < self.max_retries:
                    delay = self.calculate_delay(attempt)
                    await asyncio.sleep(delay)
                else:
                    # Max retries exceeded
                    raise

        raise last_error
```

### Error Classification

```python
# error_classifier.py
def classify_error(error: Exception) -> ErrorType:
    """Classify error as transient or permanent."""
    error_str = str(error).lower()

    # Transient errors - retry these
    transient_patterns = [
        'timeout', 'timed out',
        'connection reset', 'connection refused',
        'rate limit', 'too many requests',
        'temporary', 'unavailable',
        'network', 'socket',
        '502', '503', '504',  # Server errors
    ]

    for pattern in transient_patterns:
        if pattern in error_str:
            return ErrorType.TRANSIENT

    # Check for specific exception types
    if isinstance(error, (TimeoutError, ConnectionError)):
        return ErrorType.TRANSIENT

    # Default to permanent (code errors, test failures)
    return ErrorType.PERMANENT
```

### Non-Blocking Execution Loop

```python
# In sprint_executor.py
async def execute(self):
    """Main execution loop - continues despite failures."""
    self.running = True
    self._update_sprint_status('in_progress')

    results = {
        'completed': 0,
        'failed': 0,
        'skipped': 0,
    }

    while self.running:
        story = self._pick_next_story()
        if not story:
            break

        # Check dependencies
        if self._has_failed_dependency(story):
            self._skip_story(story, "Dependency failed")
            results['skipped'] += 1
            continue

        try:
            # Execute with retry for transient errors
            await self.retry_policy.execute_with_retry(
                lambda: self._execute_story(story),
                classify_error,
            )
            self._update_story_status(story['taskId'], 'completed')
            results['completed'] += 1

        except Exception as e:
            # Log failure and continue - NEVER stop the sprint
            self._handle_failure(story, e)
            results['failed'] += 1
            # Continue to next story

    # Sprint complete (even with failures)
    self._complete_sprint(results)
```

### Dependency Handling

```python
class DependencyGraph:
    def __init__(self, assignments: list[dict]):
        self.dependencies = {}  # story_id -> [dependency_ids]
        self._build_graph(assignments)

    def _build_graph(self, assignments: list[dict]):
        """Build dependency graph from story context links."""
        for assignment in assignments:
            story_id = assignment['storyId']
            # Parse dependencies from story file
            deps = self._parse_dependencies(assignment)
            self.dependencies[story_id] = deps

    def has_failed_dependency(self, story_id: str, failed_stories: set[str]) -> bool:
        """Check if any dependency has failed."""
        deps = self.dependencies.get(story_id, [])
        return any(dep in failed_stories for dep in deps)

    def get_blocking_dependencies(self, story_id: str, failed_stories: set[str]) -> list[str]:
        """Get list of failed dependencies."""
        deps = self.dependencies.get(story_id, [])
        return [dep for dep in deps if dep in failed_stories]
```

### Skip Status Handling

```python
def _skip_story(self, story: dict, reason: str):
    """Skip a story and record reason."""
    self._update_queue_assignment(story['taskId'], {
        'status': 'skipped',
        'skipReason': reason,
        'skippedAt': datetime.utcnow().isoformat(),
    })

    self._write_execution_status(
        'skipped',
        story_id=story['taskId'],
        reason=reason,
    )
```

### Sprint Completion with Mixed Results

```python
def _complete_sprint(self, results: dict):
    """Complete sprint and generate summary."""
    self._update_sprint_status('completed')

    summary = {
        'completed_at': datetime.utcnow().isoformat(),
        'stories_completed': results['completed'],
        'stories_failed': results['failed'],
        'stories_skipped': results['skipped'],
        'total_attempted': sum(results.values()),
        'success_rate': results['completed'] / sum(results.values()) if sum(results.values()) > 0 else 0,
    }

    self._write_sprint_summary(summary)
    self._write_execution_status('completed', summary=summary)
```

### i18n Keys

```json
// en/planning.json
{
  "execution": {
    "retrying": "Retrying story (attempt {{attempt}} of {{max}})...",
    "skipped": "Skipped",
    "skipReason": "Skipped: {{reason}}",
    "dependencyFailed": "Dependency failed",
    "transientError": "Transient error, retrying...",
    "permanentError": "Permanent error, not retrying",
    "sprintSummary": "Sprint completed: {{completed}} succeeded, {{failed}} failed, {{skipped}} skipped"
  }
}

// fr/planning.json
{
  "execution": {
    "retrying": "Nouvelle tentative de la story (essai {{attempt}} sur {{max}})...",
    "skipped": "Ignoré",
    "skipReason": "Ignoré: {{reason}}",
    "dependencyFailed": "Dépendance échouée",
    "transientError": "Erreur transitoire, nouvelle tentative...",
    "permanentError": "Erreur permanente, pas de nouvelle tentative",
    "sprintSummary": "Sprint terminé: {{completed}} réussis, {{failed}} échoués, {{skipped}} ignorés"
  }
}
```

### Project Structure Notes

**New files to create:**
- `apps/backend/planning/retry_policy.py`
- `apps/backend/planning/error_classifier.py`
- `apps/backend/planning/dependency_graph.py`

**Existing files to modify:**
- `apps/backend/planning/sprint_executor.py` - Integrate non-blocking logic
- `apps/backend/planning/sprint_queue.json` schema - Add 'skipped' status

### References

- [Source: architecture.md#error-handling] - Error handling patterns
- [Source: NFR6] - Retry logic for transient errors
- [Source: NFR7] - No crash on story failure

### Test Scope

**Integration** - This story touches:
- Retry policy behavior
- Dependency graph
- Sprint completion logic
- Error classification

### Performance Requirements

- Retry delays follow exponential backoff
- Dependency check < 100ms
- Sprint completion is immediate after last story

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### File List
