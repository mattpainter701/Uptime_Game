/**
 * NetOps Tower - Terminal Component
 * 
 * A React component that provides terminal access to EVE-NG nodes
 * using xterm.js and WebSocket connections.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';

// Types
interface NodeInfo {
  nodeId: number;
  name: string;
  consoleHost: string;
  consolePort: number;
  consoleType: 'telnet' | 'vnc' | 'ssh';
}

interface TerminalProps {
  node: NodeInfo;
  wsUrl: string;
  playerId: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
  theme?: 'dark' | 'light' | 'cyberpunk';
  fontSize?: number;
}

interface TerminalState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
}

// Theme configurations
const themes = {
  dark: {
    background: '#1a1a2e',
    foreground: '#eee',
    cursor: '#f8f8f0',
    cursorAccent: '#1a1a2e',
    selection: 'rgba(255, 255, 255, 0.3)',
    black: '#000000',
    red: '#e06c75',
    green: '#98c379',
    yellow: '#e5c07b',
    blue: '#61afef',
    magenta: '#c678dd',
    cyan: '#56b6c2',
    white: '#abb2bf',
    brightBlack: '#5c6370',
    brightRed: '#e06c75',
    brightGreen: '#98c379',
    brightYellow: '#e5c07b',
    brightBlue: '#61afef',
    brightMagenta: '#c678dd',
    brightCyan: '#56b6c2',
    brightWhite: '#ffffff',
  },
  light: {
    background: '#ffffff',
    foreground: '#383a42',
    cursor: '#526eff',
    cursorAccent: '#ffffff',
    selection: 'rgba(0, 0, 0, 0.2)',
    black: '#383a42',
    red: '#e45649',
    green: '#50a14f',
    yellow: '#c18401',
    blue: '#4078f2',
    magenta: '#a626a4',
    cyan: '#0184bc',
    white: '#a0a1a7',
    brightBlack: '#4f525e',
    brightRed: '#e06c75',
    brightGreen: '#98c379',
    brightYellow: '#e5c07b',
    brightBlue: '#61afef',
    brightMagenta: '#c678dd',
    brightCyan: '#56b6c2',
    brightWhite: '#ffffff',
  },
  cyberpunk: {
    background: '#0d0d1a',
    foreground: '#00ff41',
    cursor: '#ff0080',
    cursorAccent: '#0d0d1a',
    selection: 'rgba(255, 0, 128, 0.3)',
    black: '#0d0d1a',
    red: '#ff0055',
    green: '#00ff41',
    yellow: '#ffff00',
    blue: '#0080ff',
    magenta: '#ff0080',
    cyan: '#00ffff',
    white: '#d0d0d0',
    brightBlack: '#404040',
    brightRed: '#ff5588',
    brightGreen: '#88ff88',
    brightYellow: '#ffff88',
    brightBlue: '#88c8ff',
    brightMagenta: '#ff88c8',
    brightCyan: '#88ffff',
    brightWhite: '#ffffff',
  },
};

/**
 * Terminal component for connecting to EVE-NG nodes
 */
export const TerminalComponent: React.FC<TerminalProps> = ({
  node,
  wsUrl,
  playerId,
  onConnect,
  onDisconnect,
  onError,
  theme = 'cyberpunk',
  fontSize = 14,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const searchAddon = useRef<SearchAddon | null>(null);
  
  const [state, setState] = useState<TerminalState>({
    connected: false,
    connecting: false,
    error: null,
  });

  // Initialize terminal
  const initTerminal = useCallback(() => {
    if (!terminalRef.current || terminalInstance.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize,
      fontFamily: '"Fira Code", "JetBrains Mono", monospace',
      theme: themes[theme],
      scrollback: 10000,
      allowProposedApi: true,
    });

    // Add addons
    fitAddon.current = new FitAddon();
    searchAddon.current = new SearchAddon();
    term.loadAddon(fitAddon.current);
    term.loadAddon(searchAddon.current);
    term.loadAddon(new WebLinksAddon());

    // Open terminal
    term.open(terminalRef.current);
    fitAddon.current.fit();

    // Welcome message
    term.writeln('\x1b[1;36m╔══════════════════════════════════════════╗\x1b[0m');
    term.writeln('\x1b[1;36m║         NetOps Tower Terminal            ║\x1b[0m');
    term.writeln('\x1b[1;36m╚══════════════════════════════════════════╝\x1b[0m');
    term.writeln('');
    term.writeln(`Connecting to \x1b[1;33m${node.name}\x1b[0m...`);
    term.writeln('');

    terminalInstance.current = term;

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddon.current) {
        fitAddon.current.fit();
        // Send resize to server
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'resize',
            cols: term.cols,
            rows: term.rows,
          }));
        }
      }
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [node.name, theme, fontSize]);

  // Connect WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current) return;

    setState(prev => ({ ...prev, connecting: true, error: null }));

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Send connection config
      ws.send(JSON.stringify({
        node_id: node.nodeId,
        node_host: node.consoleHost,
        node_port: node.consolePort,
        cols: terminalInstance.current?.cols || 80,
        rows: terminalInstance.current?.rows || 24,
      }));
    };

    ws.onmessage = (event) => {
      const data = event.data;

      // Check if it's a control message
      if (typeof data === 'string') {
        try {
          const msg = JSON.parse(data);
          if (msg.type === 'connected') {
            setState(prev => ({ ...prev, connected: true, connecting: false }));
            terminalInstance.current?.writeln(
              `\x1b[1;32mConnected to ${node.name}\x1b[0m`
            );
            terminalInstance.current?.writeln('');
            onConnect?.();
            return;
          }
          if (msg.type === 'error') {
            setState(prev => ({ ...prev, error: msg.message, connecting: false }));
            terminalInstance.current?.writeln(
              `\x1b[1;31mError: ${msg.message}\x1b[0m`
            );
            onError?.(msg.message);
            return;
          }
          if (msg.type === 'pong') {
            return;
          }
        } catch {
          // Not JSON, treat as terminal output
        }
      }

      // Terminal output
      terminalInstance.current?.write(data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setState(prev => ({ ...prev, error: 'Connection error', connecting: false }));
      onError?.('WebSocket connection error');
    };

    ws.onclose = () => {
      setState(prev => ({ ...prev, connected: false, connecting: false }));
      terminalInstance.current?.writeln('');
      terminalInstance.current?.writeln(
        '\x1b[1;33mDisconnected from server\x1b[0m'
      );
      onDisconnect?.();
      wsRef.current = null;
    };

    // Handle terminal input
    terminalInstance.current?.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    // Ping to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
    };
  }, [wsUrl, node, onConnect, onDisconnect, onError]);

  // Setup on mount
  useEffect(() => {
    const cleanup = initTerminal();
    return () => {
      cleanup?.();
      terminalInstance.current?.dispose();
      terminalInstance.current = null;
    };
  }, [initTerminal]);

  // Connect after terminal is ready
  useEffect(() => {
    if (terminalInstance.current) {
      const cleanup = connectWebSocket();
      return () => {
        cleanup?.();
        wsRef.current?.close();
        wsRef.current = null;
      };
    }
  }, [connectWebSocket]);

  // Disconnect function
  const disconnect = useCallback(() => {
    wsRef.current?.close();
  }, []);

  // Reconnect function
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => {
      connectWebSocket();
    }, 100);
  }, [disconnect, connectWebSocket]);

  // Search function
  const search = useCallback((term: string) => {
    searchAddon.current?.findNext(term);
  }, []);

  // Clear function
  const clear = useCallback(() => {
    terminalInstance.current?.clear();
  }, []);

  return (
    <div className="terminal-wrapper">
      <div className="terminal-header">
        <div className="terminal-title">
          <span className={`status-dot ${state.connected ? 'connected' : state.connecting ? 'connecting' : 'disconnected'}`} />
          <span className="node-name">{node.name}</span>
          <span className="console-type">({node.consoleType})</span>
        </div>
        <div className="terminal-actions">
          <button onClick={clear} title="Clear">
            🗑️
          </button>
          <button onClick={reconnect} title="Reconnect">
            🔄
          </button>
          <button onClick={disconnect} title="Disconnect">
            ❌
          </button>
        </div>
      </div>
      <div 
        ref={terminalRef} 
        className="terminal-container"
        style={{ height: '100%', minHeight: '300px' }}
      />
      {state.error && (
        <div className="terminal-error">
          ⚠️ {state.error}
        </div>
      )}
      <style>{`
        .terminal-wrapper {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: ${themes[theme].background};
          border: 1px solid #333;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .terminal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.3);
          border-bottom: 1px solid #333;
        }
        
        .terminal-title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: ${themes[theme].foreground};
          font-family: monospace;
        }
        
        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        
        .status-dot.connected {
          background: #00ff41;
        }
        
        .status-dot.connecting {
          background: #ffff00;
        }
        
        .status-dot.disconnected {
          background: #ff0055;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .node-name {
          font-weight: bold;
          color: ${themes[theme].cyan};
        }
        
        .console-type {
          color: ${themes[theme].brightBlack};
          font-size: 0.9em;
        }
        
        .terminal-actions {
          display: flex;
          gap: 4px;
        }
        
        .terminal-actions button {
          background: transparent;
          border: 1px solid #555;
          border-radius: 4px;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 14px;
          transition: background 0.2s;
        }
        
        .terminal-actions button:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        
        .terminal-container {
          flex: 1;
          padding: 8px;
        }
        
        .terminal-error {
          padding: 8px 12px;
          background: rgba(255, 0, 0, 0.2);
          color: #ff5555;
          font-family: monospace;
          font-size: 0.9em;
        }
        
        /* xterm.js styles */
        .xterm {
          height: 100%;
        }
        
        .xterm-viewport {
          overflow-y: auto !important;
        }
      `}</style>
    </div>
  );
};

/**
 * Multi-terminal component for managing multiple node connections
 */
interface MultiTerminalProps {
  nodes: NodeInfo[];
  wsUrl: string;
  playerId: string;
  layout?: 'tabs' | 'grid' | 'split';
}

export const MultiTerminal: React.FC<MultiTerminalProps> = ({
  nodes,
  wsUrl,
  playerId,
  layout = 'tabs',
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [connectedNodes, setConnectedNodes] = useState<Set<number>>(new Set());

  const handleConnect = (nodeId: number) => {
    setConnectedNodes(prev => new Set([...prev, nodeId]));
  };

  const handleDisconnect = (nodeId: number) => {
    setConnectedNodes(prev => {
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
  };

  if (layout === 'tabs') {
    return (
      <div className="multi-terminal-tabs">
        <div className="tab-bar">
          {nodes.map((node, index) => (
            <button
              key={node.nodeId}
              className={`tab ${index === activeTab ? 'active' : ''}`}
              onClick={() => setActiveTab(index)}
            >
              <span className={`tab-status ${connectedNodes.has(node.nodeId) ? 'connected' : ''}`} />
              {node.name}
            </button>
          ))}
        </div>
        <div className="tab-content">
          {nodes.map((node, index) => (
            <div
              key={node.nodeId}
              style={{ display: index === activeTab ? 'block' : 'none', height: '100%' }}
            >
              <TerminalComponent
                node={node}
                wsUrl={wsUrl}
                playerId={playerId}
                onConnect={() => handleConnect(node.nodeId)}
                onDisconnect={() => handleDisconnect(node.nodeId)}
              />
            </div>
          ))}
        </div>
        <style>{`
          .multi-terminal-tabs {
            display: flex;
            flex-direction: column;
            height: 100%;
          }
          
          .tab-bar {
            display: flex;
            background: #1a1a2e;
            border-bottom: 2px solid #333;
            overflow-x: auto;
          }
          
          .tab {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 10px 16px;
            background: transparent;
            border: none;
            color: #888;
            cursor: pointer;
            font-family: monospace;
            font-size: 13px;
            transition: all 0.2s;
            border-bottom: 2px solid transparent;
            margin-bottom: -2px;
          }
          
          .tab:hover {
            color: #fff;
            background: rgba(255, 255, 255, 0.05);
          }
          
          .tab.active {
            color: #00ff41;
            border-bottom-color: #00ff41;
            background: rgba(0, 255, 65, 0.1);
          }
          
          .tab-status {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #555;
          }
          
          .tab-status.connected {
            background: #00ff41;
          }
          
          .tab-content {
            flex: 1;
            min-height: 0;
          }
        `}</style>
      </div>
    );
  }

  // Grid layout
  if (layout === 'grid') {
    const cols = nodes.length <= 2 ? nodes.length : Math.ceil(Math.sqrt(nodes.length));
    
    return (
      <div 
        className="multi-terminal-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: '4px',
          height: '100%',
        }}
      >
        {nodes.map(node => (
          <TerminalComponent
            key={node.nodeId}
            node={node}
            wsUrl={wsUrl}
            playerId={playerId}
            onConnect={() => handleConnect(node.nodeId)}
            onDisconnect={() => handleDisconnect(node.nodeId)}
          />
        ))}
      </div>
    );
  }

  // Split (horizontal) layout
  return (
    <div 
      className="multi-terminal-split"
      style={{
        display: 'flex',
        height: '100%',
        gap: '4px',
      }}
    >
      {nodes.map(node => (
        <div key={node.nodeId} style={{ flex: 1, minWidth: 0 }}>
          <TerminalComponent
            node={node}
            wsUrl={wsUrl}
            playerId={playerId}
            onConnect={() => handleConnect(node.nodeId)}
            onDisconnect={() => handleDisconnect(node.nodeId)}
          />
        </div>
      ))}
    </div>
  );
};

export default TerminalComponent;
