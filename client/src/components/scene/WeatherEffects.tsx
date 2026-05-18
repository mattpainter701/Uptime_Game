/**
 * WeatherEffects.tsx - Sprint 8
 * Procedural weather: rain particles and lightning flashes
 * Uses useFrame for particle animation
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';

function RainParticles({ intensity }: { intensity: number }) {
  const count = Math.floor(intensity * 500);
  const pointsRef = useRef<THREE.Points>(null);

  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 16;
    positions[i * 3 + 1] = Math.random() * 6;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 16;
    velocities[i] = 0.05 + Math.random() * 0.1;
  }

  useFrame(() => {
    if (!pointsRef.current) return;
    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] -= velocities[i];
      if (pos[i * 3 + 1] < 0) {
        pos[i * 3 + 1] = 6;
        pos[i * 3] = (Math.random() - 0.5) * 16;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 16;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#88aacc"
        transparent
        opacity={0.5 * intensity}
        depthWrite={false}
      />
    </points>
  );
}

function LightningFlash({ active }: { active: boolean }) {
  const lightRef = useRef<THREE.PointLight>(null);
  const flashRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!active) {
      if (lightRef.current) lightRef.current.intensity = 0;
      if (flashRef.current) (flashRef.current.material as THREE.MeshBasicMaterial).opacity = 0;
      return;
    }

    // Random lightning pattern
    const t = state.clock.elapsedTime;
    const flicker = Math.sin(t * 50) * Math.sin(t * 73) * Math.sin(t * 37);
    const intensity = flicker > 0.7 ? flicker * 2 : 0;

    if (lightRef.current) {
      lightRef.current.intensity = intensity;
    }
    if (flashRef.current) {
      (flashRef.current.material as THREE.MeshBasicMaterial).opacity = intensity * 0.3;
    }
  });

  return (
    <>
      <pointLight ref={lightRef} position={[0, 8, 0]} color="#ffffff" intensity={0} distance={20} />
      <mesh ref={flashRef} position={[0, 4, 0]}>
        <planeGeometry args={[20, 10]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  );
}

export function WeatherEffects() {
  const weather = useGameStore((state) => state.weather);
  const reducedMotion = useGameStore((state) => state.settings.reducedMotion);

  if (reducedMotion) return null;

  return (
    <group>
      {weather.current === 'rain' && <RainParticles intensity={weather.intensity} />}
      {weather.current === 'storm' && (
        <>
          <RainParticles intensity={weather.intensity} />
          <LightningFlash active={weather.current === 'storm'} />
        </>
      )}
    </group>
  );
}

export default WeatherEffects;
