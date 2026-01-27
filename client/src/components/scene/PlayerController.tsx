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
const SIT_ZONE = { x: 0, z: -1.5, radius: 1.4 };
const CHAIR_POSITION = { x: 0, z: -1 };

interface PlayerControllerProps {
  children?: React.ReactNode;
}

export function PlayerController({ children }: PlayerControllerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  // Get store actions (these don't cause re-renders)
  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);
  const setMovement = useGameStore((state) => state.setMovement);
  const toggleStand = useGameStore((state) => state.toggleStand);

  // Subscribe to specific values we need reactively
  const pose = useGameStore((state) => state.playerPosition.pose);
  const currentView = useGameStore((state) => state.currentView);

  // Use refs for all real-time physics/movement (avoids React re-renders)
  const posRef = useRef({ x: 0, y: 0, z: -1, rotation: 0 });
  const velocityY = useRef(0);
  const isJumping = useRef(false);
  const movementRef = useRef({ forward: false, backward: false, left: false, right: false });
  const isRunningRef = useRef(false);
  const isMovingRef = useRef(false);

  // For triggering pose updates only when needed
  const [, forceUpdate] = useState(0);

  // Sync initial position from store on mount
  useEffect(() => {
    const state = useGameStore.getState();
    posRef.current = {
      x: state.playerPosition.x,
      y: state.playerPosition.y,
      z: state.playerPosition.z,
      rotation: state.playerPosition.rotation,
    };
  }, []);

  // Handle keyboard input
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

  // Track last store sync time
  const lastSyncRef = useRef(0);

  // Main game loop
  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // When seated, position at chair
    if (pose === 'seated') {
      groupRef.current.position.set(CHAIR_POSITION.x, 0, CHAIR_POSITION.z);
      groupRef.current.rotation.y = Math.PI;
      posRef.current = { x: CHAIR_POSITION.x, y: 0, z: CHAIR_POSITION.z, rotation: 0 };
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

    // Rotation
    if (movement.left) rotation += ROTATION_SPEED * delta;
    if (movement.right) rotation -= ROTATION_SPEED * delta;

    // Movement speed
    const speed = isRunningRef.current ? RUN_SPEED : WALK_SPEED;

    // Forward/backward movement (swapped - W goes toward camera's forward)
    if (movement.forward) {
      x -= Math.sin(rotation) * speed * delta;
      z += Math.cos(rotation) * speed * delta;
      isMoving = true;
    }
    if (movement.backward) {
      x += Math.sin(rotation) * speed * delta * 0.6;
      z -= Math.cos(rotation) * speed * delta * 0.6;
      isMoving = true;
    }

    // Boundary checks
    x = Math.max(-4, Math.min(4, x));
    z = Math.max(-4, Math.min(4, z));

    // Store in ref (no React re-render)
    posRef.current = { x, y, z, rotation };

    // Update 3D objects directly (smooth)
    groupRef.current.position.set(x, y, z);
    groupRef.current.rotation.y = rotation + Math.PI;

    // Camera follow
    const cameraOffset = new THREE.Vector3(0, 2.5, 4);
    cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
    const targetPos = new THREE.Vector3(
      x + cameraOffset.x,
      y + cameraOffset.y,
      z + cameraOffset.z
    );
    camera.position.lerp(targetPos, 5 * delta);
    camera.lookAt(x, y + 1.2, z);

    // Sync to store less frequently (every 100ms) for HUD/other components
    const now = performance.now();
    if (now - lastSyncRef.current > 100) {
      lastSyncRef.current = now;
      const newPose = isMoving ? 'walking' : 'standing';
      setPlayerPosition({ x, y, z, rotation, isMoving, pose: newPose });

      // Update moving state for animation
      if (isMoving !== isMovingRef.current) {
        isMovingRef.current = isMoving;
        forceUpdate(n => n + 1);
      }
    }
  });

  return (
    <group ref={groupRef} position={[posRef.current.x, 0, posRef.current.z]}>
      {children}
    </group>
  );
}

export default PlayerController;
