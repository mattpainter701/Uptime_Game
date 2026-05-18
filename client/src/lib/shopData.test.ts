// Sprint 7: Shop Data Tests
import { describe, expect, it } from 'vitest';
import { SHOP_ITEMS, SHOP_CATEGORIES, getShopItem, getItemsByCategory, getItemsByLevel } from './shopData';

describe('shopData', () => {
  it('contains exactly 35 shop items', () => {
    expect(SHOP_ITEMS.length).toBe(35);
  });

  it('has 6 categories', () => {
    expect(SHOP_CATEGORIES.length).toBe(6);
    const categoryIds = SHOP_CATEGORIES.map(c => c.id);
    expect(categoryIds).toContain('office-upgrade');
    expect(categoryIds).toContain('certification');
    expect(categoryIds).toContain('tool');
    expect(categoryIds).toContain('consumable');
    expect(categoryIds).toContain('cosmetic');
    expect(categoryIds).toContain('specialty');
  });

  it('all items have required fields', () => {
    for (const item of SHOP_ITEMS) {
      expect(item.id).toBeTruthy();
      expect(item.name).toBeTruthy();
      expect(item.description).toBeTruthy();
      expect(item.category).toBeTruthy();
      expect(item.cost).toBeGreaterThan(0);
      expect(item.requiredLevel).toBeGreaterThanOrEqual(1);
      expect(item.icon).toBeTruthy();
      expect(item.maxPurchases).toBeGreaterThanOrEqual(1);
    }
  });

  it('costs are within expected range ($50-$10000)', () => {
    const costs = SHOP_ITEMS.map(i => i.cost);
    expect(Math.min(...costs)).toBeGreaterThanOrEqual(50);
    expect(Math.max(...costs)).toBeLessThanOrEqual(10000);
  });

  it('getShopItem returns correct item by id', () => {
    const item = getShopItem('cert-ccna');
    expect(item).toBeDefined();
    expect(item!.name).toBe('CCNA Certification');
    expect(item!.category).toBe('certification');
  });

  it('getShopItem returns undefined for nonexistent id', () => {
    expect(getShopItem('nonexistent')).toBeUndefined();
  });

  it('getItemsByCategory filters correctly', () => {
    const officeItems = getItemsByCategory('office-upgrade');
    expect(officeItems.length).toBe(7);
    officeItems.forEach(item => expect(item.category).toBe('office-upgrade'));

    const certItems = getItemsByCategory('certification');
    expect(certItems.length).toBe(6);

    const toolItems = getItemsByCategory('tool');
    expect(toolItems.length).toBe(6);

    const consumableItems = getItemsByCategory('consumable');
    expect(consumableItems.length).toBe(6);

    const cosmeticItems = getItemsByCategory('cosmetic');
    expect(cosmeticItems.length).toBe(6);

    const specialtyItems = getItemsByCategory('specialty');
    expect(specialtyItems.length).toBe(4);
  });

  it('getItemsByLevel filters by required level', () => {
    const level1Items = getItemsByLevel(1);
    expect(level1Items.length).toBeGreaterThanOrEqual(4); // At least some level-1 items

    const level8Items = getItemsByLevel(8);
    expect(level8Items.length).toBe(35); // All items visible at max level

    // Level 1 items should all be at level 1
    const lvl1Only = getItemsByLevel(1).filter(i => i.requiredLevel > 1);
    expect(lvl1Only.length).toBe(0);
  });

  it('office upgrades have officeUpgrade keys for Sprint 8 3D', () => {
    const officeItems = getItemsByCategory('office-upgrade');
    for (const item of officeItems) {
      expect(item.officeUpgrade).toBeTruthy();
    }
  });

  it('consumable items have consumable buff defined', () => {
    const consumables = getItemsByCategory('consumable');
    expect(consumables.length).toBe(6);
    for (const item of consumables) {
      expect(item.consumable).toBeDefined();
      expect(item.consumable!.type).toBeTruthy();
      expect(item.consumable!.value).toBeGreaterThan(0);
      expect(item.consumable!.duration).toBeGreaterThan(0);
    }
  });

  it('cosmetic items have no buffs (pure visual)', () => {
    const cosmetics = getItemsByCategory('cosmetic');
    for (const item of cosmetics) {
      expect(item.buff).toBeUndefined();
      expect(item.consumable).toBeUndefined();
    }
  });

  it('certification items have permanent buffs', () => {
    const certs = getItemsByCategory('certification');
    for (const item of certs) {
      expect(item.buff).toBeDefined();
    }
  });

  it('specialty items have unique properties', () => {
    const specialty = getItemsByCategory('specialty');
    // Uptime Insurance — no buff (special mechanic)
    const insurance = getShopItem('specialty-uptime-insurance');
    expect(insurance).toBeDefined();
    expect(insurance!.maxPurchases).toBe(3);
  });
});
