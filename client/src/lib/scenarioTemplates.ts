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
