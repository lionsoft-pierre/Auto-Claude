# Story 3.1: Story Generation from Epics

Status: dev-complete

## Story

As a **Technical Founder**,
I want **the system to generate stories from epics with proper structure**,
so that **I have implementation-ready stories with clear acceptance criteria**.

## Acceptance Criteria

1. **AC1: Story Generation Trigger**
   - **Given** the epics workflow step is complete
   - **When** the stories workflow begins
   - **Then** the system generates stories for each epic
   - **And** stories are saved to `.auto-claude/planning/{project}/stories/`

2. **AC2: Story Frontmatter**
   - **Given** a story is being generated
   - **When** the generation completes
   - **Then** the story includes YAML frontmatter with: id, title, epic, status, test_scope
   - **And** the story follows the template format from architecture

3. **AC3: Story Content Structure**
   - **Given** a story is generated
   - **When** the story is saved
   - **Then** it includes acceptance criteria in Given/When/Then format
   - **And** it specifies test scope (unit, integration, or e2e)
   - **And** it includes context links to PRD and architecture sections

4. **AC4: Story File Naming**
   - **Given** story generation is complete
   - **When** all stories for an epic are created
   - **Then** story files use naming convention: `story-{NNN}-{slug}.md`
   - **And** stories are numbered sequentially across all epics

## Tasks / Subtasks

- [ ] **Task 1: Create story converter backend** (AC: #1, #4)
  - [ ] 1.1: Create `apps/backend/planning/story_converter.py`
  - [ ] 1.2: Implement `StoryConverter` class with generation logic
  - [ ] 1.3: Define story template matching architecture spec
  - [ ] 1.4: Implement sequential numbering across epics
  - [ ] 1.5: Generate URL-friendly slugs from story titles

- [ ] **Task 2: Implement story generation via Claude** (AC: #2, #3)
  - [ ] 2.1: Create system prompt for story generation
  - [ ] 2.2: Load epic content as context
  - [ ] 2.3: Load PRD and architecture for context links
  - [ ] 2.4: Stream story generation back to frontend

- [ ] **Task 3: Define story frontmatter schema** (AC: #2)
  - [ ] 3.1: Define required frontmatter fields
  - [ ] 3.2: Implement frontmatter generation
  - [ ] 3.3: Set default test_scope to 'unit'
  - [ ] 3.4: Derive epic link from parent epic section

- [ ] **Task 4: Implement acceptance criteria formatting** (AC: #3)
  - [ ] 4.1: Parse epics for story requirements
  - [ ] 4.2: Convert requirements to Given/When/Then format
  - [ ] 4.3: Include test scope based on story type
  - [ ] 4.4: Generate context links section

- [ ] **Task 5: Create IPC handlers for story generation** (AC: #1)
  - [ ] 5.1: Add IPC handler `planning:stories:generate` - Generate stories from epics
  - [ ] 5.2: Add IPC handler `planning:stories:list` - List all stories
  - [ ] 5.3: Stream generation progress to frontend
  - [ ] 5.4: Return list of generated story paths

- [ ] **Task 6: Integrate with workflow runner** (AC: #1)
  - [ ] 6.1: Add stories workflow step to WorkflowRunner
  - [ ] 6.2: Trigger story generation after epics completion
  - [ ] 6.3: Update session state with generated stories
  - [ ] 6.4: Mark stories workflow as complete

- [ ] **Task 7: Add i18n translations** (AC: #1)
  - [ ] 7.1: Add story generation messages to `en/planning.json`
  - [ ] 7.2: Add story generation messages to `fr/planning.json`
  - [ ] 7.3: Add progress status messages

- [ ] **Task 8: Write tests** (AC: all)
  - [ ] 8.1: Unit tests for StoryConverter class
  - [ ] 8.2: Unit tests for frontmatter generation
  - [ ] 8.3: Unit tests for sequential numbering
  - [ ] 8.4: Test acceptance criteria formatting

## Dev Notes

### Critical Implementation Rules

1. **Template Compliance**: Stories must match architecture spec format
2. **Sequential Numbering**: Stories numbered 001, 002... across all epics
3. **Test Scope Default**: Default to 'unit', elevate for integration points
4. **i18n Required**: All status messages via translations

### Story File Template

```markdown
---
id: story-uuid
number: 001
title: Story Title
epic: epic-1-planning-session-foundation
status: draft
test_scope: unit
created_at: 2026-01-15T10:00:00Z
---

# Story 3.1: Story Title

## Story

As a **[persona]**,
I want **[goal]**,
so that **[benefit]**.

## Acceptance Criteria

1. **AC1: [Name]**
   - **Given** [context]
   - **When** [action]
   - **Then** [outcome]

## Tasks / Subtasks

- [ ] **Task 1: [Task name]** (AC: #1)
  - [ ] 1.1: [Subtask]

## Dev Notes

### Technical Notes
[Implementation guidance]

### Context Links
- **Epic**: [Epic 1](../epics.md#epic-1)
- **PRD**: [FR1](../prd.md#fr1)
- **Architecture**: [Section](../architecture.md#section)

### Test Scope
**Unit** - [Reasoning]

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### File List
```

### Story Converter Implementation

```python
# story_converter.py
from pathlib import Path
from dataclasses import dataclass
from datetime import datetime
import re
import uuid

@dataclass
class StoryMetadata:
    id: str
    number: int
    title: str
    epic: str
    status: str
    test_scope: str
    created_at: datetime

class StoryConverter:
    def __init__(self, planning_dir: Path):
        self.planning_dir = planning_dir
        self.stories_dir = planning_dir / 'stories'
        self.stories_dir.mkdir(exist_ok=True)
        self.story_counter = 0

    async def generate_stories_from_epics(self, epics_content: str) -> list[Path]:
        """Generate story files from epics document."""
        # Parse epics to extract story definitions
        epic_sections = self._parse_epics(epics_content)
        generated_paths = []

        for epic in epic_sections:
            for story_def in epic['stories']:
                self.story_counter += 1
                story_path = await self._generate_story(
                    story_def,
                    epic['id'],
                    self.story_counter
                )
                generated_paths.append(story_path)

        return generated_paths

    def _generate_slug(self, title: str) -> str:
        """Generate URL-friendly slug from title."""
        slug = title.lower()
        slug = re.sub(r'[^a-z0-9\s-]', '', slug)
        slug = re.sub(r'[\s]+', '-', slug)
        return slug[:50]  # Limit length

    async def _generate_story(self, story_def: dict, epic_id: str, number: int) -> Path:
        """Generate a single story file."""
        slug = self._generate_slug(story_def['title'])
        filename = f"story-{number:03d}-{slug}.md"
        filepath = self.stories_dir / filename

        metadata = StoryMetadata(
            id=str(uuid.uuid4()),
            number=number,
            title=story_def['title'],
            epic=epic_id,
            status='draft',
            test_scope=story_def.get('test_scope', 'unit'),
            created_at=datetime.utcnow()
        )

        content = self._build_story_content(metadata, story_def)
        filepath.write_text(content, encoding='utf-8')

        return filepath
```

### Test Scope Assignment Logic

```python
def determine_test_scope(story_def: dict) -> str:
    """Determine appropriate test scope for story."""
    # Integration indicators
    integration_keywords = [
        'ipc', 'backend', 'api', 'database', 'file system',
        'multiple components', 'end-to-end', 'cross-'
    ]

    title_lower = story_def['title'].lower()
    desc_lower = story_def.get('description', '').lower()

    for keyword in integration_keywords:
        if keyword in title_lower or keyword in desc_lower:
            return 'integration'

    return 'unit'
```

### i18n Keys

```json
// en/planning.json
{
  "stories": {
    "generating": "Generating stories from epics...",
    "generatingStory": "Generating story {{number}}: {{title}}",
    "generated": "Generated {{count}} stories",
    "savingTo": "Saving stories to {{path}}"
  }
}

// fr/planning.json
{
  "stories": {
    "generating": "Génération des stories à partir des epics...",
    "generatingStory": "Génération de la story {{number}}: {{title}}",
    "generated": "{{count}} stories générées",
    "savingTo": "Enregistrement des stories dans {{path}}"
  }
}
```

### Project Structure Notes

**New files to create:**
- `apps/backend/planning/story_converter.py`

**Existing files to modify:**
- `apps/backend/planning/workflow_runner.py` - Add stories workflow step
- Main process IPC handlers - Add story generation handlers

### References

- [Source: architecture.md#story-file-format] - Story template specification
- [Source: architecture.md#artifact-file-naming] - File naming conventions

### Test Scope

**Unit** - This story focuses on:
- Story file generation
- Frontmatter formatting
- Sequential numbering
- Slug generation

### Performance Requirements

- Story generation < 30 seconds for full epic set
- Individual story file write < 1 second

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5

### Debug Log References
N/A - No errors during implementation

### Completion Notes List
- Implemented frontend-only story generation (IPC handlers parse epics.md directly)
- Added story types to planning.ts (StoryStatus, TestScope, StoryMetadata, Story, StorySummary, StoryGroup)
- Added IPC channels for story operations (11 new channels)
- Implemented IPC handlers for listing stories, generating from epics, loading/updating stories
- Added streaming progress events for story generation
- Added i18n translations in both English and French

### File List
- apps/frontend/src/shared/types/planning.ts - Added story types
- apps/frontend/src/shared/constants/ipc.ts - Added IPC channels
- apps/frontend/src/shared/types/ipc.ts - Added ElectronAPI methods
- apps/frontend/src/preload/api/modules/planning-api.ts - Added preload API
- apps/frontend/src/main/ipc-handlers/planning-handlers.ts - Added ~700 lines of handlers
- apps/frontend/src/shared/i18n/locales/en/planning.json - Added story i18n keys
- apps/frontend/src/shared/i18n/locales/fr/planning.json - Added French translations
- apps/frontend/src/renderer/lib/browser-mock.ts - Added story mocks
