import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { Character } from './Character';
import { PlayerController } from './PlayerController';

// Colors - Cyberpunk office palette
const COLORS = {
  neonPink: '#ff0080',
  neonCyan: '#00ffff',
  neonGreen: '#00ff41',
  neonPurple: '#8000ff',
  deskWood: '#3d2817',
  deskMetal: '#2a2a2a',
  chairLeather: '#1a1a1a',
  screenGlow: '#00ff41',
  floorWood: '#2a1f15',
  floorCarpet: '#1a1a28',
  wallDark: '#12121a',
  wallAccent: '#1a1a2e',
  windowFrame: '#3a3a4a',
  ceilingTile: '#0f0f15',
};

interface InteractiveProps {
  onClick?: () => void;
}

// Modern L-shaped gaming/work desk
function GamingDesk({ onClick }: InteractiveProps) {
  const [hovered, setHovered] = useState(false);

  const metalMaterial = (
    <meshStandardMaterial color={COLORS.deskMetal} metalness={0.8} roughness={0.2} />
  );

  return (
    <group position={[0, 0, -2]} onClick={onClick}>
      {/* Main desktop surface */}
      <mesh
        position={[0, 0.74, 0]}
        castShadow
        receiveShadow
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[1.8, 0.04, 0.9]} />
        <meshStandardMaterial
          color={hovered ? '#4a3020' : COLORS.deskWood}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>

      {/* L-extension (side desk) */}
      <mesh position={[-1.1, 0.74, 0.5]} castShadow receiveShadow>
        <boxGeometry args={[0.6, 0.04, 0.9]} />
        <meshStandardMaterial color={COLORS.deskWood} roughness={0.4} metalness={0.1} />
      </mesh>

      {/* Desk frame - modern metal legs */}
      <group>
        {/* Front left leg */}
        <mesh position={[-0.8, 0.37, 0.35]} castShadow>
          <boxGeometry args={[0.05, 0.74, 0.05]} />
          {metalMaterial}
        </mesh>
        {/* Front right leg */}
        <mesh position={[0.8, 0.37, 0.35]} castShadow>
          <boxGeometry args={[0.05, 0.74, 0.05]} />
          {metalMaterial}
        </mesh>
        {/* Back left leg */}
        <mesh position={[-0.8, 0.37, -0.35]} castShadow>
          <boxGeometry args={[0.05, 0.74, 0.05]} />
          {metalMaterial}
        </mesh>
        {/* Back right leg */}
        <mesh position={[0.8, 0.37, -0.35]} castShadow>
          <boxGeometry args={[0.05, 0.74, 0.05]} />
          {metalMaterial}
        </mesh>

        {/* L-section legs */}
        <mesh position={[-1.35, 0.37, 0.85]} castShadow>
          <boxGeometry args={[0.05, 0.74, 0.05]} />
          {metalMaterial}
        </mesh>
        <mesh position={[-1.35, 0.37, 0.1]} castShadow>
          <boxGeometry args={[0.05, 0.74, 0.05]} />
          {metalMaterial}
        </mesh>

        {/* Support bars */}
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[1.5, 0.03, 0.03]} />
          {metalMaterial}
        </mesh>
        <mesh position={[-1.1, 0.1, 0.5]}>
          <boxGeometry args={[0.03, 0.03, 0.7]} />
          {metalMaterial}
        </mesh>
      </group>

      {/* Cable management tray */}
      <mesh position={[0, 0.65, -0.35]}>
        <boxGeometry args={[1.4, 0.03, 0.15]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>

      {/* RGB LED strip under desk edge */}
      <mesh position={[0, 0.71, 0.43]}>
        <boxGeometry args={[1.75, 0.02, 0.02]} />
        <meshStandardMaterial color={COLORS.neonCyan} emissive={COLORS.neonCyan} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

// Triple monitor setup
function MonitorSetup() {
  const screenRef1 = useRef<THREE.Mesh>(null);
  const screenRef2 = useRef<THREE.Mesh>(null);
  const screenRef3 = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const screens = [screenRef1.current, screenRef2.current, screenRef3.current];
    screens.forEach((screen, i) => {
      if (screen) {
        const material = screen.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = 0.4 + Math.sin(state.clock.elapsedTime * 2 + i * 0.5) * 0.1;
      }
    });
  });

  const createMonitor = (ref: React.RefObject<THREE.Mesh | null>, isMain = false) => {
    const width = isMain ? 0.7 : 0.5;
    const height = isMain ? 0.42 : 0.32;

    return (
      <group>
        {/* Thin bezel frame */}
        <mesh castShadow>
          <boxGeometry args={[width + 0.02, height + 0.02, 0.02]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.3} metalness={0.8} />
        </mesh>

        {/* Screen */}
        <mesh ref={ref} position={[0, 0, 0.011]}>
          <planeGeometry args={[width, height]} />
          <meshStandardMaterial
            color="#050510"
            emissive={COLORS.screenGlow}
            emissiveIntensity={0.4}
          />
        </mesh>

        {/* Stand neck */}
        <mesh position={[0, -height / 2 - 0.08, -0.03]}>
          <boxGeometry args={[0.04, 0.12, 0.04]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Stand base */}
        <mesh position={[0, -height / 2 - 0.14, 0.02]}>
          <boxGeometry args={[0.2, 0.015, 0.15]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
    );
  };

  return (
    <group position={[0, 1.0, -2.4]}>
      {/* Center main monitor (27") */}
      <group position={[0, 0.05, 0]}>
        {createMonitor(screenRef1, true)}
      </group>

      {/* Left monitor - angled */}
      <group position={[-0.55, 0, 0.08]} rotation={[0, 0.35, 0]}>
        {createMonitor(screenRef2)}
      </group>

      {/* Right monitor - angled */}
      <group position={[0.55, 0, 0.08]} rotation={[0, -0.35, 0]}>
        {createMonitor(screenRef3)}
      </group>
    </group>
  );
}

// Gaming chair
function GamingChair() {
  return (
    <group position={[0, 0, -1]} rotation={[0, Math.PI, 0]}>
      {/* Seat cushion */}
      <mesh position={[0, 0.48, 0]} castShadow>
        <boxGeometry args={[0.5, 0.1, 0.5]} />
        <meshStandardMaterial color={COLORS.chairLeather} roughness={0.6} />
      </mesh>

      {/* Seat side bolsters */}
      <mesh position={[-0.23, 0.52, 0]} castShadow>
        <boxGeometry args={[0.06, 0.12, 0.45]} />
        <meshStandardMaterial color={COLORS.neonCyan} roughness={0.5} />
      </mesh>
      <mesh position={[0.23, 0.52, 0]} castShadow>
        <boxGeometry args={[0.06, 0.12, 0.45]} />
        <meshStandardMaterial color={COLORS.neonCyan} roughness={0.5} />
      </mesh>

      {/* Backrest */}
      <mesh position={[0, 0.9, -0.2]} castShadow>
        <boxGeometry args={[0.48, 0.7, 0.08]} />
        <meshStandardMaterial color={COLORS.chairLeather} roughness={0.6} />
      </mesh>

      {/* Backrest side bolsters */}
      <mesh position={[-0.22, 0.9, -0.18]} castShadow>
        <boxGeometry args={[0.06, 0.65, 0.12]} />
        <meshStandardMaterial color={COLORS.neonCyan} roughness={0.5} />
      </mesh>
      <mesh position={[0.22, 0.9, -0.18]} castShadow>
        <boxGeometry args={[0.06, 0.65, 0.12]} />
        <meshStandardMaterial color={COLORS.neonCyan} roughness={0.5} />
      </mesh>

      {/* Headrest */}
      <mesh position={[0, 1.35, -0.18]} castShadow>
        <boxGeometry args={[0.25, 0.15, 0.08]} />
        <meshStandardMaterial color={COLORS.chairLeather} roughness={0.6} />
      </mesh>

      {/* Armrests */}
      {[-0.28, 0.28].map((x, i) => (
        <group key={i} position={[x, 0.6, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.06, 0.2, 0.03]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.1, 0.08]}>
            <boxGeometry args={[0.08, 0.03, 0.2]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* Base */}
      <mesh position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.03, 5]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Gas lift */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.4, 12]} />
        <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Wheels */}
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i / 5) * Math.PI * 2;
        return (
          <group key={i} position={[Math.cos(angle) * 0.25, 0.03, Math.sin(angle) * 0.25]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.03, 0.03, 0.04, 12]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// Mechanical keyboard with RGB
function MechanicalKeyboard() {
  const rgbRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (rgbRef.current) {
      const hue = (state.clock.elapsedTime * 0.1) % 1;
      (rgbRef.current.material as THREE.MeshStandardMaterial).emissive.setHSL(hue, 1, 0.5);
    }
  });

  return (
    <group position={[0, 0.78, -1.75]}>
      {/* Keyboard base */}
      <mesh castShadow>
        <boxGeometry args={[0.42, 0.025, 0.15]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.4} metalness={0.3} />
      </mesh>

      {/* Key area */}
      <mesh position={[0, 0.015, 0]}>
        <boxGeometry args={[0.4, 0.015, 0.13]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.6} />
      </mesh>

      {/* RGB underglow */}
      <mesh ref={rgbRef} position={[0, -0.01, 0]}>
        <boxGeometry args={[0.44, 0.01, 0.17]} />
        <meshStandardMaterial
          color="#000"
          emissive={COLORS.neonPink}
          emissiveIntensity={0.5}
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
  );
}

// Gaming mouse with RGB
function GamingMouse() {
  return (
    <group position={[0.35, 0.78, -1.75]}>
      {/* Mousepad */}
      <mesh position={[0, -0.01, 0]}>
        <boxGeometry args={[0.35, 0.005, 0.3]} />
        <meshStandardMaterial color="#1a1a28" roughness={0.9} />
      </mesh>
      {/* Mousepad RGB edge */}
      <mesh position={[0, -0.005, 0]}>
        <boxGeometry args={[0.36, 0.003, 0.31]} />
        <meshStandardMaterial color={COLORS.neonPurple} emissive={COLORS.neonPurple} emissiveIntensity={0.3} />
      </mesh>

      {/* Mouse body */}
      <mesh position={[0, 0.02, 0]} castShadow>
        <boxGeometry args={[0.06, 0.03, 0.1]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.4} metalness={0.3} />
      </mesh>

      {/* Mouse RGB strip */}
      <mesh position={[0, 0.015, 0]}>
        <boxGeometry args={[0.065, 0.01, 0.05]} />
        <meshStandardMaterial color={COLORS.neonCyan} emissive={COLORS.neonCyan} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

// Small server rack / PC tower
function PCTower() {
  const fanRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (fanRef.current) {
      fanRef.current.rotation.z = state.clock.elapsedTime * 10;
    }
  });

  return (
    <group position={[-1.2, 0.35, -2.3]}>
      {/* Tower case */}
      <mesh castShadow>
        <boxGeometry args={[0.25, 0.55, 0.5]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.5} metalness={0.4} />
      </mesh>

      {/* Glass side panel */}
      <mesh position={[0.126, 0, 0]}>
        <boxGeometry args={[0.005, 0.5, 0.45]} />
        <meshStandardMaterial color="#1a1a2e" transparent opacity={0.4} metalness={0.9} />
      </mesh>

      {/* RGB inside glow */}
      <pointLight position={[0.05, 0, 0]} color={COLORS.neonPurple} intensity={0.3} distance={0.8} />

      {/* Front panel */}
      <mesh position={[0, 0, 0.251]}>
        <boxGeometry args={[0.24, 0.54, 0.01]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
      </mesh>

      {/* Power button */}
      <mesh position={[0.08, 0.22, 0.26]}>
        <cylinderGeometry args={[0.015, 0.015, 0.01, 12]} />
        <meshStandardMaterial color={COLORS.neonGreen} emissive={COLORS.neonGreen} emissiveIntensity={0.8} />
      </mesh>

      {/* Front RGB strip */}
      <mesh position={[-0.11, 0, 0.255]}>
        <boxGeometry args={[0.02, 0.4, 0.005]} />
        <meshStandardMaterial color={COLORS.neonCyan} emissive={COLORS.neonCyan} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

// Desk items - coffee, energy drinks, etc
function DeskItems() {
  return (
    <group>
      {/* Coffee mug */}
      <group position={[-0.7, 0.78, -1.6]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.04, 0.035, 0.1, 16]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.5} />
        </mesh>
        <mesh position={[0.045, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.025, 0.008, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.02, 16]} />
          <meshStandardMaterial color="#3d2817" />
        </mesh>
      </group>

      {/* Energy drink can */}
      <group position={[-0.55, 0.82, -1.55]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.12, 16]} />
          <meshStandardMaterial color="#00aa00" roughness={0.3} metalness={0.8} />
        </mesh>
      </group>

      {/* Figurine/collectible */}
      <group position={[0.75, 0.8, -2.35]}>
        <mesh castShadow>
          <boxGeometry args={[0.06, 0.12, 0.04]} />
          <meshStandardMaterial color="#ff6600" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#ffcc99" roughness={0.7} />
        </mesh>
      </group>

      {/* Headphone stand */}
      <group position={[-0.85, 0.78, -2.2]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.05, 0.06, 0.03, 16]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.27, 8]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.28, 0]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

// Wall decorations
function WallDecorations() {
  return (
    <group>
      {/* Tech poster 1 */}
      <mesh position={[-4.9, 2.2, -2]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[0.8, 1.1, 0.02]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.8} />
      </mesh>
      <mesh position={[-4.88, 2.2, -2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.75, 1.05]} />
        <meshStandardMaterial color="#0a2a4a" emissive="#003366" emissiveIntensity={0.1} />
      </mesh>

      {/* Certificate/diploma */}
      <mesh position={[-4.9, 2.2, 0.5]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[0.5, 0.4, 0.02]} />
        <meshStandardMaterial color="#3a3020" roughness={0.6} />
      </mesh>
      <mesh position={[-4.88, 2.2, 0.5]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.45, 0.35]} />
        <meshStandardMaterial color="#f5f0e0" roughness={0.9} />
      </mesh>

      {/* LED light strip along wall */}
      <mesh position={[-4.9, 3.5, 0]}>
        <boxGeometry args={[0.02, 0.02, 8]} />
        <meshStandardMaterial color={COLORS.neonPink} emissive={COLORS.neonPink} emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

// Bookshelf with tech books
function Bookshelf() {
  const bookColors = ['#8b0000', '#00008b', '#006400', '#4a0080', '#804000', '#008080'];

  return (
    <group position={[-4.5, 1.2, 2.5]}>
      {/* Shelf frame */}
      <mesh castShadow>
        <boxGeometry args={[0.8, 1.8, 0.3]} />
        <meshStandardMaterial color="#2a1a10" roughness={0.7} />
      </mesh>

      {/* Shelves */}
      {[-0.6, -0.15, 0.3, 0.75].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <boxGeometry args={[0.75, 0.03, 0.28]} />
          <meshStandardMaterial color="#3a2a1a" roughness={0.6} />
        </mesh>
      ))}

      {/* Books */}
      {[-0.45, 0, 0.45].map((y, row) =>
        [-0.25, -0.1, 0.05, 0.18, 0.3].map((x, i) => (
          <mesh key={`${row}-${i}`} position={[x, y + 0.12, 0.02]} castShadow>
            <boxGeometry args={[0.08 + Math.random() * 0.04, 0.22 + Math.random() * 0.08, 0.18]} />
            <meshStandardMaterial color={bookColors[(row * 5 + i) % bookColors.length]} roughness={0.8} />
          </mesh>
        ))
      )}
    </group>
  );
}

// Improved window with city view
function CityWindow() {
  return (
    <group position={[3.5, 2, -4.9]}>
      {/* Window frame */}
      <mesh>
        <boxGeometry args={[4, 3.2, 0.12]} />
        <meshStandardMaterial color={COLORS.windowFrame} metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Glass panes */}
      <mesh position={[-0.95, 0, 0.07]}>
        <planeGeometry args={[1.8, 2.9]} />
        <meshStandardMaterial color="#304050" transparent opacity={0.3} roughness={0.1} metalness={0.9} />
      </mesh>
      <mesh position={[0.95, 0, 0.07]}>
        <planeGeometry args={[1.8, 2.9]} />
        <meshStandardMaterial color="#304050" transparent opacity={0.3} roughness={0.1} metalness={0.9} />
      </mesh>

      {/* Window divider */}
      <mesh position={[0, 0, 0.07]}>
        <boxGeometry args={[0.06, 2.95, 0.02]} />
        <meshStandardMaterial color={COLORS.windowFrame} />
      </mesh>

      {/* Horizontal divider */}
      <mesh position={[0, 0, 0.07]}>
        <boxGeometry args={[3.9, 0.06, 0.02]} />
        <meshStandardMaterial color={COLORS.windowFrame} />
      </mesh>

      {/* Window sill */}
      <mesh position={[0, -1.65, 0.15]}>
        <boxGeometry args={[4.2, 0.08, 0.25]} />
        <meshStandardMaterial color="#2a2a3a" roughness={0.6} />
      </mesh>
    </group>
  );
}

// Detailed city skyline
function CitySkyline() {
  const buildingData = Array.from({ length: 60 }, (_, i) => ({
    height: 3 + Math.random() * 18,
    width: 0.6 + Math.random() * 1.5,
    depth: 0.6 + Math.random() * 1.5,
    x: (i - 30) * 1.2 + (Math.random() - 0.5) * 0.6,
    z: -12 - Math.random() * 30,
    hue: 0.58 + Math.random() * 0.08,
    lightness: 0.08 + Math.random() * 0.06,
  }));

  return (
    <group position={[3.5, -2, 0]}>
      {buildingData.map((b, i) => (
        <group key={i}>
          {/* Building body */}
          <mesh position={[b.x, b.height / 2, b.z]}>
            <boxGeometry args={[b.width, b.height, b.depth]} />
            <meshStandardMaterial
              color={new THREE.Color().setHSL(b.hue, 0.12, b.lightness)}
              roughness={0.9}
            />
          </mesh>

          {/* Windows on buildings */}
          {i % 3 === 0 && (
            <group position={[b.x, 0, b.z + b.depth / 2 + 0.01]}>
              {Array.from({ length: Math.min(Math.floor(b.height / 0.6), 12) }, (_, row) => (
                <group key={row}>
                  {Array.from({ length: Math.min(Math.floor(b.width / 0.3), 4) }, (_, col) => (
                    Math.random() > 0.35 && (
                      <mesh
                        key={col}
                        position={[
                          (col - Math.floor(b.width / 0.3) / 2) * 0.28,
                          row * 0.55 + 0.4,
                          0,
                        ]}
                      >
                        <planeGeometry args={[0.15, 0.25]} />
                        <meshStandardMaterial
                          color="#ffff88"
                          emissive="#ffff44"
                          emissiveIntensity={Math.random() * 0.4 + 0.2}
                        />
                      </mesh>
                    )
                  ))}
                </group>
              ))}
            </group>
          )}
        </group>
      ))}

      {/* Distant neon signs */}
      <mesh position={[-8, 8, -25]}>
        <boxGeometry args={[2, 0.5, 0.1]} />
        <meshStandardMaterial color={COLORS.neonPink} emissive={COLORS.neonPink} emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[12, 12, -30]}>
        <boxGeometry args={[3, 0.4, 0.1]} />
        <meshStandardMaterial color={COLORS.neonCyan} emissive={COLORS.neonCyan} emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

// Floor with carpet and wood sections
function Floor() {
  return (
    <group>
      {/* Main floor - dark wood */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color={COLORS.floorWood} roughness={0.7} metalness={0.1} />
      </mesh>

      {/* Carpet under desk area */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.01, -1.5]}>
        <planeGeometry args={[3, 2.5]} />
        <meshStandardMaterial color={COLORS.floorCarpet} roughness={0.95} />
      </mesh>

      {/* Carpet RGB edge */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, -1.5]}>
        <ringGeometry args={[1.4, 1.45, 32]} />
        <meshStandardMaterial color={COLORS.neonPurple} emissive={COLORS.neonPurple} emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}

// Walls with better materials
function Walls() {
  return (
    <>
      {/* Back wall - with texture variation */}
      <mesh position={[0, 2, -5]} receiveShadow>
        <boxGeometry args={[12, 4, 0.15]} />
        <meshStandardMaterial color={COLORS.wallDark} roughness={0.95} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-5, 2, 0]} receiveShadow>
        <boxGeometry args={[0.15, 4, 12]} />
        <meshStandardMaterial color={COLORS.wallAccent} roughness={0.9} />
      </mesh>

      {/* Accent wall panel */}
      <mesh position={[-4.9, 2, -1]} receiveShadow>
        <boxGeometry args={[0.05, 3, 3]} />
        <meshStandardMaterial color="#1a2030" roughness={0.85} />
      </mesh>

      {/* Ceiling with panels */}
      <mesh position={[0, 4, 0]}>
        <boxGeometry args={[12, 0.15, 12]} />
        <meshStandardMaterial color={COLORS.ceilingTile} roughness={0.9} />
      </mesh>

      {/* Ceiling beams */}
      {[-3, 0, 3].map((x) => (
        <mesh key={x} position={[x, 3.92, 0]}>
          <boxGeometry args={[0.1, 0.02, 12]} />
          <meshStandardMaterial color="#0a0a10" roughness={0.8} />
        </mesh>
      ))}
    </>
  );
}

// Modern ceiling lights
function CeilingLights() {
  return (
    <>
      {/* Main panel lights */}
      {[-2, 2].map((x) =>
        [-2, 2].map((z) => (
          <group key={`${x}-${z}`} position={[x, 3.85, z]}>
            <mesh>
              <boxGeometry args={[0.8, 0.03, 0.4]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
            </mesh>
            <mesh position={[0, -0.02, 0]}>
              <boxGeometry args={[0.7, 0.01, 0.3]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} />
            </mesh>
          </group>
        ))
      )}

      {/* Accent track lighting */}
      <mesh position={[0, 3.9, -3]}>
        <boxGeometry args={[3, 0.03, 0.03]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.3} />
      </mesh>
      {[-0.8, 0, 0.8].map((x, i) => (
        <group key={i} position={[x, 3.85, -3]}>
          <mesh>
            <cylinderGeometry args={[0.04, 0.03, 0.08, 12]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.4} />
          </mesh>
          <pointLight position={[0, -0.1, 0]} color="#ffffee" intensity={0.3} distance={2} />
        </group>
      ))}
    </>
  );
}

// Floating neon decorative element
function NeonDecor() {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.3}>
      <group ref={ref} position={[-4.7, 2.8, -3.5]} rotation={[0, Math.PI / 2, 0]}>
        {/* Neon triangle */}
        <mesh>
          <torusGeometry args={[0.3, 0.015, 3, 3]} />
          <meshStandardMaterial color={COLORS.neonCyan} emissive={COLORS.neonCyan} emissiveIntensity={1} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.2, 0.01, 3, 3]} />
          <meshStandardMaterial color={COLORS.neonPink} emissive={COLORS.neonPink} emissiveIntensity={0.8} />
        </mesh>
      </group>
    </Float>
  );
}

// Main Office component
export function Office() {
  const setView = useGameStore((state) => state.setView);
  const playerPosition = useGameStore((state) => state.playerPosition);

  return (
    <group>
      {/* Environment */}
      <Floor />
      <Walls />
      <CeilingLights />
      <CityWindow />
      <CitySkyline />

      {/* Furniture */}
      <GamingDesk onClick={() => setView('terminal')} />
      <MonitorSetup />
      <GamingChair />
      <MechanicalKeyboard />
      <GamingMouse />
      <PCTower />

      {/* Player Character with Controller */}
      <PlayerController>
        <Character
          pose={playerPosition.pose}
          isMoving={playerPosition.isMoving}
        />
      </PlayerController>

      {/* Decorations */}
      <DeskItems />
      <WallDecorations />
      <Bookshelf />
      <NeonDecor />
    </group>
  );
}

export default Office;
