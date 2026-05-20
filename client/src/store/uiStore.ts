import { create } from 'zustand';

interface UIState {
  showShortcuts: boolean;
  toggleShortcuts: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  showShortcuts: false,
  toggleShortcuts: () => set((state) => ({ showShortcuts: !state.showShortcuts })),
}));
