import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { useGameStore } from '../../store/gameStore';
import { ConsoleWebSocket } from '../../services/websocket';
import { createDefaultMockCliSession, type MockCliSession } from '../../mock-cli';

interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selection: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

const themes: Record<string, TerminalTheme> = {
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
};

interface TerminalProps {
  nodeName?: string;
  nodeId?: number;
  labPath?: string;
  useRealConnection?: boolean;
  onClose?: () => void;
}

export function Terminal({
  nodeName = 'R1',
  nodeId,
  labPath,
  useRealConnection = false,
  onClose
}: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<ConsoleWebSocket | null>(null);
  const mockSessionRef = useRef<MockCliSession | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [isRealMode, setIsRealMode] = useState(false);
  const settings = useGameStore((state) => state.settings);

  const writePrompt = useCallback((term: XTerm) => {
    const prompt = mockSessionRef.current?.prompt ?? `${nodeName}>`;
    term.write(`\r\n\x1b[1;33m${prompt}\x1b[0m `);
  }, [nodeName]);

  const writeOutput = useCallback((term: XTerm, output: string) => {
    if (!output) return;
    for (const line of output.split('\n')) {
      term.writeln(line);
    }
  }, []);

  const processCommand = useCallback((term: XTerm, command: string) => {
    const session = mockSessionRef.current ?? createDefaultMockCliSession(nodeName);
    mockSessionRef.current = session;

    let result;
    try {
      result = session.executeLine(command);
    } catch (error) {
      result = {
        output: error instanceof Error ? error.message : 'Command failed',
        error: true,
      };
    }

    term.writeln('');

    if (result.clearScreen) {
      term.clear();
    } else if (result.output) {
      if (result.error) {
        term.write('\x1b[1;31m');
      }
      writeOutput(term, result.output);
      if (result.error) {
        term.write('\x1b[0m');
      }
    }

    if (result.disconnected) {
      onClose?.();
      return;
    }

    writePrompt(term);
  }, [nodeName, onClose, writeOutput, writePrompt]);

  // Setup real WebSocket connection
  const setupRealConnection = useCallback((term: XTerm) => {
    if (!labPath || nodeId === undefined) {
      console.warn('Cannot establish real connection: missing labPath or nodeId');
      return false;
    }

    const ws = new ConsoleWebSocket();
    wsRef.current = ws;

    ws.onConnect = (message) => {
      setConnected(true);
      setConnectionStatus('connected');
      setIsRealMode(true);
      term.writeln(`\x1b[1;32mConnected to ${message.node || nodeName} (${message.console_type})\x1b[0m`);
      term.writeln('');
    };

    ws.onDisconnect = () => {
      setConnected(false);
      setConnectionStatus('disconnected');
      term.writeln('\r\n\x1b[1;31mConnection lost. Attempting to reconnect...\x1b[0m');
    };

    ws.onError = (error) => {
      setConnectionStatus('error');
      term.writeln(`\r\n\x1b[1;31mConnection error: ${error}\x1b[0m`);
    };

    ws.connect(labPath, nodeId, term);
    return true;
  }, [labPath, nodeId, nodeName]);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: settings.terminalFontSize,
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      theme: themes[settings.terminalTheme],
      scrollback: 10000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    mockSessionRef.current = createDefaultMockCliSession(nodeName);

    // Welcome message
    term.writeln('\x1b[1;36m╔══════════════════════════════════════════════╗\x1b[0m');
    term.writeln('\x1b[1;36m║           NetOps Tower Terminal              ║\x1b[0m');
    term.writeln('\x1b[1;36m╚══════════════════════════════════════════════╝\x1b[0m');
    term.writeln('');
    term.writeln(`\x1b[1;32mConnecting to ${nodeName}...\x1b[0m`);

    // Try real connection if enabled
    if (useRealConnection && labPath && nodeId !== undefined) {
      const realConnected = setupRealConnection(term);
      if (!realConnected) {
        // Fall back to demo mode
        term.writeln('\x1b[1;33mFalling back to demo mode...\x1b[0m');
        setTimeout(() => {
          term.writeln('\x1b[1;32mConnected (Demo Mode)\x1b[0m');
          term.writeln('');
          term.writeln('\x1b[1;37mType "help" for available commands\x1b[0m');
          writePrompt(term);
          setConnected(true);
          setConnectionStatus('connected');
        }, 500);
      }
    } else {
      // Demo mode
      setTimeout(() => {
        term.writeln('\x1b[1;32mConnected (Demo Mode)\x1b[0m');
        term.writeln('');
        term.writeln('\x1b[1;37mType "help" for available commands\x1b[0m');
        writePrompt(term);
        setConnected(true);
        setConnectionStatus('connected');
      }, 800);
    }

    // Handle input
    let currentInput = '';
    term.onData((data) => {
      // If connected to real backend, send data directly
      if (isRealMode && wsRef.current?.isConnected) {
        wsRef.current.send(data);
        return;
      }

      // Demo mode input handling
      if (!connected) return;

      const code = data.charCodeAt(0);

      if (code === 13) { // Enter
        processCommand(term, currentInput);
        currentInput = '';
      } else if (code === 9) { // Tab autocomplete
        const suggestions = mockSessionRef.current?.autocomplete(currentInput) ?? [];
        if (suggestions.length === 1) {
          const currentToken = currentInput.endsWith(' ') ? '' : currentInput.split(/\s+/).pop() ?? '';
          const insert = suggestions[0].slice(currentToken.length);
          currentInput += insert;
          term.write(insert);
        } else if (suggestions.length > 1) {
          term.writeln('');
          term.writeln(suggestions.join('  '));
          term.write(`\x1b[1;33m${mockSessionRef.current?.prompt ?? `${nodeName}>`}\x1b[0m ${currentInput}`);
        }
      } else if (code === 127) { // Backspace
        if (currentInput.length > 0) {
          currentInput = currentInput.slice(0, -1);
          term.write('\b \b');
        }
      } else if (code >= 32) { // Printable characters
        currentInput += data;
        term.write(data);
      }
    });

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      // Send resize to WebSocket if connected
      if (wsRef.current?.isConnected) {
        wsRef.current.resize(term.cols, term.rows);
      }
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      wsRef.current?.disconnect();
      term.dispose();
    };
  }, [nodeName, nodeId, labPath, useRealConnection, settings.terminalFontSize, settings.terminalTheme, connected, isRealMode, processCommand, writePrompt, setupRealConnection]);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500 animate-pulse-glow';
      case 'connecting': return 'bg-yellow-500 animate-pulse';
      case 'disconnected': return 'bg-gray-500';
      case 'error': return 'bg-red-500';
    }
  };

  const getStatusText = () => {
    if (isRealMode) return 'Live';
    return 'Demo';
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0d1a] rounded-lg overflow-hidden border border-cyan-500/30">
      {/* Terminal header */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-cyan-500/30">
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
          <span className="text-cyan-400 font-bold">{nodeName}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${isRealMode ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
            {getStatusText()}
          </span>
          {nodeId !== undefined && (
            <span className="text-gray-500 text-sm">(Node #{nodeId})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => xtermRef.current?.clear()}
            className="px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded"
            title="Clear terminal"
          >
            Clear
          </button>
          {onClose && (
            <button
              onClick={() => {
                wsRef.current?.disconnect();
                onClose();
              }}
              className="px-2 py-1 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded"
              title="Disconnect"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {/* Terminal content */}
      <div ref={terminalRef} className="flex-1 p-2" />
    </div>
  );
}

export default Terminal;
