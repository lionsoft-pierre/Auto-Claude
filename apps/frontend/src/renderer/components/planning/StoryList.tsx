/**
 * StoryList Component (Story 3.2)
 * Displays stories grouped by epic with collapsible sections
 */
import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '../ui/tooltip';
import { useStoryStore } from '../../stores/planning/storyStore';
import { cn } from '../../lib/utils';
import type { StoryStatus, StorySummary, StoryGroup } from '../../../shared/types';

interface StoryListProps {
  projectId: string;
}

/**
 * Get status icon for story status
 */
function getStatusIcon(status: StoryStatus) {
  switch (status) {
    case 'ready':
      return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    case 'needs_refinement':
      return <AlertCircle className="h-3 w-3 text-amber-500" />;
    case 'in_progress':
      return <Clock className="h-3 w-3 text-blue-500" />;
    case 'completed':
      return <CheckCircle2 className="h-3 w-3 text-green-600" />;
    case 'failed':
      return <AlertCircle className="h-3 w-3 text-red-500" />;
    default:
      return <FileText className="h-3 w-3 text-muted-foreground" />;
  }
}

/**
 * Get status badge variant
 */
function getStatusVariant(status: StoryStatus): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'ready':
      return 'default';
    case 'needs_refinement':
      return 'secondary';
    case 'in_progress':
      return 'outline';
    case 'completed':
      return 'default';
    case 'failed':
      return 'destructive';
    default:
      return 'outline';
  }
}

export function StoryList({ projectId }: StoryListProps) {
  const { t } = useTranslation(['planning', 'common']);
  const {
    stories,
    selectedStory,
    isLoading,
    isGenerating,
    generationProgress,
    loadStories,
    selectStory,
    generateStories,
    getStoriesByEpic
  } = useStoryStore();

  // Track expanded epics
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());

  // Group stories by epic
  const groups = useMemo(() => getStoriesByEpic(), [stories]);

  // Expand all epics by default when stories load
  useEffect(() => {
    if (groups.length > 0 && expandedEpics.size === 0) {
      setExpandedEpics(new Set(groups.map(g => g.epicId)));
    }
  }, [groups]);

  // Load stories on mount
  useEffect(() => {
    loadStories(projectId);
  }, [projectId, loadStories]);

  // Toggle epic expansion
  const toggleEpic = (epicId: string) => {
    const next = new Set(expandedEpics);
    if (next.has(epicId)) {
      next.delete(epicId);
    } else {
      next.add(epicId);
    }
    setExpandedEpics(next);
  };

  // Handle story click
  const handleStoryClick = (storyId: string) => {
    selectStory(projectId, storyId);
  };

  // Handle generate stories
  const handleGenerateStories = () => {
    generateStories(projectId);
  };

  // Count stories by status
  const readyCount = stories.filter(s => s.status === 'ready').length;
  const totalCount = stories.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{t('planning:stories.title')}</h3>
          {stories.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {readyCount}/{totalCount}
            </Badge>
          )}
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadStories(projectId)}
                disabled={isLoading}
              >
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t('common:refresh')}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Generation Progress */}
      {isGenerating && generationProgress && (
        <div className="p-3 border-b bg-muted/50">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>
              {t('planning:stories.generatingStory', {
                number: generationProgress.current,
                title: generationProgress.storyTitle
              })}
            </span>
          </div>
          <div className="mt-2 h-1 bg-muted rounded">
            <div
              className="h-full bg-primary rounded transition-all"
              style={{
                width: `${(generationProgress.current / generationProgress.total) * 100}%`
              }}
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-2">
        {isLoading && stories.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-4">
              {t('planning:stories.noStories')}
            </p>
            <Button
              size="sm"
              onClick={handleGenerateStories}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {t('planning:stories.generate')}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Clarity Test Info */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <HelpCircle className="h-3 w-3" />
              <span>{t('planning:clarityTest.label')}</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                      <HelpCircle className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    {t('planning:clarityTest.explanation')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Epic groups */}
            {groups.map((group) => (
              <div key={group.epicId} className="border rounded-lg overflow-hidden">
                {/* Epic header */}
                <button
                  onClick={() => toggleEpic(group.epicId)}
                  className="w-full flex items-center justify-between p-2 hover:bg-muted/50 text-sm"
                >
                  <span className="font-medium truncate">{group.epicTitle}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {group.stories.length}
                    </Badge>
                    {expandedEpics.has(group.epicId) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Stories in epic */}
                {expandedEpics.has(group.epicId) && (
                  <ul className="border-t">
                    {group.stories.map((story) => (
                      <li key={story.id}>
                        <button
                          onClick={() => handleStoryClick(story.id)}
                          className={cn(
                            'w-full flex items-center gap-2 p-2 pl-4 hover:bg-muted/50 text-sm',
                            selectedStory?.metadata.id === story.id && 'bg-muted'
                          )}
                        >
                          {getStatusIcon(story.status)}
                          <span className="flex-1 text-left truncate">
                            {story.number}. {story.title}
                          </span>
                          <Badge
                            variant={getStatusVariant(story.status)}
                            className="text-xs capitalize"
                          >
                            {t(`planning:storyStatus.${story.status}`)}
                          </Badge>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
