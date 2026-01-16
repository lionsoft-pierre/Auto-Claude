/**
 * SprintDashboard Component (Story 6.1)
 * Main dashboard view for sprint execution results
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, RefreshCw, Play, Pause, Square, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { DashboardStats } from './DashboardStats';
import { StoryStatusList } from './StoryStatusList';
import { useSprintStore } from '../../stores/sprint-store';
import { cn } from '../../lib/utils';
import type { ExecutionAssignment, ExecutionAssignmentStatus, SprintExecutionState } from '../../../shared/types';

interface SprintDashboardProps {
  projectId: string;
  sprintId: string;
  onBack?: () => void;
  onStoryClick?: (storyId: string) => void;
  onViewFailure?: (storyId: string) => void;
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function formatDuration(startedAt: string | undefined, completedAt: string | undefined): string {
  if (!startedAt) return '';
  const start = new Date(startedAt);
  const end = completedAt ? new Date(completedAt) : new Date();
  const diffMs = end.getTime() - start.getTime();
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function SprintDashboard({
  projectId,
  sprintId,
  onBack,
  onStoryClick,
  onViewFailure
}: SprintDashboardProps) {
  const { t } = useTranslation(['planning', 'common']);
  const { sprints, assignments, setLoading, setSprintQueue } = useSprintStore();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [executionState, setExecutionState] = useState<SprintExecutionState | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sprint = useMemo(
    () => sprints.find(s => s.id === sprintId),
    [sprints, sprintId]
  );

  const sprintAssignments = useMemo(
    () => assignments
      .filter(a => a.sprintId === sprintId)
      .sort((a, b) => a.priority - b.priority) as ExecutionAssignment[],
    [assignments, sprintId]
  );

  // Calculate stats
  const stats = useMemo(() => {
    const result = {
      completed: 0,
      failed: 0,
      pending: 0,
      skipped: 0,
      inProgress: 0,
      total: sprintAssignments.length
    };

    sprintAssignments.forEach(a => {
      const status = a.status as ExecutionAssignmentStatus;
      if (status === 'completed') result.completed++;
      else if (status === 'failed') result.failed++;
      else if (status === 'pending') result.pending++;
      else if (status === 'skipped') result.skipped++;
      else if (status === 'in_progress') result.inProgress++;
    });

    return result;
  }, [sprintAssignments]);

  const attempted = stats.completed + stats.failed + stats.skipped;
  const progressPercent = stats.total > 0 ? (attempted / stats.total) * 100 : 0;
  const successRate = attempted > 0 ? (stats.completed / attempted) * 100 : 0;

  // Load execution status
  const loadExecutionStatus = useCallback(async () => {
    try {
      const status = await window.electronAPI.getSprintExecutionStatus(projectId);
      if (status.success && status.data && status.data.sprintId === sprintId) {
        setExecutionState(status.data);
      } else {
        setExecutionState(null);
      }
    } catch (error) {
      console.error('Failed to load execution status:', error);
    }
  }, [projectId, sprintId]);

  // Refresh sprint data
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await window.electronAPI.listSprints(projectId);
      if (result.success && result.data) {
        setSprintQueue(result.data);
      }
      await loadExecutionStatus();
    } catch (error) {
      console.error('Failed to refresh sprint:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [projectId, setSprintQueue, loadExecutionStatus]);

  // Poll for updates during active execution
  useEffect(() => {
    loadExecutionStatus();

    const isExecuting = executionState?.status === 'running' || executionState?.status === 'paused';

    if (isExecuting || sprint?.status === 'in_progress') {
      const interval = setInterval(() => {
        handleRefresh();
      }, 3000); // Poll every 3 seconds

      return () => clearInterval(interval);
    }
  }, [executionState?.status, sprint?.status, handleRefresh, loadExecutionStatus]);

  // Subscribe to execution events
  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    if (window.electronAPI.onSprintExecutionStarted) {
      unsubscribes.push(
        window.electronAPI.onSprintExecutionStarted(() => {
          handleRefresh();
        })
      );
    }

    if (window.electronAPI.onSprintExecutionCompleted) {
      unsubscribes.push(
        window.electronAPI.onSprintExecutionCompleted(() => {
          handleRefresh();
        })
      );
    }

    if (window.electronAPI.onSprintExecutionStoryCompleted) {
      unsubscribes.push(
        window.electronAPI.onSprintExecutionStoryCompleted(() => {
          handleRefresh();
        })
      );
    }

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [handleRefresh]);

  // Execution control handlers
  const handleStartExecution = async () => {
    try {
      await window.electronAPI.startSprintExecution(projectId, sprintId);
      await loadExecutionStatus();
    } catch (error) {
      console.error('Failed to start execution:', error);
    }
  };

  const handleStopExecution = async () => {
    try {
      await window.electronAPI.stopSprintExecution(projectId);
      await loadExecutionStatus();
    } catch (error) {
      console.error('Failed to stop execution:', error);
    }
  };

  const handlePauseExecution = async () => {
    try {
      await window.electronAPI.pauseSprintExecution(projectId);
      await loadExecutionStatus();
    } catch (error) {
      console.error('Failed to pause execution:', error);
    }
  };

  const handleResumeExecution = async () => {
    try {
      await window.electronAPI.resumeSprintExecution(projectId);
      await loadExecutionStatus();
    } catch (error) {
      console.error('Failed to resume execution:', error);
    }
  };

  if (!sprint) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <p className="text-muted-foreground">{t('planning:dashboard.notFound')}</p>
        {onBack && (
          <Button variant="outline" onClick={onBack} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common:back')}
          </Button>
        )}
      </div>
    );
  }

  const isExecuting = executionState?.status === 'running';
  const isPaused = executionState?.status === 'paused';
  const canStart = sprint.status !== 'completed' && !isExecuting && !isPaused && stats.pending > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <h1 className="text-xl font-bold">{sprint.name}</h1>
              <p className="text-sm text-muted-foreground">
                {sprint.startedAt && (
                  <span>
                    {t('planning:dashboard.started', { date: formatDate(sprint.startedAt) })}
                  </span>
                )}
                {sprint.completedAt && (
                  <span>
                    {' '}&bull;{' '}
                    {t('planning:dashboard.completed', { date: formatDate(sprint.completedAt) })}
                  </span>
                )}
                {sprint.startedAt && !sprint.completedAt && (
                  <span>
                    {' '}&bull;{' '}
                    {formatDuration(sprint.startedAt, sprint.completedAt)}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Execution controls */}
            {canStart && (
              <Button onClick={handleStartExecution} size="sm">
                <Play className="h-4 w-4 mr-1" />
                {t('planning:execution.startExecution')}
              </Button>
            )}

            {isExecuting && (
              <>
                <Button variant="outline" size="sm" onClick={handlePauseExecution}>
                  <Pause className="h-4 w-4 mr-1" />
                  {t('planning:execution.pauseExecution')}
                </Button>
                <Button variant="destructive" size="sm" onClick={handleStopExecution}>
                  <Square className="h-4 w-4 mr-1" />
                  {t('planning:execution.stopExecution')}
                </Button>
              </>
            )}

            {isPaused && (
              <>
                <Button size="sm" onClick={handleResumeExecution}>
                  <Play className="h-4 w-4 mr-1" />
                  {t('planning:execution.resumeExecution')}
                </Button>
                <Button variant="destructive" size="sm" onClick={handleStopExecution}>
                  <Square className="h-4 w-4 mr-1" />
                  {t('planning:execution.stopExecution')}
                </Button>
              </>
            )}

            {/* Refresh button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Current story indicator */}
        {isExecuting && executionState?.currentStoryTitle && (
          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 mt-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>
              {t('planning:execution.progress.currentStory')}: {executionState.currentStoryTitle}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Stats Cards */}
        <DashboardStats
          completed={stats.completed}
          failed={stats.failed}
          pending={stats.pending}
          skipped={stats.skipped}
          inProgress={stats.inProgress}
          onFilterClick={setStatusFilter}
          activeFilter={statusFilter}
        />

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>
              {t('planning:dashboard.progress', { attempted, total: stats.total })}
            </span>
            <span className="text-muted-foreground">
              {Math.round(progressPercent)}%
              {attempted > 0 && (
                <span className="ml-2">
                  ({Math.round(successRate)}% {t('planning:execution.summary.successRate').toLowerCase()})
                </span>
              )}
            </span>
          </div>
          <Progress
            value={progressPercent}
            className="h-3"
            aria-label={t('planning:progress.ariaLabel')}
          />
        </div>

        {/* Story Lists */}
        <div>
          <h3 className="font-medium mb-3">{t('planning:stories.title')}</h3>
          <StoryStatusList
            assignments={sprintAssignments}
            onStoryClick={onStoryClick}
            onViewFailure={onViewFailure}
            statusFilter={statusFilter}
          />
        </div>
      </div>
    </div>
  );
}
