import { useSessionHistoryStore } from '../../store/sessionHistoryStore';
import { useState, useEffect } from 'react';

interface SessionReplayProps {
  sessionId: string;
  onClose: () => void;
}

export function SessionReplay({ sessionId, onClose }: SessionReplayProps) {
  const session = useSessionHistoryStore((state) => state.getSession(sessionId));
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Auto‑advance playback
  useEffect(() => {
    if (!isPlaying || !session) return;
    if (currentStep >= session.terminalHistory.length) {
      setIsPlaying(false);
      return;
    }
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= session.terminalHistory.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 600); // 600ms per step
    return () => clearInterval(timer);
  }, [isPlaying, session, currentStep]);

  if (!session) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-gray-900 p-6 rounded text-white font-mono text-center">
          <p className="text-red-400">Session not found.</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-cyan-700 rounded hover:bg-cyan-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const visibleHistory = session.terminalHistory.slice(0, currentStep + 1);
  const maxStep = Math.max(0, session.terminalHistory.length - 1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-gray-950 border border-cyan-500/30 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl text-cyan-400 font-mono">
            Replay: {session.labName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Terminal output (read‑only) */}
        <div className="flex-1 overflow-y-auto bg-black p-4 rounded border border-gray-700 mb-4 font-mono text-sm text-green-400 whitespace-pre-wrap min-h-[300px]">
          {visibleHistory.length === 0 ? (
            <span className="text-gray-500">No terminal output recorded.</span>
          ) : (
            visibleHistory.join('\n')
          )}
        </div>

        {/* Playback controls */}
        <div className="flex items-center space-x-3 mb-4">
          <button
            onClick={() => { setCurrentStep(0); setIsPlaying(false); }}
            disabled={currentStep === 0}
            className="px-3 py-1 bg-gray-700 rounded text-white disabled:opacity-50 font-mono text-sm"
            title="Go to start"
          >
            ⏮
          </button>
          <button
            onClick={() => { setCurrentStep(Math.max(0, currentStep - 1)); setIsPlaying(false); }}
            disabled={currentStep === 0}
            className="px-3 py-1 bg-gray-700 rounded text-white disabled:opacity-50 font-mono text-sm"
            title="Step backward"
          >
            ◀
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-4 py-1 bg-cyan-700 hover:bg-cyan-600 rounded text-white font-mono text-sm"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            onClick={() => { setCurrentStep(Math.min(maxStep, currentStep + 1)); setIsPlaying(false); }}
            disabled={currentStep >= maxStep}
            className="px-3 py-1 bg-gray-700 rounded text-white disabled:opacity-50 font-mono text-sm"
            title="Step forward"
          >
            ▶
          </button>
          <button
            onClick={() => { setCurrentStep(maxStep); setIsPlaying(false); }}
            disabled={currentStep >= maxStep}
            className="px-3 py-1 bg-gray-700 rounded text-white disabled:opacity-50 font-mono text-sm"
            title="Go to end"
          >
            ⏭
          </button>
          <input
            type="range"
            min={0}
            max={maxStep}
            value={currentStep}
            onChange={(e) => {
              setCurrentStep(Number(e.target.value));
              setIsPlaying(false);
            }}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            aria-label="Playback slider"
          />
          <span className="text-gray-400 text-sm font-mono w-20 text-right">
            {currentStep + 1} / {session.terminalHistory.length}
          </span>
        </div>

        {/* Node configuration snapshot (collapsible) */}
        {session.nodeConfigs && (
          <details className="mt-2">
            <summary className="text-gray-300 cursor-pointer font-mono text-sm hover:text-cyan-400">
              Node Configurations
            </summary>
            <pre className="mt-2 p-3 bg-gray-800 rounded text-xs text-gray-400 overflow-auto max-h-40">
              {JSON.stringify(session.nodeConfigs, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
