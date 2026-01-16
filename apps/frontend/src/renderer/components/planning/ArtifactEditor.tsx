import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, X, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { useArtifactStore } from '../../stores/planning/artifactStore';
import type { PlanningArtifact } from '../../../shared/types/planning';

/**
 * ArtifactEditor props
 */
interface ArtifactEditorProps {
  artifact: PlanningArtifact;
  projectId: string;
  onCancel: () => void;
  onSaved: () => void;
}

/**
 * ArtifactEditor - Provides editing capability for artifact content
 * Story 2.4: Artifact Viewing and Editing
 */
export function ArtifactEditor({ artifact, projectId, onCancel, onSaved }: ArtifactEditorProps) {
  const { t } = useTranslation(['planning', 'common']);

  const editContent = useArtifactStore((state) => state.editContent);
  const hasUnsavedChanges = useArtifactStore((state) => state.hasUnsavedChanges);
  const setEditContent = useArtifactStore((state) => state.setEditContent);
  const updateArtifact = useArtifactStore((state) => state.updateArtifact);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  // Handle content change
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditContent(e.target.value);
    setError(null);
  }, [setEditContent]);

  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const success = await updateArtifact(projectId, artifact.metadata.id, editContent);

      if (success) {
        onSaved();
      } else {
        setError(t('planning:artifacts.errors.saveFailed'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('planning:artifacts.errors.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel with confirmation if there are unsaved changes
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowDiscardDialog(true);
    } else {
      onCancel();
    }
  };

  // Confirm discard
  const handleConfirmDiscard = () => {
    setShowDiscardDialog(false);
    onCancel();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">
            {t('planning:artifacts.editing')}: {artifact.metadata.title}
          </h2>
          {hasUnsavedChanges && (
            <span className="text-xs text-yellow-600 dark:text-yellow-400">
              ({t('planning:artifacts.unsavedChanges')})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
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
            disabled={isSaving || !hasUnsavedChanges}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            {t('common:save')}
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 p-4 overflow-hidden">
        <Textarea
          value={editContent}
          onChange={handleContentChange}
          className="h-full w-full resize-none font-mono text-sm"
          placeholder={t('planning:artifacts.editorPlaceholder')}
          disabled={isSaving}
        />
      </div>

      {/* Discard confirmation dialog */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('planning:artifacts.discardTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('planning:artifacts.discardDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDiscard}>
              {t('planning:artifacts.discard')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
