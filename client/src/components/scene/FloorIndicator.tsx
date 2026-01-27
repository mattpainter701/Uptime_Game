/**
 * FloorIndicator.tsx - Digital display showing current floor
 */

import { useGameStore } from '../../store/gameStore';
import { Text } from '@react-three/drei';

const FLOOR_LABELS: Record<string, string> = {
  'basement': 'B',
  'lobby': 'L',
  'floor1': '1',
  'floor2': '2',
  'floor3': '3',
};

interface FloorIndicatorProps {
  position: [number, number, number];
  rotation?: [number, number, number];
}

export function FloorIndicator({ position, rotation = [0, 0, 0] }: FloorIndicatorProps) {
  const currentFloor = useGameStore((state) => state.currentFloor);
  const floorLabel = FLOOR_LABELS[currentFloor] || '?';

  return (
    <group position={position} rotation={rotation}>
      {/* Display background */}
      <mesh>
        <boxGeometry args={[0.25, 0.15, 0.03]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>

      {/* LED display screen */}
      <mesh position={[0, 0, 0.016]}>
        <planeGeometry args={[0.2, 0.1]} />
        <meshStandardMaterial
          color="#001a00"
          emissive="#003300"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Floor number/letter */}
      <Text
        position={[0, 0, 0.02]}
        fontSize={0.07}
        color="#ff3333"
        anchorX="center"
        anchorY="middle"
      >
        {floorLabel}
      </Text>
    </group>
  );
}

export default FloorIndicator;
