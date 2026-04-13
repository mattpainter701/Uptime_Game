import type { InteractionZone, FloorId } from '../types/game';

/**
 * Central registry of all interaction zones per floor.
 * Each zone defines a position, radius, and what happens when the player presses F.
 */

const BASEMENT_ZONES: InteractionZone[] = [
  {
    id: 'basement-computer',
    position: { x: 0, z: -1.7 },
    radius: 2.0,
    label: 'Use Computer',
    icon: '💻',
    action: 'terminal',
    floor: 'basement',
  },
  {
    id: 'basement-bookshelf',
    position: { x: -4.5, z: 3 },
    radius: 1.5,
    label: 'Knowledge Base',
    icon: '📚',
    action: 'knowledge-base',
    floor: 'basement',
  },
  {
    id: 'basement-whiteboard',
    position: { x: -4.88, z: -1 },
    radius: 1.5,
    label: 'Whiteboard',
    icon: '📝',
    action: 'whiteboard',
    floor: 'basement',
  },
];

const LOBBY_ZONES: InteractionZone[] = [
  {
    id: 'lobby-receptionist',
    position: { x: 0, z: -1.5 },
    radius: 2.0,
    label: 'Talk to Dana',
    icon: '💬',
    action: 'dialogue',
    floor: 'lobby',
    npcId: 'dana',
  },
  {
    id: 'lobby-security',
    position: { x: -4.85, z: -2 },
    radius: 1.5,
    label: 'Talk to Chen',
    icon: '💬',
    action: 'dialogue',
    floor: 'lobby',
    npcId: 'chen',
  },
];

const FLOOR1_ZONES: InteractionZone[] = [
  {
    id: 'floor1-network-closet',
    position: { x: 6, z: -6 },
    radius: 2.0,
    label: 'Network Closet',
    icon: '🔌',
    action: 'network-closet',
    floor: 'floor1',
  },
  {
    id: 'floor1-marcus',
    position: { x: -6, z: 2 },
    radius: 1.5,
    label: 'Talk to Marcus',
    icon: '💬',
    action: 'dialogue',
    floor: 'floor1',
    npcId: 'marcus',
  },
];

const FLOOR2_ZONES: InteractionZone[] = [
  {
    id: 'floor2-network-closet',
    position: { x: 6, z: -6 },
    radius: 2.0,
    label: 'Network Closet',
    icon: '🔌',
    action: 'network-closet',
    floor: 'floor2',
  },
  {
    id: 'floor2-priya',
    position: { x: -6, z: 2 },
    radius: 1.5,
    label: 'Talk to Priya',
    icon: '💬',
    action: 'dialogue',
    floor: 'floor2',
    npcId: 'priya',
  },
];

const FLOOR3_ZONES: InteractionZone[] = [
  {
    id: 'floor3-server-rack',
    position: { x: -4, z: -4 },
    radius: 2.0,
    label: 'Server Rack',
    icon: '🖥️',
    action: 'server-rack',
    floor: 'floor3',
  },
  {
    id: 'floor3-console',
    position: { x: 10, z: -6 },
    radius: 1.5,
    label: 'Console Terminal',
    icon: '💻',
    action: 'terminal',
    floor: 'floor3',
  },
  {
    id: 'floor3-alex',
    position: { x: -10, z: 2 },
    radius: 1.5,
    label: 'Talk to Alex',
    icon: '💬',
    action: 'dialogue',
    floor: 'floor3',
    npcId: 'alex',
  },
];

export const INTERACTION_ZONES: Record<FloorId, InteractionZone[]> = {
  basement: BASEMENT_ZONES,
  lobby: LOBBY_ZONES,
  floor1: FLOOR1_ZONES,
  floor2: FLOOR2_ZONES,
  floor3: FLOOR3_ZONES,
};

/**
 * Find the nearest interaction zone to a position on a given floor.
 * Returns null if no zone is within range.
 */
export function findNearestZone(
  x: number,
  z: number,
  floor: FloorId,
): InteractionZone | null {
  const zones = INTERACTION_ZONES[floor] || [];
  let nearest: InteractionZone | null = null;
  let nearestDist = Infinity;

  for (const zone of zones) {
    const dx = x - zone.position.x;
    const dz = z - zone.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist <= zone.radius && dist < nearestDist) {
      nearest = zone;
      nearestDist = dist;
    }
  }

  return nearest;
}
