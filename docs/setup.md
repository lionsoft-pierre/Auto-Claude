# Environment Setup Guide

This guide will help you set up your development environment for Auto Claude, whether you're contributing to the framework or running it from source.

## Prerequisites

Before you begin, ensure you have the following installed:

### Required

- **Python 3.12+** - The backend framework requires Python 3.12 or higher
  - Check your version: `python3 --version`
  - Download from: [python.org](https://www.python.org/downloads/)

- **Node.js 18+** - Required for the optional Electron frontend
  - Check your version: `node --version`
  - Download from: [nodejs.org](https://nodejs.org/)

- **Git** - Version control system
  - Check your version: `git --version`
  - Download from: [git-scm.com](https://git-scm.com/)

- **Claude Pro or Max Subscription** - Required for Claude Code access
  - Subscribe at: [claude.ai/upgrade](https://claude.ai/upgrade)

- **Claude Code CLI** - Anthropic's CLI tool
  ```bash
  npm install -g @anthropic-ai/claude-code
  ```

### Recommended

- **uv** - Fast Python package installer (recommended over pip)
  ```bash
  pip install uv
  ```

- **pnpm** - Package manager for the frontend (more efficient than npm)
  ```bash
  npm install -g pnpm
  ```

## Backend Setup

The Python backend (`auto-claude/`) is the core autonomous coding framework.

### Step 1: Clone the Repository

```bash
git clone https://github.com/AndyMik90/Auto-Claude.git
cd Auto-Claude
```

### Step 2: Create Virtual Environment

Choose one of the following methods:

**Option A: Using uv (Recommended)**
```bash
cd auto-claude
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -r requirements.txt
```

**Option B: Using Standard Python**
```bash
cd auto-claude
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Step 3: Set Up OAuth Token

Auto Claude uses Claude Code OAuth authentication (API keys are not supported).

```bash
# Run the setup wizard
claude setup-token
```

This saves your token securely to your system keychain.

### Step 4: Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your token (if not using keychain)
# nano .env  # or use your preferred editor
```

**Required variables:**
```bash
# Only needed if not using system keychain
CLAUDE_CODE_OAUTH_TOKEN=your-oauth-token-here
```

**Optional variables:**
```bash
# Override default model (default: claude-opus-4-5-20251101)
AUTO_BUILD_MODEL=claude-opus-4-5-20251101

# Enable debug logging
DEBUG=true
DEBUG_LEVEL=1

# Default git branch for worktrees (auto-detected if not set)
DEFAULT_BRANCH=main
```

### Step 5: Install Test Dependencies (Optional)

If you plan to run tests or contribute code:

```bash
# From the auto-claude directory
pip install -r ../tests/requirements-test.txt
```

### Step 6: Verify Installation

```bash
# Test that the CLI works
python run.py --help

# List available specs
python run.py --list
```

## Frontend Setup

The Electron frontend (`auto-claude-ui/`) is optional but provides a better user experience.

### Step 1: Navigate to UI Directory

```bash
cd auto-claude-ui
```

### Step 2: Install Dependencies

**Using pnpm (Recommended)**
```bash
pnpm install
```

**Using npm**
```bash
npm install
```

> **Windows users:** If you encounter node-gyp errors, you may need to install [Visual Studio Build Tools 2022](https://visualstudio.microsoft.com/visual-cpp-build-tools/). Select "Desktop development with C++" workload and add "MSVC v143 - VS 2022 C++ x64/x86 Spectre-mitigated libs" in Individual Components.

### Step 3: Configure Frontend Environment (Optional)

```bash
# Copy the example environment file
cp .env.example .env
```

**Available options:**
```bash
# Enable debug logging
DEBUG=true

# Enable debug logging for auto-updater
DEBUG_UPDATER=true
```

### Step 4: Start Development Server

```bash
# Development mode with hot reload
pnpm dev

# Or with npm
npm run dev
```

The Electron app should launch automatically.

### Step 5: Build for Production (Optional)

```bash
# Build the app
pnpm build

# Start production build
pnpm start

# Package for distribution
pnpm package
```

## Environment Variables Reference

### Backend Variables (`auto-claude/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CLAUDE_CODE_OAUTH_TOKEN` | Yes* | - | OAuth token from `claude setup-token` |
| `AUTO_BUILD_MODEL` | No | `claude-opus-4-5-20251101` | Model override for builds |
| `DEFAULT_BRANCH` | No | Auto-detected | Default base branch for worktrees |
| `DEBUG` | No | `false` | Enable debug logging |
| `DEBUG_LEVEL` | No | `1` | Debug verbosity (1-3) |
| `DEBUG_LOG_FILE` | No | - | Log to file instead of stdout |
| `LINEAR_API_KEY` | No | - | Enable Linear integration |
| `GRAPHITI_ENABLED` | No | `false` | Enable graph memory (requires Python 3.12+) |
| `OPENAI_API_KEY` | No | - | Required if using Graphiti with OpenAI |
| `ENABLE_FANCY_UI` | No | `true` | Enable colored terminal output |

\* Not required if token is saved to system keychain via `claude setup-token`

### Advanced Configuration

**Custom API Endpoint** (for proxies/self-hosted):
```bash
ANTHROPIC_BASE_URL=http://127.0.0.1:3456
NO_PROXY=127.0.0.1
DISABLE_TELEMETRY=true
API_TIMEOUT_MS=600000
```

**Linear Integration** (real-time progress tracking):
```bash
LINEAR_API_KEY=lin_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LINEAR_TEAM_ID=your-team-id  # Optional, auto-detected
LINEAR_PROJECT_ID=your-project-id  # Optional, created if needed
```

**Graphiti Memory** (enhanced cross-session memory):
```bash
GRAPHITI_ENABLED=true
GRAPHITI_LLM_PROVIDER=openai  # openai, anthropic, azure_openai, ollama, google
GRAPHITI_EMBEDDER_PROVIDER=openai  # openai, voyage, azure_openai, ollama, google
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Electron MCP** (UI validation for QA agents):
```bash
ELECTRON_MCP_ENABLED=true
ELECTRON_DEBUG_PORT=9222
```

See `auto-claude/.env.example` for complete configuration options and examples.

### Frontend Variables (`auto-claude-ui/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEBUG` | No | `false` | Enable debug logging across the app |
| `DEBUG_UPDATER` | No | `false` | Enable auto-updater debug logs |
| `NODE_ENV` | No | Auto-set | Development or production mode |

## Troubleshooting

### Common Setup Issues

#### Python Version Error

**Problem:** Error about Python version being too old

**Solution:**
```bash
# Check your Python version
python3 --version

# If < 3.12, install a newer version
# macOS with Homebrew:
brew install python@3.12

# Ubuntu/Debian:
sudo apt install python3.12

# Then recreate your virtual environment
```

#### OAuth Token Not Found

**Problem:** `CLAUDE_CODE_OAUTH_TOKEN not found` error

**Solutions:**
```bash
# Option 1: Run setup-token again
claude setup-token

# Option 2: Manually add token to .env
echo "CLAUDE_CODE_OAUTH_TOKEN=your-token-here" >> auto-claude/.env

# Option 3: Export as environment variable
export CLAUDE_CODE_OAUTH_TOKEN=your-token-here
```

#### Module Not Found Errors

**Problem:** `ModuleNotFoundError` when running Auto Claude

**Solution:**
```bash
# Ensure virtual environment is activated
cd auto-claude
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Reinstall dependencies
pip install -r requirements.txt
```

#### Node-gyp Errors (Windows)

**Problem:** Compilation errors when running `pnpm install` on Windows

**Solution:**
1. Install [Visual Studio Build Tools 2022](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
2. Select "Desktop development with C++" workload
3. In "Individual Components", add:
   - MSVC v143 - VS 2022 C++ x64/x86 Spectre-mitigated libs
   - Windows 11 SDK (latest version)
4. Restart your terminal and run `pnpm install` again

> **Note:** Auto Claude downloads prebuilt binaries for most platforms. Native compilation is only needed if prebuilts aren't available for your Electron version.

#### Git Worktree Errors

**Problem:** Errors about existing worktrees or branches

**Solution:**
```bash
# List existing worktrees
git worktree list

# Remove stale worktrees
git worktree remove .worktrees/auto-claude/spec-name

# Or force remove if needed
git worktree remove --force .worktrees/auto-claude/spec-name

# Clean up branches
git branch -D auto-claude/spec-name
```

#### Port Already in Use (Frontend)

**Problem:** Error: `Port 5173 is already in use`

**Solution:**
```bash
# Find and kill the process using the port
# macOS/Linux:
lsof -ti:5173 | xargs kill -9

# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Or change the port in vite.config.ts
```

#### Graphiti Memory Errors

**Problem:** Errors when enabling Graphiti memory

**Solution:**
```bash
# Ensure Python 3.12+ is installed
python3 --version

# Install Graphiti dependencies
pip install real_ladybug graphiti-core

# Verify provider credentials are set
# For OpenAI:
echo $OPENAI_API_KEY

# Check configuration
cat auto-claude/.env | grep GRAPHITI
```

#### Permission Denied Errors

**Problem:** Permission errors when running scripts

**Solution:**
```bash
# Make scripts executable
chmod +x auto-claude/run.py
chmod +x auto-claude/spec_runner.py

# Or run with python explicitly
python auto-claude/run.py --spec 001
```

### Getting Help

If you're still experiencing issues:

1. **Check the logs** - Enable debug mode:
   ```bash
   DEBUG=true python auto-claude/run.py --spec 001
   ```

2. **Review existing issues** on GitHub:
   - [Open Issues](https://github.com/AndyMik90/Auto-Claude/issues)
   - [Discussions](https://github.com/AndyMik90/Auto-Claude/discussions)

3. **Join our Discord** for community support:
   - [Discord Community](https://discord.gg/KCXaPBr4Dj)

4. **Open a new issue** with:
   - OS and version
   - Python version (`python3 --version`)
   - Node.js version (`node --version`)
   - Error messages and logs
   - Steps to reproduce

## Next Steps

Now that your environment is set up, check out:

- **[Architecture Guide](architecture.md)** - Understanding the codebase
- **[Development Workflows](workflows.md)** - Development workflows and processes
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - Contribution guidelines
- **[CLAUDE.md](../CLAUDE.md)** - Quick reference for common commands

## Verification Checklist

Before you start developing, verify:

- [ ] Python 3.12+ is installed
- [ ] Node.js 18+ is installed
- [ ] Virtual environment is activated
- [ ] Backend dependencies installed (`pip list`)
- [ ] Frontend dependencies installed (`pnpm list`)
- [ ] OAuth token is configured
- [ ] CLI runs without errors (`python run.py --help`)
- [ ] Frontend launches (`pnpm dev`)
- [ ] Tests pass (`pytest tests/ -v`)

You're ready to build with Auto Claude! 🚀
