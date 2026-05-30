import { create } from 'zustand';

const STORAGE_KEY = 'editorWordWrap';

function loadWordWrap(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  } catch {
    return false;
  }
}

function saveWordWrap(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export interface EditorState {
  wordWrapEnabled: boolean;
  toggleWordWrap: () => void;
  setWordWrap: (enabled: boolean) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  wordWrapEnabled: loadWordWrap(),

  toggleWordWrap: () =>
    set((state) => {
      const next = !state.wordWrapEnabled;
      saveWordWrap(next);
      return { wordWrapEnabled: next };
    }),

  setWordWrap: (enabled) => {
    saveWordWrap(enabled);
    set({ wordWrapEnabled: enabled });
  },
}));
