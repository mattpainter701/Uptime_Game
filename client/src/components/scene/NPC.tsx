/**
 * NPC.tsx - Sprint 8
 * Non-player characters with dialogue trees
 * 3 roles: manager, coworker, helpdesk
 */

import { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import type { NPCState, NPCRole } from '../../types/game';

interface NPCProps {
  npc: NPCState;
}

const ROLE_COLORS: Record<NPCRole, string> = {
  manager: '#ffd700',
  coworker: '#4a90d9',
  helpdesk: '#44cc88',
};

const ROLE_LABELS: Record<NPCRole, string> = {
  manager: 'Manager',
  coworker: 'Engineer',
  helpdesk: 'Help Desk',
};

function NPCModel({ role, hovered }: { role: NPCRole; hovered: boolean }) {
  const color = ROLE_COLORS[role];

  return (
    <group>
      {/* Body */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[0.35, 0.6, 0.25]} />
        <meshStandardMaterial color={hovered ? color : '#3a3a5e'} roughness={0.5} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.15, 0]} castShadow>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color={hovered ? color : '#4a4a6e'} roughness={0.6} />
      </mesh>
      {/* Arms */}
      <mesh position={[-0.25, 0.85, 0]} castShadow>
        <boxGeometry args={[0.1, 0.4, 0.1]} />
        <meshStandardMaterial color={hovered ? color : '#3a3a5e'} roughness={0.5} />
      </mesh>
      <mesh position={[0.25, 0.85, 0]} castShadow>
        <boxGeometry args={[0.1, 0.4, 0.1]} />
        <meshStandardMaterial color={hovered ? color : '#3a3a5e'} roughness={0.5} />
      </mesh>
      {/* Legs */}
      <mesh position={[-0.1, 0.25, 0]} castShadow>
        <boxGeometry args={[0.12, 0.4, 0.12]} />
        <meshStandardMaterial color="#2a2a4e" roughness={0.6} />
      </mesh>
      <mesh position={[0.1, 0.25, 0]} castShadow>
        <boxGeometry args={[0.12, 0.4, 0.12]} />
        <meshStandardMaterial color="#2a2a4e" roughness={0.6} />
      </mesh>
      {/* Role indicator light */}
      <mesh position={[0, 1.3, 0]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hovered ? 1 : 0.5} />
      </mesh>
    </group>
  );
}

function DialogueBox({ npc, onClose, onRespond }: {
  npc: NPCState;
  onClose: () => void;
  onRespond: (index: number) => void;
}) {
  const dialogue = useGameStore((state) => state.npcDialogue);
  const line = npc.dialogueTree[dialogue.currentLineIndex];

  if (!line) return null;

  return (
    <Html position={[npc.position[0], npc.position[1] + 2, npc.position[2]]} center>
      <div style={{
        background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
        border: `2px solid ${ROLE_COLORS[npc.role]}`,
        borderRadius: '8px',
        padding: '12px',
        minWidth: '250px',
        maxWidth: '320px',
        fontFamily: 'monospace',
        color: '#e0e0e0',
        boxShadow: `0 0 15px ${ROLE_COLORS[npc.role]}44`,
      }}>
        {/* NPC Name & Role */}
        <div style={{
          fontSize: '10px', color: ROLE_COLORS[npc.role],
          borderBottom: '1px solid #333', paddingBottom: '4px', marginBottom: '8px',
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>{npc.name}</span>
          <span style={{ opacity: 0.7 }}>{ROLE_LABELS[npc.role]}</span>
        </div>

        {/* Dialogue text */}
        <div style={{ fontSize: '12px', marginBottom: '12px', lineHeight: '1.4' }}>
          {line.text}
        </div>

        {/* Response options */}
        {line.responses && line.responses.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {line.responses.map((resp, i) => (
              <button
                key={i}
                onClick={() => onRespond(i)}
                style={{
                  padding: '6px 12px',
                  background: 'linear-gradient(90deg, #252540 0%, #353560 100%)',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  color: '#ccc',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(90deg, #353560 0%, #454580 100%)';
                  e.currentTarget.style.borderColor = ROLE_COLORS[npc.role];
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(90deg, #252540 0%, #353560 100%)';
                  e.currentTarget.style.borderColor = '#444';
                  e.currentTarget.style.color = '#ccc';
                }}
              >
                {resp.text}
              </button>
            ))}
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            marginTop: line.responses ? '8px' : '4px',
            width: '100%',
            padding: '4px',
            background: 'transparent',
            border: '1px solid #444',
            borderRadius: '4px',
            color: '#666',
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: '10px',
          }}
        >
          [CLOSE]
        </button>
      </div>
    </Html>
  );
}

export function NPC({ npc }: NPCProps) {
  const [hovered, setHovered] = useState(false);
  const startDialogue = useGameStore((state) => state.startNpcDialogue);
  const advanceDialogue = useGameStore((state) => state.advanceNpcDialogue);
  const closeDialogue = useGameStore((state) => state.closeNpcDialogue);
  const dialogueState = useGameStore((state) => state.npcDialogue);
  const isActive = dialogueState.activeNpcId === npc.id;
  const indicatorRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (indicatorRef.current && !isActive) {
      const mat = indicatorRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
    }
  });

  return (
    <group position={npc.position} rotation={[0, npc.rotation, 0]}>
      {/* NPC model */}
      <mesh
        visible={false}
        position={[0, 1, 0]}
        onClick={() => !isActive && !npc.spokenToday && startDialogue(npc.id)}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = npc.spokenToday ? 'default' : 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <boxGeometry args={[0.5, 2, 0.5]} />
      </mesh>

      <NPCModel role={npc.role} hovered={hovered} />

      {/* Indicator above head when interactable */}
      {!npc.spokenToday && !isActive && (
        <mesh ref={indicatorRef} position={[0, 1.45, 0]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.5} />
        </mesh>
      )}

      {/* Nameplate */}
      <Html position={[0, 1.5, 0]} center>
        <div style={{
          color: ROLE_COLORS[npc.role],
          fontSize: '8px',
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
          background: 'rgba(0,0,0,0.6)',
          padding: '1px 6px',
          borderRadius: '3px',
          opacity: hovered ? 1 : 0.5,
          transition: 'opacity 0.3s',
        }}>
          {npc.name} {npc.spokenToday ? '✓' : '!'}
        </div>
      </Html>

      {/* Dialogue box when active */}
      {isActive && (
        <DialogueBox
          npc={npc}
          onClose={closeDialogue}
          onRespond={(index) => advanceDialogue(index)}
        />
      )}
    </group>
  );
}

export default NPC;
