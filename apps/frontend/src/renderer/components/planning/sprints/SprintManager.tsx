import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../lib/utils';
import {
  useSprintStore,
  loadSprints,
  subscribeToSprintChanges
} from '../../../stores/sprint-store';
import { useTaskStore } from '../../../stores/task-store';
import { SprintList } from './SprintList';
import { SprintQueue } from './SprintQueue';
import { SprintStatusBadge } from './SprintStatusBadge';
import type { Sprint } from '../../../../shared/types/planning';

/**
 * SprintManager props
 */
interface SprintManagerProps {
  projectId: string;
  onTaskClick?: (taskId: string) => void;
  onStoryClick?: (storyId: string) => void;
  className?: string;
}

/**
 * SprintManager - Main component for managing sprints and their queues
 * Story 4.1, 4.2, 4.3: Sprint Execution
 */
export function SprintManager({
  projectId,
  onTaskClick,
  onStoryClick,
  className
}: SprintManagerProps) {
  const { t } = useTranslation(['planning']);
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);

  const sprints = useSprintStore((state) => state.sprints);
  const isLoading = useSprintStore((state) => state.isLoading);
  const error = useSprintStore((state) => state.error);
  const tasks = useTaskStore((state) => state.tasks);

  // Build task titles map
  const taskTitles = useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach(task => {
      map.set(task.id, task.title);
      if (task.specId) {
        map.set(task.specId, task.title);
      }
    });
    return map;
  }, [tasks]);

  // Build story titles map from task metadata
  const storyTitles = useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach(task => {
      if (task.metadata?.storyId) {
        map.set(task.metadata.storyId, task.title);
      }
    });
    return map;
  }, [tasks]);

  // Load sprints on mount
  useEffect(() => {
    loadSprints(projectId);
  }, [projectId]);

  // Subscribe to sprint changes
  useEffect(() => {
    const cleanup = subscribeToSprintChanges(projectId);
    return cleanup;
  }, [projectId]);

  // Update selected sprint when sprints change
  useEffect(() => {
    if (selectedSprint) {
      const updated = sprints.find(s => s.id === selectedSprint.id);
      if (updated) {
        setSelectedSprint(updated);
      } else {
        setSelectedSprint(null);
      }
    }
  }, [sprints, selectedSprint?.id]);

  // Auto-select first sprint if none selected
  useEffect(() => {
    if (!selectedSprint && sprints.length > 0) {
      // Prefer in_progress sprint
      const inProgress = sprints.find(s => s.status === 'in_progress');
      setSelectedSprint(inProgress || sprints[0]);
    }
  }, [sprints, selectedSprint]);

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <span className="text-muted-foreground">{t('common:loading')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('text-destructive py-4 text-center', className)}>
        {error}
      </div>
    );
  }

  return (
    <div className={cn('flex gap-4 h-full', className)}>
      {/* Sprint List */}
      <div className="w-64 flex-shrink-0 border-r border-border pr-4">
        <SprintList
          projectId={projectId}
          onSelectSprint={setSelectedSprint}
          selectedSprintId={selectedSprint?.id}
        />
      </div>

      {/* Sprint Queue */}
      <div className="flex-1 min-w-0">
        {selectedSprint ? (
          <div className="space-y-4">
            {/* Sprint header */}
            <div className="flex items-center gap-3">
              <span
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: selectedSprint.color }}
              />
              <h2 className="text-lg font-semibold">{selectedSprint.name}</h2>
              <SprintStatusBadge status={selectedSprint.status} />
            </div>

            {/* Queue */}
            <SprintQueue
              projectId={projectId}
              sprint={selectedSprint}
              taskTitles={taskTitles}
              storyTitles={storyTitles}
              onTaskClick={onTaskClick}
              onStoryClick={onStoryClick}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            {sprints.length === 0
              ? t('planning:sprints.noSprints')
              : t('planning:sprints.selectSprint')
            }
          </div>
        )}
      </div>
    </div>
  );
}
