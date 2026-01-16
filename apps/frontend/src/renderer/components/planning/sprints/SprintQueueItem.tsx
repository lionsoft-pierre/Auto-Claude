import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ExternalLink } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { SprintAssignment, SprintAssignmentStatus } from '../../../../shared/types/planning';

/**
 * SprintQueueItem props
 */
interface SprintQueueItemProps {
  assignment: SprintAssignment;
  taskTitle: string;
  storyTitle?: string;
  onTaskClick?: (taskId: string) => void;
  onStoryClick?: (storyId: string) => void;
}

/**
 * Status colors
 */
const STATUS_COLORS: Record<SprintAssignmentStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-500/10 text-blue-500',
  completed: 'bg-green-500/10 text-green-500',
  failed: 'bg-destructive/10 text-destructive'
};

/**
 * SprintQueueItem - Draggable item in sprint queue
 * Story 4.2: Sprint Queue Prioritization
 */
export const SprintQueueItem = memo(function SprintQueueItem({
  assignment,
  taskTitle,
  storyTitle,
  onTaskClick,
  onStoryClick
}: SprintQueueItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: assignment.taskId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 p-3 bg-card border border-border rounded-lg',
        'transition-all duration-200',
        isDragging && 'opacity-50 shadow-lg scale-[1.02]'
      )}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Priority number */}
      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
        {assignment.priority}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{taskTitle}</span>
          {onTaskClick && (
            <button
              onClick={() => onTaskClick(assignment.taskId)}
              className="p-0.5 rounded hover:bg-accent transition-colors"
              title="View task"
            >
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
        {storyTitle && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="truncate">{storyTitle}</span>
            {onStoryClick && assignment.storyId && (
              <button
                onClick={() => onStoryClick(assignment.storyId)}
                className="p-0.5 rounded hover:bg-accent transition-colors"
                title="View story"
              >
                <ExternalLink className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Status badge */}
      <span className={cn(
        'px-2 py-0.5 text-xs rounded-full capitalize',
        STATUS_COLORS[assignment.status]
      )}>
        {assignment.status.replace('_', ' ')}
      </span>
    </div>
  );
});
