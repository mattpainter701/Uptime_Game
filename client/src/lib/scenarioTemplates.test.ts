import { describe, expect, it } from 'vitest';

import {
  MULTI_VENDOR_SCENARIO_TEMPLATES,
  buildTicketFromScenario,
  getScenarioTemplate,
} from './scenarioTemplates';

describe('multi-vendor scenario templates', () => {
  it('defines reusable templates with mixed vendor tasks and validations', () => {
    expect(MULTI_VENDOR_SCENARIO_TEMPLATES.length).toBeGreaterThanOrEqual(2);

    const branch = getScenarioTemplate('scenario-branch-vlan-remediation');
    expect(branch).toBeDefined();
    expect(branch?.tasks.map((task) => task.vendor)).toEqual(['cisco', 'aruba', 'dell']);
    expect(branch?.tasks.every((task) => task.validation.length > 0)).toBe(true);
    expect(branch?.ticketMetadata.incidentId).toBe('INC-MV-1401');
  });

  it('builds a ticket with flattened validation criteria and vendor-aware hints', () => {
    const template = getScenarioTemplate('scenario-firewall-edge-restoration');
    expect(template).toBeDefined();

    const ticket = buildTicketFromScenario(template!);

    expect(ticket.id).toBe('INC-MV-1402');
    expect(ticket.status).toBe('available');
    expect(ticket.requiredItems).toEqual(['laptop', 'console-cable']);
    expect(ticket.validation).toHaveLength(2);
    expect(ticket.description).toContain('RTR1 (cisco)');
    expect(ticket.description).toContain('FGT1 (fortinet)');
    expect(ticket.hints.map((hint) => hint.text).join('\n')).toContain('FortiGate tasks');
  });
});
