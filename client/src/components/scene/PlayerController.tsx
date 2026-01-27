import { useEffect, useRef, useCallback, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';

const WALK_SPEED = 2.5;
const RUN_SPEED = 5.0;
const ROTATION_SPEED = 3;
const JUMP_FORCE = 6;
const GRAVITY = 18;

// Sit zone - matches the purple ring on the floor
const SIT_ZONE = { x: 0, z: -1.5, radius: 1.4 };
const CHAIR_POSITION = { x: 0, z: -1 };

interface PlayerControllerProps {
  children?: React.ReactNode;
}

export function PlayerController({ children }: PlayerControllerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);
  const setMovement = useGameStore((state) => state.setMovement);
  const toggleStand = useGameStore((state) => state.toggleStand);
  const pose = useGameStore((state) => state.playerPosition.pose);
  const currentView = useGameStore((state) => state.currentView);

  // All physics/position in refs for smooth updates
  // rotation: 0 = facing +Z, PI = facing -Z (toward monitors)
  const posRef = useRef({ x: 0, y: 0, z: -1, rotation: Math.PI });
  const velocityY = useRef(0);
  const isJumping = useRef(false);
  const movementRef = useRef({ forward: false, backward: false, left: false, right: false });
  const isRunningRef = useRef(false);
  const isMovingRef = useRef(false);
  const lastSyncRef = useRef(0);

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
      case 'KeyE':
        if (pose !== 'seated') {
          const { x, z } = posRef.current;
          const dist = Math.sqrt(
            Math.pow(x - SIT_ZONE.x, 2) + Math.pow(z - SIT_ZONE.z, 2)
          );
          if (dist <= SIT_ZONE.radius) {
            toggleStand();
          }
        }
        break;
    }
  }, [currentView, pose, setMovement, toggleStand]);

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

    // Seated: sit at chair facing monitors (-Z direction, rotation = PI)
    if (pose === 'seated') {
      groupRef.current.position.set(CHAIR_POSITION.x, 0, CHAIR_POSITION.z);
      groupRef.current.rotation.y = Math.PI; // Face -Z (monitors)
      posRef.current = { x: CHAIR_POSITION.x, y: 0, z: CHAIR_POSITION.z, rotation: Math.PI };

      // Camera for seated view
      camera.position.lerp(new THREE.Vector3(0, 2.5, 3), 3 * delta);
      camera.lookAt(0, 1.2, -2);
      return;
    }

    const movement = movementRef.current;
    let { x, y, z, rotation } = posRef.current;
    let isMoving = false;

    // Gravity & jumping
    velocityY.current -= GRAVITY * delta;
    y += velocityY.current * delta;
    if (y <= 0) {
      y = 0;
      velocityY.current = 0;
      isJumping.current = false;
    }

    // Turning with A/D
    if (movement.left) rotation += ROTATION_SPEED * delta;
    if (movement.right) rotation -= ROTATION_SPEED * delta;

    const speed = isRunningRef.current ? RUN_SPEED : WALK_SPEED;

    // Movement in facing direction
    // rotation=0 → face +Z → sin(0)=0, cos(0)=1 → move +Z
    // rotation=PI → face -Z → sin(PI)=0, cos(PI)=-1 → move -Z
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

    // Boundary checks
    x = Math.max(-4, Math.min(4, x));
    z = Math.max(-4, Math.min(4, z));

    posRef.current = { x, y, z, rotation };

    // Update 3D transform - rotation directly (no offset)
    // Character model faces +Z, rotation rotates it
    groupRef.current.position.set(x, y, z);
    groupRef.current.rotation.y = rotation;

    // Camera follows behind player
    // Offset is behind the player (-Z in local space), rotated by player rotation
    const behindOffset = new THREE.Vector3(0, 2.5, -4);
    behindOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
    const targetCamPos = new THREE.Vector3(x + behindOffset.x, y + behindOffset.y, z + behindOffset.z);

    camera.position.lerp(targetCamPos, 5 * delta);
    camera.lookAt(x, y + 1.2, z);

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
