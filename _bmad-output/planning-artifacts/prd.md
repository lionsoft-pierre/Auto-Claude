---
stepsCompleted: [1, 2, 3, 4, 7, 8, 9, 10, 11]
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-Auto-Claude-2026-01-15.md
  - docs/architecture.md
  - docs/backend/README.md
  - docs/backend/agents.md
  - docs/frontend/README.md
workflowType: 'prd'
lastStep: 11
date: 2026-01-15
author: Pierre
documentCounts:
  briefs: 1
  research: 0
  projectDocs: 4
projectType: desktop_app
domain: general
complexity: medium
projectContext: brownfield
---

# Product Requirements Document - Auto-Claude Planning Mode

**Author:** Pierre
**Date:** 2026-01-15

## Executive Summary

Auto-Claude's Planning Mode transforms the autonomous coding experience from "fire and forget" to "design then execute with confidence." By integrating structured planning methodologies (starting with BMAD) directly into Auto-Claude, users can collaboratively reason through features before committing execution credits - ensuring AI has the full context needed to build exactly what's envisioned.

The core insight: iteration is expensive in the wrong place. Currently, users discover misalignments after code is written. Planning Mode moves iteration to where it's cheap (conversation) so execution can be confident and efficient.

**The Problem:**
Auto-Claude users experience a "black box" problem: they provide a task, the system executes autonomously with little visibility or control, and the result may not match their vision. By the time they see the output, significant credits and time have been spent - making course corrections costly. The root cause isn't AI capability - it's lack of context and premature commitment.

**The Solution:**
Planning Mode opens a dedicated planning session where users can:
1. Select a methodology (BMAD initially, extensible to others)
2. Collaborate with an AI analyst through conversational back-and-forth
3. Produce structured artifacts: Product Brief → PRD → Architecture → Epics → Stories
4. Generate Kanban tasks automatically from stories - each a single developable unit
5. Execute sprints overnight with AI auto-picking tasks from queue

### What Makes This Special

1. **Planning as first-class feature** - Not an afterthought. "Think together first, then build."
2. **Methodology-agnostic architecture** - BMAD first, but designed for extensibility. Output is standardized (stories → tasks), journey can vary.
3. **Human-in-the-loop at the right moment** - Iterate when it's cheap (planning phase), execute when confident (tasks are well-defined).
4. **Context flows downstream** - Each story inherits context from PRD, architecture, and epic. AI never loses sight of the bigger picture.
5. **Integrated experience** - No more switching between Claude Code for planning and Auto-Claude for execution. One product, end-to-end.
6. **Sprint Queue Model** - AI auto-picks next story from queue; failed tests mark for review but don't block sprint. Maximizes overnight throughput.

## Project Classification

**Technical Type:** Desktop Application (Electron) + Developer Tool
**Domain:** General / Developer Tooling
**Complexity:** Medium
**Project Context:** Brownfield - extending existing Auto-Claude system

This PRD defines Planning Mode as a new feature integrated into the existing Auto-Claude architecture:
- **Frontend:** Electron + React + TypeScript - will add Planning Mode UI with chat interface and sprint dashboard
- **Backend:** Python + Claude Agent SDK - will integrate BMAD methodology workflows and sprint execution engine
- **Integration Pattern:** File-based IPC between frontend and backend, consistent with existing architecture

## Success Criteria

### User Success

**The "Morning After" Moment:**
The primary user success indicator is waking up to a completed sprint - multiple stories done, tests passing, ready for review. This represents the transformation from "black box anxiety" to "confident execution."

**Key User Success Indicators:**
- **Story Clarity:** User can read any story and say "I could implement that myself"
- **Planning Confidence:** User feels confident committing to sprint execution after planning session
- **Overnight Throughput:** Sprint queue executes without intervention while user sleeps
- **Safe Iteration:** Failed stories are marked for review without blocking the sprint
- **Context Preservation:** AI never "goes off and does its own thing" - it follows the plan

### Business Success

**Primary Objective:** Enable the company to develop products faster with higher accuracy and value.

**Business Success Metrics:**
| Metric | Target | Timeframe |
|--------|--------|-----------|
| Feature velocity | Increase features shipped per month | 3 months |
| Project completion rate | Reduce abandoned/incomplete projects | 6 months |
| AI utilization | Maximize overnight Claude Max usage | Immediate |
| Headcount efficiency | Deliver more with existing team | 6 months |

**Internal Tool Focus:** Success is measured by internal productivity gains, not market adoption or revenue.

### Technical Success

**Code Quality:**
- 80-90% test coverage on AI-written code
- All code follows existing project patterns
- No security vulnerabilities introduced

**System Reliability:**
- Sprint execution completes without crashes
- Git artifacts safely committed as checkpoints
- Recovery from failures without data loss

**Integration Quality:**
- Planning Mode integrates seamlessly with existing Kanban
- BMAD workflows execute within Auto-Claude context
- File-based IPC maintains existing architecture patterns

### Measurable Outcomes

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Stories completed without intervention | >80% | Track stories passing QA on first attempt |
| Test coverage | 80-90% | Automated coverage reporting per story |
| Story clarity rate | 100% | Pre-execution review passes clarity test |
| Rework cycles per story | <2 | Track stories requiring fixes after QA |
| Sprint completion rate | >90% | Stories completed vs. planned per sprint |

## Product Scope

### MVP - Minimum Viable Product

**Must have for MVP:**
1. **Planning Mode UI** - Dedicated chat interface for methodology sessions
2. **BMAD Integration** - Full artifact chain: Brief → PRD → Architecture → Epics → Stories
3. **Story → Task Conversion** - Stories automatically become Kanban tasks
4. **Sprint Planning** - Prioritize stories into sprint queue
5. **Sprint Execution** - AI auto-picks next story from queue
6. **Sprint Dashboard** - Simple status view (completed/failed/pending)
7. **Git Integration** - All artifacts committed as safe checkpoints

### Growth Features (Post-MVP)

- Multiple methodology support (Speckit and others)
- Visual epic/story tree view
- Dependency graph visualization
- Sprint velocity analytics
- Story pattern analysis (which patterns yield highest success rates)

### Vision (Future)

- Executive summary generation for non-technical stakeholders
- Multi-user collaboration and review workflows
- Real-time progress monitoring during execution
- AI-powered story refinement suggestions based on historical success patterns
- Cross-project learning and pattern sharing

## User Journeys

### Journey 1: Pierre - The Overnight Sprint Workflow (Primary User - Success Path)

Pierre is a Technical Founder building multiple products. He's frustrated - every time he hands off work to Auto-Claude, it "goes off and does its own thing." He's spent days wrestling with AI, ending up with a mishmash of code that doesn't match his vision. Several projects sit incomplete on his hard drive, abandoned after expensive rework cycles.

One evening, Pierre decides to try Planning Mode for a new feature. Instead of writing a vague task description and hoping for the best, he opens a planning session and selects BMAD methodology. Over the next hour, he collaborates with an AI analyst - answering questions, refining requirements, making architectural decisions. By the end, he has a complete artifact chain: Product Brief → PRD → Architecture → 3 Epics → 12 Stories.

He reviews each story and applies the "clarity test" - could he implement this himself? They all pass. He commits the artifacts to Git (safe checkpoint), prioritizes the stories into a sprint queue, and starts the overnight execution before bed.

The next morning, Pierre checks the sprint dashboard over coffee. 10 of 12 stories completed with tests passing. 2 marked for review - one failed a test, one hit an edge case. He spends 30 minutes reviewing the failures, refines those stories with better context, and queues them for the next sprint.

**Success Moment:** Three weeks later, Pierre has shipped a complete feature that would have taken months of back-and-forth. For the first time, the AI built exactly what he envisioned - because he took the time to envision it properly first.

### Journey 2: Pierre - Course Correction Mid-Sprint (Primary User - Edge Case)

Two weeks into using Planning Mode, Pierre queues a sprint for a payment integration feature. The next morning, he checks the dashboard - 4 stories completed, but story #5 failed repeatedly. The AI attempted it three times, each time hitting the same issue: the Stripe API changed since the architecture was written.

Pierre opens the failed story and sees the AI's notes: "Unable to find `createPaymentMethod` - API documentation shows deprecated endpoint." Instead of frustration, Pierre feels informed. He knows exactly what went wrong.

He opens a quick planning session, updates the architecture document with the new Stripe API patterns, and regenerates the affected stories. The AI suggests: "3 other stories reference this pattern - should I update those too?" Pierre confirms, the stories are updated, and he re-queues the sprint.

**Success Moment:** Instead of discovering the API mismatch after days of broken code, Pierre caught it in the morning review, fixed the root cause in the architecture, and kept moving. The "scope for failure" was small because each story was small.

### Journey 3: Sarah - The Co-founder Review (Secondary User - Stakeholder)

Sarah is Pierre's co-founder and handles the business side. She doesn't code, but she needs to know where the product is heading and whether Pierre's technical plans align with their business goals.

On Tuesday evening, Pierre finishes a planning session for their new analytics dashboard. Before committing to the sprint, he calls Sarah over. "Let me walk you through what we're building this week."

He opens the PRD in Planning Mode and reads through the Executive Summary together. Sarah asks questions: "Will this show us customer retention?" Pierre checks the stories - yes, there's a story for retention metrics. "What about comparing months?" That's in the Growth Features section, not MVP. Sarah agrees that's the right priority.

Sarah doesn't read every story, but she reviews the epic summaries and success criteria. She suggests adding a story for "export to spreadsheet" - something their investors always ask for. Pierre adds it to the sprint queue.

**Success Moment:** Sarah feels included in technical decisions without needing to understand the code. The planning artifacts give her visibility without overwhelming her with implementation details.

### Journey 4: Marcus - The Developer Handoff (Secondary User - Executor)

Marcus is a contract developer Pierre brings in for overflow work. In the past, Pierre would spend hours explaining context, only for Marcus to still ask questions mid-implementation. Projects dragged on as Marcus waited for clarification.

Now, Pierre assigns Marcus a story from the sprint queue. Marcus opens it and finds:
- Clear description of what to build
- Acceptance criteria he can check off
- Links to the relevant PRD section and architecture decisions
- Test scope defined (unit tests only for this component story)
- Interface contracts already defined - he knows exactly what inputs/outputs are expected

Marcus starts coding immediately. When he hits an ambiguity about error handling, he checks the linked architecture doc - it's already specified. He completes the story in half the time it would have taken before.

Two days later, Marcus flags an issue: "The architecture says to use WebSockets, but the existing codebase uses Server-Sent Events." He raises this in the story comments. Pierre reviews it, agrees it's a conflict, and updates the architecture. The feedback loop worked.

**Success Moment:** Marcus never felt blocked waiting for Pierre. The stories were self-contained enough to execute independently, and when he found a real issue, it flowed back to improve the planning artifacts.

### Journey Requirements Summary

These journeys reveal the following capability requirements:

| Journey | Key Capabilities Required |
|---------|--------------------------|
| Pierre - Overnight Sprint | Planning UI, BMAD integration, artifact chain, story generation, sprint queue, overnight execution, morning dashboard |
| Pierre - Course Correction | Failure visibility, AI notes on failures, architecture updates, story regeneration, cascade updates |
| Sarah - Co-founder Review | PRD readability, epic summaries, success criteria visibility, story queue management |
| Marcus - Developer Handoff | Story detail view, context links, acceptance criteria, interface contracts, feedback/comments system |

**Core Capabilities Identified:**
1. **Planning Session UI** - Chat interface for methodology collaboration
2. **Artifact Management** - Create, link, and version planning documents
3. **Story Generation** - Convert epics to independent, testable stories
4. **Sprint Planning** - Queue and prioritize stories for execution
5. **Sprint Execution** - AI auto-picks and executes stories overnight
6. **Sprint Dashboard** - Status visibility (completed/failed/pending)
7. **Failure Handling** - Clear notes on why stories failed, easy re-queue
8. **Context Linking** - Stories link to PRD, architecture, not duplicate
9. **Feedback Loop** - Developer comments flow back to planning artifacts

## Desktop Application Requirements

### Project-Type Overview

Planning Mode extends the existing Auto-Claude Electron desktop application. As a brownfield project, it inherits the established cross-platform architecture (macOS, Windows, Linux), auto-update mechanism, and system integration patterns.

### UI Integration

**Sidebar Navigation:**
- New "Planning" item added to existing sidebar menu
- Positioned alongside Kanban Board, Agent Terminals, Insights, Roadmap, Ideation
- Opens an Insights-style chat interface for methodology sessions

**Kanban Board Updates:**
- Rename "Planning" column to "Backlog"
- Add sprint indicator via colored flags/tags on task items
- Sprint tags show which sprint each story belongs to

**Planning View:**
- Chat-style interface similar to existing Insights view
- Supports conversational BMAD methodology workflow
- Displays planning session progress and artifact generation status

### Backend Integration

**Communication Pattern:**
- Use existing Python backend IPC pattern
- Planning sessions invoke BMAD workflows via backend
- File-based IPC maintains existing architecture consistency

**BMAD Integration:**
- Configure BMAD's `planning_artifacts` path to `.auto-claude/planning/`
- BMAD workflows execute within Auto-Claude context
- No modification to BMAD workflow logic, only path configuration

### File Storage Architecture

**Unified Storage in `.auto-claude/`:**
```
.auto-claude/
  planning/                    # BMAD artifacts
    product-brief.md
    prd.md
    architecture.md
    epics/
      epic-1.md
    stories/
      story-1-1.md
  specs/                       # Existing spec storage
    001-feature/
```

**Rationale:** Single location for all Auto-Claude data maintains consistency and simplifies backup/version control.

### Story-to-Task Integration

**Automatic Task Creation:**
- Stories generated by Planning Mode automatically create Kanban tasks
- Tasks appear in "Backlog" column
- Each task links to source story file in `.auto-claude/planning/stories/`

**Context Linking (not duplication):**
- Story tasks contain links to PRD, Architecture, Epic
- Clicking links opens referenced artifact
- Avoids content duplication, maintains single source of truth

### Sprint Management

**Sprint Indicators:**
- Colored flags/tags on Kanban items indicate sprint membership
- Visual differentiation without separate columns
- Supports multiple concurrent sprints if needed

**Sprint Queue:**
- Stories tagged for current sprint feed into execution queue
- AI agent picks from sprint-tagged stories in priority order
- Failed stories retain sprint tag for re-execution

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Platform MVP - Build the complete planning-to-execution foundation that enables future methodology expansion.

**Rationale:** The core value proposition requires the full loop (Planning → Stories → Sprint → Execution) to work. A partial implementation wouldn't demonstrate the "cheap iteration before expensive execution" insight.

**Resource Requirements:**
- Solo developer (Technical Founder) with AI assistance
- Leverage existing Auto-Claude infrastructure
- BMAD integration via path configuration (minimal modification)

### MVP Feature Set (Phase 1)

**Core User Journey Supported:** Pierre's Overnight Sprint Workflow

**Must-Have Capabilities:**

| Feature | Purpose | Success Criteria |
|---------|---------|------------------|
| Planning Mode UI | Chat interface for methodology sessions | Insights-style experience |
| BMAD Integration | Full artifact chain execution | Brief → PRD → Architecture → Epics → Stories |
| Story → Task Conversion | Automatic Kanban task creation | Stories appear in Backlog column |
| Sprint Planning | Queue prioritization | Tag stories with sprint indicators |
| Sprint Execution | AI auto-picks from queue | Overnight execution without intervention |
| Sprint Dashboard | Status visibility | Completed/failed/pending at a glance |
| Git Integration | Safe checkpoints | Artifacts committed before execution |

### Post-MVP Features

**Phase 2 - Growth:**
- Multiple methodology support (Speckit, others)
- Visual epic/story tree view
- Sprint velocity analytics
- Story pattern analysis (which patterns yield highest success)

**Phase 3 - Expansion:**
- Executive summary generation for non-technical stakeholders
- Multi-user collaboration and review workflows
- Real-time progress monitoring during execution
- AI-powered story refinement suggestions
- Cross-project learning and pattern sharing

### Risk Mitigation Strategy

**Technical Risks:**
- *Risk:* BMAD path configuration may require workflow adjustments
- *Mitigation:* Test path configuration early; BMAD's `config.yaml` already supports custom paths

**Integration Risks:**
- *Risk:* Story-to-task conversion may not map cleanly to existing Kanban data model
- *Mitigation:* Design story schema to align with existing task schema; add linking fields

**Scope Risks:**
- *Risk:* Feature creep toward multi-methodology before MVP validation
- *Mitigation:* Strict BMAD-only for MVP; methodology abstraction layer designed but not implemented

## Functional Requirements

### Planning Session Management

- FR1: User can initiate a new planning session from the sidebar
- FR2: User can select a methodology (BMAD) when starting a planning session
- FR3: User can interact with the planning session via chat-style interface
- FR4: User can view planning session history and resume previous sessions
- FR5: User can save planning session progress at any point
- FR6: System can display planning session progress and current workflow step

### Methodology Execution

- FR7: System can execute BMAD workflow steps (Brief → PRD → Architecture → Epics → Stories)
- FR8: System can present methodology-specific questions and capture user responses
- FR9: System can generate planning artifacts based on workflow execution
- FR10: System can validate artifact completeness before proceeding to next workflow step
- FR11: User can review and approve generated artifacts before finalizing

### Artifact Management

- FR12: System can create and store planning artifacts in `.auto-claude/planning/`
- FR13: User can view any planning artifact (Product Brief, PRD, Architecture, Epic, Story)
- FR14: User can edit planning artifacts after generation
- FR15: System can maintain links between related artifacts (Story → Epic → PRD → Architecture)
- FR16: User can commit planning artifacts to Git as a checkpoint
- FR17: System can display artifact relationships and navigation between linked documents

### Story Management

- FR18: System can generate stories from epics based on architecture decisions
- FR19: Each story can specify its test scope (Unit, Integration, E2E)
- FR20: Each story can include acceptance criteria
- FR21: Each story can link to relevant PRD sections and architecture decisions
- FR22: User can review and edit stories before converting to tasks
- FR23: System can automatically convert approved stories to Kanban tasks
- FR24: Tasks created from stories appear in the Backlog column

### Sprint Management

- FR25: User can tag stories/tasks with sprint indicators (colored flags/tags)
- FR26: User can assign multiple stories to a sprint
- FR27: User can prioritize stories within a sprint queue
- FR28: User can view all stories assigned to a specific sprint
- FR29: User can remove stories from a sprint
- FR30: System can track sprint status (not started, in progress, completed)

### Execution Engine

- FR31: System can execute sprint queue automatically (overnight mode)
- FR32: AI agent can pick the next prioritized story from the sprint queue
- FR33: System can execute a story using existing Auto-Claude agent pipeline
- FR34: System can mark stories as completed when tests pass
- FR35: System can mark stories for review when execution fails
- FR36: System can record failure notes explaining why a story failed
- FR37: Failed stories do not block execution of remaining sprint stories
- FR38: System can continue sprint execution with non-dependent stories after failure

### Dashboard & Visibility

- FR39: User can view sprint dashboard showing completed/failed/pending status
- FR40: User can view failure details and AI notes for failed stories
- FR41: User can filter Kanban board by sprint indicator
- FR42: User can see story context links when viewing a task
- FR43: System can display overall sprint progress (X of Y stories completed)

### Stakeholder Access

- FR44: User can share planning artifacts with stakeholders (read-only view)
- FR45: User can walk through PRD and epic summaries for stakeholder review
- FR46: User can add stories to sprint queue based on stakeholder feedback

## Non-Functional Requirements

### Performance

- NFR1: Planning session UI responds to user input within 500ms
- NFR2: Sprint dashboard loads and displays status within 2 seconds
- NFR3: Story-to-task conversion completes within 5 seconds per story
- NFR4: Artifact file operations (save, load) complete within 1 second
- NFR5: Kanban board with sprint filtering renders within 1 second

### Reliability

- NFR6: Sprint execution continues running through transient errors (retry logic)
- NFR7: Failed story execution does not crash the sprint runner
- NFR8: Planning session state is auto-saved every 30 seconds to prevent data loss
- NFR9: Git checkpoint commits succeed or fail atomically (no partial commits)
- NFR10: System recovers gracefully from backend process crashes

### Integration

- NFR11: BMAD workflows execute within existing Auto-Claude backend process model
- NFR12: File-based IPC between frontend and backend follows existing patterns
- NFR13: Planning artifacts use markdown format compatible with existing Auto-Claude viewers
- NFR14: Story schema extends (not replaces) existing task schema for Kanban compatibility
- NFR15: Git operations use existing Auto-Claude git integration patterns

### Code Quality

- NFR16: AI-generated code achieves 80-90% test coverage
- NFR17: New Planning Mode code follows existing Auto-Claude coding patterns
- NFR18: TypeScript strict mode enabled for all frontend additions
- NFR19: Python type hints required for all backend additions
- NFR20: No new security vulnerabilities introduced (follow existing security model)

### Maintainability

- NFR21: Planning Mode code is modular to support future methodology additions
- NFR22: BMAD path configuration is externalized (not hardcoded)
- NFR23: Sprint execution logic is separate from story execution logic
- NFR24: UI components follow existing Radix UI + Tailwind patterns

