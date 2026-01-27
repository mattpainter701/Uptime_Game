import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';

const COLORS = {
  neonPink: '#ff0080',
  neonCyan: '#00ffff',
};

export function Lighting() {
  const timeOfDay = useGameStore((state) => state.timeOfDay);
  const neonPinkRef = useRef<THREE.PointLight>(null);
  const neonCyanRef = useRef<THREE.PointLight>(null);

  // Calculate lighting based on time of day
  const isNight = timeOfDay < 6 || timeOfDay > 18;
  const sunIntensity = isNight ? 0.1 : Math.sin(((timeOfDay - 6) / 12) * Math.PI) * 0.6 + 0.3;
  const ambientIntensity = isNight ? 0.15 : 0.35;
  const neonIntensity = isNight ? 0.7 : 0.25;

  // Animate neon lights
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (neonPinkRef.current) {
      neonPinkRef.current.intensity = neonIntensity + Math.sin(time * 2.5) * 0.1;
    }
    if (neonCyanRef.current) {
      neonCyanRef.current.intensity = neonIntensity + Math.cos(time * 3) * 0.1;
    }
  });

  return (
    <>
      {/* Ambient light */}
      <ambientLight intensity={ambientIntensity} color="#ffffff" />

      {/* Main directional light (sun/moon) */}
      <directionalLight
        position={[8, 15, 8]}
        intensity={sunIntensity}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      {/* Neon accent lights */}
      <pointLight
        ref={neonPinkRef}
        position={[-4, 2.5, 0]}
        color={COLORS.neonPink}
        intensity={neonIntensity}
        distance={8}
      />
      <pointLight
        ref={neonCyanRef}
        position={[4, 2.5, 0]}
        color={COLORS.neonCyan}
        intensity={neonIntensity}
        distance={8}
      />

      {/* Monitor glow */}
      <pointLight
        position={[0, 1.2, -2]}
        color="#00ff41"
        intensity={0.2}
        distance={2.5}
      />

      {/* Window ambient light */}
      <pointLight
        position={[3, 2, -4]}
        color={isNight ? '#4466aa' : '#aaccff'}
        intensity={isNight ? 0.15 : 0.3}
        distance={6}
      />
    </>
  );
}

export default Lighting;
