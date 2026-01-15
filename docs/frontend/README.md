# Frontend Overview

This document provides a comprehensive overview of Auto Claude's frontend application - an Electron-based desktop UI built with React, TypeScript, and modern web technologies.

**Target Audience:** Developers working on or extending the Auto Claude desktop application.

**What You'll Learn:**
- Frontend tech stack and why each technology was chosen
- Project folder structure and organization
- Quick start commands for development
- Key architectural patterns used throughout the codebase
- Links to detailed documentation for specific topics

---

## 🎯 What is the Frontend?

The Auto Claude frontend is a **desktop application** that provides a visual interface for managing AI-powered coding tasks. It runs on **Electron**, which allows us to build cross-platform desktop apps using web technologies (HTML, CSS, JavaScript/TypeScript).

**Key Features:**
- **Kanban Board** - Visual task management with drag-and-drop functionality
- **Agent Terminals** - Monitor up to 12 concurrent AI coding sessions in real-time
- **Insights** - ChatGPT-style interface for project conversations
- **Roadmap** - AI-generated feature prioritization and planning
- **Ideation** - Code quality analysis and improvement suggestions

**Why Electron?**
Electron lets us:
- Build once, deploy on macOS, Windows, and Linux
- Use familiar web technologies (React, CSS) while accessing OS-level features
- Integrate tightly with the Python backend through IPC (Inter-Process Communication)
- Provide a native desktop experience with system tray, notifications, and more

---

## 🛠️ Tech Stack

### Core Technologies

| Technology | Version | Purpose | Why We Use It |
|------------|---------|---------|---------------|
| **TypeScript** | 5.9+ | Type-safe JavaScript | Catch errors at compile-time, improve IDE support, better maintainability |
| **React** | 19.2+ | UI framework | Component-based architecture, excellent ecosystem, team familiarity |
| **Electron** | 39.2+ | Desktop app framework | Cross-platform desktop apps with web technologies |
| **Vite** | 7.2+ | Build tool | Fast development server, optimized production builds |
| **Tailwind CSS** | 4.1+ | Utility-first CSS | Rapid UI development, consistent design system |

### State Management

| Technology | Purpose | Use Cases |
|------------|---------|-----------|
| **Zustand** | Global state management | Task data, user settings, app configuration |
| **React Context** | Component-scoped state | Theme provider, modal context, notifications |

### UI Component Libraries

| Technology | Purpose | Components Used |
|------------|---------|-----------------|
| **Radix UI** | Headless UI primitives | Dialogs, dropdowns, tooltips, switches, tabs, alerts |
| **Lucide React** | Icon library | Consistent iconography throughout the app |
| **@dnd-kit** | Drag & drop | Kanban board task reordering |
| **Motion** | Animation library | Smooth transitions and micro-interactions |

### Terminal Integration

| Technology | Purpose |
|------------|---------|
| **xterm.js** | Terminal emulator in the browser |
| **node-pty** | Pseudo-terminal for spawning shell processes |

### Testing & Development

| Technology | Purpose |
|------------|---------|
| **Vitest** | Unit testing framework (Jest-compatible, faster) |
| **Playwright** | End-to-end testing |
| **ESLint** | Code linting and style enforcement |
| **TypeScript Compiler** | Type checking |

---

## 📁 Folder Structure

The frontend follows a **standard Electron project structure** with three main processes:

```
auto-claude-ui/
├── src/
│   ├── main/              # Electron main process (Node.js environment)
│   │   ├── index.ts       # Entry point, creates BrowserWindow
│   │   ├── ipc/           # IPC handlers (backend communication)
│   │   ├── backend/       # Python backend integration
│   │   └── ...
│   │
│   ├── renderer/          # Electron renderer process (browser environment)
│   │   ├── App.tsx        # Main React application component
│   │   ├── main.tsx       # React app entry point
│   │   ├── components/    # React components (organized by feature)
│   │   ├── stores/        # Zustand state stores
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility functions and helpers
│   │   └── styles/        # Global styles and Tailwind config
│   │
│   ├── preload/           # Electron preload scripts (bridge between main & renderer)
│   │   ├── index.ts       # Exposes safe IPC methods to renderer
│   │   └── ...
│   │
│   └── shared/            # Code shared across processes
│       ├── types/         # TypeScript type definitions
│       └── constants/     # Shared constants
│
├── resources/             # App icons, build resources
├── e2e/                   # End-to-end tests (Playwright)
├── out/                   # Compiled output (gitignored)
├── dist/                  # Built application packages (gitignored)
├── electron.vite.config.ts  # Vite configuration for Electron
├── package.json           # Dependencies and scripts
└── tsconfig.json          # TypeScript configuration
```

### Understanding Electron Processes

Electron apps have **two types of processes**:

1. **Main Process** (`src/main/`)
   - Runs in Node.js environment
   - Has full access to OS APIs (filesystem, network, system dialogs)
   - Creates and manages browser windows
   - Acts as a "server" for renderer processes

2. **Renderer Process** (`src/renderer/`)
   - Runs in browser environment (Chromium)
   - Limited OS access for security (communicates via IPC)
   - Renders the React UI
   - Acts as a "client" for the main process

3. **Preload Scripts** (`src/preload/`)
   - Runs before renderer process loads
   - Bridges main and renderer processes securely
   - Exposes safe APIs to renderer (via `window.electronAPI`)

**Security Note:** Renderer processes are sandboxed by default. They cannot directly access Node.js APIs or the filesystem. All privileged operations must go through IPC to the main process.

### Component Organization

Components in `src/renderer/components/` are organized **by feature**:

```
components/
├── ui/                    # Reusable UI primitives (buttons, inputs, cards)
├── terminal/              # Terminal-related components
├── task-detail/           # Task detail view components
├── roadmap/               # Roadmap view components
├── ideation/              # Ideation view components
├── settings/              # Settings dialogs and forms
├── github-issues/         # GitHub integration UI
├── linear-import/         # Linear import flow
├── onboarding/            # First-run onboarding flow
└── context/               # React context providers
```

**Pattern:** Each feature folder contains all related components, making it easy to find and modify code for a specific feature.

---

## 🚀 Quick Start Commands

### Development

```bash
# Navigate to frontend directory
cd auto-claude-ui

# Install dependencies (first time only)
npm install

# Start development server with hot reload
npm run dev

# Start with MCP remote debugging (for advanced debugging)
npm run dev:mcp
```

**What happens:** Vite starts a development server on `http://localhost:5173`, and Electron launches with the app. Changes to code automatically reload the app.

### Building

```bash
# Build for development (fast, unoptimized)
npm run build

# Package for distribution (macOS)
npm run package:mac

# Package for distribution (Windows)
npm run package:win

# Package for distribution (Linux)
npm run package:linux

# Package for all platforms
npm run package
```

**Output:** Packaged apps are in the `dist/` folder.

### Testing

```bash
# Run unit tests (Vitest)
npm test

# Run unit tests in watch mode
npm run test:watch

# Run unit tests with coverage report
npm run test:coverage

# Run end-to-end tests (Playwright)
npm run test:e2e
```

### Code Quality

```bash
# Lint code with ESLint
npm run lint

# Lint and auto-fix issues
npm run lint:fix

# Type-check TypeScript (no output)
npm run typecheck
```

**Best Practice:** Run `npm run lint` and `npm run typecheck` before committing code.

### Running Packaged App

```bash
# macOS
npm run start:packaged:mac

# Windows
npm run start:packaged:win

# Linux
npm run start:packaged:linux
```

---

## 🏗️ Key Architectural Patterns

### 1. Electron IPC Communication

**Pattern:** Renderer process → Preload → Main process

```typescript
// Renderer (React component)
const result = await window.electronAPI.getPythonPath()

// Preload (exposes safe API)
contextBridge.exposeInMainWorld('electronAPI', {
  getPythonPath: () => ipcRenderer.invoke('get-python-path')
})

// Main (handles request)
ipcMain.handle('get-python-path', async () => {
  return await pythonBackend.getPythonPath()
})
```

**Why:** This three-layer pattern ensures security by preventing direct Node.js access from renderer.

📖 **Learn More:** [Electron IPC Documentation](./electron-ipc.md)

### 2. Zustand State Management

**Pattern:** Global stores for cross-component state

```typescript
// Define store
const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] }))
}))

// Use in component
function TaskList() {
  const tasks = useTaskStore((state) => state.tasks)
  const addTask = useTaskStore((state) => state.addTask)
  // ...
}
```

**Why:** Simpler than Redux, better performance than Context for frequently-updated state.

📖 **Learn More:** [State Management Documentation](./state-management.md)

### 3. Radix UI Composition

**Pattern:** Compose headless primitives with custom styling

```typescript
import * as Dialog from '@radix-ui/react-dialog'

function TaskDialog({ children }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="btn-primary">{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 ...">
          {/* Dialog content */}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

**Why:** Radix handles accessibility, keyboard navigation, and complex behaviors while we control styling.

📖 **Learn More:** [Component System Documentation](./components.md)

### 4. Feature-First Organization

**Pattern:** Group related code by feature, not by type

```
✅ Good:
components/
  terminal/
    TerminalView.tsx
    TerminalHeader.tsx
    useTerminalState.ts

❌ Avoid:
components/
  TerminalView.tsx
  TerminalHeader.tsx
hooks/
  useTerminalState.ts
```

**Why:** Easier to find related code, easier to delete features, clearer ownership.

---

## 🔗 Related Documentation

### Detailed Frontend Topics

- **[Frontend Architecture](./architecture.md)** - Electron processes, React patterns, and data flow
- **[Component System](./components.md)** - Component organization and Radix UI patterns
- **[State Management](./state-management.md)** - Zustand stores and state management strategies
- **[Electron IPC](./electron-ipc.md)** - Inter-process communication and security

### Cross-Cutting Concerns

- **[Testing Guide](../testing.md)** - Unit and E2E testing strategies
- **[Development Workflows](../workflows.md)** - How frontend and backend work together

### General Resources

- **[Setup Guide](../setup.md)** - Initial development environment setup
- **[Project Architecture](../architecture.md)** - How frontend and backend integrate

---

## 🎓 Learning Path

### For New Frontend Developers

1. **Start here:** Read this document thoroughly
2. **Understand Electron:** Read [Frontend Architecture](./architecture.md) to understand the three-process model
3. **Explore components:** Review [Component System](./components.md) to see how UI is structured
4. **Learn state management:** Study [State Management](./state-management.md) to understand data flow
5. **Understand IPC:** Read [Electron IPC](./electron-ipc.md) to learn frontend-backend communication
6. **Run the app:** Follow [Quick Start Commands](#-quick-start-commands) to run locally
7. **Make a change:** Find a simple component, modify it, and see the result
8. **Write a test:** Add a unit test for your change using Vitest

### For Experienced React Developers

If you're familiar with React but new to Electron:
- Focus on [Frontend Architecture](./architecture.md) to understand the Electron-specific patterns
- Read [Electron IPC](./electron-ipc.md) to learn how to communicate with the backend
- Review `src/preload/index.ts` to see how the security bridge works

### For Backend Developers

If you're primarily a backend developer contributing to the frontend:
- Understand that Electron has **three processes** (main, renderer, preload) - not just one
- Renderer process is **browser-based** - no direct filesystem/OS access
- All backend communication goes through **IPC** (Inter-Process Communication)
- State management is handled by **Zustand**, not the backend

---

## 🐛 Common Issues & Troubleshooting

### Issue: "Module not found" errors

**Cause:** Missing dependencies or incorrect import paths

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: Hot reload not working

**Cause:** Vite dev server not detecting changes

**Solution:**
```bash
# Restart dev server
# Press Ctrl+C to stop
npm run dev
```

### Issue: TypeScript errors in IDE but build succeeds

**Cause:** IDE using different TypeScript version

**Solution:**
```bash
# Use workspace TypeScript version in VS Code
# Press Cmd+Shift+P → "TypeScript: Select TypeScript Version" → "Use Workspace Version"
```

### Issue: Electron window opens but shows blank screen

**Cause:** Build output missing or Vite server not started

**Solution:**
```bash
# Ensure dev server is running
npm run dev

# If still broken, clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

### Issue: IPC calls fail with "handler not found"

**Cause:** IPC handler not registered in main process

**Solution:**
1. Check that handler is registered in `src/main/ipc/`
2. Ensure handler name matches preload exposure
3. Restart Electron (hot reload doesn't reload main process changes)

---

## 📦 Key Dependencies

### Production Dependencies

| Package | Purpose | Documentation |
|---------|---------|---------------|
| `react`, `react-dom` | UI framework | [React Docs](https://react.dev) |
| `electron` | Desktop framework | [Electron Docs](https://electronjs.org/docs) |
| `zustand` | State management | [Zustand Docs](https://zustand-demo.pmnd.rs) |
| `@radix-ui/*` | UI primitives | [Radix UI Docs](https://radix-ui.com) |
| `@dnd-kit/*` | Drag & drop | [DnD Kit Docs](https://dndkit.com) |
| `@xterm/xterm` | Terminal emulator | [xterm.js Docs](https://xtermjs.org) |
| `tailwindcss` | CSS framework | [Tailwind Docs](https://tailwindcss.com) |

### Development Dependencies

| Package | Purpose | Documentation |
|---------|---------|---------------|
| `vite` | Build tool | [Vite Docs](https://vitejs.dev) |
| `vitest` | Testing framework | [Vitest Docs](https://vitest.dev) |
| `@playwright/test` | E2E testing | [Playwright Docs](https://playwright.dev) |
| `typescript` | Type system | [TypeScript Docs](https://typescriptlang.org) |
| `eslint` | Code linter | [ESLint Docs](https://eslint.org) |

---

## 🚦 Next Steps

Now that you understand the frontend overview:

1. **Dive deeper:** Read [Frontend Architecture](./architecture.md) for architectural details
2. **Explore components:** Review [Component System](./components.md) to understand UI patterns
3. **Run the app:** Follow the [Quick Start Commands](#-quick-start-commands)
4. **Make your first change:** Pick a small UI component and modify it
5. **Ask questions:** Join our [Discord community](https://discord.gg/KCXaPBr4Dj)

**Happy coding! 🎉**
