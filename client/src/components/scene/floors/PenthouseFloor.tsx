/**
 * PenthouseFloor.tsx - Career Level 8: CTO Penthouse
 * Executive suite with panoramic skyline view, luxury decor
 */

import { Html } from '@react-three/drei';
import { FloorIndicator } from '../FloorIndicator';
import { useGameStore } from '../../../store/gameStore';

interface FloorProps {
  onElevatorUse: () => void;
}

export function PenthouseFloor({ onElevatorUse }: FloorProps) {
  const playerLevel = useGameStore((state) => state.player.level);
  const isCto = playerLevel >= 8;
  const FLOOR_COLOR = '#ffd700'; // Gold for CTO

  return (
    <group>
      <FloorIndicator label="Penthouse - Executive Suite" color={FLOOR_COLOR} />

      {/* Premium marble floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial color="#2a2a3a" roughness={0.15} />
      </mesh>

      {/* Floor tile pattern */}
      {Array.from({ length: 7 }).map((_, x) =>
        Array.from({ length: 7 }).map((_, z) => (
          <mesh key={`${x}-${z}`} position={[-6 + x * 2, 0, -6 + z * 2]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.8, 1.8]} />
            <meshStandardMaterial color={(x + z) % 2 === 0 ? '#2a2a3e' : '#252538'} roughness={0.15} />
          </mesh>
        ))
      )}

      {/* Floor-to-ceiling windows (3 sides) */}
      {[
        { pos: [0, 1.6, -7], size: [14, 3.2, 0.08], color: '#4a6a8a' },
        { pos: [-7, 1.6, 0], size: [0.08, 3.2, 14], color: '#4a6a8a' },
        { pos: [7, 1.6, 0], size: [0.08, 3.2, 14], color: '#4a6a8a' },
      ].map((w, i) => (
        <mesh key={i} position={w.pos as [number, number, number]}>
          <boxGeometry args={w.size as [number, number, number]} />
          <meshStandardMaterial color={w.color} transparent opacity={0.25} roughness={0.1} />
        </mesh>
      ))}

      {/* Window frames */}
      {[
        { pos: [0, 1.6, -6.9], size: [14, 3.2, 0.04] },
        { pos: [-6.9, 1.6, 0], size: [0.04, 3.2, 14] },
        { pos: [6.9, 1.6, 0], size: [0.04, 3.2, 14] },
      ].map((f, i) => (
        <mesh key={i} position={f.pos as [number, number, number]}>
          <boxGeometry args={f.size as [number, number, number]} />
          <meshStandardMaterial color="#555" metalness={0.8} />
        </mesh>
      ))}

      {/* Back wall */}
      <mesh position={[0, 1.6, 7]} castShadow>
        <boxGeometry args={[14, 3.2, 0.15]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.4} />
      </mesh>

      {/* Ceiling with recessed lighting */}
      <mesh position={[0, 3.3, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[13.8, 13.8]} />
        <meshStandardMaterial color="#1e1e2e" />
      </mesh>

      {/* Recessed ceiling lights */}
      {[-4, 0, 4].flatMap(x => [-4, 0, 4].map(z => [x, z])).map(([x, z], i) => (
        <pointLight key={i} position={[x, 3.2, z]} intensity={0.15} distance={5} color="#ffeedd" />
      ))}

      {/* Executive desk */}
      <group position={[0, 0, -3]}>
        {/* Large dark wood desk */}
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[3, 0.06, 1.2]} />
          <meshStandardMaterial color="#3d2817" roughness={0.3} />
        </mesh>
        {/* Metal legs */}
        {[[-1.3, 0.2, 0.5], [1.3, 0.2, 0.5], [-1.3, 0.2, -0.5], [1.3, 0.2, -0.5]].map((pos, i) => (
          <mesh key={i} position={pos as [number, number, number]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.4, 8]} />
            <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
          </mesh>
        ))}
        {/* Triple ultrawide monitors */}
        {[-0.5, 0, 0.5].map((x, i) => (
          <group key={i} position={[x, 0.65, -0.3]} rotation={[0, i === 0 ? 0.15 : i === 2 ? -0.15 : 0, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.45, 0.28, 0.02]} />
              <meshStandardMaterial color="#1a1a1a" />
            </mesh>
            <mesh position={[0, 0, 0.012]}>
              <planeGeometry args={[0.41, 0.24]} />
              <meshStandardMaterial color="#0a1520" emissive="#003366" emissiveIntensity={0.4} />
            </mesh>
          </group>
        ))}
        {/* Nameplate */}
        <mesh position={[0, 0.44, -0.55]} castShadow>
          <boxGeometry args={[0.4, 0.06, 0.02]} />
          <meshStandardMaterial color={FLOOR_COLOR} metalness={0.9} roughness={0.2} />
        </mesh>
        <Html position={[0, 0.44, -0.54]} center>
          <div style={{ color: '#1a1a1a', fontSize: '6px', fontFamily: 'serif', fontWeight: 'bold', whiteSpace: 'nowrap', background: 'rgba(255,215,0,0.9)', padding: '1px 8px', borderRadius: '2px' }}>
            {isCto ? 'CTO' : 'VISITOR'}
          </div>
        </Html>
      </group>

      {/* Executive leather chair */}
      <group position={[0, 0, -1.5]}>
        <mesh position={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[0.6, 0.08, 0.55]} />
          <meshStandardMaterial color="#1a0a0a" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.7, 0.25]} castShadow>
          <boxGeometry args={[0.55, 0.6, 0.06]} />
          <meshStandardMaterial color="#1a0a0a" roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.05, 0.22]} castShadow>
          <boxGeometry args={[0.3, 0.12, 0.05]} />
          <meshStandardMaterial color="#1a0a0a" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.4, 8]} />
          <meshStandardMaterial color="#888" metalness={0.7} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 0.03, 5]} />
          <meshStandardMaterial color="#333" metalness={0.7} />
        </mesh>
      </group>

      {/* Lounge area */}
      <group position={[4, 0, 2]}>
        {/* Sofa */}
        <mesh position={[0, 0.25, 0]} castShadow>
          <boxGeometry args={[2, 0.15, 0.7]} />
          <meshStandardMaterial color="#2a1a1a" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.55, 0.3]} castShadow>
          <boxGeometry args={[2, 0.45, 0.1]} />
          <meshStandardMaterial color="#2a1a1a" roughness={0.7} />
        </mesh>
        {/* Coffee table */}
        <mesh position={[0, 0.2, -0.8]} castShadow>
          <boxGeometry args={[1.2, 0.04, 0.6]} />
          <meshStandardMaterial color="#3d2817" roughness={0.2} />
        </mesh>
      </group>

      {/* Indoor plants */}
      {[[-4, 1, 4], [5, 0.5, -4]].map((pos, i) => (
        <group key={i} position={pos as [number, number, number]}>
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.15, 0.5, 12]} />
            <meshStandardMaterial color="#8b6f47" roughness={0.7} />
          </mesh>
          {[0, 1, 2].map(j => (
            <mesh key={j} position={[0, 0.6 + j * 0.15, 0]} castShadow>
              <sphereGeometry args={[0.15 + j * 0.03, 8, 8]} />
              <meshStandardMaterial color="#2d5a27" roughness={0.8} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Wall art */}
      <group position={[-6.5, 2, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.05, 1.2, 2]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        <mesh position={[0.03, 0, 0]}>
          <planeGeometry args={[1, 1.8]} />
          <meshStandardMaterial color="#1a3a5f" emissive="#002244" emissiveIntensity={0.3} />
        </mesh>
      </group>

      {/* Elevator (luxury finish) */}
      <group position={[0, 0, 6.8]}>
        <mesh position={[0, 1.25, 0]} castShadow>
          <boxGeometry args={[1.6, 2.6, 0.12]} />
          <meshStandardMaterial color="#444" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Gold trim */}
        <mesh position={[0, 2.65, 0.07]}>
          <boxGeometry args={[1.2, 0.04, 0.02]} />
          <meshStandardMaterial color={FLOOR_COLOR} metalness={1} roughness={0} />
        </mesh>
        {/* Floor indicator */}
        <mesh position={[0, 2.45, 0.07]}>
          <boxGeometry args={[0.6, 0.15, 0.02]} />
          <meshStandardMaterial color="#000" />
        </mesh>
        <Html position={[0, 2.45, 0.09]} center>
          <div style={{ color: FLOOR_COLOR, fontSize: '12px', fontFamily: 'monospace', fontWeight: 'bold' }}>
            PH
          </div>
        </Html>
        {/* Call button */}
        <mesh
          position={[0.65, 1.2, 0.08]}
          onClick={onElevatorUse}
          onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { document.body.style.cursor = 'default'; }}
        >
          <cylinderGeometry args={[0.05, 0.05, 0.02, 16]} />
          <meshStandardMaterial color={FLOOR_COLOR} emissive={FLOOR_COLOR} emissiveIntensity={0.8} />
        </mesh>
      </group>

      {/* Ambient golden light */}
      <pointLight position={[0, 2.5, -2]} color={FLOOR_COLOR} intensity={0.2} distance={8} />
    </group>
  );
}

export default PenthouseFloor;
