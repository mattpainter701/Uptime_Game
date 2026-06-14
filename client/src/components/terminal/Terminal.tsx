import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';
import { useGameStore } from '../../store/gameStore';
import { ConsoleWebSocket } from '../../services/websocket';
import { createMockCliForHostname } from '../../lib/mockApplianceCliRegistry';
import { createDecodeCli } from '../../lib/mockDecodeCli';

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
  'amber-retro': {
    background: '#1a1000',
    foreground: '#ffb000',
    cursor: '#ff8800',
    cursorAccent: '#1a1000',
    selection: 'rgba(255, 176, 0, 0.3)',
    black: '#1a1000',
    red: '#ff4400',
    green: '#ffb000',
    yellow: '#ffcc00',
    blue: '#ff8800',
    magenta: '#ff6600',
    cyan: '#ffaa00',
    white: '#ffeebb',
    brightBlack: '#554400',
    brightRed: '#ff6644',
    brightGreen: '#ffcc44',
    brightYellow: '#ffee44',
    brightBlue: '#ffaa44',
    brightMagenta: '#ff8844',
    brightCyan: '#ffcc44',
    brightWhite: '#ffffdd',
  },
  'solarized-dark': {
    background: '#002b36',
    foreground: '#839496',
    cursor: '#93a1a1',
    cursorAccent: '#002b36',
    selection: 'rgba(131, 148, 150, 0.3)',
    black: '#073642',
    red: '#dc322f',
    green: '#859900',
    yellow: '#b58900',
    blue: '#268bd2',
    magenta: '#d33682',
    cyan: '#2aa198',
    white: '#eee8d5',
    brightBlack: '#002b36',
    brightRed: '#cb4b16',
    brightGreen: '#586e75',
    brightYellow: '#657b83',
    brightBlue: '#839496',
    brightMagenta: '#6c71c4',
    brightCyan: '#93a1a1',
    brightWhite: '#fdf6e3',
  },
  'retro-green': {
    background: '#0d1a0d',
    foreground: '#00cc44',
    cursor: '#00ff55',
    cursorAccent: '#0d1a0d',
    selection: 'rgba(0, 204, 68, 0.3)',
    black: '#0d1a0d',
    red: '#cc3333',
    green: '#00cc44',
    yellow: '#99cc00',
    blue: '#3388cc',
    magenta: '#cc33cc',
    cyan: '#33cccc',
    white: '#c0c0c0',
    brightBlack: '#334433',
    brightRed: '#ff5555',
    brightGreen: '#55ff77',
    brightYellow: '#ccff33',
    brightBlue: '#55aaff',
    brightMagenta: '#ff55ff',
    brightCyan: '#55ffff',
    brightWhite: '#ffffff',
  },
};

const FONT_FAMILIES: Record<string, string> = {
  jetbrains: '"JetBrains Mono", "Fira Code", monospace',
  fira: '"Fira Code", "JetBrains Mono", monospace',
  source: '"Source Code Pro", "Fira Code", monospace',
  ibm: '"IBM Plex Mono", "Fira Code", monospace',
  ubuntu: '"Ubuntu Mono", "Fira Code", monospace',
};

const HISTORY_MAX = 200;

function sanitizePaste(text: string): string {
  // Strip C0 control characters (0x00-0x1F except tab, CR, LF)
  let cleaned = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  // Strip ESC sequences
  cleaned = cleaned.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
  cleaned = cleaned.replace(/\x1b/g, '');
  // Truncate if >4KB
  if (cleaned.length > 4096) {
    cleaned = cleaned.slice(0, 4096);
  }
  return cleaned;
}

interface TerminalProps {
  nodeName?: string;
  nodeId?: number;
  labPath?: string;
  useRealConnection?: boolean;
  onClose?: () => void;
  isPaused?: boolean;
}

export function Terminal({
  nodeName = 'R1',
  nodeId,
  labPath,
  useRealConnection = false,
  onClose,
  isPaused = false,
}: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const searchBarRef = useRef<HTMLInputElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const wsRef = useRef<ConsoleWebSocket | null>(null);
  const sessionLogRef = useRef<string[]>([]);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const currentInputRef = useRef<string>('');
  const createCli = useCallback((hostname: string) => {
    return createMockCliForHostname(hostname);
  }, []);
  const cliRef = useRef(createCli(nodeName));
  const decodeCliRef = useRef(createDecodeCli());
  const inDecodeModeRef = useRef(false);
  const connectedRef = useRef(false);
  const realModeRef = useRef(false);
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [isRealMode, setIsRealMode] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const settings = useGameStore((state) => state.settings);

  useEffect(() => {
    connectedRef.current = connected;
  }, [connected]);

  useEffect(() => {
    realModeRef.current = isRealMode;
  }, [isRealMode]);

  useEffect(() => {
    cliRef.current = createCli(nodeName);
  }, [createCli, nodeName]);

  const appendSessionLog = useCallback((text: string) => {
    sessionLogRef.current.push(text);
    if (sessionLogRef.current.length > 50000) {
      sessionLogRef.current = sessionLogRef.current.slice(-25000);
    }
  }, []);

  const downloadSessionLog = useCallback(() => {
    const content = sessionLogRef.current.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `netops-terminal-${nodeName}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodeName]);

  const writePrompt = useCallback((term: XTerm, prompt?: string) => {
    const promptStr = `\r\n\x1b[1;33m${prompt ?? cliRef.current.getPrompt()}\x1b[0m `;
    term.write(promptStr);
    appendSessionLog(promptStr.replace(/\x1b\[[0-9;]*m/g, ''));
  }, [appendSessionLog]);

  const processCommand = useCallback((term: XTerm, command: string) => {
    const trimmed = command.trim();

    if (trimmed === '') {
      writePrompt(term, inDecodeModeRef.current ? decodeCliRef.current.getPrompt() : undefined);
      return;
    }

    // Add to history
    if (trimmed !== historyRef.current[historyRef.current.length - 1]) {
      historyRef.current.push(trimmed);
      if (historyRef.current.length > HISTORY_MAX) {
        historyRef.current.shift();
      }
    }
    historyIndexRef.current = -1;
    appendSessionLog(trimmed);

    if (trimmed.toLowerCase() === 'clear') {
      term.clear();
      writePrompt(term, inDecodeModeRef.current ? decodeCliRef.current.getPrompt() : undefined);
      return;
    }

    // Handle decode mode commands
    if (inDecodeModeRef.current) {
      const result = decodeCliRef.current.run(command);
      term.writeln('');
      result.lines.forEach((line) => {
        term.writeln(line);
        appendSessionLog(line);
      });

      if (result.shouldDisconnect) {
        onClose?.();
        return;
      }

      // Check if user wants to exit decode mode
      if (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'quit' || trimmed.toLowerCase() === 'q') {
        inDecodeModeRef.current = false;
        writePrompt(term, cliRef.current.getPrompt());
      } else {
        writePrompt(term, result.prompt);
      }
      return;
    }

    // Handle regular commands
    if (trimmed.toLowerCase() === 'decode') {
      inDecodeModeRef.current = true;
      const result = decodeCliRef.current.run('start');
      term.writeln('');
      result.lines.forEach((line) => {
        term.writeln(line);
        appendSessionLog(line);
      });
      writePrompt(term, result.prompt);
      return;
    }

    const result = cliRef.current.run(command);
    term.writeln('');
    result.lines.forEach((line) => {
      term.writeln(line);
      appendSessionLog(line);
    });

    if (result.shouldDisconnect) {
      onClose?.();
      return;
    }

    writePrompt(term, result.prompt);
  }, [onClose, writePrompt, appendSessionLog]);

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
      const msg = `\x1b[1;32mConnected to ${message.node || nodeName} (${message.console_type})\x1b[0m`;
      term.writeln(msg);
      appendSessionLog(msg);
      term.writeln('');
    };

    ws.onDisconnect = () => {
      setConnected(false);
      setConnectionStatus('disconnected');
      const msg = '\r\n\x1b[1;31mConnection lost. Attempting to reconnect...\x1b[0m';
      term.write(msg);
      appendSessionLog(msg);
    };

    ws.onError = (error) => {
      setConnectionStatus('error');
      const msg = `\r\n\x1b[1;31mConnection error: ${error}\x1b[0m`;
      term.write(msg);
      appendSessionLog(msg);
    };

    ws.connect(labPath, nodeId, term);
    return true;
  }, [labPath, nodeId, nodeName, appendSessionLog]);

  useEffect(() => {
    if (!terminalRef.current) return;

    const fontFamily = FONT_FAMILIES[settings.terminalFontFamily] || FONT_FAMILIES.jetbrains;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: settings.terminalFontSize,
      fontFamily,
      theme: themes[settings.terminalTheme],
      scrollback: 10000,
    });

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.loadAddon(searchAddon);

    // Try WebGL addon for performance, fall back gracefully
    try {
      term.loadAddon(new WebglAddon());
    } catch (e) {
      // WebGL not available — canvas renderer fallback is fine
    }

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;

    // Welcome message
    term.writeln('\x1b[1;36m╔══════════════════════════════════════════════╗\x1b[0m');
    term.writeln('\x1b[1;36m║           NetOps Tower Terminal              ║\x1b[0m');
    term.writeln('\x1b[1;36m╚══════════════════════════════════════════════╝\x1b[0m');
    term.writeln('');
    const connectMsg = `\x1b[1;32mConnecting to ${nodeName}...\x1b[0m`;
    term.writeln(connectMsg);
    appendSessionLog(`Connecting to ${nodeName}...`);

    // Try real connection if enabled
    if (useRealConnection && labPath && nodeId !== undefined) {
      const realConnected = setupRealConnection(term);
      if (!realConnected) {
        term.writeln('\x1b[1;33mFalling back to demo mode...\x1b[0m');
        setTimeout(() => {
          const msg = '\x1b[1;32mConnected (Demo Mode)\x1b[0m';
          term.writeln(msg);
          appendSessionLog('Connected (Demo Mode)');
          term.writeln('');
          term.writeln('\x1b[1;37mType "help" for available commands\x1b[0m');
          term.writeln('\x1b[1;37mType "decode" to play Protocol Decoder mini-game\x1b[0m');
          writePrompt(term, cliRef.current.getPrompt());
          setConnected(true);
          setConnectionStatus('connected');
        }, 500);
      }
    } else {
      // Demo mode
      setTimeout(() => {
        const msg = '\x1b[1;32mConnected (Demo Mode)\x1b[0m';
        term.writeln(msg);
        appendSessionLog('Connected (Demo Mode)');
        term.writeln('');
        term.writeln('\x1b[1;37mType "help" for available commands\x1b[0m');
        term.writeln('\x1b[1;37mType "decode" to play Protocol Decoder mini-game\x1b[0m');
        writePrompt(term, cliRef.current.getPrompt());
        setConnected(true);
        setConnectionStatus('connected');
      }, 800);
    }

    // Handle input with history navigation and tab autocomplete
    term.onData((data) => {
      // If connected to real backend, send data directly
      if (realModeRef.current && wsRef.current?.isConnected) {
        wsRef.current.send(data);
        return;
      }

      // Demo mode input handling
      if (!connectedRef.current) return;

      const code = data.charCodeAt(0);

      if (code === 13) { // Enter
        processCommand(term, currentInputRef.current);
        currentInputRef.current = '';
      } else if (code === 9) { // Tab — autocomplete
        const completions = inDecodeModeRef.current
          ? decodeCliRef.current.autocomplete?.(currentInputRef.current)
          : cliRef.current.autocomplete?.(currentInputRef.current);
        if (completions && completions.length === 1) {
          // Single completion: replace the last word
          const trimmed = currentInputRef.current.trimEnd();
          const tokens = trimmed.length === 0 ? [] : trimmed.split(/\s+/);
          const trailingSpace = /\s$/.test(currentInputRef.current);
          const lastPartial = trailingSpace ? '' : (tokens[tokens.length - 1] ?? '');
          const suffix = completions[0].slice(lastPartial.length);
          currentInputRef.current += suffix;
          term.write(suffix);
          if (!trailingSpace && tokens.length > 0) {
            currentInputRef.current += ' ';
            term.write(' ');
          }
        } else if (completions && completions.length > 1) {
          term.write('\r\n' + completions.join('  ') + '\r\n');
          writePrompt(term, inDecodeModeRef.current ? decodeCliRef.current.getPrompt() : cliRef.current.getPrompt());
          term.write(currentInputRef.current);
        }
      } else if (code === 127) { // Backspace
        if (currentInputRef.current.length > 0) {
          currentInputRef.current = currentInputRef.current.slice(0, -1);
          term.write('\b \b');
        }
      } else if (code === 27) { // ESC — handled via attachCustomKeyEventHandler for arrow sequences
      } else if (code >= 32) { // Printable characters
        currentInputRef.current += data;
        term.write(data);
      }
    });

    // Custom key handler for arrow keys (up/down history) and Ctrl+F (search)
    term.attachCustomKeyEventHandler((e: KeyboardEvent) => {
      // Ctrl+F — toggle search
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        setSearchVisible((prev) => !prev);
        return false;
      }

      // Up arrow — history
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const history = historyRef.current;
        if (history.length === 0) return false;
        if (historyIndexRef.current === -1) {
          historyIndexRef.current = history.length - 1;
        } else if (historyIndexRef.current > 0) {
          historyIndexRef.current--;
        }
        const entry = history[historyIndexRef.current];
        const currentLine = currentInputRef.current;
        if (currentLine.length > 0) {
          term.write('\b \b'.repeat(currentLine.length));
        }
        term.write(entry);
        currentInputRef.current = entry;
        return false;
      }

      // Down arrow — history
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const history = historyRef.current;
        if (historyIndexRef.current === -1) return false;
        if (historyIndexRef.current < history.length - 1) {
          historyIndexRef.current++;
        } else {
          historyIndexRef.current = -1;
        }
        const entry = historyIndexRef.current >= 0 ? history[historyIndexRef.current] : '';
        const currentLine = currentInputRef.current;
        if (currentLine.length > 0) {
          term.write('\b \b'.repeat(currentLine.length));
        }
        term.write(entry);
        currentInputRef.current = entry;
        return false;
      }

      return true;
    });

    // Handle paste sanitization
    term.textarea?.addEventListener('paste', (e: ClipboardEvent) => {
      const clipboardData = e.clipboardData?.getData('text/plain');
      if (!clipboardData) return;

      e.preventDefault();
      const sanitized = sanitizePaste(clipboardData);
      if (sanitized.length === 0) return;

      const lines = sanitized.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) {
          processCommand(term, currentInputRef.current);
          currentInputRef.current = '';
        }
        currentInputRef.current += lines[i];
        term.write(lines[i]);
      }
    });

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
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
  }, [nodeName, nodeId, labPath, useRealConnection, settings.terminalFontSize, settings.terminalTheme, settings.terminalFontFamily, processCommand, writePrompt, setupRealConnection, appendSessionLog]);

  // Focus search input when search becomes visible
  useEffect(() => {
    if (searchVisible && searchBarRef.current) {
      searchBarRef.current.focus();
    }
  }, [searchVisible]);

  // Toggle xterm stdin when paused
  useEffect(() => {
    const term = xtermRef.current;
    if (!term) return;
    term.options.disableStdin = isPaused;
    if (isPaused) {
      term.write('\r\n\x1b[1;33m⏸ Game paused — input disabled. Press Esc or click Resume to continue.\x1b[0m\r\n');
    } else {
      term.write('\r\n\x1b[1;32m▶ Game resumed.\x1b[0m\r\n');
      writePrompt(term, inDecodeModeRef.current ? decodeCliRef.current.getPrompt() : cliRef.current.getPrompt());
    }
  }, [isPaused, writePrompt]);

  // Handle search from overlay bar
  const handleSearch = useCallback((direction: 'next' | 'prev') => {
    const searchAddon = searchAddonRef.current;
    const input = searchBarRef.current;
    if (!searchAddon || !input) return;

    const query = input.value.trim();
    if (!query) return;

    if (direction === 'next') {
      searchAddon.findNext(query);
    } else {
      searchAddon.findPrevious(query);
    }
  }, []);

  // Live search as user types
  const handleSearchInput = useCallback((value: string) => {
    const searchAddon = searchAddonRef.current;
    if (!searchAddon) return;

    if (value.trim()) {
      searchAddon.findNext(value.trim());
    }
  }, []);

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
            onClick={() => setSearchVisible((v) => !v)}
            className="px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded"
            title="Search (Ctrl+F)"
          >
            🔍
          </button>
          <button
            onClick={downloadSessionLog}
            className="px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded"
            title="Download session log"
          >
            📥 Log
          </button>
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

      {/* Search bar overlay */}
      {searchVisible && (
        <div className="flex items-center gap-2 px-4 py-2 bg-black/60 border-b border-cyan-500/20">
          <input
            ref={searchBarRef}
            type="text"
            placeholder="Search terminal..."
            className="flex-1 bg-black/40 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:border-cyan-500 focus:outline-none"
            onChange={(e) => handleSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch(e.shiftKey ? 'prev' : 'next');
              } else if (e.key === 'Escape') {
                setSearchVisible(false);
              }
            }}
          />
          <button
            onClick={() => handleSearch('prev')}
            className="px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded"
            title="Previous match"
          >
            ▲
          </button>
          <button
            onClick={() => handleSearch('next')}
            className="px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded"
            title="Next match"
          >
            ▼
          </button>
          <button
            onClick={() => setSearchVisible(false)}
            className="px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded"
            title="Close search"
          >
            ✕
          </button>
        </div>
      )}

      {/* Terminal content */}
      <div ref={terminalRef} className="flex-1 p-2" />
    </div>
  );
}

export default Terminal;
