import type { Ticket, TicketCategory, ValidationCriteria } from '../types/game';

export type ScenarioVendor = 'cisco' | 'fortinet' | 'aruba' | 'dell';

export interface ScenarioTask {
  id: string;
  vendor: ScenarioVendor;
  node: string;
  objective: string;
  commands: string[];
  validation: ValidationCriteria[];
}

export interface ScenarioTemplate {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  difficulty: Ticket['difficulty'];
  timeLimit: number;
  rewardCredits: number;
  rewardXp: number;
  labTemplate: string;
  tags: string[];
  ticketMetadata: {
    incidentId: string;
    customerImpact: string;
    escalationPath: string;
  };
  tasks: ScenarioTask[];
}

const VENDOR_COMMAND_HINTS: Record<ScenarioVendor, string> = {
  cisco: 'Cisco IOS/NX-OS style commands use configure terminal, interface, and show running-config.',
  fortinet: 'FortiGate tasks use config system interface / config firewall policy blocks and show commands.',
  aruba: 'Aruba AOS-CX tasks use config, vlan/interface contexts, and show vlan or show interfaces brief.',
  dell: 'Dell OS10 tasks use configure terminal, interface ethernet, and show running-configuration.',
};

export const MULTI_VENDOR_SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  {
    id: 'scenario-branch-vlan-remediation',
    title: 'Branch VLAN Remediation Across Vendors',
    description:
      'Restore access VLAN consistency across a mixed Cisco, Aruba, and Dell access layer after a branch move.',
    category: 'switching',
    difficulty: 3,
    timeLimit: 35,
    rewardCredits: 450,
    rewardXp: 225,
    labTemplate: 'multi_vendor_branch_switching',
    tags: ['multi-vendor', 'switching', 'vlan'],
    ticketMetadata: {
      incidentId: 'INC-MV-1401',
      customerImpact: 'New branch users cannot reach DHCP or file shares from three access closets.',
      escalationPath: 'Network access team',
    },
    tasks: [
      {
        id: 'cisco-access-vlan-20',
        vendor: 'cisco',
        node: 'CSW1',
        objective: 'Place Gi0/5 into access VLAN 20 and verify it appears in the VLAN table.',
        commands: ['configure terminal', 'interface Gi0/5', 'switchport mode access', 'switchport access vlan 20', 'show vlan brief'],
        validation: [
          { type: 'command', params: { node: 'CSW1', command: 'show vlan brief', contains: ['20', 'Gi0/5'] } },
        ],
      },
      {
        id: 'aruba-access-vlan-30',
        vendor: 'aruba',
        node: 'ASW1',
        objective: 'Assign interface 1/1/10 as an untagged member of VLAN 30.',
        commands: ['config', 'vlan 30', 'interface 1/1/10', 'vlan access 30', 'show vlan 30'],
        validation: [
          { type: 'command', params: { node: 'ASW1', command: 'show vlan 30', contains: ['1/1/10', 'untagged'] } },
        ],
      },
      {
        id: 'dell-access-vlan-40',
        vendor: 'dell',
        node: 'DSW1',
        objective: 'Configure ethernet1/1/15 for access VLAN 40 and confirm running configuration.',
        commands: ['configure terminal', 'interface ethernet1/1/15', 'switchport access vlan 40', 'show running-configuration interface ethernet1/1/15'],
        validation: [
          { type: 'command', params: { node: 'DSW1', command: 'show running-configuration interface ethernet1/1/15', contains: ['switchport access vlan 40'] } },
        ],
      },
    ],
  },
  {
    id: 'scenario-firewall-edge-restoration',
    title: 'Firewall Edge Restoration',
    description:
      'Recover internet-bound traffic by coordinating Cisco routing checks with Fortinet firewall policy remediation.',
    category: 'security',
    difficulty: 4,
    timeLimit: 45,
    rewardCredits: 650,
    rewardXp: 320,
    labTemplate: 'multi_vendor_firewall_edge',
    tags: ['multi-vendor', 'firewall', 'routing'],
    ticketMetadata: {
      incidentId: 'INC-MV-1402',
      customerImpact: 'Branch users can reach local services but all internet traffic is denied.',
      escalationPath: 'Security operations',
    },
    tasks: [
      {
        id: 'cisco-default-route',
        vendor: 'cisco',
        node: 'RTR1',
        objective: 'Confirm the branch router forwards default traffic to the firewall transit address.',
        commands: ['show ip route', 'configure terminal', 'ip route 0.0.0.0 0.0.0.0 198.51.100.2', 'show ip route'],
        validation: [
          { type: 'command', params: { node: 'RTR1', command: 'show ip route', contains: ['0.0.0.0/0', '198.51.100.2'] } },
        ],
      },
      {
        id: 'fortinet-policy-allow',
        vendor: 'fortinet',
        node: 'FGT1',
        objective: 'Enable the outbound allow policy from branch_lan to wan1 with NAT.',
        commands: ['config firewall policy', 'edit 10', 'set srcintf branch_lan', 'set dstintf wan1', 'set action accept', 'set nat enable', 'show firewall policy 10'],
        validation: [
          { type: 'command', params: { node: 'FGT1', command: 'show firewall policy 10', contains: ['set action accept', 'set nat enable'] } },
        ],
      },
    ],
  },
  {
    id: 'scenario-bgp-route-flapping',
    title: 'BGP Route Flapping Troubleshooting',
    description:
      'Resolve BGP peering instability between the branch router and the upstream service provider, restoring advertised prefix reachability.',
    category: 'routing',
    difficulty: 4,
    timeLimit: 40,
    rewardCredits: 600,
    rewardXp: 300,
    labTemplate: 'multi_vendor_bgp_flapping',
    tags: ['multi-vendor', 'bgp', 'routing'],
    ticketMetadata: {
      incidentId: 'INC-MV-1403',
      customerImpact: 'Branch BGP prefixes are flapping due to misconfigured timers and missing route-maps, causing intermittent internet outages.',
      escalationPath: 'Routing team',
    },
    tasks: [
      {
        id: 'cisco-bgp-timers',
        vendor: 'cisco',
        node: 'RTR1',
        objective: 'Inspect BGP neighbor status and adjust hold/keepalive timers to match provider requirements (hold=90, keepalive=30).',
        commands: ['show ip bgp summary', 'configure terminal', 'router bgp 65001', 'neighbor 203.0.113.1 timers 30 90', 'show ip bgp summary'],
        validation: [
          { type: 'command', params: { node: 'RTR1', command: 'show ip bgp summary', contains: ['203.0.113.1', '30', '90'] } },
        ],
      },
      {
        id: 'fortinet-bgp-prefix-list',
        vendor: 'fortinet',
        node: 'FGT1',
        objective: 'Configure a prefix list on the FortiGate to permit the branch LAN prefix and apply it to the BGP neighbor outbound filter.',
        commands: ['config router prefix-list', 'edit "branch-lan-out"', 'set seq 10 permit 10.10.0.0/16 ge 24 le 28', 'config router bgp', 'edit 65002', 'set neighbor 203.0.113.2 prefix-list-out "branch-lan-out"', 'show router bgp neighbor 203.0.113.2'],
        validation: [
          { type: 'command', params: { node: 'FGT1', command: 'show router bgp neighbor 203.0.113.2', contains: ['prefix-list-out', 'branch-lan-out'] } },
        ],
      },
    ],
  },
  {
    id: 'scenario-mpls-vpn-validation',
    title: 'MPLS/VPN Connectivity Validation',
    description:
      'Troubleshoot an MPLS L3VPN where the CE-to-PE routing is correct but customer VRF routes are not reaching the remote site due to missing route-target import/export policies.',
    category: 'routing',
    difficulty: 5,
    timeLimit: 50,
    rewardCredits: 800,
    rewardXp: 400,
    labTemplate: 'multi_vendor_mpls_l3vpn',
    tags: ['multi-vendor', 'mpls', 'vpn', 'advanced'],
    ticketMetadata: {
      incidentId: 'INC-MV-1404',
      customerImpact: 'Site-to-site MPLS VPN connectivity is down; VRF routes are not being exchanged between PE routers.',
      escalationPath: 'Service provider engineering',
    },
    tasks: [
      {
        id: 'cisco-vrf-route-target',
        vendor: 'cisco',
        node: 'PE1',
        objective: 'Verify the VRF configuration on PE1 and ensure the route-target import/export matches the expected value 65001:100.',
        commands: ['show vrf detail CUSTOMER-A', 'configure terminal', 'vrf definition CUSTOMER-A', 'rd 65001:100', 'route-target import 65001:100', 'route-target export 65001:100', 'show vrf detail CUSTOMER-A'],
        validation: [
          { type: 'command', params: { node: 'PE1', command: 'show vrf detail CUSTOMER-A', contains: ['65001:100', 'Route-target import', 'Route-target export'] } },
        ],
      },
      {
        id: 'aruba-mpls-ldp-neighbor',
        vendor: 'aruba',
        node: 'PE2',
        objective: 'On the Aruba PE router, confirm LDP is established with the loopback address of PE1 and that the VRF forwarding table contains the remote prefix.',
        commands: ['show mpls ldp neighbor', 'configure terminal', 'mpls ldp router-id loopback 0', 'show ip vrf CUSTOMER-A', 'show ip route vrf CUSTOMER-A'],
        validation: [
          { type: 'command', params: { node: 'PE2', command: 'show mpls ldp neighbor', contains: ['LDP', '10.0.0.1', 'Oper'] } },
          { type: 'command', params: { node: 'PE2', command: 'show ip route vrf CUSTOMER-A', contains: ['10.10', 'via'] } },
        ],
      },
    ],
  },
  {
    id: 'scenario-sdwan-policy-routing',
    title: 'SD-WAN Policy Routing Restoration',
    description:
      'Restore application-aware routing policies on a multi-vendor SD-WAN fabric after a policy rule misconfiguration caused VoIP and critical traffic to take the backup link.',
    category: 'routing',
    difficulty: 5,
    timeLimit: 45,
    rewardCredits: 750,
    rewardXp: 375,
    labTemplate: 'multi_vendor_sdwan_policy',
    tags: ['multi-vendor', 'sdwan', 'policy', 'qos'],
    ticketMetadata: {
      incidentId: 'INC-MV-1405',
      customerImpact: 'VoIP call quality is degraded; real-time traffic is being routed over the backup MPLS link instead of the primary broadband circuit.',
      escalationPath: 'WAN edge team',
    },
    tasks: [
      {
        id: 'cisco-sdwan-app-route-policy',
        vendor: 'cisco',
        node: 'cEdge-1',
        objective: 'Configure an app-route policy that matches VoIP (SIP/RTP) traffic and directs it to the primary VPN transport (color=public-internet) with priority forwarding.',
        commands: ['show sdwan policy app-route', 'configure terminal', 'sdwan', 'policy', 'app-route', 'vpn 1', 'sequence 10 match SIP', 'sequence 10 action accept color public-internet', 'sequence 20 match RTP', 'sequence 20 action accept color public-internet', 'commit', 'show sdwan policy app-route'],
        validation: [
          { type: 'command', params: { node: 'cEdge-1', command: 'show sdwan policy app-route', contains: ['SIP', 'RTP', 'public-internet'] } },
        ],
      },
      {
        id: 'fortinet-sdwan-zone-rule',
        vendor: 'fortinet',
        node: 'FGT-SDWAN',
        objective: 'Adjust the SD-WAN zone rule to prefer the broadband interface (wan1) for VoIP traffic with a strategy of lowest latency and jitter.',
        commands: ['config system sdwan', 'edit zone "voice-zone"', 'set members wan1 mpls', 'config service', 'edit 10', 'set name "voip"', 'set dst "voip-servers"', 'set src "branch-lan"', 'set mode sla', 'set priority-members wan1', 'show system sdwan service'],
        validation: [
          { type: 'command', params: { node: 'FGT-SDWAN', command: 'show system sdwan service', contains: ['voip', 'wan1', 'sla', 'voice-zone'] } },
        ],
      },
    ],
  },
];

export function getScenarioTemplate(templateId: string): ScenarioTemplate | undefined {
  return MULTI_VENDOR_SCENARIO_TEMPLATES.find((template) => template.id === templateId);
}

export function buildTicketFromScenario(template: ScenarioTemplate): Ticket {
  const vendorList = Array.from(new Set(template.tasks.map((task) => task.vendor))).join(', ');
  const taskText = template.tasks
    .map((task, index) => `${index + 1}. ${task.node} (${task.vendor}): ${task.objective}`)
    .join('\n');
  const hintText = Array.from(new Set(template.tasks.map((task) => VENDOR_COMMAND_HINTS[task.vendor])));

  return {
    id: template.ticketMetadata.incidentId,
    title: template.title,
    description: `${template.description}\n\nVendors: ${vendorList}\n\nTasks:\n${taskText}`,
    category: template.category,
    difficulty: template.difficulty,
    timeLimit: template.timeLimit,
    rewardCredits: template.rewardCredits,
    rewardXp: template.rewardXp,
    labTemplate: template.labTemplate,
    hints: hintText.map((text) => ({ cost: 10, text, revealed: false })),
    validation: template.tasks.flatMap((task) => task.validation),
    status: 'available',
    requiredItems: ['laptop', 'console-cable'],
  };
}

export const MULTI_VENDOR_SCENARIO_TICKETS: Ticket[] = MULTI_VENDOR_SCENARIO_TEMPLATES.map(buildTicketFromScenario);
