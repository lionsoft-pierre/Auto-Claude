/**
 * Browser mock for window.electronAPI
 * This allows the app to run in a regular browser for UI development/testing
 *
 * This module aggregates all mock implementations from separate modules
 * for better code organization and maintainability.
 */

import type { ElectronAPI } from '../../shared/types';
import {
  projectMock,
  taskMock,
  workspaceMock,
  terminalMock,
  claudeProfileMock,
  contextMock,
  integrationMock,
  changelogMock,
  insightsMock,
  infrastructureMock,
  settingsMock
} from './mocks';

// Check if we're in a browser (not Electron)
const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;

/**
 * Create mock electronAPI for browser
 * Aggregates all mock implementations from separate modules
 */
const browserMockAPI: ElectronAPI = {
  // Project Operations
  ...projectMock,

  // Task Operations
  ...taskMock,

  // Workspace Management
  ...workspaceMock,

  // Terminal Operations
  ...terminalMock,

  // Claude Profile Management
  ...claudeProfileMock,

  // Settings
  ...settingsMock,

  // Roadmap Operations
  getRoadmap: async () => ({
    success: true,
    data: null
  }),

  getRoadmapStatus: async () => ({
    success: true,
    data: { isRunning: false }
  }),

  saveRoadmap: async () => ({
    success: true
  }),

  generateRoadmap: (_projectId: string, _enableCompetitorAnalysis?: boolean, _refreshCompetitorAnalysis?: boolean) => {
    console.warn('[Browser Mock] generateRoadmap called');
  },

  refreshRoadmap: (_projectId: string, _enableCompetitorAnalysis?: boolean, _refreshCompetitorAnalysis?: boolean) => {
    console.warn('[Browser Mock] refreshRoadmap called');
  },

  updateFeatureStatus: async () => ({ success: true }),

  convertFeatureToSpec: async (projectId: string, _featureId: string) => ({
    success: true,
    data: {
      id: `task-${Date.now()}`,
      specId: '',
      projectId,
      title: 'Converted Feature',
      description: 'Feature converted from roadmap',
      status: 'backlog' as const,
      subtasks: [],
      logs: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }),

  stopRoadmap: async () => ({ success: true }),

  // Roadmap Event Listeners
  onRoadmapProgress: () => () => {},
  onRoadmapComplete: () => () => {},
  onRoadmapError: () => () => {},
  onRoadmapStopped: () => () => {},
  // Context Operations
  ...contextMock,

  // Environment Configuration & Integration Operations
  ...integrationMock,

  // Changelog & Release Operations
  ...changelogMock,

  // Insights Operations
  ...insightsMock,

  // Infrastructure & Docker Operations
  ...infrastructureMock,

  // API Profile Management (custom Anthropic-compatible endpoints)
  getAPIProfiles: async () => ({
    success: true,
    data: {
      profiles: [],
      activeProfileId: null,
      version: 1
    }
  }),

  saveAPIProfile: async (profile) => ({
    success: true,
    data: {
      id: `mock-profile-${Date.now()}`,
      ...profile,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  }),

  updateAPIProfile: async (profile) => ({
    success: true,
    data: {
      ...profile,
      updatedAt: Date.now()
    }
  }),

  deleteAPIProfile: async (_profileId: string) => ({
    success: true
  }),

  setActiveAPIProfile: async (_profileId: string | null) => ({
    success: true
  }),

  testConnection: async (_baseUrl: string, _apiKey: string, _signal?: AbortSignal) => ({
    success: true,
    data: {
      success: true,
      message: 'Connection successful (mock)'
    }
  }),

  discoverModels: async (_baseUrl: string, _apiKey: string, _signal?: AbortSignal) => ({
    success: true,
    data: {
      models: []
    }
  }),

  // GitHub API
  github: {
    getGitHubRepositories: async () => ({ success: true, data: [] }),
    getGitHubIssues: async () => ({ success: true, data: [] }),
    getGitHubIssue: async () => ({ success: true, data: null as any }),
    getIssueComments: async () => ({ success: true, data: [] }),
    checkGitHubConnection: async () => ({ success: true, data: { connected: false, repoFullName: undefined, error: undefined } }),
    investigateGitHubIssue: () => {},
    importGitHubIssues: async () => ({ success: true, data: { success: true, imported: 0, failed: 0, issues: [] } }),
    createGitHubRelease: async () => ({ success: true, data: { url: '' } }),
    suggestReleaseVersion: async () => ({ success: true, data: { suggestedVersion: '1.0.0', currentVersion: '0.0.0', bumpType: 'minor' as const, commitCount: 0, reason: 'Initial' } }),
    checkGitHubCli: async () => ({ success: true, data: { installed: false } }),
    checkGitHubAuth: async () => ({ success: true, data: { authenticated: false } }),
    startGitHubAuth: async () => ({ success: true, data: { success: false } }),
    getGitHubToken: async () => ({ success: true, data: { token: '' } }),
    getGitHubUser: async () => ({ success: true, data: { username: '' } }),
    listGitHubUserRepos: async () => ({ success: true, data: { repos: [] } }),
    detectGitHubRepo: async () => ({ success: true, data: '' }),
    getGitHubBranches: async () => ({ success: true, data: [] }),
    createGitHubRepo: async () => ({ success: true, data: { fullName: '', url: '' } }),
    addGitRemote: async () => ({ success: true, data: { remoteUrl: '' } }),
    listGitHubOrgs: async () => ({ success: true, data: { orgs: [] } }),
    onGitHubAuthDeviceCode: () => () => {},
    onGitHubInvestigationProgress: () => () => {},
    onGitHubInvestigationComplete: () => () => {},
    onGitHubInvestigationError: () => () => {},
    getAutoFixConfig: async () => null,
    saveAutoFixConfig: async () => true,
    getAutoFixQueue: async () => [],
    checkAutoFixLabels: async () => [],
    checkNewIssues: async () => [],
    startAutoFix: () => {},
    onAutoFixProgress: () => () => {},
    onAutoFixComplete: () => () => {},
    onAutoFixError: () => () => {},
    listPRs: async () => [],
    getPR: async () => null,
    runPRReview: () => {},
    cancelPRReview: async () => true,
    postPRReview: async () => true,
    postPRComment: async () => true,
    mergePR: async () => true,
    assignPR: async () => true,
    getPRReview: async () => null,
    getPRReviewsBatch: async () => ({}),
    deletePRReview: async () => true,
    checkNewCommits: async () => ({ hasNewCommits: false, newCommitCount: 0 }),
    checkMergeReadiness: async () => ({ isDraft: false, mergeable: 'UNKNOWN' as const, isBehind: false, ciStatus: 'none' as const, blockers: [] }),
    runFollowupReview: () => {},
    getPRLogs: async () => null,
    getWorkflowsAwaitingApproval: async () => ({ awaiting_approval: 0, workflow_runs: [], can_approve: false }),
    approveWorkflow: async () => true,
    onPRReviewProgress: () => () => {},
    onPRReviewComplete: () => () => {},
    onPRReviewError: () => () => {},
    batchAutoFix: () => {},
    getBatches: async () => [],
    onBatchProgress: () => () => {},
    onBatchComplete: () => () => {},
    onBatchError: () => () => {},
    // Analyze & Group Issues (proactive workflow)
    analyzeIssuesPreview: () => {},
    approveBatches: async () => ({ success: true, batches: [] }),
    onAnalyzePreviewProgress: () => () => {},
    onAnalyzePreviewComplete: () => () => {},
    onAnalyzePreviewError: () => () => {}
  },

  // Claude Code Operations
  checkClaudeCodeVersion: async () => ({
    success: true,
    data: {
      installed: '1.0.0',
      latest: '1.0.0',
      isOutdated: false,
      path: '/usr/local/bin/claude',
      detectionResult: {
        found: true,
        version: '1.0.0',
        path: '/usr/local/bin/claude',
        source: 'system-path' as const,
        message: 'Claude Code CLI found'
      }
    }
  }),
  installClaudeCode: async () => ({
    success: true,
    data: { command: 'npm install -g @anthropic-ai/claude-code' }
  }),
  getClaudeCodeVersions: async () => ({
    success: true,
    data: {
      versions: ['1.0.5', '1.0.4', '1.0.3', '1.0.2', '1.0.1', '1.0.0']
    }
  }),
  installClaudeCodeVersion: async (version: string) => ({
    success: true,
    data: { command: `npm install -g @anthropic-ai/claude-code@${version}`, version }
  }),
  getClaudeCodeInstallations: async () => ({
    success: true,
    data: {
      installations: [
        {
          path: '/usr/local/bin/claude',
          version: '1.0.0',
          source: 'system-path' as const,
          isActive: true,
        }
      ],
      activePath: '/usr/local/bin/claude',
    }
  }),
  setClaudeCodeActivePath: async (cliPath: string) => ({
    success: true,
    data: { path: cliPath }
  }),

  // Terminal Worktree Operations
  createTerminalWorktree: async () => ({
    success: false,
    error: 'Not available in browser mode'
  }),
  listTerminalWorktrees: async () => ({
    success: true,
    data: []
  }),
  removeTerminalWorktree: async () => ({
    success: false,
    error: 'Not available in browser mode'
  }),

  // MCP Server Health Check Operations
  checkMcpHealth: async (server) => ({
    success: true,
    data: {
      serverId: server.id,
      status: 'unknown' as const,
      message: 'Health check not available in browser mode',
      checkedAt: new Date().toISOString()
    }
  }),
  testMcpConnection: async (server) => ({
    success: true,
    data: {
      serverId: server.id,
      success: false,
      message: 'Connection test not available in browser mode'
    }
  }),

  // Debug Operations
  getDebugInfo: async () => ({
    systemInfo: {
      appVersion: '0.0.0-browser-mock',
      platform: 'browser',
      isPackaged: 'false'
    },
    recentErrors: [],
    logsPath: '/mock/logs',
    debugReport: '[Browser Mock] Debug report not available in browser mode'
  }),
  openLogsFolder: async () => ({ success: false, error: 'Not available in browser mode' }),
  copyDebugInfo: async () => ({ success: false, error: 'Not available in browser mode' }),
  getRecentErrors: async () => [],
  listLogFiles: async () => [],

  // Planning Session Operations (Story 1.1)
  createPlanningSession: async (projectId: string, projectName: string, methodology) => ({
    success: true,
    data: {
      id: `session-${Date.now()}`,
      projectId,
      projectName,
      methodology,
      status: 'idle' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentWorkflow: null,
      currentStep: 0,
      completedWorkflows: [],
      artifacts: {},
      context: {},
      messages: []
    }
  }),
  loadPlanningSession: async () => ({
    success: true,
    data: null
  }),
  savePlanningSession: async () => ({
    success: true
  }),

  // Planning Chat Operations (Story 1.2)
  sendPlanningMessage: (projectId: string, sessionId: string, message: string) => {
    console.warn('[Browser Mock] sendPlanningMessage called', { projectId, sessionId, message });
  },
  onPlanningChatStream: () => () => {},
  onPlanningChatError: () => () => {},

  // Planning Session Management (Story 1.3)
  listPlanningSessions: async () => ({
    success: true,
    data: []
  }),
  deletePlanningSession: async () => ({
    success: true
  }),

  // Planning Workflow Operations (Story 2.1)
  startPlanningWorkflow: async () => ({
    success: true
  }),
  advancePlanningWorkflow: async () => ({
    success: true,
    data: { nextWorkflow: null }
  }),
  getPlanningWorkflowStatus: async () => ({
    success: true,
    data: { status: 'idle', currentWorkflow: null }
  }),

  // Planning Artifact Operations (Story 2.2, 2.3, 2.4)
  listPlanningArtifacts: async () => ({
    success: true,
    data: []
  }),
  loadPlanningArtifact: async () => ({
    success: false,
    error: 'Not available in browser mode'
  }),
  savePlanningArtifact: async () => ({
    success: false,
    error: 'Not available in browser mode'
  }),
  updatePlanningArtifact: async () => ({
    success: false,
    error: 'Not available in browser mode'
  }),
  approvePlanningArtifact: async () => ({
    success: true
  }),
  rejectPlanningArtifact: async () => ({
    success: true
  }),

  // Planning Git Checkpoint Operations (Story 2.6)
  createPlanningCheckpoint: async () => ({
    success: true,
    data: { success: true, commitHash: 'mock-hash', timestamp: new Date().toISOString() }
  }),
  listPlanningCheckpoints: async () => ({
    success: true,
    data: []
  }),
  viewArtifactAtCheckpoint: async () => ({
    success: false,
    error: 'Not available in browser mode'
  }),

  // Planning story operations (Story 3.1, 3.2)
  listPlanningStories: async () => ({
    success: true,
    data: []
  }),
  generatePlanningStories: (_projectId: string) => {
    console.warn('[Browser Mock] generatePlanningStories called');
  },
  loadPlanningStory: async () => ({
    success: false,
    error: 'Not available in browser mode'
  }),
  updatePlanningStory: async () => ({
    success: false,
    error: 'Not available in browser mode'
  }),
  setStoryStatus: async () => ({
    success: false,
    error: 'Not available in browser mode'
  }),

  // Planning story generation events (Story 3.1)
  onPlanningStoriesProgress: () => () => {},
  onPlanningStoriesComplete: () => () => {},
  onPlanningStoriesError: () => () => {},

  // Planning story to task conversion (Story 3.3)
  convertStoryToTask: async () => ({
    success: true,
    data: { storyId: '', taskId: '', success: false, error: 'Not available in browser mode' }
  }),
  convertStoriesToTasks: async () => ({
    success: true,
    data: []
  }),
  checkStoryDuplicate: async () => ({
    success: true,
    data: { isDuplicate: false }
  }),

  // Sprint management operations (Story 4.1)
  listSprints: async () => ({
    success: true,
    data: { sprints: [], assignments: [] }
  }),
  createSprint: async (_projectId: string, name: string) => ({
    success: true,
    data: {
      id: `sprint-${Date.now()}`,
      name,
      status: 'not_started' as const,
      color: '#4F46E5',
      createdAt: new Date().toISOString()
    }
  }),
  deleteSprint: async () => ({
    success: true
  }),
  assignTaskToSprint: async (_projectId: string, taskId: string, sprintId: string, storyId?: string) => ({
    success: true,
    data: {
      taskId,
      storyId: storyId || '',
      sprintId,
      priority: 1,
      status: 'pending' as const
    }
  }),
  unassignTaskFromSprint: async () => ({
    success: true
  }),

  // Sprint queue operations (Story 4.2)
  getSprintQueue: async () => ({
    success: true,
    data: []
  }),
  reorderSprintQueue: async () => ({
    success: true
  }),

  // Sprint status operations (Story 4.3)
  startSprint: async (_projectId: string, sprintId: string) => ({
    success: true,
    data: {
      id: sprintId,
      name: 'Mock Sprint',
      status: 'in_progress' as const,
      color: '#4F46E5',
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString()
    }
  }),
  completeSprint: async (_projectId: string, sprintId: string) => ({
    success: true,
    data: {
      id: sprintId,
      name: 'Mock Sprint',
      status: 'completed' as const,
      color: '#4F46E5',
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    }
  }),
  onSprintStatusChanged: () => () => {},

  // Sprint execution operations (Story 5.1)
  startSprintExecution: async () => ({
    success: true,
    data: { started: true }
  }),
  stopSprintExecution: async () => ({
    success: true
  }),
  pauseSprintExecution: async () => ({
    success: true
  }),
  resumeSprintExecution: async () => ({
    success: true
  }),
  getSprintExecutionStatus: async () => ({
    success: true,
    data: {
      sprintId: '',
      status: 'idle' as const,
      storiesCompleted: 0,
      storiesFailed: 0,
      storiesSkipped: 0,
      storiesTotal: 0
    }
  }),

  // Sprint execution events (Story 5.1, 5.2, 5.3, 5.4)
  onSprintExecutionStarted: () => () => {},
  onSprintExecutionStoryStarted: () => () => {},
  onSprintExecutionStoryCompleted: () => () => {},
  onSprintExecutionStoryFailed: () => () => {},
  onSprintExecutionStorySkipped: () => () => {},
  onSprintExecutionRetrying: () => () => {},
  onSprintExecutionCompleted: () => () => {},
  onSprintExecutionPaused: () => () => {},
  onSprintExecutionResumed: () => () => {},
  onSprintExecutionError: () => () => {},

  // Sprint dashboard operations (Story 6.1, 6.2)
  getFailureDetails: async () => ({
    success: false,
    error: 'Not available in browser mode'
  }),
  retryStory: async () => ({
    success: false,
    error: 'Not available in browser mode'
  }),

  // Git operations
  initializeGit: async () => ({
    success: false,
    error: 'Not available in browser mode'
  })
};

/**
 * Initialize browser mock if not running in Electron
 */
export function initBrowserMock(): void {
  if (!isElectron) {
    console.warn('%c[Browser Mock] Initializing mock electronAPI for browser preview', 'color: #f0ad4e; font-weight: bold;');
    (window as Window & { electronAPI: ElectronAPI }).electronAPI = browserMockAPI;
  }
}

// Auto-initialize
initBrowserMock();
