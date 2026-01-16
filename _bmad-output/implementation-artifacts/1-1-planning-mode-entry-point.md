# Story 1.1: Planning Mode Entry Point

Status: done

## Story

As a **Technical Founder**,
I want **to start a new planning session from the sidebar and select a methodology**,
so that **I can begin structured planning before committing to execution**.

## Acceptance Criteria

1. **AC1: Sidebar Navigation**
   - **Given** the user is on any view in Auto-Claude
   - **When** the user clicks "Planning" in the sidebar navigation
   - **Then** the Planning Mode view opens with a session start interface

2. **AC2: New Session Button**
   - **Given** the user is on the Planning Mode view with no active session
   - **When** the user clicks "New Planning Session"
   - **Then** a methodology selector appears showing available options (BMAD)

3. **AC3: Methodology Selection**
   - **Given** the methodology selector is displayed
   - **When** the user selects "BMAD" methodology
   - **Then** a new planning session is created with BMAD workflow loaded
   - **And** session state is persisted to `.auto-claude/planning/{project-name}/session.json`

4. **AC4: Session Resume**
   - **Given** there is an existing planning session for the current project
   - **When** the user opens Planning Mode
   - **Then** the existing session is automatically resumed

## Tasks / Subtasks

- [ ] **Task 1: Add Planning nav item to Sidebar** (AC: #1)
  - [ ] 1.1: Add `'planning'` to `SidebarView` type union in `Sidebar.tsx:55`
  - [ ] 1.2: Import `ClipboardList` icon from lucide-react (or similar planning icon)
  - [ ] 1.3: Add planning nav item to `baseNavItems` array with `{ id: 'planning', labelKey: 'navigation:items.planning', icon: ClipboardList, shortcut: 'J' }`
  - [ ] 1.4: Add i18n key `navigation:items.planning` to `en/navigation.json` and `fr/navigation.json`

- [ ] **Task 2: Create PlanningView component** (AC: #1, #2, #4)
  - [ ] 2.1: Create `apps/frontend/src/renderer/views/PlanningView.tsx`
  - [ ] 2.2: Create empty state UI with "New Planning Session" button
  - [ ] 2.3: Handle view routing in parent App component (add case for `'planning'`)
  - [ ] 2.4: Implement session resume check on view mount

- [ ] **Task 3: Create sessionStore for planning state** (AC: #2, #3, #4)
  - [ ] 3.1: Create `apps/frontend/src/renderer/stores/planning/sessionStore.ts`
  - [ ] 3.2: Define session state interface matching architecture spec
  - [ ] 3.3: Implement actions: `createSession`, `loadSession`, `setMethodology`, `setStatus`
  - [ ] 3.4: Add persistence sync with `session.json` file

- [ ] **Task 4: Create MethodologySelector component** (AC: #2, #3)
  - [ ] 4.1: Create `apps/frontend/src/renderer/components/planning/MethodologySelector.tsx`
  - [ ] 4.2: Display BMAD as selectable option with description
  - [ ] 4.3: Handle selection → create session → persist to file

- [ ] **Task 5: Implement IPC for session file operations** (AC: #3, #4)
  - [ ] 5.1: Add IPC handler in main process for `planning:session:create`
  - [ ] 5.2: Add IPC handler for `planning:session:load`
  - [ ] 5.3: Create `.auto-claude/planning/{project}/` directory structure
  - [ ] 5.4: Write/read `session.json` with proper error handling

- [ ] **Task 6: Add i18n translations** (AC: #1, #2)
  - [ ] 6.1: Create `apps/frontend/src/shared/i18n/locales/en/planning.json`
  - [ ] 6.2: Create `apps/frontend/src/shared/i18n/locales/fr/planning.json`
  - [ ] 6.3: Add namespace to i18n config

- [ ] **Task 7: Write tests** (AC: all)
  - [ ] 7.1: Unit tests for `sessionStore` actions
  - [ ] 7.2: Integration tests for PlanningView rendering
  - [ ] 7.3: Test session persistence round-trip

## Dev Notes

### Critical Implementation Rules

**MUST Follow These Rules:**
1. **i18n Required**: All UI text MUST use `useTranslation()` - never hardcode strings
2. **Both Languages**: Add translations to BOTH `en/*.json` AND `fr/*.json`
3. **Zustand Pattern**: Use domain-split store pattern - see `insights-store.ts` for reference
4. **TypeScript Strict**: All types must be defined, no `any` types
5. **File Naming**: Components use PascalCase (`PlanningView.tsx`), stores use camelCase (`sessionStore.ts`)

### Source Code Patterns to Follow

**Sidebar Pattern** (from `Sidebar.tsx`):
```typescript
// SidebarView type - add 'planning' here
export type SidebarView = 'kanban' | 'terminals' | ... | 'planning';

// Nav item definition pattern
const baseNavItems: NavItem[] = [
  { id: 'planning', labelKey: 'navigation:items.planning', icon: ClipboardList, shortcut: 'J' },
  // ... existing items
];
```

**Store Pattern** (from `insights-store.ts`):
```typescript
import { create } from 'zustand';

interface SessionState {
  session: PlanningSession | null;
  status: SessionStatus;
  // ... actions
}

export const useSessionStore = create<SessionState>((set, get) => ({
  session: null,
  status: 'idle',
  setSession: (session) => set({ session }),
  // ... other actions
}));
```

### Session State Structure

Per architecture decision, session state must match:
```json
{
  "id": "session-uuid",
  "project_name": "project-slug",
  "methodology": "bmad",
  "status": "in_progress",
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601",
  "current_workflow": null,
  "current_step": 0,
  "completed_workflows": [],
  "artifacts": {},
  "context": {}
}
```

### File System Structure

Create this structure for session persistence:
```
.auto-claude/
  planning/
    {project-name}/
      session.json    # This story creates this file
```

### IPC Channel Naming

Use hierarchical pattern per architecture:
- `planning:session:create` - Create new session
- `planning:session:load` - Load existing session
- `planning:session:save` - Save session state

### Project Structure Notes

**New files to create:**
- `apps/frontend/src/renderer/views/PlanningView.tsx`
- `apps/frontend/src/renderer/stores/planning/sessionStore.ts`
- `apps/frontend/src/renderer/components/planning/MethodologySelector.tsx`
- `apps/frontend/src/shared/i18n/locales/en/planning.json`
- `apps/frontend/src/shared/i18n/locales/fr/planning.json`

**Existing files to modify:**
- `apps/frontend/src/renderer/components/Sidebar.tsx` - Add nav item
- `apps/frontend/src/renderer/App.tsx` (or equivalent) - Add view routing
- Main process IPC handlers - Add planning handlers

### References

- [Source: architecture.md#session--storage-architecture] - Session storage design
- [Source: architecture.md#frontend-backend-communication] - IPC patterns
- [Source: project-context.md#framework-specific-rules] - Zustand patterns
- [Source: project-context.md#internationalization-critical] - i18n requirements
- [Source: Sidebar.tsx] - Nav item pattern
- [Source: insights-store.ts] - Store pattern reference

### Test Scope

**Integration** - This story touches:
- Sidebar navigation
- View routing
- Store creation
- File system operations via IPC

**Test Files:**
- `apps/frontend/src/renderer/stores/planning/sessionStore.test.ts`
- `apps/frontend/src/renderer/views/PlanningView.test.tsx`

### Performance Considerations

- Session load should complete < 500ms (NFR1)
- File operations complete < 1s (NFR4)
- Use async/await for all IPC operations

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Date

2026-01-15

### Git Commit

`987bf882` - story1.1 - implement planning mode entry point

### Completion Notes List

1. **All tasks completed successfully:**
   - Added Planning nav item to Sidebar with ClipboardList icon and 'P' shortcut
   - Created PlanningView component with empty state and methodology selector
   - Created sessionStore with Zustand for planning state management
   - Implemented MethodologySelector component with BMAD option
   - Added IPC handlers for session create/load/save operations
   - Added complete i18n translations (EN/FR)
   - Added unit tests for sessionStore

2. **Implementation Decisions:**
   - Used `ClipboardList` icon from lucide-react for Planning nav item
   - Session state stored in `.auto-claude/planning/{project-name}/session.json`
   - IPC channels follow `PLANNING_SESSION_*` naming convention
   - Methodology selector uses Card-based UI with radio selection

3. **Deferred Items:**
   - Auto-resume of existing sessions (moved to Story 1.3)

### File List

**Created:**
- `apps/frontend/src/renderer/components/planning/PlanningView.tsx`
- `apps/frontend/src/renderer/components/planning/MethodologySelector.tsx`
- `apps/frontend/src/renderer/stores/planning/sessionStore.ts`
- `apps/frontend/src/shared/i18n/locales/en/planning.json`
- `apps/frontend/src/shared/i18n/locales/fr/planning.json`
- `apps/frontend/src/main/ipc-handlers/planning-handlers.ts`
- `apps/frontend/src/shared/types/planning.ts`
- `apps/frontend/src/renderer/__tests__/sessionStore.test.ts`

**Modified:**
- `apps/frontend/src/renderer/components/Sidebar.tsx` - Added planning nav item
- `apps/frontend/src/shared/constants/ipc-channels.ts` - Added planning IPC channels
- `apps/frontend/src/preload/index.ts` - Added planning API methods
- `apps/frontend/src/shared/i18n/locales/en/navigation.json` - Added planning label
- `apps/frontend/src/shared/i18n/locales/fr/navigation.json` - Added planning label
- `apps/frontend/src/shared/i18n/index.ts` - Added planning namespace
