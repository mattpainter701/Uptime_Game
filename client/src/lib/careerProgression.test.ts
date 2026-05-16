import { describe, expect, it } from 'vitest';
import {
  CAREER_LEVELS,
  getCareerLevelFromXp,
  getCareerProgression,
  getCareerUnlocksThroughLevel,
  getXpToNextCareerLevel,
} from './careerProgression';

describe('careerProgression', () => {
  it('exposes the 8-level progression ladder with distinct unlocks', () => {
    expect(CAREER_LEVELS).toHaveLength(8);

    const principalEngineer = getCareerProgression(7);
    expect(principalEngineer).toMatchObject({
      level: 7,
      title: 'Principal Engineer',
      floor: 45,
      xpRequired: 20000,
    });
    expect(principalEngineer?.unlocks.map((unlock) => unlock.id)).toEqual([
      'multi-vendor-tickets',
      'custom-tool-presets',
    ]);
  });

  it('returns cumulative unlocks for a given level so UI and game logic can gate features', () => {
    expect(getCareerUnlocksThroughLevel(1).map((unlock) => unlock.id)).toEqual([
      'basic-tickets',
      'single-device-labs',
    ]);

    expect(getCareerUnlocksThroughLevel(4).map((unlock) => unlock.id)).toEqual([
      'basic-tickets',
      'single-device-labs',
      'switching-tickets',
      'serial-console',
      'routing-tickets',
      'ssh-access',
      'security-firewall-tickets',
      'config-diff-tool',
    ]);

    expect(getCareerUnlocksThroughLevel(8).map((unlock) => unlock.id)).toEqual([
      'basic-tickets',
      'single-device-labs',
      'switching-tickets',
      'serial-console',
      'routing-tickets',
      'ssh-access',
      'security-firewall-tickets',
      'config-diff-tool',
      'multi-device-tickets',
      'packet-capture-tool',
      'architecture-tickets',
      'automation-scripts',
      'multi-vendor-tickets',
      'custom-tool-presets',
      'all-career-features',
      'architect-tickets',
    ]);
  });

  it('maps XP to the correct progression tier and next-level threshold', () => {
    expect(getCareerLevelFromXp(0)).toMatchObject({ level: 1, title: 'Help Desk Tech' });
    expect(getCareerLevelFromXp(1499)).toMatchObject({ level: 2, title: 'Junior NetAdmin' });
    expect(getCareerLevelFromXp(35000)).toMatchObject({ level: 8, title: 'CTO' });

    expect(getXpToNextCareerLevel(0)).toBe(500);
    expect(getXpToNextCareerLevel(1499)).toBe(1);
    expect(getXpToNextCareerLevel(35000)).toBe(0);
  });
});
