---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
status: 'complete'
completedAt: '2026-01-15'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/product-brief-Auto-Claude-2026-01-15.md
  - docs/architecture.md
  - docs/backend/architecture.md
  - docs/frontend/architecture.md
workflowType: 'architecture'
project_name: 'Auto-Claude Planning Mode'
user_name: 'Pierre'
date: '2026-01-15'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
46 FRs across 7 capability areas defining Planning Mode as an integrated subsystem:
- **Planning Session Management (FR-PSM)**: Session creation, state persistence, methodology selection, progress tracking
- **BMAD Workflow Integration (FR-BWI)**: Full artifact chain orchestration with AI-guided collaborative discovery
- **Artifact Management (FR-AM)**: File-based persistence, artifact linking, export capabilities
- **Story-to-Task Conversion (FR-STC)**: Automatic Kanban task generation with context inheritance
- **Sprint Management (FR-SM)**: Queue-based execution, priority ordering, failure handling
- **User Interface (FR-UI)**: Sidebar integration, chat interface, artifact viewers, sprint dashboard
- **Documentation & Version Control (FR-DVC)**: Git commits, checkpoint management, change tracking

**Non-Functional Requirements:**
24 NFRs establishing quality constraints:
- **Performance**: Session response < 2s, artifact save < 1s, task generation < 5s
- **Reliability**: 99.9% uptime, graceful recovery, no data loss on crash
- **Security**: Encrypted token storage, no credential exposure in artifacts
- **Usability**: Methodology selection < 3 clicks, intuitive navigation
- **Maintainability**: Standard patterns, comprehensive logging, modular design

**Scale & Complexity:**
- Primary domain: Full-stack Electron + Python extension
- Complexity level: Medium-High
- Estimated architectural components: 8-12 new/modified modules

### Technical Constraints & Dependencies

**Existing System Integration:**
- Must use existing file-based IPC patterns (not HTTP APIs)
- Must leverage git worktree isolation model
- Must integrate with existing Kanban store (`taskStore.ts`)
- Must follow established Electron multi-process architecture

**Technology Stack Constraints:**
- Frontend: React, TypeScript, Zustand, Radix UI (existing)
- Backend: Python 3.12+, Claude Agent SDK (existing)
- Storage: Filesystem-based in `.auto-claude/planning/`
- No new external dependencies required

**BMAD Integration:**
- BMAD workflows available at `_bmad/` directory
- Methodology provides structured workflow definitions
- Must orchestrate workflow steps through Claude Agent SDK

### Cross-Cutting Concerns Identified

1. **Session State Management**: Planning sessions persist across app restarts, require state synchronization between frontend and backend

2. **Artifact Lifecycle**: Artifacts flow through creation → editing → finalization → task generation with consistent state tracking

3. **Sprint Integration**: Sprint status must synchronize with both planning artifacts and existing Kanban system

4. **Error Handling**: Graceful degradation and recovery across the full artifact chain

5. **Context Inheritance**: Stories inherit context from PRD/architecture; tasks inherit from stories - requires consistent linking strategy

## Starter Template Evaluation

### Primary Technology Domain

**Brownfield Extension** - Planning Mode extends an existing mature Electron + Python dual-service application.

### Starter Template Decision: Not Applicable

This is a brownfield project extending an existing codebase. No starter template selection is needed.

**Inherited Technology Stack:**

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Desktop Runtime | Electron | Existing application framework |
| Frontend Framework | React 18+ TypeScript | Established UI layer |
| State Management | Zustand | Existing state management pattern |
| UI Components | Radix UI + Tailwind CSS | Established component library |
| Build System | Vite | Existing build configuration |
| Backend Runtime | Python 3.12+ | Existing agent infrastructure |
| AI Integration | Claude Agent SDK | Core AI interaction layer |
| IPC Pattern | File-based | Existing frontend-backend communication |

### Architectural Constraints from Existing System

**Frontend Patterns to Follow:**
- View-based routing via hash navigation
- Zustand stores for feature state
- Radix UI primitives with Tailwind styling
- i18n via react-i18next for all user-facing text

**Backend Patterns to Follow:**
- Agent orchestration via Claude SDK
- File-based state persistence
- Git worktree isolation for builds
- MCP server integration for tool capabilities

**Integration Points:**
- Sidebar navigation (existing pattern)
- Kanban task store (`taskStore.ts`)
- Terminal management for execution
- Settings system for configuration

**Note:** Architectural decisions will focus on how Planning Mode integrates with these existing patterns rather than selecting new technologies.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
1. Session State Architecture - Project-scoped sessions
2. BMAD Workflow Orchestration - Hybrid direct/abstract approach
3. Story-to-Task Conversion - Reference + cache model
4. Sprint Queue Management - Dedicated execution queue
5. Frontend-Backend Communication - Process + file state hybrid

**Deferred Decisions (Post-MVP):**
- Methodology adapter abstraction (when second methodology added)
- Sprint velocity/analytics tracking
- Multi-user collaboration patterns

### Session & Storage Architecture

**Decision:** Project-Scoped Sessions with Flat Artifact Structure

```
.auto-claude/planning/{project-name}/
  session.json           # Workflow state, current step, context
  product-brief.md
  prd.md
  architecture.md
  epics.md
  stories/
    story-001.md
    story-002.md
  sprint-queue.json      # Execution state for current sprint
```

**Rationale:** Natural project boundaries, simple navigation, clear artifact ownership.

### Workflow Orchestration

**Decision:** Direct BMAD Execution with Future Abstraction Path

- MVP: Backend loads BMAD workflows directly from `_bmad/` directory
- Claude Agent SDK executes workflow steps with BMAD prompts as system context
- Session state tracks: current workflow, current step, completed steps
- File structures include `methodology` field for future extensibility

**Rationale:** Simple MVP implementation while preserving path to multi-methodology support.

### Story-to-Task Integration

**Decision:** Reference + Cache Hybrid

- Tasks reference story file path: `storyPath: ".auto-claude/planning/{project}/stories/story-001.md"`
- Cache display fields: `name`, `description`, `acceptanceCriteria` (summary)
- AI agents load full story context from file during execution
- Sync on story finalization and task status changes

**Rationale:** Kanban displays quickly from cache; AI gets full context from source file.

### Sprint Execution Architecture

**Decision:** Dedicated Sprint Queue File

```json
// sprint-queue.json
{
  "sprint_id": "sprint-001",
  "sprint_name": "Planning Mode MVP",
  "status": "in_progress",
  "started_at": "2026-01-15T22:00:00Z",
  "queue": [
    {"story_id": "story-001", "priority": 1, "status": "completed"},
    {"story_id": "story-002", "priority": 2, "status": "in_progress"},
    {"story_id": "story-003", "priority": 3, "status": "pending"}
  ]
}
```

- Backend reads queue for auto-pickup logic
- Syncs with taskStore at sprint boundaries
- Failures marked in queue, sprint continues with next story
- Clear audit trail for morning review

**Rationale:** Robust overnight execution, clean failure recovery, decoupled from UI state.

### Frontend-Backend Communication

**Decision:** Backend Process + File State Hybrid

- Planning session runs as long-lived backend process
- Claude Agent SDK manages conversation with BMAD workflow context
- Chat streamed via existing terminal/pty infrastructure
- Session state persisted in `session.json` for recovery
- Artifacts written to files as workflow progresses

**Rationale:** Combines proven Insights chat pattern with spec execution infrastructure.

### Decision Impact Analysis

**Implementation Sequence:**
1. Session storage structure (foundation)
2. Backend BMAD workflow orchestration
3. Frontend Planning Mode UI
4. Story-to-task conversion
5. Sprint queue execution
6. Sprint dashboard

**Cross-Component Dependencies:**
- Session storage → used by all other components
- Workflow orchestration → produces artifacts consumed by story conversion
- Story conversion → feeds sprint queue
- Sprint queue → drives overnight execution

## Implementation Patterns & Consistency Rules

### Inherited Patterns (Follow Existing Codebase)

**Code Naming:**
- TypeScript: camelCase variables, PascalCase components/types
- Python: snake_case functions, variables, file names
- Constants: UPPER_SNAKE_CASE

**File Naming:**
- React components: `ComponentName.tsx`
- Stores: `featureStore.ts`
- Types: `feature.ts` in `types/` directory

**Project Structure:**
- Views in `views/` directory
- Components in `components/` directory
- Stores in `stores/` directory
- i18n keys in `locales/{lang}/` JSON files

**State Management:**
- Zustand `create()` pattern
- Selectors for derived state
- Actions as store methods

**Internationalization:**
- All user-facing text via `useTranslation()`
- Namespaced keys: `namespace:section.key`
- Both `en/` and `fr/` translations required

### Planning Mode Specific Patterns

**Artifact File Naming:**
- Stories: `story-{NNN}-{slug}.md`
- Example: `story-001-user-authentication.md`
- Artifacts: Descriptive names (`product-brief.md`, `prd.md`, `architecture.md`)

**Session State Structure:**
```json
{
  "id": "session-uuid",
  "project_name": "project-slug",
  "methodology": "bmad",
  "status": "in_progress",
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601",
  "current_workflow": "workflow-name",
  "current_step": 3,
  "completed_workflows": ["workflow-1", "workflow-2"],
  "artifacts": {
    "artifact-type": "filename.md"
  },
  "context": {
    "last_message_id": "msg-id",
    "workflow_variables": {}
  }
}
```

**Story File Format:**
```markdown
---
id: story-NNN
title: Story Title
epic: epic-slug
status: draft | ready | in_progress | completed | failed
priority: N
test_scope: unit | integration | e2e
created_at: YYYY-MM-DD
---

# Story: Title

## Description
[What this story delivers]

## Acceptance Criteria
- [ ] Criterion with checkbox

## Technical Notes
[Implementation guidance]

## Context Links
- PRD: prd.md#requirement-id
- Architecture: architecture.md#decision-id

## Test Requirements
[Test expectations based on test_scope]
```

**Error Handling:**
- Graceful recovery: catch errors, preserve state
- Continue session if possible
- Present errors to user in chat interface
- Auto-save progress before risky operations

**Store Organization:**
```
stores/planning/
  sessionStore.ts    # Session state, workflow progress
  artifactStore.ts   # Artifact metadata, content cache
  sprintStore.ts     # Sprint queue, execution state
```

**IPC Channel Naming:**
- Format: `planning:{domain}:{action}`
- Session: `planning:session:create`, `planning:session:resume`, `planning:session:status`
- Artifacts: `planning:artifact:list`, `planning:artifact:save`, `planning:artifact:export`
- Sprint: `planning:sprint:start`, `planning:sprint:status`, `planning:sprint:stop`

### Enforcement Guidelines

**All AI Agents MUST:**
1. Follow existing codebase naming conventions (camelCase/PascalCase for TS, snake_case for Python)
2. Use i18n translation keys for ALL user-facing text
3. Place new components in appropriate directories following existing structure
4. Use hierarchical IPC channel naming for new channels
5. Include YAML frontmatter in all story files
6. Preserve session state on errors (graceful recovery)

**Pattern Verification:**
- TypeScript compiler catches naming inconsistencies
- i18n linting for missing translation keys
- PR review for structural compliance
- Story file validation before sprint execution

## Project Structure & Boundaries

### Existing Structure Integration

```
Auto-Claude/
├── apps/
│   ├── frontend/src/           # Existing React app
│   │   ├── views/              # Add: PlanningView.tsx
│   │   ├── stores/             # Add: planning/ subdirectory
│   │   ├── components/         # Add: planning/ subdirectory
│   │   └── shared/
│   │       ├── types/          # Add: planning.ts
│   │       └── i18n/locales/   # Add: planning.json (en/fr)
│   │
│   └── backend/                # Existing Python backend
│       ├── planning/           # NEW: Planning module
│       └── prompts/            # Add: planning/ subdirectory
│
└── .auto-claude/
    └── planning/               # NEW: Planning artifacts (per-project)
```

### New Frontend Structure

```
apps/frontend/src/
├── views/
│   └── PlanningView.tsx                    # Main planning view (like InsightsView)
│
├── stores/planning/
│   ├── index.ts                            # Barrel export
│   ├── sessionStore.ts                     # Session state, workflow progress
│   ├── artifactStore.ts                    # Artifact metadata, content cache
│   └── sprintStore.ts                      # Sprint queue, execution state
│
├── components/planning/
│   ├── PlanningChat.tsx                    # Chat interface (like Insights chat)
│   ├── PlanningHeader.tsx                  # Session info, methodology indicator
│   ├── ArtifactPanel.tsx                   # Artifact list and viewer
│   ├── ArtifactViewer.tsx                  # Markdown artifact display
│   ├── StoryList.tsx                       # Stories with status indicators
│   ├── SprintDashboard.tsx                 # Sprint status overview
│   ├── SprintQueue.tsx                     # Queue visualization
│   ├── WorkflowProgress.tsx                # BMAD workflow step indicator
│   └── MethodologySelector.tsx             # Methodology choice (BMAD for MVP)
│
├── shared/types/
│   └── planning.ts                         # Planning-specific types
│       # PlanningSession, Artifact, Story, Sprint, SprintQueueItem
│
└── shared/i18n/locales/
    ├── en/planning.json                    # English translations
    └── fr/planning.json                    # French translations
```

### New Backend Structure

```
apps/backend/
├── planning/
│   ├── __init__.py
│   ├── session.py                          # Session creation, state management
│   ├── workflow_runner.py                  # BMAD workflow orchestration
│   ├── artifact_manager.py                 # Artifact file read/write/link
│   ├── story_converter.py                  # Story → Task conversion
│   ├── sprint_executor.py                  # Sprint queue execution, auto-pickup
│   └── types.py                            # Python dataclasses for planning
│
├── prompts/planning/
│   ├── session_start.md                    # System prompt for new sessions
│   └── workflow_context.md                 # Context injection for workflows
│
└── cli/
    └── planning_cli.py                     # CLI entry point for planning sessions
```

### Planning Data Structure (Per-Project)

```
.auto-claude/planning/{project-name}/
├── session.json                            # Session state
├── product-brief.md                        # Artifact: Product Brief
├── prd.md                                  # Artifact: PRD
├── architecture.md                         # Artifact: Architecture
├── epics.md                                # Artifact: Epics summary
├── stories/
│   ├── story-001-{slug}.md                 # Individual story files
│   ├── story-002-{slug}.md
│   └── ...
└── sprint-queue.json                       # Sprint execution state
```

### Requirements to Structure Mapping

| Requirement Area | Frontend Location | Backend Location |
|-----------------|-------------------|------------------|
| FR-PSM (Session Management) | `stores/planning/sessionStore.ts` | `planning/session.py` |
| FR-BWI (BMAD Workflows) | `components/planning/WorkflowProgress.tsx` | `planning/workflow_runner.py` |
| FR-AM (Artifact Management) | `components/planning/ArtifactPanel.tsx` | `planning/artifact_manager.py` |
| FR-STC (Story-to-Task) | `stores/planning/sprintStore.ts` | `planning/story_converter.py` |
| FR-SM (Sprint Management) | `components/planning/SprintDashboard.tsx` | `planning/sprint_executor.py` |
| FR-UI (User Interface) | `views/PlanningView.tsx` | N/A |
| FR-DVC (Version Control) | Existing git integration | Existing worktree system |

### Architectural Boundaries

**Frontend-Backend Boundary:**
- IPC channels: `planning:*` namespace
- File watching: Frontend watches `.auto-claude/planning/{project}/`
- Process communication: Terminal/pty streaming for chat

**Planning-Kanban Boundary:**
- Story finalization triggers task creation in `taskStore`
- Sprint queue syncs with task status at boundaries
- Tasks reference story files but don't duplicate content

**BMAD-Planning Boundary:**
- BMAD workflows read from `_bmad/` directory (read-only)
- Planning artifacts written to `.auto-claude/planning/`
- Workflow runner loads prompts, doesn't modify BMAD source

### Files to Modify (Existing)

| File | Modification |
|------|--------------|
| `apps/frontend/src/components/Sidebar.tsx` | Add "Planning" nav item |
| `apps/frontend/src/App.tsx` | Add PlanningView route |
| `apps/frontend/src/shared/types/index.ts` | Export planning types |
| `apps/frontend/src/shared/i18n/index.ts` | Register planning namespace |
| `apps/backend/core/client.py` | Add planning agent type |

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All architectural decisions integrate coherently:
- Session architecture supports workflow orchestration
- File-based patterns align with existing IPC model
- Sprint queue execution decoupled from but synced with Kanban
- No conflicting technology choices

**Pattern Consistency:**
Implementation patterns support all decisions:
- Naming conventions inherited from existing codebase
- IPC channel naming follows established hierarchy
- Store organization mirrors existing feature patterns
- File formats standardized with YAML frontmatter

**Structure Alignment:**
Project structure enables all architectural decisions:
- Clear separation between frontend/backend/data
- Boundaries defined at IPC, file system, and store levels
- Integration points explicitly mapped

### Requirements Coverage Validation ✅

**Functional Requirements:** 46/46 covered
- All FR categories have dedicated architectural components
- Cross-cutting concerns (session state, error handling) addressed
- Integration with existing systems (Kanban, Git) specified

**Non-Functional Requirements:** 24/24 addressed
- Performance: Streaming responses, file-based state for speed
- Reliability: Graceful recovery, session persistence
- Security: Leverages existing encrypted token storage
- Usability: Familiar patterns, sidebar integration
- Maintainability: Domain-split architecture, clear boundaries

### Implementation Readiness Validation ✅

**Decision Completeness:**
- 6 critical decisions fully documented with rationale
- JSON schemas provided for session and sprint queue
- Story file format with YAML frontmatter specified
- IPC channels enumerated by domain

**Structure Completeness:**
- All new files/directories specified
- Existing files to modify identified
- Requirements mapped to specific file locations

**Pattern Completeness:**
- Inherited patterns documented
- Planning-specific patterns defined
- Enforcement guidelines specified

### Gap Analysis Results

**Critical Gaps:** None

**Deferred to Post-MVP:**
- Methodology adapter abstraction
- Sprint velocity/analytics tracking
- Multi-user collaboration patterns

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (Medium-High)
- [x] Technical constraints identified (brownfield extension)
- [x] Cross-cutting concerns mapped (5 identified)

**✅ Architectural Decisions**
- [x] 6 critical decisions documented
- [x] Technology stack inherited and specified
- [x] Integration patterns defined (file-based IPC)
- [x] Performance considerations addressed

**✅ Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified (IPC channels)
- [x] Process patterns documented (graceful recovery)

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
1. Leverages proven existing patterns (Insights chat, spec execution)
2. Clear separation of concerns (session/artifact/sprint)
3. Robust overnight execution with dedicated sprint queue
4. Natural integration with existing Kanban system
5. Extensibility path for future methodologies

**Areas for Future Enhancement:**
1. Methodology adapter pattern when adding second methodology
2. Sprint analytics and velocity tracking
3. Real-time collaboration features

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions
- Follow existing codebase patterns for anything not specified

**Implementation Sequence:**
1. Session storage structure (foundation)
2. Backend BMAD workflow orchestration
3. Frontend Planning Mode UI
4. Story-to-task conversion
5. Sprint queue execution
6. Sprint dashboard

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED ✅
**Total Steps Completed:** 8
**Date Completed:** 2026-01-15
**Document Location:** `_bmad-output/planning-artifacts/architecture.md`

### Final Architecture Deliverables

**Complete Architecture Document**
- All architectural decisions documented with rationale
- Implementation patterns ensuring AI agent consistency
- Complete project structure with all files and directories
- Requirements to architecture mapping
- Validation confirming coherence and completeness

**Implementation Ready Foundation**
- 6 critical architectural decisions made
- 6 implementation pattern categories defined
- 15+ new components specified (frontend + backend)
- 46 functional requirements fully supported
- 24 non-functional requirements addressed

**AI Agent Implementation Guide**
- Technology stack inherited from existing codebase
- Consistency rules that prevent implementation conflicts
- Project structure with clear boundaries
- IPC patterns and communication standards

### Quality Assurance Checklist

**✅ Architecture Coherence**
- [x] All decisions work together without conflicts
- [x] Technology choices are compatible (brownfield extension)
- [x] Patterns support the architectural decisions
- [x] Structure aligns with all choices

**✅ Requirements Coverage**
- [x] All 46 functional requirements are supported
- [x] All 24 non-functional requirements are addressed
- [x] Cross-cutting concerns are handled
- [x] Integration points are defined

**✅ Implementation Readiness**
- [x] Decisions are specific and actionable
- [x] Patterns prevent agent conflicts
- [x] Structure is complete and unambiguous
- [x] JSON schemas provided for data structures

### Project Success Factors

**Clear Decision Framework**
Every architectural choice was made collaboratively with clear rationale, ensuring consistent implementation direction.

**Consistency Guarantee**
Implementation patterns and rules ensure that multiple AI agents will produce compatible, consistent code that works together seamlessly.

**Complete Coverage**
All project requirements are architecturally supported, with clear mapping from business needs to technical implementation.

**Solid Foundation**
Leveraging existing proven patterns (Insights chat, spec execution) provides a production-ready foundation.

---

**Architecture Status:** READY FOR IMPLEMENTATION ✅

**Next Phase:** Create Epics & Stories to break down requirements into implementable units.

**Document Maintenance:** Update this architecture when major technical decisions are made during implementation.
