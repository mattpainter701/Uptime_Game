import { create } from 'zustand';

// ---- session state shape ----
interface LabSession {
  labId: string | null;
  nodeConfigs: Record<string, unknown>;
  terminalHistory: string[];
}

interface LabState extends LabSession {
  // actions
  saveSession: () => void;
  loadSession: () => LabSession | null;
  clearSession: () => void;
  setLabId: (id: string) => void;
  setNodeConfigs: (configs: Record<string, unknown>) => void;
  addTerminalHistory: (entry: string) => void;
}

export const useLabStore = create<LabState>((set, get) => ({
  // initial state
  labId: null,
  nodeConfigs: {},
  terminalHistory: [],

  // ----- persistence actions -----
  saveSession: () => {
    const state = get();
    const session: LabSession = {
      labId: state.labId,
      nodeConfigs: state.nodeConfigs,
      terminalHistory: state.terminalHistory,
    };
    localStorage.setItem('labSession', JSON.stringify(session));
  },

  loadSession: (): LabSession | null => {
    const raw = localStorage.getItem('labSession');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as LabSession;
    } catch {
      return null;
    }
  },

  clearSession: () => {
    localStorage.removeItem('labSession');
  },

  // ----- domain actions (placeholders – extend as needed) -----
  setLabId: (id) => set({ labId: id }),
  setNodeConfigs: (configs) => set({ nodeConfigs: configs }),
  addTerminalHistory: (entry) =>
    set((state) => ({
      terminalHistory: [...state.terminalHistory, entry],
    })),
}));
