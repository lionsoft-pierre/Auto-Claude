import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable';
import { cn } from '../../../lib/utils';
import { useSprintStore, reorderSprintQueue } from '../../../stores/sprint-store';
import { SprintQueueItem } from './SprintQueueItem';
import type { Sprint, SprintAssignment, PriorityUpdate } from '../../../../shared/types/planning';

/**
 * SprintQueue props
 */
interface SprintQueueProps {
  projectId: string;
  sprint: Sprint;
  taskTitles: Map<string, string>;
  storyTitles?: Map<string, string>;
  onTaskClick?: (taskId: string) => void;
  onStoryClick?: (storyId: string) => void;
  className?: string;
}

/**
 * SprintQueue - Drag-and-drop prioritization of tasks in a sprint
 * Story 4.2: Sprint Queue Prioritization
 */
export function SprintQueue({
  projectId,
  sprint,
  taskTitles,
  storyTitles,
  onTaskClick,
  onStoryClick,
  className
}: SprintQueueProps) {
  const { t } = useTranslation(['planning']);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState<SprintAssignment[] | null>(null);

  const getSprintAssignments = useSprintStore((state) => state.getSprintAssignments);
  const assignments = localItems ?? getSprintAssignments(sprint.id);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const activeItem = useMemo(() => {
    if (!activeId) return null;
    return assignments.find(a => a.taskId === activeId);
  }, [activeId, assignments]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    // Start with current assignments
    setLocalItems(assignments);
  }, [assignments]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && localItems) {
      const oldIndex = localItems.findIndex(a => a.taskId === active.id);
      const newIndex = localItems.findIndex(a => a.taskId === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // Reorder locally
        const newItems = arrayMove(localItems, oldIndex, newIndex);

        // Calculate new priorities
        const priorities: PriorityUpdate[] = newItems.map((item, index) => ({
          taskId: item.taskId,
          priority: index + 1
        }));

        // Update optimistically
        setLocalItems(newItems.map((item, index) => ({
          ...item,
          priority: index + 1
        })));

        // Persist to backend
        await reorderSprintQueue(projectId, sprint.id, priorities);
      }
    }

    setActiveId(null);
    setLocalItems(null);
  }, [localItems, projectId, sprint.id]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setLocalItems(null);
  }, []);

  if (assignments.length === 0) {
    return (
      <div className={cn('py-8 text-center text-muted-foreground', className)}>
        {t('planning:sprints.noTasksInSprint')}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={assignments.map(a => a.taskId)}
        strategy={verticalListSortingStrategy}
      >
        <div className={cn('space-y-2', className)}>
          {assignments.map(assignment => (
            <SprintQueueItem
              key={assignment.taskId}
              assignment={assignment}
              taskTitle={taskTitles.get(assignment.taskId) || assignment.taskId}
              storyTitle={storyTitles?.get(assignment.storyId)}
              onTaskClick={onTaskClick}
              onStoryClick={onStoryClick}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeItem && (
          <div className="opacity-80">
            <SprintQueueItem
              assignment={activeItem}
              taskTitle={taskTitles.get(activeItem.taskId) || activeItem.taskId}
              storyTitle={storyTitles?.get(activeItem.storyId)}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
