---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments:
  - docs/architecture.md
  - docs/backend/README.md
  - docs/frontend/README.md
  - docs/backend/agents.md
date: 2026-01-15
author: Pierre
---

# Product Brief: Auto-Claude Planning Mode

## Executive Summary

Auto-Claude's Planning Mode transforms the autonomous coding experience from "fire and forget" to "design then execute with confidence." By integrating structured planning methodologies (starting with BMAD) directly into Auto-Claude, users can collaboratively reason through features before committing execution credits - ensuring AI has the full context needed to build exactly what's envisioned.

The core insight: iteration is expensive in the wrong place. Currently, users discover misalignments after code is written. Planning Mode moves iteration to where it's cheap (conversation) so execution can be confident and efficient.

---

## Core Vision

### Problem Statement

Auto-Claude users experience a "black box" problem: they provide a task, the system executes autonomously with little visibility or control, and the result may not match their vision. By the time they see the output, significant credits and time have been spent - making course corrections costly.

The root cause isn't AI capability - it's **lack of context and premature commitment**. Users jump from idea to execution without a structured way to reason through requirements, architecture, and acceptance criteria.

### Problem Impact

- **Wasted credits**: Features built on vague prompts often need rework or abandonment
- **Rework cycles**: Discovering misalignment post-execution is expensive
- **User frustration**: The feeling of "I should have planned this better" after the fact
- **Scope creep**: Without clear boundaries, AI implementations drift from user intent
- **Lost confidence**: Users hesitate to use Auto-Claude for larger features due to unpredictability

### Why Existing Solutions Fall Short

**Current Auto-Claude Flow:**
- `spec_runner.py` produces a single spec with subtasks - too flat for complex features
- Works for "Add a login button" but struggles with "Build complete authentication system"
- No structured methodology for requirements gathering and architectural decisions

**External Planning (Current Workaround):**
- Users run BMAD workflows separately in Claude Code
- Manually translate planning documents into Auto-Claude tasks
- Context is lost in the handoff between tools
- Two disconnected experiences that should be one

**Other AI Coding Tools:**
- Most follow "give task → get code" model
- No first-class planning phase
- Iteration happens after code is written (expensive)

### Proposed Solution

**Planning Mode**: A new feature in Auto-Claude that opens a dedicated planning session where users can:

1. **Select a methodology** (BMAD initially, extensible to others like Speckit)
2. **Collaborate with an AI analyst** through conversational back-and-forth
3. **Produce structured artifacts**: Product Brief → PRD → Architecture → Epics → Stories
4. **Generate Kanban tasks** automatically from stories - each a single developable unit
5. **Inject custom tasks** when needed for flexibility

**The Flow:**
```
Planning Session (cheap iteration)
    ↓
Product Brief → PRD → Architecture → Epics → Stories
    ↓
Stories become Kanban Tasks (confident execution)
    ↓
AI executes with full context from planning artifacts
```

### Key Differentiators

1. **Planning as first-class feature** - Not an afterthought. "Think together first, then build."

2. **Methodology-agnostic architecture** - BMAD first, but designed for extensibility. Output is standardized (stories → tasks), journey can vary.

3. **Human-in-the-loop at the right moment** - Iterate when it's cheap (planning phase), execute when confident (tasks are well-defined).

4. **Context flows downstream** - Each story inherits context from PRD, architecture, and epic. AI never loses sight of the bigger picture.

5. **Integrated experience** - No more switching between Claude Code for planning and Auto-Claude for execution. One product, end-to-end.

6. **User empowerment** - Replace the "black box" feeling with visibility, control, and confidence through structured collaborative reasoning.

---

## Target Users

### Primary Users

#### The Technical Founder

**Profile:** Developer/CEO building or modifying projects. Wears multiple hats - architect, product owner, and hands-on coder. Time-constrained but quality-focused.

**Context:**
- May be solo or have a small team (co-founder, 1-2 developers)
- Juggles multiple projects, some actively developed, others on hold
- Has Claude Max subscription - wants to maximize AI availability (overnight execution)
- Values working software over perfect planning, but recognizes planning prevents expensive rework

**Current Pain:**
- Creates thorough planning docs (PRD, architecture, epics, stories) externally
- Hands off to AI, which ignores the plans and "does its own thing"
- Spends days wrestling with AI, ends up with a "mishmash"
- Projects go on hold incomplete, sometimes for months

**What Success Looks Like:**
- Planning session produces committed-to-Git artifacts (safe checkpoint)
- Each story is scoped small enough that "scope for failure is very small"
- AI executes overnight on well-defined stories via sprint queue
- Wakes up to completed sprint with clear status dashboard
- If AI fails a story → marked for review, sprint continues with non-dependent tasks

---

### Secondary Users

#### The Co-founder (Reviewer/Stakeholder)

**Profile:** Non-technical partner who needs visibility into direction.

**Interaction Pattern:**
- Reviews plans through verbal walkthrough from Technical Founder
- Provides input on priorities and scope
- Executive summaries are future scope, not MVP

#### The Developer (Executor + Signal)

**Profile:** Employee or contractor who executes on stories/tasks.

**Interaction Pattern:**
- Receives well-defined stories with clear acceptance criteria
- Stories link to context (PRD, architecture) rather than duplicating it
- Can raise disagreements that flow back to Architect/Founder for evaluation
- Developer feedback is a signal that stories may need refinement

---

### Design Principles (From User Needs)

#### Story Independence Principle

Stories are designed as independent, testable components with defined interfaces. Dependencies between stories are resolved at the architecture level through interface contracts, not during implementation. This enables:
- Parallel execution by multiple developers or AI agents
- No blocking dependencies between team members
- TDD at the component level

#### Test Scope Per Story

Each story specifies its test scope upfront:

| Story Type | Test Scope | When Used |
|------------|-----------|-----------|
| Component story | Unit tests only | Most stories |
| Integration story | Unit + integration | Connecting components |
| E2E story | Full end-to-end | Major milestones only |

#### Sprint Queue Model

Stories are organized into sprints with priority ordering:
- AI agent completes a story → automatically picks next story from queue
- Failed tests mark story for human review but don't block sprint
- Sprint continues with next non-dependent task
- Maximizes overnight throughput

---

### User Journey

#### Technical Founder Journey

**Discovery:** Frustrated with AI coding tools that ignore context. Has tried BMAD separately, wants integration.

**Onboarding:** Opens Planning Mode, selects methodology, produces first set of artifacts (PRD → Architecture → Epics → Stories).

**Core Usage (The Overnight Sprint Workflow):**
1. **Plan:** Collaborate through planning session until confident
2. **Review:** Share with co-founder/developer, incorporate feedback
3. **Commit:** Save artifacts to Git (safe checkpoint)
4. **Sprint Plan:** Prioritize stories into sprint queue
5. **Execute:** AI runs sprint overnight, auto-picking tasks
6. **Morning Review:** Check sprint dashboard - completed, failed, in-progress
7. **Iterate:** Review failures, refine stories, queue next sprint

**Success Moment:** First morning waking up to a completed sprint - multiple stories done, tests passing, ready for review.

---

## Success Metrics

### Core Success Indicator

**Story Quality → Execution Success**

The primary success metric for Planning Mode is story quality, not execution quantity. A well-planned story should be:
- **Clear:** A developer can understand what to build without asking questions
- **Scoped:** Each story does exactly one thing
- **Testable:** Test cases can be defined before implementation begins

The "clarity test": If the Technical Founder can read a story and say "I could implement that myself," the story is ready for AI execution.

### User Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Stories completed without human intervention | High % (baseline TBD, refine over time) | Track stories that pass QA on first attempt |
| Test coverage of AI-written code | 80-90% | Automated coverage reporting per story |
| Story clarity rate | 100% pass "could I implement this?" test | Pre-execution review by Technical Founder |
| Rework cycles per story | Minimize (baseline TBD) | Track stories requiring fixes after QA |

### Business Objectives

**Primary Objective:** Enable the company to develop products faster with higher accuracy and value.

**Internal Tool Focus:** Planning Mode is not intended for public release. Success is measured by internal productivity gains, not market adoption.

**Value Proposition:**
- Ship features that would otherwise take too long
- Reduce need for additional headcount
- Maximize value from Claude Max subscription (overnight execution)
- Decrease abandoned/incomplete projects

### Key Performance Indicators

**Leading Indicators (Planning Quality):**
- Stories pass clarity test before entering sprint queue
- Each story has defined test scope (Unit/Integration/E2E)
- Architecture defines interfaces before stories are created

**Trailing Indicators (Execution Quality):**
- % of sprint stories completed overnight without intervention
- % of stories passing tests on first attempt
- Code coverage meets 80-90% threshold
- Time from "idea" to "deployed feature" decreases over time

### Refinement Loop

Success includes continuous improvement:
- Learn which story patterns yield highest autonomous completion rates
- Build templates and guidelines that improve story quality
- Track patterns in stories that require human intervention → refine planning process

---

## MVP Scope

### Core Features

**Full BMAD Integration:**
- Planning Mode UI with dedicated chat interface
- Complete artifact chain: Product Brief → PRD → Architecture → Epics → Stories
- Markdown + Mermaid documentation format (user preference for technical documentation)
- Story → Kanban task automatic integration
- Sprint planning with priority ordering
- Sprint execution engine (AI auto-picks next story from queue)
- Simple sprint dashboard (completed/failed/pending status)

**Sprint Queue Execution:**
- Stories queued with priority order
- AI agent completes story → automatically picks next from queue
- Failed tests mark story for human review
- Sprint continues with next non-dependent task (no blocking)
- Maximizes overnight throughput

**Documentation & Version Control:**
- All planning artifacts committed to Git as safe checkpoint
- Markdown format for readability and version control
- Mermaid diagrams for architecture visualization
- Stories link to context documents (don't duplicate content)

### Out of Scope (Future Phases)

- Multiple methodologies (BMAD only for MVP)
- Executive summaries for non-technical stakeholders
- Visual epic/story tree view
- Dependency graph visualization
- Multi-user collaboration features
- Real-time progress monitoring during execution

### MVP Success Criteria

1. **Planning Flow**: User can initiate Planning Mode and produce a complete artifact chain (Brief → PRD → Architecture → Epics → Stories)
2. **Task Integration**: Stories automatically appear as Kanban tasks ready for execution
3. **Overnight Execution**: AI can execute a sprint queue overnight without human intervention
4. **Morning Review**: Simple dashboard shows sprint status (completed/failed/pending)
5. **Safe Checkpoints**: All artifacts committed to Git before execution begins
6. **Story Quality**: Stories pass the "could I implement this myself?" clarity test

### Future Vision

After MVP validation, potential enhancements:
- **Methodology Expansion**: Add Speckit and other planning methodology support
- **Visual Tools**: Dependency graphs, epic/story tree visualization
- **Stakeholder Communication**: Executive summary generation for non-technical reviewers
- **Team Features**: Multi-user review workflows and role-based access
- **Analytics**: Sprint velocity tracking and story pattern analysis
