/**
 * Content Sanitizer Utility (Story 6.4)
 * Removes sensitive data from artifacts before sharing
 */

export interface SanitizeOptions {
  removePaths: boolean;
  removeDevRecords: boolean;
  removeFrontmatter: boolean;
  removeTaskIds: boolean;
}

const DEFAULT_OPTIONS: SanitizeOptions = {
  removePaths: true,
  removeDevRecords: true,
  removeFrontmatter: true,
  removeTaskIds: true
};

/**
 * Sanitize artifact content by removing sensitive information
 */
export function sanitizeArtifactContent(
  content: string,
  options: Partial<SanitizeOptions> = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let sanitized = content;

  // Remove YAML frontmatter
  if (opts.removeFrontmatter) {
    sanitized = sanitized.replace(/^---\n[\s\S]*?\n---\n/m, '');
  }

  // Remove Dev Agent Record section
  if (opts.removeDevRecords) {
    sanitized = sanitized.replace(
      /## Dev Agent Record[\s\S]*?(?=\n## (?!Dev Agent)|$)/g,
      ''
    );
    // Also remove Agent Model Used, Debug Log References, Completion Notes, File List
    sanitized = sanitized.replace(
      /### (Agent Model Used|Debug Log References|Completion Notes List|File List)[\s\S]*?(?=\n### |\n## |$)/g,
      ''
    );
  }

  // Remove file paths
  if (opts.removePaths) {
    // Remove Unix absolute paths
    sanitized = sanitized.replace(/\/Users\/[^\s)"'`]+/g, '[path]');
    sanitized = sanitized.replace(/\/home\/[^\s)"'`]+/g, '[path]');

    // Remove Windows absolute paths
    sanitized = sanitized.replace(/[A-Z]:\\[^\s)"'`]+/gi, '[path]');

    // Remove .auto-claude paths
    sanitized = sanitized.replace(/\.auto-claude\/[^\s)"'`]+/g, '[project-path]');

    // Remove apps/ source paths (but keep readable)
    sanitized = sanitized.replace(
      /apps\/(backend|frontend)\/src\/[^\s)"'`]+/g,
      '[source-path]'
    );
  }

  // Remove task/story IDs (UUIDs)
  if (opts.removeTaskIds) {
    // Don't remove IDs that are in meaningful context
    // Only remove standalone UUID references
    sanitized = sanitized.replace(
      /(?:taskId|storyId|id):\s*["']?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}["']?/gi,
      ''
    );
  }

  // Remove OAuth tokens and API keys
  sanitized = sanitized.replace(
    /(?:token|apiKey|api_key|secret|password)[\s:="']+[^\s"'`\n]+/gi,
    '[REDACTED]'
  );

  // Remove empty sections (#### headers with no content)
  sanitized = sanitized.replace(/####\s+[^\n]+\n\n(?=####|###|##|$)/g, '');

  // Remove multiple consecutive blank lines
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

  return sanitized.trim();
}

/**
 * Validate that content has been properly sanitized
 */
export function validateSanitization(content: string): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for remaining absolute paths
  if (/\/Users\/|\/home\/|[A-Z]:\\/i.test(content)) {
    issues.push('Contains absolute file paths');
  }

  // Check for potential tokens/keys
  if (/(?:token|apiKey|secret|password)\s*[:=]/i.test(content)) {
    issues.push('May contain sensitive credentials');
  }

  // Check for .auto-claude paths
  if (/\.auto-claude\//.test(content)) {
    issues.push('Contains internal project paths');
  }

  // Check for Dev Agent Record
  if (/## Dev Agent Record/.test(content)) {
    issues.push('Contains Dev Agent Record section');
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Get artifact title suitable for sharing
 */
export function getShareableTitle(type: string): string {
  const titles: Record<string, string> = {
    'product-brief': 'Product Brief',
    'prd': 'Product Requirements Document',
    'architecture': 'Architecture',
    'epics': 'Epics',
    'stories': 'Stories'
  };
  return titles[type] || type;
}
