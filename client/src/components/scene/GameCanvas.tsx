import { Suspense, useRef, useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { Building } from './Building';
import { Lighting } from './Lighting';
import { useGameStore } from '../../store/gameStore';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#00ffff" wireframe />
    </mesh>
  );
}

/** Applies runtime graphics settings to the Three.js renderer via useThree */
function GraphicsSettingsApplier() {
  const shadows = useGameStore((s) => s.settings.shadows);
  const renderDistance = useGameStore((s) => s.settings.renderDistance);
  const quality = useGameStore((s) => s.settings.graphicsQuality);
  const { gl } = useThree();

  // Toggle shadow map at runtime
  useEffect(() => {
    gl.shadowMap.enabled = shadows;
  }, [gl, shadows]);

  // Adjust pixel ratio based on quality (runs once on mount / quality change)
  useEffect(() => {
    const ratios = { low: 1, medium: Math.min(window.devicePixelRatio, 1.5), high: Math.min(window.devicePixelRatio, 2) };
    gl.setPixelRatio(ratios[quality]);
  }, [gl, quality]);

  return null;
}

function Scene() {
  const timeOfDay = useGameStore((state) => state.timeOfDay);
  const reducedMotion = useGameStore((state) => state.settings.reducedMotion);
  const quality = useGameStore((state) => state.settings.graphicsQuality);
  const isNight = timeOfDay < 6 || timeOfDay > 18;

  // Adjust post-processing intensity based on quality
  const bloomIntensity = quality === 'low' ? 0.15 : quality === 'medium' ? 0.35 : 0.5;
  const vignetteDarkness = quality === 'low' ? 0.2 : 0.4;

  return (
    <>
      <Lighting />

      {/* Stars visible at night — skip if reducedMotion */}
      {isNight && !reducedMotion && (
        <Stars
          radius={100}
          depth={50}
          count={quality === 'low' ? 800 : 3000}
          factor={quality === 'low' ? 1.5 : 3}
          saturation={0}
          fade
          speed={0.5}
        />
      )}

      {/* Main building scene */}
      <Suspense fallback={<LoadingFallback />}>
        <Building />
      </Suspense>

      {/* Post-processing effects — disabled with reducedMotion */}
      {!reducedMotion && (
        <EffectComposer>
          <Bloom
            intensity={bloomIntensity}
            luminanceThreshold={0.8}
            luminanceSmoothing={0.9}
            height={quality === 'low' ? 150 : 300}
          />
          <Vignette eskil={false} offset={0.1} darkness={vignetteDarkness} />
        </EffectComposer>
      )}
    </>
  );
}

function CameraController() {
  const controlsRef = useRef<OrbitControlsType>(null);
  const playerPosition = useGameStore((state) => state.playerPosition);

  // Disable orbit controls when player is standing (camera follows player)
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = playerPosition.pose === 'seated';
    }
  }, [playerPosition.pose]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={2}
      maxDistance={12}
      maxPolarAngle={Math.PI / 2.1}
      target={[0, 1.2, -1]}
    />
  );
}

export function GameCanvas() {
  const antialiasing = useGameStore((s) => s.settings.antialiasing);
  const quality = useGameStore((s) => s.settings.graphicsQuality);
  const renderDistance = useGameStore((s) => s.settings.renderDistance);
  const shadows = useGameStore((s) => s.settings.shadows);

  // Key changes when settings requiring full renderer recreate change
  const canvasKey = useMemo(
    () => `q${quality}-aa${antialiasing ? 1 : 0}-rd${renderDistance}`,
    [quality, antialiasing, renderDistance]
  );

  // Fog distance scales with render distance
  const fogNear = 3 + renderDistance * 0.6;
  const fogFar = 10 + renderDistance * 3;

  return (
    <div className="absolute inset-0">
      <Canvas
        key={canvasKey}
        shadows={shadows}
        camera={{
          position: [4, 3, 4],
          fov: 55,
          near: 0.1,
          far: fogFar + 50,
        }}
        gl={{
          antialias: antialiasing,
          powerPreference: quality === 'low' ? 'default' : 'high-performance',
          alpha: false,
        }}
        onCreated={({ gl }) => {
          gl.toneMapping = 2; // ACESFilmicToneMapping
          gl.toneMappingExposure = quality === 'low' ? 0.75 : 1.0;
        }}
      >
        {/* Fog for depth — distance scales with renderDistance */}
        <fog attach="fog" args={['#0a0a15', fogNear, fogFar]} />

        {/* Background color */}
        <color attach="background" args={['#0a0a15']} />

        {/* Runtime settings applier */}
        <GraphicsSettingsApplier />

        {/* Scene content */}
        <Scene />

        {/* Camera controls - disabled when player is walking */}
        <CameraController />
      </Canvas>
    </div>
  );
}

export default GameCanvas;
