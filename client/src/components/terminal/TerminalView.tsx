import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Terminal } from './Terminal';

// Demo lab nodes
const DEMO_NODES = [
  { id: 1, name: 'R1', type: 'router', status: 'running' as const },
  { id: 2, name: 'R2', type: 'router', status: 'running' as const },
  { id: 3, name: 'SW1', type: 'switch', status: 'running' as const },
  { id: 4, name: 'PC1', type: 'linux', status: 'stopped' as const },
];

function TopologyView() {
  return (
    <div className="h-full flex flex-col">
      <div className="text-sm text-gray-400 mb-2">Network Topology</div>
      <div className="flex-1 bg-black/30 rounded border border-gray-700 p-4 flex items-center justify-center">
        {/* Simple ASCII art topology */}
        <pre className="text-cyan-400 text-sm font-mono">
{`
    ┌─────┐         ┌─────┐
    │ R1  │─────────│ R2  │
    └──┬──┘         └──┬──┘
       │               │
    ┌──┴──┐         ┌──┴──┐
    │ SW1 │         │ SW2 │
    └──┬──┘         └─────┘
       │
    ┌──┴──┐
    │ PC1 │
    └─────┘
`}
        </pre>
      </div>
    </div>
  );
}

function NodeList({
  nodes,
  activeNode,
  onSelectNode,
  disabled,
}: {
  nodes: typeof DEMO_NODES;
  activeNode: number | null;
  onSelectNode: (id: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm text-gray-400 mb-2">Nodes</div>
      {nodes.map((node) => (
        <button
          key={node.id}
          onClick={() => onSelectNode(node.id)}
          disabled={disabled}
          className={`w-full flex items-center gap-3 p-2 rounded transition-all ${
            disabled
              ? 'cursor-not-allowed opacity-50'
              : activeNode === node.id
                ? 'bg-cyan-500/30 border border-cyan-500'
                : 'bg-black/20 border border-transparent hover:bg-white/10'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${
            node.status === 'running' ? 'bg-green-500' : 'bg-gray-500'
          }`} />
          <span className="text-white font-mono">{node.name}</span>
          <span className="text-gray-500 text-xs">{node.type}</span>
        </button>
      ))}
    </div>
  );
}

function TicketDetails() {
  const { activeTicket, revealHint, player, completeTicket, failTicket, sessionState } = useGameStore();
  const isPaused = sessionState.isPaused;

  if (!activeTicket) {
    return (
      <div className="text-center text-gray-400 py-4">
        <p>No active ticket</p>
        <p className="text-sm">Accept a ticket to see details here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-cyan-400 mb-1">{activeTicket.id}</div>
        <div className="font-bold text-white">{activeTicket.title}</div>
      </div>

      <p className="text-sm text-gray-300 leading-relaxed">
        {activeTicket.description}
      </p>

      <div className="border-t border-gray-700 pt-4">
        <div className="text-sm text-gray-400 mb-2">Hints</div>
        <div className="space-y-2">
          {activeTicket.hints.map((hint, i) => (
            <div key={i} className="flex items-start gap-2">
              {hint.revealed ? (
                <div className="flex-1 text-sm text-yellow-400 bg-yellow-500/10 p-2 rounded">
                  💡 {hint.text}
                </div>
              ) : (
                <button
                  onClick={() => revealHint(i)}
                  disabled={player.credits < hint.cost || isPaused}
                  className={`flex-1 text-sm p-2 rounded border ${
                    player.credits >= hint.cost && !isPaused
                      ? 'bg-white/5 border-gray-600 hover:bg-white/10 text-gray-300'
                      : 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  🔒 Reveal hint (${hint.cost})
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-700 pt-4 flex gap-2">
        <button
          onClick={completeTicket}
          disabled={isPaused}
          className={`flex-1 py-2 rounded font-bold ${
            isPaused
              ? 'bg-gray-700 border border-gray-600 text-gray-500 cursor-not-allowed'
              : 'bg-green-500/30 border border-green-500 text-green-400 hover:bg-green-500/50'
          }`}
        >
          Submit Solution
        </button>
        <button
          onClick={failTicket}
          disabled={isPaused}
          className={`px-4 py-2 rounded ${
            isPaused
              ? 'bg-gray-700 border border-gray-600 text-gray-500 cursor-not-allowed'
              : 'bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30'
          }`}
        >
          Abandon
        </button>
      </div>
    </div>
  );
}

// Pause banner shown at top of terminal view
function PauseBanner() {
  const resumeGame = useGameStore((state) => state.resumeGame);

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/30 text-yellow-300">
      <div className="flex items-center gap-3">
        <span className="text-lg">⏸️</span>
        <span className="font-bold text-sm tracking-wider">GAME PAUSED</span>
        <span className="text-xs text-yellow-500/60">— Terminal input disabled</span>
      </div>
      <button
        onClick={resumeGame}
        className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/40 rounded text-yellow-300 text-sm hover:bg-yellow-500/30 transition-all"
      >
        ▶ Resume
      </button>
    </div>
  );
}

export function TerminalView() {
  const { setView, activeTicket, sessionState } = useGameStore();
  const [activeNode, setActiveNode] = useState<number | null>(1);
  const activeNodeData = DEMO_NODES.find(n => n.id === activeNode);
  const isPaused = sessionState.isPaused;

  return (
    <div className="absolute inset-0 flex z-20 bg-[#0a0a15]">
      {/* Left panel - Topology & Nodes */}
      <div className="w-64 flex flex-col border-r border-gray-800 bg-[#0d0d1a]">
        <div className="p-4 border-b border-gray-800">
          <button
            onClick={() => !isPaused && setView('office')}
            disabled={isPaused}
            className={`flex items-center gap-2 transition-colors ${
              isPaused ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>←</span>
            <span>Back to Office</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <TopologyView />
          <NodeList
            nodes={DEMO_NODES}
            activeNode={activeNode}
            onSelectNode={setActiveNode}
            disabled={isPaused}
          />
        </div>
      </div>

      {/* Center - Terminal */}
      <div className="flex-1 flex flex-col">
        {/* Pause banner */}
        {isPaused && <PauseBanner />}

        <div className="flex-1 flex flex-col p-4">
          {activeNode && activeNodeData ? (
            <Terminal
              nodeName={activeNodeData.name}
              onClose={() => setActiveNode(null)}
              isPaused={isPaused}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-xl mb-2">Select a node to connect</p>
                <p className="text-sm">Choose from the node list on the left</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right panel - Ticket details */}
      <div className="w-80 flex flex-col border-l border-gray-800 bg-[#0d0d1a]">
        <div className="p-4 border-b border-gray-800">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span>📋</span>
            <span>Ticket Details</span>
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <TicketDetails />
        </div>

        {/* Quick stats */}
        <div className="p-4 border-t border-gray-800 bg-black/20">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-xs text-gray-400">Reward</div>
              <div className="text-green-400 font-bold">
                ${activeTicket?.rewardCredits || 0}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">XP</div>
              <div className="text-cyan-400 font-bold">
                +{activeTicket?.rewardXp || 0}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TerminalView;
