/**
 * DashboardStats Component (Story 6.1)
 * Displays sprint statistics as cards with icons and colors
 */
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Clock, SkipForward, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DashboardStatsProps {
  completed: number;
  failed: number;
  pending: number;
  skipped: number;
  inProgress?: number;
  onFilterClick?: (status: string | null) => void;
  activeFilter?: string | null;
}

interface StatConfig {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}

const STAT_CONFIG: Record<string, StatConfig> = {
  completed: {
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950',
    borderColor: 'border-green-200 dark:border-green-800'
  },
  failed: {
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950',
    borderColor: 'border-red-200 dark:border-red-800'
  },
  pending: {
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950',
    borderColor: 'border-amber-200 dark:border-amber-800'
  },
  skipped: {
    icon: SkipForward,
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-50 dark:bg-slate-900',
    borderColor: 'border-slate-200 dark:border-slate-700'
  },
  inProgress: {
    icon: Loader2,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    borderColor: 'border-blue-200 dark:border-blue-800'
  }
};

export function DashboardStats({
  completed,
  failed,
  pending,
  skipped,
  inProgress = 0,
  onFilterClick,
  activeFilter
}: DashboardStatsProps) {
  const { t } = useTranslation(['planning']);

  const stats = [
    { key: 'completed', value: completed },
    { key: 'failed', value: failed },
    { key: 'pending', value: pending },
    { key: 'skipped', value: skipped },
    ...(inProgress > 0 ? [{ key: 'inProgress', value: inProgress }] : [])
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
      {stats.map(({ key, value }) => {
        const config = STAT_CONFIG[key];
        if (!config) return null;
        const Icon = config.icon;
        const isActive = activeFilter === key;
        const isClickable = !!onFilterClick;

        return (
          <button
            key={key}
            onClick={() => onFilterClick?.(isActive ? null : key)}
            disabled={!isClickable}
            className={cn(
              'p-4 rounded-lg border text-center transition-all',
              config.bgColor,
              config.borderColor,
              isClickable && 'hover:scale-105 hover:shadow-md cursor-pointer',
              isActive && 'ring-2 ring-primary ring-offset-2',
              !isClickable && 'cursor-default'
            )}
          >
            <Icon
              className={cn(
                'h-6 w-6 mx-auto mb-2',
                config.color,
                key === 'inProgress' && 'animate-spin'
              )}
            />
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-muted-foreground capitalize">
              {t(`planning:dashboard.${key}`)}
            </div>
          </button>
        );
      })}
    </div>
  );
}
