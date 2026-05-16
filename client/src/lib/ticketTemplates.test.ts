import { describe, expect, it } from 'vitest';
import { createProceduralTicketGenerator, instantiateTicketTemplate } from './ticketTemplates';
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
});
