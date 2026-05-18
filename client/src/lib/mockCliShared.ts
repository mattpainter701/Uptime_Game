import type { CiscoCliOptions, CiscoCliResult, CiscoCliSession, CiscoCliSnapshot } from './mockCiscoCli';
import type { FortiCliOptions, FortiCliResult, FortiCliSession, FortiCliSnapshot } from './mockFortiCli';
import type { ArubaCliOptions, ArubaCliResult, ArubaCliSession, ArubaCliSnapshot } from './mockArubaCli';
import type { DellCliOptions, DellCliResult, DellCliSession, DellCliSnapshot } from './mockDellCli';

/** Union of all supported vendor appliance styles. */
export type MockVendorKind = 'cisco' | 'fortinet' | 'aruba' | 'dell';

/** V agnostic result from ANY mock CLI session. */
export interface MockCliResult {
  lines: string[];
  prompt: string;
  shouldDisconnect: boolean;
}

/** Vendor-agnostic mock CLI session contract shared by all four vendors. */
export interface MockCliSession {
  run(command: string): MockCliResult;
  getPrompt(): string;
  snapshot(): Record<string, unknown>;
  /** Tab-completion: returns candidate completions for the partial input. */
  autocomplete?(input: string): string[];
}

/** Snapshot shape common to all vendors (hostname + vendor kind). */
export interface MockCliSnapshot {
  hostname: string;
  vendor: MockVendorKind;
}

/** Supported ticket categories defined in Sprint 5 spec. */
export type TicketCategory =
  | 'network-basics'
  | 'switching'
  | 'routing'
  | 'security'
  | 'systems'
  | 'automation'
  | 'high-availability'
  | 'wireless'
  | 'voice'
  | 'datacenter';

/** Ticket difficulty tier (1 = simplest, 5 = hardest). */
export type TicketTier = 1 | 2 | 3 | 4 | 5;

/** Configuration for a single appliance in a lab scenario. */
export interface ApplianceConfig {
  vendor: MockVendorKind;
  hostname: string;
  /** Optional vendor-specific initialization options. */
  options?: Record<string, unknown>;
}

/** A lab setup defines one or more appliances reachable in a scenario. */
export interface LabSetup {
  id: string;
  label: string;
  description: string;
  appliances: ApplianceConfig[];
}

/** Maps a ticket category to one or more pre-built lab setups. */
export interface CategoryLabRegistry {
  category: TicketCategory;
  tiers: Partial<Record<TicketTier, LabSetup[]>>;
}

/** Factory function signature for creating a vendor CLI session from options. */
export type CreateMockCliFn =
  | ((options?: CiscoCliOptions) => CiscoCliSession)
  | ((options?: FortiCliOptions) => FortiCliSession)
  | ((options?: ArubaCliOptions) => ArubaCliSession)
  | ((options?: DellCliOptions) => DellCliSession);

/** Vendor display labels used in UI. */
export const MOCK_VENDOR_LABELS: Record<MockVendorKind, string> = {
  cisco: 'Cisco IOS XE',
  fortinet: 'FortiOS',
  aruba: 'Aruba AOS-CX',
  dell: 'Dell OS10',
};

/** Vendor prompt root indicators (mode-less). */
export const MOCK_VENDOR_PROMPT_SUFFIX: Record<MockVendorKind, string> = {
  cisco: '#',
  fortinet: '#',
  aruba: '#',
  dell: '#',
};
