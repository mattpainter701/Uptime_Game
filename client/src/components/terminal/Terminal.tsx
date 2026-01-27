import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { useGameStore } from '../../store/gameStore';

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

// Demo commands and responses for simulation
const DEMO_COMMANDS: Record<string, string> = {
  'help': `
Available commands:
  help              Show this help message
  show ip route     Display IP routing table
  show ip int brief Display interface summary
  show running-config  Display running configuration
  ping <host>       Ping a host
  conf t            Enter configuration mode
  exit              Exit current mode
`,
  'show ip route': `
Codes: C - connected, S - static, R - RIP, O - OSPF

Gateway of last resort is not set

C    192.168.1.0/24 is directly connected, GigabitEthernet0/0
C    10.0.0.0/24 is directly connected, GigabitEthernet0/1
`,
  'show ip int brief': `
Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet0/0     192.168.1.1     YES NVRAM  up                    up
GigabitEthernet0/1     10.0.0.1        YES NVRAM  up                    up
GigabitEthernet0/2     unassigned      YES NVRAM  administratively down down
`,
  'show running-config': `
Building configuration...

Current configuration : 1024 bytes
!
hostname R1
!
interface GigabitEthernet0/0
 ip address 192.168.1.1 255.255.255.0
 no shutdown
!
interface GigabitEthernet0/1
 ip address 10.0.0.1 255.255.255.0
 no shutdown
!
line con 0
line vty 0 4
 login
!
end
`,
};

interface TerminalProps {
  nodeName?: string;
  onClose?: () => void;
}

export function Terminal({ nodeName = 'R1', onClose }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [connected, setConnected] = useState(false);
  const settings = useGameStore((state) => state.settings);

  const writePrompt = useCallback((term: XTerm) => {
    term.write(`\r\n\x1b[1;33m${nodeName}#\x1b[0m `);
  }, [nodeName]);

  const processCommand = useCallback((term: XTerm, command: string) => {
    const cmd = command.trim().toLowerCase();

    if (cmd === '') {
      writePrompt(term);
      return;
    }

    if (cmd === 'clear') {
      term.clear();
      writePrompt(term);
      return;
    }

    if (cmd === 'exit') {
      term.writeln('\r\n\x1b[1;33mDisconnecting...\x1b[0m');
      onClose?.();
      return;
    }

    if (cmd.startsWith('ping ')) {
      const host = cmd.substring(5);
      term.writeln('');
      term.writeln(`\x1b[1;36mPinging ${host}...\x1b[0m`);

      // Simulate ping
      let count = 0;
      const pingInterval = setInterval(() => {
        if (count < 4) {
          const time = Math.floor(Math.random() * 50) + 10;
          term.writeln(`Reply from ${host}: bytes=64 time=${time}ms TTL=64`);
          count++;
        } else {
          clearInterval(pingInterval);
          term.writeln('');
          term.writeln('Ping statistics:');
          term.writeln('    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)');
          writePrompt(term);
        }
      }, 500);
      return;
    }

    // Check for demo responses
    const response = DEMO_COMMANDS[cmd];
    if (response) {
      term.write(response);
      writePrompt(term);
      return;
    }

    // Unknown command
    term.writeln('');
    term.writeln(`\x1b[1;31mUnknown command: ${command}\x1b[0m`);
    term.writeln('Type "help" for available commands');
    writePrompt(term);
  }, [nodeName, writePrompt, onClose]);

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

    // Welcome message
    term.writeln('\x1b[1;36m╔══════════════════════════════════════════════╗\x1b[0m');
    term.writeln('\x1b[1;36m║           NetOps Tower Terminal              ║\x1b[0m');
    term.writeln('\x1b[1;36m╚══════════════════════════════════════════════╝\x1b[0m');
    term.writeln('');
    term.writeln(`\x1b[1;32mConnecting to ${nodeName}...\x1b[0m`);

    // Simulate connection delay
    setTimeout(() => {
      term.writeln('\x1b[1;32mConnected!\x1b[0m');
      term.writeln('');
      term.writeln('\x1b[1;37mType "help" for available commands\x1b[0m');
      writePrompt(term);
      setConnected(true);
    }, 800);

    // Handle input
    let currentInput = '';
    term.onData((data) => {
      if (!connected) return;

      const code = data.charCodeAt(0);

      if (code === 13) { // Enter
        processCommand(term, currentInput);
        currentInput = '';
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
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      term.dispose();
    };
  }, [nodeName, settings.terminalFontSize, settings.terminalTheme, connected, processCommand, writePrompt]);

  return (
    <div className="flex flex-col h-full bg-[#0d0d1a] rounded-lg overflow-hidden border border-cyan-500/30">
      {/* Terminal header */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-cyan-500/30">
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse-glow' : 'bg-yellow-500'}`} />
          <span className="text-cyan-400 font-bold">{nodeName}</span>
          <span className="text-gray-500 text-sm">(telnet)</span>
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
              onClick={onClose}
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
