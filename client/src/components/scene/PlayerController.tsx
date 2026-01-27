import { useEffect, useRef, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';

const MOVE_SPEED = 2.5;
const ROTATION_SPEED = 3;
const DESK_POSITION = { x: 0, z: 0.8 }; // Chair position

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
      case 'Space':
        e.preventDefault();
        toggleStand();
        break;
    }
  }, [currentView, setMovement, toggleStand]);

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
      // Keep character at desk when seated
      groupRef.current.position.set(DESK_POSITION.x, 0, DESK_POSITION.z);
      groupRef.current.rotation.y = 0;
      return;
    }

    let { x, z, rotation } = playerPosition;
    let isMoving = false;

    // Rotation (turning)
    if (movement.left) {
      rotation += ROTATION_SPEED * delta;
    }
    if (movement.right) {
      rotation -= ROTATION_SPEED * delta;
    }

    // Movement (forward/backward based on rotation)
    if (movement.forward) {
      x -= Math.sin(rotation) * MOVE_SPEED * delta;
      z -= Math.cos(rotation) * MOVE_SPEED * delta;
      isMoving = true;
    }
    if (movement.backward) {
      x += Math.sin(rotation) * MOVE_SPEED * delta * 0.6; // Slower backward
      z += Math.cos(rotation) * MOVE_SPEED * delta * 0.6;
      isMoving = true;
    }

    // Boundary checks (keep player in room)
    x = Math.max(-4, Math.min(4, x));
    z = Math.max(-4, Math.min(4, z));

    // Update store
    setPlayerPosition({
      x,
      z,
      rotation,
      isMoving,
      pose: isMoving ? 'walking' : 'standing',
    });

    // Update 3D group
    groupRef.current.position.set(x, 0, z);
    groupRef.current.rotation.y = rotation;

    // Update camera to follow player (third-person)
    const cameraOffset = new THREE.Vector3(0, 2.5, 4);
    cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
    const targetCameraPos = new THREE.Vector3(x + cameraOffset.x, cameraOffset.y, z + cameraOffset.z);

    // Smooth camera follow
    camera.position.lerp(targetCameraPos, 5 * delta);
    camera.lookAt(x, 1.2, z);
  });

  return (
    <group ref={groupRef} position={[playerPosition.x, 0, playerPosition.z]}>
      {children}
    </group>
  );
}

export default PlayerController;
