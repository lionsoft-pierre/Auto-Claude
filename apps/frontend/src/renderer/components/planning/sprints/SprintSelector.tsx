import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Plus, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useSprintStore, createSprint, assignTaskToSprint, unassignTaskFromSprint } from '../../../stores/sprint-store';
import type { Sprint } from '../../../../shared/types/planning';

/**
 * SprintSelector props
 */
interface SprintSelectorProps {
  projectId: string;
  taskId: string;
  storyId?: string;
  currentSprintId?: string;
  onAssigned?: (sprint: Sprint) => void;
  onUnassigned?: () => void;
  className?: string;
}

/**
 * SprintSelector - Dropdown to assign/unassign tasks to sprints
 * Story 4.1: Sprint Tagging and Assignment
 */
export function SprintSelector({
  projectId,
  taskId,
  storyId,
  currentSprintId,
  onAssigned,
  onUnassigned,
  className
}: SprintSelectorProps) {
  const { t } = useTranslation(['planning', 'common']);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newSprintName, setNewSprintName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sprints = useSprintStore((state) => state.sprints);
  const currentSprint = sprints.find(s => s.id === currentSprintId);

  const handleSelectSprint = async (sprintId: string) => {
    if (sprintId === currentSprintId) {
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const assignment = await assignTaskToSprint(projectId, taskId, sprintId, storyId);
      if (assignment) {
        const sprint = sprints.find(s => s.id === sprintId);
        if (sprint && onAssigned) {
          onAssigned(sprint);
        }
      }
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const handleUnassign = async () => {
    setIsLoading(true);
    try {
      const success = await unassignTaskFromSprint(projectId, taskId);
      if (success && onUnassigned) {
        onUnassigned();
      }
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const handleCreateSprint = async () => {
    if (!newSprintName.trim()) return;

    setIsLoading(true);
    try {
      const sprint = await createSprint(projectId, newSprintName.trim());
      if (sprint) {
        // Auto-assign to the new sprint
        await handleSelectSprint(sprint.id);
      }
    } finally {
      setIsLoading(false);
      setIsCreating(false);
      setNewSprintName('');
    }
  };

  return (
    <div className={cn('relative', className)}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={cn(
          'flex items-center gap-1 px-2 py-1 rounded text-sm',
          'border border-border hover:bg-accent transition-colors',
          currentSprint && 'pr-1'
        )}
        style={currentSprint ? {
          backgroundColor: `${currentSprint.color}10`,
          borderColor: currentSprint.color
        } : undefined}
      >
        {currentSprint ? (
          <>
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: currentSprint.color }}
            />
            <span className="truncate max-w-[100px]" style={{ color: currentSprint.color }}>
              {currentSprint.name}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">
            {t('planning:sprints.assignToSprint')}
          </span>
        )}
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute z-50 top-full left-0 mt-1 w-56 bg-popover border border-border rounded-md shadow-lg">
            <div className="py-1 max-h-[300px] overflow-y-auto">
              {/* Unassign option */}
              {currentSprintId && (
                <button
                  onClick={handleUnassign}
                  disabled={isLoading}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent transition-colors text-destructive"
                >
                  <X className="h-4 w-4" />
                  {t('planning:sprints.unassign')}
                </button>
              )}

              {currentSprintId && sprints.length > 0 && (
                <div className="border-t border-border my-1" />
              )}

              {/* Sprint list */}
              {sprints.map(sprint => (
                <button
                  key={sprint.id}
                  onClick={() => handleSelectSprint(sprint.id)}
                  disabled={isLoading}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent transition-colors',
                    sprint.id === currentSprintId && 'bg-accent'
                  )}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: sprint.color }}
                  />
                  <span className="truncate flex-1">{sprint.name}</span>
                  {sprint.id === currentSprintId && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}

              {sprints.length > 0 && (
                <div className="border-t border-border my-1" />
              )}

              {/* Create new sprint */}
              {isCreating ? (
                <div className="px-3 py-2">
                  <input
                    type="text"
                    value={newSprintName}
                    onChange={(e) => setNewSprintName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateSprint();
                      if (e.key === 'Escape') {
                        setIsCreating(false);
                        setNewSprintName('');
                      }
                    }}
                    placeholder={t('planning:sprints.newSprintPlaceholder')}
                    className="w-full px-2 py-1 text-sm border border-border rounded bg-background"
                    autoFocus
                  />
                  <div className="flex gap-1 mt-1">
                    <button
                      onClick={handleCreateSprint}
                      disabled={!newSprintName.trim() || isLoading}
                      className="flex-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
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
                </div>
              ) : (
                <button
                  onClick={() => setIsCreating(true)}
                  disabled={isLoading}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent transition-colors text-primary"
                >
                  <Plus className="h-4 w-4" />
                  {t('planning:sprints.createNew')}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
