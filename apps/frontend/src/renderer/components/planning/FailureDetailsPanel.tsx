/**
 * FailureDetailsPanel Component (Story 6.2)
 * Slide-over panel displaying failure details and AI analysis
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '../ui/sheet';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import {
  FileText,
  RefreshCw,
  Edit,
  ExternalLink,
  AlertCircle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { FailureLogEntry, ParsedFailureData } from '../../utils/failureLogParser';

interface FailureDetailsPanelProps {
  projectId: string;
  storyId: string | null;
  open: boolean;
  onClose: () => void;
  onRetry?: (storyId: string) => void;
  onViewStory?: (storyId: string) => void;
  onEditStory?: (storyId: string) => void;
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, children, defaultOpen = true }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <span className="font-medium text-sm">{title}</span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && (
        <div className="p-3 text-sm">{children}</div>
      )}
    </div>
  );
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

export function FailureDetailsPanel({
  projectId,
  storyId,
  open,
  onClose,
  onRetry,
  onViewStory,
  onEditStory
}: FailureDetailsPanelProps) {
  const { t } = useTranslation(['planning', 'common']);
  const [failureData, setFailureData] = useState<ParsedFailureData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<number | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Load failure details when panel opens
  useEffect(() => {
    if (open && storyId) {
      loadFailureDetails(storyId);
    } else {
      setFailureData(null);
      setSelectedAttempt(null);
    }
  }, [open, storyId, projectId]);

  const loadFailureDetails = async (id: string) => {
    setIsLoading(true);
    try {
      const result = await window.electronAPI.getFailureDetails(projectId, id);
      if (result.success && result.data) {
        // Convert API response to ParsedFailureData format
        const entries: FailureLogEntry[] = result.data.failures.map(f => ({
          attemptNumber: f.attempt,
          timestamp: f.timestamp,
          duration: `${f.duration}s`,
          durationSeconds: f.duration,
          phase: f.phase,
          summary: f.analysis.summary,
          analysis: f.analysis.analysis,
          fixes: f.analysis.fixes,
          rawError: f.rawError,
          artifacts: f.artifacts.map(a => ({ name: a.split('/').pop() || a, path: a }))
        }));
        const parsed: ParsedFailureData = {
          storyId: id,
          storyTitle: result.data.storyTitle,
          status: 'failed',
          entries,
          latestEntry: entries[entries.length - 1] || null
        };
        setFailureData(parsed);
        // Select latest attempt by default
        if (entries.length > 0) {
          setSelectedAttempt(entries.length - 1);
        }
      }
    } catch (error) {
      console.error('Failed to load failure details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!storyId || !onRetry) return;
    setIsRetrying(true);
    try {
      await onRetry(storyId);
      onClose();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleOpenArtifact = async (path: string) => {
    try {
      await window.electronAPI.openExternal(path);
    } catch (error) {
      console.error('Failed to open artifact:', error);
    }
  };

  const currentEntry: FailureLogEntry | null =
    selectedAttempt !== null && failureData?.entries
      ? failureData.entries[selectedAttempt]
      : failureData?.latestEntry ?? null;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:w-[600px] sm:max-w-[600px] p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            {t('planning:execution.failure.title')}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="p-4 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !failureData || !currentEntry ? (
              <div className="text-center py-12 text-muted-foreground">
                {t('planning:dashboard.notFound')}
              </div>
            ) : (
              <>
                {/* Story Info */}
                <div className="space-y-1">
                  <h3 className="font-medium text-lg">{failureData.storyTitle}</h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Badge variant="destructive">{t('planning:storyStatus.failed')}</Badge>
                    <span>
                      {t('planning:execution.failure.attempt', { number: currentEntry.attemptNumber })}
                    </span>
                    {currentEntry.phase && (
                      <>
                        <span>&bull;</span>
                        <span>{currentEntry.phase}</span>
                      </>
                    )}
                    {currentEntry.durationSeconds > 0 && (
                      <>
                        <span>&bull;</span>
                        <span>{formatDuration(currentEntry.durationSeconds)}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Attempt Selector (if multiple) */}
                {failureData.entries.length > 1 && (
                  <div className="flex gap-2">
                    {failureData.entries.map((entry, index) => (
                      <Button
                        key={index}
                        variant={selectedAttempt === index ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedAttempt(index)}
                      >
                        {t('planning:execution.failure.attempt', { number: entry.attemptNumber })}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Error Summary */}
                {currentEntry.summary && (
                  <Section title={t('planning:execution.failure.errorSummary')}>
                    <p className="text-red-600 dark:text-red-400">{currentEntry.summary}</p>
                  </Section>
                )}

                {/* AI Analysis */}
                {currentEntry.analysis && (
                  <Section title={t('planning:execution.failure.aiAnalysis')}>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <pre className="whitespace-pre-wrap text-sm font-normal bg-transparent p-0 m-0">
                        {currentEntry.analysis}
                      </pre>
                    </div>
                  </Section>
                )}

                {/* Suggested Fixes */}
                {currentEntry.fixes && (
                  <Section title={t('planning:execution.failure.suggestedFixes')}>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <pre className="whitespace-pre-wrap text-sm font-normal bg-transparent p-0 m-0">
                        {currentEntry.fixes}
                      </pre>
                    </div>
                  </Section>
                )}

                {/* Raw Error */}
                {currentEntry.rawError && (
                  <Section title={t('planning:execution.failure.rawError')} defaultOpen={false}>
                    <pre className="p-3 bg-muted rounded text-xs overflow-x-auto">
                      {currentEntry.rawError}
                    </pre>
                  </Section>
                )}

                {/* Artifacts */}
                {currentEntry.artifacts.length > 0 && (
                  <Section title={t('planning:execution.failure.artifacts')}>
                    <div className="flex flex-wrap gap-2">
                      {currentEntry.artifacts.map((artifact, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenArtifact(artifact.path)}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          {artifact.name}
                        </Button>
                      ))}
                    </div>
                  </Section>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Actions Footer */}
        {failureData && storyId && (
          <div className="border-t p-4 flex gap-2">
            {onViewStory && (
              <Button variant="outline" onClick={() => onViewStory(storyId)}>
                <ExternalLink className="h-4 w-4 mr-1" />
                {t('planning:failure.viewStory')}
              </Button>
            )}
            {onEditStory && (
              <Button variant="outline" onClick={() => onEditStory(storyId)}>
                <Edit className="h-4 w-4 mr-1" />
                {t('planning:failure.editStory')}
              </Button>
            )}
            {onRetry && (
              <Button
                onClick={handleRetry}
                disabled={isRetrying}
                className="ml-auto"
              >
                <RefreshCw className={cn('h-4 w-4 mr-1', isRetrying && 'animate-spin')} />
                {t('planning:failure.retry')}
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
