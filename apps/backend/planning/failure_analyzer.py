"""
Failure Analyzer for Sprint Execution (Story 5.3)
Generates AI analysis of story execution failures.
"""

from pathlib import Path
from typing import Any
import re


class FailureAnalyzer:
    """
    Analyzes failed story executions and generates helpful notes.

    Uses Claude to understand what went wrong and suggest fixes,
    making it easier for users to address failures in the morning.
    """

    ANALYSIS_PROMPT = """You are analyzing a failed story execution in an automated development pipeline.
Based on the error details and logs provided, explain what went wrong and suggest how to fix it.

Story: {story_title}

Acceptance Criteria:
{acceptance_criteria}

Error Type: {error_type}
Error Message: {error_message}
Phase: {phase}

Logs (truncated):
{logs}

Provide your analysis in EXACTLY this format:

1. Error Summary
[1-2 sentence summary of what went wrong]

2. AI Analysis
[Detailed explanation of the failure. Be specific about which acceptance criteria failed and why.
Reference specific code, tests, or errors from the logs.]

3. Suggested Fixes
[Concrete, actionable steps to fix the issue. Include code snippets if helpful.]
"""

    def __init__(self, project_dir: Path):
        """
        Initialize failure analyzer.

        Args:
            project_dir: Root directory of the project
        """
        self.project_dir = project_dir

    async def analyze_failure(
        self,
        story: dict,
        error_type: str,
        error_message: str,
        logs: str,
        phase: str = "Execution",
    ) -> dict[str, str]:
        """
        Generate AI analysis of the failure.

        Args:
            story: Story dict with title and acceptance_criteria
            error_type: Classification of the error (transient/permanent)
            error_message: The error message
            logs: Execution logs (will be truncated if too long)
            phase: Which phase failed (Planning, Implementation, QA, etc.)

        Returns:
            Dict with 'summary', 'analysis', and 'fixes' keys
        """
        # Import here to avoid circular imports
        try:
            from core.client import create_client
        except ImportError:
            # Fallback if running standalone
            return self._generate_fallback_analysis(
                story, error_type, error_message, logs, phase
            )

        # Format acceptance criteria
        ac_text = self._format_acceptance_criteria(story.get('acceptance_criteria', []))

        # Truncate logs if too long (keep first and last parts)
        truncated_logs = self._truncate_logs(logs, max_length=3000)

        prompt = self.ANALYSIS_PROMPT.format(
            story_title=story.get('title', 'Unknown'),
            acceptance_criteria=ac_text,
            error_type=error_type,
            error_message=error_message,
            phase=phase,
            logs=truncated_logs,
        )

        try:
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
        except Exception as e:
            # If AI analysis fails, provide basic fallback
            return self._generate_fallback_analysis(
                story, error_type, error_message, logs, phase, str(e)
            )

    def _format_acceptance_criteria(self, criteria: list) -> str:
        """Format acceptance criteria for the prompt."""
        if not criteria:
            return "No acceptance criteria available"

        lines = []
        for i, ac in enumerate(criteria, 1):
            if isinstance(ac, dict):
                name = ac.get('name', f'AC{i}')
                given = ac.get('given', '')
                when = ac.get('when', '')
                then = ac.get('then', '')
                lines.append(f"AC{i}: {name}")
                if given:
                    lines.append(f"  Given: {given}")
                if when:
                    lines.append(f"  When: {when}")
                if then:
                    lines.append(f"  Then: {then}")
            else:
                lines.append(f"AC{i}: {ac}")

        return '\n'.join(lines)

    def _truncate_logs(self, logs: str, max_length: int = 3000) -> str:
        """Truncate logs while keeping important parts."""
        if len(logs) <= max_length:
            return logs

        # Keep first 1/3 and last 2/3 (errors usually at end)
        first_part = max_length // 3
        last_part = max_length - first_part - 50  # Leave room for ellipsis

        return (
            logs[:first_part] +
            "\n\n... [TRUNCATED] ...\n\n" +
            logs[-last_part:]
        )

    def _parse_analysis(self, text: str) -> dict[str, str]:
        """Parse structured analysis from AI response."""
        sections: dict[str, str] = {
            'summary': '',
            'analysis': '',
            'fixes': '',
        }

        # Try to parse numbered sections
        current_section = None
        current_content: list[str] = []

        for line in text.split('\n'):
            line_lower = line.lower().strip()

            if line_lower.startswith('1.') and 'summary' in line_lower:
                if current_section and current_content:
                    sections[current_section] = '\n'.join(current_content).strip()
                current_section = 'summary'
                current_content = []
            elif line_lower.startswith('2.') and 'analysis' in line_lower:
                if current_section and current_content:
                    sections[current_section] = '\n'.join(current_content).strip()
                current_section = 'analysis'
                current_content = []
            elif line_lower.startswith('3.') and 'fix' in line_lower:
                if current_section and current_content:
                    sections[current_section] = '\n'.join(current_content).strip()
                current_section = 'fixes'
                current_content = []
            elif current_section:
                current_content.append(line)

        # Save last section
        if current_section and current_content:
            sections[current_section] = '\n'.join(current_content).strip()

        # Fallback if parsing failed
        if not any(sections.values()):
            sections['analysis'] = text
            sections['summary'] = text[:200] + "..." if len(text) > 200 else text

        return sections

    def _generate_fallback_analysis(
        self,
        story: dict,
        error_type: str,
        error_message: str,
        logs: str,
        phase: str,
        ai_error: str | None = None,
    ) -> dict[str, str]:
        """Generate basic analysis without AI."""
        summary = f"{error_type} error during {phase}: {error_message[:100]}"

        analysis_parts = [
            f"The story '{story.get('title', 'Unknown')}' failed during the {phase} phase.",
            f"Error type: {error_type}",
            f"Error message: {error_message}",
        ]

        if ai_error:
            analysis_parts.append(f"\n(AI analysis unavailable: {ai_error})")

        # Extract any obvious issues from logs
        if 'error' in logs.lower() or 'failed' in logs.lower():
            error_lines = [
                line for line in logs.split('\n')
                if 'error' in line.lower() or 'failed' in line.lower()
            ][:5]  # First 5 error lines
            if error_lines:
                analysis_parts.append("\nRelevant error lines from logs:")
                analysis_parts.extend(f"  - {line}" for line in error_lines)

        fixes = [
            "1. Review the error message and logs above",
            "2. Check the acceptance criteria in the story file",
            "3. Run the story manually to debug",
            "4. Update the story with more specific requirements if needed",
        ]

        return {
            'summary': summary,
            'analysis': '\n'.join(analysis_parts),
            'fixes': '\n'.join(fixes),
        }
