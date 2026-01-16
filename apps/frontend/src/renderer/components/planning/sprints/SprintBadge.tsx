import { useTranslation } from 'react-i18next';
import { cn } from '../../../lib/utils';
import type { Sprint } from '../../../../shared/types/planning';

/**
 * SprintBadge props
 */
interface SprintBadgeProps {
  sprint: Sprint;
  size?: 'sm' | 'md';
  showStatus?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * SprintBadge - Displays a colored sprint tag
 * Story 4.1: Sprint Tagging and Assignment
 */
export function SprintBadge({
  sprint,
  size = 'sm',
  showStatus = false,
  onClick,
  className
}: SprintBadgeProps) {
  const { t } = useTranslation(['planning']);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm'
  };

  const statusLabels: Record<Sprint['status'], string> = {
    not_started: t('planning:sprints.status.notStarted'),
    in_progress: t('planning:sprints.status.inProgress'),
    completed: t('planning:sprints.status.completed')
  };

  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        sizeClasses[size],
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
      style={{
        backgroundColor: `${sprint.color}20`,
        color: sprint.color,
        borderColor: sprint.color,
        borderWidth: '1px'
      }}
      title={sprint.name}
    >
      <span className="truncate max-w-[120px]">{sprint.name}</span>
      {showStatus && (
        <span className="text-[10px] opacity-75">
          ({statusLabels[sprint.status]})
        </span>
      )}
    </span>
  );
}
