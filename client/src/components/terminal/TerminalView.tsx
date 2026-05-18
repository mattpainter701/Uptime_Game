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
  const { activeTicket, revealHint, player, completeTicket, failTicket, sessionState, sandboxState } = useGameStore();
  const isPaused = sessionState.isPaused;
  const isSandbox = sandboxState.active;

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
      {isSandbox && (
        <div className="px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded text-amber-400 text-xs font-bold text-center tracking-wider">
          🧪 SANDBOX MODE — Practice Only
        </div>
      )}

      <div>
        <div className="text-xs text-cyan-400 mb-1">{activeTicket.id}</div>
        <div className="font-bold text-white">{activeTicket.title}</div>
      </div>

      <p className="text-sm text-gray-300 leading-relaxed">
        {activeTicket.description}
      </p>

      <div className="border-t border-gray-700 pt-4">
        <div className="text-sm text-gray-400 mb-2">
          Hints {isSandbox && <span className="text-amber-400 text-xs">(free in sandbox)</span>}
        </div>
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
                  disabled={!isSandbox && (player.credits < hint.cost || isPaused)}
                  className={`flex-1 text-sm p-2 rounded border ${
                    (isSandbox || player.credits >= hint.cost) && !isPaused
                      ? 'bg-white/5 border-gray-600 hover:bg-white/10 text-gray-300'
                      : 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isSandbox ? `💡 Hint ${i + 1} (free)` : `🔒 Reveal hint ($${hint.cost})`}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-700 pt-4 flex gap-2">
        {isSandbox ? (
          <>
            <button
              onClick={completeTicket}
              className="flex-1 py-2 rounded font-bold bg-green-500/30 border border-green-500 text-green-400 hover:bg-green-500/50"
            >
              ✓ Done (Return to Browser)
            </button>
            <button
              onClick={failTicket}
              className="px-4 py-2 rounded bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30"
            >
              Back
            </button>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}

// Command reference for sandbox mode
function CommandReference() {
  const activeTicket = useGameStore((s) => s.activeTicket);
  const [searchTerm, setSearchTerm] = useState('');

  // Derive commands from the ticket hints
  const commands = activeTicket
    ? activeTicket.hints.map(h => {
        // Extract command from hint text if it contains a command-like pattern
        const cmdMatch = h.text.match(/Command:\s*(.+)/);
        const showMatch = h.text.match(/'([^']+)'/);
        const cmd = cmdMatch ? cmdMatch[1].trim() : showMatch ? showMatch[1] : h.text;
        return { description: h.text, command: cmd.length < 80 ? cmd : undefined };
      })
    : [];

  const filtered = searchTerm
    ? commands.filter(c =>
        c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.command && c.command.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : commands;

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-400">Command Reference</div>

      <input
        type="text"
        placeholder="Filter commands..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="w-full px-2 py-1.5 bg-black/30 border border-gray-700 rounded text-xs text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
      />

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-600">No commands found</p>
        ) : (
          filtered.map((cmd, i) => (
            <div key={i} className="p-2 bg-black/20 rounded border border-gray-800">
              {cmd.command && (
                <div className="font-mono text-xs text-green-400 mb-1">{cmd.command}</div>
              )}
              <div className="text-xs text-gray-500">{cmd.description.slice(0, 100)}</div>
            </div>
          ))
        )}
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

// Sandbox toolbar shown above terminal in sandbox mode
function SandboxToolbar() {
  const { resetSandboxLab, toggleSandboxSolution, toggleSandboxDiff, sandboxState } = useGameStore();

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/5 border-b border-amber-500/20">
      <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded">
        <span className="text-amber-400 text-xs font-bold tracking-wider">🧪 SANDBOX</span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <button
          onClick={resetSandboxLab}
          className="px-3 py-1 bg-white/5 border border-gray-700 rounded text-xs text-gray-400 hover:bg-white/10 hover:text-white transition-all"
          title="Reset lab to initial broken state"
        >
          🔄 Reset Lab
        </button>

        <button
          onClick={toggleSandboxSolution}
          className={`px-3 py-1 rounded text-xs transition-all ${
            sandboxState.showSolution
              ? 'bg-green-500/20 border border-green-500/50 text-green-400'
              : 'bg-white/5 border border-gray-700 text-gray-400 hover:bg-white/10 hover:text-white'
          }`}
          title="Show expected solution"
        >
          💡 Solution
        </button>

        <button
          onClick={toggleSandboxDiff}
          className={`px-3 py-1 rounded text-xs transition-all ${
            sandboxState.showDiff
              ? 'bg-purple-500/20 border border-purple-500/50 text-purple-400'
              : 'bg-white/5 border border-gray-700 text-gray-400 hover:bg-white/10 hover:text-white'
          }`}
          title="Compare current vs expected config"
        >
          📊 Diff
        </button>
      </div>
    </div>
  );
}

export function TerminalView() {
  const { setView, activeTicket, sessionState, sandboxState, exitSandbox } = useGameStore();
  const [activeNode, setActiveNode] = useState<number | null>(1);
  const activeNodeData = DEMO_NODES.find(n => n.id === activeNode);
  const isPaused = sessionState.isPaused;
  const isSandbox = sandboxState.active;

  const handleBack = () => {
    if (isSandbox) {
      exitSandbox();
    } else if (!isPaused) {
      setView('office');
    }
  };

  return (
    <div className="absolute inset-0 flex z-20 bg-[#0a0a15]">
      {/* Left panel - Topology & Nodes */}
      <div className="w-64 flex flex-col border-r border-gray-800 bg-[#0d0d1a]">
        <div className="p-4 border-b border-gray-800">
          <button
            onClick={handleBack}
            disabled={isPaused && !isSandbox}
            className={`flex items-center gap-2 transition-colors ${
              (isPaused && !isSandbox) ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>←</span>
            <span>{isSandbox ? 'Back to Sandbox' : 'Back to Office'}</span>
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

          {/* Command Reference — visible in sandbox mode */}
          {isSandbox && (
            <div className="border-t border-gray-800 pt-4">
              <CommandReference />
            </div>
          )}
        </div>
      </div>

      {/* Center - Terminal */}
      <div className="flex-1 flex flex-col">
        {/* Sandbox toolbar */}
        {isSandbox && <SandboxToolbar />}

        {/* Pause banner */}
        {isPaused && <PauseBanner />}

        {/* Solution panel — shown when toggled in sandbox */}
        {isSandbox && sandboxState.showSolution && activeTicket && (
          <div className="px-4 py-3 bg-green-500/5 border-b border-green-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-green-400">💡 Solution Guide</span>
              <span className="text-xs text-green-500/60">From ticket hints</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {activeTicket.hints.map((hint, i) => (
                <div key={i} className="text-sm text-gray-300 flex gap-2">
                  <span className="text-cyan-400 font-mono shrink-0">Step {i + 1}:</span>
                  <span>{hint.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Diff panel — placeholder for when toggled */}
        {isSandbox && sandboxState.showDiff && (
          <div className="px-4 py-3 bg-purple-500/5 border-b border-purple-500/20">
            <div className="text-sm font-bold text-purple-400 mb-2">📊 Config Diff</div>
            <div className="text-xs text-gray-500">
              Compare your current configuration against the expected solution.
              Run validation to see which criteria pass or fail.
            </div>
          </div>
        )}

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
        {!isSandbox && (
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
        )}

        {isSandbox && (
          <div className="p-4 border-t border-gray-800 bg-black/20">
            <div className="text-center text-xs text-amber-400">
              🧪 Sandbox — No rewards or penalties
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TerminalView;
