/**
 * Building.tsx - Multi-floor office building with elevator system
 *
 * Floors:
 * - Basement: Player's personal office
 * - Main Floor: Lobby with security
 * - Floor 1: Cubicles + Network closet
 * - Floor 2: Cubicles + Network closet
 * - Floor 3: Datacenter
 */

import { useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { PlayerOffice } from './floors/PlayerOffice';
import { Lobby } from './floors/Lobby';
import { CubicleFloor } from './floors/CubicleFloor';
import { Datacenter } from './floors/Datacenter';
import { Character } from './Character';
import { PlayerController } from './PlayerController';
import type { FloorId } from '../../types/game';

export type { FloorId };

export interface FloorInfo {
  id: FloorId;
  name: string;
  label: string;
}

export const FLOORS: FloorInfo[] = [
  { id: 'basement', name: 'Basement', label: 'B - My Office' },
  { id: 'lobby', name: 'Main Floor', label: 'L - Lobby' },
  { id: 'floor1', name: 'Floor 1', label: '1 - Cubicles' },
  { id: 'floor2', name: 'Floor 2', label: '2 - Cubicles' },
  { id: 'floor3', name: 'Floor 3', label: '3 - Datacenter' },
];

export function Building() {
  const currentFloor = useGameStore((state) => state.currentFloor);
  const openElevator = useGameStore((state) => state.openElevator);
  const playerPosition = useGameStore((state) => state.playerPosition);

  const handleElevatorUse = useCallback(() => {
    openElevator();
  }, [openElevator]);

  // Render the current floor
  const renderFloor = () => {
    switch (currentFloor) {
      case 'basement':
        return <PlayerOffice onElevatorUse={handleElevatorUse} />;
      case 'lobby':
        return <Lobby onElevatorUse={handleElevatorUse} />;
      case 'floor1':
        return <CubicleFloor floorNumber={1} onElevatorUse={handleElevatorUse} />;
      case 'floor2':
        return <CubicleFloor floorNumber={2} onElevatorUse={handleElevatorUse} />;
      case 'floor3':
        return <Datacenter onElevatorUse={handleElevatorUse} />;
      default:
        return <PlayerOffice onElevatorUse={handleElevatorUse} />;
    }
  };

  return (
    <group>
      {/* Current floor environment */}
      {renderFloor()}

      {/* Player Character with Controller */}
      <PlayerController>
        <Character
          pose={playerPosition.pose}
          isMoving={playerPosition.isMoving}
        />
      </PlayerController>
    </group>
  );
}

export default Building;
