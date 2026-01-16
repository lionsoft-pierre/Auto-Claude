import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Clock, Edit3, FileText, ExternalLink, ArrowLeft, Pencil } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { useArtifactStore } from '../../stores/planning/artifactStore';
import type { PlanningArtifact, ArtifactStatus } from '../../../shared/types/planning';

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: ArtifactStatus }) {
  const { t } = useTranslation(['planning']);

  const variants: Record<ArtifactStatus, { icon: typeof Check; className: string }> = {
    approved: { icon: Check, className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    in_review: { icon: Clock, className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
    draft: { icon: Edit3, className: 'bg-muted text-muted-foreground' },
  };

  const { icon: Icon, className } = variants[status];

  return (
    <Badge variant="outline" className={cn('gap-1', className)}>
      <Icon className="h-3 w-3" />
      {t(`planning:artifacts.status.${status}`)}
    </Badge>
  );
}

/**
 * Parse internal links in markdown content
 * Format: [[artifact-type:section]] or [[artifact-type]]
 */
function parseArtifactLinks(content: string): string {
  // Replace [[artifact:section]] with clickable links
  return content.replace(
    /\[\[([a-z-]+)(?::([^\]]+))?\]\]/g,
    (_, artifactType, section) => {
      const linkText = section ? `${artifactType}#${section}` : artifactType;
      return `[${linkText}](artifact://${artifactType}${section ? `#${section}` : ''})`;
    }
  );
}

/**
 * Custom link component for artifact navigation
 */
interface ArtifactLinkProps {
  href?: string;
  children?: React.ReactNode;
  projectId: string;
}

function ArtifactLink({ href, children, projectId }: ArtifactLinkProps) {
  const navigateToArtifact = useArtifactStore((state) => state.navigateToArtifact);
  const artifacts = useArtifactStore((state) => state.artifacts);

  if (href?.startsWith('artifact://')) {
    const [artifactType, section] = href.replace('artifact://', '').split('#');

    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      // Find artifact by type
      const artifact = artifacts.find(a => a.type === artifactType || a.type === `product-${artifactType}`);
      if (artifact) {
        navigateToArtifact(artifact.id, projectId, section);
      }
    };

    return (
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1 text-primary hover:underline"
      >
        {children}
        <ExternalLink className="h-3 w-3" />
      </button>
    );
  }

  // External link
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
      {children}
    </a>
  );
}

/**
 * ArtifactViewer props
 */
interface ArtifactViewerProps {
  artifact: PlanningArtifact;
  projectId: string;
  onEdit?: () => void;
}

/**
 * ArtifactViewer - Renders artifact content with markdown and linking
 * Story 2.4: Artifact Viewing and Editing
 * Story 2.5: Artifact Linking and Navigation
 */
export function ArtifactViewer({ artifact, projectId, onEdit }: ArtifactViewerProps) {
  const { t } = useTranslation(['planning']);

  const navigationHistory = useArtifactStore((state) => state.navigationHistory);
  const navigateBack = useArtifactStore((state) => state.navigateBack);

  // Parse content for internal links
  const processedContent = useMemo(() => {
    return parseArtifactLinks(artifact.content);
  }, [artifact.content]);

  const canGoBack = navigationHistory.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-3">
          {canGoBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateBack(projectId)}
              className="gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('common:back')}
            </Button>
          )}
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">{artifact.metadata.title}</h2>
          </div>
          <StatusBadge status={artifact.metadata.status} />
        </div>
        {onEdit && artifact.metadata.status !== 'approved' && (
          <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
            <Pencil className="h-4 w-4" />
            {t('common:edit')}
          </Button>
        )}
      </div>

      {/* Metadata */}
      <div className="px-4 py-2 border-b bg-muted/30 text-xs text-muted-foreground flex items-center gap-4">
        <span>
          {t('planning:artifacts.createdAt')}: {new Date(artifact.metadata.createdAt).toLocaleDateString()}
        </span>
        <span>
          {t('planning:artifacts.updatedAt')}: {new Date(artifact.metadata.updatedAt).toLocaleDateString()}
        </span>
        {artifact.metadata.approvedAt && (
          <span className="text-green-600 dark:text-green-400">
            {t('planning:artifacts.approvedAt')}: {new Date(artifact.metadata.approvedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ href, children }) => (
                <ArtifactLink href={href} projectId={projectId}>
                  {children}
                </ArtifactLink>
              ),
              // Add IDs to headings for section navigation
              h1: ({ children }) => {
                const id = typeof children === 'string'
                  ? children.toLowerCase().replace(/\s+/g, '-')
                  : undefined;
                return <h1 id={id}>{children}</h1>;
              },
              h2: ({ children }) => {
                const id = typeof children === 'string'
                  ? children.toLowerCase().replace(/\s+/g, '-')
                  : undefined;
                return <h2 id={id}>{children}</h2>;
              },
              h3: ({ children }) => {
                const id = typeof children === 'string'
                  ? children.toLowerCase().replace(/\s+/g, '-')
                  : undefined;
                return <h3 id={id}>{children}</h3>;
              },
            }}
          >
            {processedContent}
          </ReactMarkdown>
        </div>
      </ScrollArea>
    </div>
  );
}
