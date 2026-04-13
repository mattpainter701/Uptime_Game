import { useGameStore } from '../../store/gameStore';

export function ServerRackPanel() {
  const { setView, activeTicket, hasItem, useItem } = useGameStore();

  const isSystemsTicket = activeTicket?.category === 'systems';

  const handleSwapDrive = () => {
    if (useItem('ssd')) {
      notify('SSD swapped successfully!', 'success', '💾');
    } else {
      notify('You need an SSD drive from the supply table', 'warning', '💾');
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[80vh] m-4 glass-panel flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🖥️</span>
            <div>
              <h2 className="text-xl font-bold text-white">Server Rack</h2>
              <p className="text-sm text-gray-400">Datacenter server infrastructure</p>
            </div>
          </div>
          <button
            onClick={() => setView('office')}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xl"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Server rack visualization */}
          <div className="bg-black/40 rounded-lg p-4 border border-gray-700">
            <h3 className="text-sm font-bold text-gray-400 mb-3">RACK A - PRODUCTION SERVERS</h3>
            <div className="space-y-1.5">
              {[
                { name: 'WEB-01', status: 'healthy', cpu: 34, mem: 62 },
                { name: 'WEB-02', status: 'healthy', cpu: 28, mem: 55 },
                { name: 'DB-01', status: isSystemsTicket ? 'warning' : 'healthy', cpu: isSystemsTicket ? 92 : 45, mem: 78 },
                { name: 'DB-02', status: 'healthy', cpu: 41, mem: 71 },
                { name: 'APP-01', status: isSystemsTicket ? 'critical' : 'healthy', cpu: isSystemsTicket ? 98 : 22, mem: isSystemsTicket ? 95 : 44 },
                { name: 'APP-02', status: 'healthy', cpu: 19, mem: 38 },
                { name: 'BACKUP-01', status: 'healthy', cpu: 5, mem: 20 },
                { name: 'MONITOR-01', status: 'healthy', cpu: 15, mem: 33 },
              ].map((server) => (
                <div
                  key={server.name}
                  className={`flex items-center gap-3 p-2.5 rounded border ${
                    server.status === 'critical'
                      ? 'bg-red-500/10 border-red-500/40'
                      : server.status === 'warning'
                      ? 'bg-yellow-500/10 border-yellow-500/40'
                      : 'bg-gray-800 border-gray-700'
                  }`}
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      server.status === 'critical'
                        ? 'bg-red-500 animate-pulse'
                        : server.status === 'warning'
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                  />
                  <span className="font-mono text-sm text-gray-200 w-24">{server.name}</span>
                  <div className="flex-1 flex items-center gap-4 text-xs">
                    <span className={`${server.cpu > 80 ? 'text-red-400' : 'text-gray-400'}`}>
                      CPU: {server.cpu}%
                    </span>
                    <span className={`${server.mem > 85 ? 'text-red-400' : 'text-gray-400'}`}>
                      MEM: {server.mem}%
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    server.status === 'critical'
                      ? 'bg-red-500/30 text-red-400'
                      : server.status === 'warning'
                      ? 'bg-yellow-500/30 text-yellow-400'
                      : 'bg-green-500/30 text-green-400'
                  }`}>
                    {server.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          {isSystemsTicket && (
            <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
              <h3 className="font-bold text-cyan-400 mb-3">Maintenance Actions</h3>
              <div className="flex gap-3">
                <button
                  onClick={handleSwapDrive}
                  disabled={!hasItem('ssd')}
                  className={`px-4 py-2 rounded text-sm font-bold ${
                    hasItem('ssd')
                      ? 'bg-green-500/30 border border-green-500 text-green-400 hover:bg-green-500/50'
                      : 'bg-gray-700 border border-gray-600 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  💾 Swap Drive {!hasItem('ssd') && '(Need SSD)'}
                </button>
                <button
                  className="px-4 py-2 rounded text-sm font-bold bg-yellow-500/30 border border-yellow-500 text-yellow-400 hover:bg-yellow-500/50"
                >
                  🔄 Reboot Server
                </button>
                <button
                  className="px-4 py-2 rounded text-sm font-bold bg-cyan-500/30 border border-cyan-500 text-cyan-400 hover:bg-cyan-500/50"
                >
                  📋 Check Logs
                </button>
              </div>
            </div>
          )}

          {!isSystemsTicket && (
            <div className="p-4 rounded-lg bg-white/5 border border-gray-600">
              <p className="text-gray-400 text-sm">
                All servers are running normally. Accept a systems ticket to perform maintenance tasks.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Need to import notify for the drive swap
import { notify } from '../../store/notificationStore';
