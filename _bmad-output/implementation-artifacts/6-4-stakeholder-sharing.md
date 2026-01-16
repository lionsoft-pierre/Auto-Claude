# Story 6.4: Stakeholder Sharing

Status: ready-for-dev

## Story

As a **Technical Founder**,
I want **to share planning artifacts with stakeholders**,
so that **my co-founder and team can review plans without full system access**.

## Acceptance Criteria

1. **AC1: Share Artifacts**
   - **Given** planning artifacts exist
   - **When** the user clicks "Share Artifacts"
   - **Then** a shareable view is generated with selected artifacts
   - **And** the view is read-only (no editing capabilities)

2. **AC2: Stakeholder-Friendly View**
   - **Given** a stakeholder is reviewing shared artifacts
   - **When** they view PRD and epic summaries
   - **Then** the content is readable without technical tool knowledge
   - **And** navigation between linked documents works

3. **AC3: Feedback Integration**
   - **Given** a stakeholder provides feedback
   - **When** the Technical Founder receives the feedback
   - **Then** they can add new stories based on suggestions
   - **And** stories can be added to the sprint queue

4. **AC4: Security**
   - **Given** the sharing feature is used
   - **When** artifacts are shared
   - **Then** no sensitive data (tokens, paths) is exposed
   - **And** only planning content is visible

## Tasks / Subtasks

- [ ] **Task 1: Create Share Dialog** (AC: #1)
  - [ ] 1.1: Create `ShareArtifactsDialog.tsx` component
  - [ ] 1.2: Allow selection of artifacts to share
  - [ ] 1.3: Show preview of shareable content
  - [ ] 1.4: Add export format options (Markdown, HTML)

- [ ] **Task 2: Implement export to Markdown** (AC: #1, #4)
  - [ ] 2.1: Create markdown export function
  - [ ] 2.2: Combine selected artifacts into single document
  - [ ] 2.3: Strip frontmatter and internal metadata
  - [ ] 2.4: Sanitize paths and sensitive information

- [ ] **Task 3: Implement export to HTML** (AC: #1, #2)
  - [ ] 3.1: Create HTML export with styling
  - [ ] 3.2: Include CSS for readable formatting
  - [ ] 3.3: Convert markdown to HTML
  - [ ] 3.4: Make internal links work within document

- [ ] **Task 4: Create shareable document structure** (AC: #2)
  - [ ] 4.1: Add table of contents
  - [ ] 4.2: Organize by artifact type
  - [ ] 4.3: Include executive summary section
  - [ ] 4.4: Format for non-technical readers

- [ ] **Task 5: Implement content sanitization** (AC: #4)
  - [ ] 5.1: Remove file paths
  - [ ] 5.2: Remove technical metadata
  - [ ] 5.3: Remove dev agent records
  - [ ] 5.4: Validate no sensitive data exposed

- [ ] **Task 6: Add feedback workflow** (AC: #3)
  - [ ] 6.1: Document feedback process in share dialog
  - [ ] 6.2: Add "Add Story from Feedback" action
  - [ ] 6.3: Create story from feedback template
  - [ ] 6.4: Allow adding to sprint queue

- [ ] **Task 7: Add i18n translations** (AC: #1, #2)
  - [ ] 7.1: Add share dialog labels to `en/planning.json`
  - [ ] 7.2: Add share dialog labels to `fr/planning.json`
  - [ ] 7.3: Add export format labels

- [ ] **Task 8: Write tests** (AC: all)
  - [ ] 8.1: Unit tests for content sanitization
  - [ ] 8.2: Unit tests for markdown/HTML export
  - [ ] 8.3: Test sensitive data removal
  - [ ] 8.4: Component tests for share dialog

## Dev Notes

### Critical Implementation Rules

1. **Security First**: Remove ALL sensitive data before export
2. **Readable Format**: Optimize for non-technical stakeholders
3. **i18n Required**: All labels via translations
4. **MVP Focus**: Export to file for manual sharing (no server)

### Share Dialog Layout

```
┌──────────────────────────────────────────────────────┐
│ Share Planning Artifacts                     [Close] │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Select artifacts to share:                           │
│                                                      │
│ ☑ Product Brief                                      │
│ ☑ PRD                                                │
│ ☑ Architecture                                       │
│ ☑ Epics                                              │
│ ☐ Individual Stories                                 │
│                                                      │
├──────────────────────────────────────────────────────┤
│ Export Format:                                       │
│                                                      │
│ ○ Markdown (.md) - Plain text, easy to share        │
│ ● HTML (.html) - Styled, opens in browser           │
│                                                      │
├──────────────────────────────────────────────────────┤
│ Preview:                                             │
│ ┌──────────────────────────────────────────────────┐│
│ │ # Project Planning: Auto-Claude                  ││
│ │                                                  ││
│ │ ## Table of Contents                             ││
│ │ 1. Product Brief                                 ││
│ │ 2. Product Requirements Document                 ││
│ │ 3. Architecture                                  ││
│ │ ...                                              ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│            [Cancel]  [Export and Download]           │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### ShareArtifactsDialog Component

```tsx
// ShareArtifactsDialog.tsx
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import { Button } from '@/shared/components/ui/button';
import { Download } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const ARTIFACT_OPTIONS = [
  { id: 'product-brief', label: 'planning:share.productBrief' },
  { id: 'prd', label: 'planning:share.prd' },
  { id: 'architecture', label: 'planning:share.architecture' },
  { id: 'epics', label: 'planning:share.epics' },
  { id: 'stories', label: 'planning:share.stories' },
];

export const ShareArtifactsDialog: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation(['planning']);
  const [selectedArtifacts, setSelectedArtifacts] = useState<Set<string>>(
    new Set(['product-brief', 'prd', 'architecture', 'epics'])
  );
  const [format, setFormat] = useState<'markdown' | 'html'>('html');
  const [preview, setPreview] = useState<string>('');

  const toggleArtifact = (id: string) => {
    const next = new Set(selectedArtifacts);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedArtifacts(next);
  };

  const handleExport = async () => {
    const content = await window.electronAPI.exportPlanningArtifacts({
      artifacts: Array.from(selectedArtifacts),
      format,
    });

    // Trigger download
    const blob = new Blob([content], {
      type: format === 'html' ? 'text/html' : 'text/markdown',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planning-artifacts.${format === 'html' ? 'html' : 'md'}`;
    a.click();
    URL.revokeObjectURL(url);

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('planning:share.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Artifact Selection */}
          <div>
            <h4 className="font-medium mb-3">{t('planning:share.selectArtifacts')}</h4>
            <div className="space-y-2">
              {ARTIFACT_OPTIONS.map((option) => (
                <div key={option.id} className="flex items-center gap-2">
                  <Checkbox
                    id={option.id}
                    checked={selectedArtifacts.has(option.id)}
                    onCheckedChange={() => toggleArtifact(option.id)}
                  />
                  <label htmlFor={option.id}>{t(option.label)}</label>
                </div>
              ))}
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <h4 className="font-medium mb-3">{t('planning:share.exportFormat')}</h4>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as typeof format)}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="markdown" id="markdown" />
                <label htmlFor="markdown">
                  {t('planning:share.formatMarkdown')}
                </label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="html" id="html" />
                <label htmlFor="html">
                  {t('planning:share.formatHtml')}
                </label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common:cancel')}
          </Button>
          <Button onClick={handleExport} disabled={selectedArtifacts.size === 0}>
            <Download className="h-4 w-4 mr-2" />
            {t('planning:share.export')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

### Content Sanitization

```typescript
// sanitizer.ts
interface SanitizeOptions {
  removePaths: boolean;
  removeDevRecords: boolean;
  removeFrontmatter: boolean;
}

export function sanitizeArtifactContent(content: string, options: SanitizeOptions = {
  removePaths: true,
  removeDevRecords: true,
  removeFrontmatter: true,
}): string {
  let sanitized = content;

  // Remove YAML frontmatter
  if (options.removeFrontmatter) {
    sanitized = sanitized.replace(/^---\n[\s\S]*?\n---\n/m, '');
  }

  // Remove Dev Agent Record section
  if (options.removeDevRecords) {
    sanitized = sanitized.replace(/## Dev Agent Record[\s\S]*?(?=\n## |$)/g, '');
  }

  // Remove file paths
  if (options.removePaths) {
    // Remove absolute paths
    sanitized = sanitized.replace(/\/Users\/[^\s)]+/g, '[path]');
    sanitized = sanitized.replace(/C:\\[^\s)]+/g, '[path]');

    // Remove .auto-claude paths
    sanitized = sanitized.replace(/\.auto-claude\/[^\s)]+/g, '[project-path]');

    // Remove apps/ paths
    sanitized = sanitized.replace(/apps\/[a-z]+\/src\/[^\s)]+/g, '[source-path]');
  }

  // Remove empty sections
  sanitized = sanitized.replace(/### [^\n]+\n\n(?=###|##|$)/g, '');

  return sanitized.trim();
}
```

### Export Functions

```typescript
// exporter.ts
import { marked } from 'marked';

export async function exportToMarkdown(artifacts: string[]): Promise<string> {
  const sections: string[] = [];

  // Add header
  sections.push(`# Project Planning Documentation\n`);
  sections.push(`Generated: ${new Date().toLocaleDateString()}\n`);

  // Add table of contents
  sections.push(`## Table of Contents\n`);
  artifacts.forEach((id, index) => {
    sections.push(`${index + 1}. ${getArtifactTitle(id)}`);
  });
  sections.push('');

  // Add each artifact
  for (const artifactId of artifacts) {
    const content = await loadArtifact(artifactId);
    const sanitized = sanitizeArtifactContent(content);
    sections.push(sanitized);
    sections.push('\n---\n');
  }

  return sections.join('\n');
}

export async function exportToHtml(artifacts: string[]): Promise<string> {
  const markdown = await exportToMarkdown(artifacts);
  const htmlContent = marked(markdown);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project Planning Documentation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      line-height: 1.6;
      color: #333;
    }
    h1 { border-bottom: 2px solid #333; padding-bottom: 0.5rem; }
    h2 { border-bottom: 1px solid #ddd; padding-bottom: 0.3rem; margin-top: 2rem; }
    h3 { color: #555; }
    code { background: #f4f4f4; padding: 0.2rem 0.4rem; border-radius: 3px; }
    pre { background: #f4f4f4; padding: 1rem; overflow-x: auto; border-radius: 5px; }
    blockquote { border-left: 4px solid #ddd; margin-left: 0; padding-left: 1rem; color: #666; }
    hr { border: none; border-top: 1px solid #ddd; margin: 2rem 0; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; }
    th { background: #f4f4f4; }
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`;
}
```

### i18n Keys

```json
// en/planning.json
{
  "share": {
    "title": "Share Planning Artifacts",
    "selectArtifacts": "Select artifacts to share:",
    "productBrief": "Product Brief",
    "prd": "Product Requirements Document",
    "architecture": "Architecture",
    "epics": "Epics",
    "stories": "Individual Stories",
    "exportFormat": "Export Format:",
    "formatMarkdown": "Markdown (.md) - Plain text, easy to share",
    "formatHtml": "HTML (.html) - Styled, opens in browser",
    "export": "Export and Download",
    "preview": "Preview",
    "feedbackNote": "Ask stakeholders to provide feedback via email or your preferred communication tool. You can then add stories based on their suggestions."
  }
}

// fr/planning.json
{
  "share": {
    "title": "Partager les artefacts de planification",
    "selectArtifacts": "Sélectionner les artefacts à partager:",
    "productBrief": "Brief Produit",
    "prd": "Document des exigences produit",
    "architecture": "Architecture",
    "epics": "Epics",
    "stories": "Stories individuelles",
    "exportFormat": "Format d'export:",
    "formatMarkdown": "Markdown (.md) - Texte brut, facile à partager",
    "formatHtml": "HTML (.html) - Stylisé, s'ouvre dans le navigateur",
    "export": "Exporter et télécharger",
    "preview": "Aperçu",
    "feedbackNote": "Demandez aux parties prenantes de fournir leurs commentaires par email ou votre outil de communication préféré. Vous pouvez ensuite ajouter des stories basées sur leurs suggestions."
  }
}
```

### Project Structure Notes

**New files to create:**
- `apps/frontend/src/renderer/components/planning/ShareArtifactsDialog.tsx`
- `apps/frontend/src/renderer/utils/artifactExporter.ts`
- `apps/frontend/src/renderer/utils/contentSanitizer.ts`

**Existing files to modify:**
- `apps/frontend/src/renderer/views/PlanningView.tsx` - Add share button
- Main process IPC handlers - Add export handler

### References

- [Source: architecture.md#stakeholder-access] - Sharing requirements
- [Source: project-context.md#security] - Data sanitization

### Test Scope

**Unit** - This story focuses on:
- Content sanitization
- Export formatting
- Artifact selection
- Security validation

### Performance Requirements

- Export generation < 5 seconds
- Download starts immediately
- No server dependencies

### Security Checklist

Before export, verify removal of:
- [ ] Absolute file paths
- [ ] OAuth tokens or API keys
- [ ] Internal project paths
- [ ] Dev agent records
- [ ] Debug information
- [ ] System-specific metadata

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### File List
