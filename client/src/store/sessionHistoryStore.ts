import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------
export interface SessionEntry {
  id: string;
  labPath: string;
  labName: string;
  startTime: number;           // timestamp ms
  endTime?: number;            // timestamp ms
  duration?: number;            // duration in seconds (computed on save)
  status: 'completed' | 'abandoned';
  terminalHistory: string[];    // full terminal output lines
  nodeConfigs?: Record<string, unknown>; // optional node snapshot
}

interface SessionHistoryState {
  sessions: SessionEntry[];
  addSession: (session: Omit<SessionEntry, 'id'>) => void;
  updateSession: (id: string, updates: Partial<SessionEntry>) => void;
  getSession: (id: string) => SessionEntry | undefined;
  clearHistory: () => void;
}

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto (e.g. Node <19)
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
};

// -------------------------------------------------------------------
// Store
// -------------------------------------------------------------------
export const useSessionHistoryStore = create<SessionHistoryState>()(
  persist(
    (set, get) => ({
      sessions: [],

      addSession: (session) =>
        set((state) => ({
          sessions: [
            ...state.sessions,
            {
              ...session,
              id: generateId(),
            },
          ],
        })),

      updateSession: (id, updates) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })),

      getSession: (id) => get().sessions.find((s) => s.id === id),

      clearHistory: () => set({ sessions: [] }),
    }),
    {
      name: 'session-history-storage', // localStorage key
    }
  )
);
