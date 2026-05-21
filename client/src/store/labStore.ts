import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TimerState {
  isRunning: boolean;
  elapsedSeconds: number;
  startedAt: number | null; // timestamp when last started/resumed
}

export interface LabState {
export interface Snapshot {
  id: string;
  lab_id: string;
  name: string;
  timestamp: string;
  data: any;
}
  activeLabId: string | null;
  isActive: boolean;
  labName: string;
  timerState: TimerState;
  // Actions
  openLab: (labId: string, labName?: string) => void;
  closeLab: () => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
}

export const useLabStore = create<LabState>()(
  persist(
    (set, get) => ({
      activeLabId: null,
      isActive: false,
      labName: '',
      timerState: {
        isRunning: false,
        elapsedSeconds: 0,
        startedAt: null,
      },

      openLab: (labId, labName = '') =>
        set({
          activeLabId: labId,
          isActive: true,
          labName,
          timerState: {
            isRunning: true,
            elapsedSeconds: 0,
            startedAt: Date.now(),
          },
        }),

      closeLab: () =>
        set({
          activeLabId: null,
          isActive: false,
          labName: '',
          timerState: {
            isRunning: false,
            elapsedSeconds: 0,
            startedAt: null,
          },
        }),

      startTimer: () => {
        const { timerState } = get();
        if (!timerState.isRunning) {
          set({
            timerState: {
              ...timerState,
              isRunning: true,
              startedAt: Date.now(),
            },
          });
        }
      },

      pauseTimer: () => {
        const { timerState } = get();
        if (timerState.isRunning && timerState.startedAt) {
          const now = Date.now();
          const additional = Math.floor((now - timerState.startedAt) / 1000);
          set({
            timerState: {
              isRunning: false,
              elapsedSeconds: timerState.elapsedSeconds + additional,
              startedAt: null,
            },
          });
        } else {
          set({
            timerState: {
              ...timerState,
              isRunning: false,
              startedAt: null,
            },
          });
        }
      },

      resetTimer: () => {
        set({
          timerState: {
            isRunning: false,
            elapsedSeconds: 0,
            startedAt: null,
          },
        });
      },
    }),
    {
      name: 'lab-session-storage',
      // Persist the entire state, including timerState, automatically
    }
  )
);
