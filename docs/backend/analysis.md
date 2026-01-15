# Analysis Module & Context Detectors

This document explains Auto-Claude's analysis module, which scans projects to detect technology stacks, patterns, and context for AI agents.

**Target Audience:** Developers building new detectors or extending project analysis capabilities.

---

## Overview

The analysis module provides **comprehensive project introspection**:

1. **Technology Detection**: Identify frameworks, languages, and libraries
2. **Pattern Discovery**: Find authentication, database, API patterns
3. **Context Gathering**: Extract information for AI agent prompts
4. **Security Profiling**: Determine safe commands for sandboxing

**Key Use Cases:**
- Dynamic command allowlisting for security
- Context injection for agent prompts
- Spec creation intelligence
- Ideation module analysis

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Analysis Module                              │
│         (apps/backend/analysis/)                                │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Project       │    │ Context       │    │ Risk          │
│ Analyzer      │    │ Detectors     │    │ Classifier    │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │
        ▼                     ▼
┌───────────────┐    ┌───────────────────────────────────┐
│ Stack         │    │            Detectors              │
│ Detection     │    ├───────────────┬───────────────────┤
└───────────────┘    │ Auth    │ API   │ Env  │ Jobs    │
                     │ Services│ Migrate│ Monitor│ ...  │
                     └───────────────┴───────────────────┘
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **ProjectAnalyzer** | `context/project_analyzer.py` | Main analyzer orchestration |
| **BaseAnalyzer** | `analyzers/base.py` | Base class for all analyzers |
| **Context Detectors** | `analyzers/context/` | Specialized pattern detectors |
| **RiskClassifier** | `analyzers/risk_classifier.py` | Security risk assessment |

---

## Context Detectors

Located in `apps/backend/analysis/analyzers/context/`:

### AuthDetector

Detects authentication and authorization patterns.

```python
class AuthDetector(BaseAnalyzer):
    """Detects authentication patterns."""

    JWT_LIBS = ["python-jose", "pyjwt", "jsonwebtoken", "jose"]
    OAUTH_LIBS = ["authlib", "passport", "next-auth", "@auth/core"]
    SESSION_LIBS = ["flask-login", "express-session", "django.contrib.auth"]
```

**Detects:**
- JWT authentication libraries
- OAuth providers
- Session-based authentication
- API key authentication
- User models
- Auth middleware/decorators

**Output:**
```json
{
  "auth": {
    "strategies": ["jwt", "oauth"],
    "libraries": ["pyjwt", "authlib"],
    "user_model": "app/models/user.py",
    "middleware": ["login_required", "authenticate"]
  }
}
```

### ApiDocsDetector

Detects API documentation patterns.

**Detects:**
- OpenAPI/Swagger specs
- API Blueprint files
- GraphQL schemas
- REST endpoint documentation

**Output:**
```json
{
  "api_docs": {
    "type": "openapi",
    "spec_file": "docs/openapi.yaml",
    "version": "3.0.0"
  }
}
```

### EnvironmentDetector

Detects environment configuration patterns.

**Detects:**
- `.env` files and patterns
- Environment variable usage
- Config file locations
- Secrets management

**Output:**
```json
{
  "environment": {
    "env_files": [".env", ".env.example"],
    "required_vars": ["DATABASE_URL", "SECRET_KEY"],
    "secrets_management": "dotenv"
  }
}
```

### JobsDetector

Detects background job and task queue patterns.

**Detects:**
- Celery tasks
- Bull/BullMQ queues
- Cron jobs
- Background workers

**Output:**
```json
{
  "jobs": {
    "framework": "celery",
    "task_files": ["app/tasks.py"],
    "queue_config": "celeryconfig.py"
  }
}
```

### MigrationsDetector

Detects database migration patterns.

**Detects:**
- Alembic migrations
- Django migrations
- Prisma migrations
- Knex migrations

**Output:**
```json
{
  "migrations": {
    "framework": "alembic",
    "migrations_dir": "alembic/versions/",
    "pending_count": 2
  }
}
```

### MonitoringDetector

Detects observability and monitoring patterns.

**Detects:**
- Logging frameworks
- APM integrations (Sentry, DataDog)
- Metrics collection
- Health checks

**Output:**
```json
{
  "monitoring": {
    "logging": "structlog",
    "apm": ["sentry"],
    "metrics": "prometheus",
    "health_endpoint": "/health"
  }
}
```

### ServicesDetector

Detects microservice and infrastructure patterns.

**Detects:**
- Docker configurations
- Kubernetes manifests
- Docker Compose files
- Service dependencies

**Output:**
```json
{
  "services": {
    "containerization": "docker",
    "orchestration": "docker-compose",
    "services": ["api", "worker", "redis", "postgres"]
  }
}
```

---

## BaseAnalyzer

All detectors inherit from `BaseAnalyzer`:

```python
class BaseAnalyzer:
    """Base class for all analyzers."""

    def __init__(self, path: Path):
        self.path = path

    def detect(self) -> None:
        """Override in subclass to perform detection."""
        raise NotImplementedError

    # Helper methods
    def _exists(self, relative_path: str) -> bool:
        """Check if file exists."""

    def _read_file(self, relative_path: str) -> str:
        """Read file contents."""

    def _read_json(self, relative_path: str) -> dict | None:
        """Read and parse JSON file."""

    def _glob(self, pattern: str) -> list[Path]:
        """Find files matching pattern."""
```

---

## Creating a New Detector

### Step 1: Create Detector Class

```python
# apps/backend/analysis/analyzers/context/my_detector.py
from pathlib import Path
from typing import Any
from ..base import BaseAnalyzer

class MyPatternDetector(BaseAnalyzer):
    """Detects my specific patterns."""

    KNOWN_LIBS = ["lib-a", "lib-b", "lib-c"]

    def __init__(self, path: Path, analysis: dict[str, Any]):
        super().__init__(path)
        self.analysis = analysis

    def detect(self) -> None:
        """Detect patterns and update analysis dict."""
        pattern_info = {
            "detected": False,
            "details": {}
        }

        # Detection logic
        if self._check_for_pattern():
            pattern_info["detected"] = True
            pattern_info["details"] = self._extract_details()

        if pattern_info["detected"]:
            self.analysis["my_pattern"] = pattern_info

    def _check_for_pattern(self) -> bool:
        """Check if pattern exists in project."""
        for lib in self.KNOWN_LIBS:
            if self._has_dependency(lib):
                return True
        return False

    def _has_dependency(self, lib: str) -> bool:
        """Check if library is a dependency."""
        pkg = self._read_json("package.json")
        if pkg:
            deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
            return lib in deps
        return False

    def _extract_details(self) -> dict:
        """Extract pattern-specific details."""
        return {"found_in": "package.json"}
```

### Step 2: Register Detector

```python
# apps/backend/analysis/analyzers/context/__init__.py
from .my_detector import MyPatternDetector

__all__ = [
    # ... existing detectors
    "MyPatternDetector",
]
```

### Step 3: Add to Analysis Pipeline

```python
# In the main analyzer orchestration
from analysis.analyzers.context import MyPatternDetector

def analyze_project(path: Path) -> dict:
    analysis = {}

    # Run detectors
    AuthDetector(path, analysis).detect()
    MyPatternDetector(path, analysis).detect()  # Add new detector
    # ... other detectors

    return analysis
```

---

## Usage Examples

### Full Project Analysis

```python
from pathlib import Path
from analysis.analyzers.context import (
    AuthDetector,
    ApiDocsDetector,
    EnvironmentDetector,
    JobsDetector,
    MigrationsDetector,
    MonitoringDetector,
    ServicesDetector,
)

def analyze_project(project_dir: Path) -> dict:
    """Run all detectors on a project."""
    analysis = {}

    # Run each detector
    detectors = [
        AuthDetector,
        ApiDocsDetector,
        EnvironmentDetector,
        JobsDetector,
        MigrationsDetector,
        MonitoringDetector,
        ServicesDetector,
    ]

    for detector_class in detectors:
        detector = detector_class(project_dir, analysis)
        detector.detect()

    return analysis

# Usage
result = analyze_project(Path("/path/to/project"))
print(result)
# {
#   "auth": {...},
#   "environment": {...},
#   "services": {...},
#   ...
# }
```

### Single Detector

```python
from pathlib import Path
from analysis.analyzers.context import AuthDetector

# Analyze auth patterns only
analysis = {}
AuthDetector(Path("/project"), analysis).detect()

if "auth" in analysis:
    print(f"Auth strategies: {analysis['auth']['strategies']}")
    print(f"Auth libraries: {analysis['auth']['libraries']}")
```

---

## Integration with Security

The analysis results feed into the **dynamic command allowlist** for sandboxing:

```python
# In core/security.py
def build_allowlist(analysis: dict) -> list[str]:
    """Build command allowlist based on project analysis."""
    allowlist = BASE_COMMANDS.copy()

    # Add framework-specific commands
    if "services" in analysis:
        if analysis["services"].get("containerization") == "docker":
            allowlist.extend(["docker", "docker-compose"])

    if "jobs" in analysis:
        if analysis["jobs"].get("framework") == "celery":
            allowlist.append("celery")

    if "migrations" in analysis:
        framework = analysis["migrations"].get("framework")
        if framework == "alembic":
            allowlist.append("alembic")
        elif framework == "prisma":
            allowlist.append("prisma")

    return allowlist
```

---

## Integration with Agent Prompts

Analysis results can be injected into agent prompts:

```python
def build_agent_context(analysis: dict) -> str:
    """Build context section for agent prompts."""
    context_parts = []

    if "auth" in analysis:
        auth = analysis["auth"]
        context_parts.append(f"Authentication: {', '.join(auth['strategies'])}")
        if auth.get("user_model"):
            context_parts.append(f"User model: {auth['user_model']}")

    if "services" in analysis:
        services = analysis["services"]
        context_parts.append(f"Services: {', '.join(services.get('services', []))}")

    if "monitoring" in analysis:
        mon = analysis["monitoring"]
        if mon.get("apm"):
            context_parts.append(f"APM: {', '.join(mon['apm'])}")

    return "\n".join(context_parts)
```

---

## Performance Considerations

### File Reading Limits

Detectors should limit file reads for performance:

```python
# Limit glob results
all_py_files = list(self.path.glob("**/*.py"))[:20]

# Skip large directories
SKIP_DIRS = {"node_modules", ".git", "dist", "build", "__pycache__"}
```

### Caching

Analysis results can be cached:

```python
# Cache to .auto-claude-security.json
CACHE_FILE = ".auto-claude-security.json"

def get_cached_analysis(project_dir: Path) -> dict | None:
    cache_path = project_dir / CACHE_FILE
    if cache_path.exists():
        mtime = cache_path.stat().st_mtime
        if time.time() - mtime < 3600:  # 1 hour cache
            return json.loads(cache_path.read_text())
    return None
```

---

## Output Schema

Complete analysis output structure:

```json
{
  "auth": {
    "strategies": ["jwt", "session"],
    "libraries": ["pyjwt", "flask-login"],
    "user_model": "app/models/user.py",
    "middleware": ["login_required"]
  },
  "api_docs": {
    "type": "openapi",
    "spec_file": "docs/api.yaml"
  },
  "environment": {
    "env_files": [".env", ".env.example"],
    "required_vars": ["DATABASE_URL"]
  },
  "jobs": {
    "framework": "celery",
    "task_files": ["app/tasks.py"]
  },
  "migrations": {
    "framework": "alembic",
    "migrations_dir": "alembic/versions/"
  },
  "monitoring": {
    "logging": "structlog",
    "apm": ["sentry"]
  },
  "services": {
    "containerization": "docker",
    "services": ["api", "worker", "postgres"]
  }
}
```

---

## Related Documentation

- [Backend Architecture](./architecture.md) - Overall backend structure
- [Security Model](./security.md) - How analysis feeds into sandboxing
- [Agent System](./agents.md) - How context is used in prompts
- [Ideation Module](./ideation.md) - Uses analysis for suggestions
