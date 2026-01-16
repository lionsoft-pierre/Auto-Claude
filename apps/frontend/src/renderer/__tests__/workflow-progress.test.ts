import { describe, it, expect } from 'vitest';
import { deriveWorkflowProgress, BMAD_WORKFLOW_STEPS } from '../components/planning/WorkflowProgress';
import type { PlanningSession, WorkflowStep } from '../../shared/types/planning';

// Helper to create test session
function createTestSession(overrides: Partial<PlanningSession> = {}): PlanningSession {
  const now = new Date().toISOString();
  return {
    id: `session-${Date.now()}`,
    projectId: `project-${Date.now()}`,
    projectName: 'Test Project',
    methodology: 'bmad',
    status: 'idle',
    createdAt: now,
    updatedAt: now,
    currentWorkflow: null,
    currentStep: 0,
    completedWorkflows: [],
    artifacts: {},
    context: {},
    messages: [],
    ...overrides
  };
}

describe('WorkflowProgress', () => {
  describe('BMAD_WORKFLOW_STEPS', () => {
    it('should have 5 workflow steps', () => {
      expect(BMAD_WORKFLOW_STEPS).toHaveLength(5);
    });

    it('should have steps in correct order', () => {
      const stepIds = BMAD_WORKFLOW_STEPS.map(step => step.id);
      expect(stepIds).toEqual(['brief', 'prd', 'architecture', 'epics', 'stories']);
    });

    it('should have label keys for all steps', () => {
      BMAD_WORKFLOW_STEPS.forEach(step => {
        expect(step.labelKey).toMatch(/^planning:workflow\./);
      });
    });

    it('should have icons for all steps', () => {
      BMAD_WORKFLOW_STEPS.forEach(step => {
        expect(step.icon).toBeDefined();
        // Lucide icons are React.ForwardRefExoticComponent (objects with $$typeof)
        expect(step.icon).toHaveProperty('$$typeof');
      });
    });
  });

  describe('deriveWorkflowProgress', () => {
    describe('when session is null', () => {
      it('should return all steps as upcoming', () => {
        const progress = deriveWorkflowProgress(null);

        expect(progress.get('brief')).toBe('upcoming');
        expect(progress.get('prd')).toBe('upcoming');
        expect(progress.get('architecture')).toBe('upcoming');
        expect(progress.get('epics')).toBe('upcoming');
        expect(progress.get('stories')).toBe('upcoming');
      });

      it('should return a map with all 5 steps', () => {
        const progress = deriveWorkflowProgress(null);
        expect(progress.size).toBe(5);
      });
    });

    describe('when session has no completed workflows', () => {
      it('should set first step as current', () => {
        const session = createTestSession({ completedWorkflows: [] });
        const progress = deriveWorkflowProgress(session);

        expect(progress.get('brief')).toBe('current');
        expect(progress.get('prd')).toBe('upcoming');
        expect(progress.get('architecture')).toBe('upcoming');
        expect(progress.get('epics')).toBe('upcoming');
        expect(progress.get('stories')).toBe('upcoming');
      });
    });

    describe('when session has some completed workflows', () => {
      it('should mark completed steps and set next as current', () => {
        const session = createTestSession({
          completedWorkflows: ['brief']
        });
        const progress = deriveWorkflowProgress(session);

        expect(progress.get('brief')).toBe('completed');
        expect(progress.get('prd')).toBe('current');
        expect(progress.get('architecture')).toBe('upcoming');
        expect(progress.get('epics')).toBe('upcoming');
        expect(progress.get('stories')).toBe('upcoming');
      });

      it('should handle multiple completed workflows', () => {
        const session = createTestSession({
          completedWorkflows: ['brief', 'prd', 'architecture']
        });
        const progress = deriveWorkflowProgress(session);

        expect(progress.get('brief')).toBe('completed');
        expect(progress.get('prd')).toBe('completed');
        expect(progress.get('architecture')).toBe('completed');
        expect(progress.get('epics')).toBe('current');
        expect(progress.get('stories')).toBe('upcoming');
      });
    });

    describe('when session has all workflows completed', () => {
      it('should mark all steps as completed', () => {
        const session = createTestSession({
          completedWorkflows: ['brief', 'prd', 'architecture', 'epics', 'stories']
        });
        const progress = deriveWorkflowProgress(session);

        expect(progress.get('brief')).toBe('completed');
        expect(progress.get('prd')).toBe('completed');
        expect(progress.get('architecture')).toBe('completed');
        expect(progress.get('epics')).toBe('completed');
        expect(progress.get('stories')).toBe('completed');
      });

      it('should not set any step as current when all completed', () => {
        const session = createTestSession({
          completedWorkflows: ['brief', 'prd', 'architecture', 'epics', 'stories']
        });
        const progress = deriveWorkflowProgress(session);

        const hasCurrentStep = Array.from(progress.values()).some(
          status => status === 'current'
        );
        expect(hasCurrentStep).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should handle non-sequential completion (out of order)', () => {
        // If somehow steps were completed out of order
        const session = createTestSession({
          completedWorkflows: ['brief', 'architecture'] // skipped prd
        });
        const progress = deriveWorkflowProgress(session);

        expect(progress.get('brief')).toBe('completed');
        expect(progress.get('prd')).toBe('current'); // First non-completed
        expect(progress.get('architecture')).toBe('completed');
        expect(progress.get('epics')).toBe('upcoming');
        expect(progress.get('stories')).toBe('upcoming');
      });

      it('should handle only last step completed', () => {
        const session = createTestSession({
          completedWorkflows: ['stories']
        });
        const progress = deriveWorkflowProgress(session);

        expect(progress.get('brief')).toBe('current');
        expect(progress.get('stories')).toBe('completed');
      });
    });
  });
});
