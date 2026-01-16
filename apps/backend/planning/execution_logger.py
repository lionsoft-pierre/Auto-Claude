"""
Execution Logger for Sprint Execution (Story 5.2)
Logs execution events and captures agent output for debugging.
"""

from pathlib import Path
from datetime import datetime
from typing import TextIO
import sys


class ExecutionLogger:
    """
    Logs sprint and story execution events.

    Creates structured logs for debugging and review,
    including execution start/end, durations, and output capture.
    """

    def __init__(self, log_dir: Path, story_id: str | None = None):
        """
        Initialize execution logger.

        Args:
            log_dir: Directory to write log files
            story_id: Optional story ID for story-specific logs
        """
        self.log_dir = log_dir
        self.story_id = story_id
        self.start_time: datetime | None = None
        self._log_file: TextIO | None = None
        self._log_path: Path | None = None

        # Ensure log directory exists
        self.log_dir.mkdir(parents=True, exist_ok=True)

    @property
    def log_path(self) -> Path | None:
        """Get the current log file path."""
        return self._log_path

    def start(self, context: str = "") -> None:
        """
        Start logging a new execution.

        Args:
            context: Description of what's being executed
        """
        self.start_time = datetime.utcnow()

        # Create log file with timestamp
        timestamp = self.start_time.strftime('%Y%m%d-%H%M%S')
        if self.story_id:
            filename = f"execution-{self.story_id}-{timestamp}.log"
        else:
            filename = f"execution-{timestamp}.log"

        self._log_path = self.log_dir / filename
        self._log_file = open(self._log_path, 'w', encoding='utf-8')

        # Write header
        self._write_header(context)

    def _write_header(self, context: str) -> None:
        """Write log file header."""
        lines = [
            "=" * 60,
            f"Execution Log",
            "=" * 60,
            f"Started: {self.start_time.isoformat() if self.start_time else 'N/A'}",
        ]

        if self.story_id:
            lines.append(f"Story ID: {self.story_id}")

        if context:
            lines.append(f"Context: {context}")

        lines.extend(["=" * 60, ""])

        self._write('\n'.join(lines))

    def log(self, message: str, level: str = "INFO") -> None:
        """
        Log a message with timestamp.

        Args:
            message: The message to log
            level: Log level (INFO, WARN, ERROR, DEBUG)
        """
        timestamp = datetime.utcnow().isoformat()
        formatted = f"[{timestamp}] [{level}] {message}"
        self._write(formatted)

    def log_phase(self, phase: str) -> None:
        """
        Log the start of an execution phase.

        Args:
            phase: Name of the phase (Planning, Implementation, QA, etc.)
        """
        self._write("")
        self._write("-" * 40)
        self._write(f"Phase: {phase}")
        self._write(f"Started: {datetime.utcnow().isoformat()}")
        self._write("-" * 40)

    def log_output(self, output: str, source: str = "agent") -> None:
        """
        Log captured output from agent or process.

        Args:
            output: The output text
            source: Where the output came from
        """
        self._write(f"\n--- {source} output ---")
        self._write(output)
        self._write(f"--- end {source} output ---\n")

    def log_error(self, error: str | Exception) -> None:
        """
        Log an error.

        Args:
            error: Error message or exception
        """
        error_str = str(error)
        self.log(f"ERROR: {error_str}", level="ERROR")

        # If it's an exception, log the traceback too
        if isinstance(error, Exception):
            import traceback
            tb = traceback.format_exc()
            self._write(f"\nTraceback:\n{tb}")

    def complete(self, status: str, summary: str = "") -> float:
        """
        Complete the log and record final status.

        Args:
            status: Final status (completed, failed, skipped)
            summary: Optional summary message

        Returns:
            Duration in seconds
        """
        end_time = datetime.utcnow()
        duration = 0.0

        if self.start_time:
            duration = (end_time - self.start_time).total_seconds()

        # Write footer
        lines = [
            "",
            "=" * 60,
            f"Execution {status.upper()}",
            "=" * 60,
            f"Ended: {end_time.isoformat()}",
            f"Duration: {self._format_duration(duration)}",
        ]

        if summary:
            lines.append(f"Summary: {summary}")

        lines.append("=" * 60)

        self._write('\n'.join(lines))

        # Close the file
        if self._log_file:
            self._log_file.close()
            self._log_file = None

        return duration

    def _write(self, text: str) -> None:
        """Write text to log file."""
        if self._log_file:
            self._log_file.write(text + '\n')
            self._log_file.flush()

    def _format_duration(self, seconds: float) -> str:
        """Format duration as human-readable string."""
        if seconds < 60:
            return f"{seconds:.1f} seconds"

        minutes = int(seconds // 60)
        secs = int(seconds % 60)

        if minutes < 60:
            return f"{minutes}m {secs}s"

        hours = int(minutes // 60)
        mins = minutes % 60
        return f"{hours}h {mins}m"


class SprintExecutionLogger:
    """
    Logger for sprint-level execution events.

    Tracks overall sprint progress across multiple stories.
    """

    def __init__(self, log_dir: Path, sprint_id: str):
        """
        Initialize sprint execution logger.

        Args:
            log_dir: Directory to write log files
            sprint_id: The sprint ID being executed
        """
        self.log_dir = log_dir
        self.sprint_id = sprint_id
        self.start_time: datetime | None = None
        self._log_path: Path | None = None

        # Execution stats
        self.stories_completed = 0
        self.stories_failed = 0
        self.stories_skipped = 0

        log_dir.mkdir(parents=True, exist_ok=True)

    def start(self, story_count: int) -> None:
        """
        Start sprint execution logging.

        Args:
            story_count: Total number of stories in sprint
        """
        self.start_time = datetime.utcnow()
        timestamp = self.start_time.strftime('%Y%m%d-%H%M%S')

        self._log_path = self.log_dir / f"sprint-{self.sprint_id}-{timestamp}.log"

        with open(self._log_path, 'w', encoding='utf-8') as f:
            f.write("=" * 60 + "\n")
            f.write(f"Sprint Execution: {self.sprint_id}\n")
            f.write("=" * 60 + "\n")
            f.write(f"Started: {self.start_time.isoformat()}\n")
            f.write(f"Stories to execute: {story_count}\n")
            f.write("=" * 60 + "\n\n")

    def log_story_start(self, story_id: str, story_title: str) -> None:
        """Log the start of a story execution."""
        self._append(f"\n[{datetime.utcnow().isoformat()}] Starting: {story_title} ({story_id})")

    def log_story_complete(self, story_id: str, status: str, duration: float) -> None:
        """Log story completion."""
        self._append(
            f"[{datetime.utcnow().isoformat()}] {status.upper()}: {story_id} "
            f"(duration: {duration:.1f}s)"
        )

        if status == 'completed':
            self.stories_completed += 1
        elif status == 'failed':
            self.stories_failed += 1
        elif status == 'skipped':
            self.stories_skipped += 1

    def complete(self) -> dict:
        """
        Complete sprint logging and return summary.

        Returns:
            Summary dict with completion stats
        """
        end_time = datetime.utcnow()
        duration = 0.0

        if self.start_time:
            duration = (end_time - self.start_time).total_seconds()

        total = self.stories_completed + self.stories_failed + self.stories_skipped
        success_rate = (self.stories_completed / total * 100) if total > 0 else 0

        summary = {
            'sprint_id': self.sprint_id,
            'started_at': self.start_time.isoformat() if self.start_time else None,
            'completed_at': end_time.isoformat(),
            'duration_seconds': duration,
            'stories_completed': self.stories_completed,
            'stories_failed': self.stories_failed,
            'stories_skipped': self.stories_skipped,
            'total_attempted': total,
            'success_rate': success_rate,
        }

        # Write summary to log
        self._append("\n" + "=" * 60)
        self._append("Sprint Execution Complete")
        self._append("=" * 60)
        self._append(f"Ended: {end_time.isoformat()}")
        self._append(f"Duration: {duration:.1f} seconds")
        self._append(f"Completed: {self.stories_completed}")
        self._append(f"Failed: {self.stories_failed}")
        self._append(f"Skipped: {self.stories_skipped}")
        self._append(f"Success Rate: {success_rate:.1f}%")
        self._append("=" * 60)

        return summary

    def _append(self, text: str) -> None:
        """Append text to log file."""
        if self._log_path:
            with open(self._log_path, 'a', encoding='utf-8') as f:
                f.write(text + '\n')
