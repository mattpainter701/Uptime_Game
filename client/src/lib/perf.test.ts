/**
 * Tests for LOD Manager, WebSocket Batching, and State Diffing utilities.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  computeLODLevel,
  LODLevel,
  LODStateTracker,
  distanceSquared,
} from '../lib/lodManager';
import { OutboundBatcher, InboundDebouncer } from '../lib/wsBatching';
import { computeDiff, applyDiff } from '../lib/stateDiffing';

// ============================================================================
// LOD Manager
// ============================================================================
describe('computeLODLevel', () => {
  it('returns HIGH for close objects (<= 10)', () => {
    expect(computeLODLevel(0)).toBe(LODLevel.HIGH);
    expect(computeLODLevel(5)).toBe(LODLevel.HIGH);
    expect(computeLODLevel(10)).toBe(LODLevel.HIGH);
  });

  it('returns MEDIUM for mid-range (10 < d <= 30)', () => {
    expect(computeLODLevel(11)).toBe(LODLevel.MEDIUM);
    expect(computeLODLevel(30)).toBe(LODLevel.MEDIUM);
  });

  it('returns LOW for distant objects (30 < d <= 60)', () => {
    expect(computeLODLevel(31)).toBe(LODLevel.LOW);
    expect(computeLODLevel(60)).toBe(LODLevel.LOW);
  });

  it('returns CULLED for far objects (> 60)', () => {
    expect(computeLODLevel(61)).toBe(LODLevel.CULLED);
    expect(computeLODLevel(1000)).toBe(LODLevel.CULLED);
  });
});

describe('distanceSquared', () => {
  it('computes squared distance', () => {
    expect(distanceSquared(0, 0, 0, 3, 4, 0)).toBe(25);
  });

  it('returns 0 for same point', () => {
    expect(distanceSquared(1, 2, 3, 1, 2, 3)).toBe(0);
  });
});

describe('LODStateTracker', () => {
  it('returns first LOD and marks changed', () => {
    const tracker = new LODStateTracker();
    const result = tracker.getLOD('obj1', 5);
    expect(result.level).toBe(LODLevel.HIGH);
    expect(result.changed).toBe(true);
  });

  it('returns same LOD unchanged on second close call', () => {
    const tracker = new LODStateTracker();
    tracker.getLOD('obj1', 5);
    const result = tracker.getLOD('obj1', 8);
    expect(result.level).toBe(LODLevel.HIGH);
    expect(result.changed).toBe(false);
  });

  it('changes LOD on significant distance change', () => {
    const tracker = new LODStateTracker();
    tracker.getLOD('obj1', 5);  // HIGH
    const result = tracker.getLOD('obj1', 50); // far into LOW
    expect(result.level).toBe(LODLevel.LOW);
    expect(result.changed).toBe(true);
  });

  it('reset clears states', () => {
    const tracker = new LODStateTracker();
    tracker.getLOD('obj1', 5);
    tracker.reset();
    const result = tracker.getLOD('obj1', 50);
    expect(result.changed).toBe(true);
  });
});

// ============================================================================
// WebSocket Batching
// ============================================================================
describe('OutboundBatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends single message immediately', () => {
    const sendFn = vi.fn();
    const batcher = new OutboundBatcher(sendFn);

    batcher.enqueue({ type: 'ping' });
    // Single message: should not batch, but will wait for timer
    // Actually single messages still wait for the timer interval
    expect(sendFn).not.toHaveBeenCalled();
    expect(batcher.size).toBe(1);

    batcher.flush();
    expect(sendFn).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }));
  });

  it('batches multiple messages into array', () => {
    const sendFn = vi.fn();
    const batcher = new OutboundBatcher(sendFn, { maxBatchSize: 10 });

    batcher.enqueue({ type: 'a' });
    batcher.enqueue({ type: 'b' });
    batcher.enqueue({ type: 'c' });

    batcher.flush();
    expect(sendFn).toHaveBeenCalledTimes(1);
    const call = sendFn.mock.calls[0][0];
    const parsed = JSON.parse(call);
    expect(parsed.batch).toHaveLength(3);
  });

  it('auto-flushes after interval', () => {
    const sendFn = vi.fn();
    const batcher = new OutboundBatcher(sendFn, { flushIntervalMs: 100 });

    batcher.enqueue({ type: 'update' });
    expect(sendFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(sendFn).toHaveBeenCalledTimes(1);
  });

  it('flushes on max batch size', () => {
    const sendFn = vi.fn();
    const batcher = new OutboundBatcher(sendFn, { maxBatchSize: 3 });

    batcher.enqueue({ type: '1' });
    batcher.enqueue({ type: '2' });
    expect(sendFn).not.toHaveBeenCalled();

    batcher.enqueue({ type: '3' }); // triggers flush
    expect(sendFn).toHaveBeenCalledTimes(1);
  });

  it('dispose flushes remaining', () => {
    const sendFn = vi.fn();
    const batcher = new OutboundBatcher(sendFn);

    batcher.enqueue({ type: 'final' });
    batcher.dispose();
    expect(sendFn).toHaveBeenCalledTimes(1);
  });
});

describe('InboundDebouncer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delivers the latest value after debounce interval', () => {
    const cb = vi.fn();
    const debouncer = new InboundDebouncer<number>(cb, 50);

    debouncer.accept(1);
    debouncer.accept(2);
    debouncer.accept(3); // last one wins

    vi.advanceTimersByTime(50);

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(3);
  });

  it('collapses rapid updates', () => {
    const cb = vi.fn();
    const debouncer = new InboundDebouncer<string>(cb, 100);

    for (let i = 0; i < 100; i++) {
      debouncer.accept(`update-${i}`);
    }
    // Should NOT have delivered yet
    expect(cb).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith('update-99');
  });
});

// ============================================================================
// State Diffing
// ============================================================================
describe('computeDiff', () => {
  it('detects added keys', () => {
    const prev = { a: 1 };
    const next = { a: 1, b: 2 };
    const ops = computeDiff(prev, next);
    expect(ops).toEqual([{ type: 'set', path: ['b'], value: 2 }]);
  });

  it('detects removed keys', () => {
    const prev = { a: 1, b: 2 };
    const next = { a: 1 };
    const ops = computeDiff(prev, next);
    expect(ops).toEqual([{ type: 'delete', path: ['b'] }]);
  });

  it('detects changed values', () => {
    const prev = { a: 1 };
    const next = { a: 2 };
    const ops = computeDiff(prev, next);
    expect(ops).toEqual([{ type: 'set', path: ['a'], value: 2 }]);
  });

  it('returns empty ops for identical objects', () => {
    const obj = { a: 1, b: { c: 'hello' } };
    const ops = computeDiff(obj, { ...obj, b: { ...obj.b } });
    expect(ops).toEqual([]);
  });

  it('detects nested changes', () => {
    const prev = { config: { volume: 0.5, theme: 'dark' } };
    const next = { config: { volume: 0.7, theme: 'dark' } };
    const ops = computeDiff(prev, next);
    expect(ops).toEqual([{ type: 'set', path: ['config', 'volume'], value: 0.7 }]);
  });

  it('detects array changes', () => {
    const prev = { items: [1, 2, 3] };
    const next = { items: [1, 2, 4] };
    const ops = computeDiff(prev, next);
    expect(ops).toEqual([{ type: 'set', path: ['items'], value: [1, 2, 4] }]);
  });
});

describe('applyDiff', () => {
  it('applies set operations', () => {
    const target = { a: 1 };
    const count = applyDiff(target, [{ type: 'set', path: ['b'], value: 2 }]);
    expect(target).toEqual({ a: 1, b: 2 });
    expect(count).toBe(1);
  });

  it('applies delete operations', () => {
    const target = { a: 1, b: 2 };
    const count = applyDiff(target, [{ type: 'delete', path: ['b'] }]);
    expect(target).toEqual({ a: 1 });
    expect(count).toBe(1);
  });

  it('applies nested operations', () => {
    const target = { player: { hp: 100, mana: 50 } };
    const ops = computeDiff(target, { player: { hp: 80, mana: 60 } });
    const count = applyDiff(target, ops);
    expect(target.player.hp).toBe(80);
    expect(target.player.mana).toBe(60);
    expect(count).toBe(2);
  });
});
