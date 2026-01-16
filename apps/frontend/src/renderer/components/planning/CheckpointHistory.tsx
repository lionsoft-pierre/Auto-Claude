import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GitCommit, Plus, Loader2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '../../lib/utils';
import { useSessionStore } from '../../stores/planning/sessionStore';
import type { CheckpointEntry } from '../../../shared/types/planning';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';

/**
 * Single checkpoint item
 */
interface CheckpointItemProps {
  checkpoint: CheckpointEntry;
  isLatest: boolean;
}

function CheckpointItem({ checkpoint, isLatest }: CheckpointItemProps) {
  const { t } = useTranslation(['planning']);

  const formattedDate = new Date(checkpoint.date).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-3 py-2 rounded-lg',
        isLatest && 'bg-primary/5 border border-primary/20'
      )}
    >
      <div className={cn(
        'flex h-8 w-8 items-center justify-center rounded-full',
        isLatest ? 'bg-primary/10' : 'bg-muted'
      )}>
        <GitCommit className={cn(
          'h-4 w-4',
          isLatest ? 'text-primary' : 'text-muted-foreground'
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono text-muted-foreground">
            {checkpoint.hash.substring(0, 7)}
          </code>
          {isLatest && (
            <span className="text-xs text-primary font-medium">
              {t('planning:checkpoints.latest')}
            </span>
          )}
        </div>
        <p className="text-sm truncate">{checkpoint.message}</p>
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formattedDate}
        </div>
      </div>
    </div>
  );
}

/**
 * CheckpointHistory props
 */
interface CheckpointHistoryProps {
  projectId: string;
}

/**
 * CheckpointHistory - Displays git checkpoint history and allows creating new checkpoints
 * Story 2.6: Git Checkpoint Commits
 */
export function CheckpointHistory({ projectId }: CheckpointHistoryProps) {
  const { t } = useTranslation(['planning']);

  const checkpoints = useSessionStore((state) => state.checkpoints);
  const lastCheckpointHash = useSessionStore((state) => state.lastCheckpointHash);
  const createCheckpoint = useSessionStore((state) => state.createCheckpoint);
  const loadCheckpoints = useSessionStore((state) => state.loadCheckpoints);

  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load checkpoints on mount
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await loadCheckpoints(projectId);
      setIsLoading(false);
    };
    load();
  }, [projectId, loadCheckpoints]);

  // Handle create checkpoint
  const handleCreateCheckpoint = async () => {
    setIsCreating(true);
    try {
      await createCheckpoint(projectId);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg">
        <CollapsibleTrigger asChild>
          <button
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <GitCommit className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{t('planning:checkpoints.title')}</span>
              {checkpoints.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({checkpoints.length})
                </span>
              )}
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t px-4 py-3">
            {/* Create checkpoint button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateCheckpoint}
              disabled={isCreating}
              className="w-full mb-3 gap-2"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {t('planning:checkpoints.create')}
            </Button>

            {/* Checkpoint list */}
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : checkpoints.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                {t('planning:checkpoints.empty')}
              </div>
            ) : (
              <ScrollArea className="max-h-48">
                <div className="space-y-2">
                  {checkpoints.map((checkpoint, index) => (
                    <CheckpointItem
                      key={checkpoint.hash}
                      checkpoint={checkpoint}
                      isLatest={index === 0 || checkpoint.hash === lastCheckpointHash}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
