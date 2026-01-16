# Story 2.5: Artifact Linking and Navigation

Status: ready-for-dev

## Story

As a **Technical Founder**,
I want **the system to maintain links between artifacts and navigate between them**,
so that **I can understand how my planning documents relate to each other**.

## Acceptance Criteria

1. **AC1: Clickable Links**
   - **Given** a story artifact is displayed
   - **When** the story contains links to PRD or architecture sections
   - **Then** the links are rendered as clickable elements
   - **And** clicking a link opens the referenced artifact at that section

2. **AC2: Relationship Breadcrumb**
   - **Given** an artifact viewer is open
   - **When** the user views artifact relationships
   - **Then** a breadcrumb or relationship indicator shows: Story → Epic → PRD → Architecture
   - **And** each level is clickable for navigation

3. **AC3: Context Links in Stories**
   - **Given** a story is generated from an epic
   - **When** the story is saved
   - **Then** the story includes `Context Links` section with references
   - **And** links use format: `PRD: prd.md#section-id`

4. **AC4: Child Count Indicators**
   - **Given** the artifact panel shows the list
   - **When** an artifact has linked children
   - **Then** a visual indicator shows the relationship (e.g., epic has N stories)

## Tasks / Subtasks

- [ ] **Task 1: Implement link parsing in artifact viewer** (AC: #1)
  - [ ] 1.1: Create `parsePlanningLinks` function for markdown
  - [ ] 1.2: Detect internal artifact links: `[text](artifact.md#section)`
  - [ ] 1.3: Replace with clickable components that trigger navigation
  - [ ] 1.4: Handle section anchors (scroll to heading)

- [ ] **Task 2: Create ArtifactBreadcrumb component** (AC: #2)
  - [ ] 2.1: Create `apps/frontend/src/renderer/components/planning/ArtifactBreadcrumb.tsx`
  - [ ] 2.2: Display artifact hierarchy based on type
  - [ ] 2.3: Make each level clickable to navigate
  - [ ] 2.4: Style with chevron separators

- [ ] **Task 3: Implement artifact relationship tracking** (AC: #2, #4)
  - [ ] 3.1: Add `parentArtifact` and `childArtifacts` to artifact metadata
  - [ ] 3.2: Parse Context Links section to extract relationships
  - [ ] 3.3: Build relationship graph on artifact load
  - [ ] 3.4: Store relationship data in artifactStore

- [ ] **Task 4: Generate Context Links section in stories** (AC: #3)
  - [ ] 4.1: Modify story generation to include Context Links
  - [ ] 4.2: Link to parent epic section
  - [ ] 4.3: Link to relevant PRD requirements
  - [ ] 4.4: Link to architecture decisions

- [ ] **Task 5: Add child count indicators to ArtifactPanel** (AC: #4)
  - [ ] 5.1: Count child artifacts per parent
  - [ ] 5.2: Display badge with count (e.g., "Epics (6)")
  - [ ] 5.3: Expand/collapse story list under Epics
  - [ ] 5.4: Update count when stories are added

- [ ] **Task 6: Implement navigation actions** (AC: #1, #2)
  - [ ] 6.1: Add `navigateToArtifact` action to artifactStore
  - [ ] 6.2: Add `navigateToSection` for anchor navigation
  - [ ] 6.3: Track navigation history for back button
  - [ ] 6.4: Add keyboard shortcut for back navigation

- [ ] **Task 7: Add i18n translations** (AC: #2, #4)
  - [ ] 7.1: Add breadcrumb labels to `en/planning.json`
  - [ ] 7.2: Add breadcrumb labels to `fr/planning.json`
  - [ ] 7.3: Add child count format strings

- [ ] **Task 8: Write tests** (AC: all)
  - [ ] 8.1: Unit tests for link parsing
  - [ ] 8.2: Unit tests for relationship graph building
  - [ ] 8.3: Component tests for breadcrumb navigation
  - [ ] 8.4: Test section anchor scrolling

## Dev Notes

### Critical Implementation Rules

1. **Link Format Consistency**: Use `artifact.md#section-id` format
2. **i18n Required**: All breadcrumb labels via translations
3. **Graceful Handling**: Invalid links should not break rendering
4. **Performance**: Relationship graph built lazily, cached

### Artifact Hierarchy

```
Architecture
    └── PRD
        └── Epics
            └── Stories
```

Each artifact type can reference artifacts above it in the hierarchy.

### Link Parsing Pattern

```typescript
// linkParser.ts
interface PlanningLink {
  text: string;
  artifact: string;
  section?: string;
}

const PLANNING_LINK_REGEX = /\[([^\]]+)\]\(([^)#]+)(?:#([^)]+))?\)/g;

export function parsePlanningLinks(content: string): PlanningLink[] {
  const links: PlanningLink[] = [];
  let match;

  while ((match = PLANNING_LINK_REGEX.exec(content)) !== null) {
    const [, text, artifact, section] = match;
    // Only parse internal planning links (not external URLs)
    if (!artifact.startsWith('http') && artifact.endsWith('.md')) {
      links.push({ text, artifact, section });
    }
  }

  return links;
}

export function renderMarkdownWithPlanningLinks(
  content: string,
  onNavigate: (artifact: string, section?: string) => void
): React.ReactNode {
  // Replace planning links with clickable components
  // while preserving other markdown rendering
}
```

### ArtifactBreadcrumb Component

```tsx
// ArtifactBreadcrumb.tsx
import { useTranslation } from 'react-i18next';
import { useArtifactStore } from '../../stores/planning/artifactStore';
import { ChevronRight } from 'lucide-react';

const HIERARCHY_ORDER = ['architecture', 'prd', 'epics', 'stories'];

export const ArtifactBreadcrumb: React.FC = () => {
  const { t } = useTranslation(['planning']);
  const { selectedArtifact, artifacts, navigateToArtifact } = useArtifactStore();

  if (!selectedArtifact) return null;

  // Build breadcrumb path based on artifact type
  const currentIndex = HIERARCHY_ORDER.indexOf(selectedArtifact.type);
  const breadcrumbItems = HIERARCHY_ORDER
    .slice(0, currentIndex + 1)
    .map(type => artifacts.find(a => a.type === type))
    .filter(Boolean);

  return (
    <nav aria-label={t('planning:breadcrumb.ariaLabel')} className="flex items-center gap-1 text-sm">
      {breadcrumbItems.map((artifact, index) => (
        <React.Fragment key={artifact!.id}>
          {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <button
            onClick={() => navigateToArtifact(artifact!.id)}
            className={cn(
              'px-2 py-1 rounded hover:bg-muted',
              artifact!.id === selectedArtifact.id
                ? 'font-medium text-foreground'
                : 'text-muted-foreground'
            )}
          >
            {t(`planning:artifactTypes.${artifact!.type}`)}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
};
```

### Context Links Section Format

Stories should include a Context Links section:

```markdown
## Context Links

- **Epic**: [Epic 1: Planning Session Foundation](epics.md#epic-1-planning-session-foundation)
- **PRD Requirements**: [FR1](prd.md#fr1), [FR2](prd.md#fr2)
- **Architecture**: [Session Storage](architecture.md#session--storage-architecture)
```

### Relationship Graph in Store

```typescript
// artifactStore.ts additions
interface ArtifactRelationships {
  parentId: string | null;
  childIds: string[];
}

interface ArtifactState {
  // ... existing
  relationships: Map<string, ArtifactRelationships>;
  navigationHistory: string[];

  buildRelationshipGraph: () => void;
  navigateToArtifact: (id: string, section?: string) => void;
  navigateBack: () => void;
}

export const useArtifactStore = create<ArtifactState>((set, get) => ({
  relationships: new Map(),
  navigationHistory: [],

  buildRelationshipGraph: () => {
    const { artifacts } = get();
    const relationships = new Map<string, ArtifactRelationships>();

    // Parse Context Links from each artifact to build graph
    artifacts.forEach(artifact => {
      const links = parsePlanningLinks(artifact.content ?? '');
      const parentLinks = links.filter(l => isParentArtifact(l.artifact, artifact.type));

      relationships.set(artifact.id, {
        parentId: parentLinks[0]?.artifact ?? null,
        childIds: [],
      });
    });

    // Build child relationships
    relationships.forEach((rel, id) => {
      if (rel.parentId) {
        const parentRel = relationships.get(rel.parentId);
        if (parentRel) {
          parentRel.childIds.push(id);
        }
      }
    });

    set({ relationships });
  },

  navigateToArtifact: (id, section) => {
    const { selectedArtifact, navigationHistory } = get();
    if (selectedArtifact) {
      set({ navigationHistory: [...navigationHistory, selectedArtifact.id] });
    }
    set({ selectedArtifact: get().artifacts.find(a => a.id === id) ?? null });

    if (section) {
      // Scroll to section after render
      setTimeout(() => {
        const element = document.getElementById(section);
        element?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  },

  navigateBack: () => {
    const { navigationHistory } = get();
    if (navigationHistory.length > 0) {
      const previousId = navigationHistory[navigationHistory.length - 1];
      set({
        selectedArtifact: get().artifacts.find(a => a.id === previousId) ?? null,
        navigationHistory: navigationHistory.slice(0, -1),
      });
    }
  },
}));
```

### Child Count in ArtifactPanel

```tsx
// In ArtifactPanel.tsx
const ArtifactListItem: React.FC<{ artifact: Artifact }> = ({ artifact }) => {
  const { relationships } = useArtifactStore();
  const childCount = relationships.get(artifact.id)?.childIds.length ?? 0;

  return (
    <button className="...">
      <FileText className="h-4 w-4" />
      <span className="flex-1">{artifact.title}</span>
      {childCount > 0 && (
        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
          {childCount}
        </span>
      )}
    </button>
  );
};
```

### i18n Keys

```json
// en/planning.json
{
  "breadcrumb": {
    "ariaLabel": "Artifact navigation"
  },
  "artifactTypes": {
    "product-brief": "Brief",
    "prd": "PRD",
    "architecture": "Architecture",
    "epics": "Epics",
    "stories": "Stories"
  },
  "links": {
    "contextLinks": "Context Links",
    "epic": "Epic",
    "prdRequirements": "PRD Requirements",
    "architecture": "Architecture"
  }
}

// fr/planning.json
{
  "breadcrumb": {
    "ariaLabel": "Navigation des artefacts"
  },
  "artifactTypes": {
    "product-brief": "Brief",
    "prd": "PRD",
    "architecture": "Architecture",
    "epics": "Epics",
    "stories": "Stories"
  },
  "links": {
    "contextLinks": "Liens de contexte",
    "epic": "Epic",
    "prdRequirements": "Exigences PRD",
    "architecture": "Architecture"
  }
}
```

### Project Structure Notes

**New files to create:**
- `apps/frontend/src/renderer/components/planning/ArtifactBreadcrumb.tsx`
- `apps/frontend/src/renderer/utils/linkParser.ts`

**Existing files to modify:**
- `apps/frontend/src/renderer/components/planning/ArtifactViewer.tsx` - Add link handling
- `apps/frontend/src/renderer/components/planning/ArtifactPanel.tsx` - Add child counts
- `apps/frontend/src/renderer/stores/planning/artifactStore.ts` - Add relationships
- `apps/backend/planning/artifact_manager.py` - Generate Context Links

### References

- [Source: architecture.md#story-file-format] - Story file format with Context Links
- [Source: architecture.md#context-inheritance] - Artifact linking pattern

### Test Scope

**Unit** - This story focuses on:
- Link parsing accuracy
- Relationship graph building
- Navigation state management
- Section anchor scrolling

### Performance Requirements

- Link parsing < 50ms for large documents
- Relationship graph builds on initial load, cached thereafter
- Navigation is instant (no network calls)

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### File List
