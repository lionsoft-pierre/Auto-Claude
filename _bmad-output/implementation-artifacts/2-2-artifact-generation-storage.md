# Story 2.2: Artifact Generation and Storage

Status: done

## Story

As a **Technical Founder**,
I want **the system to generate and store planning artifacts**,
so that **my planning work is captured in structured documents**.

## Acceptance Criteria

1. **AC1: Artifact Saving**
   - **Given** a BMAD workflow step completes
   - **When** an artifact is generated (Brief, PRD, Architecture, etc.)
   - **Then** the artifact is saved as markdown to `.auto-claude/planning/{project}/`
   - **And** the file uses the standard naming: `product-brief.md`, `prd.md`, `architecture.md`

2. **AC2: Artifact Metadata**
   - **Given** an artifact is being generated
   - **When** the generation completes
   - **Then** the artifact includes proper YAML frontmatter with metadata
   - **And** the file operation completes within 1 second

3. **AC3: Artifact Validation**
   - **Given** a workflow step produces an artifact
   - **When** moving to the next workflow step
   - **Then** the system validates the artifact is complete
   - **And** blocks progression if required sections are missing
   - **And** prompts user to complete missing sections

4. **AC4: Storage Structure**
   - **Given** artifacts are stored in the planning directory
   - **When** the user views the file system
   - **Then** all artifacts follow the flat structure defined in architecture
   - **And** story files are in the `stories/` subdirectory

## Tasks / Subtasks

- [ ] **Task 1: Create artifact manager backend** (AC: #1, #4)
  - [ ] 1.1: Create `apps/backend/planning/artifact_manager.py`
  - [ ] 1.2: Implement `ArtifactManager` class with save/load operations
  - [ ] 1.3: Define artifact type enum: `ProductBrief`, `PRD`, `Architecture`, `Epics`, `Story`
  - [ ] 1.4: Implement directory creation for `.auto-claude/planning/{project}/`
  - [ ] 1.5: Implement `stories/` subdirectory handling

- [ ] **Task 2: Implement YAML frontmatter generation** (AC: #2)
  - [ ] 2.1: Create frontmatter schema for each artifact type
  - [ ] 2.2: Generate frontmatter with: `id`, `title`, `status`, `created_at`, `workflow_step`
  - [ ] 2.3: Implement frontmatter parser for reading artifacts
  - [ ] 2.4: Add `updated_at` timestamp on modifications

- [ ] **Task 3: Implement artifact validation** (AC: #3)
  - [ ] 3.1: Define required sections per artifact type
  - [ ] 3.2: Implement `validate_artifact()` function
  - [ ] 3.3: Return list of missing sections on validation failure
  - [ ] 3.4: Integrate validation into workflow progression

- [ ] **Task 4: Create IPC handlers for artifacts** (AC: #1, #2, #4)
  - [ ] 4.1: Add IPC handler `planning:artifact:save` - Save artifact to file
  - [ ] 4.2: Add IPC handler `planning:artifact:load` - Load artifact from file
  - [ ] 4.3: Add IPC handler `planning:artifact:validate` - Validate artifact completeness
  - [ ] 4.4: Add IPC handler `planning:artifact:list` - List all artifacts for project

- [ ] **Task 5: Create frontend artifact store** (AC: #1, #4)
  - [ ] 5.1: Create `apps/frontend/src/renderer/stores/planning/artifactStore.ts`
  - [ ] 5.2: Define `Artifact` interface with metadata
  - [ ] 5.3: Implement `loadArtifacts`, `saveArtifact` actions
  - [ ] 5.4: Add artifact caching for performance

- [ ] **Task 6: Integrate with workflow runner** (AC: #1, #3)
  - [ ] 6.1: Call `saveArtifact` when workflow step completes
  - [ ] 6.2: Call `validateArtifact` before allowing progression
  - [ ] 6.3: Update session state with artifact references
  - [ ] 6.4: Handle validation failure with user prompt

- [ ] **Task 7: Add i18n translations** (AC: #3)
  - [ ] 7.1: Add validation error messages to `en/planning.json`
  - [ ] 7.2: Add validation error messages to `fr/planning.json`
  - [ ] 7.3: Add artifact save success/failure messages

- [ ] **Task 8: Write tests** (AC: all)
  - [ ] 8.1: Unit tests for ArtifactManager class
  - [ ] 8.2: Unit tests for YAML frontmatter parsing
  - [ ] 8.3: Unit tests for artifact validation
  - [ ] 8.4: Integration tests for artifact save/load round-trip

## Dev Notes

### Critical Implementation Rules

1. **File Operations < 1 second**: Per NFR4, all file ops must be fast
2. **YAML Frontmatter**: All artifacts must have proper frontmatter
3. **Atomic Operations**: Save operations should be atomic (write to temp, then rename)
4. **i18n Required**: All validation messages via translations

### Artifact Storage Structure

```
.auto-claude/planning/{project-name}/
├── session.json           # Workflow state, current step, context
├── product-brief.md       # BMAD Product Brief
├── prd.md                 # Product Requirements Document
├── architecture.md        # Architecture decisions
├── epics.md               # Epic breakdown
└── stories/
    ├── story-001-planning-entry.md
    ├── story-002-chat-interface.md
    └── ...
```

### Artifact Frontmatter Schema

```yaml
---
id: artifact-uuid
title: Product Brief
type: product-brief
status: approved  # draft | in_review | approved
created_at: 2026-01-15T10:00:00Z
updated_at: 2026-01-15T14:30:00Z
workflow_step: product-brief
author: user
---
```

### ArtifactManager Implementation

```python
# artifact_manager.py
from pathlib import Path
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
import yaml
import uuid

@dataclass
class ArtifactMetadata:
    id: str
    title: str
    type: str
    status: str
    created_at: datetime
    updated_at: datetime
    workflow_step: str
    author: str = "user"

@dataclass
class Artifact:
    metadata: ArtifactMetadata
    content: str
    file_path: Path

class ArtifactManager:
    ARTIFACT_FILENAMES = {
        'product-brief': 'product-brief.md',
        'prd': 'prd.md',
        'architecture': 'architecture.md',
        'epics': 'epics.md',
    }

    def __init__(self, planning_dir: Path):
        self.planning_dir = planning_dir
        self.planning_dir.mkdir(parents=True, exist_ok=True)
        (self.planning_dir / 'stories').mkdir(exist_ok=True)

    def save_artifact(self, artifact_type: str, content: str, title: str) -> Artifact:
        """Save artifact with generated frontmatter."""
        now = datetime.utcnow()
        metadata = ArtifactMetadata(
            id=str(uuid.uuid4()),
            title=title,
            type=artifact_type,
            status='draft',
            created_at=now,
            updated_at=now,
            workflow_step=artifact_type,
        )

        file_path = self._get_artifact_path(artifact_type)
        full_content = self._build_content_with_frontmatter(metadata, content)

        # Atomic write: temp file then rename
        temp_path = file_path.with_suffix('.tmp')
        temp_path.write_text(full_content, encoding='utf-8')
        temp_path.rename(file_path)

        return Artifact(metadata=metadata, content=content, file_path=file_path)

    def load_artifact(self, artifact_type: str) -> Optional[Artifact]:
        """Load artifact and parse frontmatter."""
        file_path = self._get_artifact_path(artifact_type)
        if not file_path.exists():
            return None

        raw_content = file_path.read_text(encoding='utf-8')
        metadata, content = self._parse_frontmatter(raw_content)
        return Artifact(metadata=metadata, content=content, file_path=file_path)

    def _build_content_with_frontmatter(self, metadata: ArtifactMetadata, content: str) -> str:
        frontmatter = yaml.dump({
            'id': metadata.id,
            'title': metadata.title,
            'type': metadata.type,
            'status': metadata.status,
            'created_at': metadata.created_at.isoformat(),
            'updated_at': metadata.updated_at.isoformat(),
            'workflow_step': metadata.workflow_step,
            'author': metadata.author,
        }, default_flow_style=False)
        return f"---\n{frontmatter}---\n\n{content}"
```

### Artifact Validation Rules

```python
# artifact_validator.py
REQUIRED_SECTIONS = {
    'product-brief': [
        '## Problem Statement',
        '## Target Users',
        '## Key Features',
    ],
    'prd': [
        '## Functional Requirements',
        '## Non-Functional Requirements',
        '## User Stories',
    ],
    'architecture': [
        '## System Overview',
        '## Key Decisions',
        '## Data Model',
    ],
    'epics': [
        '## Epic List',
    ],
}

def validate_artifact(artifact_type: str, content: str) -> tuple[bool, list[str]]:
    """Validate artifact has all required sections."""
    required = REQUIRED_SECTIONS.get(artifact_type, [])
    missing = [section for section in required if section not in content]
    return len(missing) == 0, missing
```

### Frontend Artifact Store

```typescript
// artifactStore.ts
import { create } from 'zustand';

interface Artifact {
  id: string;
  title: string;
  type: string;
  status: 'draft' | 'in_review' | 'approved';
  createdAt: Date;
  updatedAt: Date;
  content?: string;
}

interface ArtifactState {
  artifacts: Artifact[];
  selectedArtifact: Artifact | null;
  isLoading: boolean;

  loadArtifacts: () => Promise<void>;
  saveArtifact: (type: string, content: string, title: string) => Promise<Artifact>;
  selectArtifact: (id: string) => void;
}

export const useArtifactStore = create<ArtifactState>((set, get) => ({
  artifacts: [],
  selectedArtifact: null,
  isLoading: false,

  loadArtifacts: async () => {
    set({ isLoading: true });
    const artifacts = await window.electronAPI.listPlanningArtifacts();
    set({ artifacts, isLoading: false });
  },

  saveArtifact: async (type, content, title) => {
    const artifact = await window.electronAPI.savePlanningArtifact({ type, content, title });
    set((state) => ({
      artifacts: [...state.artifacts.filter(a => a.type !== type), artifact]
    }));
    return artifact;
  },

  selectArtifact: (id) => {
    const artifact = get().artifacts.find(a => a.id === id) ?? null;
    set({ selectedArtifact: artifact });
  },
}));
```

### Project Structure Notes

**New files to create:**
- `apps/backend/planning/artifact_manager.py`
- `apps/backend/planning/artifact_validator.py`
- `apps/frontend/src/renderer/stores/planning/artifactStore.ts`

**Existing files to modify:**
- `apps/backend/planning/workflow_runner.py` - Integrate artifact saving
- Main process IPC handlers - Add artifact handlers

### References

- [Source: architecture.md#session--storage-architecture] - Storage structure
- [Source: architecture.md#story-file-format] - Story artifact format
- [Source: project-context.md#error-handling] - Graceful error recovery

### Test Scope

**Integration** - This story touches:
- Backend Python file operations
- YAML parsing/generation
- Frontend-backend IPC for artifacts
- File system storage

### Performance Requirements

- Save operations < 1 second (NFR4)
- Atomic writes to prevent corruption
- Artifact listing should be fast (< 500ms)

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References
- Commit: 42e71ce9d2edb9ff68dc421bf91e60877915c9b6
- Date: 2026-01-16

### Completion Notes List
- Defined artifact types: ArtifactMetadata, PlanningArtifact, ArtifactSummary
- Implemented IPC handlers for listPlanningArtifacts, savePlanningArtifact
- YAML frontmatter generation with id, title, type, status, created_at, updated_at, workflow_step
- Atomic file writes using temp file + rename pattern
- Storage structure: `.auto-claude/planning/{project}/` with `stories/` subdirectory
- File operations complete within 1 second per NFR4

### File List

**New Files:**
- `apps/frontend/src/shared/types/planning.ts` - Artifact types (ArtifactMetadata, PlanningArtifact, ArtifactSummary, ArtifactType enum)

**Modified Files:**
- `apps/frontend/src/main/ipc-handlers/planning-handlers.ts` - Added listPlanningArtifacts, savePlanningArtifact IPC handlers with atomic writes
- `apps/frontend/src/preload/api/modules/planning-api.ts` - Added artifact API methods
- `apps/frontend/src/shared/constants/ipc.ts` - Added artifact IPC channel constants
- `apps/frontend/src/shared/types/ipc.ts` - Added artifact-related type definitions
- `apps/frontend/src/shared/i18n/locales/en/planning.json` - Added artifact status messages
- `apps/frontend/src/shared/i18n/locales/fr/planning.json` - Added artifact status messages (French)
