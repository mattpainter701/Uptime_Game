import { useEffect, useRef, useCallback, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { findNearestZone } from '../../data/interactionZones';
import type { InteractionZone, GameView } from '../../types/game';

const WALK_SPEED = 2.5;
const RUN_SPEED = 5.0;
const ROTATION_SPEED = 3;
const JUMP_FORCE = 6;
const GRAVITY = 18;

// Sit zone - matches the purple ring on the floor
const SIT_ZONES: Record<string, { x: number; z: number; radius: number }> = {
  basement: { x: 0, z: -1.5, radius: 1.4 },
};
const CHAIR_POSITIONS: Record<string, { x: number; z: number }> = {
  basement: { x: 0, z: -1.15 },
};

interface PlayerControllerProps {
  children?: React.ReactNode;
}

export function PlayerController({ children }: PlayerControllerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);
  const setMovement = useGameStore((state) => state.setMovement);
  const toggleStand = useGameStore((state) => state.toggleStand);
  const setView = useGameStore((state) => state.setView);
  const triggerInteraction = useGameStore((state) => state.triggerInteraction);
  const setNearestInteraction = useGameStore((state) => state.setNearestInteraction);
  const pose = useGameStore((state) => state.playerPosition.pose);
  const currentView = useGameStore((state) => state.currentView);
  const currentFloor = useGameStore((state) => state.currentFloor);

  // Floor boundaries - different floors have different sizes
  const getFloorBounds = () => {
    switch (currentFloor) {
      case 'floor3': // Datacenter is larger
        return { minX: -11, maxX: 11, minZ: -9, maxZ: 9 };
      case 'floor1':
      case 'floor2': // Cubicle floors
        return { minX: -9, maxX: 9, minZ: -9, maxZ: 9 };
      case 'lobby':
        return { minX: -6, maxX: 6, minZ: -4, maxZ: 6 };
      default: // basement/office
        return { minX: -4, maxX: 4, minZ: -4, maxZ: 4 };
    }
  };

  // All physics/position in refs for smooth updates
  const posRef = useRef({ x: 0, y: 0.75, z: -1, rotation: Math.PI });
  const velocityY = useRef(0);
  const isJumping = useRef(false);
  const movementRef = useRef({ forward: false, backward: false, left: false, right: false });
  const isRunningRef = useRef(false);
  const isMovingRef = useRef(false);
  const lastSyncRef = useRef(0);
  const nearestZoneRef = useRef<InteractionZone | null>(null);

  const [, forceUpdate] = useState(0);

  // Keyboard handlers
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (currentView !== 'office') return;

    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        movementRef.current.forward = true;
        setMovement({ forward: true });
        break;
      case 'KeyS':
      case 'ArrowDown':
        movementRef.current.backward = true;
        setMovement({ backward: true });
        break;
      case 'KeyA':
      case 'ArrowLeft':
        movementRef.current.left = true;
        setMovement({ left: true });
        break;
      case 'KeyD':
      case 'ArrowRight':
        movementRef.current.right = true;
        setMovement({ right: true });
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        isRunningRef.current = true;
        break;
      case 'Space':
        e.preventDefault();
        if (pose === 'seated') {
          toggleStand();
        } else if (!isJumping.current) {
          velocityY.current = JUMP_FORCE;
          isJumping.current = true;
        }
        break;
      case 'KeyE': {
        // Sit/stand at chairs
        const sitZone = SIT_ZONES[currentFloor];
        if (pose !== 'seated' && sitZone) {
          const { x, z } = posRef.current;
          const dist = Math.sqrt(
            Math.pow(x - sitZone.x, 2) + Math.pow(z - sitZone.z, 2)
          );
          if (dist <= sitZone.radius) {
            toggleStand();
          }
        }
        break;
      }
      case 'KeyF': {
        // Generalized interaction - find nearest zone on current floor
        const zone = nearestZoneRef.current;
        if (zone) {
          triggerInteraction(zone);
        }
        break;
      }
    }
  }, [currentView, pose, setMovement, toggleStand, setView, currentFloor, triggerInteraction]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        movementRef.current.forward = false;
        setMovement({ forward: false });
        break;
      case 'KeyS':
      case 'ArrowDown':
        movementRef.current.backward = false;
        setMovement({ backward: false });
        break;
      case 'KeyA':
      case 'ArrowLeft':
        movementRef.current.left = false;
        setMovement({ left: false });
        break;
      case 'KeyD':
      case 'ArrowRight':
        movementRef.current.right = false;
        setMovement({ right: false });
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        isRunningRef.current = false;
        break;
    }
  }, [setMovement]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Seated: sit at chair facing monitors
    const chairPos = CHAIR_POSITIONS[currentFloor];
    if (pose === 'seated' && chairPos) {
      const SEATED_Y = 0.48;
      groupRef.current.position.set(chairPos.x, SEATED_Y, chairPos.z);
      groupRef.current.rotation.y = Math.PI;
      posRef.current = { x: chairPos.x, y: SEATED_Y, z: chairPos.z, rotation: Math.PI };

      camera.position.lerp(new THREE.Vector3(0, 2.5, 3), 3 * delta);
      camera.lookAt(0, 1.2, -2);

      // Still check for nearby interactions when seated (e.g., computer)
      const zone = findNearestZone(chairPos.x, chairPos.z, currentFloor);
      if (zone !== nearestZoneRef.current) {
        nearestZoneRef.current = zone;
        setNearestInteraction(zone);
      }
      return;
    }

    const movement = movementRef.current;
    let { x, y, z, rotation } = posRef.current;
    let isMoving = false;

    // Gravity & jumping
    const FLOOR_LEVEL = 0.75;
    velocityY.current -= GRAVITY * delta;
    y += velocityY.current * delta;
    if (y <= FLOOR_LEVEL) {
      y = FLOOR_LEVEL;
      velocityY.current = 0;
      isJumping.current = false;
    }

    // Turning with A/D
    if (movement.left) rotation += ROTATION_SPEED * delta;
    if (movement.right) rotation -= ROTATION_SPEED * delta;

    const speed = isRunningRef.current ? RUN_SPEED : WALK_SPEED;

    // Movement in facing direction
    if (movement.forward) {
      x += Math.sin(rotation) * speed * delta;
      z += Math.cos(rotation) * speed * delta;
      isMoving = true;
    }
    if (movement.backward) {
      x -= Math.sin(rotation) * speed * delta * 0.6;
      z -= Math.cos(rotation) * speed * delta * 0.6;
      isMoving = true;
    }

    // Boundary checks based on current floor
    const bounds = getFloorBounds();
    x = Math.max(bounds.minX, Math.min(bounds.maxX, x));
    z = Math.max(bounds.minZ, Math.min(bounds.maxZ, z));

    posRef.current = { x, y, z, rotation };

    groupRef.current.position.set(x, y, z);
    groupRef.current.rotation.y = rotation;

    // Camera follows behind player
    const behindOffset = new THREE.Vector3(0, 2.5, -4);
    behindOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
    const targetCamPos = new THREE.Vector3(x + behindOffset.x, y + behindOffset.y, z + behindOffset.z);

    camera.position.lerp(targetCamPos, 5 * delta);
    camera.lookAt(x, y + 1.2, z);

    // Check for nearby interaction zones
    const zone = findNearestZone(x, z, currentFloor);
    if (zone !== nearestZoneRef.current) {
      nearestZoneRef.current = zone;
      setNearestInteraction(zone);
    }

    // Sync to store periodically
    const now = performance.now();
    if (now - lastSyncRef.current > 100) {
      lastSyncRef.current = now;
      const newPose = isMoving ? 'walking' : 'standing';
      setPlayerPosition({ x, y, z, rotation, isMoving, pose: newPose });

      if (isMoving !== isMovingRef.current) {
        isMovingRef.current = isMoving;
        forceUpdate(n => n + 1);
      }
    }
  });

  return (
    <group ref={groupRef}>
      {children}
    </group>
  );
}

export default PlayerController;
