import { useTranslation } from 'react-i18next';
import { Check, CheckCircle2, Lightbulb, FileText, Boxes, Layers, BookOpen, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSessionStore } from '../../stores/planning/sessionStore';
import { Button } from '../ui/button';
import type { WorkflowStep, WorkflowStepStatus, PlanningSession } from '../../../shared/types/planning';
import type { LucideIcon } from 'lucide-react';

/**
 * BMAD workflow steps configuration
 */
interface WorkflowStepConfig {
  id: WorkflowStep;
  labelKey: string;
  icon: LucideIcon;
}

const BMAD_WORKFLOW_STEPS: readonly WorkflowStepConfig[] = [
  { id: 'brief', labelKey: 'planning:workflow.brief', icon: Lightbulb },
  { id: 'prd', labelKey: 'planning:workflow.prd', icon: FileText },
  { id: 'architecture', labelKey: 'planning:workflow.architecture', icon: Boxes },
  { id: 'epics', labelKey: 'planning:workflow.epics', icon: Layers },
  { id: 'stories', labelKey: 'planning:workflow.stories', icon: BookOpen },
] as const;

/**
 * Derive workflow progress from session state
 */
export function deriveWorkflowProgress(session: PlanningSession | null): Map<WorkflowStep, WorkflowStepStatus> {
  const statusMap = new Map<WorkflowStep, WorkflowStepStatus>();

  if (!session) {
    // No session - all steps upcoming
    BMAD_WORKFLOW_STEPS.forEach(step => statusMap.set(step.id, 'upcoming'));
    return statusMap;
  }

  const completedSet = new Set(session.completedWorkflows);
  let foundCurrent = false;

  // Check if all workflows are completed
  const allCompleted = BMAD_WORKFLOW_STEPS.every(step => completedSet.has(step.id));

  BMAD_WORKFLOW_STEPS.forEach(step => {
    if (completedSet.has(step.id)) {
      statusMap.set(step.id, 'completed');
    } else if (!foundCurrent && !allCompleted) {
      // First non-completed step is current (unless all are completed)
      statusMap.set(step.id, 'current');
      foundCurrent = true;
    } else {
      statusMap.set(step.id, 'upcoming');
    }
  });

  return statusMap;
}

/**
 * Individual workflow step display
 */
interface WorkflowStepItemProps {
  step: WorkflowStepConfig;
  status: WorkflowStepStatus;
  onClick?: () => void;
  onMarkComplete?: () => void;
  isClickable?: boolean;
  isCurrent?: boolean;
}

function WorkflowStepItem({ step, status, onClick, onMarkComplete, isClickable = false, isCurrent = false }: WorkflowStepItemProps) {
  const { t } = useTranslation(['planning']);
  const Icon = step.icon;

  return (
    <div className="flex items-center gap-1 group">
      <button
        type="button"
        onClick={onClick}
        disabled={!isClickable}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all duration-300',
          status === 'completed' && 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
          status === 'current' && 'bg-primary/10 text-primary font-medium ring-2 ring-primary/20',
          status === 'upcoming' && 'bg-muted text-muted-foreground opacity-60',
          isClickable && 'cursor-pointer hover:ring-2 hover:ring-primary/40',
          !isClickable && 'cursor-default'
        )}
        aria-current={status === 'current' ? 'step' : undefined}
        aria-label={`${t(step.labelKey)} - ${t(`planning:progress.${status}`)}`}
      >
        {status === 'completed' ? (
          <Check className="h-4 w-4 transition-transform duration-300" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">{t(step.labelKey)}</span>
      </button>
      {/* Mark Complete button - visible on hover for current step */}
      {isCurrent && status !== 'completed' && onMarkComplete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onMarkComplete();
          }}
          title={t('planning:progress.markComplete')}
        >
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </Button>
      )}
    </div>
  );
}

/**
 * Workflow progress indicator showing BMAD methodology steps
 */
interface WorkflowProgressProps {
  projectId?: string;
}

export function WorkflowProgress({ projectId }: WorkflowProgressProps) {
  const { t } = useTranslation(['planning']);
  const session = useSessionStore((state) => state.session);
  const startWorkflow = useSessionStore((state) => state.startWorkflow);
  const markWorkflowComplete = useSessionStore((state) => state.markWorkflowComplete);
  const saveSession = useSessionStore((state) => state.saveSession);
  const progress = deriveWorkflowProgress(session);

  const handleStepClick = async (stepId: WorkflowStep) => {
    if (!projectId || !session) return;

    // Don't switch if already on this step
    if (session.currentWorkflow === stepId) return;

    await startWorkflow(projectId, stepId);
  };

  const handleMarkComplete = async (stepId: WorkflowStep) => {
    markWorkflowComplete(stepId);
    // Save session after marking complete
    await saveSession(true);
  };

  // Determine which steps are clickable (completed or current, not upcoming)
  const isStepClickable = (stepId: WorkflowStep): boolean => {
    if (!projectId || !session) return false;
    const status = progress.get(stepId);
    // Allow clicking on completed steps to revisit, and current step
    // Also allow clicking the next step after current (to advance)
    const currentIndex = BMAD_WORKFLOW_STEPS.findIndex(s => progress.get(s.id) === 'current');
    const stepIndex = BMAD_WORKFLOW_STEPS.findIndex(s => s.id === stepId);
    return status === 'completed' || status === 'current' || stepIndex === currentIndex + 1;
  };

  return (
    <nav
      aria-label={t('planning:progress.ariaLabel')}
      className="flex items-center gap-1 overflow-x-auto py-2"
    >
      {BMAD_WORKFLOW_STEPS.map((step, index) => {
        const status = progress.get(step.id) ?? 'upcoming';
        const clickable = isStepClickable(step.id);
        const isCurrent = status === 'current';
        return (
          <div key={step.id} className="flex items-center">
            {index > 0 && (
              <ChevronRight
                className={cn(
                  'h-4 w-4 mx-1 flex-shrink-0 transition-colors duration-300',
                  progress.get(BMAD_WORKFLOW_STEPS[index - 1].id) === 'completed'
                    ? 'text-green-500 dark:text-green-400'
                    : 'text-muted-foreground/40'
                )}
              />
            )}
            <WorkflowStepItem
              step={step}
              status={status}
              onClick={() => handleStepClick(step.id)}
              onMarkComplete={() => handleMarkComplete(step.id)}
              isClickable={clickable}
              isCurrent={isCurrent}
            />
          </div>
        );
      })}
    </nav>
  );
}

// Export for testing
export { BMAD_WORKFLOW_STEPS };
