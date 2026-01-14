# Auto Claude Developer Documentation

Welcome to the Auto Claude developer documentation. This guide is designed to help developers understand, contribute to, and extend the Auto Claude codebase.

**Target Audience:** Junior to senior developers working on Auto Claude's frontend (Electron/React) or backend (Python/AI agents).

**Documentation Philosophy:** We explain concepts thoroughly, define technical terms, and provide visual diagrams to make the codebase accessible to developers of all experience levels.

---

## 📚 Table of Contents

### Getting Started
- [Setup Guide](./setup.md) - Development environment setup (Python, Node.js, dependencies)
- [Quick Start](#quick-start) - Get up and running in 5 minutes
- [Project Architecture](./architecture.md) - High-level system architecture and component interaction

### Frontend Documentation
- [Frontend Overview](./frontend/README.md) - Tech stack, folder structure, and development workflow
- [Frontend Architecture](./frontend/architecture.md) - Electron processes, React patterns, and app structure
- [Component System](./frontend/components.md) - React components and Radix UI integration
- [State Management](./frontend/state-management.md) - Zustand stores and state patterns
- [Electron IPC](./frontend/electron-ipc.md) - Inter-process communication and security

### Backend Documentation
- [Backend Overview](./backend/README.md) - Agent pipeline, folder structure, and CLI usage
- [Backend Architecture](./backend/architecture.md) - Agent orchestration, security, and isolation
- [Agent System](./backend/agents.md) - Planner, coder, and QA agents with workflow diagrams
- [Memory System](./backend/memory.md) - Graphiti knowledge graph and session context
- [Security Model](./backend/security.md) - Sandboxing, allowlisting, and worktree isolation
- [Integrations](./backend/integrations.md) - Linear, GitHub, and Electron MCP integrations

### Development Workflows
- [Testing Guide](./testing.md) - Unit tests, E2E tests, and QA validation
- [Development Workflows](./workflows.md) - Spec creation, build execution, QA, and merge processes

---

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have:
- **Node.js 18+** and **npm** (for frontend)
- **Python 3.12+** (for backend)
- **Git** (for version control)
- **Claude Pro or Max subscription** (for Claude Code access)
- **Claude Code CLI** installed: `npm install -g @anthropic-ai/claude-code`

### Setup in 5 Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/AndyMik90/Auto-Claude.git
   cd Auto-Claude
   ```

2. **Install frontend dependencies**
   ```bash
   cd apps/frontend
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd ../backend
   # Option 1: Using uv (recommended)
   uv venv && uv pip install -r requirements.txt

   # Option 2: Using venv
   python3 -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. **Configure authentication**
   ```bash
   # Set up Claude Code token
   claude setup-token

   # Create backend .env file
   cd apps/backend
   cp .env.example .env
   # Add your CLAUDE_CODE_OAUTH_TOKEN to .env
   ```

5. **Start the development servers**
   ```bash
   # Terminal 1 - Frontend
   cd apps/frontend
   npm run dev

   # Terminal 2 - Backend (test with a spec)
   cd apps/backend
   python spec_runner.py --interactive
   ```

**Next Steps:**
- Read the [Setup Guide](./setup.md) for detailed configuration options
- Explore the [Frontend Architecture](./frontend/architecture.md) to understand the UI
- Learn about the [Agent System](./backend/agents.md) to understand how AI builds features

---

## 🏗️ Documentation Structure

This documentation is organized into three main sections:

### 1. Root Level Documentation
High-level guides that apply to the entire project:
- **architecture.md** - System-wide architecture and component interactions
- **setup.md** - Development environment setup for both frontend and backend
- **testing.md** - Testing strategies across the entire stack
- **workflows.md** - End-to-end development workflows (spec → build → QA → merge)

### 2. Frontend Documentation (`frontend/`)
Everything related to the Electron/React application:
- UI architecture and component patterns
- State management with Zustand
- Electron main/renderer process communication
- Radix UI component integration
- Build and deployment processes

### 3. Backend Documentation (`backend/`)
Everything related to the Python AI agent system:
- Multi-agent orchestration pipeline
- Claude SDK integration
- Memory systems (file-based and Graphiti)
- Security model and sandboxing
- External integrations (Linear, GitHub)

---

## 🧭 How to Use This Documentation

### For New Contributors
1. Start with [Setup Guide](./setup.md) to configure your development environment
2. Read [Project Architecture](./architecture.md) to understand the big picture
3. Choose your focus area:
   - **Frontend work?** → Start with [Frontend Overview](./frontend/README.md)
   - **Backend work?** → Start with [Backend Overview](./backend/README.md)
4. Dive into specific topics as needed

### For Experienced Developers
- Use the table of contents above to jump directly to relevant sections
- Reference [Testing Guide](./testing.md) for test coverage requirements
- Check [Development Workflows](./workflows.md) for best practices

### Understanding Diagrams
Throughout this documentation, you'll find **Mermaid diagrams** that visualize architecture and workflows. These diagrams:
- Use **boxes** to represent components/services
- Use **arrows** to show data flow and dependencies
- Include **color coding** to distinguish different layers (UI, backend, external services)
- Render automatically in GitHub, VS Code, and most Markdown viewers

If diagrams don't render, ensure your Markdown viewer supports Mermaid syntax.

---

## 📦 Project Overview

Auto Claude is a **multi-agent autonomous coding framework** that builds software through coordinated AI agent sessions. It consists of two main parts:

### Frontend (Electron + React + TypeScript)
A desktop application that provides:
- **Kanban Board** - Visual task management interface
- **Agent Terminals** - Up to 12 concurrent AI coding sessions
- **Insights** - ChatGPT-style project conversations
- **Roadmap** - AI-generated feature prioritization
- **Ideation** - Code quality analysis and suggestions

**Tech Stack:** React, TypeScript, Vite, Electron, Zustand, Radix UI, Tailwind CSS

### Backend (Python + Claude SDK)
A CLI-based agent orchestration system that:
- Creates detailed specifications from user requirements
- Plans implementation into subtasks
- Executes builds in isolated git worktrees
- Validates work through built-in QA agents
- Manages cross-session memory with knowledge graphs

**Tech Stack:** Python 3.12+, Claude Agent SDK, Graphiti, LadybugDB

---

## 🔒 Security & Safety

Auto Claude prioritizes safety with a **three-layer security model**:
1. **OS Sandbox** - Bash commands run in isolation
2. **Filesystem Restrictions** - Operations limited to project directory
3. **Command Allowlist** - Dynamic allowlist based on detected tech stack

All AI work happens in **git worktrees** - isolated branches that keep your main codebase safe. Learn more in [Security Model](./backend/security.md).

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Pick a task** - Check GitHub issues or create a new spec with `python spec_runner.py --interactive`
2. **Make changes** - Follow patterns documented in this guide
3. **Test thoroughly** - See [Testing Guide](./testing.md) for requirements
4. **Submit PR** - Include clear description and link to relevant spec

**Note:** For major changes, please open an issue first to discuss the approach.

---

## 📖 Additional Resources

- **[CLAUDE.md](../CLAUDE.md)** - Quick reference for common commands and operations
- **[README.md](../README.md)** - End-user documentation and feature overview
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - Contribution guidelines and code of conduct
- **[RELEASE.md](../RELEASE.md)** - Release process and versioning strategy

---

## 💬 Get Help

- **Questions?** Join our [Discord community](https://discord.gg/KCXaPBr4Dj)
- **Bug reports?** Open an issue on [GitHub](https://github.com/AndyMik90/Auto-Claude/issues)
- **Documentation issues?** PRs welcome to improve these docs!

---

**Happy coding! 🚀**
