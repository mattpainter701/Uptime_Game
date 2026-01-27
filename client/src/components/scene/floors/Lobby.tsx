/**
 * Lobby.tsx - Main floor lobby with security
 *
 * Features:
 * - Card readers
 * - Metal detectors
 * - Reception desk
 * - Network-based alarm system
 * - Seating area
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FloorIndicator } from '../FloorIndicator';

interface FloorProps {
  onElevatorUse: () => void;
}

const COLORS = {
  floor: '#d4c8b8',
  floorTile: '#c0b4a4',
  wallLight: '#f0ece8',
  ceiling: '#ffffff',
  deskWood: '#5c4033',
  metal: '#808080',
  metalDark: '#404040',
  accent: '#1e40af',
  warning: '#dc2626',
  success: '#16a34a',
};

// Reception desk
function ReceptionDesk() {
  return (
    <group position={[0, 0, -3]}>
      {/* Main desk body */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[3, 1.1, 0.8]} />
        <meshStandardMaterial color={COLORS.deskWood} roughness={0.7} />
      </mesh>

      {/* Front panel - company logo area */}
      <mesh position={[0, 0.55, 0.41]}>
        <boxGeometry args={[2.8, 0.9, 0.02]} />
        <meshStandardMaterial color={COLORS.accent} roughness={0.4} />
      </mesh>

      {/* Desk top surface */}
      <mesh position={[0, 1.12, 0]} castShadow>
        <boxGeometry args={[3.1, 0.04, 0.85]} />
        <meshStandardMaterial color="#3d3d3d" roughness={0.3} />
      </mesh>

      {/* Computer monitor */}
      <group position={[-0.5, 1.35, -0.1]}>
        <mesh>
          <boxGeometry args={[0.5, 0.35, 0.03]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[0.45, 0.3]} />
          <meshStandardMaterial color="#0a1525" emissive="#2563eb" emissiveIntensity={0.2} />
        </mesh>
        <mesh position={[0, -0.22, 0]}>
          <boxGeometry args={[0.08, 0.1, 0.08]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
      </group>

      {/* Phone */}
      <mesh position={[0.6, 1.16, -0.1]} castShadow>
        <boxGeometry args={[0.15, 0.04, 0.2]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Sign-in tablet */}
      <group position={[1.2, 1.16, 0.2]} rotation={[-0.3, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.2, 0.01, 0.28]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
        <mesh position={[0, 0.01, 0]}>
          <planeGeometry args={[0.18, 0.26]} />
          <meshStandardMaterial color="#1a1a2e" emissive="#00ff88" emissiveIntensity={0.15} />
        </mesh>
      </group>

      {/* Receptionist chair (behind desk) */}
      <mesh position={[0, 0.45, -0.6]} castShadow>
        <boxGeometry args={[0.5, 0.08, 0.5]} />
        <meshStandardMaterial color="#2d2d2d" />
      </mesh>
      <mesh position={[0, 0.75, -0.8]} castShadow>
        <boxGeometry args={[0.48, 0.5, 0.06]} />
        <meshStandardMaterial color="#2d2d2d" />
      </mesh>
    </group>
  );
}

// Metal detector gate
function MetalDetector({ position }: { position: [number, number, number] }) {
  const lightRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (lightRef.current) {
      const mat = lightRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
    }
  });

  return (
    <group position={position}>
      {/* Frame sides */}
      <mesh position={[-0.45, 1.1, 0]} castShadow>
        <boxGeometry args={[0.1, 2.2, 0.15]} />
        <meshStandardMaterial color={COLORS.metalDark} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0.45, 1.1, 0]} castShadow>
        <boxGeometry args={[0.1, 2.2, 0.15]} />
        <meshStandardMaterial color={COLORS.metalDark} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Top bar */}
      <mesh position={[0, 2.2, 0]} castShadow>
        <boxGeometry args={[1, 0.08, 0.15]} />
        <meshStandardMaterial color={COLORS.metalDark} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Status light */}
      <mesh ref={lightRef} position={[0, 2.15, 0.08]}>
        <boxGeometry args={[0.3, 0.03, 0.02]} />
        <meshStandardMaterial color={COLORS.success} emissive={COLORS.success} emissiveIntensity={0.5} />
      </mesh>

      {/* Control panel */}
      <mesh position={[0.55, 1, 0]}>
        <boxGeometry args={[0.08, 0.3, 0.1]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </group>
  );
}

// Card reader / turnstile
function CardReader({ position }: { position: [number, number, number] }) {
  const ledRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ledRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 3) > 0;
      const mat = ledRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = pulse ? 0.8 : 0.3;
    }
  });

  return (
    <group position={position}>
      {/* Turnstile base */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[0.3, 1, 0.4]} />
        <meshStandardMaterial color={COLORS.metal} metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Turnstile arms */}
      <mesh position={[0, 0.9, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.6, 0.04, 0.04]} />
        <meshStandardMaterial color={COLORS.metalDark} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Card reader unit */}
      <group position={[0, 1.1, 0.22]}>
        <mesh castShadow>
          <boxGeometry args={[0.12, 0.18, 0.04]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        {/* Card slot */}
        <mesh position={[0, -0.02, 0.025]}>
          <boxGeometry args={[0.06, 0.01, 0.01]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        {/* LED indicator */}
        <mesh ref={ledRef} position={[0, 0.05, 0.025]}>
          <circleGeometry args={[0.015, 12]} />
          <meshStandardMaterial color={COLORS.success} emissive={COLORS.success} emissiveIntensity={0.5} />
        </mesh>
      </group>
    </group>
  );
}

// Security alarm panel
function AlarmPanel() {
  const statusRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (statusRef.current) {
      const mat = statusRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.4 + Math.sin(state.clock.elapsedTime * 1.5) * 0.2;
    }
  });

  return (
    <group position={[-4.85, 1.5, -2]}>
      {/* Main panel */}
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.4, 0.5, 0.05]} />
        <meshStandardMaterial color="#e8e8e8" />
      </mesh>

      {/* Screen */}
      <mesh ref={statusRef} position={[0.03, 0.05, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.3, 0.25]} />
        <meshStandardMaterial color="#001a00" emissive="#00ff00" emissiveIntensity={0.4} />
      </mesh>

      {/* Keypad */}
      <group position={[0.03, -0.15, 0]} rotation={[0, Math.PI / 2, 0]}>
        {[0, 1, 2].map((row) =>
          [0, 1, 2].map((col) => (
            <mesh key={`${row}-${col}`} position={[(col - 1) * 0.06, (1 - row) * 0.05, 0]}>
              <boxGeometry args={[0.04, 0.035, 0.01]} />
              <meshStandardMaterial color="#404040" />
            </mesh>
          ))
        )}
      </group>

      {/* Label */}
      <mesh position={[0.03, 0.22, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.2, 0.04]} />
        <meshStandardMaterial color={COLORS.warning} />
      </mesh>
    </group>
  );
}

// Seating area
function SeatingArea() {
  const Couch = ({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) => (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Seat */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[1.5, 0.2, 0.6]} />
        <meshStandardMaterial color="#374151" roughness={0.8} />
      </mesh>
      {/* Back */}
      <mesh position={[0, 0.5, -0.25]} castShadow>
        <boxGeometry args={[1.5, 0.4, 0.15]} />
        <meshStandardMaterial color="#374151" roughness={0.8} />
      </mesh>
      {/* Armrests */}
      <mesh position={[-0.7, 0.35, 0]} castShadow>
        <boxGeometry args={[0.1, 0.3, 0.5]} />
        <meshStandardMaterial color="#374151" roughness={0.8} />
      </mesh>
      <mesh position={[0.7, 0.35, 0]} castShadow>
        <boxGeometry args={[0.1, 0.3, 0.5]} />
        <meshStandardMaterial color="#374151" roughness={0.8} />
      </mesh>
    </group>
  );

  const CoffeeTable = ({ position }: { position: [number, number, number] }) => (
    <group position={position}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.8, 0.04, 0.5]} />
        <meshStandardMaterial color="#5c4033" roughness={0.6} />
      </mesh>
      {/* Legs */}
      {[[-0.35, -0.2], [0.35, -0.2], [-0.35, 0.2], [0.35, 0.2]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.14, z]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.28, 8]} />
          <meshStandardMaterial color="#3d3d3d" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );

  return (
    <group position={[3, 0, 2]}>
      <Couch position={[0, 0, 0]} />
      <Couch position={[0, 0, 1.5]} rotation={Math.PI} />
      <CoffeeTable position={[0, 0, 0.75]} />
    </group>
  );
}

// Room structure
function Room() {
  return (
    <group>
      {/* Floor - tile pattern */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial color={COLORS.floor} roughness={0.5} />
      </mesh>

      {/* Tile lines */}
      {Array.from({ length: 15 }, (_, i) => (
        <group key={i}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(i - 7), 0.001, 0]}>
            <planeGeometry args={[0.02, 14]} />
            <meshStandardMaterial color={COLORS.floorTile} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, (i - 7)]}>
            <planeGeometry args={[14, 0.02]} />
            <meshStandardMaterial color={COLORS.floorTile} />
          </mesh>
        </group>
      ))}

      {/* Walls */}
      <mesh position={[0, 2, -5]}>
        <boxGeometry args={[14, 4, 0.15]} />
        <meshStandardMaterial color={COLORS.wallLight} roughness={0.9} />
      </mesh>
      <mesh position={[-5, 2, 0]}>
        <boxGeometry args={[0.15, 4, 14]} />
        <meshStandardMaterial color={COLORS.wallLight} roughness={0.9} />
      </mesh>
      <mesh position={[5, 2, 0]}>
        <boxGeometry args={[0.15, 4, 14]} />
        <meshStandardMaterial color={COLORS.wallLight} roughness={0.9} />
      </mesh>

      {/* Front entrance (glass) */}
      <mesh position={[0, 2, 5]}>
        <boxGeometry args={[6, 4, 0.1]} />
        <meshStandardMaterial color="#87ceeb" transparent opacity={0.3} />
      </mesh>
      <mesh position={[-3.5, 2, 5]}>
        <boxGeometry args={[4, 4, 0.15]} />
        <meshStandardMaterial color={COLORS.wallLight} />
      </mesh>
      <mesh position={[3.5, 2, 5]}>
        <boxGeometry args={[4, 4, 0.15]} />
        <meshStandardMaterial color={COLORS.wallLight} />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, 4, 0]}>
        <boxGeometry args={[14, 0.1, 14]} />
        <meshStandardMaterial color={COLORS.ceiling} />
      </mesh>

      {/* Ceiling lights */}
      {[[-3, -2], [3, -2], [-3, 2], [3, 2], [0, 0]].map(([x, z], i) => (
        <group key={i} position={[x, 3.95, z]}>
          <mesh>
            <boxGeometry args={[1, 0.02, 0.4]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.9} />
          </mesh>
          <pointLight position={[0, -0.3, 0]} color="#fff8f0" intensity={0.4} distance={6} />
        </group>
      ))}
    </group>
  );
}

// Elevator door
function ElevatorDoor({ onUse }: { onUse: () => void }) {
  const buttonRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (buttonRef.current) {
      const mat = buttonRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.8 + Math.sin(state.clock.elapsedTime * 3) * 0.4;
    }
  });

  return (
    <group position={[-4.9, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
      {/* Door frame */}
      <mesh>
        <boxGeometry args={[1.2, 2.8, 0.15]} />
        <meshStandardMaterial color="#505050" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Door panels */}
      <mesh position={[-0.28, 0, 0.08]}>
        <boxGeometry args={[0.5, 2.6, 0.03]} />
        <meshStandardMaterial color="#707070" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.28, 0, 0.08]}>
        <boxGeometry args={[0.5, 2.6, 0.03]} />
        <meshStandardMaterial color="#707070" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Large call button panel - highly visible */}
      <group position={[0.85, -0.3, 0.1]}>
        {/* Panel background */}
        <mesh>
          <boxGeometry args={[0.2, 0.35, 0.03]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.5} />
        </mesh>

        {/* Large glowing call button */}
        <mesh
          ref={buttonRef}
          position={[0, 0, 0.025]}
          onClick={onUse}
          onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { document.body.style.cursor = 'default'; }}
        >
          <circleGeometry args={[0.06, 24]} />
          <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={0.8} />
        </mesh>

        {/* Button ring */}
        <mesh position={[0, 0, 0.02]}>
          <ringGeometry args={[0.065, 0.08, 24]} />
          <meshStandardMaterial color="#00ffaa" emissive="#00ffaa" emissiveIntensity={0.5} />
        </mesh>

        {/* Point light for glow effect */}
        <pointLight position={[0, 0, 0.1]} color="#00ff88" intensity={0.3} distance={1} />

        {/* Up/Down arrows */}
        <mesh position={[0, 0.1, 0.02]}>
          <coneGeometry args={[0.025, 0.04, 3]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0, -0.1, 0.02]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.025, 0.04, 3]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
        </mesh>
      </group>

      {/* Floor indicator */}
      <FloorIndicator position={[0, 1.5, 0.1]} />
    </group>
  );
}

// Company sign
function CompanySign() {
  return (
    <group position={[0, 3.2, -4.9]}>
      <mesh>
        <boxGeometry args={[3, 0.5, 0.05]} />
        <meshStandardMaterial color="#1e3a5f" />
      </mesh>
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[2.8, 0.4]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

export function Lobby({ onElevatorUse }: FloorProps) {
  return (
    <group>
      <Room />
      <ReceptionDesk />
      <MetalDetector position={[-1.5, 0, 1]} />
      <MetalDetector position={[1.5, 0, 1]} />
      <CardReader position={[-2.5, 0, 1]} />
      <CardReader position={[2.5, 0, 1]} />
      <AlarmPanel />
      <SeatingArea />
      <ElevatorDoor onUse={onElevatorUse} />
      <CompanySign />
    </group>
  );
}

export default Lobby;
