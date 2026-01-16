"""
Story to Spec Converter (Story 5.2)
Converts story markdown files to spec format for agent execution.
"""

from pathlib import Path
from typing import Any
import re
import json


class StoryToSpecConverter:
    """
    Converts story markdown files to the spec format used by Auto-Claude agents.

    This allows stories to be executed using the existing agent pipeline,
    maintaining consistency with the regular task execution flow.
    """

    def __init__(self, planning_dir: Path):
        """
        Initialize converter.

        Args:
            planning_dir: Path to the planning directory (.auto-claude/planning)
        """
        self.planning_dir = planning_dir

    def convert_story_to_spec(self, story_path: Path) -> dict:
        """
        Convert a story markdown file to spec format.

        Args:
            story_path: Path to the story markdown file

        Returns:
            Dict in spec format compatible with run.py
        """
        content = story_path.read_text(encoding='utf-8')
        frontmatter, body = self._parse_frontmatter(content)

        # Extract key sections from story body
        acceptance_criteria = self._extract_acceptance_criteria(body)
        tasks = self._extract_tasks(body)
        context_links = self._extract_context_links(body)
        dev_notes = self._extract_dev_notes(body)

        # Build spec structure
        spec = {
            'id': frontmatter.get('id', ''),
            'name': frontmatter.get('title', story_path.stem),
            'description': self._extract_user_story(body),
            'acceptance_criteria': acceptance_criteria,
            'tasks': tasks,
            'context': self._load_context(context_links),
            'test_scope': frontmatter.get('testScope', frontmatter.get('test_scope', 'unit')),
            'epic': frontmatter.get('epic', ''),
            'dev_notes': dev_notes,
            'story_path': str(story_path),
        }

        return spec

    def _parse_frontmatter(self, content: str) -> tuple[dict, str]:
        """Parse YAML frontmatter from markdown content."""
        frontmatter_regex = r'^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$'
        match = re.match(frontmatter_regex, content)

        if not match:
            return {}, content

        yaml_content = match.group(1)
        body = match.group(2)

        # Simple YAML parsing
        metadata: dict[str, Any] = {}
        for line in yaml_content.split('\n'):
            colon_idx = line.find(':')
            if colon_idx > 0:
                key = line[:colon_idx].strip()
                value = line[colon_idx + 1:].strip().strip('"\'')

                # Handle common types
                if value.lower() in ('true', 'false'):
                    value = value.lower() == 'true'
                elif value.isdigit():
                    value = int(value)

                metadata[key] = value

        return metadata, body

    def _extract_user_story(self, body: str) -> str:
        """Extract the user story statement."""
        # Look for "As a **Role**, I want **feature**, so that **benefit**"
        pattern = r'As a \*\*[^*]+\*\*,[\s\S]*?so that \*\*[^*]+\*\*'
        match = re.search(pattern, body)
        if match:
            return match.group(0)

        # Fallback: extract from ## Story section
        story_match = re.search(r'## Story\s*\n\n([\s\S]*?)(?=\n##|\Z)', body)
        if story_match:
            return story_match.group(1).strip()

        return ""

    def _extract_acceptance_criteria(self, body: str) -> list[dict]:
        """Extract acceptance criteria from markdown."""
        criteria = []

        # Pattern for AC sections: **AC1: Name**\n- Given...\n- When...\n- Then...
        ac_pattern = r'\*\*AC(\d+):\s*([^*]+)\*\*\s*\n([\s\S]*?)(?=\*\*AC|\n##|\Z)'
        matches = re.finditer(ac_pattern, body)

        for match in matches:
            ac_num = match.group(1)
            ac_name = match.group(2).strip()
            ac_body = match.group(3)

            # Extract Given/When/Then
            given = self._extract_gwt(ac_body, 'Given')
            when = self._extract_gwt(ac_body, 'When')
            then = self._extract_gwt(ac_body, 'Then')
            and_clauses = self._extract_and_clauses(ac_body)

            criteria.append({
                'number': int(ac_num),
                'name': ac_name,
                'given': given,
                'when': when,
                'then': then,
                'and_clauses': and_clauses,
            })

        return criteria

    def _extract_gwt(self, text: str, keyword: str) -> str:
        """Extract Given/When/Then clause from text."""
        pattern = rf'-\s*\*\*{keyword}\*\*\s+([\s\S]*?)(?=-\s*\*\*|\Z)'
        match = re.search(pattern, text)
        return match.group(1).strip() if match else ""

    def _extract_and_clauses(self, text: str) -> list[str]:
        """Extract And clauses from acceptance criteria."""
        pattern = r'-\s*\*\*And\*\*\s+([\s\S]*?)(?=-\s*\*\*|\Z)'
        matches = re.finditer(pattern, text)
        return [m.group(1).strip() for m in matches]

    def _extract_tasks(self, body: str) -> list[dict]:
        """Extract tasks and subtasks from markdown."""
        tasks = []

        # Pattern for tasks: - [ ] **Task N: Name** (AC: #1, #2)
        task_pattern = r'-\s*\[[ x]\]\s*\*\*Task\s*(\d+):\s*([^*]+)\*\*(?:\s*\(AC:\s*([^)]+)\))?'
        task_matches = list(re.finditer(task_pattern, body))

        for i, match in enumerate(task_matches):
            task_num = match.group(1)
            task_name = match.group(2).strip()
            ac_refs = match.group(3)

            # Find subtasks (between this task and the next)
            start = match.end()
            end = task_matches[i + 1].start() if i + 1 < len(task_matches) else len(body)
            task_section = body[start:end]

            subtasks = self._extract_subtasks(task_section, task_num)

            # Parse AC references
            ac_numbers = []
            if ac_refs:
                ac_numbers = [int(n.strip().lstrip('#')) for n in ac_refs.split(',') if n.strip().lstrip('#').isdigit()]

            tasks.append({
                'number': int(task_num),
                'name': task_name,
                'acceptance_criteria': ac_numbers,
                'subtasks': subtasks,
            })

        return tasks

    def _extract_subtasks(self, text: str, task_num: str) -> list[dict]:
        """Extract subtasks for a task."""
        subtasks = []

        # Pattern: - [ ] N.M: Description
        pattern = rf'-\s*\[[ x]\]\s*{task_num}\.(\d+):\s*(.+)'
        matches = re.finditer(pattern, text)

        for match in matches:
            subtask_num = match.group(1)
            description = match.group(2).strip()
            subtasks.append({
                'number': int(subtask_num),
                'description': description,
            })

        return subtasks

    def _extract_context_links(self, body: str) -> list[dict]:
        """Extract context links from Dev Notes section."""
        links = []

        # Look for internal links: [[artifact-type:section]]
        link_pattern = r'\[\[([^:\]]+):?([^\]]*)\]\]'
        matches = re.finditer(link_pattern, body)

        for match in matches:
            artifact_type = match.group(1)
            section = match.group(2) if match.group(2) else None

            # Map to file paths
            file_map = {
                'prd': 'prd.md',
                'architecture': 'architecture.md',
                'product-brief': 'product-brief.md',
                'epics': 'epics.md',
            }

            if artifact_type in file_map:
                links.append({
                    'type': artifact_type,
                    'file': file_map[artifact_type],
                    'section': section,
                })

        # Also look for explicit references in Dev Notes
        ref_pattern = r'\[Source:\s*([^\]]+)\]'
        ref_matches = re.finditer(ref_pattern, body)

        for match in ref_matches:
            ref = match.group(1)
            if '#' in ref:
                file_part, section = ref.split('#', 1)
                links.append({
                    'type': 'reference',
                    'file': file_part,
                    'section': section,
                })

        return links

    def _extract_dev_notes(self, body: str) -> str:
        """Extract Dev Notes section."""
        match = re.search(r'## Dev Notes\s*\n([\s\S]*?)(?=\n## Dev Agent Record|\Z)', body)
        return match.group(1).strip() if match else ""

    def _load_context(self, links: list[dict]) -> dict:
        """Load referenced documents for context."""
        context: dict[str, str] = {}

        for link in links:
            file_path = self.planning_dir / link['file']

            if not file_path.exists():
                continue

            try:
                content = file_path.read_text(encoding='utf-8')

                # Extract specific section if specified
                if link.get('section'):
                    content = self._extract_section(content, link['section'])

                context[link['type']] = content
            except Exception:
                # Skip files we can't read
                continue

        return context

    def _extract_section(self, content: str, section_name: str) -> str:
        """Extract a specific section from markdown content."""
        # Try to find a heading matching the section name
        pattern = rf'(#+\s*{re.escape(section_name)}[\s\S]*?)(?=\n#+\s|\Z)'
        match = re.search(pattern, content, re.IGNORECASE)

        if match:
            return match.group(1).strip()

        return content  # Return full content if section not found


def build_agent_context(story_spec: dict, planning_dir: Path) -> str:
    """
    Build comprehensive context for the agent.

    Args:
        story_spec: Spec dict from StoryToSpecConverter
        planning_dir: Path to planning directory

    Returns:
        Formatted context string for agent prompt
    """
    context_parts = []

    # Story details
    context_parts.append(f"# Story: {story_spec['name']}")
    context_parts.append(f"\n{story_spec['description']}")

    # Acceptance criteria
    context_parts.append("\n## Acceptance Criteria")
    for ac in story_spec['acceptance_criteria']:
        context_parts.append(f"\n### AC{ac['number']}: {ac['name']}")
        if ac['given']:
            context_parts.append(f"- **Given:** {ac['given']}")
        if ac['when']:
            context_parts.append(f"- **When:** {ac['when']}")
        if ac['then']:
            context_parts.append(f"- **Then:** {ac['then']}")
        for and_clause in ac.get('and_clauses', []):
            context_parts.append(f"- **And:** {and_clause}")

    # Tasks
    if story_spec['tasks']:
        context_parts.append("\n## Tasks")
        for task in story_spec['tasks']:
            context_parts.append(f"\n### Task {task['number']}: {task['name']}")
            for subtask in task.get('subtasks', []):
                context_parts.append(f"- {task['number']}.{subtask['number']}: {subtask['description']}")

    # Dev notes
    if story_spec['dev_notes']:
        context_parts.append("\n## Dev Notes")
        context_parts.append(story_spec['dev_notes'])

    # Context from linked documents
    if story_spec.get('context'):
        if 'prd' in story_spec['context']:
            context_parts.append("\n## Relevant PRD Sections")
            context_parts.append(story_spec['context']['prd'][:2000])  # Limit length

        if 'architecture' in story_spec['context']:
            context_parts.append("\n## Relevant Architecture Decisions")
            context_parts.append(story_spec['context']['architecture'][:2000])

    return '\n'.join(context_parts)
