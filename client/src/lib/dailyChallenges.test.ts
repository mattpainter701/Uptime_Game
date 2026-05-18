// Sprint 7: Daily Challenges Tests
import { describe, expect, it } from 'vitest';
import { generateDailyChallenges, getOrGenerateChallenges } from './dailyChallenges';

describe('dailyChallenges', () => {
  it('generates exactly 3 challenges per day', () => {
    const state = generateDailyChallenges();
    expect(state.challenges.length).toBe(3);
  });

  it('uses current UTC date string', () => {
    const state = generateDailyChallenges();
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    expect(state.date).toMatch(dateRegex);
  });

  it('each challenge has valid structure', () => {
    const state = generateDailyChallenges();
    for (const challenge of state.challenges) {
      expect(challenge.id).toBeTruthy();
      expect(challenge.type).toBeTruthy();
      expect(challenge.description).toBeTruthy();
      expect(challenge.target).toBeGreaterThan(0);
      expect(challenge.rewardCredits).toBeGreaterThan(0);
      expect(challenge.rewardXp).toBeGreaterThan(0);
      expect(challenge.progress).toBe(0);
      expect(challenge.completed).toBe(false);
      expect(challenge.claimed).toBe(false);
    }
  });

  it('returns same challenges for same day (deterministic)', () => {
    const state1 = generateDailyChallenges();
    const state2 = generateDailyChallenges();
    expect(state1.date).toBe(state2.date);
    expect(state1.challenges.map(c => c.id)).toEqual(state2.challenges.map(c => c.id));
    expect(state1.challenges.map(c => c.type)).toEqual(state2.challenges.map(c => c.type));
    expect(state1.challenges.map(c => c.target)).toEqual(state2.challenges.map(c => c.target));
  });

  it('challenges have unique types', () => {
    const state = generateDailyChallenges();
    const types = state.challenges.map(c => c.type);
    expect(new Set(types).size).toBe(3); // All 3 different
  });

  it('getOrGenerateChallenges returns existing state for same day', () => {
    const state = generateDailyChallenges();
    const result = getOrGenerateChallenges(state);
    expect(result).toBe(state); // Same reference
  });

  it('getOrGenerateChallenges regenerates if date changed', () => {
    const oldState = {
      date: '2020-01-01',
      challenges: [{ id: 'old', type: 'earn_xp' as const, description: 'test', target: 1, rewardCredits: 10, rewardXp: 5, progress: 0, completed: false, claimed: false }],
      lastGenerated: 1000,
    };
    const result = getOrGenerateChallenges(oldState);
    expect(result).not.toBe(oldState);
    expect(result.date).not.toBe('2020-01-01');
  });

  it('getOrGenerateChallenges returns new state for null input', () => {
    const result = getOrGenerateChallenges(null);
    expect(result.challenges.length).toBe(3);
  });

  it('target values are within expected ranges', () => {
    const state = generateDailyChallenges();
    for (const challenge of state.challenges) {
      switch (challenge.type) {
        case 'complete_tickets':
          expect(challenge.target).toBeGreaterThanOrEqual(1);
          expect(challenge.target).toBeLessThanOrEqual(5);
          break;
        case 'reach_uptime':
          expect(challenge.target).toBeGreaterThanOrEqual(90);
          expect(challenge.target).toBeLessThanOrEqual(100);
          break;
        case 'earn_credits':
          expect(challenge.target).toBeGreaterThanOrEqual(200);
          expect(challenge.target).toBeLessThanOrEqual(2000);
          break;
        default:
          expect(challenge.target).toBeGreaterThan(0);
      }
    }
  });
});
