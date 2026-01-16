import { useTranslation } from 'react-i18next';
import { Check, Lightbulb, FileText, Boxes, Layers, BookOpen, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSessionStore } from '../../stores/planning/sessionStore';
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
}

function WorkflowStepItem({ step, status }: WorkflowStepItemProps) {
  const { t } = useTranslation(['planning']);
  const Icon = step.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all duration-300',
        status === 'completed' && 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        status === 'current' && 'bg-primary/10 text-primary font-medium ring-2 ring-primary/20',
        status === 'upcoming' && 'bg-muted text-muted-foreground opacity-60'
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
    </div>
  );
}

/**
 * Workflow progress indicator showing BMAD methodology steps
 */
export function WorkflowProgress() {
  const { t } = useTranslation(['planning']);
  const session = useSessionStore((state) => state.session);
  const progress = deriveWorkflowProgress(session);

  return (
    <nav
      aria-label={t('planning:progress.ariaLabel')}
      className="flex items-center gap-1 overflow-x-auto py-2"
    >
      {BMAD_WORKFLOW_STEPS.map((step, index) => {
        const status = progress.get(step.id) ?? 'upcoming';
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
            <WorkflowStepItem step={step} status={status} />
          </div>
        );
      })}
    </nav>
  );
}

// Export for testing
export { BMAD_WORKFLOW_STEPS };
