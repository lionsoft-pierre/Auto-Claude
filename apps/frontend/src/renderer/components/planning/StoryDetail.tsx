/**
 * StoryDetail Component (Story 3.2)
 * Displays full story content with edit and status controls
 */
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import {
  Edit2,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
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
import { cn } from '../../lib/utils';
import type { Story, StoryStatus } from '../../../shared/types';

interface StoryDetailProps {
  story: Story;
  projectId: string;
  onBack: () => void;
}

export function StoryDetail({ story, projectId, onBack }: StoryDetailProps) {
  const { t } = useTranslation(['planning', 'common']);
  const { toast } = useToast();
  const { updateStory, setStoryStatus, isEditing, setEditing } = useStoryStore();

  // Edit state
  const [editContent, setEditContent] = useState(story.content);
  const [isSaving, setIsSaving] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // Track if content has changed
  const hasChanges = editContent !== story.content;

  // Update edit content when story changes
  useEffect(() => {
    setEditContent(story.content);
  }, [story.content]);

  // Handle edit cancel
  const handleCancel = () => {
    if (hasChanges) {
      setShowUnsavedWarning(true);
    } else {
      setEditing(false);
      setEditContent(story.content);
    }
  };

  // Handle discard changes
  const handleDiscardChanges = () => {
    setEditing(false);
    setEditContent(story.content);
    setShowUnsavedWarning(false);
  };

  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const success = await updateStory(projectId, story.metadata.id, editContent);
      if (success) {
        toast({
          title: t('planning:stories.saved'),
          duration: 2000
        });
        setEditing(false);
      } else {
        toast({
          title: t('planning:errors.saveFailed'),
          variant: 'destructive',
          duration: 3000
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Handle status change
  const handleStatusChange = async (newStatus: StoryStatus) => {
    const success = await setStoryStatus(projectId, story.metadata.id, newStatus);
    if (success) {
      toast({
        title: t('planning:stories.statusUpdated'),
        duration: 2000
      });
    } else {
      toast({
        title: t('planning:errors.statusUpdateFailed'),
        variant: 'destructive',
        duration: 3000
      });
    }
  };

  // Get status badge color
  const getStatusColor = (status: StoryStatus) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'needs_refinement':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                #{story.metadata.number}
              </Badge>
              <Badge className={cn('text-xs capitalize', getStatusColor(story.metadata.status))}>
                {t(`planning:storyStatus.${story.metadata.status}`)}
              </Badge>
              <Badge variant="secondary" className="text-xs capitalize">
                {story.metadata.testScope}
              </Badge>
            </div>
            <h2 className="text-lg font-semibold">{story.metadata.title}</h2>
            <p className="text-sm text-muted-foreground">
              {t('planning:stories.epic')}: {story.metadata.epic}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-1" />
                  {t('common:cancel')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  {t('planning:stories.save')}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <Edit2 className="h-4 w-4 mr-1" />
                {t('planning:stories.edit')}
              </Button>
            )}
          </div>
        </div>

        {/* Clarity test buttons (only for draft or needs_refinement) */}
        {!isEditing && (story.metadata.status === 'draft' || story.metadata.status === 'needs_refinement') && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <span className="text-sm text-muted-foreground mr-2">
              {t('planning:clarityTest.label')}:
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange('ready')}
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              {t('planning:stories.markReady')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange('needs_refinement')}
              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
            >
              <AlertCircle className="h-4 w-4 mr-1" />
              {t('planning:stories.needsRefinement')}
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isEditing ? (
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[calc(100%-2rem)] font-mono text-sm resize-none"
            placeholder={t('planning:stories.editPlaceholder')}
          />
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{story.content}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* Unsaved changes warning */}
      <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('planning:stories.unsavedChangesTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('planning:stories.unsavedChangesMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('common:cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscardChanges}>
              {t('planning:stories.discardChanges')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
