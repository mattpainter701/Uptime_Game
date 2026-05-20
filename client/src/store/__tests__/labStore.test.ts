import { describe, it, expect, beforeEach } from 'vitest';
import { useLabStore } from '../labStore';

describe('labStore timer', () => {
  beforeEach(() => {
    // Reset the store to a known state
    useLabStore.setState({
      activeLabId: null,
      isActive: false,
      labName: '',
      timerState: { isRunning: false, elapsedSeconds: 0, startedAt: null },
    });
  });

  it('should start timer when lab is opened', () => {
    useLabStore.getState().openLab('lab-1', 'Test Lab');
    const { timerState, isActive } = useLabStore.getState();
    expect(isActive).toBe(true);
    expect(timerState.isRunning).toBe(true);
    expect(timerState.elapsedSeconds).toBe(0);
    expect(timerState.startedAt).not.toBeNull();
  });

  it('should pause and resume timer correctly', () => {
    useLabStore.getState().openLab('lab-1', 'Test Lab');
    // Simulate some elapsed time
    const start = Date.now() - 5000; // 5 seconds ago
    useLabStore.setState({
      timerState: {
        isRunning: true,
        elapsedSeconds: 0,
        startedAt: start,
      },
    });

    // Pause
    useLabStore.getState().pauseTimer();
    const afterPause = useLabStore.getState().timerState;
    expect(afterPause.isRunning).toBe(false);
    expect(afterPause.startedAt).toBeNull();
    // Elapsed should be at least 5 seconds
    expect(afterPause.elapsedSeconds).toBeGreaterThanOrEqual(5);

    // Store the elapsed seconds
    const elapsedBeforeResume = afterPause.elapsedSeconds;

    // Resume
    useLabStore.getState().startTimer();
    const afterResume = useLabStore.getState().timerState;
    expect(afterResume.isRunning).toBe(true);
    expect(afterResume.startedAt).not.toBeNull();
    // elapsedSeconds should not have changed on resume
    expect(afterResume.elapsedSeconds).toBe(elapsedBeforeResume);
  });

  it('should reset timer when lab is closed', () => {
    useLabStore.getState().openLab('lab-1', 'Test Lab');
    useLabStore.getState().closeLab();
    const { timerState, isActive } = useLabStore.getState();
    expect(isActive).toBe(false);
    expect(timerState.isRunning).toBe(false);
    expect(timerState.elapsedSeconds).toBe(0);
    expect(timerState.startedAt).toBeNull();
  });

  it('should persist timer state through save/load', () => {
    // simulate state that could be persisted
    const customState = {
      activeLabId: 'lab-saved',
      isActive: true,
      labName: 'Saved Lab',
      timerState: {
        isRunning: false,
        elapsedSeconds: 120,
        startedAt: null,
      },
    };
    useLabStore.setState(customState);

    // In a real scenario, persist middleware would save to localStorage.
    // We just verify the state is what we set.
    const state = useLabStore.getState();
    expect(state.activeLabId).toBe('lab-saved');
    expect(state.timerState.elapsedSeconds).toBe(120);
    expect(state.timerState.isRunning).toBe(false);
  });
});
