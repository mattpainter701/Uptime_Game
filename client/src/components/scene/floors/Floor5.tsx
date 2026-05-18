/**
 * Floor5.tsx - Career Level 7: Principal Engineer Floor
 * Glass-walled architecture studio with whiteboards and design stations
 */

import { Html } from '@react-three/drei';
import { FloorIndicator } from '../FloorIndicator';

interface FloorProps {
  onElevatorUse: () => void;
}

export function Floor5({ onElevatorUse }: FloorProps) {
  const FLOOR_COLOR = '#bb86fc'; // Purple theme for architecture

  return (
    <group>
      <FloorIndicator label="Floor 5 - Architecture" color={FLOOR_COLOR} />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#1e1e2e" roughness={0.3} />
      </mesh>

      <gridHelper args={[12, 12, '#3a3a5e', '#1e1e2e']} position={[0, 0.001, 0]} />

      {/* Glass walls (semi-transparent) */}
      {[
        { pos: [0, 1.5, -6], size: [12, 3, 0.1] },
        { pos: [0, 1.5, 6], size: [12, 3, 0.1] },
        { pos: [-6, 1.5, 0], size: [0.1, 3, 12] },
        { pos: [6, 1.5, 0], size: [0.1, 3, 12] },
      ].map((w, i) => (
        <mesh key={i} position={w.pos as [number, number, number]} receiveShadow>
          <boxGeometry args={w.size as [number, number, number]} />
          <meshStandardMaterial color="#4a6a8a" transparent opacity={0.3} roughness={0.2} />
        </mesh>
      ))}

      {/* Glass wall frames */}
      {[
        { pos: [0, 1.5, -5.95], size: [12, 3, 0.05] },
        { pos: [0, 1.5, 5.95], size: [12, 3, 0.05] },
        { pos: [-5.95, 1.5, 0], size: [0.05, 3, 12] },
        { pos: [5.95, 1.5, 0], size: [0.05, 3, 12] },
      ].map((f, i) => (
        <mesh key={i} position={f.pos as [number, number, number]}>
          <boxGeometry args={f.size as [number, number, number]} />
          <meshStandardMaterial color="#666" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}

      {/* Ceiling */}
      <mesh position={[0, 3, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[11.8, 11.8]} />
        <meshStandardMaterial color="#1e1e2e" />
      </mesh>

      {/* Ambient overhead lights */}
      {[[-4, 2.9, -4], [0, 2.9, -4], [4, 2.9, -4], [-4, 2.9, 0], [4, 2.9, 0], [-4, 2.9, 4], [0, 2.9, 4], [4, 2.9, 4]].map((pos, i) => (
        <pointLight key={i} position={pos as [number, number, number]} intensity={0.2} distance={4} color="#ddeeff" />
      ))}

      {/* Central collaboration table */}
      <group position={[0, 0, 0]}>
        {/* Large oval table */}
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.5, 1.5, 0.05, 32]} />
          <meshStandardMaterial color="#2a2a3e" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.15, 0.2, 0.45, 16]} />
          <meshStandardMaterial color="#444" metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.02, 0]} castShadow>
          <cylinderGeometry args={[0.6, 0.6, 0.03, 32]} />
          <meshStandardMaterial color="#333" metalness={0.8} />
        </mesh>
        {/* Chairs around table */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          return (
            <group key={i} position={[Math.cos(angle) * 1.8, 0, Math.sin(angle) * 1.8]} rotation={[0, angle + Math.PI, 0]}>
              <mesh position={[0, 0.3, 0]} castShadow>
                <boxGeometry args={[0.3, 0.05, 0.3]} />
                <meshStandardMaterial color="#2a2a2a" roughness={0.7} />
              </mesh>
              <mesh position={[0, 0.55, 0.1]} castShadow>
                <boxGeometry args={[0.25, 0.4, 0.04]} />
                <meshStandardMaterial color="#2a2a2a" roughness={0.7} />
              </mesh>
              <mesh position={[0, 0.15, 0]} castShadow>
                <cylinderGeometry args={[0.02, 0.02, 0.28, 8]} />
                <meshStandardMaterial color="#555" metalness={0.6} />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* Wall whiteboards */}
      {[[-5.8, 1.5, -2], [-5.8, 1.5, 2], [5.8, 1.5, -2]].map((pos, i) => (
        <group key={i} position={pos as [number, number, number]}>
          <mesh>
            <boxGeometry args={[0.05, 1.5, 2.5]} />
            <meshStandardMaterial color="#ffffff" roughness={0.2} />
          </mesh>
          <Html position={[0.04, 0, 0]} center>
            <div style={{ color: '#bb86fc', fontSize: '8px', fontFamily: 'monospace', whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: '3px', transform: 'rotate(90deg)' }}>
              NETWORK TOPOLOGY v{i + 1}
            </div>
          </Html>
        </group>
      ))}

      {/* Design stations */}
      {[[-3, 0, -4], [3, 0, -4], [-3, 0, 4]].map((pos, i) => (
        <group key={i} position={pos as [number, number, number]}>
          <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.5, 0.04, 0.8]} />
            <meshStandardMaterial color="#3a3a5e" roughness={0.3} />
          </mesh>
          {[[-0.65, 0.25, 0.3], [0.65, 0.25, 0.3], [-0.65, 0.25, -0.3], [0.65, 0.25, -0.3]].map((leg, j) => (
            <mesh key={j} position={leg as [number, number, number]} castShadow>
              <cylinderGeometry args={[0.025, 0.025, 0.5, 8]} />
              <meshStandardMaterial color="#555" metalness={0.5} />
            </mesh>
          ))}
          {/* Monitor */}
          <mesh position={[0, 0.85, -0.2]} castShadow>
            <boxGeometry args={[0.6, 0.35, 0.03]} />
            <meshStandardMaterial color="#0a1520" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.85, -0.18]}>
            <planeGeometry args={[0.54, 0.29]} />
            <meshStandardMaterial color="#1a1a3e" emissive="#4466aa" emissiveIntensity={0.3} />
          </mesh>
        </group>
      ))}

      {/* Elevator door */}
      <group position={[0, 0, 5.8]}>
        <mesh position={[0, 1.25, 0]} castShadow>
          <boxGeometry args={[1.5, 2.5, 0.1]} />
          <meshStandardMaterial color="#555" metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[0, 2.6, 0.05]}>
          <boxGeometry args={[1, 0.15, 0.02]} />
          <meshStandardMaterial color={FLOOR_COLOR} emissive={FLOOR_COLOR} emissiveIntensity={0.5} />
        </mesh>
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
          <div style={{ color: FLOOR_COLOR, fontSize: '8px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
            CALL
          </div>
        </Html>
      </group>
    </group>
  );
}

export default Floor5;
