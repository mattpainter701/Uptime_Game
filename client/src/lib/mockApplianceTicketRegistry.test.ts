import { describe, expect, it } from 'vitest';
import {
  getLabById,
  getLabForTicket,
  getLabsByCategory,
  getTicketCategories,
  getTiersForCategory,
  getAllLabs,
} from './mockApplianceTicketRegistry';

describe('appliance ticket registry', () => {
  it('returns all 10 ticket categories', () => {
    const categories = getTicketCategories();
    expect(categories).toHaveLength(10);
    expect(categories).toContain('network-basics');
    expect(categories).toContain('switching');
    expect(categories).toContain('routing');
    expect(categories).toContain('security');
    expect(categories).toContain('systems');
    expect(categories).toContain('automation');
    expect(categories).toContain('high-availability');
    expect(categories).toContain('wireless');
    expect(categories).toContain('voice');
    expect(categories).toContain('datacenter');
  });

  it('returns tiered lab setups for each category', () => {
    // Network-basics: tiers 1, 2, 3
    const basicsT1 = getLabsByCategory('network-basics', 1);
    expect(basicsT1).toHaveLength(1);
    expect(basicsT1[0].id).toBe('basics-t1-cisco');
    expect(basicsT1[0].appliances[0].vendor).toBe('cisco');

    const basicsT2 = getLabsByCategory('network-basics', 2);
    expect(basicsT2).toHaveLength(1);
    expect(basicsT2[0].appliances).toHaveLength(2);
    expect(basicsT2[0].appliances[0].vendor).toBe('aruba');

    const basicsT3 = getLabsByCategory('network-basics', 3);
    expect(basicsT3).toHaveLength(1);
    expect(basicsT3[0].appliances).toHaveLength(3);

    // Empty tier (no tier 4 for network-basics)
    expect(getLabsByCategory('network-basics', 4)).toHaveLength(0);
  });

  it('looks up a lab by id', () => {
    const lab = getLabById('routing-t3-multi');
    expect(lab).toBeDefined();
    expect(lab!.appliances).toHaveLength(3);
    expect(lab!.appliances.map((a) => a.vendor)).toEqual(['cisco', 'aruba', 'dell']);

    // Ticket override lab
    const override = getLabById('override-basics-001');
    expect(override).toBeDefined();
    expect(override!.appliances[0].hostname).toBe('ACCESS-SW1');
  });

  it('returns tiers for a category', () => {
    expect(getTiersForCategory('routing')).toEqual([1, 2, 3, 5]);
    expect(getTiersForCategory('security')).toEqual([1, 2, 3]);
  });

  it('resolves ticket-specific overrides before category defaults', () => {
    // Ticket with override
    const overridden = getLabForTicket('ticket-basics-001', 'network-basics', 1);
    expect(overridden).toHaveLength(1);
    expect(overridden[0].id).toBe('override-basics-001');

    // Ticket without override falls back to category
    const fallback = getLabForTicket('ticket-basics-999', 'network-basics', 1);
    expect(fallback).toHaveLength(1);
    expect(fallback[0].id).toBe('basics-t1-cisco');
  });

  it('returns all labs across categories', () => {
    const all = getAllLabs();
    expect(all.length).toBeGreaterThan(20);
    // Every lab has at least one appliance
    for (const lab of all) {
      expect(lab.appliances.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('covers multi-vendor labs for high-tier scenarios', () => {
    // Tier 3 switching is multi-vendor
    const swT3 = getLabsByCategory('switching', 3);
    expect(swT3).toHaveLength(1);
    const vendors = swT3[0].appliances.map((a) => a.vendor);
    expect(vendors).toContain('cisco');
    expect(vendors).toContain('aruba');
    expect(vendors).toContain('dell');

    // Tier 4 HA is multi-vendor
    const haT4 = getLabsByCategory('high-availability', 4);
    expect(haT4).toHaveLength(1);
    expect(haT4[0].appliances).toHaveLength(4);
  });

  it('has FortiGate appliances for security and HA categories', () => {
    const secT1 = getLabsByCategory('security', 1);
    expect(secT1[0].appliances[0].vendor).toBe('fortinet');

    const secT3 = getLabsByCategory('security', 3);
    expect(secT3[0].appliances.every((a) => a.vendor === 'fortinet')).toBe(true);
  });

  it('has Dell appliances for systems and datacenter categories', () => {
    const sysT1 = getLabsByCategory('systems', 1);
    expect(sysT1[0].appliances[0].vendor).toBe('dell');

    const dcT3 = getLabsByCategory('datacenter', 3);
    expect(dcT3[0].appliances[0].vendor).toBe('dell');
  });
});
