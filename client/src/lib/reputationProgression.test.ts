import { describe, expect, it } from 'vitest';
import { getReputationLossForFailure } from './reputationProgression';

describe('reputationProgression', () => {
  it('keeps the baseline failure loss for small incident counts', () => {
    expect(getReputationLossForFailure(0)).toBe(5);
    expect(getReputationLossForFailure(1)).toBe(5);
    expect(getReputationLossForFailure(2)).toBe(5);
  });

  it('scales the failure loss slowly as incidents stack up', () => {
    expect(getReputationLossForFailure(4)).toBe(6);
    expect(getReputationLossForFailure(7)).toBe(7);
    expect(getReputationLossForFailure(10)).toBe(8);
  });

  it('treats negative and fractional counts as zero or the nearest lower incident count', () => {
    expect(getReputationLossForFailure(-3)).toBe(5);
    expect(getReputationLossForFailure(4.9)).toBe(6);
  });
});
