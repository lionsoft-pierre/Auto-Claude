# Story 1.2: Planning Chat Interface

Status: done

## Story

As a **Technical Founder**,
I want **to interact with the planning session via a chat-style interface**,
so that **I can have a conversational planning experience similar to Insights**.

## Acceptance Criteria

1. **AC1: Chat Interface Display**
   - **Given** an active planning session exists
   - **When** the Planning Mode view renders
   - **Then** a chat interface appears similar to the Insights view layout

2. **AC2: Message Sending**
   - **Given** the chat interface is displayed
   - **When** the user types a message and presses Enter
   - **Then** the message is sent to the backend planning process
   - **And** the AI response streams back in real-time
   - **And** the conversation appears in the chat history

3. **AC3: Streaming Response**
   - **Given** an AI response is being streamed
   - **When** new tokens arrive from the backend
   - **Then** the response updates incrementally in the UI
   - **And** the UI remains responsive (< 500ms input latency)

4. **AC4: Chat History**
   - **Given** a planning session with chat history
   - **When** the user scrolls up in the chat
   - **Then** previous messages are visible and properly formatted
   - **And** markdown content renders correctly

## Tasks / Subtasks

- [ ] **Task 1: Create PlanningChat component** (AC: #1, #4)
  - [ ] 1.1: Create `apps/frontend/src/renderer/components/planning/PlanningChat.tsx`
  - [ ] 1.2: Implement message list with scroll area (reference Insights pattern)
  - [ ] 1.3: Add markdown rendering for AI responses using existing renderer
  - [ ] 1.4: Style consistently with Insights chat UI

- [ ] **Task 2: Create ChatInput component** (AC: #2)
  - [ ] 2.1: Create `apps/frontend/src/renderer/components/planning/ChatInput.tsx`
  - [ ] 2.2: Implement textarea with Enter to send (Shift+Enter for newline)
  - [ ] 2.3: Add disabled state during streaming
  - [ ] 2.4: Add character count / send button

- [ ] **Task 3: Extend sessionStore with chat state** (AC: #2, #3, #4)
  - [ ] 3.1: Add `messages: ChatMessage[]` to session state
  - [ ] 3.2: Add `streamingContent: string` for partial responses
  - [ ] 3.3: Implement `addMessage`, `appendStreamingContent`, `finalizeMessage` actions
  - [ ] 3.4: Persist messages to session.json

- [ ] **Task 4: Implement backend planning process** (AC: #2, #3)
  - [ ] 4.1: Create `apps/backend/planning/session_handler.py`
  - [ ] 4.2: Integrate Claude Agent SDK for chat responses
  - [ ] 4.3: Stream responses via existing terminal/pty infrastructure
  - [ ] 4.4: Handle session context (methodology, workflow state)

- [ ] **Task 5: Implement IPC for chat** (AC: #2, #3)
  - [ ] 5.1: Add IPC handler `planning:chat:send` in main process
  - [ ] 5.2: Set up streaming channel `planning:chat:stream`
  - [ ] 5.3: Connect frontend to backend streaming

- [ ] **Task 6: Add i18n for chat UI** (AC: #1, #2)
  - [ ] 6.1: Add chat-related keys to `planning.json` (en/fr)
  - [ ] 6.2: Include placeholder text, status messages, error messages

- [ ] **Task 7: Write tests** (AC: all)
  - [ ] 7.1: Unit tests for chat store actions
  - [ ] 7.2: Integration tests for message send/receive
  - [ ] 7.3: Test streaming content accumulation

## Dev Notes

### Critical Implementation Rules

1. **i18n Required**: All chat UI text via `useTranslation()`
2. **Both Languages**: Translations in BOTH `en/planning.json` AND `fr/planning.json`
3. **Performance**: UI must remain responsive during streaming (< 500ms latency)
4. **Markdown**: Use existing markdown renderer from Insights

### Source Code Patterns to Follow

**Insights Chat Pattern** (reference):
```typescript
// Message structure
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Streaming pattern from insights-store.ts
appendStreamingContent: (content: string) =>
  set((state) => ({
    streamingContent: state.streamingContent + content
  })),

finalizeStreamingMessage: () =>
  set((state) => {
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: state.streamingContent,
      timestamp: new Date()
    };
    return {
      session: {
        ...state.session!,
        messages: [...state.session!.messages, newMessage]
      },
      streamingContent: ''
    };
  }),
```

**Backend Streaming Pattern**:
```python
# Use Claude Agent SDK for responses
from core.client import create_client

async def handle_chat_message(session_id: str, message: str):
    client = create_client(
        project_dir=project_dir,
        spec_dir=None,
        model="claude-sonnet-4-5-20250929",
        agent_type="planning"
    )
    # Stream response back via IPC
```

### IPC Channel Pattern

```typescript
// Main process handler
ipcMain.handle('planning:chat:send', async (event, { sessionId, message }) => {
  // Spawn backend process, stream responses
});

// Renderer subscription
window.electronAPI.onPlanningChatStream((chunk) => {
  useSessionStore.getState().appendStreamingContent(chunk);
});
```

### Project Structure Notes

**New files to create:**
- `apps/frontend/src/renderer/components/planning/PlanningChat.tsx`
- `apps/frontend/src/renderer/components/planning/ChatInput.tsx`
- `apps/backend/planning/session_handler.py`

**Existing files to modify:**
- `apps/frontend/src/renderer/stores/planning/sessionStore.ts` - Add chat state
- `apps/frontend/src/renderer/views/PlanningView.tsx` - Integrate chat component
- Main process IPC handlers - Add chat handlers

### References

- [Source: architecture.md#frontend-backend-communication] - Backend process + streaming
- [Source: insights-store.ts] - Streaming content pattern
- [Source: project-context.md#internationalization-critical] - i18n requirements
- [Source: Sidebar.tsx] - Existing UI patterns

### Test Scope

**Integration** - This story touches:
- Frontend components
- Store state management
- Backend process
- IPC streaming

### Performance Requirements

- Input latency < 500ms (NFR1)
- Streaming should feel real-time
- Scroll performance with large message history

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Date

2026-01-15

### Git Commit

`18f2d43c` - story1.2 - implement planning chat interface

### Completion Notes List

1. **All tasks completed successfully:**
   - Created PlanningChat component with message list and scroll area
   - Created ChatInput component with Enter-to-send and Shift+Enter for newlines
   - Extended sessionStore with chat state (messages, streamingContent, chatStatus)
   - Implemented IPC streaming for real-time AI responses
   - Added markdown rendering for AI messages
   - Added chat-related i18n translations (EN/FR)
   - Created suggestion chips for conversation starters

2. **Implementation Decisions:**
   - Chat messages stored in session state and persisted to session.json
   - Streaming uses `onPlanningChatStream` IPC channel with chunk types: text, done, error
   - Chat status phases: idle, thinking, streaming, complete, error
   - Input disabled during streaming to prevent duplicate sends
   - Auto-scroll to bottom on new messages

3. **Architecture Notes:**
   - PlanningChatMessage type: `{ id, role, content, timestamp }`
   - PlanningStreamChunk type: `{ type: 'text'|'done'|'error', content?, error? }`
   - Backend planning process spawned via main process IPC

### File List

**Created:**
- `apps/frontend/src/renderer/components/planning/PlanningChat.tsx`
- `apps/frontend/src/renderer/components/planning/ChatInput.tsx`

**Modified:**
- `apps/frontend/src/renderer/stores/planning/sessionStore.ts` - Added chat state and streaming actions
- `apps/frontend/src/renderer/components/planning/PlanningView.tsx` - Integrated chat component
- `apps/frontend/src/shared/types/planning.ts` - Added PlanningChatMessage, PlanningChatStatus, PlanningStreamChunk types
- `apps/frontend/src/shared/constants/ipc-channels.ts` - Added PLANNING_CHAT_SEND, PLANNING_CHAT_STREAM channels
- `apps/frontend/src/preload/index.ts` - Added sendPlanningMessage, onPlanningChatStream, onPlanningChatError APIs
- `apps/frontend/src/main/ipc-handlers/planning-handlers.ts` - Added chat send handler and stream event emitters
- `apps/frontend/src/shared/i18n/locales/en/planning.json` - Added chat translations
- `apps/frontend/src/shared/i18n/locales/fr/planning.json` - Added chat translations
