import { useGameStore } from '../../store/gameStore';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export function TicketResultScreen() {
  const lastTicketResult = useGameStore((s) => s.lastTicketResult);
  const player = useGameStore((s) => s.player);
  const setView = useGameStore((s) => s.setView);
  const clearLastTicketResult = useGameStore((s) => s.clearLastTicketResult);

  if (!lastTicketResult) {
    // No result to show — go back to office
    setView('office');
    return null;
  }

  const isSuccess = lastTicketResult.outcome === 'completed';
  const scorePercent = Math.round(lastTicketResult.validationScore * 100);
  const scoreColor =
    scorePercent >= 90 ? 'text-green-400' :
    scorePercent >= 70 ? 'text-yellow-400' : 'text-red-400';

  const handleNextTicket = () => {
    clearLastTicketResult();
    setView('tickets');
  };

  const handleBackToOffice = () => {
    clearLastTicketResult();
  };

  const handleViewSummary = () => {
    setView('sessionSummary');
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg m-4 glass-panel overflow-hidden">
        {/* Header */}
        <div className={`p-6 text-center ${isSuccess ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
          <div className={`text-6xl mb-4 ${isSuccess ? 'animate-bounce' : 'animate-pulse'}`}>
            {isSuccess ? '✅' : '❌'}
          </div>
          <h1 className={`text-3xl font-bold ${isSuccess ? 'text-green-400' : 'text-red-400'}`}>
            {isSuccess ? 'Ticket Complete!' : 'Ticket Failed'}
          </h1>
          <p className={`mt-2 text-lg ${isSuccess ? 'text-green-300/70' : 'text-red-300/70'}`}>
            {isSuccess
              ? 'Great work! The network is operational again.'
              : lastTicketResult.timeTaken >= (lastTicketResult.difficulty * 120)
                ? 'Time ran out. Try again with a faster approach!'
                : 'Ticket abandoned. Better luck next time!'}
          </p>
        </div>

        {/* Ticket info */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div className="flex-1">
              <div className="font-bold text-white text-lg">{lastTicketResult.title}</div>
              <div className="text-sm text-gray-400">
                <span className="text-cyan-400">{lastTicketResult.ticketId}</span>
                <span className="mx-2">•</span>
                <span className="capitalize">{lastTicketResult.category.replace(/-/g, ' ')}</span>
                <span className="mx-2">•</span>
                <span>Difficulty: {'⭐'.repeat(lastTicketResult.difficulty)}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4">
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-4">
              {isSuccess && (
                <>
                  <StatBox
                    icon="💰"
                    label="Credits Earned"
                    value={`$${lastTicketResult.creditsEarned.toLocaleString()}`}
                    color="text-green-400"
                    sub={
                      lastTicketResult.uptimeBonus > 1
                        ? `Base: $${Math.floor(lastTicketResult.creditsEarned / lastTicketResult.uptimeBonus).toLocaleString()} + Uptime Bonus (${lastTicketResult.uptimeBonus.toFixed(1)}x)`
                        : undefined
                    }
                  />
                  <StatBox
                    icon="📊"
                    label="XP Gained"
                    value={`${lastTicketResult.xpEarned.toLocaleString()} XP`}
                    color="text-cyan-400"
                  />
                  <StatBox
                    icon="⏱️"
                    label="Time Taken"
                    value={formatTime(lastTicketResult.timeTaken)}
                    color="text-yellow-400"
                  />
                  <StatBox
                    icon="✅"
                    label="Validation Score"
                    value={`${scorePercent}%`}
                    color={scoreColor}
                    sub={
                      <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-1000 ${
                            scorePercent >= 90 ? 'bg-green-500' :
                            scorePercent >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${scorePercent}%` }}
                        />
                      </div>
                    }
                  />
                  {lastTicketResult.hintsUsed > 0 && (
                    <StatBox
                      icon="💡"
                      label="Hints Used"
                      value={`${lastTicketResult.hintsUsed}`}
                      color="text-purple-400"
                    />
                  )}
                  {lastTicketResult.uptimeBonus > 1 && (
                    <StatBox
                      icon="📈"
                      label="Uptime Bonus"
                      value={`${lastTicketResult.uptimeBonus.toFixed(1)}x`}
                      color="text-emerald-400"
                    />
                  )}
                </>
              )}

              {!isSuccess && (
                <>
                  <StatBox
                    icon="⏱️"
                    label="Time Spent"
                    value={formatTime(lastTicketResult.timeTaken)}
                    color="text-yellow-400"
                  />
                  <StatBox
                    icon="💡"
                    label="Hints Used"
                    value={`${lastTicketResult.hintsUsed}`}
                    color="text-purple-400"
                  />
                  <StatBox
                    icon="⭐"
                    label="Reputation"
                    value={`${player.reputation}`}
                    color="text-red-400"
                    sub="Loss applied for failure"
                  />
                  <StatBox
                    icon="📋"
                    label="Difficulty"
                    value={'⭐'.repeat(lastTicketResult.difficulty)}
                    color="text-gray-400"
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="p-4 border-t border-gray-700 bg-black/20 flex items-center gap-3">
          {isSuccess ? (
            <>
              <button
                onClick={handleNextTicket}
                className="flex-1 px-6 py-3 bg-cyan-500/30 border border-cyan-500 rounded-lg text-cyan-400 font-bold hover:bg-cyan-500/50 transition-all flex items-center justify-center gap-2"
              >
                <span>📋</span>
                Next Ticket
              </button>
              <button
                onClick={handleViewSummary}
                className="flex-1 px-6 py-3 bg-purple-500/20 border border-purple-500/50 rounded-lg text-purple-400 font-bold hover:bg-purple-500/30 transition-all flex items-center justify-center gap-2"
              >
                <span>📊</span>
                View Summary
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleBackToOffice}
                className="flex-1 px-6 py-3 bg-orange-500/20 border border-orange-500/50 rounded-lg text-orange-400 font-bold hover:bg-orange-500/30 transition-all flex items-center justify-center gap-2"
              >
                <span>🔄</span>
                Try Again
              </button>
              <button
                onClick={handleViewSummary}
                className="flex-1 px-6 py-3 bg-purple-500/20 border border-purple-500/50 rounded-lg text-purple-400 font-bold hover:bg-purple-500/30 transition-all flex items-center justify-center gap-2"
              >
                <span>📊</span>
                View Summary
              </button>
            </>
          )}
          <button
            onClick={handleBackToOffice}
            className="px-4 py-3 bg-white/5 border border-gray-600 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

function StatBox({
  icon,
  label,
  value,
  color,
  sub,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
  sub?: React.ReactNode;
}) {
  return (
    <div className="glass-panel p-3">
      <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

export default TicketResultScreen;
