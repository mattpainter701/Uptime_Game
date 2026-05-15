export type CiscoCliMode =
  | 'exec'
  | 'config'
  | { kind: 'interface'; name: string };

export interface CiscoInterfaceState {
  name: string;
  description: string;
  ipAddress: string | null;
  subnetMask: string | null;
  shutdown: boolean;
}

export interface CiscoStaticRoute {
  network: string;
  mask: string;
  nextHop: string;
}

export interface CiscoCliOptions {
  hostname?: string;
  version?: string;
  pingResolver?: (target: string) => boolean;
  interfaces?: CiscoInterfaceState[];
  vlans?: number[];
  routes?: CiscoStaticRoute[];
}

export interface CiscoCliResult {
  lines: string[];
  prompt: string;
  mode: CiscoCliMode;
  shouldDisconnect: boolean;
}

export interface CiscoCliSnapshot {
  hostname: string;
  mode: CiscoCliMode;
  interfaces: CiscoInterfaceState[];
  vlans: number[];
  routes: CiscoStaticRoute[];
}

export interface CiscoCliSession {
  run(command: string): CiscoCliResult;
  getPrompt(): string;
  snapshot(): CiscoCliSnapshot;
}

const DEFAULT_VERSION = 'Cisco IOS XE Software, Version 17.9.1';

const DEFAULT_INTERFACES: CiscoInterfaceState[] = [
  {
    name: 'GigabitEthernet0/0',
    description: 'Uplink to distribution switch',
    ipAddress: '192.168.1.1',
    subnetMask: '255.255.255.0',
    shutdown: false,
  },
  {
    name: 'GigabitEthernet0/1',
    description: 'User VLAN trunk',
    ipAddress: '10.0.0.1',
    subnetMask: '255.255.255.0',
    shutdown: false,
  },
  {
    name: 'GigabitEthernet0/2',
    description: '',
    ipAddress: null,
    subnetMask: null,
    shutdown: true,
  },
];

const EXEC_COMMAND_HELP = [
  '  show                Show system information',
  '  ping <host>         Send ICMP echo requests',
  '  conf t              Enter configuration mode',
  '  configure terminal  Enter configuration mode',
  '  exit                Disconnect session',
  '  help                Show available commands',
];

const SHOW_HELP = [
  '  version                 Display software version',
  '  running-config          Display active configuration',
  '  ip interface brief      Display interface summary',
  '  ip route                Display routing table',
  '  vlan brief              Display VLAN summary',
  '  mac address-table       Display learned MAC addresses',
  '  cdp neighbors           Display Cisco Discovery Protocol neighbors',
  '  ip ospf neighbor        Display OSPF neighbors',
  '  ip bgp summary          Display BGP session summary',
];

const CONFIG_HELP = [
  '  hostname <name>         Set system hostname',
  '  interface <name>        Enter interface configuration mode',
  '  ip route <net> <mask> <next-hop>  Add a static route',
  '  vlan <id>               Create a VLAN',
  '  end                     Return to privileged EXEC mode',
  '  exit                    Return to privileged EXEC mode',
];

const INTERFACE_HELP = [
  '  ip address <ip> <mask>  Assign interface address',
  '  no shutdown             Enable the interface',
  '  shutdown                Disable the interface',
  '  description <text>      Set interface description',
  '  end                     Return to privileged EXEC mode',
  '  exit                    Return to global configuration mode',
];

function cloneInterface(iface: CiscoInterfaceState): CiscoInterfaceState {
  return { ...iface };
}

function cloneRoute(route: CiscoStaticRoute): CiscoStaticRoute {
  return { ...route };
}

function buildDefaultInterfaces(): Record<string, CiscoInterfaceState> {
  return DEFAULT_INTERFACES.reduce<Record<string, CiscoInterfaceState>>((acc, iface) => {
    acc[iface.name] = cloneInterface(iface);
    return acc;
  }, {});
}

function tokenize(command: string): string[] {
  return command.trim().split(/\s+/).filter(Boolean);
}

function toLowerTokens(tokens: string[]): string[] {
  return tokens.map((token) => token.toLowerCase());
}

function matchesAbbreviation(input: string[], candidate: string[]): boolean {
  if (input.length > candidate.length) {
    return false;
  }

  return input.every((token, index) => candidate[index].toLowerCase().startsWith(token.toLowerCase()));
}

function matchesCommandStart(input: string[], candidate: string[]): boolean {
  if (input.length < candidate.length) {
    return false;
  }

  return candidate.every((token, index) => input[index].toLowerCase().startsWith(token.toLowerCase()));
}

function modeToPromptSuffix(mode: CiscoCliMode): string {
  if (mode === 'exec') {
    return '#';
  }

  if (mode === 'config') {
    return '(config)#';
  }

  return '(config-if)#';
}

function formatInterfaceLine(iface: CiscoInterfaceState): string {
  const status = iface.shutdown ? 'administratively down' : 'up';
  const protocol = iface.shutdown ? 'down' : 'up';
  const ipAddress = iface.ipAddress ?? 'unassigned';
  return `${iface.name.padEnd(22)} ${ipAddress.padEnd(15)} YES manual ${status.padEnd(21)} ${protocol}`;
}

function formatRunningConfig(hostname: string, interfaces: CiscoInterfaceState[], routes: CiscoStaticRoute[], vlans: number[]): string[] {
  const lines: string[] = [
    'Building configuration...',
    '',
    `Current configuration : ${1024 + interfaces.length * 128 + routes.length * 64 + vlans.length * 32} bytes`,
    '!',
    `hostname ${hostname}`,
    '!',
  ];

  for (const iface of interfaces) {
    lines.push(`interface ${iface.name}`);
    if (iface.description) {
      lines.push(` description ${iface.description}`);
    }
    if (iface.ipAddress && iface.subnetMask) {
      lines.push(` ip address ${iface.ipAddress} ${iface.subnetMask}`);
    }
    lines.push(iface.shutdown ? ' shutdown' : ' no shutdown');
    lines.push('!');
  }

  for (const vlan of vlans) {
    lines.push(`vlan ${vlan}`);
    lines.push(` name VLAN${String(vlan).padStart(4, '0')}`);
    lines.push('!');
  }

  for (const route of routes) {
    lines.push(`ip route ${route.network} ${route.mask} ${route.nextHop}`);
  }

  lines.push('end');
  return lines;
}

function formatVlanBrief(vlans: Set<number>): string[] {
  const sortedVlans = Array.from(vlans).sort((left, right) => left - right);
  const lines = [
    'VLAN Name                             Status    Ports',
    '---- -------------------------------- --------- -------------------------------',
    '1    default                          active    ',
  ];

  for (const vlan of sortedVlans) {
    if (vlan === 1) {
      continue;
    }
    lines.push(`${String(vlan).padEnd(4)} VLAN${String(vlan).padStart(4, '0').padEnd(32)} active`);
  }

  return lines;
}

function formatMacTable(): string[] {
  return [
    'Mac Address Table',
    '-------------------------------------------',
    'Vlan    Mac Address       Type        Ports',
    '----    -----------       --------    -----',
    '1       0011.2233.4455    DYNAMIC     GigabitEthernet0/0',
    '10      00aa.bbcc.ddee    DYNAMIC     GigabitEthernet0/1',
  ];
}

function formatCdpNeighbors(): string[] {
  return [
    'Capability Codes: R - Router, S - Switch, I - IGMP, M - MAC Relay',
    '',
    'Device ID        Local Intrfce     Holdtme    Capability  Platform  Port ID',
    'SW1              Gig0/0            153        S I         Catalyst  Gig0/1',
    'R2               Gig0/1            143        R           IOS XE    Gig0/0',
  ];
}

function formatOspfNeighbors(): string[] {
  return [
    'Neighbor ID     Pri   State           Dead Time   Address         Interface',
    '10.0.0.2         1   FULL/DR         00:00:34    10.0.0.2        GigabitEthernet0/1',
  ];
}

function formatBgpSummary(): string[] {
  return [
    'BGP router identifier 192.168.1.1, local AS number 65000',
    '',
    'Neighbor        V    AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd',
    '10.0.0.3        4 65001     100     120        1    0    0 1d02h           12',
  ];
}

function formatVersion(hostname: string, version: string): string[] {
  return [
    version,
    'Cisco IOS Software, NetOps Tower Demo Image',
    `Technical Support: ${hostname}-support@example.com`,
    'System image file is "flash:uptime_game_demo.bin"',
  ];
}

function formatPing(target: string, reachable: boolean): string[] {
  return [
    'Type escape sequence to abort.',
    `Sending 5, 100-byte ICMP Echos to ${target}, timeout is 2 seconds:`,
    reachable ? '!!!!!' : '.....',
    reachable
      ? 'Success rate is 100 percent (5/5), round-trip min/avg/max = 1/3/5 ms'
      : 'Success rate is 0 percent (0/5)',
  ];
}

function getHelpLines(mode: CiscoCliMode, tokens: string[]): string[] {
  if (mode === 'exec') {
    if (tokens.length === 0) {
      return EXEC_COMMAND_HELP;
    }

    if (matchesAbbreviation(tokens, ['show'])) {
      if (tokens.length === 1) {
        return SHOW_HELP;
      }

      if (matchesAbbreviation(tokens, ['show', 'ip'])) {
        return [
          '  interface brief        Display interface summary',
          '  route                  Display routing table',
        ];
      }
    }

    if (matchesAbbreviation(tokens, ['configure']) || matchesAbbreviation(tokens, ['conf'])) {
      return ['  terminal               Enter configuration mode'];
    }

    return EXEC_COMMAND_HELP;
  }

  if (mode === 'config') {
    if (tokens.length === 0) {
      return CONFIG_HELP;
    }

    if (matchesAbbreviation(tokens, ['interface'])) {
      return DEFAULT_INTERFACES.map((iface) => `  ${iface.name}`);
    }

    return CONFIG_HELP;
  }

  if (tokens.length === 0) {
    return INTERFACE_HELP;
  }

  return INTERFACE_HELP;
}

function getPrompt(hostname: string, mode: CiscoCliMode): string {
  return `${hostname}${modeToPromptSuffix(mode)}`;
}

export function createCiscoCli(options: CiscoCliOptions = {}): CiscoCliSession {
  let hostname = options.hostname ?? 'R1';
  const version = options.version ?? DEFAULT_VERSION;
  const pingResolver = options.pingResolver ?? (() => true);
  const interfaces = options.interfaces
    ? options.interfaces.reduce<Record<string, CiscoInterfaceState>>((acc, iface) => {
        acc[iface.name] = cloneInterface(iface);
        return acc;
      }, {})
    : buildDefaultInterfaces();
  const routes = options.routes ? options.routes.map(cloneRoute) : [];
  const vlans = new Set<number>(options.vlans ?? [1]);
  let mode: CiscoCliMode = 'exec';

  function ensureInterface(name: string): CiscoInterfaceState {
    if (!interfaces[name]) {
      interfaces[name] = {
        name,
        description: '',
        ipAddress: null,
        subnetMask: null,
        shutdown: true,
      };
    }

    return interfaces[name];
  }

  function snapshot(): CiscoCliSnapshot {
    return {
      hostname,
      mode,
      interfaces: Object.values(interfaces).map(cloneInterface).sort((left, right) => left.name.localeCompare(right.name)),
      vlans: Array.from(vlans).sort((left, right) => left - right),
      routes: routes.map(cloneRoute),
    };
  }

  function setMode(nextMode: CiscoCliMode): void {
    mode = nextMode;
  }

  function run(command: string): CiscoCliResult {
    const trimmed = command.trim();
    const rawTokens = tokenize(trimmed);
    const lowerTokens = toLowerTokens(rawTokens);

    if (trimmed === '') {
      return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
    }

    if (trimmed === 'clear') {
      return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
    }

    const helpIndex = rawTokens.indexOf('?');
    if (helpIndex !== -1) {
      const contextTokens = rawTokens.slice(0, helpIndex);
      return {
        lines: getHelpLines(mode, contextTokens),
        prompt: getPrompt(hostname, mode),
        mode,
        shouldDisconnect: false,
      };
    }

    if (mode === 'exec') {
      if (matchesAbbreviation(lowerTokens, ['help'])) {
        return { lines: EXEC_COMMAND_HELP, prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(lowerTokens, ['exit'])) {
        return {
          lines: ['Disconnecting session...'],
          prompt: getPrompt(hostname, mode),
          mode,
          shouldDisconnect: true,
        };
      }

      if (matchesAbbreviation(lowerTokens, ['configure', 'terminal']) || matchesAbbreviation(lowerTokens, ['conf', 't'])) {
        setMode('config');
        return {
          lines: ['Enter configuration commands, one per line. End with CNTL/Z.'],
          prompt: getPrompt(hostname, mode),
          mode,
          shouldDisconnect: false,
        };
      }

      if (matchesAbbreviation(lowerTokens, ['show', 'version'])) {
        return { lines: formatVersion(hostname, version), prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(lowerTokens, ['show', 'running-config']) || matchesAbbreviation(lowerTokens, ['show', 'run'])) {
        return { lines: formatRunningConfig(hostname, snapshot().interfaces, routes, snapshot().vlans), prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(lowerTokens, ['show', 'ip', 'interface', 'brief']) || matchesAbbreviation(lowerTokens, ['show', 'ip', 'int', 'bri'])) {
        return { lines: ['Interface              IP-Address      OK? Method Status                Protocol', ...Object.values(interfaces).sort((left, right) => left.name.localeCompare(right.name)).map(formatInterfaceLine)], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(lowerTokens, ['show', 'ip', 'route'])) {
        const lines = [
          'Codes: C - connected, S - static, R - RIP, O - OSPF',
          '',
          'Gateway of last resort is not set',
          '',
          '     10.0.0.0/24 is variably subnetted, 1 subnets, 1 masks',
        ];
        for (const route of routes) {
          lines.push(`S    ${route.network}/${route.mask} [1/0] via ${route.nextHop}`);
        }
        if (routes.length === 0) {
          lines.push('C    192.168.1.0/24 is directly connected, GigabitEthernet0/0');
          lines.push('C    10.0.0.0/24 is directly connected, GigabitEthernet0/1');
        }
        return { lines, prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(lowerTokens, ['show', 'vlan', 'brief'])) {
        return { lines: formatVlanBrief(vlans), prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(lowerTokens, ['show', 'mac', 'address-table'])) {
        return { lines: formatMacTable(), prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(lowerTokens, ['show', 'cdp', 'neighbors'])) {
        return { lines: formatCdpNeighbors(), prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(lowerTokens, ['show', 'ip', 'ospf', 'neighbor'])) {
        return { lines: formatOspfNeighbors(), prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(lowerTokens, ['show', 'ip', 'bgp', 'summary'])) {
        return { lines: formatBgpSummary(), prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesCommandStart(lowerTokens, ['ping']) && rawTokens.length >= 2) {
        const target = rawTokens.slice(1).join(' ');
        return {
          lines: formatPing(target, pingResolver(target)),
          prompt: getPrompt(hostname, mode),
          mode,
          shouldDisconnect: false,
        };
      }

      return { lines: [`% Invalid input detected at '^' marker.`], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
    }

    if (mode === 'config') {
      if (matchesAbbreviation(lowerTokens, ['end'])) {
        setMode('exec');
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(lowerTokens, ['exit'])) {
        setMode('exec');
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesCommandStart(lowerTokens, ['hostname']) && rawTokens.length >= 2) {
        hostname = rawTokens.slice(1).join(' ');
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesCommandStart(lowerTokens, ['interface']) && rawTokens.length >= 2) {
        const interfaceName = rawTokens.slice(1).join(' ');
        ensureInterface(interfaceName);
        setMode({ kind: 'interface', name: interfaceName });
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesCommandStart(lowerTokens, ['ip', 'route']) && rawTokens.length >= 5) {
        const [network, mask, nextHop] = rawTokens.slice(2, 5);
        const existingIndex = routes.findIndex((route) => route.network === network && route.mask === mask);
        const route = { network, mask, nextHop };
        if (existingIndex >= 0) {
          routes[existingIndex] = route;
        } else {
          routes.push(route);
        }
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesCommandStart(lowerTokens, ['vlan']) && rawTokens.length >= 2) {
        const vlanId = Number.parseInt(rawTokens[1], 10);
        if (!Number.isInteger(vlanId) || vlanId < 1 || vlanId > 4094) {
          return { lines: ['% Invalid VLAN ID'], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
        }
        vlans.add(vlanId);
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      return { lines: [`% Invalid input detected at '^' marker.`], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
    }

    if (mode.kind === 'interface') {
      const iface = ensureInterface(mode.name);

      if (matchesAbbreviation(lowerTokens, ['end'])) {
        setMode('exec');
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(lowerTokens, ['exit'])) {
        setMode('config');
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesCommandStart(lowerTokens, ['no', 'shutdown'])) {
        iface.shutdown = false;
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesCommandStart(lowerTokens, ['shutdown'])) {
        iface.shutdown = true;
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesCommandStart(lowerTokens, ['ip', 'address']) && rawTokens.length >= 4) {
        iface.ipAddress = rawTokens[2];
        iface.subnetMask = rawTokens[3];
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesCommandStart(lowerTokens, ['description']) && rawTokens.length >= 2) {
        iface.description = rawTokens.slice(1).join(' ');
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      return { lines: [`% Invalid input detected at '^' marker.`], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
    }

    return { lines: [`% Invalid input detected at '^' marker.`], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
  }

  return {
    run,
    getPrompt: () => getPrompt(hostname, mode),
    snapshot,
  };
}