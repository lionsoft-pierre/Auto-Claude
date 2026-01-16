"""
Failure Logger for Sprint Execution (Story 5.3)
Appends failure logs to story files with AI analysis.
"""

from pathlib import Path
from datetime import datetime
from typing import Any
import re


class FailureLogger:
    """
    Logs execution failures to story markdown files.

    Creates a "Failure Log" section that preserves history of all
    attempts, making it easy to review what went wrong over time.
    """

    def __init__(self, story_path: Path):
        """
        Initialize failure logger for a story.

        Args:
            story_path: Path to the story markdown file
        """
        self.story_path = story_path
        self._ensure_story_exists()

    def _ensure_story_exists(self) -> None:
        """Verify the story file exists."""
        if not self.story_path.exists():
            raise FileNotFoundError(f"Story file not found: {self.story_path}")

    def get_attempt_count(self) -> int:
        """
        Get the number of previous failure attempts.

        Returns:
            Number of existing failure entries (0 if none)
        """
        content = self.story_path.read_text(encoding='utf-8')

        # Count "### Attempt N" headers
        attempts = re.findall(r'### Attempt \d+', content)
        return len(attempts)

    def append_failure(
        self,
        attempt: int | None = None,
        duration_seconds: float = 0.0,
        phase: str = "Execution",
        analysis: dict[str, str] | None = None,
        raw_error: str = "",
        artifacts: list[str] | None = None,
    ) -> int:
        """
        Append a failure log entry to the story file.

        Args:
            attempt: Attempt number (auto-calculated if None)
            duration_seconds: How long execution took before failure
            phase: Which phase failed (Planning, Implementation, QA)
            analysis: AI analysis dict with 'summary', 'analysis', 'fixes'
            raw_error: Raw error output/stack trace
            artifacts: List of artifact file paths

        Returns:
            The attempt number that was logged
        """
        content = self.story_path.read_text(encoding='utf-8')

        # Auto-calculate attempt number if not provided
        if attempt is None:
            attempt = self.get_attempt_count() + 1

        # Ensure Failure Log section exists
        if '## Failure Log' not in content:
            content = content.rstrip() + '\n\n---\n\n## Failure Log\n'

        # Build failure entry
        timestamp = datetime.utcnow().isoformat() + 'Z'
        analysis = analysis or {}
        artifacts = artifacts or []

        entry = self._build_failure_entry(
            attempt=attempt,
            timestamp=timestamp,
            duration_seconds=duration_seconds,
            phase=phase,
            analysis=analysis,
            raw_error=raw_error,
            artifacts=artifacts,
        )

        # Append entry to content
        content = content.rstrip() + '\n' + entry

        # Write updated content
        self.story_path.write_text(content, encoding='utf-8')

        return attempt

    def _build_failure_entry(
        self,
        attempt: int,
        timestamp: str,
        duration_seconds: float,
        phase: str,
        analysis: dict[str, str],
        raw_error: str,
        artifacts: list[str],
    ) -> str:
        """Build markdown content for a failure entry."""
        duration_str = self._format_duration(duration_seconds)

        # Build the entry
        lines = [
            f"\n### Attempt {attempt} - {timestamp}",
            "",
            "**Status:** Failed",
            f"**Duration:** {duration_str}",
            f"**Phase:** {phase}",
            "",
        ]

        # Error Summary
        summary = analysis.get('summary', 'No summary available')
        lines.extend([
            "#### Error Summary",
            summary,
            "",
        ])

        # AI Analysis
        ai_analysis = analysis.get('analysis', 'No analysis available')
        lines.extend([
            "#### AI Analysis",
            ai_analysis,
            "",
        ])

        # Suggested Fixes
        fixes = analysis.get('fixes', 'No suggestions available')
        lines.extend([
            "#### Suggested Fixes",
            fixes,
            "",
        ])

        # Raw Error Output (truncated if very long)
        if raw_error:
            truncated_error = self._truncate_error(raw_error, max_lines=50)
            lines.extend([
                "#### Raw Error Output",
                "```",
                truncated_error,
                "```",
                "",
            ])

        # Artifacts
        if artifacts:
            lines.append("#### Artifacts")
            for artifact_path in artifacts:
                artifact_name = Path(artifact_path).name
                lines.append(f"- [{artifact_name}]({artifact_path})")
            lines.append("")

        return '\n'.join(lines)

    def _format_duration(self, seconds: float) -> str:
        """Format duration as human-readable string."""
        if seconds < 60:
            return f"{seconds:.1f} seconds"

        minutes = int(seconds // 60)
        secs = int(seconds % 60)

        if minutes < 60:
            return f"{minutes} minutes {secs} seconds"

        hours = int(minutes // 60)
        mins = minutes % 60
        return f"{hours} hours {mins} minutes"

    def _truncate_error(self, error: str, max_lines: int = 50) -> str:
        """Truncate error output to reasonable length."""
        lines = error.split('\n')

        if len(lines) <= max_lines:
            return error

        # Keep first 1/3 and last 2/3 of lines
        first_part = max_lines // 3
        last_part = max_lines - first_part - 1

        truncated = lines[:first_part]
        truncated.append(f"... [{len(lines) - max_lines} lines truncated] ...")
        truncated.extend(lines[-last_part:])

        return '\n'.join(truncated)

    def update_story_status(self, status: str = "failed") -> None:
        """
        Update the story's frontmatter status.

        Args:
            status: New status value (default: "failed")
        """
        content = self.story_path.read_text(encoding='utf-8')

        # Update status in frontmatter
        updated = re.sub(
            r'^(status:\s*)(\S+)',
            f'\\1{status}',
            content,
            count=1,
            flags=re.MULTILINE,
        )

        # Add/update updatedAt timestamp
        now = datetime.utcnow().isoformat() + 'Z'
        if 'updatedAt:' in updated:
            updated = re.sub(
                r'^(updatedAt:\s*)(\S+)',
                f'\\1{now}',
                updated,
                count=1,
                flags=re.MULTILINE,
            )
        else:
            # Add updatedAt after createdAt
            updated = re.sub(
                r'^(createdAt:\s*\S+)',
                f'\\1\nupdatedAt: {now}',
                updated,
                count=1,
                flags=re.MULTILINE,
            )

        self.story_path.write_text(updated, encoding='utf-8')


def create_execution_logs_dir(story_path: Path) -> Path:
    """
    Create a directory for execution logs next to the story file.

    Args:
        story_path: Path to the story markdown file

    Returns:
        Path to the execution-logs directory
    """
    logs_dir = story_path.parent / 'execution-logs'
    logs_dir.mkdir(exist_ok=True)
    return logs_dir


def save_artifact(logs_dir: Path, name: str, content: str) -> Path:
    """
    Save an artifact file to the logs directory.

    Args:
        logs_dir: Path to execution-logs directory
        name: Filename for the artifact
        content: Content to write

    Returns:
        Path to the saved artifact
    """
    artifact_path = logs_dir / name
    artifact_path.write_text(content, encoding='utf-8')
    return artifact_path
