import { create } from 'zustand';
import type {
  ArtifactSummary,
  PlanningArtifact,
  ArtifactType,
  ArtifactStatus
} from '../../../shared/types/planning';

/**
 * Artifact relationships for navigation (Story 2.5)
 */
interface ArtifactRelationships {
  parentId: string | null;
  childIds: string[];
}

/**
 * Artifact store state
 */
interface ArtifactState {
  // Data
  artifacts: ArtifactSummary[];
  selectedArtifact: PlanningArtifact | null;
  isLoading: boolean;
  error: string | null;

  // Edit state (Story 2.4)
  isEditing: boolean;
  editContent: string;
  hasUnsavedChanges: boolean;

  // Relationships (Story 2.5)
  relationships: Map<string, ArtifactRelationships>;
  navigationHistory: string[];

  // Actions
  loadArtifacts: (projectId: string) => Promise<void>;
  selectArtifact: (artifactId: string, projectId: string) => Promise<void>;
  clearSelection: () => void;
  saveArtifact: (projectId: string, type: ArtifactType, content: string, title: string) => Promise<PlanningArtifact | null>;
  updateArtifact: (projectId: string, artifactId: string, content: string) => Promise<boolean>;
  approveArtifact: (projectId: string, artifactId: string) => Promise<boolean>;
  rejectArtifact: (projectId: string, artifactId: string) => Promise<boolean>;

  // Edit actions (Story 2.4)
  setEditing: (editing: boolean) => void;
  setEditContent: (content: string) => void;

  // Navigation actions (Story 2.5)
  navigateToArtifact: (artifactId: string, projectId: string, section?: string) => Promise<void>;
  navigateBack: (projectId: string) => void;
  buildRelationshipGraph: () => void;
}

/**
 * Artifact order for sorting
 */
const ARTIFACT_ORDER: ArtifactType[] = ['product-brief', 'prd', 'architecture', 'epics', 'story'];

export const useArtifactStore = create<ArtifactState>((set, get) => ({
  // Initial state
  artifacts: [],
  selectedArtifact: null,
  isLoading: false,
  error: null,
  isEditing: false,
  editContent: '',
  hasUnsavedChanges: false,
  relationships: new Map(),
  navigationHistory: [],

  // Actions
  loadArtifacts: async (projectId: string) => {
    set({ isLoading: true, error: null });

    try {
      const result = await window.electronAPI.listPlanningArtifacts(projectId);

      if (result.success && result.data) {
        // Sort artifacts by workflow order
        const sortedArtifacts = [...result.data].sort(
          (a, b) => ARTIFACT_ORDER.indexOf(a.type) - ARTIFACT_ORDER.indexOf(b.type)
        );
        set({ artifacts: sortedArtifacts, isLoading: false });
        // Build relationship graph after loading
        get().buildRelationshipGraph();
      } else {
        set({ error: result.error || 'Failed to load artifacts', isLoading: false });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load artifacts',
        isLoading: false
      });
    }
  },

  selectArtifact: async (artifactId: string, projectId: string) => {
    set({ isLoading: true, error: null });

    try {
      const result = await window.electronAPI.loadPlanningArtifact(projectId, artifactId);

      if (result.success && result.data) {
        set({
          selectedArtifact: result.data,
          isLoading: false,
          isEditing: false,
          editContent: result.data.content,
          hasUnsavedChanges: false
        });
      } else {
        set({ error: result.error || 'Failed to load artifact', isLoading: false });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load artifact',
        isLoading: false
      });
    }
  },

  clearSelection: () => {
    set({
      selectedArtifact: null,
      isEditing: false,
      editContent: '',
      hasUnsavedChanges: false
    });
  },

  saveArtifact: async (projectId: string, type: ArtifactType, content: string, title: string) => {
    try {
      const result = await window.electronAPI.savePlanningArtifact(projectId, type, content, title);

      if (result.success && result.data) {
        // Add to artifacts list
        const summary: ArtifactSummary = {
          id: result.data.metadata.id,
          title: result.data.metadata.title,
          type: result.data.metadata.type,
          status: result.data.metadata.status,
          updatedAt: result.data.metadata.updatedAt,
          filePath: result.data.filePath
        };

        set((state) => ({
          artifacts: [...state.artifacts.filter(a => a.type !== type), summary].sort(
            (a, b) => ARTIFACT_ORDER.indexOf(a.type) - ARTIFACT_ORDER.indexOf(b.type)
          )
        }));

        return result.data;
      }
      return null;
    } catch {
      return null;
    }
  },

  updateArtifact: async (projectId: string, artifactId: string, content: string) => {
    try {
      const result = await window.electronAPI.updatePlanningArtifact(projectId, artifactId, content);

      if (result.success && result.data) {
        // Update the selected artifact
        set((state) => ({
          selectedArtifact: result.data,
          hasUnsavedChanges: false,
          artifacts: state.artifacts.map(a =>
            a.id === artifactId
              ? { ...a, updatedAt: result.data!.metadata.updatedAt }
              : a
          )
        }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  approveArtifact: async (projectId: string, artifactId: string) => {
    try {
      const result = await window.electronAPI.approvePlanningArtifact(projectId, artifactId);

      if (result.success) {
        // Update artifact status in list
        set((state) => ({
          artifacts: state.artifacts.map(a =>
            a.id === artifactId ? { ...a, status: 'approved' as ArtifactStatus } : a
          ),
          selectedArtifact: state.selectedArtifact && state.selectedArtifact.metadata.id === artifactId
            ? {
                ...state.selectedArtifact,
                metadata: { ...state.selectedArtifact.metadata, status: 'approved' as ArtifactStatus }
              }
            : state.selectedArtifact
        }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  rejectArtifact: async (projectId: string, artifactId: string) => {
    try {
      const result = await window.electronAPI.rejectPlanningArtifact(projectId, artifactId);
      return result.success;
    } catch {
      return false;
    }
  },

  // Edit actions
  setEditing: (editing: boolean) => {
    const { selectedArtifact } = get();
    set({
      isEditing: editing,
      editContent: editing && selectedArtifact ? selectedArtifact.content : '',
      hasUnsavedChanges: false
    });
  },

  setEditContent: (content: string) => {
    const { selectedArtifact } = get();
    set({
      editContent: content,
      hasUnsavedChanges: selectedArtifact ? content !== selectedArtifact.content : false
    });
  },

  // Navigation actions
  navigateToArtifact: async (artifactId: string, projectId: string, section?: string) => {
    const { selectedArtifact, navigationHistory } = get();

    // Add current artifact to history before navigating
    if (selectedArtifact) {
      set({ navigationHistory: [...navigationHistory, selectedArtifact.metadata.id] });
    }

    // Load the new artifact
    await get().selectArtifact(artifactId, projectId);

    // Scroll to section if specified
    if (section) {
      setTimeout(() => {
        const element = document.getElementById(section);
        element?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  },

  navigateBack: (projectId: string) => {
    const { navigationHistory } = get();
    if (navigationHistory.length > 0) {
      const previousId = navigationHistory[navigationHistory.length - 1];
      set({ navigationHistory: navigationHistory.slice(0, -1) });
      get().selectArtifact(previousId, projectId);
    }
  },

  buildRelationshipGraph: () => {
    const { artifacts } = get();
    const relationships = new Map<string, ArtifactRelationships>();

    // Build basic relationships based on artifact type hierarchy
    artifacts.forEach(artifact => {
      relationships.set(artifact.id, {
        parentId: null,
        childIds: []
      });
    });

    // Stories are children of epics
    const epicsArtifact = artifacts.find(a => a.type === 'epics');
    const storyArtifacts = artifacts.filter(a => a.type === 'story');

    if (epicsArtifact) {
      const epicsRel = relationships.get(epicsArtifact.id);
      if (epicsRel) {
        epicsRel.childIds = storyArtifacts.map(s => s.id);
      }

      storyArtifacts.forEach(story => {
        const storyRel = relationships.get(story.id);
        if (storyRel) {
          storyRel.parentId = epicsArtifact.id;
        }
      });
    }

    set({ relationships });
  }
}));

/**
 * Get child count for an artifact
 */
export function getArtifactChildCount(artifactId: string): number {
  const relationships = useArtifactStore.getState().relationships;
  return relationships.get(artifactId)?.childIds.length ?? 0;
}
