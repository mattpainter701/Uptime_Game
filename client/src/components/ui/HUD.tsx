import { useGameStore } from '../../store/gameStore';
import { UptimeClockMini } from './UptimeClock';
import { TicketTimerMini } from './TicketTimer';
import { InventoryMini } from './InventoryPanel';
import { DifficultyIndicator } from './DifficultyCurvePanel';

function SaveIndicator() {
  const lastSavedAt = useGameStore((s) => s.lastSavedAt);
  const saveGame = useGameStore((s) => s.saveGame);

  const timeAgo = lastSavedAt
    ? (() => {
        const diff = Math.floor((Date.now() - lastSavedAt) / 1000);
        if (diff < 5) return 'Just now';
        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        return `${Math.floor(diff / 3600)}h ago`;
      })()
    : null;

  return (
    <button
      onClick={saveGame}
      className="flex items-center gap-1 text-xs text-gray-500 hover:text-cyan-400 transition-colors"
      title={lastSavedAt ? `Last saved: ${new Date(lastSavedAt).toLocaleString()}` : 'Click to save'}
    >
      <span>💾</span>
      {timeAgo && <span className="hidden sm:inline">{timeAgo}</span>}
    </button>
  );
}

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

const FLOOR_DISPLAY_NAMES: Record<string, string> = {
  'basement': 'B',
  'lobby': 'L',
  'floor1': '1',
  'floor2': '2',
  'floor3': '3',
};

export function HUD() {
  const { player, activeTicket, currentView, setView, uptime, failTicket, playerPosition, currentFloor } = useGameStore();

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
            <div className="text-lg font-bold text-purple-400">{FLOOR_DISPLAY_NAMES[currentFloor] || currentFloor}</div>
          </div>
        </div>

        {/* Stats - Cash, Uptime, Reputation */}
        <div className="glass-panel px-4 py-2 flex items-center gap-4">
          {/* Cash */}
          <div className="flex items-center gap-2">
            <span className="text-xl">💵</span>
            <div>
              <div className="text-xs text-gray-400">Cash</div>
              <div className="text-lg font-bold text-green-400">${player.credits.toLocaleString()}</div>
            </div>
          </div>

          <div className="w-px h-8 bg-gray-600" />

          {/* Uptime Clock - Center */}
          <div className="flex items-center gap-2">
            <span className="text-xl">⏱️</span>
            <div>
              <div className="text-xs text-gray-400">Uptime</div>
              {uptime.isTracking ? (
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold font-mono ${
                    uptime.uptimePercentage >= 99 ? 'text-green-400' :
                    uptime.uptimePercentage >= 95 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {uptime.uptimePercentage.toFixed(1)}%
                  </span>
                  <span className="text-xs text-green-400">+{uptime.pointsEarned}</span>
                </div>
              ) : (
                <div className="text-lg font-bold text-gray-500">--.--%</div>
              )}
            </div>
          </div>

          <div className="w-px h-8 bg-gray-600" />

          {/* Reputation */}
          <div className="flex items-center gap-2">
            <span className="text-xl">⭐</span>
            <div>
              <div className="text-xs text-gray-400">Reputation</div>
              <div className="text-lg font-bold text-yellow-400">{player.reputation}</div>
            </div>
          </div>

          <div className="w-px h-8 bg-gray-600" />

          {/* XP */}
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

          <div className="w-px h-8 bg-gray-600" />

          {/* Inventory */}
          <div className="flex items-center gap-2">
            <span className="text-xl">🎒</span>
            <div>
              <div className="text-xs text-gray-400">Equipment</div>
              <InventoryMini />
            </div>
          </div>

          <div className="w-px h-8 bg-gray-600" />

          {/* Difficulty Indicator */}
          <DifficultyIndicator />

          <div className="w-px h-8 bg-gray-600" />

          {/* Save */}
          <SaveIndicator />
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
              {/* Uptime stats */}
              {uptime.isTracking && (
                <UptimeClockMini
                  isTracking={uptime.isTracking}
                  startedAt={uptime.startedAt}
                  uptimePercentage={uptime.uptimePercentage}
                  pointsEarned={uptime.pointsEarned}
                />
              )}

              {/* Time remaining */}
              <div className="text-center">
                <div className="text-xs text-gray-400">Time</div>
                {activeTicket.startedAt ? (
                  <TicketTimerMini
                    timeLimit={activeTicket.timeLimit}
                    startedAt={activeTicket.startedAt}
                  />
                ) : (
                  <div className="text-xl font-mono text-orange-400">
                    {activeTicket.timeLimit}:00
                  </div>
                )}
              </div>

              <button
                onClick={() => setView('terminal')}
                className="px-4 py-2 bg-cyan-500/30 border border-cyan-500 rounded text-cyan-400 hover:bg-cyan-500/50 transition-all"
              >
                Open Terminal
              </button>

              <button
                onClick={failTicket}
                className="px-4 py-2 bg-red-500/20 border border-red-500/50 rounded text-red-400 hover:bg-red-500/30 transition-all"
              >
                Abandon
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Movement Controls Hint - Bottom of screen */}
      {currentView === 'office' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
          <div className="glass-panel px-4 py-2 text-center">
            <div className="flex items-center gap-4 text-sm">
              {playerPosition.pose === 'seated' ? (
                <>
                  <span className="text-gray-400">
                    <kbd className="px-2 py-1 bg-gray-700 rounded text-cyan-400 font-mono">SPACE</kbd>
                    <span className="ml-2">Stand Up</span>
                  </span>
                  {currentFloor === 'basement' && (
                    <>
                      <span className="text-gray-500">|</span>
                      <span className="text-gray-400">
                        <kbd className="px-2 py-1 bg-cyan-600 rounded text-white font-mono animate-pulse">F</kbd>
                        <span className="ml-2 text-cyan-400">Use Computer</span>
                      </span>
                    </>
                  )}
                </>
              ) : (
                <>
                  <span className="text-gray-400">
                    <kbd className="px-2 py-1 bg-gray-700 rounded text-cyan-400 font-mono">WASD</kbd>
                    <span className="ml-2">Move</span>
                  </span>
                  <span className="text-gray-500">|</span>
                  <span className="text-gray-400">
                    <kbd className="px-2 py-1 bg-gray-700 rounded text-cyan-400 font-mono">SHIFT</kbd>
                    <span className="ml-2">Run</span>
                  </span>
                  <span className="text-gray-500">|</span>
                  <span className="text-gray-400">
                    <kbd className="px-2 py-1 bg-gray-700 rounded text-cyan-400 font-mono">SPACE</kbd>
                    <span className="ml-2">Jump</span>
                  </span>
                  <span className="text-gray-500">|</span>
                  <span className="text-gray-400">
                    <kbd className="px-2 py-1 bg-gray-700 rounded text-cyan-400 font-mono">E</kbd>
                    <span className="ml-2">Sit</span>
                  </span>
                  {/* Show F key hint when near desk in basement */}
                  {currentFloor === 'basement' &&
                   playerPosition.x >= -2 && playerPosition.x <= 2 &&
                   playerPosition.z >= -3 && playerPosition.z <= 0.5 && (
                    <>
                      <span className="text-gray-500">|</span>
                      <span className="text-gray-400">
                        <kbd className="px-2 py-1 bg-cyan-600 rounded text-white font-mono animate-pulse">F</kbd>
                        <span className="ml-2 text-cyan-400">Use Computer</span>
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HUD;
