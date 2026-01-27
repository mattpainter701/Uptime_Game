import { useEffect, useRef, useCallback, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';

const WALK_SPEED = 2.5;
const RUN_SPEED = 5.0;
const ROTATION_SPEED = 3;
const JUMP_FORCE = 6;
const GRAVITY = 18;

// Sit zone - matches the purple ring on the floor (carpet RGB edge)
// Ring is at z=-1.5 with radius ~1.4
const SIT_ZONE = { x: 0, z: -1.5, radius: 1.4 };
const CHAIR_POSITION = { x: 0, z: -1 }; // Where player sits

interface PlayerControllerProps {
  children?: React.ReactNode;
}

export function PlayerController({ children }: PlayerControllerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const playerPosition = useGameStore((state) => state.playerPosition);
  const movement = useGameStore((state) => state.movement);
  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);
  const setMovement = useGameStore((state) => state.setMovement);
  const toggleStand = useGameStore((state) => state.toggleStand);
  const currentView = useGameStore((state) => state.currentView);

  // Use refs for physics values (better for useFrame than useState)
  const velocityY = useRef(0);
  const isJumping = useRef(false);
  const [isRunning, setIsRunning] = useState(false);

  // Handle keyboard input
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only handle movement when in office view
    if (currentView !== 'office') return;

    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        setMovement({ forward: true });
        break;
      case 'KeyS':
      case 'ArrowDown':
        setMovement({ backward: true });
        break;
      case 'KeyA':
      case 'ArrowLeft':
        setMovement({ left: true });
        break;
      case 'KeyD':
      case 'ArrowRight':
        setMovement({ right: true });
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        setIsRunning(true);
        break;
      case 'Space':
        e.preventDefault();
        // Jump if standing, otherwise stand up
        if (playerPosition.pose === 'seated') {
          toggleStand();
        } else if (!isJumping.current) {
          velocityY.current = JUMP_FORCE;
          isJumping.current = true;
        }
        break;
      case 'KeyE':
        // E to sit back down at desk - only works inside purple circle
        if (playerPosition.pose !== 'seated') {
          const distToSitZone = Math.sqrt(
            Math.pow(playerPosition.x - SIT_ZONE.x, 2) +
            Math.pow(playerPosition.z - SIT_ZONE.z, 2)
          );
          if (distToSitZone <= SIT_ZONE.radius) {
            toggleStand(); // Sit down
          }
        }
        break;
    }
  }, [currentView, setMovement, toggleStand, playerPosition.pose]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        setMovement({ forward: false });
        break;
      case 'KeyS':
      case 'ArrowDown':
        setMovement({ backward: false });
        break;
      case 'KeyA':
      case 'ArrowLeft':
        setMovement({ left: false });
        break;
      case 'KeyD':
      case 'ArrowRight':
        setMovement({ right: false });
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        setIsRunning(false);
        break;
    }
  }, [setMovement]);

  // Attach keyboard listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Update player position each frame
  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Only allow movement when standing
    if (playerPosition.pose !== 'standing' && playerPosition.pose !== 'walking') {
      // Keep character at chair when seated (facing the monitors/desk at -Z)
      groupRef.current.position.set(CHAIR_POSITION.x, 0, CHAIR_POSITION.z);
      groupRef.current.rotation.y = Math.PI; // Face -Z direction (toward monitors)
      return;
    }

    let { x, y, z, rotation } = playerPosition;
    let isMoving = false;

    // Apply gravity and jumping
    velocityY.current -= GRAVITY * delta;
    y += velocityY.current * delta;

    // Ground check
    if (y <= 0) {
      y = 0;
      velocityY.current = 0;
      isJumping.current = false;
    }

    // Rotation (turning)
    if (movement.left) {
      rotation += ROTATION_SPEED * delta;
    }
    if (movement.right) {
      rotation -= ROTATION_SPEED * delta;
    }

    // Movement speed (walk vs run)
    const currentSpeed = isRunning ? RUN_SPEED : WALK_SPEED;

    // Movement (forward/backward based on rotation)
    // Character faces forward along -Z when rotation is 0
    if (movement.forward) {
      x += Math.sin(rotation) * currentSpeed * delta;
      z -= Math.cos(rotation) * currentSpeed * delta;
      isMoving = true;
    }
    if (movement.backward) {
      x -= Math.sin(rotation) * currentSpeed * delta * 0.6; // Slower backward
      z += Math.cos(rotation) * currentSpeed * delta * 0.6;
      isMoving = true;
    }

    // Boundary checks (keep player in room)
    x = Math.max(-4, Math.min(4, x));
    z = Math.max(-4, Math.min(4, z));

    // Update store
    setPlayerPosition({
      x,
      y,
      z,
      rotation,
      isMoving,
      pose: isMoving ? 'walking' : 'standing',
    });

    // Update 3D group
    // Add Math.PI to rotation so character faces movement direction
    // (character model faces +Z, but forward movement is -Z)
    groupRef.current.position.set(x, y, z);
    groupRef.current.rotation.y = rotation + Math.PI;

    // Update camera to follow player (third-person)
    const cameraOffset = new THREE.Vector3(0, 2.5, 4);
    cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
    const targetCameraPos = new THREE.Vector3(x + cameraOffset.x, y + cameraOffset.y, z + cameraOffset.z);

    // Smooth camera follow
    camera.position.lerp(targetCameraPos, 5 * delta);
    camera.lookAt(x, y + 1.2, z);
  });

  return (
    <group ref={groupRef} position={[playerPosition.x, 0, playerPosition.z]}>
      {children}
    </group>
  );
}

export default PlayerController;
