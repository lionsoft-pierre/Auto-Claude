# Story 5.3: Failure Recording and Notes

Status: done

## Story

As a **Technical Founder**,
I want **failures to be recorded with AI notes explaining what went wrong**,
so that **I can quickly understand and fix issues in the morning**.

## Acceptance Criteria

1. **AC1: Failure Status Recording**
   - **Given** a story execution fails
   - **When** the failure is detected
   - **Then** the story status is updated to "failed"
   - **And** the story is marked for review in the sprint queue

2. **AC2: AI Failure Notes**
   - **Given** a story fails
   - **When** the failure is recorded
   - **Then** the AI records failure notes explaining what went wrong
   - **And** the notes are stored in the story file under a "Failure Log" section

3. **AC3: Detailed Failure Information**
   - **Given** failure notes are recorded
   - **When** the user reviews the failed story
   - **Then** they see the specific error, attempted solutions, and AI observations
   - **And** the notes help them refine the story for retry

4. **AC4: Queue Failure Summary**
   - **Given** a story fails during execution
   - **When** updating the sprint queue
   - **Then** the queue entry shows status "failed"
   - **And** includes a summary of the failure reason

## Tasks / Subtasks

- [ ] **Task 1: Implement failure detection** (AC: #1)
  - [ ] 1.1: Detect agent pipeline failure (QA rejection)
  - [ ] 1.2: Detect execution errors (crashes, timeouts)
  - [ ] 1.3: Capture failure type and error details
  - [ ] 1.4: Update story status immediately on failure

- [ ] **Task 2: Generate AI failure notes** (AC: #2, #3)
  - [ ] 2.1: Create failure analysis prompt for Claude
  - [ ] 2.2: Include error context, stack traces, logs
  - [ ] 2.3: Request structured failure explanation
  - [ ] 2.4: Generate actionable suggestions

- [ ] **Task 3: Append failure log to story file** (AC: #2)
  - [ ] 3.1: Create "Failure Log" section in story markdown
  - [ ] 3.2: Append failure entry with timestamp
  - [ ] 3.3: Include AI notes and raw error details
  - [ ] 3.4: Preserve previous failure logs (history)

- [ ] **Task 4: Update sprint queue with failure** (AC: #1, #4)
  - [ ] 4.1: Set assignment status to "failed"
  - [ ] 4.2: Add `failureReason` summary field
  - [ ] 4.3: Add `failedAt` timestamp
  - [ ] 4.4: Keep story in queue for potential retry

- [ ] **Task 5: Create failure analysis service** (AC: #2, #3)
  - [ ] 5.1: Create `apps/backend/planning/failure_analyzer.py`
  - [ ] 5.2: Collect relevant logs and context
  - [ ] 5.3: Call Claude for failure analysis
  - [ ] 5.4: Structure response for storage

- [ ] **Task 6: Store execution artifacts** (AC: #3)
  - [ ] 6.1: Save agent logs to story directory
  - [ ] 6.2: Save QA report if available
  - [ ] 6.3: Save stack traces and error output
  - [ ] 6.4: Link artifacts from failure log

- [ ] **Task 7: Add i18n translations** (AC: #2, #4)
  - [ ] 7.1: Add failure messages to `en/planning.json`
  - [ ] 7.2: Add failure messages to `fr/planning.json`
  - [ ] 7.3: Add failure log section headers

- [ ] **Task 8: Write tests** (AC: all)
  - [ ] 8.1: Unit tests for failure detection
  - [ ] 8.2: Unit tests for failure log formatting
  - [ ] 8.3: Test AI notes generation
  - [ ] 8.4: Test queue status updates

## Dev Notes

### Critical Implementation Rules

1. **Never Lose Data**: Always capture and store failure details
2. **Actionable Notes**: AI notes should help fix the issue
3. **Preserve History**: Append new failures, don't overwrite
4. **Summary + Detail**: Queue shows summary, story has full log

### Failure Log Format in Story File

```markdown
---
id: story-uuid
title: Story Title
status: failed
---

# Story Content...

---

## Failure Log

### Attempt 1 - 2026-01-15T22:30:00Z

**Status:** Failed
**Duration:** 12 minutes 34 seconds
**Phase:** QA Validation

#### Error Summary
QA validation failed: 2 of 4 acceptance criteria not met.

#### AI Analysis
The implementation correctly handles the happy path but fails on edge cases:

1. **AC2 Not Met**: The input validation doesn't handle empty strings. The regex `^\w+$`
   rejects empty input but the error message shown is the default HTML5 validation
   message instead of the custom i18n message.

2. **AC4 Not Met**: The loading state is set but never cleared on error, leaving
   the submit button permanently disabled after a failed submission.

#### Suggested Fixes
1. Add explicit empty string check before regex validation
2. Add error handling in the catch block to clear loading state:
   ```typescript
   } catch (error) {
     setIsLoading(false);  // Add this line
     setError(error.message);
   }
   ```

#### Raw Error Output
```
FAIL src/components/LoginForm.test.tsx
  ✓ renders login form (45ms)
  ✓ submits valid credentials (123ms)
  ✕ shows error for empty username (89ms)
  ✕ clears loading state on error (156ms)
```

#### Artifacts
- [Agent Logs](./execution-logs/attempt-1-agent.log)
- [QA Report](./execution-logs/attempt-1-qa-report.md)
```

### Failure Analyzer Implementation

```python
# failure_analyzer.py
from pathlib import Path
from datetime import datetime
from core.client import create_client

class FailureAnalyzer:
    ANALYSIS_PROMPT = """
You are analyzing a failed story execution. Based on the error details and logs provided,
explain what went wrong and suggest how to fix it.

Story: {story_title}
Acceptance Criteria: {acceptance_criteria}

Error Type: {error_type}
Error Message: {error_message}

Logs:
{logs}

Provide your analysis in this format:
1. Error Summary (1-2 sentences)
2. AI Analysis (detailed explanation of what went wrong)
3. Suggested Fixes (concrete steps to fix the issue)
"""

    async def analyze_failure(
        self,
        story: dict,
        error_type: str,
        error_message: str,
        logs: str,
    ) -> dict:
        """Generate AI analysis of the failure."""
        prompt = self.ANALYSIS_PROMPT.format(
            story_title=story['title'],
            acceptance_criteria=self._format_ac(story['acceptance_criteria']),
            error_type=error_type,
            error_message=error_message,
            logs=logs,
        )

        client = create_client(
            project_dir=str(self.project_dir),
            spec_dir=None,
            model="claude-sonnet-4-5-20250929",
            agent_type="planning",
        )

        response = await client.messages.create(
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )

        return self._parse_analysis(response.content[0].text)

    def _parse_analysis(self, text: str) -> dict:
        """Parse structured analysis from response."""
        sections = {}
        current_section = None
        current_content = []

        for line in text.split('\n'):
            if line.startswith('1. Error Summary'):
                current_section = 'summary'
            elif line.startswith('2. AI Analysis'):
                if current_section:
                    sections[current_section] = '\n'.join(current_content)
                current_section = 'analysis'
                current_content = []
            elif line.startswith('3. Suggested Fixes'):
                if current_section:
                    sections[current_section] = '\n'.join(current_content)
                current_section = 'fixes'
                current_content = []
            elif current_section:
                current_content.append(line)

        if current_section:
            sections[current_section] = '\n'.join(current_content)

        return sections
```

### Failure Log Appender

```python
# failure_logger.py
from pathlib import Path
from datetime import datetime

class FailureLogger:
    def __init__(self, story_path: Path):
        self.story_path = story_path

    def append_failure(
        self,
        attempt: int,
        duration_seconds: float,
        phase: str,
        analysis: dict,
        raw_error: str,
        artifacts: list[str],
    ):
        """Append failure log entry to story file."""
        content = self.story_path.read_text(encoding='utf-8')

        # Check if Failure Log section exists
        if '## Failure Log' not in content:
            content += '\n\n---\n\n## Failure Log\n'

        # Build failure entry
        timestamp = datetime.utcnow().isoformat()
        entry = f"""
### Attempt {attempt} - {timestamp}

**Status:** Failed
**Duration:** {self._format_duration(duration_seconds)}
**Phase:** {phase}

#### Error Summary
{analysis.get('summary', 'No summary available')}

#### AI Analysis
{analysis.get('analysis', 'No analysis available')}

#### Suggested Fixes
{analysis.get('fixes', 'No suggestions available')}

#### Raw Error Output
```
{raw_error}
```

#### Artifacts
{self._format_artifacts(artifacts)}
"""

        content += entry
        self.story_path.write_text(content, encoding='utf-8')

    def _format_duration(self, seconds: float) -> str:
        minutes = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{minutes} minutes {secs} seconds"

    def _format_artifacts(self, artifacts: list[str]) -> str:
        return '\n'.join(f"- [{Path(a).name}]({a})" for a in artifacts)
```

### Sprint Queue Failure Update

```python
def update_queue_with_failure(queue_path: Path, task_id: str, failure_reason: str):
    """Update sprint queue with failure information."""
    queue = json.loads(queue_path.read_text())

    for assignment in queue['assignments']:
        if assignment['taskId'] == task_id:
            assignment['status'] = 'failed'
            assignment['failureReason'] = failure_reason[:200]  # Summary
            assignment['failedAt'] = datetime.utcnow().isoformat()
            break

    queue_path.write_text(json.dumps(queue, indent=2))
```

### i18n Keys

```json
// en/planning.json
{
  "failure": {
    "status": "Failed",
    "viewDetails": "View Failure Details",
    "attempt": "Attempt {{number}}",
    "duration": "Duration",
    "phase": "Phase",
    "summary": "Error Summary",
    "analysis": "AI Analysis",
    "fixes": "Suggested Fixes",
    "rawError": "Raw Error Output",
    "artifacts": "Artifacts",
    "retry": "Retry Story"
  }
}

// fr/planning.json
{
  "failure": {
    "status": "Échec",
    "viewDetails": "Voir les détails de l'échec",
    "attempt": "Tentative {{number}}",
    "duration": "Durée",
    "phase": "Phase",
    "summary": "Résumé de l'erreur",
    "analysis": "Analyse IA",
    "fixes": "Corrections suggérées",
    "rawError": "Sortie d'erreur brute",
    "artifacts": "Artefacts",
    "retry": "Réessayer la story"
  }
}
```

### Project Structure Notes

**New files to create:**
- `apps/backend/planning/failure_analyzer.py`
- `apps/backend/planning/failure_logger.py`

**Existing files to modify:**
- `apps/backend/planning/sprint_executor.py` - Integrate failure handling
- `apps/backend/planning/story_to_spec.py` - Include failure log in context

### References

- [Source: architecture.md#error-handling] - Error handling patterns
- [Source: NFR7] - No crash on story failure

### Test Scope

**Unit** - This story focuses on:
- Failure detection logic
- Failure log formatting
- AI analysis generation
- Queue status updates

### Performance Requirements

- Failure analysis < 30 seconds
- Log writing is immediate
- Queue update is atomic

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References
- Date: 2026-01-16
- Conversation with Pierre continuing Epic 5 implementation

### Completion Notes List
- Created FailureAnalyzer class for AI-powered failure analysis
- Implemented structured analysis prompt with error summary, AI analysis, suggested fixes
- Created FailureLogger class for appending failure logs to story files
- Implemented attempt counting for failure history
- Added failure log section format with timestamp, duration, phase
- Created execution logs directory creation utility
- Implemented artifact saving for debugging
- Added story status update on failure with timestamp

### File List

**New Files:**
- `apps/backend/planning/failure_analyzer.py` - FailureAnalyzer class with AI analysis
- `apps/backend/planning/failure_logger.py` - FailureLogger class with log appending

**Modified Files:**
- `apps/backend/planning/sprint_executor.py` - Integrated failure handling and analysis
- `apps/backend/planning/__init__.py` - Added new exports
- `apps/frontend/src/shared/types/planning.ts` - Added FailureAnalysis, FailureLogEntry types
- `apps/frontend/src/shared/i18n/locales/en/planning.json` - Added failure translations
- `apps/frontend/src/shared/i18n/locales/fr/planning.json` - Added failure translations (French)
