import { lowerTokens, matchesAbbreviation, matchesCommandStart, tokenize } from './mockCliHelpers';

export type ArubaCliMode =
  | 'exec'
  | 'config'
  | { kind: 'interface'; name: string }
  | { kind: 'vlan'; id: number }
  | { kind: 'routing' };

export interface ArubaInterfaceState {
  name: string;
  description: string;
  vlanId: number | null;
  adminState: 'up' | 'down';
}

export interface ArubaVlanState {
  id: number;
  name: string;
  active: boolean;
}

export interface ArubaRouteState {
  prefix: string;
  nextHop: string;
  interface: string | null;
}

export interface ArubaCliOptions {
  hostname?: string;
  version?: string;
  interfaces?: ArubaInterfaceState[];
  vlans?: ArubaVlanState[];
  routes?: ArubaRouteState[];
}

export interface ArubaCliResult {
  lines: string[];
  prompt: string;
  mode: ArubaCliMode;
  shouldDisconnect: boolean;
}

export interface ArubaCliSnapshot {
  hostname: string;
  mode: ArubaCliMode;
  interfaces: ArubaInterfaceState[];
  vlans: ArubaVlanState[];
  routes: ArubaRouteState[];
}

export interface ArubaCliSession {
  run(command: string): ArubaCliResult;
  getPrompt(): string;
  snapshot(): ArubaCliSnapshot;
}

const DEFAULT_VERSION = 'ArubaOS-CX 10.12.1000';

const DEFAULT_INTERFACES: ArubaInterfaceState[] = [
  { name: '1/1/1', description: 'Uplink to core', vlanId: 10, adminState: 'up' },
  { name: '1/1/2', description: 'User access port', vlanId: 20, adminState: 'up' },
  { name: '1/1/3', description: '', vlanId: null, adminState: 'down' },
];

const DEFAULT_VLANS: ArubaVlanState[] = [
  { id: 1, name: 'DEFAULT_VLAN', active: true },
  { id: 10, name: 'USERS', active: true },
  { id: 20, name: 'VOICE', active: true },
];

const DEFAULT_ROUTES: ArubaRouteState[] = [
  { prefix: '0.0.0.0/0', nextHop: '10.0.0.1', interface: '1/1/1' },
  { prefix: '10.20.0.0/16', nextHop: 'connected', interface: '1/1/2' },
];

const EXEC_HELP = [
  '  show                 Display operational information',
  '  configure terminal   Enter configuration mode',
  '  conf t               Enter configuration mode',
  '  exit                 Leave the session',
];

const CONFIG_HELP = [
  '  hostname <name>      Set the switch hostname',
  '  interface <name>     Enter interface configuration',
  '  vlan <id>            Enter VLAN configuration',
  '  routing              Enter routing configuration',
  '  end                  Return to exec mode',
  '  exit                 Return to exec mode',
];

const INTERFACE_HELP = [
  '  description <text>   Set the interface description',
  '  vlan access <id>     Assign an access VLAN',
  '  no shutdown          Enable the interface',
  '  shutdown             Disable the interface',
  '  end                  Return to exec mode',
  '  exit                 Return to configuration mode',
];

const VLAN_HELP = [
  '  name <text>          Set the VLAN name',
  '  active               Mark the VLAN active',
  '  shutdown             Mark the VLAN inactive',
  '  end                  Return to exec mode',
  '  exit                 Return to configuration mode',
];

const ROUTING_HELP = [
  '  ip route <prefix> <next-hop>  Add a static route',
  '  end                          Return to exec mode',
  '  exit                         Return to configuration mode',
];

function cloneInterface(iface: ArubaInterfaceState): ArubaInterfaceState {
  return { ...iface };
}

function cloneVlan(vlan: ArubaVlanState): ArubaVlanState {
  return { ...vlan };
}

function cloneRoute(route: ArubaRouteState): ArubaRouteState {
  return { ...route };
}

function getPrompt(hostname: string, mode: ArubaCliMode): string {
  if (mode === 'exec') {
    return `${hostname}#`;
  }

  if (mode === 'config') {
    return `${hostname}(config)#`;
  }

  if (mode.kind === 'interface') {
    return `${hostname}(config-if-${mode.name})#`;
  }

  if (mode.kind === 'vlan') {
    return `${hostname}(config-vlan-${mode.id})#`;
  }

  return `${hostname}(config-router)#`;
}

function formatRunningConfig(hostname: string, interfaces: ArubaInterfaceState[], vlans: ArubaVlanState[], routes: ArubaRouteState[]): string[] {
  const lines = [
    'Running configuration:',
    `hostname ${hostname}`,
    '!',
  ];

  for (const vlan of vlans.slice().sort((left, right) => left.id - right.id)) {
    lines.push(`vlan ${vlan.id}`);
    lines.push(` name ${vlan.name}`);
    lines.push(vlan.active ? ' active' : ' shutdown');
    lines.push('!');
  }

  for (const iface of interfaces.slice().sort((left, right) => left.name.localeCompare(right.name))) {
    lines.push(`interface ${iface.name}`);
    if (iface.description) {
      lines.push(` description ${iface.description}`);
    }
    if (iface.vlanId !== null) {
      lines.push(` vlan access ${iface.vlanId}`);
    }
    lines.push(iface.adminState === 'up' ? ' no shutdown' : ' shutdown');
    lines.push('!');
  }

  for (const route of routes) {
    lines.push(`ip route ${route.prefix} ${route.nextHop}${route.interface ? ` ${route.interface}` : ''}`);
  }

  lines.push('end');
  return lines;
}

function formatVlans(vlans: ArubaVlanState[]): string[] {
  const lines = [
    'VID  Name           Status',
    '---- -------------- -------',
  ];

  for (const vlan of vlans.slice().sort((left, right) => left.id - right.id)) {
    lines.push(`${String(vlan.id).padEnd(4)} ${vlan.name.padEnd(14)} ${vlan.active ? 'active' : 'inactive'}`);
  }

  return lines;
}

function formatInterfaces(interfaces: ArubaInterfaceState[]): string[] {
  const lines = [
    'Port   Description         VLAN  Admin',
    '------ ------------------- ----- ------',
  ];

  for (const iface of interfaces.slice().sort((left, right) => left.name.localeCompare(right.name))) {
    const vlan = iface.vlanId === null ? '-' : String(iface.vlanId);
    lines.push(`${iface.name.padEnd(6)} ${iface.description.padEnd(19)} ${vlan.padEnd(5)} ${iface.adminState}`);
  }

  return lines;
}

function formatLldpNeighbors(): string[] {
  return [
    'Local Intf  Chassis ID           Port ID        System Name',
    '----------  -------------------  -------------  ----------------',
    '1/1/1       00:11:22:33:44:55     1/1/48         CORE-SW1',
    '1/1/2       00:aa:bb:cc:dd:ee     1/1/24         ACCESS-SW2',
  ];
}

function formatRoutes(routes: ArubaRouteState[]): string[] {
  const lines = [
    'Prefix        Next Hop     Interface',
    '------------- ------------ ----------',
  ];

  for (const route of routes) {
    lines.push(`${route.prefix.padEnd(13)} ${route.nextHop.padEnd(12)} ${route.interface ?? '-'}`);
  }

  return lines;
}

function formatVersion(version: string, hostname: string): string[] {
  return [
    version,
    `Hostname: ${hostname}`,
    'Image file: primary',
  ];
}

function helpFor(mode: ArubaCliMode, tokens: string[]): string[] {
  if (mode === 'exec') {
    if (tokens.length === 0 || matchesAbbreviation(tokens, ['show'])) {
      return tokens.length <= 1 ? ['  running-config', '  vlan', '  interface', '  lldp neighbor-info', '  ip route', '  version'] : EXEC_HELP;
    }

    return EXEC_HELP;
  }

  if (mode === 'config') {
    if (tokens.length === 0) {
      return CONFIG_HELP;
    }

    if (matchesAbbreviation(tokens, ['interface'])) {
      return ['  1/1/1', '  1/1/2', '  1/1/3'];
    }

    if (matchesAbbreviation(tokens, ['vlan'])) {
      return ['  1', '  10', '  20'];
    }

    return CONFIG_HELP;
  }

  if (mode.kind === 'interface') {
    return INTERFACE_HELP;
  }

  if (mode.kind === 'vlan') {
    return VLAN_HELP;
  }

  return ROUTING_HELP;
}

export function createArubaCli(options: ArubaCliOptions = {}): ArubaCliSession {
  let hostname = options.hostname ?? 'AOSCX-1';
  const version = options.version ?? DEFAULT_VERSION;
  const interfaces = new Map<string, ArubaInterfaceState>(
    (options.interfaces ?? DEFAULT_INTERFACES).map((iface) => [iface.name, cloneInterface(iface)]),
  );
  const vlans = new Map<number, ArubaVlanState>(
    (options.vlans ?? DEFAULT_VLANS).map((vlan) => [vlan.id, cloneVlan(vlan)]),
  );
  const routes = new Map<string, ArubaRouteState>(
    (options.routes ?? DEFAULT_ROUTES).map((route) => [route.prefix, cloneRoute(route)]),
  );
  let mode: ArubaCliMode = 'exec';

  function ensureInterface(name: string): ArubaInterfaceState {
    const existing = interfaces.get(name);
    if (existing) {
      return existing;
    }

    const created: ArubaInterfaceState = { name, description: '', vlanId: null, adminState: 'down' };
    interfaces.set(name, created);
    return created;
  }

  function ensureVlan(id: number): ArubaVlanState {
    const existing = vlans.get(id);
    if (existing) {
      return existing;
    }

    const created: ArubaVlanState = { id, name: `VLAN${id}`, active: true };
    vlans.set(id, created);
    return created;
  }

  function snapshot(): ArubaCliSnapshot {
    return {
      hostname,
      mode,
      interfaces: Array.from(interfaces.values()).map(cloneInterface).sort((left, right) => left.name.localeCompare(right.name)),
      vlans: Array.from(vlans.values()).map(cloneVlan).sort((left, right) => left.id - right.id),
      routes: Array.from(routes.values()).map(cloneRoute),
    };
  }

  function setMode(nextMode: ArubaCliMode): void {
    mode = nextMode;
  }

  function run(command: string): ArubaCliResult {
    const trimmed = command.trim();
    const rawTokens = tokenize(trimmed);
    const tokens = lowerTokens(rawTokens);

    if (trimmed === '' || trimmed === 'clear') {
      return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
    }

    const helpIndex = rawTokens.indexOf('?');
    if (helpIndex !== -1) {
      return { lines: helpFor(mode, rawTokens.slice(0, helpIndex)), prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
    }

    if (mode === 'exec') {
      if (matchesAbbreviation(tokens, ['help'])) {
        return { lines: EXEC_HELP, prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesCommandStart(tokens, ['show'])) {
        if (matchesCommandStart(tokens, ['show', 'running-config']) || matchesCommandStart(tokens, ['show', 'run'])) {
          return { lines: formatRunningConfig(hostname, Array.from(interfaces.values()), Array.from(vlans.values()), Array.from(routes.values())), prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
        }

        if (matchesCommandStart(tokens, ['show', 'vlan'])) {
          return { lines: formatVlans(Array.from(vlans.values())), prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
        }

        if (matchesCommandStart(tokens, ['show', 'interface'])) {
          return { lines: formatInterfaces(Array.from(interfaces.values())), prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
        }

        if (matchesCommandStart(tokens, ['show', 'lldp', 'neighbor-info'])) {
          return { lines: formatLldpNeighbors(), prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
        }

        if (matchesCommandStart(tokens, ['show', 'ip', 'route'])) {
          return { lines: formatRoutes(Array.from(routes.values())), prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
        }

        if (matchesCommandStart(tokens, ['show', 'version'])) {
          return { lines: formatVersion(version, hostname), prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
        }
      }

      if (matchesAbbreviation(tokens, ['configure', 'terminal']) || matchesAbbreviation(tokens, ['conf', 't'])) {
        setMode('config');
        return { lines: ['Enter configuration commands, one per line. End with CNTL/Z.'], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(tokens, ['exit'])) {
        return { lines: ['Logout'], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: true };
      }

      return { lines: [`% Invalid input detected at '^' marker.`], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
    }

    if (mode === 'config') {
      if (matchesAbbreviation(tokens, ['end'])) {
        setMode('exec');
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(tokens, ['exit'])) {
        setMode('exec');
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesCommandStart(tokens, ['hostname']) && rawTokens[1]) {
        hostname = rawTokens.slice(1).join(' ');
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesCommandStart(tokens, ['interface']) && rawTokens[1]) {
        setMode({ kind: 'interface', name: rawTokens.slice(1).join(' ') });
        ensureInterface(rawTokens.slice(1).join(' '));
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesCommandStart(tokens, ['vlan']) && rawTokens[1]) {
        const id = Number(rawTokens[1]);
        if (!Number.isInteger(id)) {
          return { lines: ['% Invalid VLAN id'], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
        }

        ensureVlan(id);
        setMode({ kind: 'vlan', id });
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(tokens, ['routing'])) {
        setMode({ kind: 'routing' });
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      return { lines: ['% Unrecognized command'], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
    }

    if (mode.kind === 'interface') {
      const iface = ensureInterface(mode.name);

      if (matchesAbbreviation(tokens, ['end'])) {
        setMode('exec');
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(tokens, ['exit'])) {
        setMode('config');
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesCommandStart(tokens, ['description']) && rawTokens.length >= 2) {
        iface.description = rawTokens.slice(1).join(' ');
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesCommandStart(tokens, ['vlan', 'access']) && rawTokens[2]) {
        const vlanId = Number(rawTokens[2]);
        if (!Number.isInteger(vlanId)) {
          return { lines: ['% Invalid VLAN id'], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
        }

        iface.vlanId = vlanId;
        ensureVlan(vlanId);
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(tokens, ['no', 'shutdown'])) {
        iface.adminState = 'up';
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(tokens, ['shutdown'])) {
        iface.adminState = 'down';
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      return { lines: ['% Unrecognized interface command'], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
    }

    if (mode.kind === 'vlan') {
      const vlan = ensureVlan(mode.id);

      if (matchesAbbreviation(tokens, ['end'])) {
        setMode('exec');
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(tokens, ['exit'])) {
        setMode('config');
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesCommandStart(tokens, ['name']) && rawTokens.length >= 2) {
        vlan.name = rawTokens.slice(1).join(' ');
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(tokens, ['active'])) {
        vlan.active = true;
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(tokens, ['shutdown'])) {
        vlan.active = false;
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      return { lines: ['% Unrecognized VLAN command'], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
    }

    if (matchesAbbreviation(tokens, ['end'])) {
      setMode('exec');
      return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
    }

    if (matchesAbbreviation(tokens, ['exit'])) {
      setMode('config');
      return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
    }

    const routeIndex = tokens.findIndex((token) => token === 'route');
    if (routeIndex !== -1 && tokens[0] === 'ip' && rawTokens[routeIndex + 2]) {
      const prefix = rawTokens[routeIndex + 1];
      const nextHop = rawTokens[routeIndex + 2];
      routes.set(prefix, { prefix, nextHop, interface: rawTokens[routeIndex + 3] ?? null });
      return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
    }

    return { lines: ['% Unrecognized routing command'], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
  }

  return { run, getPrompt: () => getPrompt(hostname, mode), snapshot };
}
