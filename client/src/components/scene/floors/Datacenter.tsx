/**
 * Datacenter.tsx - Floor 3: Server room with rows of racks
 */

import { useRef } from 'react';
import { Group } from 'three';
import { FloorIndicator } from '../FloorIndicator';

interface DatacenterProps {
  onElevatorUse: () => void;
}

// Server rack with servers and blinking LEDs
function ServerRack({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Rack frame */}
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[0.7, 2.2, 0.9]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Rack frame rails */}
      {[-0.3, 0.3].map((x, i) => (
        <mesh key={i} position={[x, 1.1, 0.4]}>
          <boxGeometry args={[0.03, 2.1, 0.03]} />
          <meshStandardMaterial color="#444444" />
        </mesh>
      ))}

      {/* Servers (1U-4U units) */}
      {[
        { y: 0.2, height: 0.15, color: '#2d2d2d' },   // 1U
        { y: 0.4, height: 0.15, color: '#333333' },   // 1U
        { y: 0.6, height: 0.15, color: '#2d2d2d' },   // 1U
        { y: 0.8, height: 0.25, color: '#383838' },   // 2U
        { y: 1.1, height: 0.15, color: '#2d2d2d' },   // 1U
        { y: 1.3, height: 0.35, color: '#404040' },   // 4U storage
        { y: 1.7, height: 0.15, color: '#333333' },   // 1U
        { y: 1.9, height: 0.15, color: '#2d2d2d' },   // 1U
      ].map((server, i) => (
        <group key={i}>
          <mesh position={[0, server.y, 0.35]}>
            <boxGeometry args={[0.6, server.height, 0.15]} />
            <meshStandardMaterial color={server.color} />
          </mesh>

          {/* LED status lights */}
          {[-0.2, -0.1, 0, 0.1, 0.2].map((x, j) => (
            <mesh key={j} position={[x, server.y, 0.44]}>
              <sphereGeometry args={[0.01, 8, 8]} />
              <meshStandardMaterial
                color={j === 0 ? '#00ff00' : (j === 1 ? '#00ff00' : '#333333')}
                emissive={j < 2 ? '#00ff00' : '#000000'}
                emissiveIntensity={j < 2 ? 0.8 : 0}
              />
            </mesh>
          ))}

          {/* Activity LED (blinking effect via random) */}
          <mesh position={[0.25, server.y, 0.44]}>
            <sphereGeometry args={[0.01, 8, 8]} />
            <meshStandardMaterial
              color={Math.random() > 0.5 ? '#ffaa00' : '#333333'}
              emissive={Math.random() > 0.5 ? '#ffaa00' : '#000000'}
              emissiveIntensity={0.6}
            />
          </mesh>
        </group>
      ))}

      {/* Rack label */}
      <mesh position={[0, 2.15, 0.46]}>
        <boxGeometry args={[0.15, 0.08, 0.01]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

// Hot/cold aisle containment
function AisleContainment({ position, length }: { position: [number, number, number]; length: number }) {
  return (
    <group position={position}>
      {/* Ceiling panel (transparent/perforated) */}
      <mesh position={[0, 2.4, 0]}>
        <boxGeometry args={[1.5, 0.05, length]} />
        <meshStandardMaterial color="#444444" transparent opacity={0.3} />
      </mesh>

      {/* End panels */}
      <mesh position={[0, 1.2, -length/2]}>
        <boxGeometry args={[1.5, 2.4, 0.05]} />
        <meshStandardMaterial color="#333333" transparent opacity={0.4} />
      </mesh>
      <mesh position={[0, 1.2, length/2]}>
        <boxGeometry args={[1.5, 2.4, 0.05]} />
        <meshStandardMaterial color="#333333" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

// CRAC (Computer Room Air Conditioning) unit
function CRACUnit({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Main unit body */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[1.2, 2, 0.8]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>

      {/* Vents */}
      {[0.3, 0.8, 1.3, 1.8].map((y, i) => (
        <mesh key={i} position={[0, y, 0.41]}>
          <boxGeometry args={[0.9, 0.15, 0.02]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
      ))}

      {/* Control panel */}
      <mesh position={[0, 1.7, 0.41]}>
        <boxGeometry args={[0.3, 0.2, 0.02]} />
        <meshStandardMaterial color="#00aaff" emissive="#00aaff" emissiveIntensity={0.2} />
      </mesh>

      {/* Status LED */}
      <mesh position={[-0.4, 1.85, 0.41]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

// PDU (Power Distribution Unit)
function PDU({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[0.3, 2, 0.2]} />
        <meshStandardMaterial color="#ff4444" />
      </mesh>

      {/* Outlets */}
      {[0.3, 0.5, 0.7, 0.9, 1.1, 1.3, 1.5, 1.7].map((y, i) => (
        <mesh key={i} position={[0, y, 0.11]}>
          <boxGeometry args={[0.15, 0.08, 0.02]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      ))}

      {/* Power indicator */}
      <mesh position={[0, 1.9, 0.11]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

export function Datacenter({ onElevatorUse }: DatacenterProps) {
  const floorRef = useRef<Group>(null);

  return (
    <group ref={floorRef}>
      {/* Raised floor (typical datacenter raised floor) */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[24, 20]} />
        <meshStandardMaterial color="#404040" />
      </mesh>

      {/* Floor tiles pattern */}
      {Array.from({ length: 12 }).map((_, i) =>
        Array.from({ length: 10 }).map((_, j) => (
          <mesh
            key={`${i}-${j}`}
            position={[-11 + i * 2, 0.01, -9 + j * 2]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[1.95, 1.95]} />
            <meshStandardMaterial color={((i + j) % 3 === 0) ? '#4a4a4a' : '#3a3a3a'} />
          </mesh>
        ))
      )}

      {/* Ceiling with cable trays */}
      <mesh position={[0, 3.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[24, 20]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>

      {/* Overhead cable trays */}
      {[-6, 0, 6].map((x, i) => (
        <mesh key={i} position={[x, 3.2, 0]}>
          <boxGeometry args={[0.8, 0.15, 18]} />
          <meshStandardMaterial color="#555555" />
        </mesh>
      ))}

      {/* Walls */}
      <mesh position={[0, 1.75, -10]}>
        <boxGeometry args={[24, 3.5, 0.2]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[0, 1.75, 10]}>
        <boxGeometry args={[24, 3.5, 0.2]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[-12, 1.75, 0]}>
        <boxGeometry args={[0.2, 3.5, 20]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[12, 1.75, 0]}>
        <boxGeometry args={[0.2, 3.5, 20]} />
        <meshStandardMaterial color="#333333" />
      </mesh>

      {/* 4 rows of server racks */}
      {/* Row 1 */}
      {[-8, -6, -4, -2, 0, 2].map((z, i) => (
        <ServerRack key={`r1-${i}`} position={[-8, 0, z]}  />
      ))}

      {/* Row 2 */}
      {[-8, -6, -4, -2, 0, 2].map((z, i) => (
        <ServerRack key={`r2-${i}`} position={[-4, 0, z]}  />
      ))}

      {/* Row 3 */}
      {[-8, -6, -4, -2, 0, 2].map((z, i) => (
        <ServerRack key={`r3-${i}`} position={[2, 0, z]}  />
      ))}

      {/* Row 4 */}
      {[-8, -6, -4, -2, 0, 2].map((z, i) => (
        <ServerRack key={`r4-${i}`} position={[6, 0, z]}  />
      ))}

      {/* Hot aisle containment between rows */}
      <AisleContainment position={[-6, 0, -3]} length={12} />
      <AisleContainment position={[4, 0, -3]} length={12} />

      {/* CRAC units along back wall */}
      <CRACUnit position={[-10, 0, -8]} />
      <CRACUnit position={[-10, 0, -4]} />
      <CRACUnit position={[-10, 0, 0]} />
      <CRACUnit position={[-10, 0, 4]} />

      {/* PDUs at end of rows */}
      <PDU position={[-8, 0, 4]} />
      <PDU position={[-4, 0, 4]} />
      <PDU position={[2, 0, 4]} />
      <PDU position={[6, 0, 4]} />

      {/* Fire suppression system (red pipes on ceiling) */}
      {[-4, 4].map((z, i) => (
        <mesh key={i} position={[0, 3.35, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 22, 8]} />
          <meshStandardMaterial color="#ff3333" />
        </mesh>
      ))}

      {/* Emergency lighting (red) */}
      {[[-10, 3.3, -8], [-10, 3.3, 8], [10, 3.3, -8], [10, 3.3, 8]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <boxGeometry args={[0.3, 0.1, 0.1]} />
          <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.3} />
        </mesh>
      ))}

      {/* Main lighting (cooler, blue-white) */}
      {[
        [-6, 3.3, -5], [-6, 3.3, 0], [-6, 3.3, 5],
        [0, 3.3, -5], [0, 3.3, 0], [0, 3.3, 5],
        [6, 3.3, -5], [6, 3.3, 0], [6, 3.3, 5],
      ].map((pos, i) => (
        <group key={i} position={pos as [number, number, number]}>
          <mesh>
            <boxGeometry args={[1.2, 0.08, 0.3]} />
            <meshStandardMaterial color="#ffffff" emissive="#e0f0ff" emissiveIntensity={0.4} />
          </mesh>
          <pointLight intensity={0.6} distance={6} color="#e0f0ff" />
        </group>
      ))}

      {/* Elevator door */}
      <group position={[11, 0, 6]}>
        {/* Elevator frame */}
        <mesh position={[0.5, 1.5, 0]}>
          <boxGeometry args={[0.1, 3, 2.2]} />
          <meshStandardMaterial color="#5a5a5a" />
        </mesh>

        {/* Heavy-duty datacenter elevator doors */}
        <mesh position={[0.45, 1.5, -0.5]}>
          <boxGeometry args={[0.05, 2.8, 0.9]} />
          <meshStandardMaterial color="#6a6a6a" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0.45, 1.5, 0.5]}>
          <boxGeometry args={[0.05, 2.8, 0.9]} />
          <meshStandardMaterial color="#6a6a6a" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Industrial call button panel */}
        <group position={[0.3, 1.2, 1.4]}>
          {/* Yellow industrial panel */}
          <mesh>
            <boxGeometry args={[0.08, 0.35, 0.2]} />
            <meshStandardMaterial color="#ffcc00" />
          </mesh>

          {/* Black border stripes */}
          <mesh position={[0, 0.16, 0]}>
            <boxGeometry args={[0.09, 0.02, 0.21]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          <mesh position={[0, -0.16, 0]}>
            <boxGeometry args={[0.09, 0.02, 0.21]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>

          {/* Large glowing call button */}
          <mesh
            position={[-0.045, 0, 0]}
            onClick={onElevatorUse}
            onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = 'default'; }}
          >
            <circleGeometry args={[0.06, 24]} />
            <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={1} />
          </mesh>

          {/* Button ring */}
          <mesh position={[-0.045, 0, 0]}>
            <ringGeometry args={[0.065, 0.08, 24]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>

          {/* Glow light */}
          <pointLight position={[-0.1, 0, 0]} color="#00ff88" intensity={0.5} distance={1.5} />
        </group>

        {/* Warning stripes around elevator */}
        <mesh position={[0.2, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.5, 2.5]} />
          <meshStandardMaterial color="#ffcc00" />
        </mesh>

        {/* Floor indicator above door */}
        <FloorIndicator position={[0.4, 2.9, 0]} rotation={[0, -Math.PI / 2, 0]} />
      </group>

      {/* "DATACENTER - AUTHORIZED PERSONNEL ONLY" sign */}
      <mesh position={[0, 2.8, -9.85]}>
        <boxGeometry args={[4, 0.3, 0.05]} />
        <meshStandardMaterial color="#cc0000" />
      </mesh>

      {/* Temperature/humidity display */}
      <group position={[10, 1.5, -8]}>
        <mesh>
          <boxGeometry args={[0.5, 0.3, 0.08]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        <mesh position={[0, 0, 0.05]}>
          <boxGeometry args={[0.4, 0.2, 0.01]} />
          <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.3} />
        </mesh>
      </group>

      {/* Ambient lighting - cooler temperature for datacenter */}
      <ambientLight intensity={0.3} color="#e0f0ff" />
      <directionalLight position={[0, 8, 0]} intensity={0.4} color="#ffffff" />
    </group>
  );
}

export default Datacenter;
