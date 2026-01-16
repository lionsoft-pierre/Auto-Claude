import { useTranslation } from 'react-i18next';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useArtifactStore } from '../../stores/planning/artifactStore';
import type { PlanningArtifact, ArtifactType } from '../../../shared/types/planning';

/**
 * Get display name for artifact type
 */
function getArtifactTypeLabel(type: ArtifactType, t: (key: string) => string): string {
  const typeMap: Record<ArtifactType, string> = {
    'product-brief': t('planning:workflow.brief'),
    'prd': t('planning:workflow.prd'),
    'architecture': t('planning:workflow.architecture'),
    'epics': t('planning:workflow.epics'),
    'story': t('planning:workflow.stories'),
  };
  return typeMap[type] || type;
}

/**
 * ArtifactBreadcrumb props
 */
interface ArtifactBreadcrumbProps {
  artifact: PlanningArtifact;
  projectId: string;
  onHomeClick?: () => void;
}

/**
 * ArtifactBreadcrumb - Navigation breadcrumb showing artifact hierarchy
 * Story 2.5: Artifact Linking and Navigation
 */
export function ArtifactBreadcrumb({ artifact, projectId, onHomeClick }: ArtifactBreadcrumbProps) {
  const { t } = useTranslation(['planning', 'common']);

  const artifacts = useArtifactStore((state) => state.artifacts);
  const relationships = useArtifactStore((state) => state.relationships);
  const navigateToArtifact = useArtifactStore((state) => state.navigateToArtifact);

  // Build breadcrumb trail from relationships
  const buildBreadcrumbTrail = (): PlanningArtifact['metadata'][] => {
    const trail: PlanningArtifact['metadata'][] = [];
    let currentId = artifact.metadata.id;
    const visited = new Set<string>();

    // Walk up the parent chain
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const rel = relationships.get(currentId);

      if (rel?.parentId) {
        const parentArtifact = artifacts.find(a => a.id === rel.parentId);
        if (parentArtifact) {
          trail.unshift({
            id: parentArtifact.id,
            title: parentArtifact.title,
            type: parentArtifact.type,
            status: parentArtifact.status,
            createdAt: '',
            updatedAt: parentArtifact.updatedAt,
            workflowStep: parentArtifact.type === 'product-brief' ? 'brief' : parentArtifact.type as any,
            author: 'system'
          });
          currentId = rel.parentId;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    // Add current artifact
    trail.push(artifact.metadata);

    return trail;
  };

  const trail = buildBreadcrumbTrail();

  return (
    <nav
      aria-label={t('planning:artifacts.breadcrumb')}
      className="flex items-center gap-1 text-sm overflow-x-auto"
    >
      {/* Home/All Artifacts button */}
      <button
        onClick={onHomeClick}
        className={cn(
          'flex items-center gap-1 px-2 py-1 rounded hover:bg-accent transition-colors',
          'text-muted-foreground hover:text-foreground'
        )}
      >
        <Home className="h-4 w-4" />
        <span className="sr-only">{t('planning:artifacts.allArtifacts')}</span>
      </button>

      {trail.map((item, index) => {
        const isLast = index === trail.length - 1;
        const typeLabel = getArtifactTypeLabel(item.type, t);

        return (
          <div key={item.id} className="flex items-center">
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
            {isLast ? (
              <span className="px-2 py-1 font-medium truncate max-w-[200px]">
                {item.title}
              </span>
            ) : (
              <button
                onClick={() => navigateToArtifact(item.id, projectId)}
                className={cn(
                  'px-2 py-1 rounded hover:bg-accent transition-colors',
                  'text-muted-foreground hover:text-foreground truncate max-w-[150px]'
                )}
                title={`${typeLabel}: ${item.title}`}
              >
                {item.title}
              </button>
            )}
          </div>
        );
      })}
    </nav>
  );
}
