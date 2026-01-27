/**
 * CubicleFloor.tsx - Office floor with 4 cubicles and network closet
 * Used for Floor 1 and Floor 2
 */

import { useRef } from 'react';
import { Group } from 'three';
import { FloorIndicator } from '../FloorIndicator';

interface CubicleFloorProps {
  onElevatorUse: () => void;
}

// Individual cubicle with desk, monitor, and worker
function Cubicle({ position, workerColor }: { position: [number, number, number]; workerColor: string }) {
  return (
    <group position={position}>
      {/* Cubicle walls - L-shaped partitions */}
      {/* Back wall */}
      <mesh position={[0, 0.75, -1.2]}>
        <boxGeometry args={[2.4, 1.5, 0.05]} />
        <meshStandardMaterial color="#a0a0a0" />
      </mesh>
      {/* Side wall */}
      <mesh position={[-1.2, 0.75, 0]}>
        <boxGeometry args={[0.05, 1.5, 2.4]} />
        <meshStandardMaterial color="#a0a0a0" />
      </mesh>

      {/* Desk */}
      <mesh position={[0, 0.7, -0.5]}>
        <boxGeometry args={[1.8, 0.05, 0.8]} />
        <meshStandardMaterial color="#8b6f47" />
      </mesh>
      {/* Desk legs */}
      {[[-0.8, 0.35, -0.7], [0.8, 0.35, -0.7], [-0.8, 0.35, -0.3], [0.8, 0.35, -0.3]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <boxGeometry args={[0.05, 0.7, 0.05]} />
          <meshStandardMaterial color="#5c4a36" />
        </mesh>
      ))}

      {/* Monitor */}
      <mesh position={[0, 1.05, -0.7]}>
        <boxGeometry args={[0.6, 0.4, 0.03]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Screen */}
      <mesh position={[0, 1.05, -0.68]}>
        <boxGeometry args={[0.55, 0.35, 0.01]} />
        <meshStandardMaterial color="#3498db" emissive="#3498db" emissiveIntensity={0.3} />
      </mesh>
      {/* Monitor stand */}
      <mesh position={[0, 0.8, -0.7]}>
        <boxGeometry args={[0.1, 0.15, 0.1]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>

      {/* Keyboard */}
      <mesh position={[0, 0.73, -0.3]}>
        <boxGeometry args={[0.35, 0.02, 0.12]} />
        <meshStandardMaterial color="#333333" />
      </mesh>

      {/* Office chair */}
      <group position={[0, 0, 0.3]}>
        {/* Seat */}
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[0.45, 0.08, 0.45]} />
          <meshStandardMaterial color="#2c3e50" />
        </mesh>
        {/* Backrest */}
        <mesh position={[0, 0.75, -0.2]}>
          <boxGeometry args={[0.45, 0.5, 0.08]} />
          <meshStandardMaterial color="#2c3e50" />
        </mesh>
        {/* Chair base */}
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 0.05, 16]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        {/* Chair post */}
        <mesh position={[0, 0.32, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.2, 8]} />
          <meshStandardMaterial color="#555555" />
        </mesh>
      </group>

      {/* Worker (sitting, simplified figure) */}
      <group position={[0, 0.45, 0.3]}>
        {/* Body/torso */}
        <mesh position={[0, 0.35, 0]}>
          <capsuleGeometry args={[0.15, 0.3, 8, 16]} />
          <meshStandardMaterial color={workerColor} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 0.7, 0]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#e8beac" />
        </mesh>
        {/* Hair */}
        <mesh position={[0, 0.78, 0]}>
          <sphereGeometry args={[0.1, 16, 8]} />
          <meshStandardMaterial color="#4a3728" />
        </mesh>
      </group>

      {/* Coffee mug */}
      <mesh position={[0.6, 0.78, -0.4]}>
        <cylinderGeometry args={[0.04, 0.035, 0.1, 12]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Papers/documents */}
      <mesh position={[-0.5, 0.73, -0.4]}>
        <boxGeometry args={[0.2, 0.02, 0.28]} />
        <meshStandardMaterial color="#f5f5f5" />
      </mesh>
    </group>
  );
}

// Network closet room
function NetworkCloset({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Room walls */}
      {/* Back wall */}
      <mesh position={[0, 1.5, -2]}>
        <boxGeometry args={[4, 3, 0.15]} />
        <meshStandardMaterial color="#e8e8e8" />
      </mesh>
      {/* Left wall */}
      <mesh position={[-2, 1.5, 0]}>
        <boxGeometry args={[0.15, 3, 4]} />
        <meshStandardMaterial color="#e8e8e8" />
      </mesh>
      {/* Right wall with doorway */}
      <mesh position={[2, 2.25, -1]}>
        <boxGeometry args={[0.15, 1.5, 2]} />
        <meshStandardMaterial color="#e8e8e8" />
      </mesh>
      <mesh position={[2, 2.25, 1.5]}>
        <boxGeometry args={[0.15, 1.5, 1]} />
        <meshStandardMaterial color="#e8e8e8" />
      </mesh>
      <mesh position={[2, 0.75, 0]}>
        <boxGeometry args={[0.15, 1.5, 4]} />
        <meshStandardMaterial color="#e8e8e8" />
      </mesh>

      {/* Door frame */}
      <mesh position={[2.08, 1.5, 0.5]}>
        <boxGeometry args={[0.05, 2.2, 0.05]} />
        <meshStandardMaterial color="#5c4a36" />
      </mesh>

      {/* Network rack 1 */}
      <group position={[-1, 0, -1.5]}>
        <mesh position={[0, 1, 0]}>
          <boxGeometry args={[0.6, 2, 0.8]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
        {/* Switches with blinking lights */}
        {[0.3, 0.6, 0.9, 1.2, 1.5].map((y, i) => (
          <group key={i}>
            <mesh position={[0, y, 0.35]}>
              <boxGeometry args={[0.5, 0.15, 0.1]} />
              <meshStandardMaterial color="#1a1a1a" />
            </mesh>
            {/* LED indicators */}
            {[-0.15, -0.05, 0.05, 0.15].map((x, j) => (
              <mesh key={j} position={[x, y, 0.41]}>
                <sphereGeometry args={[0.015, 8, 8]} />
                <meshStandardMaterial
                  color={j % 2 === 0 ? "#00ff00" : "#ffaa00"}
                  emissive={j % 2 === 0 ? "#00ff00" : "#ffaa00"}
                  emissiveIntensity={0.8}
                />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* Network rack 2 */}
      <group position={[0.5, 0, -1.5]}>
        <mesh position={[0, 1, 0]}>
          <boxGeometry args={[0.6, 2, 0.8]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
        {/* Patch panel and switches */}
        {[0.4, 0.7, 1.0, 1.3, 1.6].map((y, i) => (
          <group key={i}>
            <mesh position={[0, y, 0.35]}>
              <boxGeometry args={[0.5, 0.12, 0.08]} />
              <meshStandardMaterial color={i % 2 === 0 ? "#333333" : "#1a1a1a"} />
            </mesh>
            {/* Ethernet port indicators */}
            {[-0.18, -0.12, -0.06, 0, 0.06, 0.12, 0.18].map((x, j) => (
              <mesh key={j} position={[x, y, 0.4]}>
                <boxGeometry args={[0.03, 0.04, 0.01]} />
                <meshStandardMaterial
                  color="#00ff00"
                  emissive="#00ff00"
                  emissiveIntensity={Math.random() > 0.3 ? 0.5 : 0}
                />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* Cable management - vertical cables */}
      {[-0.7, 0.2].map((x, i) => (
        <mesh key={i} position={[x, 1, -1.1]}>
          <cylinderGeometry args={[0.08, 0.08, 1.8, 8]} />
          <meshStandardMaterial color="#2563eb" />
        </mesh>
      ))}

      {/* UPS unit on floor */}
      <mesh position={[-1.5, 0.3, 0]}>
        <boxGeometry args={[0.4, 0.6, 0.5]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[-1.5, 0.5, 0.26]}>
        <boxGeometry args={[0.2, 0.1, 0.01]} />
        <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.3} />
      </mesh>

      {/* "Network Closet" sign */}
      <mesh position={[2.1, 2.3, 0.5]}>
        <boxGeometry args={[0.02, 0.2, 0.6]} />
        <meshStandardMaterial color="#1a365d" />
      </mesh>
    </group>
  );
}

export function CubicleFloor({ onElevatorUse }: CubicleFloorProps) {
  const floorRef = useRef<Group>(null);

  // Different worker shirt colors for variety
  const workerColors = ['#3498db', '#e74c3c', '#2ecc71', '#9b59b6'];

  return (
    <group ref={floorRef}>
      {/* Main floor */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#c0c0c0" />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, 3.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#f8f8f8" />
      </mesh>

      {/* Ceiling lights */}
      {[[-4, 3.4, -4], [4, 3.4, -4], [-4, 3.4, 4], [4, 3.4, 4], [0, 3.4, 0]].map((pos, i) => (
        <group key={i} position={pos as [number, number, number]}>
          <mesh>
            <boxGeometry args={[1.5, 0.1, 0.4]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
          </mesh>
          <pointLight intensity={0.8} distance={8} color="#fff5e6" />
        </group>
      ))}

      {/* Walls */}
      {/* Back wall */}
      <mesh position={[0, 1.75, -10]}>
        <boxGeometry args={[20, 3.5, 0.2]} />
        <meshStandardMaterial color="#e8e8e8" />
      </mesh>
      {/* Front wall */}
      <mesh position={[0, 1.75, 10]}>
        <boxGeometry args={[20, 3.5, 0.2]} />
        <meshStandardMaterial color="#e8e8e8" />
      </mesh>
      {/* Left wall with windows */}
      <mesh position={[-10, 1.75, 0]}>
        <boxGeometry args={[0.2, 3.5, 20]} />
        <meshStandardMaterial color="#e8e8e8" />
      </mesh>
      {/* Right wall */}
      <mesh position={[10, 1.75, 0]}>
        <boxGeometry args={[0.2, 3.5, 20]} />
        <meshStandardMaterial color="#e8e8e8" />
      </mesh>

      {/* Windows on left wall */}
      {[-6, -2, 2, 6].map((z, i) => (
        <group key={i} position={[-9.85, 1.8, z]}>
          <mesh>
            <boxGeometry args={[0.05, 1.5, 2]} />
            <meshStandardMaterial color="#87ceeb" transparent opacity={0.4} />
          </mesh>
          {/* Window frame */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.1, 1.6, 0.1]} />
            <meshStandardMaterial color="#5c4a36" />
          </mesh>
        </group>
      ))}

      {/* 4 Cubicles in a row */}
      <Cubicle position={[-6, 0, 2]} workerColor={workerColors[0]} />
      <Cubicle position={[-2, 0, 2]} workerColor={workerColors[1]} />
      <Cubicle position={[2, 0, 2]} workerColor={workerColors[2]} />
      <Cubicle position={[6, 0, 2]} workerColor={workerColors[3]} />

      {/* Network Closet in corner */}
      <NetworkCloset position={[6, 0, -6]} />

      {/* Floor number sign */}
      <mesh position={[0, 2.8, -9.8]}>
        <boxGeometry args={[1.5, 0.4, 0.05]} />
        <meshStandardMaterial color="#1a365d" />
      </mesh>

      {/* Elevator door */}
      <group position={[9, 0, 0]}>
        {/* Elevator frame */}
        <mesh position={[0.5, 1.5, 0]}>
          <boxGeometry args={[0.1, 3, 2.2]} />
          <meshStandardMaterial color="#5a5a5a" />
        </mesh>

        {/* Elevator doors */}
        <mesh position={[0.45, 1.5, -0.5]}>
          <boxGeometry args={[0.05, 2.8, 0.9]} />
          <meshStandardMaterial color="#8a8a8a" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0.45, 1.5, 0.5]}>
          <boxGeometry args={[0.05, 2.8, 0.9]} />
          <meshStandardMaterial color="#8a8a8a" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Large visible call button panel */}
        <group position={[0.3, 1.2, 1.4]}>
          {/* Panel background */}
          <mesh>
            <boxGeometry args={[0.05, 0.3, 0.18]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>

          {/* Large glowing call button */}
          <mesh
            position={[-0.03, 0, 0]}
            onClick={onElevatorUse}
            onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = 'default'; }}
          >
            <circleGeometry args={[0.05, 24]} />
            <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={0.8} />
          </mesh>

          {/* Button ring */}
          <mesh position={[-0.03, 0, 0]}>
            <ringGeometry args={[0.055, 0.07, 24]} />
            <meshStandardMaterial color="#00ffaa" emissive="#00ffaa" emissiveIntensity={0.5} />
          </mesh>

          {/* Glow light */}
          <pointLight position={[-0.1, 0, 0]} color="#00ff88" intensity={0.3} distance={1} />

          {/* Up arrow */}
          <mesh position={[-0.03, 0.1, 0]} rotation={[0, 0, 0]}>
            <coneGeometry args={[0.02, 0.035, 3]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.4} />
          </mesh>
        </group>

        {/* Floor indicator above door */}
        <FloorIndicator position={[0.4, 2.9, 0]} rotation={[0, -Math.PI / 2, 0]} />
      </group>

      {/* Water cooler */}
      <group position={[-8, 0, -8]}>
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.2, 0.25, 1.2, 16]} />
          <meshStandardMaterial color="#e0e0e0" />
        </mesh>
        {/* Water jug */}
        <mesh position={[0, 1.4, 0]}>
          <cylinderGeometry args={[0.18, 0.15, 0.5, 16]} />
          <meshStandardMaterial color="#a8d8ea" transparent opacity={0.6} />
        </mesh>
      </group>

      {/* Potted plant */}
      <group position={[-8, 0, 8]}>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.2, 0.15, 0.5, 16]} />
          <meshStandardMaterial color="#8b4513" />
        </mesh>
        <mesh position={[0, 0.7, 0]}>
          <sphereGeometry args={[0.35, 16, 16]} />
          <meshStandardMaterial color="#228b22" />
        </mesh>
      </group>

      {/* Ambient and directional lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={0.6} castShadow />
    </group>
  );
}

export default CubicleFloor;
