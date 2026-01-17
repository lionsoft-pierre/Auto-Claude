import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardList, Plus, Loader2, Save, PanelLeftClose, PanelLeft, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { MethodologySelector } from './MethodologySelector';
import { PlanningChat } from './PlanningChat';
import { WorkflowProgress } from './WorkflowProgress';
import { ArtifactPanel } from './ArtifactPanel';
import { ArtifactViewer } from './ArtifactViewer';
import { ArtifactEditor } from './ArtifactEditor';
import { ArtifactReviewPrompt } from './ArtifactReviewPrompt';
import { ArtifactBreadcrumb } from './ArtifactBreadcrumb';
import { CheckpointHistory } from './CheckpointHistory';
import { useToast } from '../../hooks/use-toast';
import {
  useSessionStore,
  type Methodology
} from '../../stores/planning/sessionStore';
import { useArtifactStore } from '../../stores/planning/artifactStore';
import { useProjectStore } from '../../stores/project-store';
import { cn } from '../../lib/utils';

interface PlanningViewProps {
  projectId: string;
}

export function PlanningView({ projectId }: PlanningViewProps) {
  const { t } = useTranslation(['planning', 'common']);
  const { toast } = useToast();

  // Session store
  const session = useSessionStore((state) => state.session);
  const isLoading = useSessionStore((state) => state.isLoading);
  const error = useSessionStore((state) => state.error);
  const isDirty = useSessionStore((state) => state.isDirty);
  const isSaving = useSessionStore((state) => state.isSaving);
  const loadSession = useSessionStore((state) => state.loadSession);
  const createSession = useSessionStore((state) => state.createSession);
  const saveSession = useSessionStore((state) => state.saveSession);
  const deleteSession = useSessionStore((state) => state.deleteSession);
  const startAutoSave = useSessionStore((state) => state.startAutoSave);
  const stopAutoSave = useSessionStore((state) => state.stopAutoSave);

  // Project store
  const projects = useProjectStore((state) => state.projects);
  const selectedProject = projects.find((p) => p.id === projectId);
  const projectName = selectedProject?.name || 'unknown';

  // Local state
  const [showMethodologySelector, setShowMethodologySelector] = useState(false);
  const [showArtifactPanel, setShowArtifactPanel] = useState(true);

  // Artifact store
  const selectedArtifact = useArtifactStore((state) => state.selectedArtifact);
  const isEditing = useArtifactStore((state) => state.isEditing);
  const setEditing = useArtifactStore((state) => state.setEditing);
  const clearSelection = useArtifactStore((state) => state.clearSelection);
  const loadArtifacts = useArtifactStore((state) => state.loadArtifacts);
  const artifacts = useArtifactStore((state) => state.artifacts);

  // Load session and artifacts on mount
  useEffect(() => {
    loadSession(projectId);
    loadArtifacts(projectId);
  }, [projectId, loadSession, loadArtifacts]);

  // Start/stop auto-save when session changes (Story 1.3)
  useEffect(() => {
    if (session) {
      startAutoSave();
    }
    return () => {
      stopAutoSave();
    };
  }, [session, startAutoSave, stopAutoSave]);

  // Handle methodology selection
  const handleMethodologySelect = async (methodology: Methodology) => {
    await createSession(projectId, projectName, methodology);
    setShowMethodologySelector(false);
  };

  // Handle new session click
  const handleNewSession = () => {
    setShowMethodologySelector(true);
  };

  // Handle manual save (Story 1.3)
  const handleSave = async () => {
    const success = await saveSession(false);
    if (success) {
      toast({
        title: t('planning:session.saved'),
        duration: 2000
      });
    } else {
      toast({
        title: t('planning:errors.saveFailed'),
        variant: 'destructive',
        duration: 3000
      });
    }
  };

  // Handle discard session
  const handleDiscard = async () => {
    const success = await deleteSession(projectId);
    if (success) {
      toast({
        title: t('planning:session.discarded'),
        duration: 2000
      });
      // Show methodology selector to start fresh
      setShowMethodologySelector(true);
    } else {
      toast({
        title: t('planning:errors.discardFailed'),
        variant: 'destructive',
        duration: 3000
      });
    }
  };

  // Loading state
  if (isLoading && !session) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">{t('planning:errors.loadFailed')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
            <Button className="mt-4" onClick={() => loadSession(projectId)}>
              {t('common:retry')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Methodology selector view
  if (showMethodologySelector) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="w-full max-w-lg">
          <MethodologySelector
            onSelect={handleMethodologySelect}
            isLoading={isLoading}
          />
        </div>
      </div>
    );
  }

  // Find artifact in review for review prompt
  const artifactInReview = artifacts.find(a => a.status === 'in_review');

  // Handle revision request from review prompt
  const handleRevisionRequested = (feedback: string) => {
    // Send revision request as a chat message
    if (session) {
      const revisionMessage = `Please revise the ${artifactInReview?.type} artifact with the following feedback:\n\n${feedback}`;
      window.electronAPI.sendPlanningMessage(projectId, session.id, revisionMessage);
    }
  };

  // Active session view with chat interface
  if (session) {
    return (
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Toggle artifact panel button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowArtifactPanel(!showArtifactPanel)}
                title={showArtifactPanel ? 'Hide artifacts' : 'Show artifacts'}
              >
                {showArtifactPanel ? (
                  <PanelLeftClose className="h-5 w-5" />
                ) : (
                  <PanelLeft className="h-5 w-5" />
                )}
              </Button>
              <ClipboardList className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-lg font-semibold">{t('planning:title')}</h1>
                <p className="text-sm text-muted-foreground">
                  {session.methodology.toUpperCase()} - {t(`planning:status.${session.status}`)}
                </p>
              </div>
            </div>
            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {/* Save button (Story 1.3) */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !isDirty}
                className="gap-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {t('planning:saveSession')}
              </Button>

              {/* Discard button with confirmation */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('planning:discardSession')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('planning:discardConfirm.title')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('planning:discardConfirm.description')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDiscard}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t('planning:discardConfirm.confirm')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Workflow Progress Indicator (Story 1.4) */}
          <div className="mt-4">
            <WorkflowProgress projectId={projectId} />
          </div>
        </div>

        {/* Main content area with artifact panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Artifact Panel (collapsible) */}
          <div
            className={cn(
              'border-r bg-card transition-all duration-300 overflow-hidden',
              showArtifactPanel ? 'w-64' : 'w-0'
            )}
          >
            {showArtifactPanel && (
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-auto">
                  <ArtifactPanel projectId={projectId} />
                </div>
                {/* Checkpoint History (Story 2.6) */}
                <div className="border-t p-2">
                  <CheckpointHistory projectId={projectId} />
                </div>
              </div>
            )}
          </div>

          {/* Main content (chat or artifact viewer) */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Review prompt if artifact in review */}
            {artifactInReview && (
              <div className="p-4 border-b">
                <ArtifactReviewPrompt
                  artifact={artifactInReview}
                  projectId={projectId}
                  onApproved={() => loadArtifacts(projectId)}
                  onRevisionRequested={handleRevisionRequested}
                />
              </div>
            )}

            {/* Show artifact viewer/editor or chat */}
            {selectedArtifact ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Breadcrumb navigation */}
                <div className="px-4 py-2 border-b bg-muted/30">
                  <ArtifactBreadcrumb
                    artifact={selectedArtifact}
                    projectId={projectId}
                    onHomeClick={clearSelection}
                  />
                </div>

                {/* Artifact viewer or editor */}
                {isEditing ? (
                  <ArtifactEditor
                    artifact={selectedArtifact}
                    projectId={projectId}
                    onCancel={() => setEditing(false)}
                    onSaved={() => {
                      setEditing(false);
                      loadArtifacts(projectId);
                    }}
                  />
                ) : (
                  <ArtifactViewer
                    artifact={selectedArtifact}
                    projectId={projectId}
                    onEdit={() => setEditing(true)}
                  />
                )}
              </div>
            ) : (
              /* Chat Interface */
              <div className="flex-1 overflow-hidden">
                <PlanningChat projectId={projectId} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Empty state - no active session
  return (
    <div className="flex h-full items-center justify-center p-8">
      <Card className="max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <ClipboardList className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle>{t('planning:noActiveSession')}</CardTitle>
          <CardDescription>
            {t('planning:noActiveSessionDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleNewSession} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('planning:newSession')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
