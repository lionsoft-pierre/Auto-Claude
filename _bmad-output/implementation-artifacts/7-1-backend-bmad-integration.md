# Story 7.1: Backend BMAD Integration

Status: done

## Story

As a **Technical Founder**,
I want **the planning chat to actually execute BMAD workflows via Claude Code**,
so that **I can complete the full planning workflow from Product Brief to Stories**.

## Background

This story addresses the critical gap identified in the full project retrospective (2026-01-17):
- Frontend Planning Mode UI is complete
- Chat streaming infrastructure works
- But the IPC handler returns a placeholder instead of executing BMAD workflows
- Missing backend files: `workflow_runner.py`, `session_handler.py`

## Acceptance Criteria

1. **AC1: Chat Message Executes Claude Code**
   - **Given** an active planning session
   - **When** the user sends a message in the planning chat
   - **Then** the backend spawns Claude Code to process the message
   - **And** the response streams back to the frontend in real-time

2. **AC2: BMAD Workflow Context**
   - **Given** the planning session has a selected methodology (BMAD)
   - **When** processing a message
   - **Then** Claude Code has access to BMAD workflow instructions
   - **And** can execute workflow steps (Product Brief, PRD, etc.)

3. **AC3: Artifact Generation**
   - **Given** a BMAD workflow produces an artifact (e.g., product-brief.md)
   - **When** the artifact is complete
   - **Then** the artifact is saved to the session directory
   - **And** the frontend is notified to display it

4. **AC4: End-to-End Product Brief**
   - **Given** the planning chat is working
   - **When** the user completes the Product Brief workflow
   - **Then** a product-brief.md file is created
   - **And** the PRD tab unlocks for the next workflow

## Tasks / Subtasks

- [x] **Task 1: Create planning_runner.py** (AC: #1, #2)
  - [x] 1.1: Create `apps/backend/runners/planning_runner.py`
  - [x] 1.2: Implement Claude Code CLI invocation with BMAD context
  - [x] 1.3: Handle message streaming via stdout markers
  - [x] 1.4: Pass session context (workflow state, project path)

- [x] **Task 2: Update IPC handler** (AC: #1)
  - [x] 2.1: Modify `planning-handlers.ts:400-435` to spawn planning_runner.py
  - [x] 2.2: Parse streaming output and emit to frontend
  - [x] 2.3: Handle errors and process termination

- [x] **Task 3: BMAD Skill Invocation** (AC: #2, #3)
  - [x] 3.1: Map workflow IDs to BMAD skill names
  - [x] 3.2: Add Skill and Write tools to allowed_tools
  - [x] 3.3: Claude invokes BMAD workflows via Skill tool
  - [x] 3.4: Artifacts created through BMAD workflow steps

- [x] **Task 4: Session Management** (Bonus)
  - [x] 4.1: Add PLANNING_SESSION_DELETE IPC channel
  - [x] 4.2: Add deleteSession to store
  - [x] 4.3: Add discard button with AlertDialog confirmation
  - [x] 4.4: Add i18n translations (en/fr)

- [x] **Task 5: End-to-end testing** (AC: #4)
  - [x] 5.1: Start a planning session
  - [x] 5.2: Verify BMAD skill invocation
  - [x] 5.3: Verify workflow steps execute
  - [x] 5.4: Verify discard button works

## Dev Notes

### Architecture Pattern

Follow the InsightsExecutor pattern from `apps/frontend/src/main/insights/insights-executor.ts`:
1. Spawn Python runner script
2. Pass arguments: project path, message, session context
3. Parse stdout for special markers
4. Emit events for streaming and artifacts

### Output Markers

Use these markers in the Python runner output:
- `__STREAM__:text` - Regular streaming text
- `__ARTIFACT__:{"type":"product-brief","path":"/path/to/file"}` - Artifact created
- `__WORKFLOW_STEP__:{"step":"completed","workflow":"product-brief"}` - Step progress
- `__ERROR__:message` - Error occurred

### BMAD Workflow Invocation

The planning runner should:
1. Load BMAD workflow configuration for current step
2. Build system prompt with workflow instructions
3. Invoke Claude Code with the user's message
4. Parse output for artifacts and progress

### Files to Create/Modify

**Create:**
- `apps/backend/runners/planning_runner.py`

**Modify:**
- `apps/frontend/src/main/ipc-handlers/planning-handlers.ts` (lines 400-435)

## Test Plan

1. **Unit Test**: planning_runner.py processes message and returns response
2. **Integration Test**: IPC handler spawns runner and streams response
3. **E2E Test**: Complete Product Brief through the UI
