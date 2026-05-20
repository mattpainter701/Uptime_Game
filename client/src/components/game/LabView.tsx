import { useLabStore } from '../../store/labStore';
import LabTimer from '../ui/LabTimer';
import Terminal from '../terminal/Terminal'; // assume this component exists

export function LabView() {
  const isActive = useLabStore((s) => s.isActive);
  const timerState = useLabStore((s) => s.timerState);
  const labName = useLabStore((s) => s.labName);

  if (!isActive) {
    return (
      <div className="lab-view empty">
        <p>No active lab. Open a lab to start.</p>
      </div>
    );
  }

  const isPaused = !timerState.isRunning;

  return (
    <div className="lab-view">
      <header className="lab-header">
        <h1>{labName || 'Active Lab'}</h1>
        <LabTimer />
      </header>

      <main className="lab-content">
        {/* Node terminals or other lab UI */}
        <Terminal disabled={isPaused} />
      </main>

      {isPaused && (
        <div className="paused-overlay">
          <span className="paused-text">PAUSED</span>
        </div>
      )}
    </div>
  );
}

export default LabView;
