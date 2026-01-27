import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { Office } from './Office';
import { Lighting } from './Lighting';
import { useGameStore } from '../../store/gameStore';

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#00ffff" wireframe />
    </mesh>
  );
}

function Scene() {
  const timeOfDay = useGameStore((state) => state.timeOfDay);
  const isNight = timeOfDay < 6 || timeOfDay > 18;

  return (
    <>
      <Lighting />

      {/* Stars visible at night */}
      {isNight && (
        <Stars
          radius={100}
          depth={50}
          count={3000}
          factor={3}
          saturation={0}
          fade
          speed={0.5}
        />
      )}

      {/* Main office scene */}
      <Suspense fallback={<LoadingFallback />}>
        <Office />
      </Suspense>

      {/* Post-processing effects */}
      <EffectComposer>
        <Bloom
          intensity={0.4}
          luminanceThreshold={0.8}
          luminanceSmoothing={0.9}
          height={300}
        />
        <Vignette eskil={false} offset={0.1} darkness={0.4} />
      </EffectComposer>
    </>
  );
}

export function GameCanvas() {
  return (
    <div className="absolute inset-0">
      <Canvas
        shadows
        camera={{
          position: [4, 3, 4],
          fov: 55,
          near: 0.1,
          far: 200,
        }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
        }}
        onCreated={({ gl }) => {
          gl.toneMapping = 2; // ACESFilmicToneMapping
          gl.toneMappingExposure = 1.0;
        }}
      >
        {/* Fog for depth */}
        <fog attach="fog" args={['#0a0a15', 8, 35]} />

        {/* Background color */}
        <color attach="background" args={['#0a0a15']} />

        {/* Scene content */}
        <Scene />

        {/* Camera controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={2}
          maxDistance={12}
          maxPolarAngle={Math.PI / 2.1}
          target={[0, 1.2, -1]}
        />
      </Canvas>
    </div>
  );
}

export default GameCanvas;
