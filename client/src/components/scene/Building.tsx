/**
 * Building.tsx - Multi-floor office building with elevator system
 * Sprint 8: Expanded to 8 career-level-gated floors
 *
 * Floors (career-level gated):
 * - Basement:   Player's personal office (level 1+)
 * - Lobby:      Reception + security (level 2+)
 * - Floor 1:    Cubicles, Network Admin (level 3+)
 * - Floor 2:    Cubicles, Senior NetAdmin (level 4+)
 * - Floor 3:    Datacenter (level 5+)
 * - Floor 4:    Engineering lab (level 6+)
 * - Floor 5:    Architecture studio (level 7+)
 * - Penthouse:  Executive suite (level 8)
 */

import { useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { FLOOR_DEFINITIONS } from '../../types/game';
import type { FloorId } from '../../types/game';
import { PlayerOffice } from './floors/PlayerOffice';
import { Lobby } from './floors/Lobby';
import { CubicleFloor } from './floors/CubicleFloor';
import { Datacenter } from './floors/Datacenter';
import { Floor4 } from './floors/Floor4';
import { Floor5 } from './floors/Floor5';
import { PenthouseFloor } from './floors/PenthouseFloor';
import { Character } from './Character';
import { PlayerController } from './PlayerController';
import { InteractiveObjects } from './InteractiveObjects';
import { NPC } from './NPC';
import { WeatherEffects } from './WeatherEffects';

export { FloorId, FLOOR_DEFINITIONS };
export type { FloorInfo } from '../../types/game';

export function Building() {
  const currentFloor = useGameStore((state) => state.currentFloor);
  const openElevator = useGameStore((state) => state.openElevator);
  const playerPosition = useGameStore((state) => state.playerPosition);
  const playerLevel = useGameStore((state) => state.player.level);

  const handleElevatorUse = useCallback(() => {
    openElevator();
  }, [openElevator]);

  // Get interactive objects for current floor
  const interactiveObjects = useGameStore((state) =>
    state.interactiveObjects.filter(o => o.floorId === currentFloor)
  );

  // Get NPCs for current floor
  const floorNpcs = useGameStore((state) =>
    state.npcs.filter(n => n.floorId === currentFloor)
  );

  // Render the current floor based on player's access level
  const renderFloor = () => {
    const floorDef = FLOOR_DEFINITIONS.find(f => f.id === currentFloor);
    if (floorDef && playerLevel < floorDef.requiredLevel) {
      // This shouldn't happen due to elevator gating, but defensive
      return <PlayerOffice onElevatorUse={handleElevatorUse} />;
    }

    switch (currentFloor) {
      case 'basement':
        return <PlayerOffice onElevatorUse={handleElevatorUse} />;
      case 'lobby':
        return <Lobby onElevatorUse={handleElevatorUse} />;
      case 'floor1':
        return <CubicleFloor onElevatorUse={handleElevatorUse} />;
      case 'floor2':
        return <CubicleFloor onElevatorUse={handleElevatorUse} />;
      case 'floor3':
        return <Datacenter onElevatorUse={handleElevatorUse} />;
      case 'floor4':
        return <Floor4 onElevatorUse={handleElevatorUse} />;
      case 'floor5':
        return <Floor5 onElevatorUse={handleElevatorUse} />;
      case 'penthouse':
        return <PenthouseFloor onElevatorUse={handleElevatorUse} />;
      default:
        return <PlayerOffice onElevatorUse={handleElevatorUse} />;
    }
  };

  return (
    <group>
      {/* Current floor environment */}
      {renderFloor()}

      {/* Interactive objects on this floor */}
      {interactiveObjects.map(obj => (
        <InteractiveObjects key={obj.id} object={obj} />
      ))}

      {/* NPCs on this floor */}
      {floorNpcs.map(npc => (
        <NPC key={npc.id} npc={npc} />
      ))}

      {/* Weather effects */}
      <WeatherEffects />

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
