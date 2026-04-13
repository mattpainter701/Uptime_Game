import { useGameStore } from '../../store/gameStore';

const DEFAULT_TOPOLOGY = `
    ┌─────────────────────────────────────────┐
    │           NETOPS TOWER NETWORK           │
    │                                          │
    │   [Internet]                             │
    │       │                                  │
    │   [R1-Edge]──[FW1]                       │
    │       │          │                       │
    │   [SW-Core]──[SW-Core2]                  │
    │    │    │      │    │                    │
    │  [SW1] [SW2] [SW3] [SW4]                │
    │   │     │     │     │                    │
    │  Fl.1  Fl.2  DC   Lobby                 │
    └─────────────────────────────────────────┘
`;

export function WhiteboardPanel() {
  const { setView, activeTicket } = useGameStore();

  const topology = activeTicket?.topology || DEFAULT_TOPOLOGY;
  const validationCriteria = activeTicket?.validation || [];

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[85vh] m-4 glass-panel flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📝</span>
            <div>
              <h2 className="text-xl font-bold text-white">Whiteboard</h2>
              <p className="text-sm text-gray-400">
                {activeTicket ? `Topology for: ${activeTicket.title}` : 'Building Network Overview'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setView('office')}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xl"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Topology diagram */}
          <div className="bg-black/40 rounded-lg p-6 mb-6 border border-gray-700">
            <pre className="text-green-400 font-mono text-sm leading-relaxed whitespace-pre">
              {topology}
            </pre>
          </div>

          {/* Active ticket info */}
          {activeTicket && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-white/5 border border-gray-600">
                <h3 className="font-bold text-white mb-2">
                  {activeTicket.id}: {activeTicket.title}
                </h3>
                <p className="text-sm text-gray-400">{activeTicket.description}</p>
              </div>

              {/* Validation checklist */}
              {validationCriteria.length > 0 && (
                <div className="p-4 rounded-lg bg-white/5 border border-gray-600">
                  <h4 className="font-bold text-white mb-3">Validation Criteria</h4>
                  <div className="space-y-2">
                    {validationCriteria.map((criteria, i) => {
                      const params = criteria.params as Record<string, unknown>;
                      let label = '';
                      if (criteria.type === 'ping') {
                        label = `Ping ${params.destination} from ${params.source}`;
                      } else if (criteria.type === 'command') {
                        label = `Run '${params.command}' on ${params.node}`;
                      } else if (criteria.type === 'config') {
                        label = `Apply config on ${params.node}`;
                      }
                      return (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="text-yellow-400">○</span>
                          <span className="text-gray-300">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Nodes */}
              {activeTicket.nodes && activeTicket.nodes.length > 0 && (
                <div className="p-4 rounded-lg bg-white/5 border border-gray-600">
                  <h4 className="font-bold text-white mb-3">Lab Nodes</h4>
                  <div className="flex flex-wrap gap-2">
                    {activeTicket.nodes.map((node) => (
                      <div
                        key={node.id}
                        className="px-3 py-1.5 rounded bg-gray-700 text-sm flex items-center gap-2"
                      >
                        <span className={node.status === 'running' ? 'text-green-400' : 'text-red-400'}>●</span>
                        <span className="text-gray-200">{node.name}</span>
                        <span className="text-gray-500 text-xs">({node.type})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!activeTicket && (
            <p className="text-gray-500 text-center">
              Accept a ticket to see its specific topology here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
