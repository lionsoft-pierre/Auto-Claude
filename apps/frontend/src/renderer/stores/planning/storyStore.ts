/**
 * Story Store for Planning Mode (Story 3.2)
 * Manages story list, selection, and editing state
 */
import { create } from 'zustand';
import type { StorySummary, Story, StoryStatus, StoryGroup } from '../../../shared/types';

interface StoryState {
  // Story data
  stories: StorySummary[];
  selectedStory: Story | null;
  isEditing: boolean;

  // Loading/error states
  isLoading: boolean;
  error: string | null;

  // Generation progress
  isGenerating: boolean;
  generationProgress: { current: number; total: number; storyTitle: string } | null;

  // Actions
  loadStories: (projectId: string) => Promise<void>;
  selectStory: (projectId: string, storyId: string) => Promise<void>;
  clearSelection: () => void;
  updateStory: (projectId: string, storyId: string, content: string) => Promise<boolean>;
  setStoryStatus: (projectId: string, storyId: string, status: StoryStatus) => Promise<boolean>;
  setEditing: (editing: boolean) => void;
  generateStories: (projectId: string) => void;

  // Story grouping for display
  getStoriesByEpic: () => StoryGroup[];

  // Generation event handlers (called from PlanningView)
  onGenerationProgress: (progress: { current: number; total: number; storyTitle: string }) => void;
  onGenerationComplete: (count: number) => void;
  onGenerationError: (error: string) => void;
}

/**
 * Group stories by epic for display
 */
function groupStoriesByEpic(stories: StorySummary[]): StoryGroup[] {
  const groups: Map<string, { epicId: string; epicTitle: string; stories: StorySummary[] }> = new Map();

  for (const story of stories) {
    const epicId = story.epic || 'unassigned';
    const epicTitle = story.epic
      ? story.epic.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
      : 'Unassigned';

    if (!groups.has(epicId)) {
      groups.set(epicId, { epicId, epicTitle, stories: [] });
    }
    groups.get(epicId)!.stories.push(story);
  }

  // Sort groups and stories within groups
  return Array.from(groups.values())
    .sort((a, b) => a.epicId.localeCompare(b.epicId))
    .map(group => ({
      ...group,
      stories: group.stories.sort((a, b) => a.number - b.number)
    }));
}

export const useStoryStore = create<StoryState>((set, get) => ({
  stories: [],
  selectedStory: null,
  isEditing: false,
  isLoading: false,
  error: null,
  isGenerating: false,
  generationProgress: null,

  loadStories: async (projectId: string) => {
    set({ isLoading: true, error: null });

    try {
      const result = await window.electronAPI.listPlanningStories(projectId);
      if (result.success && result.data) {
        set({ stories: result.data, isLoading: false });
      } else {
        set({ error: result.error || 'Failed to load stories', isLoading: false });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load stories',
        isLoading: false
      });
    }
  },

  selectStory: async (projectId: string, storyId: string) => {
    const { stories } = get();
    const story = stories.find(s => s.id === storyId);

    if (!story) {
      set({ selectedStory: null });
      return;
    }

    // Load full story content
    try {
      const result = await window.electronAPI.loadPlanningStory(projectId, storyId);
      if (result.success && result.data) {
        set({ selectedStory: result.data, isEditing: false });
      } else {
        set({ error: result.error || 'Failed to load story' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load story' });
    }
  },

  clearSelection: () => {
    set({ selectedStory: null, isEditing: false });
  },

  updateStory: async (projectId: string, storyId: string, content: string) => {
    try {
      const result = await window.electronAPI.updatePlanningStory(projectId, storyId, content);
      if (result.success && result.data) {
        // Update selected story with new content
        set({ selectedStory: result.data });

        // Reload stories list to update any changed metadata
        await get().loadStories(projectId);
        return true;
      } else {
        set({ error: result.error || 'Failed to update story' });
        return false;
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update story' });
      return false;
    }
  },

  setStoryStatus: async (projectId: string, storyId: string, status: StoryStatus) => {
    try {
      const result = await window.electronAPI.setStoryStatus(projectId, storyId, status);
      if (result.success) {
        // Update stories list
        set(state => ({
          stories: state.stories.map(s =>
            s.id === storyId ? { ...s, status } : s
          ),
          selectedStory: state.selectedStory?.metadata.id === storyId
            ? {
                ...state.selectedStory,
                metadata: { ...state.selectedStory.metadata, status }
              }
            : state.selectedStory
        }));
        return true;
      } else {
        set({ error: result.error || 'Failed to update story status' });
        return false;
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update story status' });
      return false;
    }
  },

  setEditing: (editing: boolean) => {
    set({ isEditing: editing });
  },

  generateStories: (projectId: string) => {
    set({ isGenerating: true, generationProgress: null, error: null });
    window.electronAPI.generatePlanningStories(projectId);
  },

  getStoriesByEpic: () => {
    return groupStoriesByEpic(get().stories);
  },

  onGenerationProgress: (progress: { current: number; total: number; storyTitle: string }) => {
    set({ generationProgress: progress });
  },

  onGenerationComplete: (count: number) => {
    set({
      isGenerating: false,
      generationProgress: null
    });
    // Note: Caller should reload stories after this
  },

  onGenerationError: (error: string) => {
    set({
      isGenerating: false,
      generationProgress: null,
      error
    });
  }
}));
