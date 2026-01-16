/**
 * Artifact Exporter Utility (Story 6.4)
 * Exports planning artifacts to Markdown or HTML format
 */

import { sanitizeArtifactContent, getShareableTitle } from './contentSanitizer';

export type ExportFormat = 'markdown' | 'html';

export interface ExportOptions {
  artifacts: string[];
  format: ExportFormat;
  projectName?: string;
  includeTableOfContents?: boolean;
}

export interface ArtifactContent {
  type: string;
  title: string;
  content: string;
}

/**
 * Generate table of contents from artifact list
 */
function generateTableOfContents(artifacts: ArtifactContent[]): string {
  const lines = ['## Table of Contents\n'];
  artifacts.forEach((artifact, index) => {
    const anchor = artifact.title.toLowerCase().replace(/\s+/g, '-');
    lines.push(`${index + 1}. [${artifact.title}](#${anchor})`);
  });
  lines.push('');
  return lines.join('\n');
}

/**
 * Export artifacts to Markdown format
 */
export function exportToMarkdown(
  artifacts: ArtifactContent[],
  options: Partial<ExportOptions> = {}
): string {
  const sections: string[] = [];
  const projectName = options.projectName || 'Project';

  // Add header
  sections.push(`# ${projectName} - Planning Documentation\n`);
  sections.push(`> Generated: ${new Date().toLocaleDateString()}\n`);

  // Add table of contents
  if (options.includeTableOfContents !== false) {
    sections.push(generateTableOfContents(artifacts));
  }

  // Add each artifact
  artifacts.forEach((artifact) => {
    const sanitized = sanitizeArtifactContent(artifact.content);

    // Check if content already starts with a heading
    const hasHeading = sanitized.startsWith('#');

    if (hasHeading) {
      sections.push(sanitized);
    } else {
      sections.push(`## ${artifact.title}\n`);
      sections.push(sanitized);
    }
    sections.push('\n---\n');
  });

  return sections.join('\n').trim();
}

/**
 * Convert Markdown to HTML (simple conversion)
 */
function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Convert headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Convert bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Convert links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Convert code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Convert blockquotes
  html = html.replace(/^>\s*(.+)$/gm, '<blockquote>$1</blockquote>');

  // Convert unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Convert ordered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

  // Convert horizontal rules
  html = html.replace(/^---$/gm, '<hr>');

  // Convert paragraphs
  html = html.replace(/^(?!<[a-z]|$)(.+)$/gm, '<p>$1</p>');

  // Clean up extra newlines
  html = html.replace(/\n{2,}/g, '\n');

  return html;
}

/**
 * Export artifacts to HTML format with styling
 */
export function exportToHtml(
  artifacts: ArtifactContent[],
  options: Partial<ExportOptions> = {}
): string {
  const markdown = exportToMarkdown(artifacts, options);
  const htmlContent = markdownToHtml(markdown);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.projectName || 'Project'} - Planning Documentation</title>
  <style>
    :root {
      --text-color: #1a1a1a;
      --bg-color: #ffffff;
      --muted-color: #666666;
      --border-color: #e5e5e5;
      --code-bg: #f4f4f4;
      --link-color: #0066cc;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --text-color: #e5e5e5;
        --bg-color: #1a1a1a;
        --muted-color: #999999;
        --border-color: #333333;
        --code-bg: #2d2d2d;
        --link-color: #66b3ff;
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      line-height: 1.7;
      color: var(--text-color);
      background-color: var(--bg-color);
    }
    h1 {
      border-bottom: 2px solid var(--text-color);
      padding-bottom: 0.5rem;
      margin-top: 0;
    }
    h2 {
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 0.3rem;
      margin-top: 2.5rem;
    }
    h3 {
      color: var(--muted-color);
      margin-top: 2rem;
    }
    a {
      color: var(--link-color);
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    code {
      background: var(--code-bg);
      padding: 0.2rem 0.4rem;
      border-radius: 3px;
      font-size: 0.9em;
    }
    pre {
      background: var(--code-bg);
      padding: 1rem;
      overflow-x: auto;
      border-radius: 6px;
    }
    pre code {
      background: none;
      padding: 0;
    }
    blockquote {
      border-left: 4px solid var(--border-color);
      margin-left: 0;
      padding-left: 1rem;
      color: var(--muted-color);
      font-style: italic;
    }
    hr {
      border: none;
      border-top: 1px solid var(--border-color);
      margin: 2.5rem 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1rem 0;
    }
    th, td {
      border: 1px solid var(--border-color);
      padding: 0.5rem 0.75rem;
      text-align: left;
    }
    th {
      background: var(--code-bg);
    }
    ul, ol {
      padding-left: 1.5rem;
    }
    li {
      margin: 0.25rem 0;
    }
    .generated-date {
      color: var(--muted-color);
      font-size: 0.9em;
      margin-bottom: 2rem;
    }
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`;
}

/**
 * Export artifacts based on format
 */
export function exportArtifacts(
  artifacts: ArtifactContent[],
  options: ExportOptions
): string {
  if (options.format === 'html') {
    return exportToHtml(artifacts, options);
  }
  return exportToMarkdown(artifacts, options);
}

/**
 * Trigger file download in browser
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Get file extension for format
 */
export function getFileExtension(format: ExportFormat): string {
  return format === 'html' ? 'html' : 'md';
}

/**
 * Get MIME type for format
 */
export function getMimeType(format: ExportFormat): string {
  return format === 'html' ? 'text/html' : 'text/markdown';
}
