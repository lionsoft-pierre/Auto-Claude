"""
Dependency Graph for Sprint Execution (Story 5.4)
Handles story dependencies for skip logic when dependencies fail.
"""

from pathlib import Path
from typing import Set
import re


class DependencyGraph:
    """
    Manages story dependencies for sprint execution.

    When a story fails, its dependent stories should be skipped
    to avoid wasting execution time on doomed work.
    """

    def __init__(self, assignments: list[dict], planning_dir: Path):
        """
        Initialize dependency graph from sprint assignments.

        Args:
            assignments: List of sprint assignments with story info
            planning_dir: Path to planning directory
        """
        self.planning_dir = planning_dir
        self.dependencies: dict[str, list[str]] = {}  # story_id -> [dependency_ids]
        self._build_graph(assignments)

    def _build_graph(self, assignments: list[dict]) -> None:
        """
        Build dependency graph from story context links.

        Dependencies are parsed from story files looking for:
        - depends_on frontmatter field
        - [[story:story-id]] links in context section
        - Explicit dependency markers
        """
        for assignment in assignments:
            story_id = assignment.get('storyId', '')
            story_path = assignment.get('storyPath')

            if not story_id:
                continue

            deps = []
            if story_path:
                deps = self._parse_dependencies_from_file(Path(story_path))

            self.dependencies[story_id] = deps

    def _parse_dependencies_from_file(self, story_path: Path) -> list[str]:
        """
        Parse dependencies from a story file.

        Looks for:
        - depends_on: [story-id-1, story-id-2] in frontmatter
        - Depends on: story-id in body
        - [[story:story-id]] internal links
        """
        deps: list[str] = []

        if not story_path.exists():
            return deps

        try:
            content = story_path.read_text(encoding='utf-8')

            # Parse frontmatter for depends_on
            frontmatter_match = re.match(r'^---\n([\s\S]*?)\n---', content)
            if frontmatter_match:
                frontmatter = frontmatter_match.group(1)

                # Look for depends_on: [id1, id2] or depends_on: id1
                depends_match = re.search(r'depends_on:\s*\[([^\]]+)\]', frontmatter)
                if depends_match:
                    deps_str = depends_match.group(1)
                    deps.extend(d.strip().strip('"\'') for d in deps_str.split(','))
                else:
                    # Single dependency
                    depends_match = re.search(r'depends_on:\s*([^\n]+)', frontmatter)
                    if depends_match:
                        deps.append(depends_match.group(1).strip().strip('"\''))

            # Look for [[story:id]] links in Dev Notes section
            story_links = re.findall(r'\[\[story:([^\]]+)\]\]', content)
            deps.extend(story_links)

            # Look for explicit "Depends on:" markers
            depends_markers = re.findall(r'[Dd]epends on[:\s]+(\S+)', content)
            deps.extend(d for d in depends_markers if d.startswith('story-'))

        except Exception:
            # If we can't read the file, assume no dependencies
            pass

        # Remove duplicates while preserving order
        seen = set()
        unique_deps = []
        for d in deps:
            if d not in seen:
                seen.add(d)
                unique_deps.append(d)

        return unique_deps

    def has_failed_dependency(self, story_id: str, failed_stories: Set[str]) -> bool:
        """
        Check if any of a story's dependencies have failed.

        Args:
            story_id: The story to check
            failed_stories: Set of story IDs that have failed

        Returns:
            True if any dependency has failed
        """
        deps = self.dependencies.get(story_id, [])
        return any(dep in failed_stories for dep in deps)

    def get_blocking_dependencies(self, story_id: str, failed_stories: Set[str]) -> list[str]:
        """
        Get list of failed dependencies blocking a story.

        Args:
            story_id: The story to check
            failed_stories: Set of story IDs that have failed

        Returns:
            List of failed dependency story IDs
        """
        deps = self.dependencies.get(story_id, [])
        return [dep for dep in deps if dep in failed_stories]

    def get_dependencies(self, story_id: str) -> list[str]:
        """
        Get all dependencies for a story.

        Args:
            story_id: The story to get dependencies for

        Returns:
            List of dependency story IDs
        """
        return self.dependencies.get(story_id, [])

    def get_dependents(self, story_id: str) -> list[str]:
        """
        Get all stories that depend on a given story.

        Args:
            story_id: The story to find dependents for

        Returns:
            List of story IDs that depend on this story
        """
        dependents = []
        for sid, deps in self.dependencies.items():
            if story_id in deps:
                dependents.append(sid)
        return dependents
