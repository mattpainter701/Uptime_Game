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

  it('includes the new BGP route flapping scenario with Cisco and Fortinet tasks', () => {
    const bgp = getScenarioTemplate('scenario-bgp-route-flapping');
    expect(bgp).toBeDefined();
    expect(bgp?.tasks.map((task) => task.vendor)).toEqual(['cisco', 'fortinet']);
    expect(bgp?.tasks.every((task) => task.validation.length > 0)).toBe(true);
    expect(bgp?.ticketMetadata.incidentId).toBe('INC-MV-1403');
  });

  it('includes the new MPLS/VPN scenario with multi-vendor validation', () => {
    const mpls = getScenarioTemplate('scenario-mpls-vpn-validation');
    expect(mpls).toBeDefined();
    expect(mpls?.tasks.map((task) => task.vendor)).toEqual(['cisco', 'aruba']);
    const ticket = buildTicketFromScenario(mpls!);
    expect(ticket.id).toBe('INC-MV-1404');
    expect(ticket.validation.length).toBeGreaterThanOrEqual(2);
  });

  it('includes the new SD-WAN policy scenario with app-route and zone rules', () => {
    const sdwan = getScenarioTemplate('scenario-sdwan-policy-routing');
    expect(sdwan).toBeDefined();
    expect(sdwan?.tasks.map((task) => task.vendor)).toEqual(['cisco', 'fortinet']);
    const ticket = buildTicketFromScenario(sdwan!);
    expect(ticket.id).toBe('INC-MV-1405');
    expect(ticket.description).toContain('SD-WAN');
    expect(ticket.hints.length).toBeGreaterThanOrEqual(1);
  });
});
