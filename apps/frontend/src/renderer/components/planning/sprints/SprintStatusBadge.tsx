import { useTranslation } from 'react-i18next';
import { Circle, Play, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { SprintStatus } from '../../../../shared/types/planning';

/**
 * SprintStatusBadge props
 */
interface SprintStatusBadgeProps {
  status: SprintStatus;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

/**
 * Status configuration
 */
const STATUS_CONFIG: Record<SprintStatus, {
  icon: typeof Circle;
  colorClass: string;
  bgClass: string;
}> = {
  not_started: {
    icon: Circle,
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted'
  },
  in_progress: {
    icon: Play,
    colorClass: 'text-blue-500',
    bgClass: 'bg-blue-500/10'
  },
  completed: {
    icon: CheckCircle2,
    colorClass: 'text-green-500',
    bgClass: 'bg-green-500/10'
  }
};

/**
 * SprintStatusBadge - Shows sprint execution status
 * Story 4.3: Sprint Status Tracking
 */
export function SprintStatusBadge({
  status,
  size = 'sm',
  showLabel = true,
  className
}: SprintStatusBadgeProps) {
  const { t } = useTranslation(['planning']);

  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4'
  };

  const statusLabels: Record<SprintStatus, string> = {
    not_started: t('planning:sprints.status.notStarted'),
    in_progress: t('planning:sprints.status.inProgress'),
    completed: t('planning:sprints.status.completed')
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
        sizeClasses[size],
        config.colorClass,
        config.bgClass,
        className
      )}
    >
      <Icon className={iconSizes[size]} />
      {showLabel && <span>{statusLabels[status]}</span>}
    </span>
  );
}
