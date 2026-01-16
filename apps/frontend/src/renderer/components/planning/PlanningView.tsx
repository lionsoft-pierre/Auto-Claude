import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardList, Plus, Loader2, Save } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { MethodologySelector } from './MethodologySelector';
import { PlanningChat } from './PlanningChat';
import { WorkflowProgress } from './WorkflowProgress';
import { useToast } from '../../hooks/use-toast';
import {
  useSessionStore,
  type Methodology
} from '../../stores/planning/sessionStore';
import { useProjectStore } from '../../stores/project-store';

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
  const startAutoSave = useSessionStore((state) => state.startAutoSave);
  const stopAutoSave = useSessionStore((state) => state.stopAutoSave);

  // Project store
  const projects = useProjectStore((state) => state.projects);
  const selectedProject = projects.find((p) => p.id === projectId);
  const projectName = selectedProject?.name || 'unknown';

  // Local state
  const [showMethodologySelector, setShowMethodologySelector] = useState(false);

  // Load session on mount
  useEffect(() => {
    loadSession(projectId);
  }, [projectId, loadSession]);

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

  // Active session view with chat interface
  if (session) {
    return (
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-lg font-semibold">{t('planning:title')}</h1>
                <p className="text-sm text-muted-foreground">
                  {session.methodology.toUpperCase()} - {t(`planning:status.${session.status}`)}
                </p>
              </div>
            </div>
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
          </div>

          {/* Workflow Progress Indicator (Story 1.4) */}
          <div className="mt-4">
            <WorkflowProgress />
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 overflow-hidden">
          <PlanningChat projectId={projectId} />
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
