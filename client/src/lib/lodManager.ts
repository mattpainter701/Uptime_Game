/**
 * LOD (Level of Detail) Manager for 3D Scene.
 *
 * Computes LOD levels based on camera distance to optimize
 * draw calls and triangle count in the Three.js scene.
 *
 * Budgets (from performance-budgets.json):
 *   - Max draw calls: 2000/frame
 *   - Max triangles: 500,000 at highest LOD
 *   - LOD distances: HIGH=10, MEDIUM=30, LOW=60, CULL=100
 */

export enum LODLevel {
  HIGH = 0,    // Full geometry, all details
  MEDIUM = 1,  // Reduced polygon count
  LOW = 2,     // Simplified geometry
  CULLED = 3,  // Not rendered
}

export interface LODConfig {
  /** Distance thresholds in world units */
  distances: {
    high: number;    // <= this → HIGH LOD
    medium: number;  // <= this → MEDIUM LOD
    low: number;     // <= this → LOW LOD
                     // > low → CULLED
  };
}

const DEFAULT_LOD_CONFIG: LODConfig = {
  distances: {
    high: 10,
    medium: 30,
    low: 60,
  },
};

/**
 * Determine the appropriate LOD level based on distance from camera.
 */
export function computeLODLevel(
  distance: number,
  config: LODConfig = DEFAULT_LOD_CONFIG,
): LODLevel {
  if (distance <= config.distances.high) return LODLevel.HIGH;
  if (distance <= config.distances.medium) return LODLevel.MEDIUM;
  if (distance <= config.distances.low) return LODLevel.LOW;
  return LODLevel.CULLED;
}

/**
 * Compute squared distance between two 3D points (avoids sqrt).
 */
export function distanceSquared(
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
): number {
  const dx = ax - bx;
  const dy = ay - by;
  const dz = az - bz;
  return dx * dx + dy * dy + dz * dz;
}

/**
 * LOD state tracker — prevents unnecessary LOD recomputation.
 * Uses hysteresis: a transition requires crossing a wider band
 * to prevent flickering between levels.
 */
export class LODStateTracker {
  private currentLOD: Map<string, LODLevel> = new Map();
  private hysteresis = 0.15; // 15% band

  /**
   * Get the LOD level for an object, with hysteresis.
   * Returns the new LOD if it changed, or current LOD if within hysteresis band.
   */
  getLOD(
    key: string,
    distance: number,
    config: LODConfig = DEFAULT_LOD_CONFIG,
  ): { level: LODLevel; changed: boolean } {
    const rawLevel = computeLODLevel(distance, config);
    const current = this.currentLOD.get(key);

    // First time seeing this object
    if (current === undefined) {
      this.currentLOD.set(key, rawLevel);
      return { level: rawLevel, changed: true };
    }

    // Same level — no change
    if (current === rawLevel) {
      return { level: current, changed: false };
    }

    // Hysteresis: only change if distance is clearly in new band
    const boundaries = this.getBoundaries(config);
    const transitionBand = boundaries[rawLevel] * this.hysteresis;

    if (rawLevel > current) {
      // Moving farther — require extra distance before downgrading
      if (distance > boundaries[current] + transitionBand) {
        this.currentLOD.set(key, rawLevel);
        return { level: rawLevel, changed: true };
      }
    } else {
      // Moving closer — require getting well within the band before upgrading
      if (distance < boundaries[current] - transitionBand) {
        this.currentLOD.set(key, rawLevel);
        return { level: rawLevel, changed: true };
      }
    }

    return { level: current, changed: false };
  }

  private getBoundaries(config: LODConfig): Record<LODLevel, number> {
    return {
      [LODLevel.HIGH]: config.distances.high,
      [LODLevel.MEDIUM]: config.distances.medium,
      [LODLevel.LOW]: config.distances.low,
      [LODLevel.CULLED]: Infinity,
    };
  }

  /** Reset all tracked LOD states. */
  reset(): void {
    this.currentLOD.clear();
  }
}
