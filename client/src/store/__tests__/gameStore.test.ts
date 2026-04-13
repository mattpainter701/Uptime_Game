import { describe, it, expect, beforeEach } from 'vitest';
import { getXpToNextLevel, getLevelFromXp, useGameStore } from '../gameStore';
import type { ItemId } from '../../types/game';

describe('getXpToNextLevel', () => {
  it('returns 500 for a new player with 0 XP', () => {
    expect(getXpToNextLevel(0)).toBe(500);
  });

  it('returns remaining XP needed at level 1', () => {
    expect(getXpToNextLevel(200)).toBe(300); // 500 - 200
  });

  it('returns XP needed for level 3 when at level 2 boundary', () => {
    expect(getXpToNextLevel(500)).toBe(1000); // 1500 - 500
  });

  it('returns correct amount mid-level', () => {
    expect(getXpToNextLevel(1000)).toBe(500); // 1500 - 1000
  });

  it('returns 0 at max level (CTO)', () => {
    expect(getXpToNextLevel(35000)).toBe(0);
  });

  it('returns 0 when XP exceeds max level', () => {
    expect(getXpToNextLevel(99999)).toBe(0);
  });

  it('returns 500 for negative XP (edge case)', () => {
    expect(getXpToNextLevel(-1)).toBe(500);
  });
});

describe('getLevelFromXp', () => {
  it('returns level 1 for 0 XP', () => {
    const result = getLevelFromXp(0);
    expect(result.level).toBe(1);
    expect(result.title).toBe('Help Desk Tech');
    expect(result.floor).toBe(5);
  });

  it('returns level 2 at exactly 500 XP', () => {
    const result = getLevelFromXp(500);
    expect(result.level).toBe(2);
    expect(result.title).toBe('Junior NetAdmin');
    expect(result.floor).toBe(10);
  });

  it('stays level 1 at 499 XP', () => {
    expect(getLevelFromXp(499).level).toBe(1);
  });

  it('returns level 8 (CTO) at 35000 XP', () => {
    const result = getLevelFromXp(35000);
    expect(result.level).toBe(8);
    expect(result.title).toBe('CTO');
    expect(result.floor).toBe(50);
  });

  it('returns max level for very high XP', () => {
    expect(getLevelFromXp(100000).level).toBe(8);
  });

  it('returns level 1 for negative XP', () => {
    expect(getLevelFromXp(-10).level).toBe(1);
  });

  it('returns correct level at each boundary', () => {
    const boundaries = [
      { xp: 0, level: 1 },
      { xp: 500, level: 2 },
      { xp: 1500, level: 3 },
      { xp: 3500, level: 4 },
      { xp: 7000, level: 5 },
      { xp: 12000, level: 6 },
      { xp: 20000, level: 7 },
      { xp: 35000, level: 8 },
    ];
    for (const { xp, level } of boundaries) {
      expect(getLevelFromXp(xp).level).toBe(level);
    }
  });
});

describe('useGameStore - player actions', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useGameStore.setState({
      player: {
        id: 'player-1',
        name: 'NetAdmin',
        level: 1,
        title: 'Help Desk Tech',
        floor: 5,
        credits: 500,
        reputation: 0,
        xp: 0,
        xpToNextLevel: 500,
      },
      inventory: {
        'laptop': 0,
        'console-cable': 0,
        'patch-cable': 0,
        'fiber-module': 0,
        'ssd': 0,
        'usb-drive': 0,
        'crimping-tool': 0,
      },
    });
  });

  it('addCredits increases player credits', () => {
    useGameStore.getState().addCredits(100);
    expect(useGameStore.getState().player.credits).toBe(600);
  });

  it('addCredits handles negative values', () => {
    useGameStore.getState().addCredits(-100);
    expect(useGameStore.getState().player.credits).toBe(400);
  });

  it('addXp increases XP and auto-levels up', () => {
    useGameStore.getState().addXp(500);
    const player = useGameStore.getState().player;
    expect(player.xp).toBe(500);
    expect(player.level).toBe(2);
    expect(player.title).toBe('Junior NetAdmin');
  });

  it('addXp recalculates xpToNextLevel', () => {
    useGameStore.getState().addXp(200);
    expect(useGameStore.getState().player.xpToNextLevel).toBe(300);
  });

  it('addReputation increases reputation', () => {
    useGameStore.getState().addReputation(10);
    expect(useGameStore.getState().player.reputation).toBe(10);
  });

  it('addReputation clamps at 0 (no negative reputation)', () => {
    useGameStore.getState().addReputation(-10);
    expect(useGameStore.getState().player.reputation).toBe(0);
  });
});

describe('useGameStore - inventory actions', () => {
  beforeEach(() => {
    useGameStore.setState({
      inventory: {
        'laptop': 0,
        'console-cable': 0,
        'patch-cable': 0,
        'fiber-module': 0,
        'ssd': 0,
        'usb-drive': 0,
        'crimping-tool': 0,
      },
    });
  });

  it('collectItem adds an item', () => {
    const result = useGameStore.getState().collectItem('laptop');
    expect(result).toBe(true);
    expect(useGameStore.getState().getItemCount('laptop')).toBe(1);
  });

  it('collectItem respects maxStack', () => {
    useGameStore.getState().collectItem('laptop'); // maxStack is 1
    const result = useGameStore.getState().collectItem('laptop');
    expect(result).toBe(false);
    expect(useGameStore.getState().getItemCount('laptop')).toBe(1);
  });

  it('collectItem allows stacking up to maxStack for consumables', () => {
    // patch-cable has maxStack 5
    for (let i = 0; i < 5; i++) {
      expect(useGameStore.getState().collectItem('patch-cable')).toBe(true);
    }
    expect(useGameStore.getState().getItemCount('patch-cable')).toBe(5);
    expect(useGameStore.getState().collectItem('patch-cable')).toBe(false);
  });

  it('useItem decrements consumable items', () => {
    useGameStore.getState().collectItem('patch-cable');
    useGameStore.getState().collectItem('patch-cable');
    const result = useGameStore.getState().useItem('patch-cable');
    expect(result).toBe(true);
    expect(useGameStore.getState().getItemCount('patch-cable')).toBe(1);
  });

  it('useItem does not decrement non-consumable items', () => {
    useGameStore.getState().collectItem('laptop');
    useGameStore.getState().useItem('laptop');
    expect(useGameStore.getState().getItemCount('laptop')).toBe(1);
  });

  it('useItem returns false when item not available', () => {
    expect(useGameStore.getState().useItem('laptop')).toBe(false);
  });

  it('hasItem returns true when item exists', () => {
    useGameStore.getState().collectItem('laptop');
    expect(useGameStore.getState().hasItem('laptop')).toBe(true);
  });

  it('hasItem returns false when item missing', () => {
    expect(useGameStore.getState().hasItem('laptop')).toBe(false);
  });

  it('hasRequiredItems checks multiple items', () => {
    useGameStore.getState().collectItem('laptop');
    useGameStore.getState().collectItem('console-cable');
    expect(useGameStore.getState().hasRequiredItems(['laptop', 'console-cable'] as ItemId[])).toBe(true);
    expect(useGameStore.getState().hasRequiredItems(['laptop', 'patch-cable'] as ItemId[])).toBe(false);
  });
});

describe('useGameStore - view actions', () => {
  it('setView changes the current view', () => {
    useGameStore.getState().setView('terminal');
    expect(useGameStore.getState().currentView).toBe('terminal');
  });

  it('setView to shop', () => {
    useGameStore.getState().setView('shop');
    expect(useGameStore.getState().currentView).toBe('shop');
  });
});

describe('useGameStore - hint reveal', () => {
  beforeEach(() => {
    useGameStore.setState({
      player: {
        id: 'player-1',
        name: 'NetAdmin',
        level: 1,
        title: 'Help Desk Tech',
        floor: 5,
        credits: 500,
        reputation: 0,
        xp: 0,
        xpToNextLevel: 500,
      },
      activeTicket: {
        id: 'TEST-001',
        title: 'Test Ticket',
        description: 'A test ticket',
        category: 'network-basics',
        difficulty: 1,
        timeLimit: 10,
        rewardCredits: 100,
        rewardXp: 50,
        labTemplate: 'test',
        hints: [
          { cost: 20, text: 'Hint 1', revealed: false },
          { cost: 40, text: 'Hint 2', revealed: false },
        ],
        validation: [],
        status: 'active',
      },
    });
  });

  it('revealHint reveals the hint and deducts credits', () => {
    useGameStore.getState().revealHint(0);
    const state = useGameStore.getState();
    expect(state.activeTicket?.hints[0].revealed).toBe(true);
    expect(state.player.credits).toBe(480); // 500 - 20
  });

  it('revealHint does nothing if already revealed', () => {
    useGameStore.getState().revealHint(0);
    useGameStore.getState().revealHint(0); // try again
    expect(useGameStore.getState().player.credits).toBe(480); // only deducted once
  });

  it('revealHint does nothing if player cannot afford it', () => {
    useGameStore.setState((state) => ({
      player: { ...state.player, credits: 10 },
    }));
    useGameStore.getState().revealHint(0); // costs 20
    expect(useGameStore.getState().activeTicket?.hints[0].revealed).toBe(false);
    expect(useGameStore.getState().player.credits).toBe(10);
  });
});
