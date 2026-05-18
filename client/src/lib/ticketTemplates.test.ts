import { describe, expect, it } from 'vitest';
import { createProceduralTicketGenerator, createTicketTemplateCatalogSummary, instantiateTicketTemplate } from './ticketTemplates';
import type { TicketTemplate } from './ticketTemplates';

const routingTemplate: TicketTemplate = {
  id: 'ROUTING-OSPF',
  title: 'Restore {{site}} OSPF adjacency',
  description: 'Neighbors between {{leftRouter}} and {{rightRouter}} remain stuck in INIT.',
  category: 'routing',
  difficulty: 3,
  timeLimit: 20,
  rewardCredits: 350,
  rewardXp: 175,
  labTemplate: 'ospf_{{site}}',
  hints: [
    { cost: 70, text: 'Compare {{leftRouter}} and {{rightRouter}} interface timers', revealed: false },
  ],
  validation: [
    {
      type: 'command',
      params: {
        node: '{{leftRouter}}',
        command: 'show ip ospf neighbor',
        contains: ['FULL'],
      },
    },
  ],
  requiredItems: ['laptop', 'console-cable'],
  consumeItems: undefined,
};

const fallbackTemplate: TicketTemplate = {
  id: 'SWITCH-VLAN',
  title: 'Move {{host}} into VLAN 20',
  description: 'Access switch port {{port}} is still in VLAN 1.',
  category: 'switching',
  difficulty: 2,
  timeLimit: 12,
  rewardCredits: 150,
  rewardXp: 75,
  labTemplate: 'vlan_{{host}}',
  hints: [
    { cost: 35, text: 'Check switchport mode on {{port}}', revealed: false },
  ],
  validation: [
    {
      type: 'ping',
      params: {
        source: '{{host}}',
        destination: '10.20.0.1',
        successRate: 100,
      },
    },
  ],
  requiredItems: ['laptop', 'console-cable', 'patch-cable'],
  consumeItems: ['patch-cable'],
};

const routingFallbackTemplate: TicketTemplate = {
  id: 'ROUTING-BGP',
  title: 'Restore BGP peering on {{site}} edge',
  description: 'The edge router at {{site}} is only reaching Active state.',
  category: 'routing',
  difficulty: 4,
  timeLimit: 25,
  rewardCredits: 420,
  rewardXp: 210,
  labTemplate: 'bgp_{{site}}',
  hints: [
    { cost: 90, text: 'Compare {{peerA}} and {{peerB}} neighbor states', revealed: false },
  ],
  validation: [
    {
      type: 'command',
      params: {
        node: '{{peerA}}',
        command: 'show ip bgp summary',
        contains: ['Established'],
      },
    },
  ],
  requiredItems: ['laptop', 'console-cable'],
  consumeItems: undefined,
};

describe('ticketTemplates', () => {
  it('instantiates reusable ticket templates with recursive placeholder substitution', () => {
    const ticket = instantiateTicketTemplate(routingTemplate, {
      site: 'HQ',
      leftRouter: 'R1',
      rightRouter: 'R2',
    }, 7);

    expect(ticket.id).toBe('ROUTING-OSPF-007');
    expect(ticket.status).toBe('available');
    expect(ticket.title).toBe('Restore HQ OSPF adjacency');
    expect(ticket.description).toBe('Neighbors between R1 and R2 remain stuck in INIT.');
    expect(ticket.labTemplate).toBe('ospf_HQ');
    expect(ticket.hints[0].text).toBe('Compare R1 and R2 interface timers');
    expect(ticket.validation[0].params).toEqual({
      node: 'R1',
      command: 'show ip ospf neighbor',
      contains: ['FULL'],
    });
    expect(ticket.requiredItems).toEqual(['laptop', 'console-cable']);
  });

  it('generates the best matching ticket template and keeps ids unique', () => {
    const generator = createProceduralTicketGenerator({
      templates: [routingTemplate, fallbackTemplate],
      random: () => 0,
    });

    const first = generator.generateTicket({
      category: 'routing',
      difficulty: 5,
      variables: {
        site: 'HQ',
        leftRouter: 'R1',
        rightRouter: 'R2',
      },
    });

    const second = generator.generateTicket({
      category: 'routing',
      difficulty: 5,
      variables: {
        site: 'HQ',
        leftRouter: 'R1',
        rightRouter: 'R2',
      },
    });

    expect(first.id).toBe('ROUTING-OSPF-001');
    expect(second.id).toBe('ROUTING-OSPF-002');
    expect(first.title).toBe('Restore HQ OSPF adjacency');
    expect(first.category).toBe('routing');
    expect(first.difficulty).toBe(3);
    expect(first.hints[0].text).toContain('R1');
  });

  it('prefers the closest difficulty when an exact category match is unavailable', () => {
    const generator = createProceduralTicketGenerator({
      templates: [fallbackTemplate, routingFallbackTemplate],
      random: () => 0,
    });

    const ticket = generator.generateTicket({
      category: 'routing',
      difficulty: 5,
      variables: {
        site: 'HQ',
        peerA: 'R1',
        peerB: 'R2',
      },
    });

    expect(ticket.id.startsWith('ROUTING-BGP')).toBe(true);
    expect(ticket.difficulty).toBe(4);
    expect(ticket.title).toBe('Restore BGP peering on HQ edge');
  });

  it('falls back to the closest difficulty across all templates when no exact difficulty exists', () => {
    const generator = createProceduralTicketGenerator({
      templates: [routingTemplate, fallbackTemplate],
      random: () => 0,
    });

    const ticket = generator.generateTicket({
      difficulty: 5,
      variables: {
        site: 'HQ',
        leftRouter: 'R1',
        rightRouter: 'R2',
        host: 'WS-01',
        port: 'Gi1/0/24',
      },
    });

    expect(ticket.difficulty).toBe(3);
    expect(ticket.id.startsWith('ROUTING-OSPF')).toBe(true);
  });

  it('summarizes the catalog by category and difficulty for UI-friendly browsing', () => {
    const summary = createTicketTemplateCatalogSummary([
      routingTemplate,
      fallbackTemplate,
      routingFallbackTemplate,
    ]);

    expect(summary.totalTemplates).toBe(3);
    expect(summary.categories).toHaveLength(10);

    const routingSummary = summary.categories.find((entry) => entry.category === 'routing');
    expect(routingSummary).toBeDefined();
    expect(routingSummary?.count).toBe(2);
    expect(routingSummary?.templateIds).toEqual(['ROUTING-OSPF', 'ROUTING-BGP']);
    expect(routingSummary?.difficultySummary).toEqual([
      { difficulty: 1, count: 0, templateIds: [] },
      { difficulty: 2, count: 0, templateIds: [] },
      { difficulty: 3, count: 1, templateIds: ['ROUTING-OSPF'] },
      { difficulty: 4, count: 1, templateIds: ['ROUTING-BGP'] },
      { difficulty: 5, count: 0, templateIds: [] },
    ]);

    const automationSummary = summary.categories.find((entry) => entry.category === 'automation');
    expect(automationSummary?.count).toBe(0);
    expect(automationSummary?.difficultySummary.every((entry) => entry.count === 0)).toBe(true);
  });
});
