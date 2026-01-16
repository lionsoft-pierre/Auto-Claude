"""
Status Synchronizer for Sprint Execution (Story 5.2)
Keeps story, task, and queue status aligned across all stores.
"""

from pathlib import Path
from datetime import datetime
from typing import Any
import json
import re


class StatusSynchronizer:
    """
    Synchronizes completion status across all data stores.

    When a story completes or fails, this class ensures:
    - Sprint queue assignment is updated
    - Kanban task status is updated
    - Story file frontmatter is updated
    """

    def __init__(self, project_dir: Path):
        """
        Initialize synchronizer.

        Args:
            project_dir: Root directory of the project
        """
        self.project_dir = project_dir
        self.planning_dir = project_dir / '.auto-claude' / 'planning'
        self.queue_path = self.planning_dir / 'sprint-queue.json'
        self.tasks_path = project_dir / '.auto-claude' / 'tasks.json'

    def sync_story_completion(
        self,
        story_id: str,
        status: str,
        notes: str | None = None,
        duration_seconds: float | None = None,
    ) -> dict[str, bool]:
        """
        Sync completion status across all stores.

        Args:
            story_id: The story ID to update
            status: New status ('completed', 'failed', 'skipped')
            notes: Optional notes about the completion/failure
            duration_seconds: How long execution took

        Returns:
            Dict with success status for each update:
            {'queue': bool, 'task': bool, 'story': bool}
        """
        results = {
            'queue': False,
            'task': False,
            'story': False,
        }

        # 1. Update sprint queue
        try:
            self._update_queue_status(story_id, status, notes)
            results['queue'] = True
        except Exception as e:
            print(f"Failed to update queue: {e}")

        # 2. Update Kanban task
        try:
            self._update_task_status(story_id, status)
            results['task'] = True
        except Exception as e:
            print(f"Failed to update task: {e}")

        # 3. Update story file frontmatter
        try:
            self._update_story_frontmatter(story_id, status)
            results['story'] = True
        except Exception as e:
            print(f"Failed to update story: {e}")

        return results

    def _update_queue_status(
        self,
        story_id: str,
        status: str,
        notes: str | None = None,
    ) -> None:
        """Update assignment status in sprint queue."""
        if not self.queue_path.exists():
            return

        queue = json.loads(self.queue_path.read_text(encoding='utf-8'))
        now = datetime.utcnow().isoformat() + 'Z'

        for assignment in queue.get('assignments', []):
            if assignment.get('storyId') == story_id:
                assignment['status'] = status
                assignment['updatedAt'] = now

                if status == 'completed':
                    assignment['completedAt'] = now
                elif status == 'failed':
                    assignment['failedAt'] = now
                    if notes:
                        # Truncate notes for queue (summary only)
                        assignment['failureReason'] = notes[:200]
                elif status == 'skipped':
                    assignment['skippedAt'] = now
                    if notes:
                        assignment['skipReason'] = notes[:200]

                break

        self.queue_path.write_text(json.dumps(queue, indent=2), encoding='utf-8')

    def _update_task_status(self, story_id: str, status: str) -> None:
        """Update linked Kanban task status."""
        if not self.tasks_path.exists():
            return

        tasks = json.loads(self.tasks_path.read_text(encoding='utf-8'))
        now = datetime.utcnow().isoformat() + 'Z'

        # Map story status to task status
        task_status_map = {
            'completed': 'done',
            'failed': 'review',  # Failed tasks go to review for manual attention
            'skipped': 'backlog',  # Skipped tasks go back to backlog
            'in_progress': 'inProgress',
        }

        # Map to Kanban columns
        column_map = {
            'done': 'Done',
            'review': 'Review',
            'backlog': 'Backlog',
            'inProgress': 'In Progress',
        }

        task_status = task_status_map.get(status, 'review')
        column = column_map.get(task_status, 'Review')

        for task in tasks:
            if task.get('storyId') == story_id:
                task['status'] = task_status
                task['column'] = column
                task['updatedAt'] = now

                if status == 'completed':
                    task['completedAt'] = now

                break

        self.tasks_path.write_text(json.dumps(tasks, indent=2), encoding='utf-8')

    def _update_story_frontmatter(self, story_id: str, status: str) -> None:
        """Update story file frontmatter with new status."""
        stories_dir = self.planning_dir / 'stories'
        if not stories_dir.exists():
            return

        # Find the story file by ID
        for story_file in stories_dir.glob('*.md'):
            if story_file.name.endswith('.rejected.md'):
                continue

            content = story_file.read_text(encoding='utf-8')

            # Check if this is the right story
            if f'id: {story_id}' not in content and f"id: '{story_id}'" not in content:
                continue

            # Update status
            now = datetime.utcnow().isoformat() + 'Z'

            # Update status field
            content = re.sub(
                r'^(status:\s*)(\S+)',
                f'\\1{status}',
                content,
                count=1,
                flags=re.MULTILINE,
            )

            # Add/update updatedAt
            if 'updatedAt:' in content:
                content = re.sub(
                    r'^(updatedAt:\s*)(\S+)',
                    f'\\1{now}',
                    content,
                    count=1,
                    flags=re.MULTILINE,
                )
            else:
                content = re.sub(
                    r'^(createdAt:\s*\S+)',
                    f'\\1\nupdatedAt: {now}',
                    content,
                    count=1,
                    flags=re.MULTILINE,
                )

            # Add completedAt if completed
            if status == 'completed':
                if 'completedAt:' not in content:
                    content = re.sub(
                        r'^(updatedAt:\s*\S+)',
                        f'\\1\ncompletedAt: {now}',
                        content,
                        count=1,
                        flags=re.MULTILINE,
                    )

            story_file.write_text(content, encoding='utf-8')
            break

    def get_story_path(self, story_id: str) -> Path | None:
        """
        Find the file path for a story by ID.

        Args:
            story_id: The story ID to find

        Returns:
            Path to the story file, or None if not found
        """
        stories_dir = self.planning_dir / 'stories'
        if not stories_dir.exists():
            return None

        for story_file in stories_dir.glob('*.md'):
            if story_file.name.endswith('.rejected.md'):
                continue

            content = story_file.read_text(encoding='utf-8')
            if f'id: {story_id}' in content or f"id: '{story_id}'" in content:
                return story_file

        return None

    def get_queue_assignment(self, story_id: str) -> dict | None:
        """
        Get sprint queue assignment for a story.

        Args:
            story_id: The story ID to find

        Returns:
            Assignment dict or None if not found
        """
        if not self.queue_path.exists():
            return None

        queue = json.loads(self.queue_path.read_text(encoding='utf-8'))

        for assignment in queue.get('assignments', []):
            if assignment.get('storyId') == story_id:
                return assignment

        return None

    def get_next_pending_story(self, sprint_id: str) -> dict | None:
        """
        Get the next pending story in a sprint's queue.

        Args:
            sprint_id: The sprint to get next story from

        Returns:
            Assignment dict for next pending story, or None
        """
        if not self.queue_path.exists():
            return None

        queue = json.loads(self.queue_path.read_text(encoding='utf-8'))

        # Filter to pending stories in this sprint, sorted by priority
        pending = [
            a for a in queue.get('assignments', [])
            if a.get('sprintId') == sprint_id and a.get('status') == 'pending'
        ]

        if not pending:
            return None

        # Sort by priority and return first
        pending.sort(key=lambda x: x.get('priority', 9999))
        return pending[0]
