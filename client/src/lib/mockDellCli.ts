import { lowerTokens, matchesAbbreviation, matchesCommandStart, tokenize } from './mockCliHelpers';

export type DellCliMode =
  | 'exec'
  | 'config'
  | { kind: 'interface'; name: string }
  | { kind: 'vlan'; id: number };

export interface DellInterfaceState {
  name: string;
  description: string;
  vlanId: number | null;
  adminState: 'up' | 'down';
  switchportMode: 'access' | 'trunk';
}

export interface DellVlanState {
  id: number;
  name: string;
  active: boolean;
}

export interface DellRouteState {
  prefix: string;
  nextHop: string;
  distance: number;
}

export interface DellCliOptions {
  hostname?: string;
  version?: string;
  interfaces?: DellInterfaceState[];
  vlans?: DellVlanState[];
  routes?: DellRouteState[];
}

export interface DellCliResult {
  lines: string[];
  prompt: string;
  mode: DellCliMode;
  shouldDisconnect: boolean;
}

export interface DellCliSnapshot {
  hostname: string;
  mode: DellCliMode;
  interfaces: DellInterfaceState[];
  vlans: DellVlanState[];
  routes: DellRouteState[];
}

export interface DellCliSession {
  run(command: string): DellCliResult;
  getPrompt(): string;
  snapshot(): DellCliSnapshot;
}

const DEFAULT_VERSION = 'Dell EMC Networking OS10 10.5.4.1';

const DEFAULT_INTERFACES: DellInterfaceState[] = [
  { name: 'ethernet 1/1/1', description: 'Uplink to core', vlanId: 10, adminState: 'up', switchportMode: 'access' },
  { name: 'ethernet 1/1/2', description: 'Server trunk', vlanId: 20, adminState: 'up', switchportMode: 'trunk' },
  { name: 'ethernet 1/1/3', description: '', vlanId: null, adminState: 'down', switchportMode: 'access' },
];

const DEFAULT_VLANS: DellVlanState[] = [
  { id: 1, name: 'default', active: true },
  { id: 10, name: 'users', active: true },
  { id: 20, name: 'servers', active: true },
];

const DEFAULT_ROUTES: DellRouteState[] = [
  { prefix: '0.0.0.0/0', nextHop: '10.0.0.1', distance: 1 },
  { prefix: '172.16.0.0/16', nextHop: 'connected', distance: 0 },
];

const EXEC_HELP = [
  '  show                 Display operational information',
  '  configure terminal   Enter configuration mode',
  '  conf t               Enter configuration mode',
  '  exit                 Leave the session',
];

const CONFIG_HELP = [
  '  vlan <id>            Enter VLAN configuration',
  '  interface ethernet <name>  Enter interface configuration',
  '  ip route <prefix> <next-hop>  Add a static route',
  '  end                  Return to exec mode',
  '  exit                 Return to exec mode',
];

const INTERFACE_HELP = [
  '  description <text>   Set the interface description',
  '  switchport access vlan <id>  Set the access VLAN',
  '  switchport mode access|trunk  Set the switchport mode',
  '  no shutdown          Enable the interface',
  '  shutdown             Disable the interface',
  '  end                  Return to exec mode',
  '  exit                 Return to configuration mode',
];

const VLAN_HELP = [
  '  name <text>          Set the VLAN name',
  '  state active|suspend  Toggle VLAN state',
  '  end                  Return to exec mode',
  '  exit                 Return to configuration mode',
];

function cloneInterface(iface: DellInterfaceState): DellInterfaceState {
  return { ...iface };
}

function cloneVlan(vlan: DellVlanState): DellVlanState {
  return { ...vlan };
}

function cloneRoute(route: DellRouteState): DellRouteState {
  return { ...route };
}

function getPrompt(hostname: string, mode: DellCliMode): string {
  if (mode === 'exec') {
    return `${hostname}#`;
  }

  if (mode === 'config') {
    return `${hostname}(conf)#`;
  }

  if (mode.kind === 'interface') {
    return `${hostname}(conf-if-${mode.name})#`;
  }

  return `${hostname}(conf-vlan-${mode.id})#`;
}

function formatRunningConfiguration(hostname: string, interfaces: DellInterfaceState[], vlans: DellVlanState[], routes: DellRouteState[]): string[] {
  const lines = [
    'Current configuration:',
    `hostname ${hostname}`,
    '!',
  ];

  for (const vlan of vlans.slice().sort((left, right) => left.id - right.id)) {
    lines.push(`vlan ${vlan.id}`);
    lines.push(` name ${vlan.name}`);
    lines.push(vlan.active ? ' state active' : ' state suspend');
    lines.push('!');
  }

  for (const iface of interfaces.slice().sort((left, right) => left.name.localeCompare(right.name))) {
    lines.push(`interface ${iface.name}`);
    if (iface.description) {
      lines.push(` description ${iface.description}`);
    }
    if (iface.vlanId !== null) {
      lines.push(` switchport access vlan ${iface.vlanId}`);
    }
    lines.push(` switchport mode ${iface.switchportMode}`);
    lines.push(iface.adminState === 'up' ? ' no shutdown' : ' shutdown');
    lines.push('!');
  }

  for (const route of routes) {
    lines.push(`ip route ${route.prefix} ${route.nextHop} ${route.distance}`);
  }

  lines.push('end');
  return lines;
}

function formatInterfaceBrief(interfaces: DellInterfaceState[]): string[] {
  const lines = [
    'Interface          Description         VLAN  Admin   Mode',
    '------------------ ------------------- ----- ------- -----',
  ];

  for (const iface of interfaces.slice().sort((left, right) => left.name.localeCompare(right.name))) {
    const vlan = iface.vlanId === null ? '-' : String(iface.vlanId);
    lines.push(`${iface.name.padEnd(18)} ${iface.description.padEnd(19)} ${vlan.padEnd(5)} ${iface.adminState.padEnd(7)} ${iface.switchportMode}`);
  }

  return lines;
}

function formatVlans(vlans: DellVlanState[]): string[] {
  const lines = [
    'VID  Name            Status',
    '---- --------------- -------',
  ];

  for (const vlan of vlans.slice().sort((left, right) => left.id - right.id)) {
    lines.push(`${String(vlan.id).padEnd(4)} ${vlan.name.padEnd(15)} ${vlan.active ? 'active' : 'suspend'}`);
  }

  return lines;
}

function formatRoutes(routes: DellRouteState[]): string[] {
  const lines = [
    'Prefix        Next Hop     Distance',
    '------------- ------------ --------',
  ];

  for (const route of routes) {
    lines.push(`${route.prefix.padEnd(13)} ${route.nextHop.padEnd(12)} ${String(route.distance).padEnd(8)}`);
  }

  return lines;
}

function formatInventory(): string[] {
  return [
    'Chassis: Dell EMC S5148F-ON',
    'Service Tag: DEMO-OS10-001',
    'BIOS: 2.16.0',
    'Software: OS10',
  ];
}

function formatEnvironment(): string[] {
  return [
    'Temperature sensors: normal',
    'Fan status: normal',
    'Power supplies: redundant',
    'PSU1: present',
    'PSU2: present',
  ];
}

function helpFor(mode: DellCliMode, tokens: string[]): string[] {
  if (mode === 'exec') {
    if (tokens.length === 0 || matchesAbbreviation(tokens, ['show'])) {
      return ['  running-configuration', '  ip interface brief', '  vlan', '  ip route', '  inventory', '  environment', '  version'];
    }

    return EXEC_HELP;
  }

  if (mode === 'config') {
    return CONFIG_HELP;
  }

  if (mode.kind === 'interface') {
    return INTERFACE_HELP;
  }

  return VLAN_HELP;
}

export function createDellCli(options: DellCliOptions = {}): DellCliSession {
  let hostname = options.hostname ?? 'OS10-1';
  const version = options.version ?? DEFAULT_VERSION;
  const interfaces = new Map<string, DellInterfaceState>(
    (options.interfaces ?? DEFAULT_INTERFACES).map((iface) => [iface.name, cloneInterface(iface)]),
  );
  const vlans = new Map<number, DellVlanState>(
    (options.vlans ?? DEFAULT_VLANS).map((vlan) => [vlan.id, cloneVlan(vlan)]),
  );
  const routes = new Map<string, DellRouteState>(
    (options.routes ?? DEFAULT_ROUTES).map((route) => [route.prefix, cloneRoute(route)]),
  );
  let mode: DellCliMode = 'exec';

  function ensureInterface(name: string): DellInterfaceState {
    const existing = interfaces.get(name);
    if (existing) {
      return existing;
    }

    const created: DellInterfaceState = { name, description: '', vlanId: null, adminState: 'down', switchportMode: 'access' };
    interfaces.set(name, created);
    return created;
  }

  function ensureVlan(id: number): DellVlanState {
    const existing = vlans.get(id);
    if (existing) {
      return existing;
    }

    const created: DellVlanState = { id, name: `VLAN${id}`, active: true };
    vlans.set(id, created);
    return created;
  }

  function snapshot(): DellCliSnapshot {
    return {
      hostname,
      mode,
      interfaces: Array.from(interfaces.values()).map(cloneInterface).sort((left, right) => left.name.localeCompare(right.name)),
      vlans: Array.from(vlans.values()).map(cloneVlan).sort((left, right) => left.id - right.id),
      routes: Array.from(routes.values()).map(cloneRoute),
    };
  }

  function setMode(nextMode: DellCliMode): void {
    mode = nextMode;
  }

  function run(command: string): DellCliResult {
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
        if (matchesCommandStart(tokens, ['show', 'running-configuration']) || matchesCommandStart(tokens, ['show', 'run'])) {
          return { lines: formatRunningConfiguration(hostname, Array.from(interfaces.values()), Array.from(vlans.values()), Array.from(routes.values())), prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
        }

        if (matchesCommandStart(tokens, ['show', 'ip', 'interface', 'brief'])) {
          return { lines: formatInterfaceBrief(Array.from(interfaces.values())), prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
        }

        if (matchesCommandStart(tokens, ['show', 'vlan'])) {
          return { lines: formatVlans(Array.from(vlans.values())), prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
        }

        if (matchesCommandStart(tokens, ['show', 'ip', 'route'])) {
          return { lines: formatRoutes(Array.from(routes.values())), prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
        }

        if (matchesCommandStart(tokens, ['show', 'inventory'])) {
          return { lines: formatInventory(), prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
        }

        if (matchesCommandStart(tokens, ['show', 'version'])) {
          return { lines: [version, `Hostname: ${hostname}`], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
        }

        if (matchesCommandStart(tokens, ['show', 'environment'])) {
          return { lines: formatEnvironment(), prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
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
      if (matchesAbbreviation(tokens, ['end']) || matchesAbbreviation(tokens, ['exit'])) {
        setMode('exec');
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

      if (matchesCommandStart(tokens, ['interface', 'ethernet']) && rawTokens[2]) {
        const name = `ethernet ${rawTokens.slice(2).join(' ')}`;
        ensureInterface(name);
        setMode({ kind: 'interface', name });
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      const routeIndex = tokens.findIndex((token) => token === 'route');
      if (routeIndex !== -1 && tokens[0] === 'ip' && rawTokens[routeIndex + 2]) {
        const prefix = rawTokens[routeIndex + 1];
        const nextHop = rawTokens[routeIndex + 2];
        const distance = Number(rawTokens[routeIndex + 3] ?? '1');
        routes.set(prefix, { prefix, nextHop, distance: Number.isFinite(distance) ? distance : 1 });
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      return { lines: ['% Unrecognized configuration command'], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
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

      if (matchesCommandStart(tokens, ['switchport', 'access', 'vlan']) && rawTokens[3]) {
        const vlanId = Number(rawTokens[3]);
        if (!Number.isInteger(vlanId)) {
          return { lines: ['% Invalid VLAN id'], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
        }

        iface.vlanId = vlanId;
        ensureVlan(vlanId);
        return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
      }

      if (matchesCommandStart(tokens, ['switchport', 'mode']) && rawTokens[2]) {
        const switchMode = rawTokens[2].toLowerCase();
        if (switchMode === 'access' || switchMode === 'trunk') {
          iface.switchportMode = switchMode;
          return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
        }
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

      if (matchesCommandStart(tokens, ['state']) && rawTokens[1]) {
        const state = rawTokens[1].toLowerCase();
        if (state === 'active') {
          vlan.active = true;
          return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
        }

        if (state === 'suspend') {
          vlan.active = false;
          return { lines: [], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
        }
      }

      return { lines: ['% Unrecognized VLAN command'], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
    }

    return { lines: ['% Unrecognized command'], prompt: getPrompt(hostname, mode), mode, shouldDisconnect: false };
  }

  return { run, getPrompt: () => getPrompt(hostname, mode), snapshot };
}
