/**
 * Commentary AI Store
 *
 * Zustand store for managing Commentary AI state in the webview.
 */

import { create } from 'zustand';

const ENABLED_STORAGE_KEY = 'cc-wf-studio:commentary-enabled';

export interface CommentaryEntry {
  id: string;
  text: string;
  timestamp: string;
  eventType: 'assistant' | 'tool_use' | 'error' | 'summary';
}

interface CommentaryState {
  /** Whether commentary is enabled (persisted toggle) */
  isEnabled: boolean;
  /** Whether a commentary session is active */
  isActive: boolean;
  /** Commentary entries */
  entries: CommentaryEntry[];
}

interface CommentaryActions {
  toggleEnabled: () => void;
  setActive: (active: boolean) => void;
  addEntry: (entry: Omit<CommentaryEntry, 'id'>) => void;
  clearEntries: () => void;
}

export const useCommentaryStore = create<CommentaryState & CommentaryActions>((set) => ({
  isEnabled: localStorage.getItem(ENABLED_STORAGE_KEY) === 'true',
  isActive: false,
  entries: [],

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
}));
