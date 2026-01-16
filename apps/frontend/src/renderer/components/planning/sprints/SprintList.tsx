import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Play, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import {
  useSprintStore,
  createSprint,
  deleteSprint,
  startSprint,
  completeSprint
} from '../../../stores/sprint-store';
import { SprintBadge } from './SprintBadge';
import { SprintStatusBadge } from './SprintStatusBadge';
import type { Sprint, SprintStats } from '../../../../shared/types/planning';

/**
 * SprintList props
 */
interface SprintListProps {
  projectId: string;
  onSelectSprint?: (sprint: Sprint) => void;
  selectedSprintId?: string;
  className?: string;
}

/**
 * SprintList - Displays all sprints with management actions
 * Story 4.1: Sprint Tagging and Assignment
 * Story 4.3: Sprint Status Tracking
 */
export function SprintList({
  projectId,
  onSelectSprint,
  selectedSprintId,
  className
}: SprintListProps) {
  const { t } = useTranslation(['planning', 'common']);
  const [isCreating, setIsCreating] = useState(false);
  const [newSprintName, setNewSprintName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const sprints = useSprintStore((state) => state.sprints);
  const getSprintStats = useSprintStore((state) => state.getSprintStats);

  const handleCreate = async () => {
    if (!newSprintName.trim()) return;

    setIsLoading(true);
    try {
      const sprint = await createSprint(projectId, newSprintName.trim());
      if (sprint && onSelectSprint) {
        onSelectSprint(sprint);
      }
    } finally {
      setIsLoading(false);
      setIsCreating(false);
      setNewSprintName('');
    }
  };

  const handleDelete = async (sprintId: string) => {
    setIsLoading(true);
    try {
      await deleteSprint(projectId, sprintId);
    } finally {
      setIsLoading(false);
      setConfirmDelete(null);
    }
  };

  const handleStart = async (sprintId: string) => {
    setIsLoading(true);
    try {
      const sprint = await startSprint(projectId, sprintId);
      if (sprint && onSelectSprint) {
        onSelectSprint(sprint);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async (sprintId: string) => {
    setIsLoading(true);
    try {
      await completeSprint(projectId, sprintId);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStats = (stats: SprintStats) => {
    if (stats.total === 0) return null;

    return (
      <span className="text-xs text-muted-foreground">
        {stats.completed}/{stats.total} {t('planning:sprints.tasksCompleted')}
      </span>
    );
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{t('planning:sprints.title')}</h3>
        <button
          onClick={() => setIsCreating(true)}
          disabled={isCreating || isLoading}
          className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          title={t('planning:sprints.createNew')}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Create form */}
      {isCreating && (
        <div className="flex gap-1">
          <input
            type="text"
            value={newSprintName}
            onChange={(e) => setNewSprintName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') {
                setIsCreating(false);
                setNewSprintName('');
              }
            }}
            placeholder={t('planning:sprints.newSprintPlaceholder')}
            className="flex-1 px-2 py-1 text-sm border border-border rounded bg-background"
            autoFocus
            disabled={isLoading}
          />
          <button
            onClick={handleCreate}
            disabled={!newSprintName.trim() || isLoading}
            className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
          >
            {t('common:create')}
          </button>
          <button
            onClick={() => {
              setIsCreating(false);
              setNewSprintName('');
            }}
            className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
          >
            {t('common:cancel')}
          </button>
        </div>
      )}

      {/* Sprint list */}
      {sprints.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {t('planning:sprints.noSprints')}
        </p>
      ) : (
        <div className="space-y-1">
          {sprints.map(sprint => {
            const stats = getSprintStats(sprint.id);
            const isSelected = sprint.id === selectedSprintId;
            const isConfirmingDelete = confirmDelete === sprint.id;

            return (
              <div
                key={sprint.id}
                className={cn(
                  'flex items-center gap-2 p-2 rounded border transition-colors',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-accent/50'
                )}
              >
                {/* Sprint info */}
                <button
                  onClick={() => onSelectSprint?.(sprint)}
                  className="flex-1 flex items-center gap-2 text-left min-w-0"
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: sprint.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{sprint.name}</span>
                      <SprintStatusBadge status={sprint.status} size="sm" showLabel={false} />
                    </div>
                    {renderStats(stats)}
                  </div>
                </button>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Start button */}
                  {sprint.status === 'not_started' && (
                    <button
                      onClick={() => handleStart(sprint.id)}
                      disabled={isLoading}
                      className="p-1 rounded hover:bg-accent transition-colors text-blue-500"
                      title={t('planning:sprints.start')}
                    >
                      <Play className="h-4 w-4" />
                    </button>
                  )}

                  {/* Complete button */}
                  {sprint.status === 'in_progress' && (
                    <button
                      onClick={() => handleComplete(sprint.id)}
                      disabled={isLoading}
                      className="p-1 rounded hover:bg-accent transition-colors text-green-500"
                      title={t('planning:sprints.complete')}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  )}

                  {/* Delete button */}
                  {sprint.status !== 'in_progress' && (
                    isConfirmingDelete ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(sprint.id)}
                          disabled={isLoading}
                          className="px-2 py-0.5 text-xs bg-destructive text-destructive-foreground rounded"
                        >
                          {t('common:confirm')}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-2 py-0.5 text-xs bg-secondary text-secondary-foreground rounded"
                        >
                          {t('common:cancel')}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(sprint.id)}
                        disabled={isLoading}
                        className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-destructive"
                        title={t('planning:sprints.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
