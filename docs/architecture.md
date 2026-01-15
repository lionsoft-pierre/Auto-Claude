# Auto Claude System Architecture

This document provides a high-level overview of Auto Claude's architecture, showing how the frontend desktop application and backend agent system work together to build software autonomously.

**Target Audience:** Developers who want to understand the overall system design before diving into specific components.

---

## Table of Contents

- [System Overview](#system-overview)
- [High-Level Architecture](#high-level-architecture)
- [Project Structure](#project-structure)
- [Service Relationships](#service-relationships)
- [Data Flow](#data-flow)
- [Communication Patterns](#communication-patterns)
- [Deployment Architecture](#deployment-architecture)
- [Key Architectural Decisions](#key-architectural-decisions)

---

## System Overview

Auto Claude is a **dual-service application** consisting of:

1. **Desktop Frontend** (`auto-claude-ui/`) - An Electron-based React application providing a visual interface for task management, agent terminals, and project insights
2. **Backend Agent System** (`auto-claude/`) - A Python CLI orchestrating AI agents that autonomously plan, code, and validate software features

**Key Concept:** The frontend and backend are **loosely coupled** - they communicate through the filesystem and shell commands rather than traditional HTTP APIs. This design allows:
- The backend to work standalone as a CLI tool
- The frontend to spawn and manage multiple backend processes
- Complete isolation between concurrent builds
- No network dependencies for local development

---

## High-Level Architecture

```mermaid
graph TB
    subgraph "Desktop Application (Electron)"
        UI[React UI Layer]
        Main[Electron Main Process]
        IPC[IPC Bridge]

        UI -->|"User Actions"| IPC
        IPC -->|"System Calls"| Main
    end

    subgraph "Backend Agent System (Python)"
        CLI[CLI Entry Point<br/>run.py]
        Orchestrator[Agent Orchestrator]

        subgraph "Spec Creation Pipeline"
            Gatherer[Requirements Gatherer]
            Researcher[Integration Researcher]
            Writer[Spec Writer]
            Critic[Spec Critic]
        end

        subgraph "Implementation Pipeline"
            Planner[Planner Agent]
            Coder[Coder Agent]
            QA[QA Reviewer Agent]
            Fixer[QA Fixer Agent]
        end

        CLI --> Orchestrator
        Orchestrator --> Gatherer
        Orchestrator --> Planner
        Planner --> Coder
        Coder --> QA
        QA --> Fixer
    end

    subgraph "Storage & Isolation"
        Worktree[Git Worktrees<br/>Isolated Branches]
        Memory[File-Based Memory]
        Graphiti[Graphiti Knowledge Graph<br/>Optional]
        Specs[Spec Files<br/>.auto-claude/specs/]
    end

    subgraph "External Services"
        Claude[Claude API<br/>Anthropic]
        Linear[Linear API<br/>Optional]
        GitHub[GitHub API<br/>Optional]
    end

    Main -->|"Spawns Process"| CLI
    Orchestrator -->|"Read/Write"| Specs
    Orchestrator -->|"Create/Switch"| Worktree
    Orchestrator -->|"Store Context"| Memory
    Orchestrator -->|"Semantic Search"| Graphiti

    Coder -->|"API Calls"| Claude
    Orchestrator -->|"Progress Updates"| Linear
    CLI -->|"PR Creation"| GitHub

    UI -.->|"Monitors Files"| Specs
    UI -.->|"Displays Progress"| Memory

    style UI fill:#e1f5ff,stroke:#0288d1
    style Main fill:#e1f5ff,stroke:#0288d1
    style IPC fill:#e1f5ff,stroke:#0288d1

    style CLI fill:#fff3e0,stroke:#f57c00
    style Orchestrator fill:#fff3e0,stroke:#f57c00
    style Planner fill:#fff9c4,stroke:#f9a825
    style Coder fill:#fff9c4,stroke:#f9a825
    style QA fill:#fff9c4,stroke:#f9a825
    style Fixer fill:#fff9c4,stroke:#f9a825
    style Gatherer fill:#f3e5f5,stroke:#8e24aa
    style Researcher fill:#f3e5f5,stroke:#8e24aa
    style Writer fill:#f3e5f5,stroke:#8e24aa
    style Critic fill:#f3e5f5,stroke:#8e24aa

    style Worktree fill:#e8f5e9,stroke:#43a047
    style Memory fill:#e8f5e9,stroke:#43a047
    style Specs fill:#e8f5e9,stroke:#43a047
    style Graphiti fill:#e8f5e9,stroke:#43a047

    style Claude fill:#fce4ec,stroke:#c2185b
    style Linear fill:#fce4ec,stroke:#c2185b
    style GitHub fill:#fce4ec,stroke:#c2185b
```

**Diagram Legend:**
- **Blue** - Frontend (Electron/React)
- **Orange** - Backend Core (Orchestration)
- **Yellow** - Implementation Agents
- **Purple** - Spec Creation Agents
- **Green** - Storage & Isolation
- **Pink** - External Services
- **Solid arrows** - Direct interaction
- **Dashed arrows** - File system monitoring

---

## Project Structure

Auto Claude uses a **dual-repository pattern** where both services live in the same Git repository but operate independently:

```
Auto-Claude/
├── auto-claude/              # Backend (Python)
│   ├── agents/               # Implementation agents
│   ├── spec_agents/          # Spec creation agents
│   ├── core/                 # Core infrastructure
│   ├── integrations/         # External integrations
│   ├── prompts/              # Agent system prompts
│   ├── cli/                  # CLI commands
│   ├── run.py               # Main entry point
│   └── spec_runner.py       # Spec creation entry point
│
├── auto-claude-ui/           # Frontend (Electron + React)
│   ├── src/
│   │   ├── main/            # Electron main process
│   │   ├── renderer/        # React application
│   │   ├── preload/         # Electron preload scripts
│   │   └── shared/          # Shared types/utilities
│   ├── resources/           # Application assets
│   └── package.json         # Node.js dependencies
│
├── .auto-claude/             # Project-specific data (gitignored)
│   ├── specs/               # Task specifications and plans
│   ├── worktrees/           # Isolated git worktrees
│   └── memory/              # Session context and patterns
│
├── tests/                    # Backend unit tests
├── scripts/                  # Build and release scripts
└── guides/                   # User guides and tutorials
```

### Why This Structure?

**1. Independent Operation**
- Backend can run standalone via CLI: `python auto-claude/run.py --spec 001`
- Frontend wraps backend but doesn't require it for UI development
- Each service has its own dependencies and build process

**2. Loose Coupling**
- Services communicate via filesystem (spec files, progress logs)
- No direct API calls between frontend and backend
- Frontend spawns backend as subprocess when needed

**3. Shared Git Repository**
- Simplified version control
- Coordinated releases
- Shared documentation and CI/CD

**This is NOT a traditional monorepo** (no Nx, Turborepo, or shared workspace dependencies). It's two independent applications that share a repository.

---

## Service Relationships

### Frontend → Backend Communication

```mermaid
sequenceDiagram
    participant User
    participant ElectronUI as Electron UI
    participant MainProcess as Electron Main
    participant Backend as Python CLI
    participant FileSystem as File System

    User->>ElectronUI: Create new task
    ElectronUI->>MainProcess: IPC: createSpec(description)
    MainProcess->>Backend: Spawn: python spec_runner.py --task "..."
    Backend->>FileSystem: Write .auto-claude/specs/001/spec.md
    Backend->>FileSystem: Write requirements.json
    Backend-->>MainProcess: Exit code 0 (success)
    MainProcess->>FileSystem: Watch .auto-claude/specs/
    FileSystem-->>MainProcess: File change event
    MainProcess->>ElectronUI: IPC: specUpdated(001)
    ElectronUI->>User: Display new task in Kanban

    User->>ElectronUI: Start build
    ElectronUI->>MainProcess: IPC: runBuild(001)
    MainProcess->>Backend: Spawn: python run.py --spec 001
    Backend->>FileSystem: Write build-progress.txt
    loop Every 2 seconds
        MainProcess->>FileSystem: Read build-progress.txt
        MainProcess->>ElectronUI: IPC: progressUpdate(status)
        ElectronUI->>User: Update progress bar
    end
    Backend->>FileSystem: Write qa_report.md
    Backend-->>MainProcess: Exit code 0
    MainProcess->>ElectronUI: IPC: buildComplete(001)
    ElectronUI->>User: Show completion notification
```

**Key Points:**
- **Process Spawning** - Frontend spawns backend Python processes as needed
- **File-Based IPC** - Services communicate through shared files in `.auto-claude/`
- **File Watching** - Frontend monitors filesystem for changes to update UI
- **No Network Required** - All communication happens locally via files and processes

---

## Data Flow

### Spec Creation Flow

```mermaid
flowchart LR
    A[User Input] --> B[Requirements Gatherer Agent]
    B --> C[requirements.json]
    C --> D[Context Discovery]
    D --> E[context.json]
    E --> F[Integration Researcher<br/>Optional]
    F --> G[research.json]
    G --> H[Spec Writer Agent]
    H --> I[spec.md]
    I --> J[Spec Critic Agent<br/>Complex Tasks Only]
    J --> K[spec.md<br/>Refined]
    K --> L[Implementation Plan Agent]
    L --> M[implementation_plan.json]

    style A fill:#e3f2fd
    style C fill:#e8f5e9
    style E fill:#e8f5e9
    style G fill:#e8f5e9
    style I fill:#e8f5e9
    style K fill:#e8f5e9
    style M fill:#e8f5e9

    style B fill:#fff3e0
    style D fill:#fff3e0
    style F fill:#fff3e0
    style H fill:#fff3e0
    style J fill:#fff3e0
    style L fill:#fff3e0
```

### Implementation Flow

```mermaid
flowchart TD
    A[implementation_plan.json] --> B[Planner Agent]
    B --> C[Subtasks Created]
    C --> D[Coder Agent]
    D --> E{Can Parallelize?}

    E -->|Yes| F[Spawn Subagents]
    E -->|No| G[Sequential Implementation]

    F --> H[Subagent 1]
    F --> I[Subagent 2]
    F --> J[Subagent N]

    H --> K[Merge Results]
    I --> K
    J --> K
    G --> K

    K --> L[All Subtasks Complete]
    L --> M[QA Reviewer Agent]
    M --> N{Acceptance Criteria Met?}

    N -->|Yes| O[Build Complete]
    N -->|No| P[QA Fixer Agent]

    P --> Q[Fix Issues]
    Q --> M

    style A fill:#e8f5e9
    style C fill:#fff9c4
    style L fill:#fff9c4
    style O fill:#c8e6c9

    style B fill:#fff3e0
    style D fill:#fff3e0
    style F fill:#ffecb3
    style G fill:#ffecb3
    style H fill:#ffe0b2
    style I fill:#ffe0b2
    style J fill:#ffe0b2
    style M fill:#fff3e0
    style P fill:#fff3e0
    style Q fill:#fff3e0
```

### Data Storage Layers

```mermaid
graph TD
    subgraph "Persistent Storage"
        Specs[Spec Files<br/>spec.md, requirements.json]
        Plans[Implementation Plans<br/>implementation_plan.json]
        QA[QA Reports<br/>qa_report.md]
        Worktrees[Git Worktrees<br/>Isolated branches]
    end

    subgraph "Session Memory"
        FileMemory[File-Based Memory<br/>specs/XXX/memory/]
        Patterns[Code Patterns]
        Gotchas[Known Issues]
        Discoveries[Codebase Insights]
    end

    subgraph "Cross-Session Memory (Optional)"
        Graphiti[Graphiti Knowledge Graph]
        Embeddings[Semantic Embeddings]
        Relations[Entity Relations]
    end

    Specs --> FileMemory
    Plans --> FileMemory
    FileMemory --> Patterns
    FileMemory --> Gotchas
    FileMemory --> Discoveries

    FileMemory -.->|Enhanced by| Graphiti
    Graphiti --> Embeddings
    Graphiti --> Relations

    style Specs fill:#e8f5e9
    style Plans fill:#e8f5e9
    style QA fill:#e8f5e9
    style Worktrees fill:#e8f5e9

    style FileMemory fill:#fff9c4
    style Patterns fill:#fff9c4
    style Gotchas fill:#fff9c4
    style Discoveries fill:#fff9c4

    style Graphiti fill:#f3e5f5
    style Embeddings fill:#f3e5f5
    style Relations fill:#f3e5f5
```

---

## Communication Patterns

### 1. Frontend ↔ Backend (File System)

**Pattern:** Process Spawning + File Watching

```typescript
// Frontend: Spawn backend process
const backendProcess = spawn('python', ['auto-claude/run.py', '--spec', '001'], {
  cwd: projectPath,
  env: process.env
});

// Frontend: Watch for file changes
const watcher = chokidar.watch('.auto-claude/specs/001/build-progress.txt');
watcher.on('change', () => {
  const progress = fs.readFileSync('build-progress.txt', 'utf-8');
  updateUI(progress);
});
```

**Why not HTTP/WebSockets?**
- Backend is a CLI tool, not a server
- File-based communication allows offline operation
- No port conflicts or network configuration needed
- Simpler debugging (just read the files)

### 2. Backend Agents ↔ Claude API

**Pattern:** Direct HTTP via Claude SDK

```python
from claude_code import Client

client = Client(
    oauth_token=os.getenv("CLAUDE_CODE_OAUTH_TOKEN"),
    model="claude-sonnet-4-20250514"
)

response = client.run_agent(
    prompt=prompt,
    tools=tools,
    max_turns=50
)
```

### 3. Frontend Components ↔ State

**Pattern:** Zustand State Management

```typescript
// Frontend: Zustand store
const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
  }))
}));

// Frontend: React component
const TaskBoard = () => {
  const tasks = useTaskStore(state => state.tasks);
  const addTask = useTaskStore(state => state.addTask);
  // ...
};
```

### 4. Git Worktree Isolation

**Pattern:** Branch-per-task with isolated working directories

```bash
# Backend creates isolated worktree for each build
git worktree add .auto-claude/worktrees/001-feature auto-claude/001-feature

# All changes happen in isolated directory
cd .auto-claude/worktrees/001-feature
# ... make changes ...
git commit -m "auto-claude: implement feature"

# Merge back when approved
git checkout main
git merge --no-ff auto-claude/001-feature
```

**Benefits:**
- Main branch never modified during build
- Multiple builds can run concurrently
- Easy to discard failed builds
- No conflicts between parallel tasks

---

## Deployment Architecture

### Development Mode

```mermaid
graph LR
    Dev[Developer Machine]

    subgraph "Dev Environment"
        Frontend[Electron Dev<br/>npm run dev<br/>Port 3000]
        Backend[Python CLI<br/>Direct execution]
        ClaudeAPI[Claude API<br/>Anthropic Cloud]
    end

    Dev -->|Runs| Frontend
    Dev -->|Runs| Backend
    Backend -->|API Calls| ClaudeAPI
    Frontend -.->|File Watch| Backend

    style Frontend fill:#e1f5ff
    style Backend fill:#fff3e0
    style ClaudeAPI fill:#fce4ec
```

### Production Mode (Desktop App)

```mermaid
graph LR
    User[End User]

    subgraph "Packaged Application"
        ElectronApp[Auto Claude.app<br/>Electron Bundle]
        PythonBundle[Python Runtime<br/>Bundled Dependencies]
    end

    subgraph "User's Project"
        ProjectDir[Project Directory]
        AutoClaudeDir[.auto-claude/]
    end

    ClaudeAPI[Claude API<br/>Anthropic Cloud]

    User -->|Launches| ElectronApp
    ElectronApp -->|Spawns| PythonBundle
    PythonBundle -->|Reads/Writes| ProjectDir
    PythonBundle -->|Manages| AutoClaudeDir
    PythonBundle -->|API Calls| ClaudeAPI
    ElectronApp -.->|Monitors| AutoClaudeDir

    style ElectronApp fill:#e1f5ff
    style PythonBundle fill:#fff3e0
    style ProjectDir fill:#e8f5e9
    style AutoClaudeDir fill:#e8f5e9
    style ClaudeAPI fill:#fce4ec
```

**Key Packaging Details:**
- **Electron Builder** packages the Electron app with Node.js runtime
- **Python** is bundled (via PyInstaller or system Python) with all dependencies
- **No internet required** except for Claude API calls
- **Cross-platform** - macOS (Intel/Apple Silicon), Windows, Linux

---

## Key Architectural Decisions

### 1. Why File-Based Communication?

**Decision:** Frontend and backend communicate through files rather than HTTP API.

**Rationale:**
- Backend must work as standalone CLI tool (primary use case)
- File watching is simple and reliable for progress updates
- No network configuration or port management needed
- Debugging is easier (just read the files)
- Supports offline operation (except Claude API calls)

**Trade-offs:**
- ❌ Slight delay in UI updates (file polling)
- ✅ Simpler architecture
- ✅ No server management complexity

### 2. Why Git Worktrees?

**Decision:** Each build runs in an isolated git worktree on a separate branch.

**Rationale:**
- Main branch remains untouched during builds
- Multiple builds can run in parallel without conflicts
- Easy to discard failed builds (just delete worktree)
- Safe experimentation - nothing affects production code
- Natural rollback mechanism (just don't merge)

**Trade-offs:**
- ❌ Additional disk space for worktrees
- ✅ Complete isolation between builds
- ✅ Parallel execution without conflicts

### 3. Why Dual Memory System?

**Decision:** File-based memory (always available) + optional Graphiti (semantic search).

**Rationale:**
- File-based memory has zero dependencies and always works
- Graphiti requires Python 3.12+ and external API keys
- Not all users want graph database complexity
- File memory is human-readable for debugging

**Trade-offs:**
- ❌ Maintaining two memory systems
- ✅ Works for all users (file-based)
- ✅ Advanced users get semantic search (Graphiti)

### 4. Why Multi-Agent Architecture?

**Decision:** Separate agents for planning, coding, QA review, and QA fixing.

**Rationale:**
- **Separation of concerns** - Each agent has a focused role
- **Better prompts** - Specialized prompts for each phase
- **Failure isolation** - QA agent can reject without affecting planner
- **Parallel execution** - Coder agent can spawn subagents for concurrent work

**Trade-offs:**
- ❌ More complex orchestration
- ✅ Higher quality output
- ✅ Better error recovery

### 5. Why Spec-First Approach?

**Decision:** Always create a detailed spec before implementation.

**Rationale:**
- Forces clear requirements gathering
- Provides context for all agents in the pipeline
- User can review/approve plan before code is written
- Enables accurate progress tracking
- Documents decision-making process

**Trade-offs:**
- ❌ Additional upfront time for spec creation
- ✅ Fewer misunderstandings and rework
- ✅ Better documentation

---

## Next Steps

Now that you understand the overall architecture:

- **Frontend developers** → Read [Frontend Architecture](./frontend/architecture.md)
- **Backend developers** → Read [Backend Architecture](./backend/architecture.md)
- **Set up your environment** → Follow [Setup Guide](./setup.md)
- **Learn the workflow** → Check [Development Workflows](./workflows.md)

---

**Need help?** Join our [Discord community](https://discord.gg/KCXaPBr4Dj) or open an issue on [GitHub](https://github.com/AndyMik90/Auto-Claude/issues).
