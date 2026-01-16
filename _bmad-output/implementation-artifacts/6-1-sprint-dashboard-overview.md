# Story 6.1: Sprint Dashboard Overview

Status: ready-for-dev

## Story

As a **Technical Founder**,
I want **to view a sprint dashboard showing overall status**,
so that **I can quickly see results in the morning**.

## Acceptance Criteria

1. **AC1: Dashboard Overview**
   - **Given** a sprint has been executed
   - **When** the user opens the Sprint Dashboard
   - **Then** an overview shows: completed count, failed count, pending count
   - **And** the dashboard loads within 2 seconds

2. **AC2: Progress Summary**
   - **Given** the sprint dashboard is displayed
   - **When** viewing the summary
   - **Then** overall progress is shown (e.g., "8 of 12 stories completed")
   - **And** a visual progress bar or chart is displayed

3. **AC3: Story Grouping**
   - **Given** the sprint dashboard is displayed
   - **When** the user views the story list
   - **Then** stories are grouped by status: Completed, Failed, Pending
   - **And** each story shows its title and brief status

4. **AC4: Real-time Updates**
   - **Given** the dashboard shows sprint results
   - **When** new execution results arrive
   - **Then** the dashboard updates without full page reload
   - **And** real-time status is reflected

## Tasks / Subtasks

- [ ] **Task 1: Create SprintDashboard component** (AC: #1, #2)
  - [ ] 1.1: Create `apps/frontend/src/renderer/components/planning/SprintDashboard.tsx`
  - [ ] 1.2: Display summary stats: completed, failed, pending, skipped
  - [ ] 1.3: Add progress bar showing completion percentage
  - [ ] 1.4: Show sprint name, dates, and duration

- [ ] **Task 2: Create DashboardStats component** (AC: #1)
  - [ ] 2.1: Create stats cards for each status
  - [ ] 2.2: Display count with appropriate colors
  - [ ] 2.3: Add icons for visual distinction
  - [ ] 2.4: Make cards clickable to filter story list

- [ ] **Task 3: Create StoryStatusList component** (AC: #3)
  - [ ] 3.1: Group stories by status (Completed, Failed, Pending, Skipped)
  - [ ] 3.2: Display collapsible sections per status
  - [ ] 3.3: Show story title, duration, and brief result
  - [ ] 3.4: Add expand to show more details

- [ ] **Task 4: Implement real-time updates** (AC: #4)
  - [ ] 4.1: Subscribe to execution status events
  - [ ] 4.2: Poll execution-status.json for updates
  - [ ] 4.3: Update dashboard state on changes
  - [ ] 4.4: Add subtle animation for status changes

- [ ] **Task 5: Create dashboard view routing** (AC: #1)
  - [ ] 5.1: Add dashboard route to Planning view
  - [ ] 5.2: Add navigation from sprint list to dashboard
  - [ ] 5.3: Support deep linking to specific sprint
  - [ ] 5.4: Add back navigation to sprint list

- [ ] **Task 6: Add IPC handlers for dashboard data** (AC: #1, #4)
  - [ ] 6.1: Add IPC handler `planning:dashboard:get` - Get dashboard data
  - [ ] 6.2: Add IPC event `planning:dashboard:update` - Status updates
  - [ ] 6.3: Calculate stats from sprint-queue.json

- [ ] **Task 7: Add i18n translations** (AC: #1, #2, #3)
  - [ ] 7.1: Add dashboard labels to `en/planning.json`
  - [ ] 7.2: Add dashboard labels to `fr/planning.json`
  - [ ] 7.3: Add status group headers

- [ ] **Task 8: Write tests** (AC: all)
  - [ ] 8.1: Component tests for SprintDashboard
  - [ ] 8.2: Unit tests for stats calculation
  - [ ] 8.3: Test real-time update handling
  - [ ] 8.4: Test performance (< 2s load)

## Dev Notes

### Critical Implementation Rules

1. **Fast Load**: Dashboard loads < 2 seconds (NFR2)
2. **Real-time**: Updates reflect immediately during execution
3. **i18n Required**: All labels via translations
4. **Accessibility**: Progress bars have aria labels

### Dashboard Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Sprint Dashboard: Sprint 1 - Core Planning                   │
│ Started: Jan 15, 2026 10:00 PM | Completed: Jan 16, 8:00 AM  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐            │
│  │   8    │  │   2    │  │   1    │  │   1    │            │
│  │Completed│  │ Failed │  │Pending │  │Skipped │            │
│  └────────┘  └────────┘  └────────┘  └────────┘            │
│                                                              │
│  Progress: 10 of 12 attempted                                │
│  ████████████████████████░░░░  83%                          │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ ▼ Completed (8)                                              │
│   ✓ Story 1.1: Planning Mode Entry Point        12m 34s     │
│   ✓ Story 1.2: Planning Chat Interface          8m 45s      │
│   ...                                                        │
│                                                              │
│ ▼ Failed (2)                                                 │
│   ✗ Story 2.3: Artifact Review           [View Details]     │
│   ✗ Story 3.1: Story Generation          [View Details]     │
│                                                              │
│ ▶ Pending (1)                                                │
│ ▶ Skipped (1)                                                │
└──────────────────────────────────────────────────────────────┘
```

### SprintDashboard Component

```tsx
// SprintDashboard.tsx
import { useTranslation } from 'react-i18next';
import { useSprintStore } from '../../stores/planning/sprintStore';
import { useEffect, useState } from 'react';
import { Progress } from '@/shared/components/ui/progress';

interface Props {
  sprintId: string;
}

export const SprintDashboard: React.FC<Props> = ({ sprintId }) => {
  const { t } = useTranslation(['planning']);
  const { sprints, assignments } = useSprintStore();
  const sprint = sprints.find(s => s.id === sprintId);
  const sprintAssignments = assignments.filter(a => a.sprintId === sprintId);

  const stats = useMemo(() => ({
    completed: sprintAssignments.filter(a => a.status === 'completed').length,
    failed: sprintAssignments.filter(a => a.status === 'failed').length,
    pending: sprintAssignments.filter(a => a.status === 'pending').length,
    skipped: sprintAssignments.filter(a => a.status === 'skipped').length,
    inProgress: sprintAssignments.filter(a => a.status === 'in_progress').length,
    total: sprintAssignments.length,
  }), [sprintAssignments]);

  const attempted = stats.completed + stats.failed + stats.skipped;
  const progress = stats.total > 0 ? (attempted / stats.total) * 100 : 0;

  if (!sprint) {
    return <div>{t('planning:dashboard.notFound')}</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{sprint.name}</h1>
        <p className="text-muted-foreground">
          {sprint.startedAt && (
            <span>{t('planning:dashboard.started', { date: formatDate(sprint.startedAt) })}</span>
          )}
          {sprint.completedAt && (
            <span> | {t('planning:dashboard.completed', { date: formatDate(sprint.completedAt) })}</span>
          )}
        </p>
      </div>

      {/* Stats Cards */}
      <DashboardStats stats={stats} />

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>{t('planning:dashboard.progress', { attempted, total: stats.total })}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>

      {/* Story Lists by Status */}
      <StoryStatusList assignments={sprintAssignments} />
    </div>
  );
};
```

### DashboardStats Component

```tsx
// DashboardStats.tsx
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Clock, SkipForward } from 'lucide-react';

interface Stats {
  completed: number;
  failed: number;
  pending: number;
  skipped: number;
}

const STAT_CONFIG = {
  completed: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
  failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
  pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  skipped: { icon: SkipForward, color: 'text-gray-500', bg: 'bg-gray-50' },
};

export const DashboardStats: React.FC<{ stats: Stats }> = ({ stats }) => {
  const { t } = useTranslation(['planning']);

  return (
    <div className="grid grid-cols-4 gap-4">
      {Object.entries(stats).map(([key, value]) => {
        const config = STAT_CONFIG[key as keyof typeof STAT_CONFIG];
        if (!config) return null;
        const Icon = config.icon;

        return (
          <div
            key={key}
            className={cn('p-4 rounded-lg text-center', config.bg)}
          >
            <Icon className={cn('h-8 w-8 mx-auto mb-2', config.color)} />
            <div className="text-3xl font-bold">{value}</div>
            <div className="text-sm text-muted-foreground">
              {t(`planning:dashboard.${key}`)}
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

### Real-time Update Subscription

```typescript
// In SprintDashboard
useEffect(() => {
  // Poll for updates during active execution
  if (sprint?.status === 'in_progress') {
    const interval = setInterval(async () => {
      const status = await window.electronAPI.getExecutionStatus();
      if (status.sprintId === sprintId) {
        // Refresh assignments
        await loadAssignments();
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }
}, [sprint?.status, sprintId]);

// Also listen for IPC events
useEffect(() => {
  const unsubscribe = window.electronAPI.onExecutionUpdate((data) => {
    if (data.sprintId === sprintId) {
      // Update specific assignment
      updateAssignment(data.taskId, data.status);
    }
  });

  return unsubscribe;
}, [sprintId]);
```

### i18n Keys

```json
// en/planning.json
{
  "dashboard": {
    "title": "Sprint Dashboard",
    "notFound": "Sprint not found",
    "started": "Started: {{date}}",
    "completed": "Completed: {{date}}",
    "progress": "{{attempted}} of {{total}} attempted",
    "completed": "Completed",
    "failed": "Failed",
    "pending": "Pending",
    "skipped": "Skipped",
    "inProgress": "In Progress",
    "viewDetails": "View Details",
    "duration": "{{minutes}}m {{seconds}}s"
  }
}

// fr/planning.json
{
  "dashboard": {
    "title": "Tableau de bord du Sprint",
    "notFound": "Sprint non trouvé",
    "started": "Démarré: {{date}}",
    "completed": "Terminé: {{date}}",
    "progress": "{{attempted}} sur {{total}} tentés",
    "completed": "Terminés",
    "failed": "Échoués",
    "pending": "En attente",
    "skipped": "Ignorés",
    "inProgress": "En cours",
    "viewDetails": "Voir les détails",
    "duration": "{{minutes}}m {{seconds}}s"
  }
}
```

### Project Structure Notes

**New files to create:**
- `apps/frontend/src/renderer/components/planning/SprintDashboard.tsx`
- `apps/frontend/src/renderer/components/planning/DashboardStats.tsx`
- `apps/frontend/src/renderer/components/planning/StoryStatusList.tsx`

**Existing files to modify:**
- `apps/frontend/src/renderer/views/PlanningView.tsx` - Add dashboard route
- `apps/frontend/src/renderer/components/planning/SprintList.tsx` - Add dashboard link

### References

- [Source: architecture.md#new-frontend-structure] - Component placement
- [Source: NFR2] - 2 second dashboard load requirement

### Test Scope

**Unit** - This story focuses on:
- Stats calculation
- Dashboard rendering
- Real-time update handling
- Grouping logic

### Performance Requirements

- Dashboard loads < 2 seconds (NFR2)
- Real-time updates reflect within 2 seconds
- Stats calculation is instant (derived from state)

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References
N/A - Implementation proceeded without errors

### Completion Notes List
- Created SprintDashboard component with real-time updates and execution controls
- Created DashboardStats component with clickable stat cards for filtering
- Created StoryStatusList component with collapsible sections by status
- Added IPC handlers for dashboard data in planning-handlers.ts
- Added API methods in planning-api.ts
- Added i18n translations for dashboard (en/planning.json and fr/planning.json)
- Dashboard supports real-time polling during active sprint execution
- Integration with sprintStore for state management

### File List
**New Files:**
- `apps/frontend/src/renderer/components/planning/SprintDashboard.tsx` - Main dashboard component
- `apps/frontend/src/renderer/components/planning/DashboardStats.tsx` - Stats cards component
- `apps/frontend/src/renderer/components/planning/StoryStatusList.tsx` - Story list grouped by status

**Modified Files:**
- `apps/frontend/src/shared/i18n/locales/en/planning.json` - Added dashboard translations
- `apps/frontend/src/shared/i18n/locales/fr/planning.json` - Added French dashboard translations
