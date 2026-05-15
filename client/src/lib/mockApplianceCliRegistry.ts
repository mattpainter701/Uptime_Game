import { createCiscoCli } from './mockCiscoCli';
import { createFortiCli } from './mockFortiCli';
import { createArubaCli } from './mockArubaCli';
import { createDellCli } from './mockDellCli';

export type MockApplianceKind = 'cisco' | 'fortinet' | 'aruba' | 'dell';

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

export function getMockApplianceLabel(hostname: string): string {
  switch (detectMockApplianceKind(hostname)) {
    case 'fortinet':
      return 'FortiOS';
    case 'aruba':
      return 'Aruba AOS-CX';
    case 'dell':
      return 'Dell OS10';
    case 'cisco':
    default:
      return 'Cisco IOS XE';
  }
}

export function createMockCliForHostname(hostname: string) {
  switch (detectMockApplianceKind(hostname)) {
    case 'fortinet':
      return createFortiCli({ hostname });
    case 'aruba':
      return createArubaCli({ hostname });
    case 'dell':
      return createDellCli({ hostname });
    case 'cisco':
    default:
      return createCiscoCli({ hostname });
  }
}
