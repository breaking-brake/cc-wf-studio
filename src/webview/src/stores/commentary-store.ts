/**
 * Commentary AI Store
 *
 * Zustand store for managing Commentary AI state in the webview.
 */

import type { CommentaryProvider, CopilotModel, CopilotModelInfo } from '@shared/types/messages';
import { create } from 'zustand';
import { listCopilotModels } from '../services/refinement-service';

const FEATURE_ENABLED_STORAGE_KEY = 'cc-wf-studio:commentary-feature-enabled';
const ENABLED_STORAGE_KEY = 'cc-wf-studio:commentary-enabled';
const PROVIDER_STORAGE_KEY = 'cc-wf-studio:commentary-provider';
const COPILOT_MODEL_STORAGE_KEY = 'cc-wf-studio:commentary-copilot-model';
const LANGUAGE_STORAGE_KEY = 'cc-wf-studio:commentary-language';

export interface CommentaryEntry {
  id: string;
  text: string;
  timestamp: string;
  eventType: 'assistant' | 'tool_use' | 'error' | 'summary';
}

interface CommentaryState {
  /** Whether commentary feature is enabled (More menu Beta toggle) */
  isFeatureEnabled: boolean;
  /** Whether commentary session is active (toolbar toggle) */
  isEnabled: boolean;
  /** Whether a commentary session is active */
  isActive: boolean;
  /** Commentary entries */
  entries: CommentaryEntry[];
  /** Selected commentary AI provider */
  selectedProvider: CommentaryProvider;
  /** Selected Copilot model for commentary */
  selectedCopilotModel: CopilotModel;
  /** Commentary language (free text, default: 'English') */
  language: string;
  /** Available Copilot models */
  availableCopilotModels: CopilotModelInfo[];
  /** Whether Copilot models are being fetched */
  isFetchingCopilotModels: boolean;
  /** Error message if Copilot models fetch failed */
  copilotModelsError: string | null;
}

interface CommentaryActions {
  toggleFeatureEnabled: () => void;
  toggleEnabled: () => void;
  setActive: (active: boolean) => void;
  addEntry: (entry: Omit<CommentaryEntry, 'id'>) => void;
  clearEntries: () => void;
  setProvider: (provider: CommentaryProvider) => void;
  setCopilotModel: (model: CopilotModel) => void;
  setLanguage: (language: string) => void;
  fetchCopilotModels: () => Promise<void>;
}

export const useCommentaryStore = create<CommentaryState & CommentaryActions>((set, get) => ({
  isFeatureEnabled: localStorage.getItem(FEATURE_ENABLED_STORAGE_KEY) === 'true',
  isEnabled: localStorage.getItem(ENABLED_STORAGE_KEY) === 'true',
  isActive: false,
  entries: [],
  selectedProvider:
    (localStorage.getItem(PROVIDER_STORAGE_KEY) as CommentaryProvider) || 'claude-code',
  selectedCopilotModel: localStorage.getItem(COPILOT_MODEL_STORAGE_KEY) || 'gpt-4o-mini',
  language: localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'English',
  availableCopilotModels: [],
  isFetchingCopilotModels: false,
  copilotModelsError: null,

  toggleFeatureEnabled: () =>
    set((state) => {
      const newValue = !state.isFeatureEnabled;
      localStorage.setItem(FEATURE_ENABLED_STORAGE_KEY, String(newValue));
      // Disable active session when feature is turned off
      if (!newValue) {
        localStorage.setItem(ENABLED_STORAGE_KEY, 'false');
        return { isFeatureEnabled: newValue, isEnabled: false };
      }
      return { isFeatureEnabled: newValue };
    }),

  toggleEnabled: () =>
    set((state) => {
      const newEnabled = !state.isEnabled;
      localStorage.setItem(ENABLED_STORAGE_KEY, String(newEnabled));
      return { isEnabled: newEnabled };
    }),

  setActive: (active) => set({ isActive: active }),

  addEntry: (entry) =>
    set((state) => ({
      entries: [
        ...state.entries,
        { ...entry, id: `commentary-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` },
      ],
    })),

  clearEntries: () => set({ entries: [] }),

  setProvider: (provider) => {
    localStorage.setItem(PROVIDER_STORAGE_KEY, provider);
    set({ selectedProvider: provider });
  },

  setCopilotModel: (model) => {
    localStorage.setItem(COPILOT_MODEL_STORAGE_KEY, model);
    set({ selectedCopilotModel: model });
  },

  setLanguage: (language) => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    set({ language });
  },

  fetchCopilotModels: async () => {
    if (get().isFetchingCopilotModels) return;

    set({ isFetchingCopilotModels: true, copilotModelsError: null });

    try {
      const result = await listCopilotModels();

      if (result.available) {
        set({
          availableCopilotModels: result.models,
          isFetchingCopilotModels: false,
          copilotModelsError: null,
        });

        // If current model is not in the list, select the first available
        const currentModel = get().selectedCopilotModel;
        const modelExists = result.models.some((m) => m.family === currentModel);
        if (!modelExists && result.models.length > 0) {
          const firstModel = result.models[0].family;
          set({ selectedCopilotModel: firstModel });
          localStorage.setItem(COPILOT_MODEL_STORAGE_KEY, firstModel);
        }
      } else {
        set({
          availableCopilotModels: [],
          isFetchingCopilotModels: false,
          copilotModelsError: result.unavailableReason || 'Copilot not available',
        });
      }
    } catch {
      set({
        isFetchingCopilotModels: false,
        copilotModelsError: 'Failed to fetch models',
      });
    }
  },
}));
