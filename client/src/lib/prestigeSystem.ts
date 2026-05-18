// Sprint 7: Prestige System — 10 prestige levels with progressive multipliers
import type { PrestigeLevel, PlayerPrestigeState, ShopItemId } from '../types/game';
import type { ShopItem } from '../types/game';

export const PRESTIGE_LEVELS: PrestigeLevel[] = [
  { level: 1,  name: 'Network Apprentice',   requiredCredits: 5000,   multiplier: 1.15, title: 'Apprentice',    icon: '🔰' },
  { level: 2,  name: 'Network Specialist',    requiredCredits: 10000,  multiplier: 1.30, title: 'Specialist',   icon: '⭐' },
  { level: 3,  name: 'Network Professional',  requiredCredits: 20000,  multiplier: 1.45, title: 'Professional', icon: '🌟' },
  { level: 4,  name: 'Network Expert',        requiredCredits: 40000,  multiplier: 1.60, title: 'Expert',       icon: '💫' },
  { level: 5,  name: 'Network Master',        requiredCredits: 80000,  multiplier: 1.75, title: 'Master',       icon: '👑' },
  { level: 6,  name: 'Network Guru',          requiredCredits: 150000, multiplier: 1.90, title: 'Guru',         icon: '🔮' },
  { level: 7,  name: 'Network Sage',          requiredCredits: 300000, multiplier: 2.05, title: 'Sage',         icon: '🧙' },
  { level: 8,  name: 'Network Legend',        requiredCredits: 600000, multiplier: 2.20, title: 'Legend',       icon: '🏆' },
  { level: 9,  name: 'Network Demigod',       requiredCredits: 1200000, multiplier: 2.35, title: 'Demigod',      icon: '⚡' },
  { level: 10, name: 'Network God',           requiredCredits: 2500000, multiplier: 2.50, title: 'Network God', icon: '👁️' },
];

// Items that persist through prestige reset
const PERSISTED_CATEGORIES = new Set(['office-upgrade', 'certification', 'tool', 'cosmetic']);

export function canPrestige(credits: number, playerLevel: number, currentPrestige: number = 0): { can: boolean; nextLevel: PrestigeLevel | null } {
  // Player must be at least career level 8 to prestige
  if (playerLevel < 8) return { can: false, nextLevel: null };

  const nextIndex = currentPrestige; // 0-indexed: prestige 0 → level 1
  if (nextIndex >= PRESTIGE_LEVELS.length) return { can: false, nextLevel: null };

  const nextLevel = PRESTIGE_LEVELS[nextIndex];
  if (credits >= nextLevel.requiredCredits) {
    return { can: true, nextLevel };
  }

  return { can: false, nextLevel };
}

export function getPrestigeCost(currentPrestige: number): { credits: number; nextLevel: PrestigeLevel } | null {
  const nextIndex = currentPrestige; // 0-indexed: prestige 0 -> level 1
  if (nextIndex >= PRESTIGE_LEVELS.length) return null;
  return { credits: PRESTIGE_LEVELS[nextIndex].requiredCredits, nextLevel: PRESTIGE_LEVELS[nextIndex] };
}

export function computePrestigeMultiplier(prestigeLevel: number): number {
  if (prestigeLevel <= 0) return 1.0;
  const idx = Math.min(prestigeLevel - 1, PRESTIGE_LEVELS.length - 1);
  return PRESTIGE_LEVELS[idx].multiplier;
}

export function getPersistedItems(ownedItems: ShopItemId[], allShopItems: ShopItem[]): ShopItemId[] {
  return ownedItems.filter(id => {
    const item = allShopItems.find(i => i.id === id);
    return item && PERSISTED_CATEGORIES.has(item.category);
  });
}

export function executePrestige(
  currentState: PlayerPrestigeState,
  ownedItems: ShopItemId[],
  allShopItems: ShopItem[],
): { newPrestige: PlayerPrestigeState; persistedItems: ShopItemId[] } {
  const nextLevel = currentState.prestigeLevel + 1;
  const prestigeLevel = PRESTIGE_LEVELS[nextLevel - 1];

  if (!prestigeLevel) {
    throw new Error(`Invalid prestige level: ${nextLevel}`);
  }

  const persistedItems = getPersistedItems(ownedItems, allShopItems);

  return {
    newPrestige: {
      prestigeLevel: nextLevel,
      prestigeMultiplier: prestigeLevel.multiplier,
      persistedUpgrades: persistedItems,
    },
    persistedItems,
  };
}
