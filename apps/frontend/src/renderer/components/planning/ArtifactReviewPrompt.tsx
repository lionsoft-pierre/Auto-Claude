import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, RefreshCw, X, Loader2, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { useArtifactStore } from '../../stores/planning/artifactStore';
import { useSessionStore } from '../../stores/planning/sessionStore';
import type { ArtifactSummary } from '../../../shared/types/planning';

/**
 * ArtifactReviewPrompt props
 */
interface ArtifactReviewPromptProps {
  artifact: ArtifactSummary;
  projectId: string;
  onApproved?: () => void;
  onRevisionRequested?: (feedback: string) => void;
}

/**
 * ArtifactReviewPrompt - Approve/Revise/Reject workflow for artifacts
 * Story 2.3: Artifact Review and Approval
 */
export function ArtifactReviewPrompt({
  artifact,
  projectId,
  onApproved,
  onRevisionRequested
}: ArtifactReviewPromptProps) {
  const { t } = useTranslation(['planning', 'common']);

  const approveArtifact = useArtifactStore((state) => state.approveArtifact);
  const rejectArtifact = useArtifactStore((state) => state.rejectArtifact);
  const setReviewState = useSessionStore((state) => state.setReviewState);
  const advanceWorkflow = useSessionStore((state) => state.advanceWorkflow);
  const session = useSessionStore((state) => state.session);

  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState('');

  // Handle approve
  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const success = await approveArtifact(projectId, artifact.id);
      if (success) {
        setReviewState('none');

        // Advance workflow if this artifact matches current step
        if (session?.currentWorkflow) {
          const artifactTypeToWorkflow: Record<string, string> = {
            'product-brief': 'brief',
            'prd': 'prd',
            'architecture': 'architecture',
            'epics': 'epics',
            'story': 'stories'
          };
          const workflowStep = artifactTypeToWorkflow[artifact.type];
          if (workflowStep === session.currentWorkflow) {
            // Determine next workflow
            const workflowOrder = ['brief', 'prd', 'architecture', 'epics', 'stories'];
            const currentIndex = workflowOrder.indexOf(session.currentWorkflow);
            const nextWorkflow = currentIndex < workflowOrder.length - 1
              ? workflowOrder[currentIndex + 1] as typeof session.currentWorkflow
              : null;
            advanceWorkflow(session.currentWorkflow, nextWorkflow);
          }
        }

        onApproved?.();
      }
    } finally {
      setIsApproving(false);
    }
  };

  // Handle revision request
  const handleRequestRevision = () => {
    setShowRevisionDialog(true);
  };

  // Submit revision request
  const handleSubmitRevision = () => {
    setReviewState('revising');
    setShowRevisionDialog(false);
    onRevisionRequested?.(revisionFeedback);
    setRevisionFeedback('');
  };

  // Handle reject (discard artifact)
  const handleReject = async () => {
    setIsRejecting(true);
    try {
      const success = await rejectArtifact(projectId, artifact.id);
      if (success) {
        setReviewState('none');
      }
    } finally {
      setIsRejecting(false);
    }
  };

  // Only show for artifacts in review
  if (artifact.status !== 'in_review') {
    return null;
  }

  return (
    <>
      <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <CardTitle className="text-base">{t('planning:review.title')}</CardTitle>
          </div>
          <CardDescription>
            {t('planning:review.description', { title: artifact.title })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleApprove}
              disabled={isApproving || isRejecting}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              {isApproving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {t('planning:review.approve')}
            </Button>
            <Button
              variant="outline"
              onClick={handleRequestRevision}
              disabled={isApproving || isRejecting}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              {t('planning:review.requestRevision')}
            </Button>
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={isApproving || isRejecting}
              className="gap-2 text-destructive hover:text-destructive"
            >
              {isRejecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              {t('planning:review.reject')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Revision feedback dialog */}
      <Dialog open={showRevisionDialog} onOpenChange={setShowRevisionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('planning:review.revisionTitle')}</DialogTitle>
            <DialogDescription>
              {t('planning:review.revisionDescription')}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={revisionFeedback}
            onChange={(e) => setRevisionFeedback(e.target.value)}
            placeholder={t('planning:review.revisionPlaceholder')}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevisionDialog(false)}>
              {t('common:cancel')}
            </Button>
            <Button onClick={handleSubmitRevision} disabled={!revisionFeedback.trim()}>
              {t('planning:review.submitRevision')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
