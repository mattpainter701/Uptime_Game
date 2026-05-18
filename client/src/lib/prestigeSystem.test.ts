// Sprint 7: Prestige System Tests
import { describe, expect, it } from 'vitest';
import {
  PRESTIGE_LEVELS,
  canPrestige,
  getPrestigeCost,
  computePrestigeMultiplier,
  getPersistedItems,
  executePrestige,
} from './prestigeSystem';
import type { ShopItem } from '../types/game';

const MOCK_SHOP_ITEMS: ShopItem[] = [
  { id: 'office-desk', name: 'Desk', description: '', category: 'office-upgrade', cost: 500, requiredLevel: 1, icon: '', maxPurchases: 1 },
  { id: 'cert-ccna', name: 'CCNA', description: '', category: 'certification', cost: 500, requiredLevel: 1, icon: '', maxPurchases: 1 },
  { id: 'tool-cable', name: 'Cable', description: '', category: 'tool', cost: 100, requiredLevel: 1, icon: '', maxPurchases: 1 },
  { id: 'consumable-energy', name: 'Energy', description: '', category: 'consumable', cost: 50, requiredLevel: 1, icon: '', maxPurchases: 5 },
  { id: 'cosmetic-nameplate', name: 'Nameplate', description: '', category: 'cosmetic', cost: 100, requiredLevel: 1, icon: '', maxPurchases: 1 },
];

describe('prestigeSystem', () => {
  it('has exactly 10 prestige levels', () => {
    expect(PRESTIGE_LEVELS.length).toBe(10);
  });

  it('prestige levels are sequential from 1 to 10', () => {
    PRESTIGE_LEVELS.forEach((level, idx) => {
      expect(level.level).toBe(idx + 1);
    });
  });

  it('multipliers increase with each level', () => {
    for (let i = 1; i < PRESTIGE_LEVELS.length; i++) {
      expect(PRESTIGE_LEVELS[i].multiplier).toBeGreaterThan(PRESTIGE_LEVELS[i - 1].multiplier);
    }
  });

  it('required credits increase with each level', () => {
    for (let i = 1; i < PRESTIGE_LEVELS.length; i++) {
      expect(PRESTIGE_LEVELS[i].requiredCredits).toBeGreaterThan(PRESTIGE_LEVELS[i - 1].requiredCredits);
    }
  });

  it('computePrestigeMultiplier returns 1.0 for level 0', () => {
    expect(computePrestigeMultiplier(0)).toBe(1.0);
  });

  it('computePrestigeMultiplier returns correct multiplier for each level', () => {
    expect(computePrestigeMultiplier(1)).toBe(1.15);
    expect(computePrestigeMultiplier(5)).toBe(1.75);
    expect(computePrestigeMultiplier(10)).toBe(2.50);
  });

  it('getPrestigeCost returns correct cost for each level', () => {
    const cost1 = getPrestigeCost(0);
    expect(cost1).not.toBeNull();
    expect(cost1!.credits).toBe(5000);
    expect(cost1!.nextLevel.level).toBe(1);

    const cost5 = getPrestigeCost(4);
    expect(cost5).not.toBeNull();
    expect(cost5!.credits).toBe(80000);
    expect(cost5!.nextLevel.level).toBe(5);
  });

  it('getPrestigeCost returns null at max level', () => {
    const cost = getPrestigeCost(10);
    expect(cost).toBeNull();
  });

  it('canPrestige returns false if level < 8', () => {
    const result = canPrestige(999999, 5);
    expect(result.can).toBe(false);
  });

  it('canPrestige returns false if not enough credits', () => {
    const result = canPrestige(100, 8);
    expect(result.can).toBe(false);
  });

  it('canPrestige returns true if eligible', () => {
    const result = canPrestige(5000, 8, 0);
    expect(result.can).toBe(true);
    expect(result.nextLevel!.level).toBe(1);
  });

  it('getPersistedItems keeps office-upgrade, certification, tool, cosmetic', () => {
    const owned = ['office-desk', 'cert-ccna', 'tool-cable', 'consumable-energy', 'cosmetic-nameplate'];
    const persisted = getPersistedItems(owned, MOCK_SHOP_ITEMS);
    expect(persisted).toContain('office-desk');
    expect(persisted).toContain('cert-ccna');
    expect(persisted).toContain('tool-cable');
    expect(persisted).toContain('cosmetic-nameplate');
    expect(persisted).not.toContain('consumable-energy');
  });

  it('executePrestige returns correct new state', () => {
    const state = { prestigeLevel: 0, prestigeMultiplier: 1.0, persistedUpgrades: [] };
    const owned = ['office-desk', 'cert-ccna', 'consumable-energy'];
    const result = executePrestige(state, owned, MOCK_SHOP_ITEMS);

    expect(result.newPrestige.prestigeLevel).toBe(1);
    expect(result.newPrestige.prestigeMultiplier).toBe(1.15);
    expect(result.persistedItems).toContain('office-desk');
    expect(result.persistedItems).toContain('cert-ccna');
    expect(result.persistedItems).not.toContain('consumable-energy');
  });

  it('executePrestige throws for invalid level', () => {
    const state = { prestigeLevel: 10, prestigeMultiplier: 2.50, persistedUpgrades: [] };
    expect(() => executePrestige(state, [], MOCK_SHOP_ITEMS)).toThrow();
  });
});
