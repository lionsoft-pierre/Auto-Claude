/**
 * StoryStatusList Component (Story 6.1)
 * Displays sprint stories grouped by status with collapsible sections
 */
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  SkipForward,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import type { ExecutionAssignment, ExecutionAssignmentStatus } from '../../../shared/types';

interface StoryStatusListProps {
  assignments: ExecutionAssignment[];
  onStoryClick?: (storyId: string) => void;
  onViewFailure?: (storyId: string) => void;
  statusFilter?: string | null;
}

interface StatusGroup {
  status: ExecutionAssignmentStatus;
  label: string;
  icon: React.ElementType;
  color: string;
  assignments: ExecutionAssignment[];
}

const STATUS_ORDER: ExecutionAssignmentStatus[] = [
  'in_progress',
  'completed',
  'failed',
  'skipped',
  'pending'
];

const STATUS_CONFIG: Record<ExecutionAssignmentStatus, { icon: React.ElementType; color: string }> = {
  completed: { icon: CheckCircle, color: 'text-green-500' },
  failed: { icon: XCircle, color: 'text-red-500' },
  pending: { icon: Clock, color: 'text-amber-500' },
  skipped: { icon: SkipForward, color: 'text-slate-500' },
  in_progress: { icon: Loader2, color: 'text-blue-500' }
};

function formatDuration(seconds: number | undefined): string {
  if (!seconds) return '';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

export function StoryStatusList({
  assignments,
  onStoryClick,
  onViewFailure,
  statusFilter
}: StoryStatusListProps) {
  const { t } = useTranslation(['planning']);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['in_progress', 'failed', 'completed'])
  );

  // Group assignments by status
  const groups = useMemo<StatusGroup[]>(() => {
    const grouped = new Map<ExecutionAssignmentStatus, ExecutionAssignment[]>();

    // Initialize all groups
    STATUS_ORDER.forEach(status => grouped.set(status, []));

    // Group assignments
    assignments.forEach(assignment => {
      const list = grouped.get(assignment.status) || [];
      list.push(assignment);
      grouped.set(assignment.status, list);
    });

    // Build groups array
    return STATUS_ORDER
      .map(status => {
        const config = STATUS_CONFIG[status];
        const statusAssignments = grouped.get(status) || [];

        // Sort by priority
        statusAssignments.sort((a, b) => a.priority - b.priority);

        return {
          status,
          label: t(`planning:sprints.assignmentStatus.${status === 'in_progress' ? 'inProgress' : status}`),
          icon: config.icon,
          color: config.color,
          assignments: statusAssignments
        };
      })
      .filter(group => {
        // Filter by status if filter is active
        if (statusFilter) {
          const filterKey = statusFilter === 'inProgress' ? 'in_progress' : statusFilter;
          return group.status === filterKey;
        }
        return group.assignments.length > 0;
      });
  }, [assignments, statusFilter, t]);

  const toggleGroup = (status: string) => {
    const next = new Set(expandedGroups);
    if (next.has(status)) {
      next.delete(status);
    } else {
      next.add(status);
    }
    setExpandedGroups(next);
  };

  if (groups.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('planning:sprints.noTasksInSprint')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map(group => {
        const Icon = group.icon;
        const isExpanded = expandedGroups.has(group.status);

        return (
          <div key={group.status} className="border rounded-lg overflow-hidden">
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group.status)}
              className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <Icon className={cn('h-4 w-4', group.color, group.status === 'in_progress' && 'animate-spin')} />
                <span className="font-medium">{group.label}</span>
              </div>
              <Badge variant="secondary">{group.assignments.length}</Badge>
            </button>

            {/* Group Content */}
            {isExpanded && (
              <ul className="border-t divide-y">
                {group.assignments.map(assignment => (
                  <li
                    key={assignment.taskId}
                    className="flex items-center justify-between p-3 hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xs text-muted-foreground w-6">
                        #{assignment.priority}
                      </span>
                      <button
                        onClick={() => onStoryClick?.(assignment.storyId)}
                        className="flex-1 text-left truncate hover:text-primary"
                      >
                        {assignment.title || assignment.storyId}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Duration */}
                      {assignment.duration && (
                        <span className="text-xs text-muted-foreground">
                          {formatDuration(assignment.duration)}
                        </span>
                      )}

                      {/* Skip reason */}
                      {assignment.status === 'skipped' && assignment.skipReason && (
                        <Badge variant="outline" className="text-xs">
                          {assignment.skipReason}
                        </Badge>
                      )}

                      {/* View failure button */}
                      {assignment.status === 'failed' && onViewFailure && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewFailure(assignment.storyId);
                          }}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {t('planning:dashboard.viewDetails')}
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
