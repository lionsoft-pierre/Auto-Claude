# Shared Types & Constants Reference

This document provides a reference for shared TypeScript types and constants used across the Auto-Claude frontend, establishing contracts between components.

**Target Audience:** Developers building features that need to understand cross-cutting type definitions.

---

## Overview

Auto-Claude uses a centralized type system to ensure consistency:

- **Shared Types** (`apps/frontend/src/shared/types/`) - TypeScript interfaces
- **Shared Constants** (`apps/frontend/src/shared/constants/`) - Runtime constants

These establish the **contract** between:
- Main process and renderer process
- Frontend and backend (via IPC)
- UI components and state stores

---

## Type Modules

Located in `apps/frontend/src/shared/types/`:

| Module | Purpose |
|--------|---------|
| `common.ts` | Base types used everywhere |
| `project.ts` | Project configuration |
| `task.ts` | Task/spec definitions |
| `terminal.ts` | Terminal session types |
| `agent.ts` | Agent execution types |
| `settings.ts` | App settings |
| `changelog.ts` | Changelog generation |
| `insights.ts` | Chat insights feature |
| `roadmap.ts` | Roadmap feature |
| `integrations.ts` | External integrations |
| `profile.ts` | API profile management |
| `methodology.ts` | BMAD methodology types |
| `cli.ts` | CLI configuration |
| `ipc.ts` | IPC channel definitions |

### Import Pattern

```typescript
// Import all types from central export
import type {
  Project,
  Task,
  TerminalSession,
  ClaudeProfile
} from '../shared/types';

// Or import from specific module
import type { Task, TaskStatus } from '../shared/types/task';
```

---

## Key Type Definitions

### Project Types

```typescript
// apps/frontend/src/shared/types/project.ts
interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: Date;
  lastOpenedAt?: Date;
  settings?: ProjectSettings;
}

interface ProjectSettings {
  defaultBranch?: string;
  autoClaudeDir?: string;
  linearEnabled?: boolean;
  linearTeamId?: string;
}
```

### Task Types

```typescript
// apps/frontend/src/shared/types/task.ts
interface Task {
  id: string;
  name: string;
  description?: string;
  status: TaskStatus;
  specPath: string;
  createdAt: Date;
  updatedAt?: Date;
  progress?: TaskProgress;
}

type TaskStatus =
  | 'draft'
  | 'ready'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

interface TaskProgress {
  phase: ExecutionPhase;
  subtasksCompleted: number;
  subtasksTotal: number;
  currentSubtask?: string;
}
```

### Terminal Types

```typescript
// apps/frontend/src/shared/types/terminal.ts
interface TerminalSession {
  id: string;
  taskId: string;
  pid?: number;
  status: TerminalStatus;
  startedAt: Date;
  endedAt?: Date;
}

type TerminalStatus = 'starting' | 'running' | 'paused' | 'stopped' | 'error';
```

### Agent Types

```typescript
// apps/frontend/src/shared/types/agent.ts
interface AgentSession {
  id: string;
  taskId: string;
  agentType: AgentType;
  status: AgentStatus;
  startedAt: Date;
  completedAt?: Date;
}

type AgentType = 'planner' | 'coder' | 'qa_reviewer' | 'qa_fixer';
type AgentStatus = 'idle' | 'running' | 'completed' | 'failed';
```

### Profile Types

```typescript
// apps/frontend/src/shared/types/profile.ts
interface APIProfile {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;  // Encrypted
  models?: {
    default?: string;
    haiku?: string;
    sonnet?: string;
    opus?: string;
  };
  createdAt: number;
  updatedAt: number;
}

interface ClaudeProfile {
  id: string;
  name: string;
  type: 'oauth' | 'api-key';
  oauthToken?: string;
  apiKey?: string;
  createdAt: Date;
  usage?: ClaudeUsageData;
  rateLimitEvents?: ClaudeRateLimitEvent[];
}
```

### Changelog Types

```typescript
// apps/frontend/src/shared/types/changelog.ts
interface ChangelogGenerationRequest {
  version: string;
  sourceMode: 'tasks' | 'git-history' | 'branch-diff';
  format: 'keep-a-changelog' | 'simple-list' | 'github-release';
  audience: 'technical' | 'user-facing' | 'marketing';
  taskIds?: string[];
  gitHistory?: GitHistoryOptions;
  branchDiff?: BranchDiffOptions;
}

interface ChangelogGenerationResult {
  success: boolean;
  changelog: string;
  version: string;
  tasksIncluded: number;
}
```

---

## Shared Constants

Located in `apps/frontend/src/shared/constants/`:

### Phase Protocol Constants

```typescript
// apps/frontend/src/shared/constants/phase-protocol.ts

// Protocol marker for parsing stdout
export const PHASE_MARKER_PREFIX = '__EXEC_PHASE__:';

// All execution phases in order
export const EXECUTION_PHASES = [
  'idle',
  'planning',
  'coding',
  'qa_review',
  'qa_fixing',
  'complete',
  'failed'
] as const;

// Phases emitted by Python backend
export const BACKEND_PHASES = [
  'planning',
  'coding',
  'qa_review',
  'qa_fixing',
  'complete',
  'failed'
] as const;

// Phase ordering for regression detection
export const PHASE_ORDER_INDEX = {
  idle: -1,
  planning: 0,
  coding: 1,
  qa_review: 2,
  qa_fixing: 3,
  complete: 4,
  failed: 99
} as const;

// Terminal phases
export const TERMINAL_PHASES = new Set(['complete', 'failed']);
```

### Phase Protocol Functions

```typescript
// Check for phase regression
function wouldPhaseRegress(current: ExecutionPhase, next: ExecutionPhase): boolean;

// Check if terminal state
function isTerminalPhase(phase: ExecutionPhase): boolean;

// Validate backend phase
function isValidBackendPhase(value: string): value is BackendPhase;

// Validate phase transition
function isValidPhaseTransition(
  current: ExecutionPhase,
  next: ExecutionPhase,
  completedPhases?: CompletablePhase[]
): boolean;
```

---

## Type Derivation Pattern

Constants are the single source of truth for types:

```typescript
// Constants define the values
export const EXECUTION_PHASES = ['idle', 'planning', ...] as const;

// Types are derived from constants
export type ExecutionPhase = (typeof EXECUTION_PHASES)[number];
// Result: 'idle' | 'planning' | 'coding' | ...

// This ensures types and runtime values stay in sync
```

---

## IPC Type Safety

IPC channels are typed for safety:

```typescript
// apps/frontend/src/shared/types/ipc.ts
interface IpcChannels {
  // Project operations
  'project:list': () => Promise<Project[]>;
  'project:create': (data: ProjectCreateData) => Promise<Project>;
  'project:delete': (id: string) => Promise<void>;

  // Task operations
  'task:list': (projectId: string) => Promise<Task[]>;
  'task:create': (data: TaskCreateData) => Promise<Task>;
  'task:run': (taskId: string) => Promise<void>;

  // Terminal operations
  'terminal:create': (taskId: string) => Promise<TerminalSession>;
  'terminal:write': (sessionId: string, data: string) => Promise<void>;
  'terminal:resize': (sessionId: string, cols: number, rows: number) => Promise<void>;
}
```

---

## Cross-Platform Sync Requirements

### Python ↔ TypeScript Sync

Some types must stay synchronized between Python and TypeScript:

| TypeScript | Python | Notes |
|------------|--------|-------|
| `ExecutionPhase` | `ExecutionPhase` enum | Phase protocol |
| `SubtaskStatus` | `SubtaskStatus` enum | Plan status |
| `AgentType` | Agent type strings | Agent identification |

**Sync Points:**
- `shared/constants/phase-protocol.ts` ↔ `core/phase_event.py`
- `shared/types/task.ts` ↔ `implementation_plan/enums.py`

### Adding New Shared Values

When adding new phases, statuses, or types:

1. **Add to Python first** (if applicable)
2. **Add to TypeScript constants**
3. **Verify types are derived** from constants
4. **Update validation functions**
5. **Test both sides**

---

## Usage Guidelines

### Import Patterns

```typescript
// Prefer central import for multiple types
import type { Project, Task, ClaudeProfile } from '../shared/types';

// Use specific import for single type + related
import type { Task, TaskStatus, TaskProgress } from '../shared/types/task';

// Import constants from constants module
import {
  EXECUTION_PHASES,
  isValidPhaseTransition
} from '../shared/constants/phase-protocol';
```

### Type Guards

```typescript
// Built-in type guards
import { isValidBackendPhase, isValidExecutionPhase } from '../shared/constants/phase-protocol';

// Usage
function handlePhase(phase: string) {
  if (isValidExecutionPhase(phase)) {
    // phase is now typed as ExecutionPhase
    processPhase(phase);
  }
}
```

### Extending Types

```typescript
// Extend existing types for component-specific needs
interface TaskWithUI extends Task {
  isSelected: boolean;
  isExpanded: boolean;
}

// Don't modify shared types directly - extend them
```

---

## Type Module Index

Quick reference for finding types:

| Looking for... | Module |
|---------------|--------|
| Project, ProjectSettings | `project.ts` |
| Task, TaskStatus, TaskProgress | `task.ts` |
| Terminal sessions | `terminal.ts` |
| Agent types | `agent.ts` |
| App settings | `settings.ts` |
| Changelog generation | `changelog.ts` |
| Chat insights | `insights.ts` |
| Roadmap features | `roadmap.ts` |
| Linear, GitHub, GitLab | `integrations.ts` |
| API profiles | `profile.ts` |
| BMAD methodology | `methodology.ts` |
| CLI config | `cli.ts` |
| IPC definitions | `ipc.ts` |
| Base/common types | `common.ts` |

---

## Related Documentation

- [Phase Protocol](./phase-protocol.md) - Detailed phase event protocol
- [Frontend Architecture](./frontend/architecture.md) - How types are used
- [Electron IPC](./frontend/electron-ipc.md) - IPC type safety
- [Data Models](./backend/data-models.md) - Backend data structures
