---
stepsCompleted: [1, 2, 3]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
date: 2026-01-15
author: Pierre
epicCount: 6
storyCount: 24
---

# Auto-Claude Planning Mode - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Auto-Claude Planning Mode, decomposing the 46 functional requirements and 24 non-functional requirements into 6 epics and 24 implementable stories.

## Requirements Inventory

### Functional Requirements

**Planning Session Management (FR-PSM)**
- FR1: User can initiate a new planning session from the sidebar
- FR2: User can select a methodology (BMAD) when starting a planning session
- FR3: User can interact with the planning session via chat-style interface
- FR4: User can view planning session history and resume previous sessions
- FR5: User can save planning session progress at any point
- FR6: System can display planning session progress and current workflow step

**Methodology Execution (FR-BWI)**
- FR7: System can execute BMAD workflow steps (Brief → PRD → Architecture → Epics → Stories)
- FR8: System can present methodology-specific questions and capture user responses
- FR9: System can generate planning artifacts based on workflow execution
- FR10: System can validate artifact completeness before proceeding to next workflow step
- FR11: User can review and approve generated artifacts before finalizing

**Artifact Management (FR-AM)**
- FR12: System can create and store planning artifacts in `.auto-claude/planning/`
- FR13: User can view any planning artifact (Product Brief, PRD, Architecture, Epic, Story)
- FR14: User can edit planning artifacts after generation
- FR15: System can maintain links between related artifacts (Story → Epic → PRD → Architecture)
- FR16: User can commit planning artifacts to Git as a checkpoint
- FR17: System can display artifact relationships and navigation between linked documents

**Story Management (FR-STC)**
- FR18: System can generate stories from epics based on architecture decisions
- FR19: Each story can specify its test scope (Unit, Integration, E2E)
- FR20: Each story can include acceptance criteria
- FR21: Each story can link to relevant PRD sections and architecture decisions
- FR22: User can review and edit stories before converting to tasks
- FR23: System can automatically convert approved stories to Kanban tasks
- FR24: Tasks created from stories appear in the Backlog column

**Sprint Management (FR-SM)**
- FR25: User can tag stories/tasks with sprint indicators (colored flags/tags)
- FR26: User can assign multiple stories to a sprint
- FR27: User can prioritize stories within a sprint queue
- FR28: User can view all stories assigned to a specific sprint
- FR29: User can remove stories from a sprint
- FR30: System can track sprint status (not started, in progress, completed)

**Execution Engine (FR-EE)**
- FR31: System can execute sprint queue automatically (overnight mode)
- FR32: AI agent can pick the next prioritized story from the sprint queue
- FR33: System can execute a story using existing Auto-Claude agent pipeline
- FR34: System can mark stories as completed when tests pass
- FR35: System can mark stories for review when execution fails
- FR36: System can record failure notes explaining why a story failed
- FR37: Failed stories do not block execution of remaining sprint stories
- FR38: System can continue sprint execution with non-dependent stories after failure

**Dashboard & Visibility (FR-UI)**
- FR39: User can view sprint dashboard showing completed/failed/pending status
- FR40: User can view failure details and AI notes for failed stories
- FR41: User can filter Kanban board by sprint indicator
- FR42: User can see story context links when viewing a task
- FR43: System can display overall sprint progress (X of Y stories completed)

**Stakeholder Access (FR-DVC)**
- FR44: User can share planning artifacts with stakeholders (read-only view)
- FR45: User can walk through PRD and epic summaries for stakeholder review
- FR46: User can add stories to sprint queue based on stakeholder feedback

### Non-Functional Requirements

**Performance**
- NFR1: Planning session UI responds to user input within 500ms
- NFR2: Sprint dashboard loads and displays status within 2 seconds
- NFR3: Story-to-task conversion completes within 5 seconds per story
- NFR4: Artifact file operations (save, load) complete within 1 second
- NFR5: Kanban board with sprint filtering renders within 1 second

**Reliability**
- NFR6: Sprint execution continues running through transient errors (retry logic)
- NFR7: Failed story execution does not crash the sprint runner
- NFR8: Planning session state is auto-saved every 30 seconds to prevent data loss
- NFR9: Git checkpoint commits succeed or fail atomically (no partial commits)
- NFR10: System recovers gracefully from backend process crashes

**Integration**
- NFR11: BMAD workflows execute within existing Auto-Claude backend process model
- NFR12: File-based IPC between frontend and backend follows existing patterns
- NFR13: Planning artifacts use markdown format compatible with existing Auto-Claude viewers
- NFR14: Story schema extends (not replaces) existing task schema for Kanban compatibility
- NFR15: Git operations use existing Auto-Claude git integration patterns

**Code Quality**
- NFR16: AI-generated code achieves 80-90% test coverage
- NFR17: New Planning Mode code follows existing Auto-Claude coding patterns
- NFR18: TypeScript strict mode enabled for all frontend additions
- NFR19: Python type hints required for all backend additions
- NFR20: No new security vulnerabilities introduced (follow existing security model)

**Maintainability**
- NFR21: Planning Mode code is modular to support future methodology additions
- NFR22: BMAD path configuration is externalized (not hardcoded)
- NFR23: Sprint execution logic is separate from story execution logic
- NFR24: UI components follow existing Radix UI + Tailwind patterns

### Additional Requirements (from Architecture)

**Starter Template:** Not applicable - Brownfield extension of existing codebase

**Technical Requirements:**
- Must use existing file-based IPC patterns (not HTTP APIs)
- Must leverage git worktree isolation model for execution
- Must integrate with existing Kanban store (`taskStore.ts`)
- Must follow established Electron multi-process architecture
- i18n required for all user-facing text (en/ and fr/ translations)
- Must orchestrate BMAD workflows through Claude Agent SDK
- Session state persists in `session.json` for crash recovery
- Sprint queue stored in dedicated `sprint-queue.json` file

**Data Structure:**
```
.auto-claude/planning/{project-name}/
  session.json           # Workflow state, current step, context
  product-brief.md
  prd.md
  architecture.md
  epics.md
  stories/
    story-001-{slug}.md
    story-002-{slug}.md
  sprint-queue.json      # Execution state for current sprint
```

**Architectural Decisions:**
1. Project-Scoped Sessions - Sessions organized by project in `.auto-claude/planning/{project-name}/`
2. Hybrid Workflow Orchestration - Direct BMAD execution with future abstraction path
3. Reference + Cache Model - Tasks reference story files, cache key fields for display
4. Dedicated Sprint Queue - Separate `sprint-queue.json` for overnight execution reliability
5. Process + File State Hybrid - Backend process with file-based persistence

### FR Coverage Map

| FR | Epic | Story | Description |
|----|------|-------|-------------|
| FR1 | Epic 1 | Story 1.1 | Initiate planning session from sidebar |
| FR2 | Epic 1 | Story 1.1 | Select methodology when starting session |
| FR3 | Epic 1 | Story 1.2 | Chat-style interface interaction |
| FR4 | Epic 1 | Story 1.3 | View session history and resume |
| FR5 | Epic 1 | Story 1.3 | Save session progress |
| FR6 | Epic 1 | Story 1.4 | Display session progress and workflow step |
| FR7 | Epic 2 | Story 2.1 | Execute BMAD workflow steps |
| FR8 | Epic 2 | Story 2.1 | Present methodology questions |
| FR9 | Epic 2 | Story 2.2 | Generate planning artifacts |
| FR10 | Epic 2 | Story 2.2 | Validate artifact completeness |
| FR11 | Epic 2 | Story 2.3 | Review and approve artifacts |
| FR12 | Epic 2 | Story 2.2 | Store artifacts in planning directory |
| FR13 | Epic 2 | Story 2.4 | View planning artifacts |
| FR14 | Epic 2 | Story 2.4 | Edit artifacts after generation |
| FR15 | Epic 2 | Story 2.5 | Maintain artifact links |
| FR16 | Epic 2 | Story 2.6 | Commit artifacts to Git |
| FR17 | Epic 2 | Story 2.5 | Display artifact relationships |
| FR18 | Epic 3 | Story 3.1 | Generate stories from epics |
| FR19 | Epic 3 | Story 3.1 | Specify test scope per story |
| FR20 | Epic 3 | Story 3.1 | Include acceptance criteria |
| FR21 | Epic 3 | Story 3.1 | Link to PRD/architecture |
| FR22 | Epic 3 | Story 3.2 | Review and edit stories |
| FR23 | Epic 3 | Story 3.3 | Convert stories to Kanban tasks |
| FR24 | Epic 3 | Story 3.3 | Tasks appear in Backlog column |
| FR25 | Epic 4 | Story 4.1 | Tag tasks with sprint indicators |
| FR26 | Epic 4 | Story 4.1 | Assign stories to sprint |
| FR27 | Epic 4 | Story 4.2 | Prioritize stories in queue |
| FR28 | Epic 4 | Story 4.2 | View sprint stories |
| FR29 | Epic 4 | Story 4.1 | Remove stories from sprint |
| FR30 | Epic 4 | Story 4.3 | Track sprint status |
| FR31 | Epic 5 | Story 5.1 | Execute sprint queue automatically |
| FR32 | Epic 5 | Story 5.1 | AI picks next story from queue |
| FR33 | Epic 5 | Story 5.2 | Execute story via agent pipeline |
| FR34 | Epic 5 | Story 5.2 | Mark stories completed on test pass |
| FR35 | Epic 5 | Story 5.3 | Mark stories for review on failure |
| FR36 | Epic 5 | Story 5.3 | Record failure notes |
| FR37 | Epic 5 | Story 5.4 | Failed stories don't block sprint |
| FR38 | Epic 5 | Story 5.4 | Continue with non-dependent stories |
| FR39 | Epic 6 | Story 6.1 | Sprint dashboard with status |
| FR40 | Epic 6 | Story 6.2 | View failure details and AI notes |
| FR41 | Epic 6 | Story 6.3 | Filter Kanban by sprint |
| FR42 | Epic 6 | Story 6.3 | See context links on tasks |
| FR43 | Epic 6 | Story 6.1 | Display sprint progress |
| FR44 | Epic 6 | Story 6.4 | Share artifacts read-only |
| FR45 | Epic 6 | Story 6.4 | Walk through PRD/epic summaries |
| FR46 | Epic 6 | Story 6.4 | Add stories from stakeholder feedback |

---

## Epic List

### Epic 1: Planning Session Foundation
Users can start planning sessions, select methodology, and interact via chat interface.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6
**Stories:** 4

### Epic 2: BMAD Workflow Integration
Users can execute full BMAD methodology and manage generated planning artifacts.
**FRs covered:** FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR16, FR17
**Stories:** 6

### Epic 3: Story-to-Task Conversion
Planning artifacts automatically become executable Kanban tasks.
**FRs covered:** FR18, FR19, FR20, FR21, FR22, FR23, FR24
**Stories:** 3

### Epic 4: Sprint Planning & Queue Management
Users can organize tasks into sprints with priority ordering.
**FRs covered:** FR25, FR26, FR27, FR28, FR29, FR30
**Stories:** 3

### Epic 5: Overnight Execution Engine
Sprints execute automatically while user sleeps.
**FRs covered:** FR31, FR32, FR33, FR34, FR35, FR36, FR37, FR38
**Stories:** 4

### Epic 6: Sprint Dashboard & Visibility
Users can see sprint results, review failures, and share with stakeholders.
**FRs covered:** FR39, FR40, FR41, FR42, FR43, FR44, FR45, FR46
**Stories:** 4

---

## Epic 1: Planning Session Foundation

**Goal:** Enable users to start planning sessions, select a methodology, and interact via a chat-style interface. This establishes the core infrastructure for all subsequent planning features.

**User Value:** Users can begin structured planning conversations instead of jumping directly to vague task descriptions.

**NFRs Addressed:** NFR1 (500ms response), NFR8 (auto-save), NFR12 (file-based IPC), NFR17-18 (code patterns), NFR21-22 (modularity), NFR24 (UI patterns)

---

### Story 1.1: Planning Mode Entry Point

**As a** Technical Founder,
**I want** to start a new planning session from the sidebar and select a methodology,
**So that** I can begin structured planning before committing to execution.

**FRs Covered:** FR1, FR2

**Test Scope:** Integration

**Acceptance Criteria:**

**Given** the user is on any view in Auto-Claude
**When** the user clicks "Planning" in the sidebar navigation
**Then** the Planning Mode view opens with a session start interface

**Given** the user is on the Planning Mode view with no active session
**When** the user clicks "New Planning Session"
**Then** a methodology selector appears showing available options (BMAD)

**Given** the methodology selector is displayed
**When** the user selects "BMAD" methodology
**Then** a new planning session is created with BMAD workflow loaded
**And** session state is persisted to `.auto-claude/planning/{project-name}/session.json`

**Given** there is an existing planning session for the current project
**When** the user opens Planning Mode
**Then** the existing session is automatically resumed

**Technical Notes:**
- Add "Planning" nav item to `Sidebar.tsx`
- Create `PlanningView.tsx` in `views/` directory
- Create `sessionStore.ts` in `stores/planning/`
- Session state structure per architecture: `{ id, project_name, methodology, status, current_workflow, current_step }`
- i18n keys in `planning.json` namespace

**Architecture Links:**
- Session Storage: architecture.md#session--storage-architecture
- IPC Channels: `planning:session:create`, `planning:session:resume`

---

### Story 1.2: Planning Chat Interface

**As a** Technical Founder,
**I want** to interact with the planning session via a chat-style interface,
**So that** I can have a conversational planning experience similar to Insights.

**FRs Covered:** FR3

**Test Scope:** Integration

**Acceptance Criteria:**

**Given** an active planning session exists
**When** the Planning Mode view renders
**Then** a chat interface appears similar to the Insights view layout

**Given** the chat interface is displayed
**When** the user types a message and presses Enter
**Then** the message is sent to the backend planning process
**And** the AI response streams back in real-time
**And** the conversation appears in the chat history

**Given** an AI response is being streamed
**When** new tokens arrive from the backend
**Then** the response updates incrementally in the UI
**And** the UI remains responsive (< 500ms input latency)

**Given** a planning session with chat history
**When** the user scrolls up in the chat
**Then** previous messages are visible and properly formatted
**And** markdown content renders correctly

**Technical Notes:**
- Create `PlanningChat.tsx` component based on Insights chat pattern
- Use existing terminal/pty streaming infrastructure for real-time responses
- Markdown rendering for AI responses (code blocks, lists, headers)
- Store chat history in session state

**Architecture Links:**
- Communication Pattern: architecture.md#frontend-backend-communication
- UI Pattern: Follows existing Insights chat implementation

---

### Story 1.3: Session Persistence and History

**As a** Technical Founder,
**I want** to save my planning progress and resume previous sessions,
**So that** I don't lose work and can continue planning across multiple sittings.

**FRs Covered:** FR4, FR5

**Test Scope:** Unit

**Acceptance Criteria:**

**Given** an active planning session
**When** the user explicitly clicks "Save Session"
**Then** all session state is persisted to `session.json`
**And** a success notification appears

**Given** an active planning session
**When** 30 seconds have passed since the last auto-save
**Then** the session state is automatically saved
**And** no UI interruption occurs

**Given** the user opens Planning Mode
**When** previous sessions exist for different projects
**Then** a session selector shows available sessions with project names and dates

**Given** the session selector is displayed
**When** the user selects a previous session
**Then** that session is loaded with full chat history and workflow state
**And** the user can continue from where they left off

**Given** a backend process crash occurs during a session
**When** the user reopens Auto-Claude
**Then** the session recovers from the last auto-saved state
**And** minimal work is lost (max 30 seconds)

**Technical Notes:**
- Implement auto-save timer in `sessionStore.ts`
- Session recovery on startup checks for `session.json`
- Session history stored per-project in `.auto-claude/planning/{project-name}/`

**Architecture Links:**
- Session State Structure: architecture.md#session-state-structure
- Error Handling: architecture.md#error-handling (graceful recovery)

---

### Story 1.4: Workflow Progress Indicator

**As a** Technical Founder,
**I want** to see my planning progress and current workflow step,
**So that** I know where I am in the methodology and what's coming next.

**FRs Covered:** FR6

**Test Scope:** Unit

**Acceptance Criteria:**

**Given** an active BMAD planning session
**When** the Planning Mode view renders
**Then** a workflow progress indicator shows the current step
**And** completed steps are visually marked as done
**And** upcoming steps are visible but dimmed

**Given** the workflow progress indicator is displayed
**When** the user completes a workflow step
**Then** the indicator updates to show the new current step
**And** the previous step is marked as completed

**Given** the BMAD workflow is in progress
**When** the user views the progress indicator
**Then** they see the full artifact chain: Brief → PRD → Architecture → Epics → Stories
**And** the current position in the chain is highlighted

**Technical Notes:**
- Create `WorkflowProgress.tsx` component
- Display in `PlanningHeader.tsx`
- Progress derived from `session.completed_workflows` and `session.current_step`

**Architecture Links:**
- Session State: `current_workflow`, `current_step`, `completed_workflows` fields

---

## Epic 2: BMAD Workflow Integration

**Goal:** Enable execution of the full BMAD methodology workflow, generating and managing planning artifacts through collaborative AI-guided discovery.

**User Value:** Users can produce comprehensive planning documentation (Brief → PRD → Architecture → Epics → Stories) through structured conversation rather than starting from blank documents.

**NFRs Addressed:** NFR4 (1s file ops), NFR9 (atomic Git), NFR11 (BMAD in backend), NFR13 (markdown format), NFR15 (Git patterns), NFR22 (externalized config)

---

### Story 2.1: BMAD Workflow Execution Engine

**As a** Technical Founder,
**I want** the system to execute BMAD workflow steps and present methodology questions,
**So that** I can be guided through structured planning without knowing BMAD internals.

**FRs Covered:** FR7, FR8

**Test Scope:** Integration

**Acceptance Criteria:**

**Given** a new BMAD planning session is started
**When** the workflow begins
**Then** the system loads the first BMAD workflow (product-brief)
**And** presents the initial discovery questions to the user

**Given** the BMAD workflow is executing
**When** the system needs user input
**Then** methodology-specific questions are presented in the chat
**And** the user can respond conversationally

**Given** the user has answered workflow questions
**When** a workflow step is complete
**Then** the system automatically progresses to the next step
**And** the workflow progress indicator updates

**Given** the BMAD workflow sequence
**When** executing the full chain
**Then** workflows execute in order: Brief → PRD → Architecture → Epics → Stories
**And** each workflow uses outputs from previous workflows as context

**Technical Notes:**
- Create `planning/workflow_runner.py` in backend
- Load BMAD workflows from `_bmad/bmm/workflows/` directory
- Claude Agent SDK executes workflows with BMAD prompts as system context
- Track workflow state in `session.json`

**Architecture Links:**
- Workflow Orchestration: architecture.md#workflow-orchestration
- BMAD Integration: architecture.md#bmad-integration

---

### Story 2.2: Artifact Generation and Storage

**As a** Technical Founder,
**I want** the system to generate and store planning artifacts,
**So that** my planning work is captured in structured documents.

**FRs Covered:** FR9, FR10, FR12

**Test Scope:** Integration

**Acceptance Criteria:**

**Given** a BMAD workflow step completes
**When** an artifact is generated (Brief, PRD, Architecture, etc.)
**Then** the artifact is saved as markdown to `.auto-claude/planning/{project}/`
**And** the file uses the standard naming: `product-brief.md`, `prd.md`, `architecture.md`

**Given** an artifact is being generated
**When** the generation completes
**Then** the artifact includes proper YAML frontmatter with metadata
**And** the file operation completes within 1 second

**Given** a workflow step produces an artifact
**When** moving to the next workflow step
**Then** the system validates the artifact is complete
**And** blocks progression if required sections are missing
**And** prompts user to complete missing sections

**Given** artifacts are stored in the planning directory
**When** the user views the file system
**Then** all artifacts follow the flat structure defined in architecture
**And** story files are in the `stories/` subdirectory

**Technical Notes:**
- Create `planning/artifact_manager.py` in backend
- Artifact validation checks for required sections per artifact type
- YAML frontmatter includes: `id`, `title`, `status`, `created_at`, `workflow_step`

**Architecture Links:**
- Storage Structure: architecture.md#session--storage-architecture
- File Format: architecture.md#story-file-format

---

### Story 2.3: Artifact Review and Approval

**As a** Technical Founder,
**I want** to review and approve generated artifacts before finalizing,
**So that** I can ensure quality and make corrections before moving forward.

**FRs Covered:** FR11

**Test Scope:** Unit

**Acceptance Criteria:**

**Given** an artifact has been generated
**When** the artifact generation completes
**Then** the system presents the artifact for user review
**And** asks for explicit approval before proceeding

**Given** an artifact is presented for review
**When** the user reviews the content
**Then** they can request changes by describing what needs modification
**And** the AI updates the artifact based on feedback

**Given** an artifact has been revised
**When** the user is satisfied with the changes
**Then** they can approve the artifact
**And** the workflow proceeds to the next step
**And** the artifact is marked as finalized in its frontmatter

**Given** the user wants to reject an artifact
**When** they indicate rejection
**Then** the artifact is regenerated from the current workflow step
**And** previous context is preserved

**Technical Notes:**
- Review flow integrated into chat interface
- Artifact status in frontmatter: `draft`, `in_review`, `approved`
- Store approval timestamp and approver

---

### Story 2.4: Artifact Viewing and Editing

**As a** Technical Founder,
**I want** to view and edit planning artifacts after generation,
**So that** I can refine them as my understanding evolves.

**FRs Covered:** FR13, FR14

**Test Scope:** Unit

**Acceptance Criteria:**

**Given** planning artifacts exist for a project
**When** the user opens the artifact panel
**Then** a list of all artifacts is displayed with type and status
**And** artifacts are sorted by creation order

**Given** the artifact list is displayed
**When** the user clicks on an artifact
**Then** the artifact content renders in a viewer panel
**And** markdown formatting is properly displayed

**Given** an artifact is displayed in the viewer
**When** the user clicks "Edit"
**Then** the artifact opens in edit mode
**And** the user can modify the markdown content

**Given** an artifact is being edited
**When** the user saves changes
**Then** the artifact file is updated
**And** the `updated_at` timestamp in frontmatter is set
**And** the change is reflected immediately in the viewer

**Technical Notes:**
- Create `ArtifactPanel.tsx` and `ArtifactViewer.tsx` components
- Use existing markdown rendering patterns
- Edit mode can use simple textarea or integrate Monaco editor

**Architecture Links:**
- Component Structure: architecture.md#new-frontend-structure

---

### Story 2.5: Artifact Linking and Navigation

**As a** Technical Founder,
**I want** the system to maintain links between artifacts and navigate between them,
**So that** I can understand how my planning documents relate to each other.

**FRs Covered:** FR15, FR17

**Test Scope:** Unit

**Acceptance Criteria:**

**Given** a story artifact is displayed
**When** the story contains links to PRD or architecture sections
**Then** the links are rendered as clickable elements
**And** clicking a link opens the referenced artifact at that section

**Given** an artifact viewer is open
**When** the user views artifact relationships
**Then** a breadcrumb or relationship indicator shows: Story → Epic → PRD → Architecture
**And** each level is clickable for navigation

**Given** a story is generated from an epic
**When** the story is saved
**Then** the story includes `Context Links` section with references
**And** links use format: `PRD: prd.md#section-id`

**Given** the artifact panel shows the list
**When** an artifact has linked children
**Then** a visual indicator shows the relationship (e.g., epic has N stories)

**Technical Notes:**
- Parse markdown links in artifact content
- Handle cross-artifact navigation in `artifactStore.ts`
- Story file format includes Context Links section per architecture spec

**Architecture Links:**
- Story File Format: architecture.md#story-file-format
- Artifact Linking: architecture.md#context-inheritance

---

### Story 2.6: Git Checkpoint Commits

**As a** Technical Founder,
**I want** to commit planning artifacts to Git as safe checkpoints,
**So that** I have version history and can recover from mistakes.

**FRs Covered:** FR16

**Test Scope:** Integration

**Acceptance Criteria:**

**Given** planning artifacts exist for a project
**When** the user clicks "Commit to Git"
**Then** all artifacts in `.auto-claude/planning/{project}/` are staged
**And** a commit is created with message "Planning checkpoint: {date}"

**Given** a Git commit is in progress
**When** the commit operation completes
**Then** a success notification appears
**And** the commit hash is recorded in session state

**Given** a Git commit fails (e.g., no changes, git error)
**When** the error occurs
**Then** an error notification explains what went wrong
**And** the system does not leave partial commits

**Given** the user wants to see commit history
**When** they view checkpoint history
**Then** previous checkpoint commits are listed with dates
**And** they can view the artifact state at any checkpoint

**Technical Notes:**
- Use existing Auto-Claude git integration patterns
- Atomic commits (all or nothing) per NFR9
- Store last commit hash in `session.json`

**Architecture Links:**
- Git Integration: architecture.md#files-to-modify-existing
- NFR9: Atomic commits

---

## Epic 3: Story-to-Task Conversion

**Goal:** Automatically convert planning artifacts (stories) into executable Kanban tasks, bridging the planning and execution phases.

**User Value:** Planning work seamlessly flows into the existing task management system, ready for sprint execution.

**NFRs Addressed:** NFR3 (5s conversion), NFR14 (schema compatibility), NFR17 (code patterns)

---

### Story 3.1: Story Generation from Epics

**As a** Technical Founder,
**I want** the system to generate stories from epics with proper structure,
**So that** I have implementation-ready stories with clear acceptance criteria.

**FRs Covered:** FR18, FR19, FR20, FR21

**Test Scope:** Unit

**Acceptance Criteria:**

**Given** the epics workflow step is complete
**When** the stories workflow begins
**Then** the system generates stories for each epic
**And** stories are saved to `.auto-claude/planning/{project}/stories/`

**Given** a story is being generated
**When** the generation completes
**Then** the story includes YAML frontmatter with: id, title, epic, status, test_scope
**And** the story follows the template format from architecture

**Given** a story is generated
**When** the story is saved
**Then** it includes acceptance criteria in Given/When/Then format
**And** it specifies test scope (unit, integration, or e2e)
**And** it includes context links to PRD and architecture sections

**Given** story generation is complete
**When** all stories for an epic are created
**Then** story files use naming convention: `story-{NNN}-{slug}.md`
**And** stories are numbered sequentially across all epics

**Technical Notes:**
- Story template defined in architecture.md
- Test scope defaults to `unit`, elevated for integration points
- Create `planning/story_converter.py` for story generation

**Architecture Links:**
- Story File Format: architecture.md#story-file-format
- Artifact Naming: architecture.md#artifact-file-naming

---

### Story 3.2: Story Review and Editing

**As a** Technical Founder,
**I want** to review and edit stories before converting to tasks,
**So that** I can apply the "clarity test" and ensure stories are implementation-ready.

**FRs Covered:** FR22

**Test Scope:** Unit

**Acceptance Criteria:**

**Given** stories have been generated
**When** the user views the story list
**Then** all stories are displayed with title, epic, and status
**And** stories are grouped by epic

**Given** the story list is displayed
**When** the user clicks on a story
**Then** the full story content is displayed
**And** acceptance criteria are clearly visible

**Given** a story is displayed
**When** the user identifies needed changes
**Then** they can edit the story content directly
**And** changes are saved to the story file

**Given** stories are being reviewed
**When** the user applies the "clarity test" (could I implement this myself?)
**Then** they can mark stories as "ready" or "needs refinement"
**And** the status is updated in the story frontmatter

**Technical Notes:**
- Create `StoryList.tsx` component
- Story status: `draft`, `ready`, `in_progress`, `completed`, `failed`
- Integrate with `ArtifactViewer.tsx` for consistent editing experience

---

### Story 3.3: Kanban Task Creation

**As a** Technical Founder,
**I want** approved stories to automatically become Kanban tasks,
**So that** I can execute planned work through the existing task system.

**FRs Covered:** FR23, FR24

**Test Scope:** Integration

**Acceptance Criteria:**

**Given** stories have been marked as "ready"
**When** the user clicks "Convert to Tasks"
**Then** each ready story creates a corresponding Kanban task
**And** conversion completes within 5 seconds per story

**Given** a story is converted to a task
**When** the task is created
**Then** the task appears in the "Backlog" column
**And** the task includes: name, description (summary), acceptance criteria
**And** the task references the source story file path

**Given** tasks are created from stories
**When** the user views a task
**Then** they can see a link to the full story file
**And** clicking the link opens the story in the artifact viewer

**Given** a story has already been converted to a task
**When** the user attempts to convert again
**Then** the system warns about duplicate task
**And** offers to update existing task instead

**Technical Notes:**
- Integrate with existing `taskStore.ts`
- Task schema extends existing task type with `storyPath` field
- Cache key display fields: name, description, acceptanceCriteria (summary)
- Use Reference + Cache model per architecture decision

**Architecture Links:**
- Story-to-Task Integration: architecture.md#story-to-task-integration
- Task Schema: architecture.md#reference--cache-hybrid

---

## Epic 4: Sprint Planning & Queue Management

**Goal:** Enable users to organize tasks into sprints with priority ordering, preparing work for overnight execution.

**User Value:** Users can batch work into sprints and control execution order, maximizing overnight throughput.

**NFRs Addressed:** NFR5 (1s render), NFR12 (IPC patterns), NFR23 (separate logic)

---

### Story 4.1: Sprint Tagging and Assignment

**As a** Technical Founder,
**I want** to tag tasks with sprint indicators and assign them to sprints,
**So that** I can organize work into executable batches.

**FRs Covered:** FR25, FR26, FR29

**Test Scope:** Unit

**Acceptance Criteria:**

**Given** tasks exist in the Kanban Backlog
**When** the user selects a task
**Then** they can assign it to a sprint via dropdown or tag
**And** the sprint tag appears as a colored indicator on the task

**Given** the user wants to create a new sprint
**When** they click "New Sprint"
**Then** a sprint is created with a name and status "not started"
**And** the sprint appears in the sprint selector

**Given** tasks are assigned to a sprint
**When** the user views the Kanban board
**Then** sprint-tagged tasks show their sprint indicator
**And** different sprints have different colored tags

**Given** a task is assigned to a sprint
**When** the user wants to remove it from the sprint
**Then** they can unassign the task
**And** the sprint tag is removed

**Technical Notes:**
- Create `sprintStore.ts` for sprint state
- Sprint indicators as colored badges on task cards
- Sprint data stored in `sprint-queue.json`

**Architecture Links:**
- Sprint Execution Architecture: architecture.md#sprint-execution-architecture

---

### Story 4.2: Sprint Queue Prioritization

**As a** Technical Founder,
**I want** to prioritize stories within a sprint queue,
**So that** the AI executes the most important work first.

**FRs Covered:** FR27, FR28

**Test Scope:** Unit

**Acceptance Criteria:**

**Given** a sprint has multiple stories assigned
**When** the user opens the sprint queue view
**Then** all sprint stories are displayed in priority order
**And** the priority number is visible for each story

**Given** the sprint queue is displayed
**When** the user drags a story to reorder
**Then** the priority order updates
**And** the `sprint-queue.json` is saved with new order

**Given** the sprint queue is displayed
**When** the user views story details
**Then** they can see the full story without leaving the queue view
**And** context links are accessible

**Given** story priorities are set
**When** the sprint executes
**Then** stories execute in priority order (1 = first)
**And** the queue respects the user-defined sequence

**Technical Notes:**
- Create `SprintQueue.tsx` component with drag-and-drop
- Priority stored as integer in `sprint-queue.json`
- Queue format per architecture: `{ sprint_id, queue: [{ story_id, priority, status }] }`

**Architecture Links:**
- Sprint Queue JSON: architecture.md#sprint-execution-architecture

---

### Story 4.3: Sprint Status Tracking

**As a** Technical Founder,
**I want** the system to track sprint status,
**So that** I know whether a sprint is ready, running, or complete.

**FRs Covered:** FR30

**Test Scope:** Unit

**Acceptance Criteria:**

**Given** a sprint exists
**When** viewing sprint information
**Then** the sprint status is displayed: not_started, in_progress, completed
**And** the status updates as execution proceeds

**Given** a sprint status is "not_started"
**When** sprint execution begins
**Then** the status changes to "in_progress"
**And** the `started_at` timestamp is recorded

**Given** a sprint is "in_progress"
**When** all stories complete or fail
**Then** the status changes to "completed"
**And** the `completed_at` timestamp is recorded

**Given** sprint status tracking is active
**When** viewing the sprint list
**Then** all sprints show their current status
**And** active sprints are highlighted

**Technical Notes:**
- Sprint status in `sprint-queue.json`: `status` field
- Timestamps: `started_at`, `completed_at`
- Status transitions managed by execution engine

---

## Epic 5: Overnight Execution Engine

**Goal:** Enable automatic sprint execution that runs overnight, picking stories from the queue and handling failures gracefully.

**User Value:** Users can queue work and wake up to completed sprints - the "morning after" experience.

**NFRs Addressed:** NFR6 (retry logic), NFR7 (no crash on failure), NFR10 (crash recovery), NFR11 (backend process model), NFR23 (separate execution logic)

---

### Story 5.1: Sprint Execution Launcher

**As a** Technical Founder,
**I want** to start sprint execution that runs automatically,
**So that** the AI works on my sprint while I sleep.

**FRs Covered:** FR31, FR32

**Test Scope:** Integration

**Acceptance Criteria:**

**Given** a sprint has prioritized stories
**When** the user clicks "Start Sprint"
**Then** the sprint execution begins
**And** the sprint status changes to "in_progress"

**Given** sprint execution is running
**When** a story completes
**Then** the AI automatically picks the next prioritized story
**And** execution continues without manual intervention

**Given** sprint execution is active
**When** the user closes the application
**Then** execution continues in the background
**And** results are available when the app reopens

**Given** the sprint queue has stories
**When** execution picks the next story
**Then** it selects the highest priority story with status "pending"
**And** marks it as "in_progress"

**Technical Notes:**
- Create `planning/sprint_executor.py` in backend
- Sprint execution runs as background process
- Auto-pickup logic reads `sprint-queue.json` for next story

**Architecture Links:**
- Sprint Execution: architecture.md#sprint-execution-architecture
- Execution Logic: Separate from story execution (NFR23)

---

### Story 5.2: Story Execution via Agent Pipeline

**As a** Technical Founder,
**I want** stories to execute using the existing Auto-Claude agent pipeline,
**So that** planned work is built the same way as regular tasks.

**FRs Covered:** FR33, FR34

**Test Scope:** Integration

**Acceptance Criteria:**

**Given** a story is picked for execution
**When** execution begins
**Then** the story is executed via the existing Auto-Claude agent pipeline
**And** the full story context (acceptance criteria, links) is provided to the agent

**Given** a story is executing
**When** the implementation completes and tests pass
**Then** the story status is updated to "completed"
**And** the task in Kanban is also marked complete

**Given** story execution is in progress
**When** the agent needs story context
**Then** it reads the full story file from the reference path
**And** has access to PRD and architecture via links

**Given** a story completes successfully
**When** updating the sprint queue
**Then** the story entry shows status "completed"
**And** the timestamp is recorded

**Technical Notes:**
- Integrate with existing `agents/` pipeline (planner, coder, qa)
- Story file provides full context for agent execution
- Sync task status with story status on completion

**Architecture Links:**
- Existing Agent Pipeline: CLAUDE.md (Planner → Coder → QA)
- Context Loading: Reference + Cache model

---

### Story 5.3: Failure Recording and Notes

**As a** Technical Founder,
**I want** failures to be recorded with AI notes explaining what went wrong,
**So that** I can quickly understand and fix issues in the morning.

**FRs Covered:** FR35, FR36

**Test Scope:** Unit

**Acceptance Criteria:**

**Given** a story execution fails
**When** the failure is detected
**Then** the story status is updated to "failed"
**And** the story is marked for review in the sprint queue

**Given** a story fails
**When** the failure is recorded
**Then** the AI records failure notes explaining what went wrong
**And** the notes are stored in the story file under a "Failure Log" section

**Given** failure notes are recorded
**When** the user reviews the failed story
**Then** they can see the specific error, attempted solutions, and AI observations
**And** the notes help them refine the story for retry

**Given** a story fails during execution
**When** updating the sprint queue
**Then** the queue entry shows status "failed"
**And** includes a summary of the failure reason

**Technical Notes:**
- Failure notes appended to story file
- Sprint queue entry includes `failure_reason` summary
- Preserve full agent logs for debugging

---

### Story 5.4: Non-Blocking Failure Handling

**As a** Technical Founder,
**I want** failed stories not to block the sprint,
**So that** overnight execution maximizes throughput.

**FRs Covered:** FR37, FR38

**Test Scope:** Integration

**Acceptance Criteria:**

**Given** a story fails during sprint execution
**When** the failure is handled
**Then** the sprint execution continues with the next story
**And** failed stories do not block remaining work

**Given** the sprint queue has remaining stories
**When** one story fails
**Then** the next prioritized story is automatically picked
**And** the sprint continues until all stories are attempted

**Given** some stories depend on a failed story
**When** the failed story is detected
**Then** dependent stories are skipped (if dependencies defined)
**And** non-dependent stories continue execution

**Given** sprint execution encounters transient errors
**When** an error is detected (network, timeout)
**Then** the system retries with exponential backoff
**And** marks as failed only after retry exhaustion

**Technical Notes:**
- Retry logic with configurable attempts (default: 3)
- Dependency checking based on story links (future enhancement)
- Continue execution even with multiple failures

**Architecture Links:**
- Failure Handling: architecture.md#error-handling
- NFR6: Retry logic, NFR7: No crash on failure

---

## Epic 6: Sprint Dashboard & Visibility

**Goal:** Provide clear visibility into sprint results, failure details, and enable stakeholder sharing.

**User Value:** Users can review overnight execution results quickly and share progress with stakeholders.

**NFRs Addressed:** NFR2 (2s dashboard load), NFR5 (1s filter), NFR13 (markdown format)

---

### Story 6.1: Sprint Dashboard Overview

**As a** Technical Founder,
**I want** to view a sprint dashboard showing overall status,
**So that** I can quickly see results in the morning.

**FRs Covered:** FR39, FR43

**Test Scope:** Unit

**Acceptance Criteria:**

**Given** a sprint has been executed
**When** the user opens the Sprint Dashboard
**Then** an overview shows: completed count, failed count, pending count
**And** the dashboard loads within 2 seconds

**Given** the sprint dashboard is displayed
**When** viewing the summary
**Then** overall progress is shown (e.g., "8 of 12 stories completed")
**And** a visual progress bar or chart is displayed

**Given** the sprint dashboard is displayed
**When** the user views the story list
**Then** stories are grouped by status: Completed, Failed, Pending
**And** each story shows its title and brief status

**Given** the dashboard shows sprint results
**When** new execution results arrive
**Then** the dashboard updates without full page reload
**And** real-time status is reflected

**Technical Notes:**
- Create `SprintDashboard.tsx` component
- Summary stats calculated from `sprint-queue.json`
- Visual progress using existing chart patterns or simple bars

**Architecture Links:**
- Component: `components/planning/SprintDashboard.tsx`

---

### Story 6.2: Failure Details and AI Notes

**As a** Technical Founder,
**I want** to view failure details and AI notes for failed stories,
**So that** I can understand what went wrong and fix issues.

**FRs Covered:** FR40

**Test Scope:** Unit

**Acceptance Criteria:**

**Given** the sprint dashboard shows failed stories
**When** the user clicks on a failed story
**Then** the failure details panel opens
**And** AI notes explaining the failure are displayed

**Given** failure details are displayed
**When** the user reviews the notes
**Then** they see: error description, attempted solutions, AI observations
**And** links to relevant code or logs are provided

**Given** the failure details panel is open
**When** the user wants to see full context
**Then** they can open the story file
**And** view the complete Failure Log section

**Given** a failed story has been reviewed
**When** the user is ready to retry
**Then** they can update the story and re-queue it for execution
**And** the story status changes back to "pending"

**Technical Notes:**
- Failure details panel as slide-over or modal
- Parse Failure Log section from story markdown
- "Retry" action updates status and re-queues

---

### Story 6.3: Kanban Sprint Filtering and Context

**As a** Technical Founder,
**I want** to filter the Kanban board by sprint and see story context on tasks,
**So that** I can focus on specific sprint work and access full context.

**FRs Covered:** FR41, FR42

**Test Scope:** Unit

**Acceptance Criteria:**

**Given** the Kanban board is displayed
**When** the user selects a sprint filter
**Then** only tasks from that sprint are shown
**And** the filter completes within 1 second

**Given** sprint filtering is active
**When** the user clears the filter
**Then** all tasks are shown again
**And** sprint indicators remain visible on tasks

**Given** a task created from a story is displayed
**When** the user views task details
**Then** a "View Story" link is visible
**And** context links to PRD/architecture are accessible

**Given** the user clicks "View Story" on a task
**When** the story opens
**Then** the full story content is displayed in the artifact viewer
**And** the user can navigate to linked artifacts

**Technical Notes:**
- Add sprint filter to Kanban toolbar
- Task detail panel includes story link
- Reuse existing Kanban filtering patterns

---

### Story 6.4: Stakeholder Sharing

**As a** Technical Founder,
**I want** to share planning artifacts with stakeholders,
**So that** my co-founder and team can review plans without full system access.

**FRs Covered:** FR44, FR45, FR46

**Test Scope:** Unit

**Acceptance Criteria:**

**Given** planning artifacts exist
**When** the user clicks "Share Artifacts"
**Then** a shareable view is generated with selected artifacts
**And** the view is read-only (no editing capabilities)

**Given** a stakeholder is reviewing shared artifacts
**When** they view PRD and epic summaries
**Then** the content is readable without technical tool knowledge
**And** navigation between linked documents works

**Given** a stakeholder provides feedback
**When** the Technical Founder receives the feedback
**Then** they can add new stories based on suggestions
**And** stories can be added to the sprint queue

**Given** the sharing feature is used
**When** artifacts are shared
**Then** no sensitive data (tokens, paths) is exposed
**And** only planning content is visible

**Technical Notes:**
- MVP: Export to markdown/HTML for manual sharing
- Future: Generate shareable link (requires backend service)
- Sanitize paths and system info from shared content

---

## Implementation Notes

### Epic Sequencing

The epics are designed to be implemented sequentially:

1. **Epic 1** establishes the foundation (UI, sessions, chat)
2. **Epic 2** adds BMAD value (workflows, artifacts)
3. **Epic 3** bridges to execution (stories → tasks)
4. **Epic 4** enables batching (sprint planning)
5. **Epic 5** delivers automation (overnight execution)
6. **Epic 6** provides visibility (dashboard, sharing)

Each epic delivers standalone value while enabling subsequent epics.

### Story Independence

Within each epic, stories are ordered by dependency but designed to be independently implementable. Stories that share components should be sequenced appropriately, but each story can be validated and completed on its own.

### Test Coverage

Per NFR16, AI-generated code should achieve 80-90% test coverage. Each story specifies its test scope:
- **Unit**: Isolated component testing (most stories)
- **Integration**: Cross-component testing (stories touching multiple systems)
- **E2E**: Full flow testing (major milestone stories only)

### Architecture Compliance

All stories reference the architecture document for:
- Data structures and schemas
- IPC channel naming
- Component placement
- Integration patterns

Developers should consult `architecture.md` for implementation details not specified in story acceptance criteria.
