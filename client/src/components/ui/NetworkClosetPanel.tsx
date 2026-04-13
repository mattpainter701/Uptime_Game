import { useGameStore } from '../../store/gameStore';

export function NetworkClosetPanel() {
  const { setView, activeTicket } = useGameStore();

  const isSwitchingTicket = activeTicket?.category === 'switching';

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[80vh] m-4 glass-panel flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔌</span>
            <div>
              <h2 className="text-xl font-bold text-white">Network Closet</h2>
              <p className="text-sm text-gray-400">Switch rack and patch panel</p>
            </div>
          </div>
          <button
            onClick={() => setView('office')}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xl"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Switch rack visualization */}
          <div className="bg-black/40 rounded-lg p-4 border border-gray-700">
            <h3 className="text-sm font-bold text-gray-400 mb-3">SWITCH RACK</h3>
            <div className="space-y-2">
              {['SW1 - Cisco 2960', 'SW2 - Cisco 3750'].map((sw, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded bg-gray-800 border border-gray-600">
                  <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-green-400 font-mono text-sm">{sw}</span>
                  <div className="flex-1 flex justify-end gap-1">
                    {Array.from({ length: 24 }, (_, j) => (
                      <div
                        key={j}
                        className={`w-1.5 h-3 rounded-sm ${j < 12 ? 'bg-green-500/60' : 'bg-gray-600'}`}
                        title={`Port ${j + 1}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Patch panel */}
          <div className="bg-black/40 rounded-lg p-4 border border-gray-700">
            <h3 className="text-sm font-bold text-gray-400 mb-3">PATCH PANEL</h3>
            <div className="grid grid-cols-12 gap-1.5">
              {Array.from({ length: 48 }, (_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-sm bg-gray-700 border border-gray-600 flex items-center justify-center text-[8px] text-gray-500 hover:bg-cyan-500/30 hover:border-cyan-500/50 cursor-pointer transition-all"
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Status / guidance */}
          {isSwitchingTicket ? (
            <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
              <p className="text-cyan-400 text-sm">
                You have an active switching ticket. The network closet equipment is available for inspection.
                Use the terminal to configure switch ports.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-white/5 border border-gray-600">
              <p className="text-gray-400 text-sm">
                The network closet houses the floor's switching infrastructure.
                Accept a switching ticket to work with this equipment.
              </p>
            </div>
          )}

          {/* Cable tray visualization */}
          <div className="bg-black/40 rounded-lg p-4 border border-gray-700">
            <h3 className="text-sm font-bold text-gray-400 mb-3">CABLE TRAY</h3>
            <div className="flex gap-2">
              {['🔵 Cat6 Blue', '🟡 Cat6 Yellow', '🔴 Fiber OM4', '🟢 Cat6 Green'].map((cable, i) => (
                <div key={i} className="px-2 py-1 rounded bg-gray-800 text-xs text-gray-400">
                  {cable}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
