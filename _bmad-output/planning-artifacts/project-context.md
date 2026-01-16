---
project_name: 'Auto-Claude'
user_name: 'Pierre'
date: '2026-01-15'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'code_quality', 'workflow_rules', 'critical_rules']
status: 'complete'
rule_count: 45
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

| Layer | Technology | Version | Notes |
|-------|------------|---------|-------|
| Desktop | Electron | 39.x | Multi-process architecture |
| Frontend | React | 19.x | Strict mode |
| Language | TypeScript | 5.9+ | `strict: true` |
| State | Zustand | 5.x | Domain-split stores |
| UI | Radix UI + Tailwind | 4.x | Primitives + utility CSS |
| Build | Vite | latest | Fast HMR |
| Backend | Python | 3.12+ | Required minimum |
| AI | Claude Agent SDK | latest | NEVER use raw Anthropic API |
| Memory | Graphiti + LadybugDB | embedded | No Docker required |
| Testing | Vitest + Playwright | latest | Unit + E2E |
| Node.js | 24+ | required | |

## Critical Implementation Rules

### Language-Specific Rules

**TypeScript:**
- Strict mode is ON - all type errors must be resolved
- Use path aliases: `@/` (src), `@shared/` (shared), `@features/` (features)
- `camelCase` for variables/functions, `PascalCase` for components/types
- Prefer `type` over `interface` unless extending

**Python:**
- `snake_case` for all identifiers (functions, variables, files)
- Type hints required on function signatures
- Use Pydantic for data validation classes

**Claude SDK (CRITICAL):**
```python
# WRONG - Never do this
from anthropic import Anthropic
client = Anthropic()

# CORRECT - Always use the SDK client
from core.client import create_client
client = create_client(project_dir, spec_dir, model, agent_type)
```

### Framework-Specific Rules

**React:**
- Functional components only - no class components
- Components in `components/` directory, views in `views/`
- Radix UI primitives + Tailwind for styling

**Zustand State Management:**
- Domain-split stores: one store per feature domain
- Pattern: `create<StoreType>()((set, get) => ({ ... }))`
- Actions defined as store methods, not external functions

**Internationalization (CRITICAL):**
```tsx
// WRONG - Never hardcode UI text
<button>Create New Task</button>

// CORRECT - Always use translation keys
const { t } = useTranslation(['tasks', 'common']);
<button>{t('tasks:actions.create')}</button>
```
- Translations required in BOTH `en/*.json` AND `fr/*.json`
- Format: `namespace:section.key`

**Electron IPC:**
- Hierarchical channel naming: `domain:subdomain:action`
- Planning channels: `planning:session:create`, `planning:artifact:save`
- File-based IPC patterns (not HTTP)

### Testing Rules

**Test Organization:**
- Frontend unit tests: Vitest (`*.test.ts` or `*.spec.ts`)
- Frontend E2E: Playwright
- Backend tests: pytest in `tests/` directory
- Run backend tests via venv: `apps/backend/.venv/bin/pytest tests/ -v`

**Coverage Requirements:**
- Target: 80-90% coverage for new code
- Story test scopes: `unit` (most stories), `integration`, or `e2e` (milestones only)

**Test Patterns:**
```typescript
// Frontend test structure
describe('ComponentName', () => {
  it('should [expected behavior]', () => {
    // Arrange, Act, Assert
  });
});
```

**E2E Testing with Electron MCP:**
- QA agents use Electron MCP to interact with running app
- Enable with `ELECTRON_MCP_ENABLED=true` in `.env`
- Available commands: `click_by_text`, `fill_input`, `take_screenshot`

### Code Quality & Style Rules

**File Naming:**
- React components: `ComponentName.tsx` (PascalCase)
- Stores: `featureStore.ts` (camelCase with Store suffix)
- Types: `feature.ts` in `shared/types/`
- Python modules: `snake_case.py`

**Directory Structure:**
```
apps/frontend/src/
├── views/           # Page-level components
├── components/      # Reusable components (feature subdirs)
├── stores/          # Zustand stores (feature subdirs)
└── shared/
    ├── types/       # TypeScript type definitions
    └── i18n/locales/  # Translation files (en/, fr/)
```

**Code Style:**
- No excessive comments - prefer self-documenting code
- Use descriptive variable names over comments
- Only add comments for non-obvious logic

**Error Handling:**
- Graceful recovery pattern: catch errors, preserve state, continue
- Present errors to user in UI, don't silent-fail
- Auto-save progress before risky operations

### Development Workflow Rules

**Git Worktree Isolation:**
- All builds run in isolated worktrees: `.worktrees/{spec-name}/`
- One branch per spec: `auto-claude/{spec-name}`
- NEVER push automatically - user decides when to push
- Merge flow: worktree branch → main (after user approval)

**Branch Naming:**
- Feature branches: `feat/{feature-name}`
- Fix branches: `fix/{issue-description}`
- Spec branches: `auto-claude/{spec-name}` (auto-created)

**PR Targets:**
- Internal PRs: target `develop` branch
- Upstream contributions: ALWAYS target `develop`, never `main`

**Data Locations:**
```
.auto-claude/
├── planning/{project}/   # Planning artifacts (sessions, stories)
├── specs/{NNN}/          # Spec files (plans, QA reports)
└── .auto-claude-security.json  # Security profile cache
```
- All `.auto-claude/` directories are gitignored

### Critical Don't-Miss Rules

**NEVER Do These:**
1. ❌ `from anthropic import Anthropic` → ✅ `from core.client import create_client`
2. ❌ `<button>Submit</button>` → ✅ `<button>{t('common:actions.submit')}</button>`
3. ❌ Add only English translations → ✅ Always add BOTH `en/` AND `fr/`
4. ❌ `git push` automatically → ✅ Let user decide when to push
5. ❌ Store secrets in artifacts → ✅ Use encrypted token storage

**Security Model:**
- OS sandbox for bash command isolation
- Filesystem restricted to project directory
- Dynamic command allowlist from project analysis
- Security profile cached in `.auto-claude-security.json`

**Planning Mode Specifics:**
- Story files MUST have YAML frontmatter (id, title, status, test_scope)
- Stories link to context: `PRD: prd.md#requirement-id`
- Sprint queue (`sprint-queue.json`) is separate from Kanban `taskStore`
- Artifacts stored in `.auto-claude/planning/{project}/`

**Performance Gotchas:**
- Screenshots auto-compressed for Claude SDK 1MB limit
- Session state in `session.json` for crash recovery
- File-based IPC, not HTTP (faster for local)

---

## Usage Guidelines

**For AI Agents:**
- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge

**For Humans:**
- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review quarterly for outdated rules
- Remove rules that become obvious over time

---

_Last Updated: 2026-01-15_

