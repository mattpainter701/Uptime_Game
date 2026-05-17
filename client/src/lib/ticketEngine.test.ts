import { describe, expect, it, beforeEach } from 'vitest';
import {
  createTicketEngine,
  calculateHintCost,
  calculateTimePressure,
  getSlaTierForDifficulty,
  SLA_CONFIGS,
  DEFAULT_HINT_ECONOMY,
  generateDifficultyVariables,
  resetTicketEngine,
} from './ticketEngine';
import type { TicketEngine } from './ticketEngine';
import type { Ticket, TicketCategory } from '../types/game';
import type { TicketTemplate } from './ticketTemplates';

// Minimal templates for unit testing
const testTemplates: TicketTemplate[] = [
  {
    id: 'TEST-DHCP',
    title: 'DHCP issue on {{segment}}',
    description: 'Fix DHCP on {{segment}} at {{dhcpServer}}.',
    category: 'network-basics',
    difficulty: 1,
    timeLimit: 8,
    rewardCredits: 100,
    rewardXp: 50,
    labTemplate: 'dhcp_{{segment}}',
    hints: [
      { cost: 15, text: 'Check DHCP relay on {{gateway}}', revealed: false },
    ],
    validation: [
      { type: 'ping', params: { source: '{{host}}', destination: '{{gateway}}', successRate: 100 } },
    ],
    requiredItems: ['laptop'],
  },
  {
    id: 'TEST-BGP',
    title: 'BGP peering down at {{site}}',
    description: 'Fix BGP between {{routerA}} and {{peerRouter}}.',
    category: 'routing',
    difficulty: 4,
    timeLimit: 25,
    rewardCredits: 500,
    rewardXp: 250,
    labTemplate: 'bgp_{{site}}',
    hints: [
      { cost: 100, text: 'Check AS numbers and update-source', revealed: false },
      { cost: 150, text: 'Verify TCP 179 connectivity', revealed: false },
      { cost: 200, text: 'Check ebgp-multihop', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{routerA}}', command: 'show ip bgp summary', contains: ['Established'] } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'TEST-ACL',
    title: 'ACL blocking {{protocol}} to {{destIp}}',
    description: 'Fix ACL on {{router}}.',
    category: 'security',
    difficulty: 3,
    timeLimit: 18,
    rewardCredits: 300,
    rewardXp: 150,
    labTemplate: 'acl_fix',
    hints: [
      { cost: 50, text: 'Review ACL entries', revealed: false },
    ],
    validation: [
      { type: 'ping', params: { source: '{{testHost}}', destination: '{{destIp}}', successRate: 100 } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'TEST-WLAN',
    title: 'WiFi interference on floor {{floor}}',
    description: 'Fix channel interference on {{wlcName}}.',
    category: 'wireless',
    difficulty: 2,
    timeLimit: 14,
    rewardCredits: 200,
    rewardXp: 100,
    labTemplate: 'wifi_fix',
    hints: [
      { cost: 35, text: 'Check channel utilization', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{wlcName}}', command: 'show ap channel', contains: ['1'] } },
    ],
    requiredItems: ['laptop'],
  },
  {
    id: 'TEST-VOIP',
    title: 'Voice calls failing on {{router}}',
    description: 'Fix dial peer on {{router}}.',
    category: 'voice',
    difficulty: 2,
    timeLimit: 14,
    rewardCredits: 200,
    rewardXp: 100,
    labTemplate: 'voip_fix',
    hints: [
      { cost: 35, text: 'Check dial-peer config', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{router}}', command: 'show dial-peer voice summary', contains: ['operational'] } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'TEST-DC',
    title: 'vPC consistency check failing on {{nexusA}}',
    description: 'Fix vPC on {{nexusA}}/{{nexusB}}.',
    category: 'datacenter',
    difficulty: 5,
    timeLimit: 30,
    rewardCredits: 650,
    rewardXp: 325,
    labTemplate: 'vpc_fix',
    hints: [
      { cost: 120, text: 'Check vPC global consistency', revealed: false },
      { cost: 180, text: 'Align parameters on secondary peer', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{nexusA}}', command: 'show vpc brief', contains: ['success'] } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },
];

describe('Ticket Engine — Hint Economy', () => {
  it('calculates escalating hint costs with default economy', () => {
    // baseCost=15, costMultiplier=1.8
    expect(calculateHintCost(0)).toBe(15);
    expect(calculateHintCost(1)).toBe(27);  // 15 * 1.8 = 27
    expect(calculateHintCost(2)).toBe(49);  // 15 * 1.8^2 = 48.6 → 49
  });

  it('calculates hint costs with custom economy', () => {
    const economy = { maxHints: 3, baseCost: 20, costMultiplier: 2.0, freeHintsPerDay: 0 };
    expect(calculateHintCost(0, economy)).toBe(20);
    expect(calculateHintCost(1, economy)).toBe(40);
    expect(calculateHintCost(2, economy)).toBe(80);
  });
});

describe('Ticket Engine — SLA Time-Pressure', () => {
  it('maps difficulty to correct SLA tier', () => {
    expect(getSlaTierForDifficulty(1)).toBe('bronze');
    expect(getSlaTierForDifficulty(2)).toBe('bronze');
    expect(getSlaTierForDifficulty(3)).toBe('silver');
    expect(getSlaTierForDifficulty(4)).toBe('gold');
    expect(getSlaTierForDifficulty(5)).toBe('platinum');
  });

  it('SLA_CONFIGS has all four tiers', () => {
    expect(Object.keys(SLA_CONFIGS)).toHaveLength(4);
    expect(SLA_CONFIGS.platinum).toBeDefined();
    expect(SLA_CONFIGS.gold).toBeDefined();
    expect(SLA_CONFIGS.silver).toBeDefined();
    expect(SLA_CONFIGS.bronze).toBeDefined();
  });

  it('platinum has higher bonus and penalty than bronze', () => {
    const plat = SLA_CONFIGS.platinum;
    const bronze = SLA_CONFIGS.bronze;
    expect(plat.speedBonusMultiplier).toBeGreaterThan(bronze.speedBonusMultiplier);
    expect(plat.overtimePenaltyPerMinute).toBeGreaterThan(bronze.overtimePenaltyPerMinute);
    expect(plat.reputationBonus).toBeGreaterThan(bronze.reputationBonus);
  });

  it('calculates time-pressure for on-time completion with speed bonus', () => {
    const startedAt = 1000000; // ms
    // bronze: timeLimit 12 min, speedBonus threshold 70% = 8.4 min
    // complete in 5 min = well under threshold
    const completedAt = startedAt + 5 * 60 * 1000;

    const result = calculateTimePressure(1, startedAt, completedAt);
    expect(result.wasOnTime).toBe(true);
    expect(result.speedBonus).toBe(1.1);
    expect(result.overtimePenalty).toBe(0);
    expect(result.reputationChange).toBeGreaterThan(0);
  });

  it('calculates time-pressure for late completion with overtime penalty', () => {
    const startedAt = 1000000;
    // bronze: timeLimit 12 min, complete in 15 min (3 min overtime)
    const completedAt = startedAt + 15 * 60 * 1000;

    const result = calculateTimePressure(1, startedAt, completedAt);
    expect(result.wasOnTime).toBe(false);
    expect(result.speedBonus).toBe(1.0);
    expect(result.overtimePenalty).toBe(15); // 3 min * 5 credits
    expect(result.reputationChange).toBeLessThan(0);
  });

  it('calculates time-pressure for platinum difficulty', () => {
    const startedAt = 1000000;
    // platinum: timeLimit 20 min, complete in 6 min (30% = under 40% threshold)
    const completedAt = startedAt + 6 * 60 * 1000;

    const result = calculateTimePressure(5, startedAt, completedAt);
    expect(result.wasOnTime).toBe(true);
    expect(result.speedBonus).toBe(2.0); // 2x for platinum speed
    expect(result.sla.tier).toBe('platinum');
  });

  it('handles zero overtime (exactly on time)', () => {
    const startedAt = 1000000;
    // bronze: 12 min exactly
    const completedAt = startedAt + 12 * 60 * 1000;

    const result = calculateTimePressure(1, startedAt, completedAt);
    expect(result.wasOnTime).toBe(true);
    expect(result.overtimePenalty).toBe(0);
    expect(result.minutesOvertime).toBe(0);
  });
});

describe('Ticket Engine — Main API', () => {
  let engine: TicketEngine;

  beforeEach(() => {
    resetTicketEngine();
    engine = createTicketEngine({ templates: testTemplates, random: () => 0.5 });
  });

  it('generates a ticket', () => {
    const ticket = engine.generateTicket({ category: 'network-basics', difficulty: 1 });
    expect(ticket).toBeDefined();
    expect(ticket.id).toBeTruthy();
    expect(ticket.status).toBe('available');
    expect(ticket.category).toBe('network-basics');
  });

  it('generates unique ticket IDs (sequence increments)', () => {
    const t1 = engine.generateTicket({ difficulty: 1 });
    const t2 = engine.generateTicket({ difficulty: 1 });
    expect(t1.id).not.toBe(t2.id);
  });

  it('substitutes template variables', () => {
    const ticket = engine.generateTicket({
      category: 'network-basics',
      difficulty: 1,
      variables: { segment: 'Finance', dhcpServer: '10.10.10.5', gateway: '10.10.10.1', host: 'PC-FIN-01' },
    });
    expect(ticket.title).toContain('Finance');
    expect(ticket.labTemplate).toContain('Finance');
  });

  it('returns catalog summary with all categories', () => {
    const summary = engine.getCatalogSummary();
    expect(summary.totalTemplates).toBe(6);
    const categories = summary.categories.map(c => c.category);
    expect(categories).toContain('wireless');
    expect(categories).toContain('voice');
    expect(categories).toContain('datacenter');
  });

  it('getCategories returns all unique categories from templates', () => {
    const cats = engine.getCategories();
    expect(cats.length).toBeGreaterThanOrEqual(4);
    expect(cats).toContain('routing');
    expect(cats).toContain('wireless');
  });

  it('getSla returns correct SLA config', () => {
    const sla = engine.getSla(5);
    expect(sla.tier).toBe('platinum');
    expect(sla.speedBonusMultiplier).toBe(2.0);
  });

  it('calculateTimePressure returns neutral result if no startedAt', () => {
    const ticket = engine.generateTicket({ difficulty: 1 });
    const result = engine.calculateTimePressure(ticket, Date.now());
    expect(result.wasOnTime).toBe(true);
    expect(result.speedBonus).toBe(1.0);
    expect(result.overtimePenalty).toBe(0);
  });

  it('calculateTimePressure with startedAt computes correctly', () => {
    const ticket = {
      ...engine.generateTicket({ difficulty: 1 }),
      startedAt: 1000000,
    };
    const completedAt = 1000000 + 5 * 60 * 1000;
    const result = engine.calculateTimePressure(ticket, completedAt);
    expect(result.wasOnTime).toBe(true);
    expect(result.sla.tier).toBe('bronze');
  });
});

describe('Ticket Engine — Difficulty Scaling', () => {
  it('generates variables appropriate for low difficulty (fewer devices)', () => {
    const vars = generateDifficultyVariables(1, 'network-basics', 42);
    expect(vars.host).toBeDefined();
    expect(vars.switch).toBeDefined();
    // Low difficulty should not have multi-router vars
    expect(vars.routerA).toBeUndefined();
    expect(vars.nexusA).toBeUndefined();
  });

  it('generates variables appropriate for high difficulty (many devices)', () => {
    const vars = generateDifficultyVariables(5, 'routing', 42);
    expect(vars.routerA).toBeDefined();
    expect(vars.routerB).toBeDefined();
    // These may or may not be present depending on RNG, but checking structure
    expect(vars.site).toBeDefined();
    expect(vars.segment).toBeDefined();
  });

  it('seeded random produces deterministic results', () => {
    const vars1 = generateDifficultyVariables(3, 'switching', 123);
    const vars2 = generateDifficultyVariables(3, 'switching', 123);
    expect(vars1).toEqual(vars2);
  });

  it('different seeds produce different results', () => {
    const vars1 = generateDifficultyVariables(3, 'switching', 1);
    const vars2 = generateDifficultyVariables(3, 'switching', 999);
    // At least one field should differ
    const keys = Object.keys(vars1);
    const anyDifferent = keys.some(k => vars1[k] !== vars2[k]);
    expect(anyDifferent).toBe(true);
  });
});

describe('Ticket Engine — Template Data Coverage', () => {
  it('has at least 40 templates', async () => {
    const { TICKET_TEMPLATES } = await import('./ticketTemplateData');
    expect(TICKET_TEMPLATES.length).toBeGreaterThanOrEqual(40);
  });

  it('covers all 10 categories', async () => {
    const { TICKET_TEMPLATES } = await import('./ticketTemplateData');
    const allCats: TicketCategory[] = [
      'network-basics', 'switching', 'routing', 'security', 'systems',
      'automation', 'high-availability', 'wireless', 'voice', 'datacenter',
    ];
    const present = new Set(TICKET_TEMPLATES.map(t => t.category));
    for (const cat of allCats) {
      expect(present.has(cat), `Missing category: ${cat}`).toBe(true);
    }
  });

  it('covers all 5 difficulty tiers', async () => {
    const { TICKET_TEMPLATES } = await import('./ticketTemplateData');
    const present = new Set(TICKET_TEMPLATES.map(t => t.difficulty));
    for (const d of [1, 2, 3, 4, 5]) {
      expect(present.has(d), `Missing difficulty tier: ${d}`).toBe(true);
    }
  });

  it('all templates have at least 1 hint', async () => {
    const { TICKET_TEMPLATES } = await import('./ticketTemplateData');
    for (const template of TICKET_TEMPLATES) {
      expect(template.hints.length, `Template ${template.id} has no hints`).toBeGreaterThanOrEqual(1);
    }
  });

  it('all templates have valid validation criteria', async () => {
    const { TICKET_TEMPLATES } = await import('./ticketTemplateData');
    for (const template of TICKET_TEMPLATES) {
      expect(template.validation.length, `Template ${template.id} has no validation`).toBeGreaterThanOrEqual(1);
      for (const v of template.validation) {
        expect(['ping', 'command', 'config', 'api']).toContain(v.type);
      }
    }
  });

  it('all templates have unique IDs', async () => {
    const { TICKET_TEMPLATES } = await import('./ticketTemplateData');
    const ids = TICKET_TEMPLATES.map(t => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('each template has valid difficulty scaling (rewards increase with difficulty)', async () => {
    const { TICKET_TEMPLATES } = await import('./ticketTemplateData');
    // Group by category and verify monotonic reward increase within each
    const byCategory = new Map<string, TicketTemplate[]>();
    for (const t of TICKET_TEMPLATES) {
      const group = byCategory.get(t.category) || [];
      group.push(t);
      byCategory.set(t.category, group);
    }

    for (const [, templates] of byCategory) {
      templates.sort((a, b) => a.difficulty - b.difficulty);
      for (let i = 1; i < templates.length; i++) {
        const prev = templates[i - 1];
        const curr = templates[i];
        // Higher difficulty should mean higher or equal reward
        // (not strictly enforced for same-difficulty cross-category)
        if (curr.difficulty > prev.difficulty) {
          expect(curr.rewardCredits, `${curr.id} rewards not >= ${prev.id}`)
            .toBeGreaterThanOrEqual(prev.rewardCredits);
        }
      }
    }
  });
});

describe('Ticket Template Catalog (updated)', () => {
  it('catalog summary includes all 10 categories', async () => {
    const { createTicketTemplateCatalogSummary } = await import('./ticketTemplates');
    const { TICKET_TEMPLATES } = await import('./ticketTemplateData');
    const summary = createTicketTemplateCatalogSummary(TICKET_TEMPLATES);
    expect(summary.totalTemplates).toBe(TICKET_TEMPLATES.length);
    expect(summary.categories).toHaveLength(10);
  });
});
