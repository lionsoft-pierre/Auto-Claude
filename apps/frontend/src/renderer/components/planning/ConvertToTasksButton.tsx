/**
 * ConvertToTasksButton Component (Story 3.3)
 * Converts ready stories to Kanban tasks
 */
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '../ui/alert-dialog';
import { useStoryStore } from '../../stores/planning/storyStore';
import { useToast } from '../../hooks/use-toast';
import type { StoryConversionResult } from '../../../shared/types';

interface ConvertToTasksButtonProps {
  projectId: string;
}

export function ConvertToTasksButton({ projectId }: ConvertToTasksButtonProps) {
  const { t } = useTranslation(['planning', 'common']);
  const { toast } = useToast();
  const { stories, loadStories } = useStoryStore();

  const [isConverting, setIsConverting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [conversionResults, setConversionResults] = useState<StoryConversionResult[]>([]);

  // Get ready stories that haven't been converted
  const readyStories = useMemo(() => {
    return stories.filter(s => s.status === 'ready');
  }, [stories]);

  const readyCount = readyStories.length;

  // Handle convert button click
  const handleConvertClick = () => {
    if (readyCount > 0) {
      setShowConfirmDialog(true);
    }
  };

  // Perform the conversion
  const handleConfirmConvert = async () => {
    setShowConfirmDialog(false);
    setIsConverting(true);

    try {
      const storyIds = readyStories.map(s => s.id);
      const result = await window.electronAPI.convertStoriesToTasks(projectId, storyIds);

      if (result.success && result.data) {
        setConversionResults(result.data);
        const successCount = result.data.filter(r => r.success).length;

        if (successCount > 0) {
          toast({
            title: t('planning:convert.success', { count: successCount }),
            duration: 3000
          });
        }

        // Reload stories to update statuses
        await loadStories(projectId);

        // Show results dialog if there were any issues
        if (result.data.some(r => !r.success)) {
          setShowResultDialog(true);
        }
      } else {
        toast({
          title: t('planning:convert.error'),
          description: result.error,
          variant: 'destructive',
          duration: 5000
        });
      }
    } catch (error) {
      toast({
        title: t('planning:convert.error'),
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
        duration: 5000
      });
    } finally {
      setIsConverting(false);
    }
  };

  // Don't show button if no ready stories
  if (readyCount === 0) {
    return null;
  }

  return (
    <>
      <Button
        onClick={handleConvertClick}
        disabled={isConverting}
        size="sm"
        className="gap-2"
      >
        {isConverting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ArrowRight className="h-4 w-4" />
        )}
        {t('planning:convert.button', { count: readyCount })}
      </Button>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('planning:convert.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('planning:convert.confirmMessage', { count: readyCount })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <ul className="space-y-2 max-h-48 overflow-auto">
              {readyStories.map(story => (
                <li key={story.id} className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="text-xs">#{story.number}</Badge>
                  <span className="truncate">{story.title}</span>
                </li>
              ))}
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmConvert}>
              {t('planning:convert.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Results Dialog */}
      <AlertDialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('planning:convert.resultsTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('planning:convert.resultsMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <ul className="space-y-2 max-h-48 overflow-auto">
              {conversionResults.map(result => (
                <li key={result.storyId} className="flex items-center gap-2 text-sm">
                  {result.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                  <span className="truncate">
                    {result.success ? (
                      <>Task {result.taskId} created</>
                    ) : (
                      result.error || 'Conversion failed'
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowResultDialog(false)}>
              {t('common:ok')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
