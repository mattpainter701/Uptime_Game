import { useSessionHistoryStore } from '../../store/sessionHistoryStore';

interface SessionHistoryPanelProps {
  onReplay: (sessionId: string) => void;
  onClose: () => void;
}

export function SessionHistoryPanel({ onReplay, onClose }: SessionHistoryPanelProps) {
  const sessions = useSessionHistoryStore((state) => state.sessions);

  const formatTime = (timestamp: number) =>
    new Date(timestamp).toLocaleString();

  const formatDuration = (seconds?: number) => {
    if (seconds === undefined) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div
      className="session-history-panel fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl text-cyan-400 font-mono">Lab Session History</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {sessions.length === 0 ? (
          <p className="text-gray-500 font-mono">No sessions recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="bg-gray-800/50 p-4 rounded border border-gray-700 hover:border-cyan-500/50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="text-white font-semibold">{session.labName}</h3>
                    <p className="text-gray-400 text-sm font-mono">
                      {session.labPath}
                    </p>
                    <p className="text-gray-400 text-sm">
                      Start: {formatTime(session.startTime)}
                    </p>
                    {session.endTime && (
                      <p className="text-gray-400 text-sm">
                        End: {formatTime(session.endTime)}
                      </p>
                    )}
                    <p className="text-gray-400 text-sm">
                      Duration: {formatDuration(session.duration)}
                    </p>
                    <span
                      className={`inline-block mt-1 px-2 py-1 text-xs font-mono rounded ${
                        session.status === 'completed'
                          ? 'bg-green-900/50 text-green-400'
                          : 'bg-yellow-900/50 text-yellow-400'
                      }`}
                    >
                      {session.status.toUpperCase()}
                    </span>
                  </div>
                  <button
                    onClick={() => onReplay(session.id)}
                    className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 text-white text-sm rounded transition-colors font-mono"
                  >
                    Replay
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
