# Backend Integrations

This document explains Auto-Claude's external integrations for developers. These integrations extend the framework's capabilities with external services, APIs, and tools.

## Overview

Auto-Claude integrates with multiple external services to enhance functionality:

- **Linear** - Optional progress tracking and task management
- **GitHub** - Issue tracking and pull request management via `gh` CLI
- **Electron MCP** - E2E testing and validation of Electron desktop apps
- **Context7 MCP** - Up-to-date documentation lookup for libraries and frameworks

All integrations are **optional** and gracefully degrade when unavailable. The core framework works independently without any external services.

---

## Linear Integration

Optional integration for real-time progress tracking in Linear project management tool.

### Architecture

**Design Principles:**
- ONE task per spec (not one issue per subtask)
- Python orchestrator controls when updates happen
- Small, focused mini-agent calls for reliability
- Graceful degradation if Linear unavailable

**Status Flow:**
```
Todo → In Progress → In Review → (human) → Done
  |         |              |
  |         |              +-- QA approved, awaiting human merge
  |         +-- Planner/Coder working
  +-- Task created from spec
```

### Configuration

**Environment Variables:**
```bash
# Linear API Key (required to enable integration)
LINEAR_API_KEY=lin_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Pre-configured Team ID (optional - will auto-detect if not set)
LINEAR_TEAM_ID=

# Pre-configured Project ID (optional - will create project if not set)
LINEAR_PROJECT_ID=
```

**Get your API key:** https://linear.app/YOUR-TEAM/settings/api

### Implementation

**Key Files:**
- `auto-claude/integrations/linear/updater.py` - Linear update orchestration
- `auto-claude/integrations/linear/config.py` - Configuration and constants
- `auto-claude/integrations/linear/integration.py` - Legacy integration logic

**Status Constants:**
```python
STATUS_TODO = "Todo"
STATUS_IN_PROGRESS = "In Progress"
STATUS_IN_REVIEW = "In Review"  # Custom status for QA phase
STATUS_DONE = "Done"
STATUS_CANCELED = "Canceled"
```

**State Management:**
Linear state is tracked in `.linear_task.json` within each spec directory:

```json
{
  "task_id": "VAL-123",
  "task_title": "Add user authentication",
  "team_id": "team-uuid",
  "status": "In Progress",
  "created_at": "2025-01-14T10:30:00"
}
```

### Usage

**Checking if Linear is enabled:**
```python
from integrations.linear.updater import is_linear_enabled

if is_linear_enabled():
    # Linear integration is available
    pass
```

**Creating a Linear task:**
```python
from integrations.linear.updater import create_linear_task

state = await create_linear_task(
    spec_dir=Path("specs/001-feature"),
    title="Add user authentication",
    description="Implement JWT-based authentication"
)
# Returns LinearTaskState with task_id, or None if failed
```

**Updating task status:**
```python
from integrations.linear.updater import update_linear_status, STATUS_IN_PROGRESS

success = await update_linear_status(
    spec_dir=Path("specs/001-feature"),
    new_status=STATUS_IN_PROGRESS
)
```

**Convenience functions for common transitions:**
```python
from integrations.linear.updater import (
    linear_task_started,        # Mark as "In Progress"
    linear_build_complete,       # Comment: all subtasks done
    linear_qa_started,           # Mark as "In Review"
    linear_qa_approved,          # Comment: QA passed
    linear_qa_rejected,          # Comment: issues found
    linear_subtask_completed,    # Progress update
    linear_task_stuck,           # Escalation for stuck tasks
)

# Example: Start build
await linear_task_started(spec_dir)

# Example: Record subtask completion
await linear_subtask_completed(
    spec_dir=spec_dir,
    subtask_id="subtask-1-1",
    completed_count=5,
    total_count=10
)
```

### MCP Tools

Linear integration uses **Linear MCP server** (`https://mcp.linear.app/mcp`) with these tools:

```python
LINEAR_TOOLS = [
    "mcp__linear-server__list_teams",
    "mcp__linear-server__get_team",
    "mcp__linear-server__list_projects",
    "mcp__linear-server__get_project",
    "mcp__linear-server__create_project",
    "mcp__linear-server__update_project",
    "mcp__linear-server__list_issues",
    "mcp__linear-server__get_issue",
    "mcp__linear-server__create_issue",
    "mcp__linear-server__update_issue",
    "mcp__linear-server__list_comments",
    "mcp__linear-server__create_comment",
    "mcp__linear-server__list_issue_statuses",
    "mcp__linear-server__list_issue_labels",
    "mcp__linear-server__list_users",
    "mcp__linear-server__get_user",
]
```

**Tool Availability:**
- Available to ALL agent types when `LINEAR_API_KEY` is set
- Used by Python orchestrator via mini-agents (not directly in agent prompts)

---

## GitHub Integration

Integration for issue tracking and pull request management via the `gh` CLI tool.

### Architecture

Auto-Claude uses the **GitHub CLI (`gh`)** for all GitHub-related operations. This provides:
- Issue management
- Pull request creation and review
- CI/CD check status
- Release management

### Configuration

**Prerequisites:**
1. Install GitHub CLI: https://cli.github.com/
2. Authenticate: `gh auth login`

**No environment variables required** - authentication handled by `gh` CLI.

### Usage

**Creating commits (from CLAUDE.md):**

When the user asks to create a git commit:

1. Run `git status` and `git diff` to see changes
2. Draft a commit message that focuses on the "why" rather than the "what"
3. Add files and commit with co-authorship:
   ```bash
   git add .
   git commit -m "$(cat <<'EOF'
   Add user authentication feature

   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
   EOF
   )"
   ```

**Creating pull requests (from CLAUDE.md):**

When the user asks to create a pull request:

1. Run `git status`, `git diff`, and `git log` to understand all changes
2. Analyze ALL commits that will be included in the PR
3. Draft a comprehensive PR summary
4. Create PR using `gh pr create`:
   ```bash
   gh pr create --title "Add user authentication" --body "$(cat <<'EOF'
   ## Summary
   - Implemented JWT-based authentication
   - Added login/logout endpoints
   - Created middleware for protected routes

   ## Test plan
   - [ ] Verify login flow with valid credentials
   - [ ] Test logout functionality
   - [ ] Confirm protected routes require authentication

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   EOF
   )"
   ```

**Viewing PR comments:**
```bash
gh api repos/foo/bar/pulls/123/comments
```

**Checking CI status:**
```bash
gh pr checks
```

### Important Notes

- **NEVER** use force push to main/master (warn user if requested)
- **NEVER** skip hooks (`--no-verify`) unless explicitly requested
- **NEVER** run destructive commands (`push --force`, `reset --hard`) unless explicitly requested
- **DO NOT** push to remote unless user explicitly asks
- All branches stay **LOCAL** until user decides to push

---

## Electron MCP Integration

Integration for E2E testing and validation of Electron desktop applications via Chrome DevTools Protocol.

### Architecture

**Electron MCP** enables QA agents to interact with Electron apps for visual validation:
- Connect to running Electron app via Chrome DevTools Protocol
- Capture screenshots for visual inspection
- Execute commands (click, fill forms, evaluate JS)
- Read console logs

**Design Principle:**
- Only available to **QA agents** (`qa_reviewer`, `qa_fixer`)
- NOT available to Coder/Planner agents (minimizes context token usage)

### Configuration

**Environment Variables:**
```bash
# Enable Electron MCP integration (default: false)
ELECTRON_MCP_ENABLED=true

# Chrome DevTools debugging port (default: 9222)
ELECTRON_DEBUG_PORT=9222
```

**Prerequisites:**

1. **Start Electron app with remote debugging:**
   ```bash
   ./YourElectronApp --remote-debugging-port=9222
   ```

2. **For auto-claude-ui specifically:**
   ```bash
   cd auto-claude-ui

   # Development mode with MCP debugging
   pnpm run dev:mcp

   # Production mode with MCP debugging
   pnpm run start:mcp
   ```

**See also:** https://github.com/anthropics/anthropic-quickstarts/tree/main/mcp-electron-demo

### Implementation

**Key Files:**
- `auto-claude/core/client.py` - Electron MCP configuration (lines 41-69, 108-119)

**Screenshot Compression:**
Screenshots MUST be compressed (1280x720, quality 60, JPEG) to stay under Claude SDK's 1MB JSON message buffer limit. See GitHub issue #74.

### MCP Tools

```python
ELECTRON_TOOLS = [
    "mcp__electron__get_electron_window_info",  # Get info about running Electron windows
    "mcp__electron__take_screenshot",           # Capture screenshot of Electron window
    "mcp__electron__send_command_to_electron",  # Send commands (click, fill, evaluate JS)
    "mcp__electron__read_electron_logs",        # Read console logs from Electron app
]
```

**Tool Availability:**
- Only available to QA agents (`qa_reviewer`, `qa_fixer`)
- Requires `ELECTRON_MCP_ENABLED=true`

### Usage Example

**In QA agent prompts:**

```markdown
If ELECTRON_MCP_ENABLED, you can use Electron MCP tools to validate the UI:

1. Get window info to confirm app is running
2. Take screenshots to verify visual appearance
3. Send commands to test interactions
4. Read logs to check for errors
```

**Typical QA workflow:**
1. `mcp__electron__get_electron_window_info` - Verify app is running
2. `mcp__electron__take_screenshot` - Capture initial state
3. `mcp__electron__send_command_to_electron` - Interact with UI (click buttons, fill forms)
4. `mcp__electron__take_screenshot` - Capture result
5. `mcp__electron__read_electron_logs` - Check for console errors

---

## Context7 MCP Integration

Integration for up-to-date documentation lookup from Context7 documentation service.

### Architecture

**Context7** provides access to current documentation for libraries and frameworks. This enables agents to:
- Look up latest API documentation
- Find code examples
- Discover best practices
- Stay current with library updates

**Design Principle:**
- Always enabled (no configuration required)
- Available to ALL agent types
- Particularly useful for spec research and validation

### Configuration

**No configuration required** - Context7 MCP is always enabled.

### MCP Tools

```python
CONTEXT7_TOOLS = [
    "mcp__context7__resolve-library-id",  # Resolve library name to Context7 ID
    "mcp__context7__query-docs",          # Query documentation content
]
```

**Tool Availability:**
- Available to ALL agent types
- Always enabled (no environment variable needed)

### Usage Example

**In agent prompts:**

```markdown
You can use Context7 to look up current documentation:

1. Resolve library ID:
   - Tool: mcp__context7__resolve-library-id
   - Input: libraryName="react", query="user question context"
   - Output: Library ID (e.g., "/facebook/react")

2. Query documentation:
   - Tool: mcp__context7__query-docs
   - Input: libraryId="/facebook/react", query="how to use hooks"
   - Output: Relevant documentation and examples
```

**Typical research workflow:**
1. User mentions a library (e.g., "use Prisma for database")
2. Agent resolves library ID: `mcp__context7__resolve-library-id`
3. Agent queries for specific information: `mcp__context7__query-docs`
4. Agent incorporates current best practices into implementation

**Important notes:**
- MUST call `resolve-library-id` BEFORE `query-docs` (unless user provides explicit ID like `/org/project`)
- Do not call more than 3 times per question (use best result if can't find)
- Include user's original question in the `query` parameter for better ranking

### Examples

**Resolving a library:**
```json
{
  "libraryName": "mongodb",
  "query": "How do I set up authentication with JWT in Express.js"
}
```

**Querying documentation:**
```json
{
  "libraryId": "/mongodb/docs",
  "query": "connection string options for MongoDB Atlas"
}
```

---

## Integration Comparison

| Integration | Required Config | Agent Access | Purpose |
|-------------|----------------|--------------|---------|
| Linear | `LINEAR_API_KEY` | All (via Python orchestrator) | Progress tracking |
| GitHub | `gh` CLI auth | All | Issue/PR management |
| Electron MCP | `ELECTRON_MCP_ENABLED=true` | QA agents only | E2E testing |
| Context7 MCP | None (always enabled) | All | Documentation lookup |

---

## Best Practices

### When to use each integration

**Linear:**
- You want real-time progress tracking in your project management tool
- You need team visibility into automated builds
- You're integrating Auto-Claude into existing Linear workflows

**GitHub:**
- All projects (commits are fundamental to Auto-Claude workflow)
- Creating pull requests for review
- Checking CI/CD status before merge

**Electron MCP:**
- Building/testing Electron desktop applications
- QA validation requires visual confirmation
- E2E testing of UI interactions

**Context7:**
- Researching unfamiliar libraries during spec creation
- Validating current API usage during implementation
- Finding code examples for complex integrations

### Security Considerations

1. **API Keys:**
   - Store in `.env` file (never commit)
   - Use environment-specific keys (dev/staging/prod)
   - Rotate keys regularly

2. **MCP Servers:**
   - Linear MCP uses HTTPS with API key auth
   - Electron MCP uses local connection (localhost only)
   - Context7 MCP is read-only (no authentication)

3. **Agent Access:**
   - Linear tools only used via Python orchestrator (not directly in prompts)
   - Electron tools restricted to QA agents (principle of least privilege)
   - All tools subject to security hook validation

### Error Handling

All integrations implement **graceful degradation**:

```python
# Example: Linear integration
if is_linear_enabled():
    try:
        await update_linear_status(spec_dir, STATUS_IN_PROGRESS)
    except Exception as e:
        print(f"Linear update failed: {e}")
        # Continue without Linear - core functionality unaffected
```

**Key principle:** External integration failures should NEVER block core Auto-Claude functionality.

---

## Debugging

### Linear Integration

**Check if enabled:**
```bash
python -c "from integrations.linear.updater import is_linear_enabled; print(is_linear_enabled())"
```

**View state file:**
```bash
cat .auto-claude/specs/001-feature/.linear_task.json
```

**Test Linear API directly:**
```bash
curl https://mcp.linear.app/mcp \
  -H "Authorization: Bearer $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"method":"list_teams"}'
```

### GitHub Integration

**Check `gh` CLI is authenticated:**
```bash
gh auth status
```

**Test PR creation:**
```bash
gh pr create --title "Test" --body "Test PR" --draft
```

### Electron MCP

**Check Electron app is running with debugging:**
```bash
# Should see Electron process with --remote-debugging-port
ps aux | grep "remote-debugging-port"
```

**Test DevTools connection:**
```bash
curl http://localhost:9222/json
```

### Context7 MCP

**Test library resolution:**
Use the MCP tool directly in a test agent session or check if the tool is available in the agent's tool list.

---

## Related Documentation

- [Backend Architecture](./architecture.md) - Multi-agent pipeline overview
- [Backend Agents](./agents.md) - Agent types and capabilities
- [Backend Security](./security.md) - Security model and sandboxing
- [Backend Memory](./memory.md) - File-based and Graphiti memory systems
- [CLAUDE.md](../../CLAUDE.md) - Project overview and commands
