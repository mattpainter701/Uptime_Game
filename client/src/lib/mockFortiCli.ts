export type FortiCliMode =
  | 'exec'
  | 'config'
  | { kind: 'section'; section: FortiSection }
  | { kind: 'edit'; section: FortiSection; key: string };

export type FortiSection =
  | 'system-global'
  | 'system-interface'
  | 'firewall-policy'
  | 'firewall-address'
  | 'firewall-service-custom'
  | 'router-static';

export interface FortiInterfaceState {
  name: string;
  alias: string;
  ipAddress: string | null;
  netmask: string | null;
  allowaccess: string[];
  status: 'up' | 'down';
}

export interface FortiPolicyState {
  id: number;
  name: string;
  srcintf: string[];
  dstintf: string[];
  action: 'accept' | 'deny';
  service: string[];
  schedule: string;
  nat: boolean;
  logtraffic: 'all' | 'utm' | 'disable';
  hitCount: number;
}

export interface FortiAddressState {
  name: string;
  subnet: string | null;
  interface: string | null;
}

export interface FortiServiceState {
  name: string;
  protocol: 'TCP' | 'UDP' | 'TCP/UDP';
  tcpPortrange: string | null;
  udpPortrange: string | null;
}

export interface FortiStaticRouteState {
  id: number;
  dst: string;
  gateway: string;
  device: string;
  distance: number;
  status: 'enable' | 'disable';
}

export interface FortiGlobalState {
  hostname: string;
  admintimeout: number;
  timezone: string;
}

export interface FortiCliOptions {
  hostname?: string;
  version?: string;
  interfaces?: FortiInterfaceState[];
  policies?: FortiPolicyState[];
  addresses?: FortiAddressState[];
  services?: FortiServiceState[];
  routes?: FortiStaticRouteState[];
  global?: Partial<FortiGlobalState>;
}

export interface FortiCliResult {
  lines: string[];
  prompt: string;
  mode: FortiCliMode;
  shouldDisconnect: boolean;
}

export interface FortiCliSnapshot {
  global: FortiGlobalState;
  mode: FortiCliMode;
  interfaces: FortiInterfaceState[];
  policies: FortiPolicyState[];
  addresses: FortiAddressState[];
  services: FortiServiceState[];
  routes: FortiStaticRouteState[];
}

export interface FortiCliSession {
  run(command: string): FortiCliResult;
  getPrompt(): string;
  snapshot(): FortiCliSnapshot;
  autocomplete(partialInput: string): string[];
}

const DEFAULT_VERSION = 'FortiGate-VM64 v7.4.3,build2463,231219 (GA)';

const DEFAULT_INTERFACES: FortiInterfaceState[] = [
  {
    name: 'port1',
    alias: 'wan',
    ipAddress: '203.0.113.2',
    netmask: '255.255.255.0',
    allowaccess: ['ping', 'https', 'ssh'],
    status: 'up',
  },
  {
    name: 'port2',
    alias: 'lan',
    ipAddress: '10.0.0.1',
    netmask: '255.255.255.0',
    allowaccess: ['ping', 'https', 'ssh'],
    status: 'up',
  },
];

const DEFAULT_POLICIES: FortiPolicyState[] = [
  {
    id: 1,
    name: 'LAN-to-WAN',
    srcintf: ['port2'],
    dstintf: ['port1'],
    action: 'accept',
    service: ['ALL'],
    schedule: 'always',
    nat: true,
    logtraffic: 'all',
    hitCount: 2487,
  },
];

const DEFAULT_ADDRESSES: FortiAddressState[] = [
  { name: 'LAN_SUBNET', subnet: '10.0.0.0 255.255.255.0', interface: 'port2' },
];

const DEFAULT_SERVICES: FortiServiceState[] = [
  { name: 'HTTPS-ALT', protocol: 'TCP', tcpPortrange: '8443', udpPortrange: null },
];

const DEFAULT_ROUTES: FortiStaticRouteState[] = [
  { id: 1, dst: '0.0.0.0/0', gateway: '203.0.113.1', device: 'port1', distance: 10, status: 'enable' },
];

const EXEC_HELP = [
  '  get                 Display device information',
  '  show                Display configuration',
  '  config              Enter configuration mode',
  '  diagnose            Run diagnostics',
  '  exit                Log out of the session',
];

const GET_HELP = [
  '  system status                Display firmware and system information',
  '  system interface             Display interface status',
  '  router info routing-table all Display the routing table',
];

const SHOW_HELP = [
  '  system interface             Display interface configuration',
  '  firewall policy              Display policy table',
  '  firewall address             Display address objects',
  '  firewall service custom      Display custom services',
  '  router static                Display static routes',
];

const CONFIG_HELP = [
  '  system global                Enter global system settings',
  '  system interface             Enter interface configuration',
  '  firewall policy              Enter firewall policy configuration',
  '  firewall address             Enter address-object configuration',
  '  firewall service custom      Enter service-object configuration',
  '  router static                Enter static-route configuration',
  '  end                          Leave configuration mode',
];

const SYSTEM_GLOBAL_HELP = [
  '  set hostname <name>          Change the device hostname',
  '  set admintimeout <minutes>   Set the admin timeout',
  '  set timezone <zone>          Set the timezone label',
  '  show                         Display the current global settings',
  '  end                          Return to the exec prompt',
  '  exit                         Return to the exec prompt',
];

const SYSTEM_INTERFACE_HELP = [
  '  edit <name>                  Create or select an interface',
  '  show                         Display all interface definitions',
  '  end                          Return to the exec prompt',
  '  exit                         Return to the config prompt',
];

const INTERFACE_EDIT_HELP = [
  '  set ip <ip> <mask>           Assign an interface address',
  '  set alias <text>             Set the interface alias',
  '  set allowaccess <svc...>     Set management access services',
  '  set status up|down           Enable or disable the interface',
  '  next                         Save and return to the section',
  '  end                          Save and return to the exec prompt',
  '  show                         Show the current interface',
];

const POLICY_HELP = [
  '  edit <id>                    Create or select a policy',
  '  show                         Display all policies',
  '  move <id> before|after <id>  Reorder a policy in the list',
  '  end                          Return to the exec prompt',
  '  exit                         Return to the config prompt',
];

const POLICY_EDIT_HELP = [
  '  set name <text>              Set the policy name',
  '  set srcintf <ifaces...>      Set source interfaces',
  '  set dstintf <ifaces...>      Set destination interfaces',
  '  set action accept|deny       Set the policy action',
  '  set service <services...>    Set service objects',
  '  set nat enable|disable       Toggle source NAT',
  '  set logtraffic all|utm|disable  Configure logging',
  '  next                         Save and return to the section',
  '  end                          Save and return to the exec prompt',
  '  show                         Show the current policy',
];

const ADDRESS_HELP = [
  '  edit <name>                  Create or select an address object',
  '  show                         Display all address objects',
  '  end                          Return to the exec prompt',
  '  exit                         Return to the config prompt',
];

const ADDRESS_EDIT_HELP = [
  '  set subnet <ip> <mask>       Set the address subnet',
  '  set interface <name>         Bind the object to an interface',
  '  next                         Save and return to the section',
  '  end                          Save and return to the exec prompt',
  '  show                         Show the current address object',
];

const SERVICE_HELP = [
  '  edit <name>                  Create or select a custom service',
  '  show                         Display all service objects',
  '  end                          Return to the exec prompt',
  '  exit                         Return to the config prompt',
];

const SERVICE_EDIT_HELP = [
  '  set protocol TCP|UDP|TCP/UDP Set the service protocol',
  '  set tcp-portrange <ports>    Set TCP port range',
  '  set udp-portrange <ports>    Set UDP port range',
  '  next                         Save and return to the section',
  '  end                          Save and return to the exec prompt',
  '  show                         Show the current service object',
];

const ROUTE_HELP = [
  '  edit <id>                    Create or select a static route',
  '  show                         Display all static routes',
  '  end                          Return to the exec prompt',
  '  exit                         Return to the config prompt',
];

const ROUTE_EDIT_HELP = [
  '  set dst <prefix>             Set the destination prefix',
  '  set gateway <ip>             Set the next hop',
  '  set device <name>            Set the output interface',
  '  set distance <value>         Set the route distance',
  '  set status enable|disable    Toggle the route',
  '  next                         Save and return to the section',
  '  end                          Save and return to the exec prompt',
  '  show                         Show the current route',
];

function cloneInterface(iface: FortiInterfaceState): FortiInterfaceState {
  return { ...iface, allowaccess: [...iface.allowaccess] };
}

function clonePolicy(policy: FortiPolicyState): FortiPolicyState {
  return { ...policy, srcintf: [...policy.srcintf], dstintf: [...policy.dstintf], service: [...policy.service] };
}

function cloneAddress(address: FortiAddressState): FortiAddressState {
  return { ...address };
}

function cloneService(service: FortiServiceState): FortiServiceState {
  return { ...service };
}

function cloneRoute(route: FortiStaticRouteState): FortiStaticRouteState {
  return { ...route };
}

function tokenize(command: string): string[] {
  return command.trim().split(/\s+/).filter(Boolean);
}

function lowerTokens(tokens: string[]): string[] {
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

function formatPrompt(hostname: string, mode: FortiCliMode): string {
  if (mode === 'exec') {
    return `${hostname} #`;
  }

  if (mode === 'config') {
    return `${hostname} (config) #`;
  }

  if (mode.kind === 'section') {
    return `${hostname} (${sectionLabel(mode.section)}) #`;
  }

  return `${hostname} (${editLabel(mode.section)} ${mode.key}) #`;
}

function sectionLabel(section: FortiSection): string {
  switch (section) {
    case 'system-global':
      return 'system global';
    case 'system-interface':
      return 'system interface';
    case 'firewall-policy':
      return 'firewall policy';
    case 'firewall-address':
      return 'firewall address';
    case 'firewall-service-custom':
      return 'firewall service custom';
    case 'router-static':
      return 'router static';
  }
}

function editLabel(section: FortiSection): string {
  switch (section) {
    case 'system-global':
      return 'system';
    case 'system-interface':
      return 'interface';
    case 'firewall-policy':
      return 'policy';
    case 'firewall-address':
      return 'address';
    case 'firewall-service-custom':
      return 'service';
    case 'router-static':
      return 'static';
  }
}

function formatStatus(global: FortiGlobalState, version: string): string[] {
  return [
    `Version: FortiGate-VM64 ${version}`,
    `Hostname: ${global.hostname}`,
    `Admin timeout: ${global.admintimeout} minutes`,
    `Timezone: ${global.timezone}`,
    'Operation mode: NAT',
    'Virtual domain configuration: disabled',
  ];
}

function formatInterfaces(interfaces: FortiInterfaceState[]): string[] {
  const lines = [
    'Name     Alias      IP/Netmask          Access               Status',
    '-------- ---------- ------------------- -------------------- ------',
  ];

  for (const iface of interfaces.slice().sort((left, right) => left.name.localeCompare(right.name))) {
    const access = iface.allowaccess.length === 0 ? '-' : iface.allowaccess.join(',');
    const ip = iface.ipAddress && iface.netmask ? `${iface.ipAddress}/${iface.netmask}` : 'unassigned';
    lines.push(`${iface.name.padEnd(8)} ${iface.alias.padEnd(10)} ${ip.padEnd(19)} ${access.padEnd(20)} ${iface.status}`);
  }

  return lines;
}

function formatPolicies(policies: FortiPolicyState[]): string[] {
  const lines = [
    'id  name           srcintf -> dstintf     action  service    nat  logtraffic  hits',
    '--  -------------  --------------------  ------  ---------  ---  ----------  ----',
  ];

  for (const policy of policies) {
    const path = `${policy.srcintf.join(',')} -> ${policy.dstintf.join(',')}`;
    lines.push(
      `${String(policy.id).padEnd(2)}  ${policy.name.padEnd(13)}  ${path.padEnd(20)}  ${policy.action.padEnd(6)}  ${policy.service.join(',').padEnd(9)}  ${policy.nat ? 'yes' : 'no '}  ${policy.logtraffic.padEnd(10)}  ${String(policy.hitCount)}`,
    );
  }

  return lines;
}

function formatAddresses(addresses: FortiAddressState[]): string[] {
  const lines = ['name           subnet                     interface'];

  for (const address of addresses.slice().sort((left, right) => left.name.localeCompare(right.name))) {
    lines.push(`${address.name.padEnd(14)} ${String(address.subnet ?? '-').padEnd(26)} ${address.interface ?? '-'}`);
  }

  return lines;
}

function formatServices(services: FortiServiceState[]): string[] {
  const lines = ['name           protocol  tcp-portrange  udp-portrange'];

  for (const service of services.slice().sort((left, right) => left.name.localeCompare(right.name))) {
    lines.push(
      `${service.name.padEnd(14)} ${service.protocol.padEnd(8)} ${String(service.tcpPortrange ?? '-').padEnd(14)} ${service.udpPortrange ?? '-'}`,
    );
  }

  return lines;
}

function formatRoutes(routes: FortiStaticRouteState[]): string[] {
  const lines = ['id  dst              gateway         device  distance  status'];

  for (const route of routes.slice().sort((left, right) => left.id - right.id)) {
    lines.push(
      `${String(route.id).padEnd(2)}  ${route.dst.padEnd(15)}  ${route.gateway.padEnd(14)}  ${route.device.padEnd(6)}  ${String(route.distance).padEnd(8)}  ${route.status}`,
    );
  }

  return lines;
}

function formatPolicyEdit(policy: FortiPolicyState): string[] {
  return [
    `edit ${policy.id}`,
    `    set name ${policy.name}`,
    `    set srcintf ${policy.srcintf.join(' ')}`,
    `    set dstintf ${policy.dstintf.join(' ')}`,
    `    set action ${policy.action}`,
    `    set service ${policy.service.join(' ')}`,
    `    set nat ${policy.nat ? 'enable' : 'disable'}`,
    `    set logtraffic ${policy.logtraffic}`,
    'next',
  ];
}

function formatInterfaceEdit(iface: FortiInterfaceState): string[] {
  return [
    `edit ${iface.name}`,
    `    set alias ${iface.alias}`,
    `    set ip ${iface.ipAddress ?? '0.0.0.0'} ${iface.netmask ?? '255.255.255.0'}`,
    `    set allowaccess ${iface.allowaccess.join(' ')}`,
    `    set status ${iface.status}`,
    'next',
  ];
}

function formatAddressEdit(address: FortiAddressState): string[] {
  return [
    `edit ${address.name}`,
    `    set subnet ${address.subnet ?? '0.0.0.0 0.0.0.0'}`,
    `    set interface ${address.interface ?? 'any'}`,
    'next',
  ];
}

function formatServiceEdit(service: FortiServiceState): string[] {
  return [
    `edit ${service.name}`,
    `    set protocol ${service.protocol}`,
    `    set tcp-portrange ${service.tcpPortrange ?? '-'}`,
    `    set udp-portrange ${service.udpPortrange ?? '-'}`,
    'next',
  ];
}

function formatRouteEdit(route: FortiStaticRouteState): string[] {
  return [
    `edit ${route.id}`,
    `    set dst ${route.dst}`,
    `    set gateway ${route.gateway}`,
    `    set device ${route.device}`,
    `    set distance ${route.distance}`,
    `    set status ${route.status}`,
    'next',
  ];
}

function helpFor(mode: FortiCliMode, tokens: string[]): string[] {
  if (mode === 'exec') {
    if (tokens.length === 0) return EXEC_HELP;
    if (matchesAbbreviation(tokens, ['get'])) return GET_HELP;
    if (matchesAbbreviation(tokens, ['show'])) return SHOW_HELP;
    if (matchesAbbreviation(tokens, ['config'])) return CONFIG_HELP;
    return EXEC_HELP;
  }

  if (mode === 'config') {
    if (tokens.length === 0) return CONFIG_HELP;
    if (matchesAbbreviation(tokens, ['config', 'system'])) {
      return ['  global                Enter global system settings', '  interface             Enter interface configuration'];
    }
    if (matchesAbbreviation(tokens, ['config', 'firewall'])) {
      return ['  policy                Enter policy configuration', '  address               Enter address-object configuration', '  service custom        Enter service-object configuration'];
    }
    return CONFIG_HELP;
  }

  if (mode.kind === 'section') {
    switch (mode.section) {
      case 'system-global':
        return SYSTEM_GLOBAL_HELP;
      case 'system-interface':
        return SYSTEM_INTERFACE_HELP;
      case 'firewall-policy':
        return POLICY_HELP;
      case 'firewall-address':
        return ADDRESS_HELP;
      case 'firewall-service-custom':
        return SERVICE_HELP;
      case 'router-static':
        return ROUTE_HELP;
    }
  }

  switch (mode.section) {
    case 'system-global':
      return SYSTEM_GLOBAL_HELP;
    case 'system-interface':
      return INTERFACE_EDIT_HELP;
    case 'firewall-policy':
      return POLICY_EDIT_HELP;
    case 'firewall-address':
      return ADDRESS_EDIT_HELP;
    case 'firewall-service-custom':
      return SERVICE_EDIT_HELP;
    case 'router-static':
      return ROUTE_EDIT_HELP;
  }
}

/** Return possible completions for the partial input given the current mode. */
function autocompleteFor(
  mode: FortiCliMode,
  partialInput: string,
  interfaces: Map<string, FortiInterfaceState>,
  policies: FortiPolicyState[],
  addresses: Map<string, FortiAddressState>,
  services: Map<string, FortiServiceState>,
  routes: Map<number, FortiStaticRouteState>,
): string[] {
  const rawTokens = tokenize(partialInput);
  const tokens = lowerTokens(rawTokens);
  const hasTrailingSpace = partialInput.endsWith(' ') || partialInput.length === 0;
  const lastToken = hasTrailingSpace ? '' : (rawTokens[rawTokens.length - 1] ?? '');
  const first = tokens[0] ?? '';

  // EXEC mode — top-level commands
  if (mode === 'exec') {
    if (rawTokens.length === 0 || (rawTokens.length === 1 && !hasTrailingSpace)) {
      return filterCompletions(lastToken, ['get', 'show', 'config', 'diagnose', 'exit']);
    }

    // "config ..."
    if (matchesAbbreviation([first], ['config'])) {
      if (tokens.length === 1 && hasTrailingSpace) {
        return filterCompletions('', ['system', 'firewall', 'router']);
      }
      if (tokens.length < 2) return filterCompletions(lastToken, ['system', 'firewall', 'router']);

      // Only descend if the user has resolved the second level
      if (!hasTrailingSpace && tokens.length === 2) {
        return filterCompletions(lastToken, ['system', 'firewall', 'router']);
      }

      const second = tokens[1];
      // "config system ..."
      if (matchesAbbreviation([second], ['system'])) {
        if (tokens.length === 2 && hasTrailingSpace) {
          return ['global', 'interface'];
        }
        return filterCompletions(lastToken, ['global', 'interface']);
      }
      // "config firewall ..."
      if (matchesAbbreviation([second], ['firewall'])) {
        if (tokens.length === 2 && hasTrailingSpace) {
          return ['policy', 'address', 'service'];
        }
        if (tokens.length < 3) return filterCompletions(lastToken, ['policy', 'address', 'service']);
        // "config firewall service ..."
        if (matchesAbbreviation([tokens[2]], ['service'])) {
          if (tokens.length === 3 && hasTrailingSpace) {
            return ['custom'];
          }
          return filterCompletions(lastToken, ['custom']);
        }
        return filterCompletions(lastToken, ['policy', 'address', 'service']);
      }
      // "config router ..."
      if (matchesAbbreviation([second], ['router'])) {
        return filterCompletions(lastToken, ['static']);
      }
      return filterCompletions(lastToken, ['system', 'firewall', 'router']);
    }

    // "get ..."
    if (matchesAbbreviation([first], ['get'])) {
      if (tokens.length === 1 && hasTrailingSpace) {
        return filterCompletions('', ['system', 'router']);
      }
      if (tokens.length < 2) return filterCompletions(lastToken, ['system', 'router']);

      // Only descend if the user has resolved the second level
      if (!hasTrailingSpace && tokens.length === 2) {
        return filterCompletions(lastToken, ['system', 'router']);
      }

      const second = tokens[1];
      // "get system ..."
      if (matchesAbbreviation([second], ['system'])) {
        return filterCompletions(lastToken, ['status', 'interface']);
      }
      // "get router ..."
      if (matchesAbbreviation([second], ['router'])) {
        if (tokens.length === 2 && hasTrailingSpace) {
          return ['info'];
        }
        if (tokens.length < 3) return filterCompletions(lastToken, ['info']);
        // "get router info ..."
        if (matchesAbbreviation([tokens[2]], ['info'])) {
          if (tokens.length === 3 && hasTrailingSpace) {
            return ['routing-table'];
          }
          if (tokens.length < 4) return filterCompletions(lastToken, ['routing-table']);
          // "get router info routing-table ..."
          if (matchesAbbreviation([tokens[3]], ['routing-table'])) {
            return filterCompletions(lastToken, ['all']);
          }
          return filterCompletions(lastToken, ['routing-table']);
        }
        return filterCompletions(lastToken, ['info']);
      }
      return filterCompletions(lastToken, ['system', 'router']);
    }

    // "show ..."
    if (matchesAbbreviation([first], ['show'])) {
      if (tokens.length === 1 && hasTrailingSpace) {
        return filterCompletions('', ['system', 'firewall', 'router']);
      }
      if (tokens.length < 2) return filterCompletions(lastToken, ['system', 'firewall', 'router']);

      // Only descend if the user has typed a full second token (trailing space or third token)
      if (!hasTrailingSpace && tokens.length === 2) {
        return filterCompletions(lastToken, ['system', 'firewall', 'router']);
      }

      const second = tokens[1];
      // "show system ..."
      if (matchesAbbreviation([second], ['system'])) {
        return filterCompletions(lastToken, ['interface']);
      }
      // "show firewall ..."
      if (matchesAbbreviation([second], ['firewall'])) {
        if (tokens.length === 2 && hasTrailingSpace) {
          return ['policy', 'address', 'service'];
        }
        if (tokens.length < 3) return filterCompletions(lastToken, ['policy', 'address', 'service']);
        // "show firewall service ..."
        if (matchesAbbreviation([tokens[2]], ['service'])) {
          return filterCompletions(lastToken, ['custom']);
        }
        return filterCompletions(lastToken, ['policy', 'address', 'service']);
      }
      // "show router ..."
      if (matchesAbbreviation([second], ['router'])) {
        return filterCompletions(lastToken, ['static']);
      }
      return filterCompletions(lastToken, ['system', 'firewall', 'router']);
    }

    return filterCompletions(lastToken, ['get', 'show', 'config', 'diagnose', 'exit']);
  }

  // CONFIG mode — limited commands
  if (mode === 'config') {
    return filterCompletions(lastToken, ['config', 'end', 'exit']);
  }

  // SECTION mode — edit/show/end/exit + section-specific
  if (mode.kind === 'section') {
    const sectionCommands = ['edit', 'show', 'end', 'exit'];
    switch (mode.section) {
      case 'firewall-policy':
        sectionCommands.push('move');
        break;
    }
    return filterCompletions(lastToken, sectionCommands);
  }

  // EDIT mode — set/next/end/exit/show + section-specific
  if (mode.kind === 'edit') {
    const base = ['set', 'next', 'end', 'exit', 'show'];
    switch (mode.section) {
      case 'system-global':
        return filterCompletions(lastToken, ['hostname', 'admintimeout', 'timezone']);
      case 'system-interface':
      case 'firewall-policy':
      case 'firewall-address':
      case 'firewall-service-custom':
      case 'router-static':
        if (hasTrailingSpace && tokens.length >= 1 && lowerTokens([tokens[0] ?? ''])[0] === 'set') {
          // Completing set sub-command based on section
          return filterCompletions(lastToken, setSubCommandsForSection(mode.section));
        }
        return filterCompletions(lastToken, base);
    }
    return filterCompletions(lastToken, base);
  }

  return [];
}

function setSubCommandsForSection(section: FortiSection): string[] {
  switch (section) {
    case 'system-global':
      return ['hostname', 'admintimeout', 'timezone'];
    case 'system-interface':
      return ['ip', 'alias', 'allowaccess', 'status'];
    case 'firewall-policy':
      return ['name', 'srcintf', 'dstintf', 'action', 'service', 'nat', 'logtraffic'];
    case 'firewall-address':
      return ['subnet', 'interface'];
    case 'firewall-service-custom':
      return ['protocol', 'tcp-portrange', 'udp-portrange'];
    case 'router-static':
      return ['dst', 'gateway', 'device', 'distance', 'status'];
  }
}

function filterCompletions(partial: string, candidates: string[]): string[] {
  if (partial === '') return [...candidates];
  const lower = partial.toLowerCase();
  return candidates.filter((candidate) => candidate.toLowerCase().startsWith(lower));
}

export function createFortiCli(options: FortiCliOptions = {}): FortiCliSession {
  const version = options.version ?? DEFAULT_VERSION;
  const global: FortiGlobalState = {
    hostname: options.hostname ?? 'FGT',
    admintimeout: options.global?.admintimeout ?? 5,
    timezone: options.global?.timezone ?? 'UTC',
  };

  const interfaces = new Map<string, FortiInterfaceState>((options.interfaces ?? DEFAULT_INTERFACES).map((iface) => [iface.name, cloneInterface(iface)]));
  const policies: FortiPolicyState[] = (options.policies ?? DEFAULT_POLICIES).map(clonePolicy);
  const addresses = new Map<string, FortiAddressState>((options.addresses ?? DEFAULT_ADDRESSES).map((address) => [address.name, cloneAddress(address)]));
  const services = new Map<string, FortiServiceState>((options.services ?? DEFAULT_SERVICES).map((service) => [service.name, cloneService(service)]));
  const routes = new Map<number, FortiStaticRouteState>((options.routes ?? DEFAULT_ROUTES).map((route) => [route.id, cloneRoute(route)]));

  let mode: FortiCliMode = 'exec';

  function snapshot(): FortiCliSnapshot {
    return {
      global: { ...global },
      mode,
      interfaces: Array.from(interfaces.values()).map(cloneInterface).sort((left, right) => left.name.localeCompare(right.name)),
      policies: policies.map(clonePolicy),
      addresses: Array.from(addresses.values()).map(cloneAddress).sort((left, right) => left.name.localeCompare(right.name)),
      services: Array.from(services.values()).map(cloneService).sort((left, right) => left.name.localeCompare(right.name)),
      routes: Array.from(routes.values()).map(cloneRoute).sort((left, right) => left.id - right.id),
    };
  }

  function getPrompt(): string {
    return formatPrompt(global.hostname, mode);
  }

  function setMode(nextMode: FortiCliMode): void {
    mode = nextMode;
  }

  function ensureInterface(name: string): FortiInterfaceState {
    const existing = interfaces.get(name);
    if (existing) return existing;
    const created: FortiInterfaceState = {
      name,
      alias: '',
      ipAddress: null,
      netmask: null,
      allowaccess: [],
      status: 'down',
    };
    interfaces.set(name, created);
    return created;
  }

  function ensurePolicy(id: number): FortiPolicyState {
    const existing = policies.find((p) => p.id === id);
    if (existing) return existing;
    const created: FortiPolicyState = {
      id,
      name: `policy-${id}`,
      srcintf: [],
      dstintf: [],
      action: 'accept',
      service: ['ALL'],
      schedule: 'always',
      nat: true,
      logtraffic: 'all',
      hitCount: 0,
    };
    policies.push(created);
    return created;
  }

  function ensureAddress(name: string): FortiAddressState {
    const existing = addresses.get(name);
    if (existing) return existing;
    const created: FortiAddressState = { name, subnet: null, interface: null };
    addresses.set(name, created);
    return created;
  }

  function ensureService(name: string): FortiServiceState {
    const existing = services.get(name);
    if (existing) return existing;
    const created: FortiServiceState = { name, protocol: 'TCP/UDP', tcpPortrange: null, udpPortrange: null };
    services.set(name, created);
    return created;
  }

  function ensureRoute(id: number): FortiStaticRouteState {
    const existing = routes.get(id);
    if (existing) return existing;
    const created: FortiStaticRouteState = {
      id,
      dst: '0.0.0.0/0',
      gateway: '0.0.0.0',
      device: 'port1',
      distance: 10,
      status: 'enable',
    };
    routes.set(id, created);
    return created;
  }

  function findSectionEdit(command: string): FortiCliResult | null {
    const trimmed = command.trim();
    const rawTokens = tokenize(trimmed);
    const tokens = lowerTokens(rawTokens);

    if (trimmed === '') {
      return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
    }

    if (trimmed === 'clear') {
      return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
    }

    const helpIndex = rawTokens.indexOf('?');
    if (helpIndex !== -1) {
      return { lines: helpFor(mode, rawTokens.slice(0, helpIndex)), prompt: getPrompt(), mode, shouldDisconnect: false };
    }

    if (mode === 'exec') {
      if (matchesAbbreviation(tokens, ['help']) || trimmed === '?') {
        return { lines: EXEC_HELP, prompt: getPrompt(), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(tokens, ['exit'])) {
        return { lines: ['Disconnecting...'], prompt: getPrompt(), mode, shouldDisconnect: true };
      }

      if (matchesAbbreviation(tokens, ['config', 'system', 'global'])) {
        setMode({ kind: 'section', section: 'system-global' });
        return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(tokens, ['config', 'system', 'interface'])) {
        setMode({ kind: 'section', section: 'system-interface' });
        return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(tokens, ['config', 'firewall', 'policy'])) {
        setMode({ kind: 'section', section: 'firewall-policy' });
        return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(tokens, ['config', 'firewall', 'address'])) {
        setMode({ kind: 'section', section: 'firewall-address' });
        return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(tokens, ['config', 'firewall', 'service', 'custom'])) {
        setMode({ kind: 'section', section: 'firewall-service-custom' });
        return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(tokens, ['config', 'router', 'static'])) {
        setMode({ kind: 'section', section: 'router-static' });
        return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(tokens, ['get', 'system', 'status'])) {
        return { lines: formatStatus(global, version), prompt: getPrompt(), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(tokens, ['get', 'router', 'info', 'routing-table', 'all'])) {
        return { lines: formatRoutes(Array.from(routes.values())), prompt: getPrompt(), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(tokens, ['get', 'system', 'interface']) || matchesAbbreviation(tokens, ['show', 'system', 'interface'])) {
        return { lines: formatInterfaces(Array.from(interfaces.values())), prompt: getPrompt(), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(tokens, ['show', 'firewall', 'policy'])) {
        return { lines: formatPolicies(policies), prompt: getPrompt(), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(tokens, ['show', 'firewall', 'address'])) {
        return { lines: formatAddresses(Array.from(addresses.values())), prompt: getPrompt(), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(tokens, ['show', 'firewall', 'service', 'custom'])) {
        return { lines: formatServices(Array.from(services.values())), prompt: getPrompt(), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(tokens, ['show', 'router', 'static'])) {
        return { lines: formatRoutes(Array.from(routes.values())), prompt: getPrompt(), mode, shouldDisconnect: false };
      }

      return { lines: ['Command fail. Return code -61'], prompt: getPrompt(), mode, shouldDisconnect: false };
    }

    if (mode === 'config') {
      if (matchesAbbreviation(tokens, ['end']) || matchesAbbreviation(tokens, ['exit'])) {
        setMode('exec');
        return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
      }

      return { lines: ['Command fail. Return code -61'], prompt: getPrompt(), mode, shouldDisconnect: false };
    }

    if (mode.kind === 'section') {
      if (matchesAbbreviation(tokens, ['end'])) {
        setMode('exec');
        return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(tokens, ['exit'])) {
        setMode('config');
        return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(tokens, ['show'])) {
        switch (mode.section) {
          case 'system-global':
            return { lines: formatStatus(global, version), prompt: getPrompt(), mode, shouldDisconnect: false };
          case 'system-interface':
            return { lines: formatInterfaces(Array.from(interfaces.values())), prompt: getPrompt(), mode, shouldDisconnect: false };
          case 'firewall-policy':
            return { lines: formatPolicies(policies), prompt: getPrompt(), mode, shouldDisconnect: false };
          case 'firewall-address':
            return { lines: formatAddresses(Array.from(addresses.values())), prompt: getPrompt(), mode, shouldDisconnect: false };
          case 'firewall-service-custom':
            return { lines: formatServices(Array.from(services.values())), prompt: getPrompt(), mode, shouldDisconnect: false };
          case 'router-static':
            return { lines: formatRoutes(Array.from(routes.values())), prompt: getPrompt(), mode, shouldDisconnect: false };
        }
      }

      if (mode.section === 'firewall-policy' && matchesCommandStart(tokens, ['move']) && rawTokens.length >= 4) {
        const moveId = Number.parseInt(rawTokens[1], 10);
        if (!Number.isInteger(moveId)) {
          return { lines: ['Command fail. Return code -61'], prompt: getPrompt(), mode, shouldDisconnect: false };
        }
        const moveIdx = policies.findIndex((p) => p.id === moveId);
        if (moveIdx === -1) {
          return { lines: ['Command fail. Return code -61'], prompt: getPrompt(), mode, shouldDisconnect: false };
        }

        const direction = rawTokens[2].toLowerCase();
        const targetId = Number.parseInt(rawTokens[3], 10);
        if (!Number.isInteger(targetId) || (direction !== 'before' && direction !== 'after')) {
          return { lines: ['Command fail. Return code -61'], prompt: getPrompt(), mode, shouldDisconnect: false };
        }
        const targetIdx = policies.findIndex((p) => p.id === targetId);
        if (targetIdx === -1) {
          return { lines: ['Command fail. Return code -61'], prompt: getPrompt(), mode, shouldDisconnect: false };
        }

        const [moved] = policies.splice(moveIdx, 1);
        let insertIdx = direction === 'before' ? targetIdx : targetIdx + 1;
        // If we removed before the target, adjust
        if (moveIdx < targetIdx) {
          insertIdx--;
        }
        policies.splice(insertIdx, 0, moved);
        return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
      }

      if (matchesCommandStart(tokens, ['edit']) && rawTokens.length >= 2) {
        const identifier = rawTokens.slice(1).join(' ');
        switch (mode.section) {
          case 'system-interface':
            ensureInterface(identifier);
            setMode({ kind: 'edit', section: 'system-interface', key: identifier });
            break;
          case 'firewall-policy':
            const policyId = Number.parseInt(identifier, 10);
            if (!Number.isInteger(policyId)) {
              return { lines: ['Command fail. Return code -61'], prompt: getPrompt(), mode, shouldDisconnect: false };
            }
            ensurePolicy(policyId);
            setMode({ kind: 'edit', section: 'firewall-policy', key: String(policyId) });
            break;
          case 'firewall-address':
            ensureAddress(identifier);
            setMode({ kind: 'edit', section: 'firewall-address', key: identifier });
            break;
          case 'firewall-service-custom':
            ensureService(identifier);
            setMode({ kind: 'edit', section: 'firewall-service-custom', key: identifier });
            break;
          case 'router-static':
            const routeId = Number.parseInt(identifier, 10);
            if (!Number.isInteger(routeId)) {
              return { lines: ['Command fail. Return code -61'], prompt: getPrompt(), mode, shouldDisconnect: false };
            }
            ensureRoute(routeId);
            setMode({ kind: 'edit', section: 'router-static', key: String(routeId) });
            break;
          case 'system-global':
            return { lines: ['Command fail. Return code -61'], prompt: getPrompt(), mode, shouldDisconnect: false };
        }
        return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
      }

      return { lines: ['Command fail. Return code -61'], prompt: getPrompt(), mode, shouldDisconnect: false };
    }

    if (mode.kind === 'edit') {
      if (matchesAbbreviation(tokens, ['next'])) {
        setMode({ kind: 'section', section: mode.section });
        return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(tokens, ['end'])) {
        setMode('exec');
        return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
      }

      if (matchesAbbreviation(tokens, ['exit'])) {
        setMode({ kind: 'section', section: mode.section });
        return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
      }

      switch (mode.section) {
        case 'system-interface': {
          const iface = ensureInterface(mode.key);
          if (matchesCommandStart(tokens, ['set', 'ip']) && rawTokens.length >= 4) {
            iface.ipAddress = rawTokens[2];
            iface.netmask = rawTokens[3];
            return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
          }
          if (matchesCommandStart(tokens, ['set', 'alias']) && rawTokens.length >= 3) {
            iface.alias = rawTokens.slice(2).join(' ');
            return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
          }
          if (matchesCommandStart(tokens, ['set', 'allowaccess']) && rawTokens.length >= 3) {
            iface.allowaccess = rawTokens.slice(2).map((entry) => entry.toLowerCase());
            return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
          }
          if (matchesCommandStart(tokens, ['set', 'status']) && rawTokens.length >= 3) {
            const value = rawTokens[2].toLowerCase();
            if (value === 'up' || value === 'down') {
              iface.status = value;
              return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
            }
          }
          if (matchesAbbreviation(tokens, ['show'])) {
            return { lines: formatInterfaceEdit(iface), prompt: getPrompt(), mode, shouldDisconnect: false };
          }
          break;
        }
        case 'firewall-policy': {
          const policy = ensurePolicy(Number.parseInt(mode.key, 10));
          if (matchesCommandStart(tokens, ['set', 'name']) && rawTokens.length >= 3) {
            policy.name = rawTokens.slice(2).join(' ');
            return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
          }
          if (matchesCommandStart(tokens, ['set', 'srcintf']) && rawTokens.length >= 3) {
            policy.srcintf = rawTokens.slice(2);
            return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
          }
          if (matchesCommandStart(tokens, ['set', 'dstintf']) && rawTokens.length >= 3) {
            policy.dstintf = rawTokens.slice(2);
            return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
          }
          if (matchesCommandStart(tokens, ['set', 'action']) && rawTokens.length >= 3) {
            const action = rawTokens[2].toLowerCase();
            if (action === 'accept' || action === 'deny') {
              policy.action = action;
              return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
            }
          }
          if (matchesCommandStart(tokens, ['set', 'service']) && rawTokens.length >= 3) {
            policy.service = rawTokens.slice(2);
            return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
          }
          if (matchesCommandStart(tokens, ['set', 'nat']) && rawTokens.length >= 3) {
            const value = rawTokens[2].toLowerCase();
            if (value === 'enable' || value === 'disable') {
              policy.nat = value === 'enable';
              return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
            }
          }
          if (matchesCommandStart(tokens, ['set', 'logtraffic']) && rawTokens.length >= 3) {
            const value = rawTokens[2].toLowerCase();
            if (value === 'all' || value === 'utm' || value === 'disable') {
              policy.logtraffic = value;
              return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
            }
          }
          if (matchesAbbreviation(tokens, ['show'])) {
            return { lines: formatPolicyEdit(policy), prompt: getPrompt(), mode, shouldDisconnect: false };
          }
          break;
        }
        case 'firewall-address': {
          const address = ensureAddress(mode.key);
          if (matchesCommandStart(tokens, ['set', 'subnet']) && rawTokens.length >= 4) {
            address.subnet = `${rawTokens[2]} ${rawTokens[3]}`;
            return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
          }
          if (matchesCommandStart(tokens, ['set', 'interface']) && rawTokens.length >= 3) {
            address.interface = rawTokens[2];
            return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
          }
          if (matchesAbbreviation(tokens, ['show'])) {
            return { lines: formatAddressEdit(address), prompt: getPrompt(), mode, shouldDisconnect: false };
          }
          break;
        }
        case 'firewall-service-custom': {
          const service = ensureService(mode.key);
          if (matchesCommandStart(tokens, ['set', 'protocol']) && rawTokens.length >= 3) {
            const value = rawTokens[2].toUpperCase();
            if (value === 'TCP' || value === 'UDP' || value === 'TCP/UDP') {
              service.protocol = value;
              return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
            }
          }
          if (matchesCommandStart(tokens, ['set', 'tcp-portrange']) && rawTokens.length >= 3) {
            service.tcpPortrange = rawTokens.slice(2).join(' ');
            return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
          }
          if (matchesCommandStart(tokens, ['set', 'udp-portrange']) && rawTokens.length >= 3) {
            service.udpPortrange = rawTokens.slice(2).join(' ');
            return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
          }
          if (matchesAbbreviation(tokens, ['show'])) {
            return { lines: formatServiceEdit(service), prompt: getPrompt(), mode, shouldDisconnect: false };
          }
          break;
        }
        case 'router-static': {
          const route = ensureRoute(Number.parseInt(mode.key, 10));
          if (matchesCommandStart(tokens, ['set', 'dst']) && rawTokens.length >= 3) {
            route.dst = rawTokens.slice(2).join(' ');
            return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
          }
          if (matchesCommandStart(tokens, ['set', 'gateway']) && rawTokens.length >= 3) {
            route.gateway = rawTokens[2];
            return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
          }
          if (matchesCommandStart(tokens, ['set', 'device']) && rawTokens.length >= 3) {
            route.device = rawTokens[2];
            return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
          }
          if (matchesCommandStart(tokens, ['set', 'distance']) && rawTokens.length >= 3) {
            const distance = Number.parseInt(rawTokens[2], 10);
            if (Number.isInteger(distance)) {
              route.distance = distance;
              return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
            }
          }
          if (matchesCommandStart(tokens, ['set', 'status']) && rawTokens.length >= 3) {
            const value = rawTokens[2].toLowerCase();
            if (value === 'enable' || value === 'disable') {
              route.status = value;
              return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
            }
          }
          if (matchesAbbreviation(tokens, ['show'])) {
            return { lines: formatRouteEdit(route), prompt: getPrompt(), mode, shouldDisconnect: false };
          }
          break;
        }
        case 'system-global': {
          if (matchesCommandStart(tokens, ['set', 'hostname']) && rawTokens.length >= 3) {
            global.hostname = rawTokens.slice(2).join(' ');
            return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
          }
          if (matchesCommandStart(tokens, ['set', 'admintimeout']) && rawTokens.length >= 3) {
            const timeout = Number.parseInt(rawTokens[2], 10);
            if (Number.isInteger(timeout)) {
              global.admintimeout = timeout;
              return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
            }
          }
          if (matchesCommandStart(tokens, ['set', 'timezone']) && rawTokens.length >= 3) {
            global.timezone = rawTokens.slice(2).join(' ');
            return { lines: [], prompt: getPrompt(), mode, shouldDisconnect: false };
          }
          if (matchesAbbreviation(tokens, ['show'])) {
            return {
              lines: [
                `hostname ${global.hostname}`,
                `admintimeout ${global.admintimeout}`,
                `timezone ${global.timezone}`,
              ],
              prompt: getPrompt(),
              mode,
              shouldDisconnect: false,
            };
          }
          break;
        }
      }

      return { lines: ['Command fail. Return code -61'], prompt: getPrompt(), mode, shouldDisconnect: false };
    }

    return { lines: ['Command fail. Return code -61'], prompt: getPrompt(), mode, shouldDisconnect: false };
  }

  return {
    run(command: string): FortiCliResult {
      const result = findSectionEdit(command);
      return result ?? { lines: ['Command fail. Return code -61'], prompt: getPrompt(), mode, shouldDisconnect: false };
    },
    getPrompt,
    snapshot,
    autocomplete(partialInput: string): string[] {
      return autocompleteFor(mode, partialInput, interfaces, policies, addresses, services, routes);
    },
  };
}
