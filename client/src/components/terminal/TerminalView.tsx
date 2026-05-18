import { useState, useCallback, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Terminal } from './Terminal';

// Demo lab nodes
const DEMO_NODES = [
  { id: 1, name: 'R1', type: 'router', status: 'running' as const },
  { id: 2, name: 'R2', type: 'router', status: 'running' as const },
  { id: 3, name: 'SW1', type: 'switch', status: 'running' as const },
  { id: 4, name: 'PC1', type: 'linux', status: 'stopped' as const },
];

// Quick reference commands
interface QuickRefEntry {
  label: string;
  command: string;
  description: string;
  category: string;
}

const QUICK_REF_COMMANDS: QuickRefEntry[] = [
  { label: 'show version', command: 'show version', description: 'Display OS version', category: 'Info' },
  { label: 'show running-config', command: 'show running-config', description: 'Current config', category: 'Info' },
  { label: 'show interfaces', command: 'show interfaces', description: 'Interface status', category: 'Info' },
  { label: 'show ip route', command: 'show ip route', description: 'Routing table', category: 'Info' },
  { label: 'show vlan', command: 'show vlan', description: 'VLAN database', category: 'Info' },
  { label: 'ping', command: 'ping ', description: 'Test connectivity', category: 'Diag' },
  { label: 'traceroute', command: 'traceroute ', description: 'Trace route path', category: 'Diag' },
  { label: 'show logging', command: 'show logging', description: 'System logs', category: 'Diag' },
  { label: 'show cdp neighbors', command: 'show cdp neighbors', description: 'CDP neighbors', category: 'Diag' },
  { label: 'configure terminal', command: 'configure terminal', description: 'Enter config mode', category: 'Config' },
  { label: 'show access-lists', command: 'show access-lists', description: 'ACL entries', category: 'Config' },
  { label: 'show mac address-table', command: 'show mac address-table', description: 'MAC table', category: 'Info' },
  { label: 'show ip ospf neighbor', command: 'show ip ospf neighbor', description: 'OSPF neighbors', category: 'Info' },
  { label: 'show ip bgp summary', command: 'show ip bgp summary', description: 'BGP summary', category: 'Info' },
  { label: 'clear counters', command: 'clear counters', description: 'Reset counters', category: 'Config' },
];

// Tab type
interface TerminalTab {
  id: number;
  nodeId: number;
  nodeName: string;
}

// useResizable hook for split-pane
function useResizable(initialRatio: number = 0.35) {
  const [ratio, setRatio] = useState(initialRatio);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newRatio = (ev.clientX - rect.left) / rect.width;
      setRatio(Math.max(0.15, Math.min(0.6, newRatio)));
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  return { ratio, onMouseDown, containerRef };
}

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
  activeNodeId,
  onSelectNode,
  disabled,
}: {
  nodes: typeof DEMO_NODES;
  activeNodeId: number | null;
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
              : activeNodeId === node.id
                ? 'bg-cyan-500/30 border border-cyan-500'
                : 'bg-black/20 border border-transparent hover:bg-white/10'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${
            node.status === 'running' ? 'bg-green-500' : 'bg-gray-500'
          }`} />
          <span className="text-white font-mono">{node.name}</span>
          <span className="text-gray-500 text-xs">{node.type}</span>
          {node.status === 'stopped' && (
            <span className="text-xs text-red-400 ml-auto">stopped</span>
          )}
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

  const commands = activeTicket
    ? activeTicket.hints.map(h => {
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

// Quick Reference Sidebar
function QuickRefSidebar({ disabled }: { disabled?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  const handleCopy = useCallback((entry: QuickRefEntry) => {
    if (disabled) return;
    navigator.clipboard.writeText(entry.command).then(() => {
      setCopiedLabel(entry.label);
      setTimeout(() => setCopiedLabel(null), 1500);
    }).catch(() => {
      // Clipboard API failed — ignore silently
    });
  }, [disabled]);

  const categories = [...new Set(QUICK_REF_COMMANDS.map((c) => c.category))];

  if (!expanded) {
    return (
      <div className="relative flex flex-col border-l border-gray-800 bg-[#0d0d1a]" role="complementary" aria-label="Quick reference sidebar">
        <button
          onClick={() => setExpanded(true)}
          className="w-2.5 flex-1 flex items-center justify-center hover:bg-cyan-500/10 transition-colors group"
          title="Quick Reference Commands"
          aria-label="Expand quick reference commands"
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-gray-500 group-hover:text-cyan-400 text-xs rotate-90 whitespace-nowrap">Commands</span>
            <span className="text-gray-600 group-hover:text-cyan-400 text-lg">◀</span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 flex flex-col border-l border-gray-800 bg-[#0d0d1a] overflow-hidden" role="complementary" aria-label="Quick reference commands panel">
      <div className="p-3 border-b border-gray-800 flex items-center justify-between">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <span>⚡</span>
          <span>Quick Ref</span>
        </h3>
        <button
          onClick={() => setExpanded(false)}
          className="text-gray-500 hover:text-white text-sm px-1"
          title="Collapse"
          aria-label="Collapse quick reference"
        >
          ▶
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {categories.map((category) => (
          <div key={category}>
            <div className="text-xs text-cyan-500/60 font-mono mb-1.5 px-1">{category}</div>
            <div className="space-y-0.5">
              {QUICK_REF_COMMANDS.filter((c) => c.category === category).map((entry) => (
                <button
                  key={entry.label}
                  onClick={() => handleCopy(entry)}
                  disabled={disabled}
                  className={`w-full text-left px-2 py-1 rounded text-xs group transition-colors ${
                    disabled
                      ? 'cursor-not-allowed opacity-40'
                      : 'hover:bg-white/5'
                  }`}
                  title={`${entry.description} — click to copy`}
                  aria-label={`Copy ${entry.label}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-white/80 group-hover:text-cyan-400 truncate">
                      {entry.label}
                    </span>
                    <span className="text-gray-600 group-hover:text-cyan-500 ml-1 flex-shrink-0">
                      {copiedLabel === entry.label ? '✓' : '📋'}
                    </span>
                  </div>
                  <div className="text-gray-500 text-[10px] truncate">{entry.description}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TerminalView() {
  const { setView, activeTicket, sessionState, sandboxState, exitSandbox } = useGameStore();
  const isPaused = sessionState.isPaused;
  const isSandbox = sandboxState.active;

  // Multi-tab state
  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: 1, nodeId: 1, nodeName: 'R1' },
  ]);
  const [activeTabId, setActiveTabId] = useState<number>(1);
  const nextTabId = useRef(2);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const activeNodeData = DEMO_NODES.find((n) => n.id === activeTab?.nodeId);

  // Resizable split pane
  const { ratio: leftRatio, onMouseDown, containerRef } = useResizable(0.28);

  const openTab = useCallback((nodeId: number) => {
    const node = DEMO_NODES.find((n) => n.id === nodeId);
    if (!node) return;
    const existing = tabs.find((t) => t.nodeId === nodeId);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }
    const newTab: TerminalTab = {
      id: nextTabId.current++,
      nodeId: node.id,
      nodeName: node.name,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, [tabs]);

  const closeTab = useCallback((tabId: number) => {
    setTabs((prev) => {
      const remaining = prev.filter((t) => t.id !== tabId);
      if (remaining.length === 0) {
        return prev;
      }
      if (tabId === activeTabId && remaining.length > 0) {
        setActiveTabId(remaining[remaining.length - 1].id);
      }
      return remaining;
    });
  }, [activeTabId]);

  const handleBack = () => {
    if (isSandbox) {
      exitSandbox();
    } else if (!isPaused) {
      setView('office');
    }
  };

  return (
    <div className="absolute inset-0 flex z-20 bg-[#0a0a15]" role="application" aria-label="Network terminal console">
      {/* Left panel — Topology & Nodes (resizable) */}
      <div
        ref={containerRef}
        className="flex flex-col border-r border-gray-800 bg-[#0d0d1a]"
        style={{ width: `${leftRatio * 100}%`, minWidth: 180, maxWidth: '50%' }}
        role="navigation"
        aria-label="Device panel"
      >
        <div className="p-4 border-b border-gray-800">
          <button
            onClick={handleBack}
            disabled={isPaused && !isSandbox}
            aria-label={isSandbox ? 'Back to sandbox browser' : 'Back to office view'}
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
            activeNodeId={activeTab?.nodeId ?? null}
            onSelectNode={openTab}
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

      {/* Resizable divider */}
      <div
        className="w-[2px] bg-gray-700 hover:bg-cyan-500 cursor-col-resize flex-shrink-0 transition-colors"
        onMouseDown={onMouseDown}
      />

      {/* Center — Terminal with tabs */}
      <div className="flex-1 flex flex-col min-w-0" role="main" aria-label="Terminal console">
        {/* Sandbox toolbar */}
        {isSandbox && <SandboxToolbar />}

        {/* Pause banner */}
        {isPaused && <PauseBanner />}

        {/* Solution panel — shown when toggled in sandbox */}
        {isSandbox && sandboxState.showSolution && activeTicket && (
          <div className="px-4 py-3 bg-green-500/5 border-b border-green-500/20" role="region" aria-label="Solution guide">
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

        {/* Diff panel — shown when toggled in sandbox */}
        {isSandbox && sandboxState.showDiff && (
          <div className="px-4 py-3 bg-purple-500/5 border-b border-purple-500/20" role="region" aria-label="Config diff">
            <div className="text-sm font-bold text-purple-400 mb-2">📊 Config Diff</div>
            <div className="text-xs text-gray-500">
              Compare your current configuration against the expected solution.
              Run validation to see which criteria pass or fail.
            </div>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex items-center bg-black/30 border-b border-gray-800">
          <div className="flex-1 flex items-center overflow-x-auto">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm border-r border-gray-800 cursor-pointer transition-colors ${
                  tab.id === activeTabId
                    ? 'bg-[#0d0d1a] text-cyan-400 border-t-2 border-t-cyan-500'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
                onClick={() => setActiveTabId(tab.id)}
                role="tab"
                aria-selected={tab.id === activeTabId}
                aria-label={`Terminal tab ${tab.nodeName}`}
              >
                <span className={`w-2 h-2 rounded-full ${
                  DEMO_NODES.find((n) => n.id === tab.nodeId)?.status === 'running'
                    ? 'bg-green-500'
                    : 'bg-gray-500'
                }`} />
                <span className="font-mono text-xs">{tab.nodeName}</span>
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    className="ml-1 text-gray-600 hover:text-red-400 text-xs leading-none"
                    title="Close tab"
                    aria-label={`Close ${tab.nodeName} tab`}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {/* New tab button */}
          <button
            onClick={() => openTab(1)}
            disabled={isPaused}
            className={`px-3 py-2 text-gray-400 hover:text-white hover:bg-white/5 border-l border-gray-800 text-sm ${
              isPaused ? 'cursor-not-allowed opacity-50' : ''
            }`}
            title="New terminal tab"
            aria-label="Open new terminal tab"
          >
            +
          </button>
        </div>

        {/* Terminal content */}
        <div className="flex-1 flex p-4 min-h-0">
          {activeTab && activeNodeData ? (
            <Terminal
              key={activeTab.id}
              nodeName={activeNodeData.name}
              nodeId={activeNodeData.id}
              onClose={
                tabs.length > 1
                  ? () => closeTab(activeTab.id)
                  : undefined
              }
              isPaused={isPaused}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-xl mb-2">No terminal open</p>
                <p className="text-sm">Select a node from the left panel</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right panel — Ticket details */}
      <div className="w-80 flex flex-col border-l border-gray-800 bg-[#0d0d1a] flex-shrink-0" role="complementary" aria-label="Ticket details panel">
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

      {/* Quick ref sidebar — collapsed by default */}
      <QuickRefSidebar disabled={isPaused} />
    </div>
  );
}

export default TerminalView;
