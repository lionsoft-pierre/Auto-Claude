/**
 * Failure Log Parser Utility (Story 6.2)
 * Parses failure log entries from story markdown files
 */

export interface FailureLogEntry {
  attemptNumber: number;
  timestamp: string;
  duration: string;
  durationSeconds: number;
  phase: string;
  summary: string;
  analysis: string;
  fixes: string;
  rawError: string;
  artifacts: { name: string; path: string }[];
}

export interface ParsedFailureData {
  storyId: string;
  storyTitle: string;
  status: string;
  entries: FailureLogEntry[];
  latestEntry: FailureLogEntry | null;
}

/**
 * Extract a section from content using header pattern
 */
function extractSection(content: string, sectionName: string): string {
  const pattern = new RegExp(`#### ${sectionName}\\n([\\s\\S]*?)(?=####|###|$)`, 'i');
  const match = content.match(pattern);
  return match ? match[1].trim() : '';
}

/**
 * Extract a metadata field like "**Status:** Failed"
 */
function extractMetaField(content: string, fieldName: string): string {
  const pattern = new RegExp(`\\*\\*${fieldName}:\\*\\*\\s*(.+?)(?:\\n|$)`, 'i');
  const match = content.match(pattern);
  return match ? match[1].trim() : '';
}

/**
 * Extract code block content
 */
function extractCodeBlock(content: string, sectionName: string): string {
  const sectionContent = extractSection(content, sectionName);
  const codeBlockMatch = sectionContent.match(/```[\w]*\n([\s\S]*?)```/);
  return codeBlockMatch ? codeBlockMatch[1].trim() : sectionContent;
}

/**
 * Parse artifact links from content
 */
function parseArtifactLinks(content: string): { name: string; path: string }[] {
  const artifactSection = extractSection(content, 'Artifacts');
  if (!artifactSection) return [];

  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  const artifacts: { name: string; path: string }[] = [];
  let match;

  while ((match = linkPattern.exec(artifactSection)) !== null) {
    artifacts.push({
      name: match[1],
      path: match[2]
    });
  }

  return artifacts;
}

/**
 * Parse duration string to seconds
 */
function parseDuration(durationStr: string): number {
  let seconds = 0;

  // Parse "Xm Ys" or "X minutes Y seconds" format
  const minutesMatch = durationStr.match(/(\d+)\s*m(?:inutes?)?/i);
  const secondsMatch = durationStr.match(/(\d+)\s*s(?:econds?)?/i);

  if (minutesMatch) {
    seconds += parseInt(minutesMatch[1], 10) * 60;
  }
  if (secondsMatch) {
    seconds += parseInt(secondsMatch[1], 10);
  }

  return seconds;
}

/**
 * Parse failure log entries from story markdown content
 */
export function parseFailureLog(storyContent: string): FailureLogEntry[] {
  const entries: FailureLogEntry[] = [];

  // Find Failure Log section
  const failureLogMatch = storyContent.match(/## Failure Log\n([\s\S]*?)(?=\n## (?!Failure)|$)/);
  if (!failureLogMatch) return entries;

  const failureLogContent = failureLogMatch[1];

  // Parse individual attempts
  const attemptPattern = /### Attempt (\d+) - ([\d\-T:.Z]+)\n([\s\S]*?)(?=### Attempt|$)/g;
  let match;

  while ((match = attemptPattern.exec(failureLogContent)) !== null) {
    const [, attemptNum, timestamp, content] = match;

    const durationStr = extractMetaField(content, 'Duration');
    const entry: FailureLogEntry = {
      attemptNumber: parseInt(attemptNum, 10),
      timestamp,
      duration: durationStr,
      durationSeconds: parseDuration(durationStr),
      phase: extractMetaField(content, 'Phase'),
      summary: extractSection(content, 'Error Summary'),
      analysis: extractSection(content, 'AI Analysis'),
      fixes: extractSection(content, 'Suggested Fixes'),
      rawError: extractCodeBlock(content, 'Raw Error Output'),
      artifacts: parseArtifactLinks(content)
    };

    entries.push(entry);
  }

  return entries;
}

/**
 * Parse full failure data from story content including metadata
 */
export function parseFailureData(
  storyId: string,
  storyContent: string
): ParsedFailureData {
  // Extract frontmatter title
  const titleMatch = storyContent.match(/title:\s*(.+?)(?:\n|$)/);
  const storyTitle = titleMatch ? titleMatch[1].trim() : storyId;

  // Extract status
  const statusMatch = storyContent.match(/status:\s*(.+?)(?:\n|$)/);
  const status = statusMatch ? statusMatch[1].trim() : 'unknown';

  // Parse failure entries
  const entries = parseFailureLog(storyContent);

  return {
    storyId,
    storyTitle,
    status,
    entries,
    latestEntry: entries.length > 0 ? entries[entries.length - 1] : null
  };
}

/**
 * Get failure summary from the latest entry
 */
export function getFailureSummary(content: string): string {
  const entries = parseFailureLog(content);
  if (entries.length === 0) return '';
  return entries[entries.length - 1].summary;
}

/**
 * Get attempt count from story content
 */
export function getAttemptCount(content: string): number {
  const entries = parseFailureLog(content);
  return entries.length;
}
