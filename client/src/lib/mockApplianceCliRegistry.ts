import type { MockVendorKind, MockCliSession, ApplianceConfig } from './mockCliShared';
import { MOCK_VENDOR_LABELS } from './mockCliShared';
import { createCiscoCli } from './mockCiscoCli';
import { createFortiCli } from './mockFortiCli';
import { createArubaCli } from './mockArubaCli';
import { createDellCli } from './mockDellCli';

// Re-export shared types for consumers that still import from here
export type MockApplianceKind = MockVendorKind;
export { MOCK_VENDOR_LABELS as MOCK_APPLIANCE_LABELS };

/** Detect which vendor style a hostname implies. */
export function detectMockApplianceKind(hostname: string): MockApplianceKind {
  const normalized = hostname.toLowerCase();

  if (/forti|fgt/.test(normalized)) {
    return 'fortinet';
  }

  if (/aruba|aos|cx/.test(normalized)) {
    return 'aruba';
  }

  if (/dell|os10|ftos/.test(normalized)) {
    return 'dell';
  }

  return 'cisco';
}

/** Human-readable label for a vendor kind. */
export function getMockApplianceLabel(hostname: string): string {
  return MOCK_VENDOR_LABELS[detectMockApplianceKind(hostname)];
}

/** Create a mock CLI session from a hostname string (backward-compatible). */
export function createMockCliForHostname(hostname: string, overrides?: Record<string, unknown>): MockCliSession {
  return createMockCliForVendor(detectMockApplianceKind(hostname), hostname, overrides);
}

/** Create a mock CLI session explicitly by vendor kind. */
export function createMockCliForVendor(
  vendor: MockApplianceKind,
  hostname: string,
  overrides?: Record<string, unknown>,
): MockCliSession {
  switch (vendor) {
    case 'fortinet':
      return createFortiCli({ hostname, ...overrides });
    case 'aruba':
      return createArubaCli({ hostname, ...overrides });
    case 'dell':
      return createDellCli({ hostname, ...overrides });
    case 'cisco':
    default:
      return createCiscoCli({ hostname, ...overrides });
  }
}

/** Create a mock CLI session from an appliance config (used by ticket/lab registry). */
export function createMockCliForAppliance(config: ApplianceConfig): MockCliSession {
  return createMockCliForVendor(config.vendor, config.hostname, config.options as Record<string, unknown> | undefined);
}

/** Create mock CLI sessions for all appliances in a lab setup. */
export function createMockCliForLab(appliances: ApplianceConfig[]): MockCliSession[] {
  return appliances.map(createMockCliForAppliance);
}
