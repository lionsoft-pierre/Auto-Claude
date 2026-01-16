/**
 * SprintBadge Component (Story 6.3)
 * Small badge showing sprint color and name on task cards
 */
import { useSprintStore } from '../../stores/sprint-store';
import { cn } from '../../lib/utils';

interface SprintBadgeProps {
  sprintId: string;
  size?: 'sm' | 'md';
  showName?: boolean;
  className?: string;
}

export function SprintBadge({
  sprintId,
  size = 'sm',
  showName = false,
  className
}: SprintBadgeProps) {
  const sprint = useSprintStore(state =>
    state.sprints.find(s => s.id === sprintId)
  );

  if (!sprint) return null;

  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3'
  };

  return (
    <div
      className={cn(
        'flex items-center gap-1.5',
        className
      )}
      title={sprint.name}
    >
      <div
        className={cn('rounded-full flex-shrink-0', sizeClasses[size])}
        style={{ backgroundColor: sprint.color }}
      />
      {showName && (
        <span className="text-xs text-muted-foreground truncate max-w-[100px]">
          {sprint.name}
        </span>
      )}
    </div>
  );
}
