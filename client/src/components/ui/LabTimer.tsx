import { useEffect, useMemo } from 'react';
import { useLabStore } from '../../store/labStore';

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((val) => String(val).padStart(2, '0'))
    .join(':');
}

export function LabTimer() {
  const timerState = useLabStore((s) => s.timerState);
  const isActive = useLabStore((s) => s.isActive);
  const startTimer = useLabStore((s) => s.startTimer);
  const pauseTimer = useLabStore((s) => s.pauseTimer);

  const displaySeconds = useMemo(() => {
    if (timerState.isRunning && timerState.startedAt) {
      const additional = Math.floor((Date.now() - timerState.startedAt) / 1000);
      return timerState.elapsedSeconds + additional;
    }
    return timerState.elapsedSeconds;
  }, [timerState]);

  // Force a re-render every second when running
  useEffect(() => {
    if (!timerState.isRunning) return;
    const interval = setInterval(() => {
      // Re-evaluated via the useMemo dependency on timerState
    }, 1000);
    return () => clearInterval(interval);
  }, [timerState.isRunning]);

  if (!isActive) return null;

  return (
    <div className="lab-timer">
      <span className="timer-display">{formatTime(displaySeconds)}</span>
      <button
        onClick={timerState.isRunning ? pauseTimer : startTimer}
        className="timer-control-btn"
      >
        {timerState.isRunning ? 'Pause' : 'Resume'}
      </button>
    </div>
  );
}

export default LabTimer;
