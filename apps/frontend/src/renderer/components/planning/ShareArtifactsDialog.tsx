/**
 * ShareArtifactsDialog Component (Story 6.4)
 * Dialog for exporting and sharing planning artifacts
 */
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { ScrollArea } from '../ui/scroll-area';
import { Download, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  exportArtifacts,
  downloadFile,
  getFileExtension,
  getMimeType,
  type ExportFormat,
  type ArtifactContent
} from '../../utils/artifactExporter';
import { validateSanitization, getShareableTitle } from '../../utils/contentSanitizer';
import { useArtifactStore } from '../../stores/planning/artifactStore';

interface ShareArtifactsDialogProps {
  projectId: string;
  projectName?: string;
  open: boolean;
  onClose: () => void;
}

interface ArtifactOption {
  id: string;
  type: string;
  label: string;
  available: boolean;
}

const ARTIFACT_ORDER = ['product-brief', 'prd', 'architecture', 'epics', 'stories'];

export function ShareArtifactsDialog({
  projectId,
  projectName = 'Project',
  open,
  onClose
}: ShareArtifactsDialogProps) {
  const { t } = useTranslation(['planning', 'common']);
  const { artifacts, loadArtifacts } = useArtifactStore();

  const [selectedArtifacts, setSelectedArtifacts] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<ExportFormat>('html');
  const [isExporting, setIsExporting] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // Load artifacts when dialog opens
  useEffect(() => {
    if (open) {
      loadArtifacts(projectId);
    }
  }, [open, projectId, loadArtifacts]);

  // Build artifact options from loaded artifacts
  const artifactOptions = useMemo<ArtifactOption[]>(() => {
    const options: ArtifactOption[] = ARTIFACT_ORDER.map(type => {
      const artifact = artifacts.find(a => a.type === type);
      return {
        id: type,
        type,
        label: t(`planning:share.${type.replace('-', '')}`) || getShareableTitle(type),
        available: !!artifact
      };
    });
    return options;
  }, [artifacts, t]);

  // Select all available artifacts by default
  useEffect(() => {
    if (open && artifacts.length > 0) {
      const available = artifactOptions
        .filter(opt => opt.available)
        .map(opt => opt.id);
      setSelectedArtifacts(new Set(available.slice(0, 4))); // Select first 4 by default
    }
  }, [open, artifacts, artifactOptions]);

  const toggleArtifact = (id: string) => {
    setSelectedArtifacts(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExport = async () => {
    if (selectedArtifacts.size === 0) return;

    setIsExporting(true);
    setValidationWarnings([]);

    try {
      // Collect artifact contents
      const contents: ArtifactContent[] = [];
      const warnings: string[] = [];

      for (const type of ARTIFACT_ORDER) {
        if (!selectedArtifacts.has(type)) continue;

        const artifactSummary = artifacts.find(a => a.type === type);
        if (!artifactSummary) continue;

        // Load full artifact to get content
        const result = await window.electronAPI.loadPlanningArtifact(projectId, artifactSummary.id);
        if (!result.success || !result.data) continue;

        const fullArtifact = result.data;

        // Validate sanitization
        const validation = validateSanitization(fullArtifact.content);
        if (!validation.isValid) {
          warnings.push(...validation.issues.map(issue =>
            `${getShareableTitle(type)}: ${issue}`
          ));
        }

        contents.push({
          type,
          title: fullArtifact.metadata.title || getShareableTitle(type),
          content: fullArtifact.content
        });
      }

      if (warnings.length > 0) {
        setValidationWarnings(warnings);
      }

      // Export
      const exportedContent = exportArtifacts(contents, {
        artifacts: Array.from(selectedArtifacts),
        format,
        projectName,
        includeTableOfContents: true
      });

      // Download
      const filename = `${projectName.toLowerCase().replace(/\s+/g, '-')}-planning.${getFileExtension(format)}`;
      downloadFile(exportedContent, filename, getMimeType(format));

      // Close dialog after short delay
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const selectedCount = selectedArtifacts.size;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('planning:share.title')}</DialogTitle>
          <DialogDescription>
            {t('planning:share.feedbackNote')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Artifact Selection */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              {t('planning:share.selectArtifacts')}
            </Label>
            <ScrollArea className="h-[180px] border rounded-md p-3">
              <div className="space-y-3">
                {artifactOptions.map((option) => (
                  <div
                    key={option.id}
                    className={cn(
                      'flex items-center gap-3',
                      !option.available && 'opacity-50'
                    )}
                  >
                    <Checkbox
                      id={option.id}
                      checked={selectedArtifacts.has(option.id)}
                      onCheckedChange={() => toggleArtifact(option.id)}
                      disabled={!option.available}
                    />
                    <label
                      htmlFor={option.id}
                      className={cn(
                        'flex items-center gap-2 text-sm cursor-pointer',
                        !option.available && 'cursor-not-allowed'
                      )}
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {option.label}
                      {!option.available && (
                        <span className="text-xs text-muted-foreground">
                          ({t('common:notAvailable')})
                        </span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Format Selection */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              {t('planning:share.exportFormat')}
            </Label>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as ExportFormat)}
              className="space-y-2"
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value="html" id="format-html" />
                <label htmlFor="format-html" className="text-sm cursor-pointer">
                  {t('planning:share.formatHtml')}
                </label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem value="markdown" id="format-markdown" />
                <label htmlFor="format-markdown" className="text-sm cursor-pointer">
                  {t('planning:share.formatMarkdown')}
                </label>
              </div>
            </RadioGroup>
          </div>

          {/* Validation Warnings */}
          {validationWarnings.length > 0 && (
            <div className="border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 rounded-md p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Content warnings
                  </p>
                  <ul className="text-xs text-amber-700 dark:text-amber-300 mt-1 space-y-0.5">
                    {validationWarnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common:cancel')}
          </Button>
          <Button
            onClick={handleExport}
            disabled={selectedCount === 0 || isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {t('planning:share.export')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
