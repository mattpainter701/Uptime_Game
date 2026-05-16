import type {
  ApplianceConfig,
  CategoryLabRegistry,
  LabSetup,
  MockVendorKind,
  TicketCategory,
  TicketTier,
} from './mockCliShared';

// ── Appliance catalog ──────────────────────────────────────────────

const appliance = (vendor: MockVendorKind, hostname: string, options?: Record<string, unknown>): ApplianceConfig => ({
  vendor,
  hostname,
  options,
});

const CISCO_CORE = appliance('cisco', 'CORE-SW1');
const CISCO_ACCESS = appliance('cisco', 'ACCESS-SW1');
const CISCO_EDGE = appliance('cisco', 'EDGE-RTR1');
const FORTI_FW = appliance('fortinet', 'FGT-PRIMARY');
const FORTI_FW2 = appliance('fortinet', 'FGT-BACKUP');
const ARUBA_CORE = appliance('aruba', 'AOS-CORE1');
const ARUBA_ACCESS = appliance('aruba', 'AOS-EDGE1');
const DELL_CORE = appliance('dell', 'OS10-CORE1');
const DELL_ACCESS = appliance('dell', 'OS10-EDGE1');

// ── Lab setups by category and tier ────────────────────────────────

const registry: CategoryLabRegistry[] = [
  {
    category: 'network-basics',
    tiers: {
      1: [{ id: 'basics-t1-cisco', label: 'Single Cisco access switch', description: 'One Cisco IOS XE access switch — perfect for port/VLAN basics', appliances: [CISCO_ACCESS] }],
      2: [{ id: 'basics-t2-aruba', label: 'Aruba access + core', description: 'Aruba AOS-CX access switch connected to a core switch', appliances: [ARUBA_ACCESS, ARUBA_CORE] }],
      3: [{ id: 'basics-t3-mixed', label: 'Multi-vendor access stack', description: 'Cisco access, Aruba core, and Dell edge', appliances: [CISCO_ACCESS, ARUBA_CORE, DELL_ACCESS] }],
    },
  },
  {
    category: 'switching',
    tiers: {
      1: [{ id: 'switching-t1-cisco', label: 'Cisco VLAN config', description: 'Single Cisco switch — VLAN/port config', appliances: [CISCO_ACCESS] }],
      2: [{ id: 'switching-t2-aruba-dell', label: 'Aruba + Dell switching', description: 'Aruba core and Dell access — trunking and spanning-tree', appliances: [ARUBA_CORE, DELL_ACCESS] }],
      3: [{ id: 'switching-t3-all', label: 'Full switching stack', description: 'Cisco/Aruba/Dell — VLAN propagation, STP, port-channels', appliances: [CISCO_CORE, ARUBA_ACCESS, DELL_CORE] }],
    },
  },
  {
    category: 'routing',
    tiers: {
      1: [{ id: 'routing-t1-cisco', label: 'Cisco static routes', description: 'One Cisco router — static route config and troubleshooting', appliances: [CISCO_EDGE] }],
      2: [{ id: 'routing-t2-cisco-dell', label: 'Cisco + Dell routing', description: 'Cisco edge router and Dell core — OSPF adjacency issues', appliances: [CISCO_EDGE, DELL_CORE] }],
      3: [
        { id: 'routing-t3-multi', label: 'Multi-vendor BGP', description: 'Cisco, Aruba, Dell — BGP peering and route redistribution', appliances: [CISCO_EDGE, ARUBA_CORE, DELL_CORE] },
      ],
      5: [{ id: 'routing-t5-design', label: 'Architecture design lab', description: 'Full topology — design multi-protocol routing across all vendors', appliances: [CISCO_EDGE, ARUBA_CORE, DELL_CORE, CISCO_ACCESS] }],
    },
  },
  {
    category: 'security',
    tiers: {
      1: [{ id: 'sec-t1-forti', label: 'FortiOS policy basics', description: 'Single FortiGate — firewall policy creation and inspection', appliances: [FORTI_FW] }],
      2: [{ id: 'sec-t2-forti-cisco', label: 'FortiGate + Cisco', description: 'FortiGate firewall with Cisco core — ACL and NAT troubleshooting', appliances: [FORTI_FW, CISCO_CORE] }],
      3: [{ id: 'sec-t3-ha', label: 'HA FortiGate pair', description: 'Two FortiGates in HA — failover and session sync', appliances: [FORTI_FW, FORTI_FW2] }],
    },
  },
  {
    category: 'systems',
    tiers: {
      1: [{ id: 'sys-t1-dell', label: 'Dell OS10 inventory', description: 'Single Dell switch — inventory, environment, and firmware checks', appliances: [DELL_ACCESS] }],
      2: [{ id: 'sys-t2-cisco-dell', label: 'Cisco + Dell sys health', description: 'Cisco and Dell — syslog, SNMP, and health checks', appliances: [CISCO_CORE, DELL_CORE] }],
    },
  },
  {
    category: 'automation',
    tiers: {
      2: [{ id: 'auto-t2-aruba', label: 'Aruba API checks', description: 'Aruba switch — REST API endpoint validation', appliances: [ARUBA_CORE] }],
      3: [{ id: 'auto-t3-multi', label: 'Multi-vendor automations', description: 'Cisco + Aruba — scripted config changes and validation', appliances: [CISCO_CORE, ARUBA_ACCESS] }],
    },
  },
  {
    category: 'high-availability',
    tiers: {
      3: [{ id: 'ha-t3-forti', label: 'FortiGate HA', description: 'Two FortiGates — HA failover and session sync', appliances: [FORTI_FW, FORTI_FW2] }],
      4: [{ id: 'ha-t4-multi', label: 'Multi-vendor HA', description: 'FortiGate HA + Cisco HSRP + Dell VLT', appliances: [FORTI_FW, FORTI_FW2, CISCO_CORE, DELL_CORE] }],
    },
  },
  {
    category: 'wireless',
    tiers: {
      1: [{ id: 'wlan-t1-aruba', label: 'Aruba wireless basics', description: 'Aruba AOS-CX — wireless controller basics', appliances: [ARUBA_ACCESS] }],
      2: [{ id: 'wlan-t2-cisco-aruba', label: 'Cisco + Aruba wireless', description: 'Cisco and Aruba — wireless VLAN and AP provisioning', appliances: [CISCO_CORE, ARUBA_ACCESS] }],
    },
  },
  {
    category: 'voice',
    tiers: {
      1: [{ id: 'voice-t1-cisco', label: 'Cisco voice VLAN', description: 'Cisco switch — voice VLAN and QoS config', appliances: [CISCO_ACCESS] }],
      2: [{ id: 'voice-t2-cisco-dell', label: 'Cisco + Dell voice', description: 'Cisco core and Dell access — voice QoS end-to-end', appliances: [CISCO_CORE, DELL_ACCESS] }],
    },
  },
  {
    category: 'datacenter',
    tiers: {
      3: [{ id: 'dc-t3-dell', label: 'Dell DC switching', description: 'Dell OS10 — VLT, DCB, and storage networking', appliances: [DELL_CORE] }],
      4: [{ id: 'dc-t4-all', label: 'Full DC topology', description: 'Cisco, Aruba, Dell — full DC fabric with overlays', appliances: [CISCO_CORE, ARUBA_CORE, DELL_CORE] }],
    },
  },
];

// ── Ticket-specific overrides ──────────────────────────────────────

interface TicketOverride {
  ticketId: string;
  lab: LabSetup;
}

const ticketOverrides: TicketOverride[] = [
  {
    ticketId: 'ticket-basics-001',
    lab: { id: 'override-basics-001', label: 'Cisco port diagnostic', description: 'Cisco access switch — diagnose port down', appliances: [CISCO_ACCESS] },
  },
  {
    ticketId: 'ticket-routing-003',
    lab: { id: 'override-routing-003', label: 'BGP flapping investigation', description: 'Cisco edge + Aruba core — BGP neighbor flapping', appliances: [CISCO_EDGE, ARUBA_CORE] },
  },
];

// ── Query API ──────────────────────────────────────────────────────

/** Get all lab setups for a given category and tier. */
export function getLabsByCategory(category: TicketCategory, tier: TicketTier): LabSetup[] {
  const entry = registry.find((r) => r.category === category);
  return entry?.tiers[tier] ?? [];
}

/** Get a specific lab by its id. */
export function getLabById(labId: string): LabSetup | undefined {
  for (const entry of registry) {
    for (const [, labs] of Object.entries(entry.tiers)) {
      const match = (labs as LabSetup[]).find((lab) => lab.id === labId);
      if (match) return match;
    }
  }
  return ticketOverrides.find((o) => o.lab.id === labId)?.lab;
}

/** Get a lab override for a specific ticket, falling back to category/tier defaults. */
export function getLabForTicket(
  ticketId: string,
  category: TicketCategory,
  tier: TicketTier,
): LabSetup[] {
  const override = ticketOverrides.find((o) => o.ticketId === ticketId);
  if (override) return [override.lab];

  return getLabsByCategory(category, tier);
}

/** List all defined ticket categories. */
export function getTicketCategories(): TicketCategory[] {
  return registry.map((r) => r.category);
}

/** List all supported tiers for a category. */
export function getTiersForCategory(category: TicketCategory): TicketTier[] {
  const entry = registry.find((r) => r.category === category);
  if (!entry) return [];
  return Object.keys(entry.tiers).map(Number) as TicketTier[];
}

/** Return all labs in the registry. */
export function getAllLabs(): LabSetup[] {
  const labs: LabSetup[] = [];
  for (const entry of registry) {
    for (const [, tierLabs] of Object.entries(entry.tiers)) {
      labs.push(...(tierLabs as LabSetup[]));
    }
  }
  return labs;
}
