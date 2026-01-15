# Changelog System

This document explains Auto-Claude's AI-powered changelog generation system, which creates release notes from specs, git history, or branch comparisons.

**Target Audience:** Developers building features related to releases, changelogs, or version management.

---

## Overview

The changelog system uses Claude AI to generate professional release notes from multiple sources:

1. **Tasks Mode**: Generate from completed specs
2. **Git History Mode**: Generate from commit history
3. **Branch Diff Mode**: Generate from changes between branches

**Key Features:**
- AI-powered content generation
- Multiple output formats (Keep-a-Changelog, Simple List, GitHub Release)
- Audience targeting (technical, user-facing, marketing)
- Semantic version suggestion
- Rate limit handling
- Progress streaming

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     ChangelogService                            │
│           (apps/frontend/src/main/changelog-service.ts)         │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Changelog     │    │ Version       │    │ Git           │
│ Generator     │    │ Suggester     │    │ Integration   │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Claude AI     │    │ Claude Haiku  │    │ Git CLI       │
│ (Subprocess)  │    │ (Fast model)  │    │ (Commands)    │
└───────────────┘    └───────────────┘    └───────────────┘
```

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| **ChangelogService** | `changelog-service.ts` | IPC handler registration |
| **ChangelogGenerator** | `generator.ts` | AI changelog generation |
| **VersionSuggester** | `version-suggester.ts` | AI version bump suggestions |
| **GitIntegration** | `git-integration.ts` | Git commit retrieval |
| **Parser** | `parser.ts` | Extract changelog from AI output |
| **Formatter** | `formatter.ts` | Build prompts and scripts |
| **Types** | `types.ts` | TypeScript type definitions |

---

## Data Models

### ChangelogGenerationRequest

Request to generate a changelog:

```typescript
interface ChangelogGenerationRequest {
  // Version info
  version: string;                    // e.g., "2.1.0"
  date?: string;                      // Release date

  // Source mode
  sourceMode: 'tasks' | 'git-history' | 'branch-diff';

  // For tasks mode
  taskIds?: string[];                 // Spec IDs to include

  // For git-history mode
  gitHistory?: {
    fromTag?: string;                 // Starting tag/commit
    toTag?: string;                   // Ending tag/commit
    count?: number;                   // Number of commits
  };

  // For branch-diff mode
  branchDiff?: {
    baseBranch: string;               // e.g., "main"
    compareBranch: string;            // e.g., "release/2.1"
  };

  // Output options
  format: 'keep-a-changelog' | 'simple-list' | 'github-release';
  audience: 'technical' | 'user-facing' | 'marketing';
  customInstructions?: string;
}
```

### ChangelogGenerationResult

Result from generation:

```typescript
interface ChangelogGenerationResult {
  success: boolean;
  changelog: string;                  // Generated markdown
  version: string;
  tasksIncluded: number;              // Items processed
}
```

### ChangelogGenerationProgress

Progress updates during generation:

```typescript
interface ChangelogGenerationProgress {
  stage: 'loading_specs' | 'loading_commits' | 'generating' | 'formatting' | 'complete' | 'error';
  progress: number;                   // 0-100
  message: string;
  error?: string;
}
```

### VersionSuggestion

AI-suggested version bump:

```typescript
interface VersionSuggestion {
  version: string;                    // Suggested new version
  reason: string;                     // Explanation
  bumpType: 'major' | 'minor' | 'patch';
}
```

---

## Source Modes

### Tasks Mode

Generate changelog from completed specs:

```typescript
// Request
{
  sourceMode: 'tasks',
  taskIds: ['001-add-auth', '002-fix-bug'],
  version: '2.1.0',
  format: 'keep-a-changelog',
  audience: 'user-facing'
}
```

**Input:** Spec files (spec.md) with descriptions and acceptance criteria

**Best for:** Release notes based on planned features

### Git History Mode

Generate from commit history:

```typescript
// Request
{
  sourceMode: 'git-history',
  gitHistory: {
    fromTag: 'v2.0.0',
    toTag: 'HEAD',
    count: 50
  },
  version: '2.1.0',
  format: 'github-release',
  audience: 'technical'
}
```

**Input:** Git commits between tags or by count

**Best for:** Detailed technical changelogs

### Branch Diff Mode

Generate from branch comparison:

```typescript
// Request
{
  sourceMode: 'branch-diff',
  branchDiff: {
    baseBranch: 'main',
    compareBranch: 'release/2.1'
  },
  version: '2.1.0',
  format: 'simple-list',
  audience: 'marketing'
}
```

**Input:** Commits unique to compare branch

**Best for:** Release candidate notes

---

## Output Formats

### Keep-a-Changelog

Standard changelog format:

```markdown
## [2.1.0] - 2025-01-15

### Added
- User authentication with JWT tokens
- Password reset functionality

### Changed
- Improved error messages in login flow

### Fixed
- Session timeout issue (#123)

### Security
- Updated dependencies to patch CVE-2025-1234
```

### Simple List

Minimal bullet list:

```markdown
## Version 2.1.0

- Added user authentication with JWT tokens
- Added password reset functionality
- Improved error messages in login flow
- Fixed session timeout issue (#123)
- Updated dependencies for security
```

### GitHub Release

Optimized for GitHub releases:

```markdown
## What's New in 2.1.0

### Highlights
User authentication is here! Sign up, log in, and manage your account securely.

### Features
- **Authentication**: JWT-based login/logout
- **Password Reset**: Forgot your password? No problem.

### Bug Fixes
- Fixed session timeout causing unexpected logouts (#123)

### Security
- Updated all dependencies to latest secure versions

**Full Changelog**: https://github.com/org/repo/compare/v2.0.0...v2.1.0
```

---

## Audience Targeting

### Technical

For developers and technical users:
- Includes code references
- Mentions APIs and endpoints
- Technical terminology

### User-Facing

For end users:
- Clear, simple language
- Focus on benefits
- Avoids technical jargon

### Marketing

For promotional content:
- Highlights key features
- Emphasizes value
- Engaging tone

---

## Version Suggester

The `VersionSuggester` uses Claude Haiku to analyze commits and suggest version bumps.

### How It Works

1. Receives list of commits
2. Sends to Claude Haiku (fast, cheap)
3. AI analyzes for breaking changes, features, fixes
4. Returns suggested bump type with reason

### Usage

```typescript
const suggester = new VersionSuggester(pythonPath, claudePath, sourcePath, debug);

const suggestion = await suggester.suggestVersionBump(commits, '2.0.5');
// Returns: { version: '2.1.0', reason: 'New features added', bumpType: 'minor' }
```

### Bump Logic

| Type | When | Example |
|------|------|---------|
| **Major** | Breaking changes, API changes | `2.0.5` → `3.0.0` |
| **Minor** | New features, enhancements | `2.0.5` → `2.1.0` |
| **Patch** | Bug fixes, docs, refactoring | `2.0.5` → `2.0.6` |

### Fallback

If AI analysis fails, defaults to patch bump:
```typescript
{
  version: `${major}.${minor}.${patch + 1}`,
  reason: 'Patch version bump (default)',
  bumpType: 'patch'
}
```

---

## IPC Integration

### Available Handlers

```typescript
// Generate changelog
await window.electronAPI.generateChangelog(projectId, request, specs);

// Cancel generation
await window.electronAPI.cancelChangelogGeneration(projectId);

// Suggest version
await window.electronAPI.suggestVersionBump(projectId, commits, currentVersion);
```

### Events

```typescript
// Progress updates
window.electronAPI.onChangelogProgress((projectId, progress) => {
  console.log(`${progress.stage}: ${progress.progress}%`);
});

// Generation complete
window.electronAPI.onChangelogComplete((projectId, result) => {
  if (result.success) {
    console.log(result.changelog);
  }
});

// Error
window.electronAPI.onChangelogError((projectId, error) => {
  console.error(error);
});

// Rate limit
window.electronAPI.onChangelogRateLimit((projectId, rateLimitInfo) => {
  console.warn('Rate limited:', rateLimitInfo);
});
```

---

## UI Components

### Changelog View

| Component | File | Purpose |
|-----------|------|---------|
| `Changelog.tsx` | Main view component |
| `ChangelogEntry.tsx` | Individual entry display |
| `ConfigurationPanel.tsx` | Generation options |
| `GitHubReleaseCard.tsx` | Release preview |

### User Flow

1. **Select Source**: Choose tasks, git history, or branch diff
2. **Configure Options**: Version, format, audience
3. **Generate**: Click to start AI generation
4. **Preview**: View generated markdown
5. **Export**: Copy or save to file

---

## Error Handling

### Rate Limits

The system detects and handles Claude rate limits:

```typescript
childProcess.on('exit', (code) => {
  const combinedOutput = `${output}\n${errorOutput}`;
  const rateLimitDetection = detectRateLimit(combinedOutput);

  if (rateLimitDetection.isRateLimited) {
    // Emit rate limit event with reset time
    this.emit('rate-limit', projectId, rateLimitInfo);
  }
});
```

### Cancellation

Users can cancel ongoing generations:

```typescript
cancel(projectId: string): boolean {
  const process = this.generationProcesses.get(projectId);
  if (process) {
    process.kill('SIGTERM');
    return true;
  }
  return false;
}
```

### Fallbacks

- **Version suggester fails**: Falls back to patch bump
- **No commits found**: Shows error message
- **AI output unparseable**: Returns raw output

---

## Configuration

### Environment Variables

The changelog system uses these environment variables:

```bash
# Claude CLI path
CLAUDE_PATH=/usr/local/bin/claude

# Python path
PYTHON_PATH=/usr/bin/python3

# OAuth token (from profile)
CLAUDE_CODE_OAUTH_TOKEN=...
```

### ChangelogConfig

```typescript
interface ChangelogConfig {
  pythonPath: string;           // Path to Python executable
  claudePath: string;           // Path to Claude CLI
  autoBuildSourcePath: string;  // Backend source directory
}
```

---

## Git Integration

### Getting Commits

```typescript
// By tag range
const commits = getCommits(projectPath, {
  fromTag: 'v2.0.0',
  toTag: 'HEAD'
}, debug);

// By count
const commits = getCommits(projectPath, {
  count: 50
}, debug);

// By branch diff
const commits = getBranchDiffCommits(projectPath, {
  baseBranch: 'main',
  compareBranch: 'feature/auth'
}, debug);
```

### GitCommit Structure

```typescript
interface GitCommit {
  hash: string;          // Full commit hash
  shortHash: string;     // Short hash (7 chars)
  subject: string;       // Commit message first line
  body: string;          // Full commit body
  author: string;        // Author name
  date: string;          // Commit date
}
```

---

## Prompt Building

### Tasks Mode Prompt

```typescript
function buildChangelogPrompt(request, specs) {
  return `Generate a ${request.format} changelog for version ${request.version}.

Target audience: ${request.audience}

Tasks completed:
${specs.map(s => `- ${s.title}: ${s.description}`).join('\n')}

${request.customInstructions || ''}

Output only the markdown changelog, no explanations.`;
}
```

### Git Mode Prompt

```typescript
function buildGitPrompt(request, commits) {
  return `Generate a ${request.format} changelog for version ${request.version}.

Target audience: ${request.audience}

Commits:
${commits.map(c => `- ${c.shortHash}: ${c.subject}`).join('\n')}

${request.customInstructions || ''}

Output only the markdown changelog, no explanations.`;
}
```

---

## Related Documentation

- [Frontend Architecture](./architecture.md) - Electron process model
- [Electron IPC](./electron-ipc.md) - IPC communication patterns
- [State Management](./state-management.md) - Zustand stores
