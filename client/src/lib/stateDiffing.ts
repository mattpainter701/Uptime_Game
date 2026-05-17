/**
 * State Diffing Utility — Minimal state patching for Zustand.
 *
 * Instead of replacing entire state objects (which triggers
 * unnecessary React re-renders), we compute the minimal diff
 * and only apply changed keys.
 *
 * This reduces per-frame processing overhead significantly
 * when the game receives frequent uptime/status updates.
 */

export type DiffOp<T> =
  | { type: 'set'; path: string[]; value: unknown }
  | { type: 'delete'; path: string[] }
  | { type: 'merge'; path: string[]; value: Record<string, unknown> };

/**
 * Deep-diff two objects. Returns a minimal set of operations
 * that transform `prev` into `next`.
 */
export function computeDiff(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
  path: string[] = [],
): DiffOp<unknown>[] {
  const ops: DiffOp<unknown>[] = [];
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);

  for (const key of allKeys) {
    const currentPath = [...path, key];
    const prevVal = prev[key];
    const nextVal = next[key];

    // Key removed
    if (!(key in next)) {
      ops.push({ type: 'delete', path: currentPath });
      continue;
    }

    // Key added
    if (!(key in prev)) {
      ops.push({ type: 'set', path: currentPath, value: nextVal });
      continue;
    }

    // Both exist — compare by type
    if (isPrimitive(prevVal) || isPrimitive(nextVal)) {
      if (prevVal !== nextVal) {
        ops.push({ type: 'set', path: currentPath, value: nextVal });
      }
    } else if (Array.isArray(prevVal) && Array.isArray(nextVal)) {
      if (!arraysEqual(prevVal, nextVal)) {
        ops.push({ type: 'set', path: currentPath, value: nextVal });
      }
    } else if (isObject(prevVal) && isObject(nextVal)) {
      // Recursively diff nested objects
      ops.push(...computeDiff(
        prevVal as Record<string, unknown>,
        nextVal as Record<string, unknown>,
        currentPath,
      ));
    } else if (prevVal !== nextVal) {
      ops.push({ type: 'set', path: currentPath, value: nextVal });
    }
  }

  return ops;
}

/**
 * Apply a set of diff operations to a target object (mutates in place).
 * Returns the number of changes applied.
 */
export function applyDiff(
  target: Record<string, unknown>,
  ops: DiffOp<unknown>[],
): number {
  let applied = 0;

  for (const op of ops) {
    switch (op.type) {
      case 'set': {
        setNested(target, op.path, op.value);
        applied++;
        break;
      }
      case 'delete': {
        deleteNested(target, op.path);
        applied++;
        break;
      }
      case 'merge': {
        const existing = getNested(target, op.path);
        if (isObject(existing)) {
          Object.assign(existing as Record<string, unknown>, op.value);
          applied++;
        }
        break;
      }
    }
  }

  return applied;
}

/**
 * Get a value at a nested path.
 */
function getNested(obj: unknown, path: string[]): unknown {
  let current = obj;
  for (const key of path) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Set a value at a nested path.
 */
function setNested(obj: Record<string, unknown>, path: string[], value: unknown): void {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[path[path.length - 1]] = value;
}

/**
 * Delete a value at a nested path.
 */
function deleteNested(obj: Record<string, unknown>, path: string[]): void {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!(key in current)) return;
    current = current[key] as Record<string, unknown>;
  }
  delete current[path[path.length - 1]];
}

// -- Helpers --

function isPrimitive(value: unknown): boolean {
  return value === null || value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function arraysEqual(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}
