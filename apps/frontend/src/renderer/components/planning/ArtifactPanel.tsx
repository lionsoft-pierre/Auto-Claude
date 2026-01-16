import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Lightbulb,
  Boxes,
  Layers,
  BookOpen,
  Check,
  Clock,
  Edit3,
  Loader2,
  FolderOpen
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useArtifactStore } from '../../stores/planning/artifactStore';
import type { ArtifactSummary, ArtifactType, ArtifactStatus } from '../../../shared/types/planning';
import { ScrollArea } from '../ui/scroll-area';

/**
 * Icon mapping for artifact types
 */
const ARTIFACT_ICONS: Record<ArtifactType, typeof FileText> = {
  'product-brief': Lightbulb,
  'prd': FileText,
  'architecture': Boxes,
  'epics': Layers,
  'story': BookOpen,
};

/**
 * Status icon component
 */
function StatusIcon({ status }: { status: ArtifactStatus }) {
  switch (status) {
    case 'approved':
      return <Check className="h-3 w-3 text-green-500" />;
    case 'in_review':
      return <Clock className="h-3 w-3 text-yellow-500" />;
    case 'draft':
    default:
      return <Edit3 className="h-3 w-3 text-muted-foreground" />;
  }
}

/**
 * Single artifact item in the list
 */
interface ArtifactItemProps {
  artifact: ArtifactSummary;
  isSelected: boolean;
  onSelect: () => void;
}

function ArtifactItem({ artifact, isSelected, onSelect }: ArtifactItemProps) {
  const { t } = useTranslation(['planning']);
  const Icon = ARTIFACT_ICONS[artifact.type];

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        isSelected && 'bg-accent text-accent-foreground'
      )}
    >
      <div className={cn(
        'flex h-8 w-8 items-center justify-center rounded-md',
        artifact.status === 'approved' && 'bg-green-100 dark:bg-green-900/30',
        artifact.status === 'in_review' && 'bg-yellow-100 dark:bg-yellow-900/30',
        artifact.status === 'draft' && 'bg-muted'
      )}>
        <Icon className={cn(
          'h-4 w-4',
          artifact.status === 'approved' && 'text-green-600 dark:text-green-400',
          artifact.status === 'in_review' && 'text-yellow-600 dark:text-yellow-400',
          artifact.status === 'draft' && 'text-muted-foreground'
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{artifact.title}</span>
          <StatusIcon status={artifact.status} />
        </div>
        <span className="text-xs text-muted-foreground">
          {t(`planning:workflow.${artifact.type === 'product-brief' ? 'brief' : artifact.type}`)}
        </span>
      </div>
    </button>
  );
}

/**
 * Artifact panel props
 */
interface ArtifactPanelProps {
  projectId: string;
}

/**
 * ArtifactPanel - Displays list of planning artifacts in a sidebar
 * Story 2.4: Artifact Viewing and Editing
 */
export function ArtifactPanel({ projectId }: ArtifactPanelProps) {
  const { t } = useTranslation(['planning']);

  const artifacts = useArtifactStore((state) => state.artifacts);
  const selectedArtifact = useArtifactStore((state) => state.selectedArtifact);
  const isLoading = useArtifactStore((state) => state.isLoading);
  const loadArtifacts = useArtifactStore((state) => state.loadArtifacts);
  const selectArtifact = useArtifactStore((state) => state.selectArtifact);

  // Load artifacts on mount
  useEffect(() => {
    loadArtifacts(projectId);
  }, [projectId, loadArtifacts]);

  // Handle artifact selection
  const handleSelect = (artifactId: string) => {
    selectArtifact(artifactId, projectId);
  };

  if (isLoading && artifacts.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (artifacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-center px-4">
        <FolderOpen className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          {t('planning:artifacts.empty')}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {t('planning:artifacts.emptyDescription')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b">
        <h3 className="text-sm font-semibold">{t('planning:artifacts.title')}</h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {artifacts.map((artifact) => (
            <ArtifactItem
              key={artifact.id}
              artifact={artifact}
              isSelected={selectedArtifact?.metadata.id === artifact.id}
              onSelect={() => handleSelect(artifact.id)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
