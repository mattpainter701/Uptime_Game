/**
 * PlayerOffice.tsx - Basement floor: Player's personal office
 *
 * A bright, modern Chicago-style office with:
 * - Large windows with city view
 * - Modern desk setup with triple monitors
 * - Gaming chair
 * - Personal decorations
 * - Elevator access
 */

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Html } from '@react-three/drei';
import * as THREE from 'three';
import { FloorIndicator } from '../FloorIndicator';
import { useGameStore } from '../../../store/gameStore';
import type { ItemId } from '../../../types/game';
import { ITEM_DEFINITIONS } from '../../../types/game';

interface FloorProps {
  onElevatorUse: () => void;
}

// Bright, modern color palette
const COLORS = {
  // Walls & Structure
  wallLight: '#f5f5f5',
  wallAccent: '#e8e8e8',
  ceiling: '#ffffff',
  floorWood: '#c4a882',
  floorCarpet: '#4a5568',

  // Furniture
  deskWhite: '#f0f0f0',
  deskMetal: '#a0a0a0',
  chairBlack: '#2d2d2d',

  // Accents
  plantGreen: '#4ade80',
  accentBlue: '#3b82f6',
  accentOrange: '#f97316',
  wood: '#8b6f47',

  // Tech
  screenGlow: '#10b981',
  ledBlue: '#06b6d4',
};

// Modern L-shaped desk
function ModernDesk() {
  return (
    <group position={[0, 0, -2]}>
      {/* Main desktop - white laminate */}
      <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.03, 0.8]} />
        <meshStandardMaterial color={COLORS.deskWhite} roughness={0.3} />
      </mesh>

      {/* L-extension */}
      <mesh position={[-1.05, 0.74, 0.45]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.03, 0.7]} />
        <meshStandardMaterial color={COLORS.deskWhite} roughness={0.3} />
      </mesh>

      {/* Metal legs */}
      {[
        [-0.8, 0.37, 0.3],
        [0.8, 0.37, 0.3],
        [-0.8, 0.37, -0.3],
        [0.8, 0.37, -0.3],
        [-1.3, 0.37, 0.7],
        [-1.3, 0.37, 0.15],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.74, 12]} />
          <meshStandardMaterial color={COLORS.deskMetal} metalness={0.8} roughness={0.2} />
        </mesh>
      ))}

      {/* Under-desk LED strip */}
      <mesh position={[0, 0.72, 0.38]}>
        <boxGeometry args={[1.75, 0.01, 0.02]} />
        <meshStandardMaterial color={COLORS.ledBlue} emissive={COLORS.ledBlue} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

// Triple ultrawide monitor setup
function MonitorSetup() {
  const screenRefs = [
    useRef<THREE.Mesh>(null),
    useRef<THREE.Mesh>(null),
    useRef<THREE.Mesh>(null),
  ];

  useFrame((state) => {
    screenRefs.forEach((ref, i) => {
      if (ref.current) {
        const mat = ref.current.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.3 + Math.sin(state.clock.elapsedTime * 1.5 + i * 0.7) * 0.1;
      }
    });
  });

  const Monitor = ({ ref, width, height, angle = 0, posX = 0 }: {
    ref: React.RefObject<THREE.Mesh | null>;
    width: number;
    height: number;
    angle?: number;
    posX?: number;
  }) => (
    <group position={[posX, 0, 0]} rotation={[0, angle, 0]}>
      {/* Thin bezel */}
      <mesh castShadow>
        <boxGeometry args={[width + 0.015, height + 0.015, 0.015]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
      </mesh>
      {/* Screen */}
      <mesh ref={ref} position={[0, 0, 0.008]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          color="#0a1520"
          emissive={COLORS.screenGlow}
          emissiveIntensity={0.3}
        />
      </mesh>
      {/* Stand arm */}
      <mesh position={[0, -height / 2 - 0.1, -0.05]}>
        <boxGeometry args={[0.03, 0.15, 0.03]} />
        <meshStandardMaterial color={COLORS.deskMetal} metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );

  return (
    <group position={[0, 1.05, -2.35]}>
      <Monitor ref={screenRefs[0]} width={0.65} height={0.38} />
      <Monitor ref={screenRefs[1]} width={0.5} height={0.3} posX={-0.52} angle={0.35} />
      <Monitor ref={screenRefs[2]} width={0.5} height={0.3} posX={0.52} angle={-0.35} />
    </group>
  );
}

// Ergonomic office chair - facing desk (toward -Z)
function OfficeChair() {
  return (
    <group position={[0, 0, -1.15]}>
      {/* Seat */}
      <mesh position={[0, 0.48, 0]} castShadow>
        <boxGeometry args={[0.5, 0.08, 0.5]} />
        <meshStandardMaterial color={COLORS.chairBlack} roughness={0.7} />
      </mesh>
      {/* Backrest - toward +Z (behind seated player who faces -Z) */}
      <mesh position={[0, 0.85, 0.22]} castShadow>
        <boxGeometry args={[0.48, 0.55, 0.06]} />
        <meshStandardMaterial color={COLORS.chairBlack} roughness={0.7} />
      </mesh>
      {/* Lumbar support */}
      <mesh position={[0, 0.65, 0.18]} castShadow>
        <boxGeometry args={[0.4, 0.12, 0.04]} />
        <meshStandardMaterial color="#404040" roughness={0.6} />
      </mesh>
      {/* Headrest */}
      <mesh position={[0, 1.2, 0.2]} castShadow>
        <boxGeometry args={[0.25, 0.12, 0.05]} />
        <meshStandardMaterial color={COLORS.chairBlack} roughness={0.7} />
      </mesh>
      {/* Armrests - pads toward front (-Z) */}
      {[-0.26, 0.26].map((x, i) => (
        <group key={i} position={[x, 0.58, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.04, 0.15, 0.03]} />
            <meshStandardMaterial color="#404040" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.08, -0.08]}>
            <boxGeometry args={[0.06, 0.025, 0.18]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.8} />
          </mesh>
        </group>
      ))}
      {/* Base */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.42, 12]} />
        <meshStandardMaterial color="#555" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.03, 5]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Wheels */}
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * 0.25, 0.025, Math.sin(angle) * 0.25]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.025, 0.025, 0.04, 12]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
          </mesh>
        );
      })}
    </group>
  );
}

// Computer interaction button
function ComputerInteraction() {
  const setView = useGameStore((state) => state.setView);
  const pose = useGameStore((state) => state.playerPosition.pose);
  const playerPos = useGameStore((state) => state.playerPosition);
  const [hovered, setHovered] = useState(false);
  const buttonRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  // Show when seated OR when standing near the desk
  const isNearDesk = pose === 'seated' ||
    (Math.abs(playerPos.x) < 2 && playerPos.z < 0.5 && playerPos.z > -3);

  useFrame((state) => {
    if (buttonRef.current && isNearDesk) {
      const mat = buttonRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = hovered
        ? 1.2 + Math.sin(state.clock.elapsedTime * 6) * 0.3
        : 0.6 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
    }
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = hovered ? 0.6 : 0.3 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
    }
  });

  // Only show when near desk
  if (!isNearDesk) return null;

  return (
    <group position={[0, 1.25, -2.15]}>
      {/* Large glowing button frame */}
      <Float speed={1.5} rotationIntensity={0} floatIntensity={0.05}>
        <group>
          {/* Outer glow ring */}
          <mesh ref={glowRef} position={[0, 0, -0.02]}>
            <boxGeometry args={[0.7, 0.25, 0.02]} />
            <meshStandardMaterial
              color="#00ffaa"
              emissive="#00ffaa"
              emissiveIntensity={0.8}
              transparent
              opacity={0.4}
            />
          </mesh>

          {/* Main clickable button */}
          <mesh
            ref={buttonRef}
            onClick={() => setView('terminal')}
            onPointerOver={() => {
              setHovered(true);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              setHovered(false);
              document.body.style.cursor = 'default';
            }}
          >
            <boxGeometry args={[0.6, 0.18, 0.04]} />
            <meshStandardMaterial
              color={hovered ? "#00ffcc" : "#00aa88"}
              emissive={hovered ? "#00ffcc" : "#00aa88"}
              emissiveIntensity={0.8}
            />
          </mesh>

          {/* Icon/Text on button */}
          <Html position={[0, 0, 0.03]} center>
            <div className={`text-center whitespace-nowrap pointer-events-none transition-all duration-200 ${
              hovered ? 'scale-110' : ''
            }`}>
              <div className="flex items-center gap-2 bg-gray-900/95 border-2 border-cyan-400 rounded-lg px-5 py-3 shadow-lg"
                   style={{ boxShadow: hovered ? '0 0 20px #00ffaa' : '0 0 10px #00aa88' }}>
                <span className="text-2xl">💻</span>
                <div>
                  <div className="text-cyan-400 font-bold text-base">USE COMPUTER</div>
                  <div className="text-gray-400 text-xs">Click or Press [F]</div>
                </div>
              </div>
            </div>
          </Html>

          {/* Point light for glow */}
          <pointLight
            position={[0, 0, 0.2]}
            color="#00ffaa"
            intensity={hovered ? 0.8 : 0.4}
            distance={2}
          />
        </group>
      </Float>
    </group>
  );
}

// Keyboard and mouse
function DeskAccessories() {
  const rgbRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (rgbRef.current) {
      const hue = (state.clock.elapsedTime * 0.1) % 1;
      (rgbRef.current.material as THREE.MeshStandardMaterial).emissive.setHSL(hue, 1, 0.5);
    }
  });

  return (
    <group>
      {/* Keyboard */}
      <group position={[0, 0.77, -1.7]}>
        <mesh castShadow>
          <boxGeometry args={[0.38, 0.02, 0.14]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
        </mesh>
        <mesh ref={rgbRef} position={[0, -0.005, 0]}>
          <boxGeometry args={[0.4, 0.008, 0.16]} />
          <meshStandardMaterial color="#000" emissive="#ff00ff" emissiveIntensity={0.3} transparent opacity={0.8} />
        </mesh>
      </group>

      {/* Mouse pad */}
      <mesh position={[0.35, 0.755, -1.7]}>
        <boxGeometry args={[0.32, 0.004, 0.28]} />
        <meshStandardMaterial color="#1f2937" roughness={0.9} />
      </mesh>

      {/* Mouse */}
      <mesh position={[0.35, 0.77, -1.7]} castShadow>
        <boxGeometry args={[0.055, 0.025, 0.09]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.4} />
      </mesh>

      {/* Coffee mug */}
      <group position={[-0.65, 0.77, -1.6]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.035, 0.03, 0.09, 16]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
        <mesh position={[0.04, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.022, 0.007, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

// Office Printer
function Printer() {
  return (
    <group position={[-3.5, 0, -3]}>
      {/* Printer stand */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[0.6, 0.7, 0.5]} />
        <meshStandardMaterial color="#e8e8e8" roughness={0.5} />
      </mesh>
      {/* Printer body */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[0.55, 0.25, 0.45]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.4} />
      </mesh>
      {/* Paper tray */}
      <mesh position={[0, 0.72, 0.15]} castShadow>
        <boxGeometry args={[0.4, 0.03, 0.25]} />
        <meshStandardMaterial color="#404040" />
      </mesh>
      {/* Paper */}
      <mesh position={[0, 0.74, 0.15]}>
        <boxGeometry args={[0.35, 0.02, 0.2]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* Control panel */}
      <mesh position={[0.2, 0.98, 0.15]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[0.12, 0.02, 0.08]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Status LED */}
      <mesh position={[0.15, 0.99, 0.18]}>
        <sphereGeometry args={[0.008, 8, 8]} />
        <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

// Filing Cabinet
function FilingCabinet() {
  return (
    <group position={[-4, 0, 0]}>
      {/* Cabinet body */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[0.5, 1.2, 0.55]} />
        <meshStandardMaterial color="#555" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Drawers */}
      {[0.9, 0.5, 0.1].map((y, i) => (
        <group key={i} position={[0, y, 0.28]}>
          <mesh castShadow>
            <boxGeometry args={[0.46, 0.35, 0.02]} />
            <meshStandardMaterial color="#666" metalness={0.5} roughness={0.4} />
          </mesh>
          {/* Handle */}
          <mesh position={[0, 0, 0.02]}>
            <boxGeometry args={[0.12, 0.03, 0.02]} />
            <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Large Floor Plant
function FloorPlant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Pot */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.15, 0.4, 12]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.8} />
      </mesh>
      {/* Soil */}
      <mesh position={[0, 0.38, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.05, 12]} />
        <meshStandardMaterial color="#3d2817" roughness={0.9} />
      </mesh>
      {/* Main trunk */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 0.6, 8]} />
        <meshStandardMaterial color="#5d4037" roughness={0.8} />
      </mesh>
      {/* Leaves - multiple spheres */}
      {[
        [0, 1.1, 0], [-0.15, 1.0, 0.1], [0.15, 1.0, -0.1],
        [0.1, 0.95, 0.15], [-0.1, 1.05, -0.12], [0, 0.9, 0.1]
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <sphereGeometry args={[0.12 + Math.random() * 0.05, 8, 8]} />
          <meshStandardMaterial color={i % 2 === 0 ? "#2d5a27" : "#3d7a37"} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// Coat Rack
function CoatRack() {
  return (
    <group position={[3.5, 0, 3.5]}>
      {/* Base */}
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.04, 16]} />
        <meshStandardMaterial color="#333" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Pole */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 1.8, 12]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Hooks */}
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle, i) => (
        <group key={i} position={[0, 1.7, 0]} rotation={[0, angle, 0]}>
          <mesh position={[0.1, 0, 0]} rotation={[0, 0, -Math.PI / 4]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.15, 8]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ))}
      {/* A jacket hanging */}
      <mesh position={[0.12, 1.3, 0]} rotation={[0, 0.2, 0.1]} castShadow>
        <boxGeometry args={[0.3, 0.5, 0.1]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.8} />
      </mesh>
    </group>
  );
}

// Wall Art / Poster
function WallArt({ position, rotation = [0, 0, 0] as [number, number, number] }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Frame */}
      <mesh castShadow>
        <boxGeometry args={[0.6, 0.8, 0.03]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.5} />
      </mesh>
      {/* Art */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[0.52, 0.72]} />
        <meshStandardMaterial color="#1a365d" />
      </mesh>
      {/* Abstract design */}
      <mesh position={[-0.1, 0.1, 0.025]}>
        <circleGeometry args={[0.15, 16]} />
        <meshStandardMaterial color="#f97316" />
      </mesh>
      <mesh position={[0.12, -0.1, 0.025]}>
        <circleGeometry args={[0.1, 16]} />
        <meshStandardMaterial color="#06b6d4" />
      </mesh>
    </group>
  );
}

// Small desk plant
function DeskPlant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.05, 0.04, 0.08, 12]} />
        <meshStandardMaterial color="#e8e0d5" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.08, 0]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color={COLORS.plantGreen} roughness={0.8} />
      </mesh>
    </group>
  );
}

// Water cooler
function WaterCooler() {
  return (
    <group position={[4, 0, -2]}>
      {/* Base */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[0.35, 0.3, 0.35]} />
        <meshStandardMaterial color="#e0e0e0" roughness={0.5} />
      </mesh>
      {/* Main body */}
      <mesh position={[0, 0.65, 0]} castShadow>
        <boxGeometry args={[0.32, 0.7, 0.32]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.4} />
      </mesh>
      {/* Water bottle */}
      <mesh position={[0, 1.25, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.1, 0.5, 16]} />
        <meshStandardMaterial color="#b8d4e8" transparent opacity={0.6} />
      </mesh>
      {/* Water inside */}
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.3, 16]} />
        <meshStandardMaterial color="#4a90d9" transparent opacity={0.5} />
      </mesh>
      {/* Spigots */}
      <mesh position={[-0.08, 0.55, 0.17]}>
        <cylinderGeometry args={[0.015, 0.015, 0.04, 8]} />
        <meshStandardMaterial color="#cc0000" />
      </mesh>
      <mesh position={[0.08, 0.55, 0.17]}>
        <cylinderGeometry args={[0.015, 0.015, 0.04, 8]} />
        <meshStandardMaterial color="#0066cc" />
      </mesh>
      {/* Drip tray */}
      <mesh position={[0, 0.38, 0.12]}>
        <boxGeometry args={[0.2, 0.02, 0.08]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      {/* Cup dispenser */}
      <mesh position={[0.2, 0.8, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 0.15, 12]} />
        <meshStandardMaterial color="#f0f0f0" />
      </mesh>
    </group>
  );
}

// Trash bin
function TrashBin() {
  return (
    <group position={[1.2, 0, -1.5]}>
      {/* Bin body */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.1, 0.4, 12]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.3} roughness={0.6} />
      </mesh>
      {/* Rim */}
      <mesh position={[0, 0.4, 0]}>
        <torusGeometry args={[0.12, 0.015, 8, 24]} />
        <meshStandardMaterial color="#5a5a5a" metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Some crumpled paper inside */}
      {[[-0.03, 0.25, 0.02], [0.04, 0.28, -0.03], [0, 0.22, 0]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <dodecahedronGeometry args={[0.03, 0]} />
          <meshStandardMaterial color="#f5f5f0" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// Desk lamp
function DeskLamp() {
  return (
    <group position={[0.75, 0.77, -2.2]}>
      {/* Base */}
      <mesh castShadow>
        <cylinderGeometry args={[0.06, 0.07, 0.02, 12]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Arm */}
      <mesh position={[0, 0.15, 0]} rotation={[0.2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.008, 0.008, 0.25, 8]} />
        <meshStandardMaterial color="#333" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Head */}
      <group position={[0, 0.28, 0.05]} rotation={[0.6, 0, 0]}>
        <mesh castShadow>
          <coneGeometry args={[0.06, 0.08, 12, 1, true]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.5} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.02, 0]}>
          <sphereGeometry args={[0.02, 12, 12]} />
          <meshStandardMaterial color="#fffaf0" emissive="#fff5e0" emissiveIntensity={0.8} />
        </mesh>
        <pointLight position={[0, -0.05, 0]} color="#fff5e0" intensity={0.2} distance={1} />
      </group>
    </group>
  );
}

// Large windows with Chicago skyline
function Windows() {
  return (
    <group position={[3.5, 2, -4.9]}>
      {/* Window frame */}
      <mesh>
        <boxGeometry args={[5, 3.5, 0.1]} />
        <meshStandardMaterial color="#d4d4d4" metalness={0.4} roughness={0.4} />
      </mesh>

      {/* Glass panes - 3 sections */}
      {[-1.5, 0, 1.5].map((x, i) => (
        <mesh key={i} position={[x, 0, 0.06]}>
          <planeGeometry args={[1.4, 3.2]} />
          <meshStandardMaterial color="#87ceeb" transparent opacity={0.25} roughness={0.1} />
        </mesh>
      ))}

      {/* Window dividers */}
      {[-0.75, 0.75].map((x, i) => (
        <mesh key={i} position={[x, 0, 0.06]}>
          <boxGeometry args={[0.04, 3.3, 0.02]} />
          <meshStandardMaterial color="#d4d4d4" />
        </mesh>
      ))}

      {/* Window sill */}
      <mesh position={[0, -1.8, 0.12]}>
        <boxGeometry args={[5.2, 0.06, 0.2]} />
        <meshStandardMaterial color="#e8e8e8" roughness={0.5} />
      </mesh>
    </group>
  );
}

// Chicago-style city view
function CityView() {
  const buildings = Array.from({ length: 40 }, (_, i) => ({
    height: 4 + Math.random() * 20,
    width: 0.8 + Math.random() * 2,
    depth: 0.8 + Math.random() * 2,
    x: (i - 20) * 1.5 + (Math.random() - 0.5),
    z: -15 - Math.random() * 25,
    color: `hsl(210, ${5 + Math.random() * 10}%, ${50 + Math.random() * 20}%)`,
  }));

  return (
    <group position={[3.5, -2, 0]}>
      {buildings.map((b, i) => (
        <group key={i}>
          <mesh position={[b.x, b.height / 2, b.z]}>
            <boxGeometry args={[b.width, b.height, b.depth]} />
            <meshStandardMaterial color={b.color} roughness={0.7} />
          </mesh>
          {/* Windows on some buildings */}
          {i % 2 === 0 && (
            <group position={[b.x, 0, b.z + b.depth / 2 + 0.01]}>
              {Array.from({ length: Math.min(Math.floor(b.height / 0.8), 10) }, (_, row) => (
                <group key={row}>
                  {Array.from({ length: Math.floor(b.width / 0.4) }, (_, col) =>
                    Math.random() > 0.3 && (
                      <mesh
                        key={col}
                        position={[(col - Math.floor(b.width / 0.4) / 2) * 0.35, row * 0.7 + 0.5, 0]}
                      >
                        <planeGeometry args={[0.18, 0.35]} />
                        <meshStandardMaterial
                          color="#ffffa0"
                          emissive="#ffff60"
                          emissiveIntensity={Math.random() * 0.3 + 0.1}
                        />
                      </mesh>
                    )
                  )}
                </group>
              ))}
            </group>
          )}
        </group>
      ))}
    </group>
  );
}

// Room structure
function Room() {
  return (
    <group>
      {/* Floor - hardwood with area rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color={COLORS.floorWood} roughness={0.6} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.005, -1.5]}>
        <planeGeometry args={[4, 3]} />
        <meshStandardMaterial color={COLORS.floorCarpet} roughness={0.9} />
      </mesh>

      {/* Sit zone indicator */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -1.5]}>
        <ringGeometry args={[1.35, 1.4, 32]} />
        <meshStandardMaterial color={COLORS.accentBlue} emissive={COLORS.accentBlue} emissiveIntensity={0.2} />
      </mesh>

      {/* Walls - light colored */}
      {/* Back wall (z=-5) */}
      <mesh position={[0, 2, -5]} receiveShadow>
        <boxGeometry args={[12, 4, 0.12]} />
        <meshStandardMaterial color={COLORS.wallLight} roughness={0.9} />
      </mesh>
      {/* Left wall (x=-5) - has elevator */}
      <mesh position={[-5, 2, 0]} receiveShadow>
        <boxGeometry args={[0.12, 4, 12]} />
        <meshStandardMaterial color={COLORS.wallAccent} roughness={0.9} />
      </mesh>
      {/* Right wall (x=5) */}
      <mesh position={[5, 2, 0]} receiveShadow>
        <boxGeometry args={[0.12, 4, 12]} />
        <meshStandardMaterial color={COLORS.wallAccent} roughness={0.9} />
      </mesh>
      {/* Front wall (z=5) */}
      <mesh position={[0, 2, 5]} receiveShadow>
        <boxGeometry args={[12, 4, 0.12]} />
        <meshStandardMaterial color={COLORS.wallLight} roughness={0.9} />
      </mesh>

      {/* Wall trim/baseboard */}
      {/* Back wall baseboard */}
      <mesh position={[0, 0.1, -4.9]}>
        <boxGeometry args={[10, 0.2, 0.05]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>
      {/* Front wall baseboard */}
      <mesh position={[0, 0.1, 4.9]}>
        <boxGeometry args={[10, 0.2, 0.05]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>
      {/* Left wall baseboard */}
      <mesh position={[-4.9, 0.1, 0]}>
        <boxGeometry args={[0.05, 0.2, 10]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>
      {/* Right wall baseboard */}
      <mesh position={[4.9, 0.1, 0]}>
        <boxGeometry args={[0.05, 0.2, 10]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, 4, 0]}>
        <boxGeometry args={[12, 0.1, 12]} />
        <meshStandardMaterial color={COLORS.ceiling} roughness={0.9} />
      </mesh>

      {/* Ceiling lights - modern recessed */}
      {[[-2, -2], [2, -2], [-2, 2], [2, 2]].map(([x, z], i) => (
        <group key={i} position={[x, 3.95, z]}>
          <mesh>
            <boxGeometry args={[0.6, 0.02, 0.6]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.8} />
          </mesh>
          <pointLight position={[0, -0.5, 0]} color="#fff8f0" intensity={0.5} distance={5} />
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
    <group position={[-4.9, 1.5, 2]} rotation={[0, Math.PI / 2, 0]}>
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

      {/* Large call button panel - more visible */}
      <group position={[0.85, -0.3, 0.1]}>
        {/* Panel background */}
        <mesh>
          <boxGeometry args={[0.2, 0.35, 0.03]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.5} />
        </mesh>

        {/* "ELEVATOR" label area */}
        <mesh position={[0, 0.12, 0.02]}>
          <boxGeometry args={[0.16, 0.06, 0.01]} />
          <meshStandardMaterial color="#333" />
        </mesh>

        {/* Large glowing call button */}
        <mesh
          ref={buttonRef}
          position={[0, -0.02, 0.025]}
          onClick={onUse}
          onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { document.body.style.cursor = 'default'; }}
        >
          <circleGeometry args={[0.06, 24]} />
          <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={0.8} />
        </mesh>

        {/* Button ring */}
        <mesh position={[0, -0.02, 0.02]}>
          <ringGeometry args={[0.065, 0.08, 24]} />
          <meshStandardMaterial color="#00ffaa" emissive="#00ffaa" emissiveIntensity={0.5} />
        </mesh>

        {/* Point light for glow effect */}
        <pointLight position={[0, -0.02, 0.1]} color="#00ff88" intensity={0.3} distance={1} />

        {/* Arrow up indicator */}
        <mesh position={[0, -0.12, 0.02]} rotation={[0, 0, 0]}>
          <coneGeometry args={[0.03, 0.05, 3]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
        </mesh>
      </group>

      {/* Floor indicator above door */}
      <FloorIndicator position={[0, 1.5, 0.1]} />
    </group>
  );
}

// Single collectible item - Large, detailed, realistic
function CollectibleItem({ itemId, position }: { itemId: ItemId; position: [number, number, number] }) {
  const collectItem = useGameStore((state) => state.collectItem);
  const hasItem = useGameStore((state) => state.hasItem);
  const [hovered, setHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.PointLight>(null);

  const item = ITEM_DEFINITIONS[itemId];
  const alreadyCollected = hasItem(itemId);

  useFrame((state) => {
    if (groupRef.current && !alreadyCollected) {
      // Gentle floating and rotation
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.8;
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.03;
    }
    // Pulse glow when hovered
    if (glowRef.current) {
      glowRef.current.intensity = hovered
        ? 1.5 + Math.sin(state.clock.elapsedTime * 5) * 0.5
        : 0.4 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
    }
  });

  if (alreadyCollected) return null;

  const handleClick = () => {
    const success = collectItem(itemId);
    if (success) {
      setShowTooltip(false);
    }
  };

  // Large, detailed item meshes
  const getItemMesh = () => {
    switch (itemId) {
      case 'laptop':
        return (
          <group scale={2.5}>
            {/* Base/keyboard section */}
            <mesh castShadow position={[0, 0, 0]}>
              <boxGeometry args={[0.28, 0.015, 0.2]} />
              <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Keyboard surface */}
            <mesh position={[0, 0.008, 0.02]}>
              <boxGeometry args={[0.24, 0.002, 0.12]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
            </mesh>
            {/* Trackpad */}
            <mesh position={[0, 0.008, -0.06]}>
              <boxGeometry args={[0.08, 0.002, 0.05]} />
              <meshStandardMaterial color="#333" roughness={0.5} />
            </mesh>
            {/* Screen (open at angle) */}
            <group position={[0, 0.007, 0.1]} rotation={[-1.2, 0, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.28, 0.18, 0.008]} />
                <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.3} />
              </mesh>
              {/* Display */}
              <mesh position={[0, 0, 0.005]}>
                <boxGeometry args={[0.24, 0.15, 0.001]} />
                <meshStandardMaterial color="#0a1a2e" emissive="#0066aa" emissiveIntensity={0.4} />
              </mesh>
              {/* Apple/brand logo */}
              <mesh position={[0, 0, -0.005]}>
                <circleGeometry args={[0.015, 16]} />
                <meshStandardMaterial color="#666" emissive="#888" emissiveIntensity={0.2} />
              </mesh>
            </group>
          </group>
        );

      case 'console-cable':
        return (
          <group scale={2.5}>
            {/* Coiled cable */}
            <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.06, 0.012, 12, 32]} />
              <meshStandardMaterial color="#0066cc" roughness={0.6} />
            </mesh>
            {/* Inner coil */}
            <mesh castShadow rotation={[Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
              <torusGeometry args={[0.035, 0.01, 12, 32]} />
              <meshStandardMaterial color="#0055aa" roughness={0.6} />
            </mesh>
            {/* RJ45 connector 1 */}
            <group position={[0.08, 0, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.025, 0.015, 0.012]} />
                <meshStandardMaterial color="#f0f0f0" roughness={0.4} />
              </mesh>
              <mesh position={[0.008, 0, 0]}>
                <boxGeometry args={[0.012, 0.008, 0.01]} />
                <meshStandardMaterial color="#ffd700" metalness={0.8} />
              </mesh>
            </group>
            {/* Serial connector */}
            <group position={[-0.08, 0, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.03, 0.012, 0.018]} />
                <meshStandardMaterial color="#4a90d9" roughness={0.4} />
              </mesh>
            </group>
          </group>
        );

      case 'patch-cable':
        return (
          <group scale={2.5}>
            {/* Coiled yellow cable */}
            <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.055, 0.01, 12, 32]} />
              <meshStandardMaterial color="#ffcc00" roughness={0.5} />
            </mesh>
            <mesh castShadow rotation={[Math.PI / 2, 0.3, 0]} position={[0, 0.015, 0]}>
              <torusGeometry args={[0.04, 0.009, 12, 32]} />
              <meshStandardMaterial color="#ffdd33" roughness={0.5} />
            </mesh>
            {/* RJ45 connectors */}
            {[0.07, -0.07].map((x, i) => (
              <group key={i} position={[x, 0, 0]}>
                <mesh castShadow>
                  <boxGeometry args={[0.022, 0.014, 0.01]} />
                  <meshStandardMaterial color="#e8e8e8" roughness={0.3} />
                </mesh>
                <mesh position={[i === 0 ? 0.006 : -0.006, 0, 0]}>
                  <boxGeometry args={[0.008, 0.006, 0.008]} />
                  <meshStandardMaterial color="#ffd700" metalness={0.9} />
                </mesh>
              </group>
            ))}
          </group>
        );

      case 'fiber-module':
        return (
          <group scale={3}>
            {/* SFP module body */}
            <mesh castShadow>
              <boxGeometry args={[0.055, 0.012, 0.015]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
            </mesh>
            {/* Green status LED */}
            <mesh position={[0.02, 0.007, 0]}>
              <cylinderGeometry args={[0.003, 0.003, 0.002, 8]} />
              <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={1} />
            </mesh>
            {/* LC connectors */}
            <group position={[-0.025, 0, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.008, 0.008, 0.012]} />
                <meshStandardMaterial color="#00cc88" metalness={0.5} roughness={0.3} />
              </mesh>
            </group>
            {/* Metal clip */}
            <mesh position={[0.015, 0.008, 0]}>
              <boxGeometry args={[0.02, 0.004, 0.012]} />
              <meshStandardMaterial color="#888" metalness={0.9} roughness={0.2} />
            </mesh>
            {/* Label */}
            <mesh position={[0, 0.007, 0]}>
              <planeGeometry args={[0.03, 0.008]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          </group>
        );

      case 'ssd':
        return (
          <group scale={2.2}>
            {/* 2.5" SSD body */}
            <mesh castShadow>
              <boxGeometry args={[0.1, 0.01, 0.07]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.4} />
            </mesh>
            {/* Top label/sticker */}
            <mesh position={[0, 0.006, 0]}>
              <boxGeometry args={[0.085, 0.001, 0.055]} />
              <meshStandardMaterial color="#2a4a6a" roughness={0.7} />
            </mesh>
            {/* Brand area */}
            <mesh position={[-0.02, 0.007, 0.01]}>
              <planeGeometry args={[0.04, 0.015]} />
              <meshStandardMaterial color="#ff4444" />
            </mesh>
            {/* Capacity label */}
            <mesh position={[0.02, 0.007, -0.015]}>
              <planeGeometry args={[0.03, 0.01]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            {/* SATA connector */}
            <mesh position={[0.045, -0.002, 0]}>
              <boxGeometry args={[0.015, 0.006, 0.04]} />
              <meshStandardMaterial color="#333" />
            </mesh>
            <mesh position={[0.048, -0.002, 0]}>
              <boxGeometry args={[0.004, 0.004, 0.035]} />
              <meshStandardMaterial color="#ffd700" metalness={0.9} />
            </mesh>
          </group>
        );

      case 'usb-drive':
        return (
          <group scale={3}>
            {/* USB body */}
            <mesh castShadow>
              <boxGeometry args={[0.05, 0.012, 0.018]} />
              <meshStandardMaterial color="#cc0000" roughness={0.4} />
            </mesh>
            {/* Metal USB connector */}
            <mesh position={[-0.032, 0, 0]} castShadow>
              <boxGeometry args={[0.018, 0.006, 0.014]} />
              <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.2} />
            </mesh>
            {/* USB-A port inside */}
            <mesh position={[-0.035, 0, 0]}>
              <boxGeometry args={[0.012, 0.003, 0.01]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            {/* LED indicator */}
            <mesh position={[0.015, 0.007, 0]}>
              <cylinderGeometry args={[0.002, 0.002, 0.002, 8]} />
              <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.8} />
            </mesh>
            {/* Keyring loop */}
            <mesh position={[0.03, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[0.006, 0.002, 8, 16]} />
              <meshStandardMaterial color="#888" metalness={0.8} />
            </mesh>
          </group>
        );

      case 'crimping-tool':
        return (
          <group scale={2} rotation={[0, 0, 0.2]}>
            {/* Handle 1 */}
            <mesh castShadow position={[-0.06, 0, 0]}>
              <boxGeometry args={[0.12, 0.025, 0.02]} />
              <meshStandardMaterial color="#ff6600" roughness={0.6} />
            </mesh>
            {/* Handle 2 */}
            <mesh castShadow position={[-0.06, 0.02, 0]} rotation={[0, 0, 0.15]}>
              <boxGeometry args={[0.12, 0.025, 0.02]} />
              <meshStandardMaterial color="#ff6600" roughness={0.6} />
            </mesh>
            {/* Grip texture on handles */}
            {[-0.08, -0.05, -0.02].map((x, i) => (
              <mesh key={i} position={[x, 0, 0.011]}>
                <boxGeometry args={[0.015, 0.022, 0.002]} />
                <meshStandardMaterial color="#cc5500" roughness={0.8} />
              </mesh>
            ))}
            {/* Metal head */}
            <mesh castShadow position={[0.04, 0.01, 0]}>
              <boxGeometry args={[0.06, 0.05, 0.025]} />
              <meshStandardMaterial color="#444" metalness={0.8} roughness={0.3} />
            </mesh>
            {/* Crimping die */}
            <mesh position={[0.05, 0.01, 0]}>
              <boxGeometry args={[0.025, 0.03, 0.015]} />
              <meshStandardMaterial color="#666" metalness={0.9} roughness={0.2} />
            </mesh>
            {/* Pivot point */}
            <mesh position={[0.01, 0.01, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.03, 12]} />
              <meshStandardMaterial color="#888" metalness={0.8} />
            </mesh>
          </group>
        );

      default:
        return (
          <mesh castShadow>
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshStandardMaterial color="#888" />
          </mesh>
        );
    }
  };

  return (
    <group position={position}>
      {/* Base glow platform */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <circleGeometry args={[0.15, 32]} />
        <meshStandardMaterial
          color={hovered ? "#00ffaa" : "#006644"}
          emissive={hovered ? "#00ffaa" : "#004422"}
          emissiveIntensity={hovered ? 0.8 : 0.3}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Outer glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
        <ringGeometry args={[0.14, 0.18, 32]} />
        <meshStandardMaterial
          color="#00ffaa"
          emissive="#00ffaa"
          emissiveIntensity={hovered ? 1.5 : 0.5}
          transparent
          opacity={hovered ? 0.9 : 0.4}
        />
      </mesh>

      {/* Item */}
      <group
        ref={groupRef}
        onClick={handleClick}
        onPointerOver={() => {
          setHovered(true);
          setShowTooltip(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          setShowTooltip(false);
          document.body.style.cursor = 'default';
        }}
      >
        {getItemMesh()}
      </group>

      {/* Glow light */}
      <pointLight
        ref={glowRef}
        position={[0, 0.1, 0]}
        color="#00ffaa"
        intensity={0.5}
        distance={1.5}
      />

      {/* Tooltip */}
      {showTooltip && (
        <Html position={[0, 0.35, 0]} center>
          <div className="bg-gray-900/95 border-2 border-cyan-400 rounded-lg px-4 py-3 text-center whitespace-nowrap pointer-events-none shadow-lg shadow-cyan-500/30">
            <div className="text-cyan-400 font-bold text-base">{item.icon} {item.name}</div>
            <div className="text-gray-300 text-sm mt-1 max-w-48">{item.description}</div>
            <div className="text-green-400 text-sm mt-2 font-bold">[ Click to Collect ]</div>
          </div>
        </Html>
      )}
    </group>
  );
}

// Supply table with collectible items - Larger industrial style
function SupplyTable() {
  const setView = useGameStore((state) => state.setView);
  const [signHovered, setSignHovered] = useState(false);

  return (
    <group position={[2.5, 0, 2.5]}>
      {/* Industrial metal table surface */}
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.05, 1.2]} />
        <meshStandardMaterial color="#505860" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Table edge trim */}
      <mesh position={[0, 0.73, 0.625]}>
        <boxGeometry args={[2.45, 0.08, 0.02]} />
        <meshStandardMaterial color="#3a4048" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.73, -0.625]}>
        <boxGeometry args={[2.45, 0.08, 0.02]} />
        <meshStandardMaterial color="#3a4048" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Sturdy metal legs */}
      {[
        [-1.0, 0.375, 0.45],
        [1.0, 0.375, 0.45],
        [-1.0, 0.375, -0.45],
        [1.0, 0.375, -0.45],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <boxGeometry args={[0.08, 0.75, 0.08]} />
          <meshStandardMaterial color="#404850" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}

      {/* Cross braces */}
      <mesh position={[0, 0.25, 0.45]}>
        <boxGeometry args={[2.0, 0.04, 0.04]} />
        <meshStandardMaterial color="#404850" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.25, -0.45]}>
        <boxGeometry args={[2.0, 0.04, 0.04]} />
        <meshStandardMaterial color="#404850" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Glowing "EQUIPMENT SUPPLY" sign above - Clickable to open shop */}
      <group position={[0, 1.4, 0]}>
        {/* Sign backing */}
        <mesh>
          <boxGeometry args={[1.2, 0.25, 0.04]} />
          <meshStandardMaterial color="#1a1a2e" />
        </mesh>
        {/* Glowing border */}
        <mesh position={[0, 0, 0.025]}>
          <boxGeometry args={[1.25, 0.3, 0.01]} />
          <meshStandardMaterial
            color={signHovered ? "#00ffff" : "#00ccff"}
            emissive={signHovered ? "#00ffff" : "#00ccff"}
            emissiveIntensity={signHovered ? 0.6 : 0.3}
            transparent
            opacity={signHovered ? 0.5 : 0.3}
          />
        </mesh>
        <Html position={[0, 0, 0.03]} center>
          <div
            className={`font-bold text-lg whitespace-nowrap tracking-wider cursor-pointer transition-all ${
              signHovered ? 'text-white scale-105' : 'text-cyan-400'
            }`}
            style={{ textShadow: signHovered ? '0 0 15px #ffffff, 0 0 30px #00ffff' : '0 0 10px #00ffff, 0 0 20px #00ffff' }}
            onClick={() => setView('shop')}
            onMouseEnter={() => setSignHovered(true)}
            onMouseLeave={() => setSignHovered(false)}
          >
            EQUIPMENT SUPPLY
          </div>
        </Html>
        {/* Sign lights */}
        <pointLight position={[0, -0.2, 0.1]} color="#00ccff" intensity={signHovered ? 0.8 : 0.5} distance={2} />
      </group>

      {/* Items on table - spread out in two rows */}
      {/* Front row */}
      <CollectibleItem itemId="laptop" position={[-0.8, 0.85, 0.3]} />
      <CollectibleItem itemId="console-cable" position={[-0.25, 0.85, 0.3]} />
      <CollectibleItem itemId="patch-cable" position={[0.3, 0.85, 0.3]} />
      <CollectibleItem itemId="crimping-tool" position={[0.85, 0.85, 0.3]} />

      {/* Back row */}
      <CollectibleItem itemId="ssd" position={[-0.55, 0.85, -0.3]} />
      <CollectibleItem itemId="fiber-module" position={[0.05, 0.85, -0.3]} />
      <CollectibleItem itemId="usb-drive" position={[0.6, 0.85, -0.3]} />
    </group>
  );
}

// Office Dog - Loyal companion lying on a dog bed
// Office Dog - Realistic Golden Retriever lying on bed
function OfficeDog() {
  const tailRef = useRef<THREE.Group>(null);
  const earRefs = useRef<(THREE.Mesh | null)[]>([]);
  const breathRef = useRef<THREE.Group>(null);

  // Fur color palette for Golden Retriever
  const furLight = '#e8c872';
  const furMid = '#d4a84b';
  const furDark = '#b8923a';
  const furChest = '#f0d890';

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Gentle tail wag
    if (tailRef.current) {
      tailRef.current.rotation.z = Math.sin(t * 2) * 0.15;
      tailRef.current.rotation.y = Math.sin(t * 2.5) * 0.1;
    }
    // Subtle ear twitch
    earRefs.current.forEach((ear, i) => {
      if (ear) {
        ear.rotation.x = Math.sin(t * 0.5 + i * Math.PI) * 0.05;
      }
    });
    // Breathing motion
    if (breathRef.current) {
      breathRef.current.scale.y = 1 + Math.sin(t * 1.5) * 0.02;
    }
  });

  return (
    <group position={[3.5, 0, -3.5]}>
      {/* Plush dog bed with raised edges */}
      <group>
        {/* Bed base */}
        <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.55, 0.6, 0.12, 24]} />
          <meshStandardMaterial color="#5c4033" roughness={0.9} />
        </mesh>
        {/* Bed rim/bolster */}
        <mesh position={[0, 0.15, 0]} castShadow>
          <torusGeometry args={[0.48, 0.08, 12, 24]} rotation={[Math.PI / 2, 0, 0]} />
          <meshStandardMaterial color="#6b4423" roughness={0.85} />
        </mesh>
        {/* Inner cushion */}
        <mesh position={[0, 0.1, 0]} castShadow>
          <cylinderGeometry args={[0.4, 0.42, 0.08, 24]} />
          <meshStandardMaterial color="#8b7355" roughness={0.95} />
        </mesh>
      </group>

      {/* Dog - Golden Retriever lying in sphinx pose */}
      <group position={[0, 0.18, 0]} rotation={[0, 0.4, 0]}>
        {/* === BODY === */}
        <group ref={breathRef}>
          {/* Main torso - elongated */}
          <mesh castShadow position={[0, 0.12, 0]} rotation={[0, 0, 0]}>
            <capsuleGeometry args={[0.14, 0.35, 12, 16]} rotation={[0, 0, Math.PI / 2]} />
            <meshStandardMaterial color={furMid} roughness={0.85} />
          </mesh>
          {/* Chest - slightly lighter, fuller */}
          <mesh castShadow position={[0.15, 0.08, 0]}>
            <sphereGeometry args={[0.13, 16, 16]} />
            <meshStandardMaterial color={furChest} roughness={0.85} />
          </mesh>
          {/* Upper back */}
          <mesh castShadow position={[-0.08, 0.16, 0]}>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshStandardMaterial color={furDark} roughness={0.85} />
          </mesh>
          {/* Haunches/hips */}
          <mesh castShadow position={[-0.22, 0.1, 0]}>
            <sphereGeometry args={[0.13, 12, 12]} />
            <meshStandardMaterial color={furMid} roughness={0.85} />
          </mesh>
        </group>

        {/* === HEAD === */}
        <group position={[0.32, 0.18, 0]}>
          {/* Skull - broader, more realistic */}
          <mesh castShadow>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial color={furLight} roughness={0.85} />
          </mesh>
          {/* Forehead/brow */}
          <mesh castShadow position={[0.04, 0.04, 0]}>
            <sphereGeometry args={[0.07, 12, 12]} />
            <meshStandardMaterial color={furLight} roughness={0.85} />
          </mesh>

          {/* Muzzle - tapered snout */}
          <group position={[0.1, -0.03, 0]}>
            {/* Upper muzzle */}
            <mesh castShadow>
              <boxGeometry args={[0.1, 0.055, 0.07]} />
              <meshStandardMaterial color={furChest} roughness={0.85} />
            </mesh>
            {/* Lower jaw */}
            <mesh castShadow position={[0.01, -0.03, 0]}>
              <boxGeometry args={[0.08, 0.03, 0.055]} />
              <meshStandardMaterial color={furChest} roughness={0.85} />
            </mesh>
            {/* Nose - detailed */}
            <mesh position={[0.055, 0.01, 0]}>
              <boxGeometry args={[0.025, 0.025, 0.035]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
            </mesh>
            {/* Nose highlight */}
            <mesh position={[0.068, 0.015, 0]}>
              <sphereGeometry args={[0.008, 8, 8]} />
              <meshStandardMaterial color="#333333" roughness={0.2} />
            </mesh>
            {/* Mouth line */}
            <mesh position={[0.03, -0.02, 0]}>
              <boxGeometry args={[0.04, 0.005, 0.04]} />
              <meshStandardMaterial color="#2d2d2d" />
            </mesh>
          </group>

          {/* Eyes - warm brown, expressive */}
          {[-0.035, 0.035].map((z, i) => (
            <group key={i} position={[0.07, 0.025, z]}>
              {/* Eye socket shadow */}
              <mesh position={[-0.005, 0, 0]}>
                <sphereGeometry args={[0.022, 12, 12]} />
                <meshStandardMaterial color={furDark} roughness={0.9} />
              </mesh>
              {/* Eyeball */}
              <mesh>
                <sphereGeometry args={[0.018, 12, 12]} />
                <meshStandardMaterial color="#f5f5f0" roughness={0.3} />
              </mesh>
              {/* Iris */}
              <mesh position={[0.008, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <circleGeometry args={[0.012, 16]} />
                <meshStandardMaterial color="#5c4020" />
              </mesh>
              {/* Pupil */}
              <mesh position={[0.01, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <circleGeometry args={[0.006, 12]} />
                <meshStandardMaterial color="#1a1a1a" />
              </mesh>
              {/* Eye shine */}
              <mesh position={[0.012, 0.005, z > 0 ? -0.003 : 0.003]} rotation={[0, Math.PI / 2, 0]}>
                <circleGeometry args={[0.003, 8]} />
                <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
              </mesh>
            </group>
          ))}

          {/* Ears - floppy golden retriever ears */}
          {[-0.07, 0.07].map((z, i) => (
            <group key={i} position={[-0.02, 0.02, z]}>
              <mesh
                ref={(el) => (earRefs.current[i] = el)}
                castShadow
                rotation={[0.3, z > 0 ? 0.3 : -0.3, z > 0 ? 0.5 : -0.5]}
              >
                <capsuleGeometry args={[0.04, 0.08, 8, 12]} />
                <meshStandardMaterial color={furDark} roughness={0.9} side={THREE.DoubleSide} />
              </mesh>
              {/* Inner ear */}
              <mesh position={[0.02, -0.04, z > 0 ? -0.01 : 0.01]} rotation={[0.3, z > 0 ? 0.3 : -0.3, z > 0 ? 0.5 : -0.5]}>
                <planeGeometry args={[0.05, 0.07]} />
                <meshStandardMaterial color="#c9a86c" roughness={0.95} side={THREE.DoubleSide} />
              </mesh>
            </group>
          ))}

          {/* Eyebrows - fur tufts */}
          {[-0.025, 0.025].map((z, i) => (
            <mesh key={i} position={[0.05, 0.05, z]}>
              <sphereGeometry args={[0.015, 8, 8]} />
              <meshStandardMaterial color={furLight} roughness={0.9} />
            </mesh>
          ))}
        </group>

        {/* === FRONT LEGS - extended forward (sphinx pose) === */}
        {[-0.08, 0.08].map((z, i) => (
          <group key={i} position={[0.18, 0, z]}>
            {/* Shoulder */}
            <mesh castShadow position={[0, 0.08, 0]}>
              <sphereGeometry args={[0.055, 10, 10]} />
              <meshStandardMaterial color={furMid} roughness={0.85} />
            </mesh>
            {/* Upper leg */}
            <mesh castShadow position={[0.06, 0.02, 0]} rotation={[0, 0, -0.2]}>
              <capsuleGeometry args={[0.04, 0.1, 8, 10]} rotation={[0, 0, Math.PI / 2]} />
              <meshStandardMaterial color={furMid} roughness={0.85} />
            </mesh>
            {/* Lower leg/paw extended */}
            <mesh castShadow position={[0.18, 0.02, 0]} rotation={[0, 0, 0]}>
              <capsuleGeometry args={[0.035, 0.12, 8, 10]} rotation={[0, 0, Math.PI / 2]} />
              <meshStandardMaterial color={furLight} roughness={0.85} />
            </mesh>
            {/* Paw */}
            <group position={[0.28, 0.01, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.06, 0.03, 0.055]} />
                <meshStandardMaterial color={furChest} roughness={0.85} />
              </mesh>
              {/* Toes */}
              {[-0.018, 0, 0.018].map((tz, j) => (
                <mesh key={j} position={[0.025, -0.005, tz]} castShadow>
                  <sphereGeometry args={[0.012, 8, 8]} />
                  <meshStandardMaterial color={furChest} roughness={0.85} />
                </mesh>
              ))}
            </group>
          </group>
        ))}

        {/* === BACK LEGS - tucked alongside body === */}
        {[-0.1, 0.1].map((z, i) => (
          <group key={i} position={[-0.22, 0.05, z * 1.3]}>
            {/* Hip */}
            <mesh castShadow>
              <sphereGeometry args={[0.06, 10, 10]} />
              <meshStandardMaterial color={furMid} roughness={0.85} />
            </mesh>
            {/* Thigh - tucked */}
            <mesh castShadow position={[0.05, -0.03, z > 0 ? 0.04 : -0.04]} rotation={[z > 0 ? 0.8 : -0.8, 0, 0.5]}>
              <capsuleGeometry args={[0.045, 0.1, 8, 10]} />
              <meshStandardMaterial color={furMid} roughness={0.85} />
            </mesh>
            {/* Lower leg */}
            <mesh castShadow position={[0.12, -0.02, z > 0 ? 0.08 : -0.08]} rotation={[z > 0 ? 0.3 : -0.3, 0, -0.3]}>
              <capsuleGeometry args={[0.035, 0.08, 8, 10]} />
              <meshStandardMaterial color={furLight} roughness={0.85} />
            </mesh>
            {/* Back paw */}
            <mesh castShadow position={[0.14, -0.04, z > 0 ? 0.12 : -0.12]}>
              <boxGeometry args={[0.05, 0.025, 0.045]} />
              <meshStandardMaterial color={furChest} roughness={0.85} />
            </mesh>
          </group>
        ))}

        {/* === TAIL - fluffy golden retriever tail === */}
        <group ref={tailRef} position={[-0.35, 0.12, 0]}>
          {/* Tail base */}
          <mesh castShadow rotation={[0, 0, -0.6]}>
            <capsuleGeometry args={[0.035, 0.12, 8, 10]} />
            <meshStandardMaterial color={furDark} roughness={0.85} />
          </mesh>
          {/* Tail mid - feathered */}
          <mesh castShadow position={[-0.08, 0.08, 0]} rotation={[0, 0, -0.8]}>
            <capsuleGeometry args={[0.04, 0.1, 8, 10]} />
            <meshStandardMaterial color={furMid} roughness={0.9} />
          </mesh>
          {/* Tail tip - fluffy */}
          <mesh castShadow position={[-0.14, 0.16, 0]} rotation={[0, 0, -1]}>
            <capsuleGeometry args={[0.035, 0.08, 8, 10]} />
            <meshStandardMaterial color={furLight} roughness={0.9} />
          </mesh>
        </group>

        {/* Neck fur/ruff */}
        <mesh castShadow position={[0.22, 0.1, 0]}>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshStandardMaterial color={furChest} roughness={0.9} />
        </mesh>
      </group>

      {/* Water bowl */}
      <group position={[0.7, 0, 0.3]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.1, 0.08, 0.05, 20]} />
          <meshStandardMaterial color="#c0c0c0" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.015, 0]}>
          <cylinderGeometry args={[0.085, 0.07, 0.03, 20]} />
          <meshStandardMaterial color="#4a90d9" transparent opacity={0.6} />
        </mesh>
      </group>

      {/* Food bowl */}
      <group position={[0.7, 0, -0.15]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.1, 0.08, 0.05, 20]} />
          <meshStandardMaterial color="#c0c0c0" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Kibble */}
        {[[-0.03, 0.02], [0.02, 0.01], [0, -0.03], [0.04, 0.03], [-0.02, -0.01]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.03, z]}>
            <sphereGeometry args={[0.015, 6, 6]} />
            <meshStandardMaterial color="#8b4513" roughness={0.8} />
          </mesh>
        ))}
      </group>

      {/* Dog toy - red ball */}
      <mesh position={[-0.4, 0.05, 0.3]} castShadow>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#cc3333" roughness={0.4} />
      </mesh>
    </group>
  );
}

// Kegerator - Mini fridge with beer tap
function Kegerator() {
  return (
    <group position={[-4.3, 0, 4]}>
      {/* Mini fridge body */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[0.6, 1, 0.5]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.5} />
      </mesh>

      {/* Fridge door */}
      <mesh position={[0, 0.5, 0.26]} castShadow>
        <boxGeometry args={[0.55, 0.95, 0.02]} />
        <meshStandardMaterial color="#2d2d2d" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* Door handle */}
      <mesh position={[0.2, 0.5, 0.3]} castShadow>
        <boxGeometry args={[0.04, 0.2, 0.03]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Chrome top plate */}
      <mesh position={[0, 1.02, 0]} castShadow>
        <boxGeometry args={[0.65, 0.04, 0.55]} />
        <meshStandardMaterial color="#e0e0e0" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Tap tower */}
      <group position={[0, 1.2, 0]}>
        {/* Tower base */}
        <mesh castShadow>
          <cylinderGeometry args={[0.08, 0.1, 0.3, 16]} />
          <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Tap handle */}
        <group position={[0, 0.1, 0.08]} rotation={[0.3, 0, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.15, 8]} />
            <meshStandardMaterial color="#2d2d2d" roughness={0.4} />
          </mesh>
          {/* Handle grip */}
          <mesh position={[0, 0.1, 0]} castShadow>
            <sphereGeometry args={[0.035, 12, 12]} />
            <meshStandardMaterial color="#8b4513" roughness={0.6} />
          </mesh>
        </group>

        {/* Tap spout */}
        <mesh position={[0, -0.05, 0.1]} rotation={[0.4, 0, 0]} castShadow>
          <cylinderGeometry args={[0.015, 0.02, 0.08, 8]} />
          <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Drip tray */}
      <mesh position={[0, 1.04, 0.2]} castShadow>
        <boxGeometry args={[0.25, 0.02, 0.12]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Beer brand sticker */}
      <mesh position={[0, 0.6, 0.28]}>
        <circleGeometry args={[0.12, 24]} />
        <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={0.1} />
      </mesh>
      <mesh position={[0, 0.6, 0.285]}>
        <circleGeometry args={[0.09, 24]} />
        <meshStandardMaterial color="#b22222" />
      </mesh>

      {/* Pint glass nearby */}
      <group position={[0.4, 1.04, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.04, 0.035, 0.14, 12]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.3} roughness={0.1} />
        </mesh>
        {/* Beer in glass */}
        <mesh position={[0, -0.01, 0]}>
          <cylinderGeometry args={[0.035, 0.03, 0.1, 12]} />
          <meshStandardMaterial color="#f4a460" transparent opacity={0.8} />
        </mesh>
        {/* Foam */}
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.038, 0.035, 0.02, 12]} />
          <meshStandardMaterial color="#fffaf0" />
        </mesh>
      </group>
    </group>
  );
}

// Playboy-style poster (cartoonish/artistic - tasteful pinup art style)
function PlayboyPoster() {
  return (
    <group position={[4.88, 2.3, 1.5]} rotation={[0, -Math.PI / 2, 0]}>
      {/* Frame */}
      <mesh castShadow>
        <boxGeometry args={[0.5, 0.7, 0.03]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
      </mesh>

      {/* Poster background - hot pink */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[0.45, 0.65]} />
        <meshStandardMaterial color="#ff1493" />
      </mesh>

      {/* Cartoon silhouette - classic pinup pose */}
      <group position={[0, -0.05, 0.025]}>
        {/* Body silhouette - simplified cartoon style */}
        <mesh>
          <capsuleGeometry args={[0.08, 0.2, 8, 12]} />
          <meshStandardMaterial color="#2d2d2d" />
        </mesh>
        {/* Head */}
        <mesh position={[0, 0.18, 0]}>
          <circleGeometry args={[0.06, 16]} />
          <meshStandardMaterial color="#2d2d2d" />
        </mesh>
        {/* Hair flourish */}
        <mesh position={[0.04, 0.22, 0]}>
          <circleGeometry args={[0.04, 16]} />
          <meshStandardMaterial color="#2d2d2d" />
        </mesh>
        {/* Leg */}
        <mesh position={[0.06, -0.18, 0]} rotation={[0, 0, -0.4]}>
          <capsuleGeometry args={[0.025, 0.15, 6, 8]} />
          <meshStandardMaterial color="#2d2d2d" />
        </mesh>
      </group>

      {/* Bunny logo at top */}
      <group position={[0, 0.25, 0.025]}>
        {/* Bunny head */}
        <mesh>
          <circleGeometry args={[0.035, 16]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        {/* Bunny ears */}
        {[-0.025, 0.025].map((x, i) => (
          <mesh key={i} position={[x, 0.055, 0]} rotation={[0, 0, x > 0 ? 0.2 : -0.2]}>
            <capsuleGeometry args={[0.012, 0.04, 6, 8]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        ))}
      </group>

      {/* Decorative stars */}
      {[[-0.15, 0.2], [0.16, -0.2], [-0.12, -0.25]].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.025]}>
          <circleGeometry args={[0.02, 5]} />
          <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={0.3} />
        </mesh>
      ))}
    </group>
  );
}

// Decorations
function Decorations() {
  return (
    <group>
      {/* Whiteboard on left wall */}
      <mesh position={[-4.88, 2, -1]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[1.5, 1, 0.03]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>
      <mesh position={[-4.87, 2, -1]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[1.55, 1.05, 0.02]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.4} />
      </mesh>

      {/* Bookshelf on left wall */}
      <group position={[-4.5, 1.2, 3]}>
        <mesh castShadow>
          <boxGeometry args={[0.4, 1.8, 0.3]} />
          <meshStandardMaterial color={COLORS.wood} roughness={0.7} />
        </mesh>
        {[-0.5, 0, 0.5].map((y, i) => (
          <group key={i}>
            <mesh position={[0, y, 0]}>
              <boxGeometry args={[0.38, 0.02, 0.28]} />
              <meshStandardMaterial color={COLORS.wood} roughness={0.6} />
            </mesh>
            {/* Books */}
            {[-0.1, 0, 0.1].map((x, j) => (
              <mesh key={j} position={[x, y + 0.12, 0]} castShadow>
                <boxGeometry args={[0.06, 0.18, 0.15]} />
                <meshStandardMaterial
                  color={['#c41e3a', '#1e40af', '#065f46', '#7c2d12'][Math.floor(Math.random() * 4)]}
                  roughness={0.8}
                />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* Floating motivational sign on left wall */}
      <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.2}>
        <group position={[-4.7, 2.8, -3]}>
          <mesh>
            <boxGeometry args={[0.5, 0.25, 0.02]} />
            <meshStandardMaterial color="#1f2937" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0, 0.015]}>
            <planeGeometry args={[0.45, 0.2]} />
            <meshStandardMaterial color={COLORS.accentBlue} emissive={COLORS.accentBlue} emissiveIntensity={0.3} />
          </mesh>
        </group>
      </Float>

      {/* === RIGHT WALL DECORATIONS (x=5) === */}

      {/* Wall clock on right wall */}
      <group position={[4.88, 2.5, 0]} rotation={[0, -Math.PI / 2, 0]}>
        {/* Clock body */}
        <mesh castShadow>
          <cylinderGeometry args={[0.3, 0.3, 0.05, 32]} rotation={[Math.PI / 2, 0, 0]} />
          <meshStandardMaterial color="#2d2d2d" metalness={0.3} roughness={0.5} />
        </mesh>
        {/* Clock face */}
        <mesh position={[0, 0, 0.03]}>
          <circleGeometry args={[0.27, 32]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        {/* Clock center */}
        <mesh position={[0, 0, 0.04]}>
          <circleGeometry args={[0.02, 16]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
        {/* Hour marks */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => (
          <mesh key={i} position={[Math.sin(deg * Math.PI / 180) * 0.22, Math.cos(deg * Math.PI / 180) * 0.22, 0.035]}>
            <boxGeometry args={[0.01, i % 3 === 0 ? 0.04 : 0.02, 0.01]} />
            <meshStandardMaterial color="#333333" />
          </mesh>
        ))}
      </group>

      {/* Framed certificate/diploma on right wall */}
      <group position={[4.88, 2, -2]} rotation={[0, -Math.PI / 2, 0]}>
        {/* Frame */}
        <mesh castShadow>
          <boxGeometry args={[0.6, 0.45, 0.03]} />
          <meshStandardMaterial color="#5c4033" roughness={0.6} />
        </mesh>
        {/* Certificate paper */}
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[0.52, 0.37]} />
          <meshStandardMaterial color="#f5f5dc" />
        </mesh>
      </group>

      {/* Small shelf with trophy on right wall */}
      <group position={[4.85, 1.5, 2]}>
        {/* Shelf */}
        <mesh castShadow rotation={[0, -Math.PI / 2, 0]}>
          <boxGeometry args={[0.4, 0.03, 0.15]} />
          <meshStandardMaterial color={COLORS.wood} roughness={0.6} />
        </mesh>
        {/* Trophy */}
        <mesh position={[0, 0.15, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.06, 0.2, 8]} />
          <meshStandardMaterial color="#ffd700" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.28, 0]} castShadow>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color="#ffd700" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* === FRONT WALL DECORATIONS (z=5) === */}

      {/* Large motivational poster on front wall */}
      <group position={[-2, 2.2, 4.88]}>
        {/* Frame */}
        <mesh castShadow>
          <boxGeometry args={[1.2, 0.8, 0.03]} />
          <meshStandardMaterial color="#2d2d2d" roughness={0.5} />
        </mesh>
        {/* Poster content */}
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[1.1, 0.7]} />
          <meshStandardMaterial color="#1e3a5f" />
        </mesh>
        {/* Accent stripe */}
        <mesh position={[0, -0.2, 0.025]}>
          <planeGeometry args={[0.8, 0.05]} />
          <meshStandardMaterial color={COLORS.accentOrange} emissive={COLORS.accentOrange} emissiveIntensity={0.2} />
        </mesh>
      </group>

      {/* Network diagram poster on front wall */}
      <group position={[2, 2.2, 4.88]}>
        {/* Frame */}
        <mesh castShadow>
          <boxGeometry args={[1.0, 0.7, 0.03]} />
          <meshStandardMaterial color="#3d3d3d" roughness={0.5} />
        </mesh>
        {/* Poster background */}
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[0.9, 0.6]} />
          <meshStandardMaterial color="#0a1628" />
        </mesh>
        {/* Network lines decoration */}
        {[-0.2, 0, 0.2].map((y, i) => (
          <mesh key={i} position={[0, y, 0.025]}>
            <planeGeometry args={[0.7, 0.02]} />
            <meshStandardMaterial color={COLORS.ledBlue} emissive={COLORS.ledBlue} emissiveIntensity={0.4} />
          </mesh>
        ))}
      </group>

      {/* Coat hooks on front wall */}
      <group position={[0, 1.5, 4.88]}>
        {[-0.15, 0.15].map((x, i) => (
          <mesh key={i} position={[x, 0, -0.05]} castShadow>
            <boxGeometry args={[0.04, 0.04, 0.1]} />
            <meshStandardMaterial color="#707070" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function PlayerOffice({ onElevatorUse }: FloorProps) {
  return (
    <group>
      <Room />
      <Windows />
      <CityView />
      <ModernDesk />
      <MonitorSetup />
      <OfficeChair />
      <DeskAccessories />
      <ComputerInteraction />
      <SupplyTable />
      <ElevatorDoor onUse={onElevatorUse} />
      <Decorations />
      {/* New office decor */}
      <Printer />
      <FilingCabinet />
      <FloorPlant position={[-4, 0, -4]} />
      <FloorPlant position={[4, 0, 3]} />
      <FloorPlant position={[4, 0, -3]} />
      <CoatRack />
      <WallArt position={[-4.88, 2.5, 2]} rotation={[0, Math.PI / 2, 0]} />
      <DeskPlant position={[-1.1, 0.77, -2.1]} />
      <DeskPlant position={[0.8, 0.77, -2.3]} />
      <WaterCooler />
      <TrashBin />
      <DeskLamp />
      {/* Fun stuff */}
      <OfficeDog />
      <Kegerator />
      <PlayboyPoster />
    </group>
  );
}

export default PlayerOffice;
