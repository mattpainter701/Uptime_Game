/**
 * InteractiveObjects.tsx - Sprint 8
 * Clickable interactive objects: coffee machine, whiteboard, server rack
 */

import { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import type { InteractiveObjectState } from '../../types/game';

interface InteractiveObjectsProps {
  object: InteractiveObjectState;
}

function CoffeeMachine({ object, onUse }: { object: InteractiveObjectState; onUse: () => void }) {
  const [hovered, setHovered] = useState(false);
  const canUse = useGameStore((state) => state.canUseInteractiveObject(object.id));

  return (
    <group position={object.position}>
      <Float speed={1} rotationIntensity={0} floatIntensity={0.02}>
        {/* Machine body */}
        <mesh position={[0, 0.3, 0]} castShadow>
          <boxGeometry args={[0.35, 0.5, 0.25]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.3} metalness={0.5} />
        </mesh>
        {/* Water tank */}
        <mesh position={[-0.12, 0.45, 0]} castShadow>
          <boxGeometry args={[0.15, 0.2, 0.15]} />
          <meshStandardMaterial color="#4a6a8a" roughness={0.2} transparent opacity={0.7} />
        </mesh>
        {/* Drip tray */}
        <mesh position={[0, 0.05, 0.08]} castShadow>
          <boxGeometry args={[0.3, 0.03, 0.15]} />
          <meshStandardMaterial color="#444" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Buttons */}
        <mesh position={[0, 0.5, 0.14]}>
          <cylinderGeometry args={[0.025, 0.025, 0.01, 8]} />
          <meshStandardMaterial color={canUse ? '#00ff44' : '#ff4444'} emissive={canUse ? '#00ff44' : '#ff4444'} emissiveIntensity={0.8} />
        </mesh>
        {/* Cup */}
        <mesh position={[0, 0.12, 0.14]} castShadow>
          <cylinderGeometry args={[0.04, 0.035, 0.07, 16]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        {/* Steam particles */}
        {canUse && (
          <mesh position={[0, 0.2, 0.14]} onClick={onUse}
            onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color={hovered ? '#ff8800' : '#ffaa44'} emissive={hovered ? '#ff8800' : '#ffaa44'} emissiveIntensity={0.5} transparent opacity={0.6} />
          </mesh>
        )}
        {/* Click target */}
        <mesh position={[0, 0.35, 0.2]} visible={false}
          onClick={onUse}
          onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}>
          <boxGeometry args={[0.3, 0.4, 0.1]} />
        </mesh>
      </Float>
      {/* Label */}
      <Html position={[0, 0.65, 0]} center>
        <div style={{
          color: canUse ? '#00ff44' : '#ff6666', fontSize: '8px', fontFamily: 'monospace',
          whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.7)', padding: '1px 6px', borderRadius: '3px',
          transform: hovered ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.2s'
        }}>
          {object.label} {canUse ? '☕' : '(cooldown)'}
        </div>
      </Html>
    </group>
  );
}

function Whiteboard({ object, onUse }: { object: InteractiveObjectState; onUse: () => void }) {
  const [hovered, setHovered] = useState(false);
  const canUse = useGameStore((state) => state.canUseInteractiveObject(object.id));

  return (
    <group position={object.position}>
      <Float speed={0.8} rotationIntensity={0} floatIntensity={0.01}>
        {/* Board */}
        <mesh castShadow>
          <boxGeometry args={[2, 1.2, 0.05]} />
          <meshStandardMaterial color="#ffffff" roughness={0.15} />
        </mesh>
        {/* Frame */}
        <mesh>
          <boxGeometry args={[2.1, 1.3, 0.06]} />
          <meshStandardMaterial color="#888" metalness={0.8} roughness={0.3} visible={false} />
        </mesh>
        {/* Diagrams on board */}
        {[[-0.5, 0.2, 0], [0.3, -0.1, 0], [-0.2, -0.3, 0]].map((pos, i) => (
          <mesh key={i} position={[pos[0], pos[1], 0.026]}>
            <boxGeometry args={[0.4 + i * 0.1, 0.06, 0.002]} />
            <meshStandardMaterial color={['#1a1aff', '#ff1a1a', '#1aff1a'][i]} />
          </mesh>
        ))}
        {/* Network topology lines */}
        <mesh position={[0.5, 0.3, 0.026]}>
          <boxGeometry args={[0.01, 0.15, 0.002]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        {/* Click target */}
        <mesh position={[0, 0, 0.1]} visible={false}
          onClick={onUse}
          onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}>
          <boxGeometry args={[2, 1.2, 0.02]} />
        </mesh>
      </Float>
      {/* Label */}
      <Html position={[0, 0.8, 0.1]} center>
        <div style={{
          color: canUse ? '#ffffff' : '#888', fontSize: '9px', fontFamily: 'monospace',
          whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.7)', padding: '2px 8px', borderRadius: '3px',
          border: hovered ? '1px solid #00aaff' : '1px solid transparent',
          transform: hovered ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.2s'
        }}>
          {object.label} {canUse ? '📋' : '(cooldown)'}
        </div>
      </Html>
    </group>
  );
}

function ServerRack({ object, onUse }: { object: InteractiveObjectState; onUse: () => void }) {
  const [hovered, setHovered] = useState(false);
  const canUse = useGameStore((state) => state.canUseInteractiveObject(object.id));
  const ledRefs = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)];

  useFrame((state) => {
    ledRefs.forEach((ref, i) => {
      if (ref.current) {
        const mat = ref.current.material as THREE.MeshStandardMaterial;
        const blink = Math.sin(state.clock.elapsedTime * 3 + i * 0.8) > 0;
        mat.color.set(blink ? '#00ff44' : '#004400');
        mat.emissive?.set(blink ? '#00ff44' : '#004400');
      }
    });
  });

  return (
    <group position={object.position}>
      {/* Rack frame */}
      <mesh position={[0, 1, 0]} castShadow>
        <boxGeometry args={[0.7, 2, 0.8]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Servers (4U each) */}
      {[0, 1, 2, 3].map((i) => (
        <group key={i} position={[0, 0.3 + i * 0.45, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.6, 0.35, 0.65]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.3} />
          </mesh>
          {/* Front bezel */}
          <mesh position={[0, 0, 0.33]}>
            <boxGeometry args={[0.55, 0.3, 0.02]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.6} />
          </mesh>
          {/* LED indicators */}
          <mesh ref={ledRefs[i]} position={[-0.2, 0.1, 0.34]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color="#00ff44" emissive="#00ff44" emissiveIntensity={0.8} />
          </mesh>
          {/* Drive bay indicators */}
          {[0, 1, 2].map(j => (
            <mesh key={j} position={[0 + j * 0.15, 0.05, 0.34]}>
              <boxGeometry args={[0.08, 0.06, 0.01]} />
              <meshStandardMaterial color="#00ff44" emissive="#00ff44" emissiveIntensity={0.5} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Click target */}
      <mesh position={[0, 1, 0.45]} visible={false}
        onClick={onUse}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}>
        <boxGeometry args={[0.7, 2, 0.05]} />
      </mesh>
      {/* Label */}
      <Html position={[0, 2.2, 0]} center>
        <div style={{
          color: canUse ? '#00ff44' : '#888', fontSize: '9px', fontFamily: 'monospace',
          whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.7)', padding: '2px 8px', borderRadius: '3px',
          border: hovered ? '1px solid #00ff44' : '1px solid transparent',
          transform: hovered ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.2s'
        }}>
          {object.label} {canUse ? '🖥️' : '(cooldown)'}
        </div>
      </Html>
    </group>
  );
}

export function InteractiveObjects({ object }: InteractiveObjectsProps) {
  const useObject = useGameStore((state) => state.useInteractiveObject);
  const [message, setMessage] = useState<string | null>(null);

  const handleUse = () => {
    const result = useObject(object.id);
    setMessage(result);
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <group>
      {object.type === 'coffee_machine' && <CoffeeMachine object={object} onUse={handleUse} />}
      {object.type === 'whiteboard' && <Whiteboard object={object} onUse={handleUse} />}
      {object.type === 'server_rack' && <ServerRack object={object} onUse={handleUse} />}
      {message && (
        <Html position={[object.position[0], object.position[1] + 0.3, object.position[2]]} center>
          <div style={{
            color: '#00ff88', fontSize: '10px', fontFamily: 'monospace',
            background: 'rgba(0,0,0,0.8)', padding: '4px 10px', borderRadius: '4px',
            whiteSpace: 'nowrap', animation: 'fadeOut 3s forwards',
          }}>
            {message}
          </div>
          <style>{`@keyframes fadeOut { 0%,70% { opacity:1 } 100% { opacity:0 } }`}</style>
        </Html>
      )}
    </group>
  );
}

export default InteractiveObjects;
