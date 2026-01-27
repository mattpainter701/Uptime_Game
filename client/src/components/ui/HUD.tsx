import { useGameStore } from '../../store/gameStore';

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={i < rating ? 'text-yellow-400' : 'text-gray-600'}
        >
          ★
        </span>
      ))}
    </span>
  );
}

export function HUD() {
  const { player, activeTicket, currentView, setView } = useGameStore();

  return (
    <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 pointer-events-auto">
        {/* Player info */}
        <div className="glass-panel px-4 py-2 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center font-bold text-lg">
              {player.name.charAt(0)}
            </div>
            <div>
              <div className="text-sm font-bold text-cyan-400">{player.name}</div>
              <div className="text-xs text-gray-400">{player.title}</div>
            </div>
          </div>

          <div className="w-px h-8 bg-gray-600" />

          <div className="text-center">
            <div className="text-xs text-gray-400">Level</div>
            <div className="text-lg font-bold text-glow-cyan">{player.level}</div>
          </div>

          <div className="text-center">
            <div className="text-xs text-gray-400">Floor</div>
            <div className="text-lg font-bold text-purple-400">{player.floor}</div>
          </div>
        </div>

        {/* Stats */}
        <div className="glass-panel px-4 py-2 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <div>
              <div className="text-xs text-gray-400">Credits</div>
              <div className="text-lg font-bold text-green-400">${player.credits.toLocaleString()}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xl">⭐</span>
            <div>
              <div className="text-xs text-gray-400">Reputation</div>
              <div className="text-lg font-bold text-yellow-400">{player.reputation}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <div>
              <div className="text-xs text-gray-400">XP</div>
              <div className="text-sm">
                <span className="font-bold text-cyan-400">{player.xp}</span>
                <span className="text-gray-500"> / {player.xp + player.xpToNextLevel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="glass-panel px-2 py-2 flex items-center gap-1">
          {[
            { id: 'office', icon: '🏢', label: 'Office' },
            { id: 'tickets', icon: '📋', label: 'Tickets' },
            { id: 'terminal', icon: '💻', label: 'Terminal' },
            { id: 'shop', icon: '🛒', label: 'Shop' },
            { id: 'settings', icon: '⚙️', label: 'Settings' },
          ].map((nav) => (
            <button
              key={nav.id}
              onClick={() => setView(nav.id as any)}
              className={`px-3 py-2 rounded transition-all ${
                currentView === nav.id
                  ? 'bg-cyan-500/30 text-cyan-400 glow-cyan'
                  : 'hover:bg-white/10 text-gray-400 hover:text-white'
              }`}
              title={nav.label}
            >
              <span className="text-lg">{nav.icon}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active ticket bar */}
      {activeTicket && (
        <div className="mx-4 glass-panel px-4 py-3 pointer-events-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-2xl">📋</span>
              <div>
                <div className="font-bold text-white">{activeTicket.title}</div>
                <div className="text-sm text-gray-400 flex items-center gap-3">
                  <span className="text-cyan-400">{activeTicket.id}</span>
                  <StarRating rating={activeTicket.difficulty} />
                  <span className="text-yellow-400">${activeTicket.rewardCredits}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-xs text-gray-400">Time Remaining</div>
                <div className="text-xl font-mono text-orange-400">
                  {activeTicket.timeLimit}:00
                </div>
              </div>

              <button
                onClick={() => setView('terminal')}
                className="px-4 py-2 bg-cyan-500/30 border border-cyan-500 rounded text-cyan-400 hover:bg-cyan-500/50 transition-all"
              >
                Open Terminal
              </button>

              <button
                className="px-4 py-2 bg-red-500/20 border border-red-500/50 rounded text-red-400 hover:bg-red-500/30 transition-all"
              >
                Abandon
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HUD;
