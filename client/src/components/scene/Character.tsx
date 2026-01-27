import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PlayerPose } from '../../types/game';

interface CharacterProps {
  position?: [number, number, number];
  pose?: PlayerPose;
  isMoving?: boolean;
}

// Low-poly office geek character with seated/standing/walking poses
export function Character({
  position = [0, 0, 0],
  pose = 'seated',
  isMoving = false,
}: CharacterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);

  // Animation
  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Head animation
    if (headRef.current) {
      if (pose === 'seated') {
        // Slight head bob and look around while working
        headRef.current.rotation.y = Math.sin(time * 0.5) * 0.1;
        headRef.current.rotation.x = Math.sin(time * 0.3) * 0.05 - 0.1;
      } else {
        // Look ahead while walking
        headRef.current.rotation.y = 0;
        headRef.current.rotation.x = isMoving ? -0.1 : 0;
      }
    }

    // Walking animation
    if (isMoving && pose === 'walking') {
      const walkSpeed = 8;
      const legSwing = Math.sin(time * walkSpeed) * 0.5;
      const armSwing = Math.sin(time * walkSpeed) * 0.3;

      if (leftLegRef.current) {
        leftLegRef.current.rotation.x = legSwing;
      }
      if (rightLegRef.current) {
        rightLegRef.current.rotation.x = -legSwing;
      }
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = -armSwing;
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = armSwing;
      }
    } else if (pose !== 'seated') {
      // Reset to standing pose
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0;
      if (rightArmRef.current) rightArmRef.current.rotation.x = 0;
    }

    // Subtle breathing
    if (groupRef.current) {
      const breathe = Math.sin(time * 2) * 0.005;
      groupRef.current.position.y = position[1] + breathe;
    }
  });

  const skinColor = '#e8beac';
  const hairColor = '#2a1a0a';
  const shirtColor = '#1a3a5c';
  const pantsColor = '#2d2d3a';
  const glassesColor = '#1a1a1a';

  // Different body configurations based on pose
  const isSeated = pose === 'seated';
  const bodyY = isSeated ? 0.5 : 0.9;

  return (
    <group ref={groupRef} position={position}>
      {/* Body */}
      <group position={[0, bodyY, 0]}>
        {/* Torso */}
        <mesh position={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[0.35, 0.4, 0.2]} />
          <meshStandardMaterial color={shirtColor} roughness={0.8} />
        </mesh>

        {/* Shirt collar */}
        <mesh position={[0, 0.52, 0.08]}>
          <boxGeometry args={[0.15, 0.08, 0.08]} />
          <meshStandardMaterial color="#f0f0f0" roughness={0.6} />
        </mesh>

        {/* Arms */}
        {isSeated ? (
          // Seated arms - reaching forward to keyboard
          <>
            {[-0.22, 0.22].map((x, i) => (
              <group key={i} position={[x, 0.35, 0]}>
                <mesh position={[0, -0.05, 0.08]} rotation={[0.5, 0, x > 0 ? -0.3 : 0.3]} castShadow>
                  <boxGeometry args={[0.1, 0.22, 0.1]} />
                  <meshStandardMaterial color={shirtColor} roughness={0.8} />
                </mesh>
                <mesh position={[x > 0 ? 0.08 : -0.08, -0.12, 0.22]} rotation={[1.2, 0, 0]} castShadow>
                  <boxGeometry args={[0.09, 0.2, 0.09]} />
                  <meshStandardMaterial color={shirtColor} roughness={0.8} />
                </mesh>
                <mesh position={[x > 0 ? 0.1 : -0.1, -0.15, 0.35]} castShadow>
                  <boxGeometry args={[0.08, 0.06, 0.1]} />
                  <meshStandardMaterial color={skinColor} roughness={0.7} />
                </mesh>
              </group>
            ))}
          </>
        ) : (
          // Standing/walking arms - at sides
          <>
            <group ref={leftArmRef} position={[-0.25, 0.25, 0]}>
              <mesh position={[0, -0.15, 0]} castShadow>
                <boxGeometry args={[0.1, 0.3, 0.1]} />
                <meshStandardMaterial color={shirtColor} roughness={0.8} />
              </mesh>
              <mesh position={[0, -0.35, 0]} castShadow>
                <boxGeometry args={[0.09, 0.2, 0.09]} />
                <meshStandardMaterial color={skinColor} roughness={0.7} />
              </mesh>
            </group>
            <group ref={rightArmRef} position={[0.25, 0.25, 0]}>
              <mesh position={[0, -0.15, 0]} castShadow>
                <boxGeometry args={[0.1, 0.3, 0.1]} />
                <meshStandardMaterial color={shirtColor} roughness={0.8} />
              </mesh>
              <mesh position={[0, -0.35, 0]} castShadow>
                <boxGeometry args={[0.09, 0.2, 0.09]} />
                <meshStandardMaterial color={skinColor} roughness={0.7} />
              </mesh>
            </group>
          </>
        )}

        {/* Legs */}
        {isSeated ? (
          // Seated legs - bent at knees
          <>
            {[-0.1, 0.1].map((x, i) => (
              <group key={i} position={[x, 0, 0]}>
                <mesh position={[0, 0.05, 0.15]} rotation={[1.5, 0, 0]} castShadow>
                  <boxGeometry args={[0.14, 0.25, 0.14]} />
                  <meshStandardMaterial color={pantsColor} roughness={0.8} />
                </mesh>
                <mesh position={[0, -0.2, 0.25]} castShadow>
                  <boxGeometry args={[0.12, 0.35, 0.12]} />
                  <meshStandardMaterial color={pantsColor} roughness={0.8} />
                </mesh>
                <mesh position={[0, -0.38, 0.3]} castShadow>
                  <boxGeometry args={[0.1, 0.06, 0.18]} />
                  <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
                </mesh>
              </group>
            ))}
          </>
        ) : (
          // Standing/walking legs
          <>
            <group ref={leftLegRef} position={[-0.1, 0, 0]}>
              <mesh position={[0, -0.2, 0]} castShadow>
                <boxGeometry args={[0.14, 0.4, 0.14]} />
                <meshStandardMaterial color={pantsColor} roughness={0.8} />
              </mesh>
              <mesh position={[0, -0.55, 0]} castShadow>
                <boxGeometry args={[0.12, 0.35, 0.12]} />
                <meshStandardMaterial color={pantsColor} roughness={0.8} />
              </mesh>
              <mesh position={[0, -0.75, 0.05]} castShadow>
                <boxGeometry args={[0.1, 0.06, 0.18]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
              </mesh>
            </group>
            <group ref={rightLegRef} position={[0.1, 0, 0]}>
              <mesh position={[0, -0.2, 0]} castShadow>
                <boxGeometry args={[0.14, 0.4, 0.14]} />
                <meshStandardMaterial color={pantsColor} roughness={0.8} />
              </mesh>
              <mesh position={[0, -0.55, 0]} castShadow>
                <boxGeometry args={[0.12, 0.35, 0.12]} />
                <meshStandardMaterial color={pantsColor} roughness={0.8} />
              </mesh>
              <mesh position={[0, -0.75, 0.05]} castShadow>
                <boxGeometry args={[0.1, 0.06, 0.18]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
              </mesh>
            </group>
          </>
        )}

        {/* Head group */}
        <group ref={headRef} position={[0, 0.7, 0]}>
          {/* Head */}
          <mesh castShadow>
            <boxGeometry args={[0.22, 0.26, 0.22]} />
            <meshStandardMaterial color={skinColor} roughness={0.7} />
          </mesh>

          {/* Hair - messy programmer hair */}
          <mesh position={[0, 0.12, -0.02]} castShadow>
            <boxGeometry args={[0.24, 0.08, 0.24]} />
            <meshStandardMaterial color={hairColor} roughness={0.9} />
          </mesh>
          <mesh position={[-0.11, 0.02, 0]}>
            <boxGeometry args={[0.04, 0.18, 0.2]} />
            <meshStandardMaterial color={hairColor} roughness={0.9} />
          </mesh>
          <mesh position={[0.11, 0.02, 0]}>
            <boxGeometry args={[0.04, 0.18, 0.2]} />
            <meshStandardMaterial color={hairColor} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0, -0.11]}>
            <boxGeometry args={[0.22, 0.2, 0.04]} />
            <meshStandardMaterial color={hairColor} roughness={0.9} />
          </mesh>

          {/* Glasses frames */}
          <group position={[0, 0.02, 0.12]}>
            <mesh position={[-0.055, 0, 0]}>
              <boxGeometry args={[0.07, 0.05, 0.02]} />
              <meshStandardMaterial color={glassesColor} roughness={0.3} metalness={0.5} />
            </mesh>
            <mesh position={[0.055, 0, 0]}>
              <boxGeometry args={[0.07, 0.05, 0.02]} />
              <meshStandardMaterial color={glassesColor} roughness={0.3} metalness={0.5} />
            </mesh>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.03, 0.015, 0.015]} />
              <meshStandardMaterial color={glassesColor} roughness={0.3} metalness={0.5} />
            </mesh>
            <mesh position={[-0.055, 0, 0.01]}>
              <planeGeometry args={[0.055, 0.04]} />
              <meshStandardMaterial color="#aaddff" transparent opacity={0.3} />
            </mesh>
            <mesh position={[0.055, 0, 0.01]}>
              <planeGeometry args={[0.055, 0.04]} />
              <meshStandardMaterial color="#aaddff" transparent opacity={0.3} />
            </mesh>
          </group>

          {/* Eyes */}
          <mesh position={[-0.05, 0.02, 0.11]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0.05, 0.02, 0.11]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[-0.05, 0.02, 0.125]}>
            <sphereGeometry args={[0.01, 8, 8]} />
            <meshStandardMaterial color="#2a1a0a" />
          </mesh>
          <mesh position={[0.05, 0.02, 0.125]}>
            <sphereGeometry args={[0.01, 8, 8]} />
            <meshStandardMaterial color="#2a1a0a" />
          </mesh>

          {/* Nose */}
          <mesh position={[0, -0.02, 0.12]}>
            <boxGeometry args={[0.04, 0.05, 0.04]} />
            <meshStandardMaterial color={skinColor} roughness={0.7} />
          </mesh>

          {/* Mouth */}
          <mesh position={[0, -0.08, 0.11]}>
            <boxGeometry args={[0.08, 0.015, 0.02]} />
            <meshStandardMaterial color="#a07060" roughness={0.8} />
          </mesh>

          {/* Ears */}
          <mesh position={[-0.12, 0, 0]}>
            <boxGeometry args={[0.03, 0.06, 0.04]} />
            <meshStandardMaterial color={skinColor} roughness={0.7} />
          </mesh>
          <mesh position={[0.12, 0, 0]}>
            <boxGeometry args={[0.03, 0.06, 0.04]} />
            <meshStandardMaterial color={skinColor} roughness={0.7} />
          </mesh>

          {/* Headphones */}
          <group>
            <mesh position={[0, 0.18, 0]} rotation={[0, 0, 0]}>
              <torusGeometry args={[0.14, 0.015, 8, 16, Math.PI]} />
              <meshStandardMaterial color="#2a2a2a" roughness={0.4} metalness={0.6} />
            </mesh>
            <mesh position={[-0.14, 0.02, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.03, 12]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
            </mesh>
            <mesh position={[-0.14, 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.04, 0.04, 0.01, 12]} />
              <meshStandardMaterial color="#3a3a3a" roughness={0.4} />
            </mesh>
            <mesh position={[0.14, 0.02, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.03, 12]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
            </mesh>
            <mesh position={[0.14, 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.04, 0.04, 0.01, 12]} />
              <meshStandardMaterial color="#3a3a3a" roughness={0.4} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

export default Character;
