/**
 * Floor4.tsx - Career Level 6: Senior Engineer Floor
 * Engineering lab with test benches, network gear, and analysis stations
 */

import { Html } from '@react-three/drei';
import { FloorIndicator } from '../FloorIndicator';

interface FloorProps {
  onElevatorUse: () => void;
}

export function Floor4({ onElevatorUse }: FloorProps) {
  const FLOOR_COLOR = '#4a90d9'; // Blue theme for engineering

  return (
    <group>
      <FloorIndicator label="Floor 4 - Engineering" color={FLOOR_COLOR} />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.6} />
      </mesh>

      {/* Floor grid lines */}
      <gridHelper args={[12, 12, '#2a2a4e', '#1a1a2e']} position={[0, 0.001, 0]} />

      {/* Walls */}
      {[
        { pos: [0, 1.5, -6], size: [12, 3, 0.2], color: '#2a2a3e' },
        { pos: [0, 1.5, 6], size: [12, 3, 0.2], color: '#2a2a3e' },
        { pos: [-6, 1.5, 0], size: [0.2, 3, 12], color: '#2a2a3e' },
        { pos: [6, 1.5, 0], size: [0.2, 3, 12], color: '#2a2a3e' },
      ].map((w, i) => (
        <mesh key={i} position={w.pos as [number, number, number]} castShadow receiveShadow>
          <boxGeometry args={w.size as [number, number, number]} />
          <meshStandardMaterial color={w.color} roughness={0.8} />
        </mesh>
      ))}

      {/* Ceiling */}
      <mesh position={[0, 3, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[11.8, 11.8]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* Ceiling lights */}
      {[[-3, 2.9, -3], [3, 2.9, -3], [-3, 2.9, 3], [3, 2.9, 3]].map((pos, i) => (
        <group key={i} position={pos as [number, number, number]}>
          <mesh>
            <boxGeometry args={[1.5, 0.05, 0.4]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
          </mesh>
          <pointLight position={[0, -0.1, 0]} intensity={0.5} distance={5} color="#ddeeff" />
        </group>
      ))}

      {/* Test benches */}
      {[
        { pos: [-3, 0, -3], label: 'Network Lab' },
        { pos: [3, 0, -3], label: 'Packet Analysis' },
        { pos: [-3, 0, 3], label: 'Config Testbed' },
      ].map((bench, i) => (
        <group key={i} position={bench.pos as [number, number, number]}>
          {/* Table */}
          <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[2, 0.05, 1]} />
            <meshStandardMaterial color="#3a3a5e" roughness={0.4} />
          </mesh>
          {/* Legs */}
          {[[-0.9, 0.25, 0.4], [0.9, 0.25, 0.4], [-0.9, 0.25, -0.4], [0.9, 0.25, -0.4]].map((leg, j) => (
            <mesh key={j} position={leg as [number, number, number]} castShadow>
              <cylinderGeometry args={[0.03, 0.03, 0.5, 8]} />
              <meshStandardMaterial color="#555" metalness={0.6} />
            </mesh>
          ))}
          {/* Equipment on bench */}
          <mesh position={[-0.5, 0.55, 0]} castShadow>
            <boxGeometry args={[0.8, 0.08, 0.6]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
          </mesh>
          {/* LEDs */}
          {[[-0.7, 0.6, 0.2], [-0.5, 0.6, 0.2], [-0.3, 0.6, 0.2]].map((led, j) => (
            <mesh key={j} position={led as [number, number, number]}>
              <sphereGeometry args={[0.02, 8, 8]} />
              <meshStandardMaterial color={j === 2 ? '#ff4444' : '#00ff44'} emissive={j === 2 ? '#ff4444' : '#00ff44'} emissiveIntensity={0.8} />
            </mesh>
          ))}
          {/* Label */}
          <Html position={[0, 0.8, -0.6]} center>
            <div style={{ color: '#4a90d9', fontSize: '10px', fontFamily: 'monospace', whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.7)', padding: '2px 8px', borderRadius: '4px' }}>
              {bench.label}
            </div>
          </Html>
        </group>
      ))}

      {/* Rack cabinet */}
      <group position={[4, 0, 2]}>
        <mesh position={[0, 1.2, 0]} castShadow>
          <boxGeometry args={[0.8, 2.4, 0.8]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.3} />
        </mesh>
        {[0.6, 0, -0.6].map((y, i) => (
          <mesh key={i} position={[0.41, 1.8 - i * 0.6, 0]}>
            <boxGeometry args={[0.02, 0.4, 0.6]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.5} />
          </mesh>
        ))}
      </group>

      {/* Elevator door */}
      <group position={[0, 0, 5.8]}>
        <mesh position={[0, 1.25, 0]} castShadow>
          <boxGeometry args={[1.5, 2.5, 0.1]} />
          <meshStandardMaterial color="#555" metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[0, 2.6, 0.05]}>
          <boxGeometry args={[1, 0.15, 0.02]} />
          <meshStandardMaterial color="#4a90d9" emissive="#4a90d9" emissiveIntensity={0.5} />
        </mesh>
        {/* Elevator button */}
        <mesh
          position={[0.6, 1.2, 0.08]}
          onClick={onElevatorUse}
          onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { document.body.style.cursor = 'default'; }}
        >
          <boxGeometry args={[0.12, 0.08, 0.02]} />
          <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={0.8} />
        </mesh>
        <Html position={[0.65, 1.2, 0.1]} center>
          <div style={{ color: '#4a90d9', fontSize: '8px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
            CALL
          </div>
        </Html>
      </group>
    </group>
  );
}

export default Floor4;
