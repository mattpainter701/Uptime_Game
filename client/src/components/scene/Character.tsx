import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PlayerPose } from '../../types/game';

interface CharacterProps {
  position?: [number, number, number];
  pose?: PlayerPose;
  isMoving?: boolean;
}

// Stylized office worker character with smooth shapes
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
  const torsoRef = useRef<THREE.Group>(null);

  // Animation
  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Head animation
    if (headRef.current) {
      if (pose === 'seated') {
        headRef.current.rotation.y = Math.sin(time * 0.5) * 0.1;
        headRef.current.rotation.x = Math.sin(time * 0.3) * 0.05 - 0.1;
      } else {
        headRef.current.rotation.y = 0;
        headRef.current.rotation.x = isMoving ? -0.05 : 0;
      }
    }

    // Walking animation
    if (isMoving && pose === 'walking') {
      const walkSpeed = 10;
      const legSwing = Math.sin(time * walkSpeed) * 0.6;
      const armSwing = Math.sin(time * walkSpeed) * 0.4;
      const bodyBob = Math.abs(Math.sin(time * walkSpeed)) * 0.02;

      if (leftLegRef.current) leftLegRef.current.rotation.x = legSwing;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -legSwing;
      if (leftArmRef.current) leftArmRef.current.rotation.x = -armSwing;
      if (rightArmRef.current) rightArmRef.current.rotation.x = armSwing;
      if (torsoRef.current) torsoRef.current.position.y = bodyBob;
    } else if (pose !== 'seated') {
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0;
      if (rightArmRef.current) rightArmRef.current.rotation.x = 0;
      if (torsoRef.current) torsoRef.current.position.y = 0;
    }

    // Subtle breathing
    if (groupRef.current) {
      const breathe = Math.sin(time * 1.5) * 0.003;
      groupRef.current.position.y = position[1] + breathe;
    }
  });

  // Colors - more vibrant and stylized
  const skinColor = '#f5d0c5';
  const skinColorDark = '#e8b8a8';
  const hairColor = '#3d2314';
  const shirtColor = '#2563eb'; // Nice blue
  const pantsColor = '#374151';
  const shoeColor = '#f5f5f5';

  // Shared materials for better performance
  const skinMaterial = useMemo(() => (
    <meshStandardMaterial color={skinColor} roughness={0.6} />
  ), []);

  const shirtMaterial = useMemo(() => (
    <meshStandardMaterial color={shirtColor} roughness={0.7} />
  ), []);

  const pantsMaterial = useMemo(() => (
    <meshStandardMaterial color={pantsColor} roughness={0.8} />
  ), []);

  const isSeated = pose === 'seated';
  // When seated, PlayerController positions the group at Y=0.48, so bodyY should be 0
  // When standing, Character needs to position itself at proper height
  const bodyY = isSeated ? 0 : 0.85;

  return (
    <group ref={groupRef} position={position}>
      <group ref={torsoRef} position={[0, bodyY, 0]}>

        {/* === TORSO === */}
        <group position={[0, 0.22, 0]}>
          {/* Main torso - rounded box shape */}
          <mesh castShadow position={[0, 0, 0]}>
            <capsuleGeometry args={[0.14, 0.22, 8, 16]} />
            {shirtMaterial}
          </mesh>

          {/* Shoulders */}
          <mesh castShadow position={[0, 0.12, 0]} rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.06, 0.28, 8, 12]} />
            {shirtMaterial}
          </mesh>

          {/* Collar / neck area */}
          <mesh position={[0, 0.22, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 0.08, 12]} />
            <meshStandardMaterial color={skinColorDark} roughness={0.6} />
          </mesh>
        </group>

        {/* === ARMS === */}
        {isSeated ? (
          // Seated arms - reaching forward to keyboard
          // Arms use absolute positions to ensure hands reach keyboard
          <>
            {[-1, 1].map((side, i) => (
              <group key={i}>
                {/* Upper arm - from shoulder going down and forward */}
                <mesh castShadow position={[side * 0.18, 0.22, 0.08]} rotation={[0.5, 0, side * 0.3]}>
                  <capsuleGeometry args={[0.045, 0.14, 8, 12]} />
                  {shirtMaterial}
                </mesh>
                {/* Elbow */}
                <mesh castShadow position={[side * 0.14, 0.08, 0.14]}>
                  <sphereGeometry args={[0.04, 8, 8]} />
                  {shirtMaterial}
                </mesh>
                {/* Forearm - extending forward toward keyboard */}
                <mesh castShadow position={[side * 0.10, 0.02, 0.24]} rotation={[1.2, 0, side * -0.1]}>
                  <capsuleGeometry args={[0.038, 0.14, 8, 12]} />
                  {shirtMaterial}
                </mesh>
                {/* Wrist */}
                <mesh castShadow position={[side * 0.08, -0.02, 0.34]}>
                  <sphereGeometry args={[0.032, 8, 8]} />
                  {skinMaterial}
                </mesh>
                {/* Hand - on keyboard */}
                <mesh castShadow position={[side * 0.06, -0.04, 0.40]}>
                  <boxGeometry args={[0.05, 0.025, 0.07]} />
                  {skinMaterial}
                </mesh>
              </group>
            ))}
          </>
        ) : (
          // Standing/walking arms
          <>
            <group ref={leftArmRef} position={[-0.22, 0.28, 0]}>
              <mesh castShadow position={[0, -0.12, 0]}>
                <capsuleGeometry args={[0.045, 0.16, 8, 12]} />
                {shirtMaterial}
              </mesh>
              <mesh castShadow position={[0, -0.32, 0]}>
                <capsuleGeometry args={[0.04, 0.14, 8, 12]} />
                {skinMaterial}
              </mesh>
              <mesh castShadow position={[0, -0.46, 0]}>
                <sphereGeometry args={[0.04, 12, 12]} />
                {skinMaterial}
              </mesh>
            </group>
            <group ref={rightArmRef} position={[0.22, 0.28, 0]}>
              <mesh castShadow position={[0, -0.12, 0]}>
                <capsuleGeometry args={[0.045, 0.16, 8, 12]} />
                {shirtMaterial}
              </mesh>
              <mesh castShadow position={[0, -0.32, 0]}>
                <capsuleGeometry args={[0.04, 0.14, 8, 12]} />
                {skinMaterial}
              </mesh>
              <mesh castShadow position={[0, -0.46, 0]}>
                <sphereGeometry args={[0.04, 12, 12]} />
                {skinMaterial}
              </mesh>
            </group>
          </>
        )}

        {/* === HIPS / PELVIS === */}
        <mesh castShadow position={[0, -0.08, 0]}>
          <sphereGeometry args={[0.13, 12, 12]} />
          {pantsMaterial}
        </mesh>

        {/* === LEGS === */}
        {isSeated ? (
          // Seated legs with feet on floor
          // PlayerController positions group at Y=0.48, torsoRef at Y=0
          // So torsoRef world Y = 0.48, floor at world Y = 0
          // Floor relative to torsoRef = -0.48
          <>
            {[-0.07, 0.07].map((x, i) => (
              <group key={i}>
                {/* Thigh - horizontal, extending forward from hip */}
                <mesh castShadow position={[x, -0.10, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
                  <capsuleGeometry args={[0.055, 0.18, 8, 12]} />
                  {pantsMaterial}
                </mesh>
                {/* Knee - in front of body */}
                <mesh castShadow position={[x, -0.10, 0.24]}>
                  <sphereGeometry args={[0.052, 8, 8]} />
                  {pantsMaterial}
                </mesh>
                {/* Lower leg - vertical from knee down to floor */}
                <mesh castShadow position={[x, -0.30, 0.26]}>
                  <capsuleGeometry args={[0.048, 0.32, 8, 12]} />
                  {pantsMaterial}
                </mesh>
                {/* Ankle */}
                <mesh castShadow position={[x, -0.50, 0.26]}>
                  <sphereGeometry args={[0.04, 8, 8]} />
                  {pantsMaterial}
                </mesh>
                {/* Foot - on floor */}
                <mesh castShadow position={[x, -0.50, 0.33]}>
                  <boxGeometry args={[0.08, 0.04, 0.14]} />
                  <meshStandardMaterial color={shoeColor} roughness={0.5} />
                </mesh>
              </group>
            ))}
          </>
        ) : (
          // Standing/walking legs
          <>
            <group ref={leftLegRef} position={[-0.08, -0.12, 0]}>
              {/* Thigh */}
              <mesh castShadow position={[0, -0.14, 0]}>
                <capsuleGeometry args={[0.06, 0.2, 8, 12]} />
                {pantsMaterial}
              </mesh>
              {/* Shin */}
              <mesh castShadow position={[0, -0.42, 0]}>
                <capsuleGeometry args={[0.05, 0.22, 8, 12]} />
                {pantsMaterial}
              </mesh>
              {/* Foot */}
              <mesh castShadow position={[0, -0.62, 0.04]} rotation={[-0.1, 0, 0]}>
                <boxGeometry args={[0.08, 0.05, 0.14]} />
                <meshStandardMaterial color={shoeColor} roughness={0.5} />
              </mesh>
            </group>
            <group ref={rightLegRef} position={[0.08, -0.12, 0]}>
              <mesh castShadow position={[0, -0.14, 0]}>
                <capsuleGeometry args={[0.06, 0.2, 8, 12]} />
                {pantsMaterial}
              </mesh>
              <mesh castShadow position={[0, -0.42, 0]}>
                <capsuleGeometry args={[0.05, 0.22, 8, 12]} />
                {pantsMaterial}
              </mesh>
              <mesh castShadow position={[0, -0.62, 0.04]} rotation={[-0.1, 0, 0]}>
                <boxGeometry args={[0.08, 0.05, 0.14]} />
                <meshStandardMaterial color={shoeColor} roughness={0.5} />
              </mesh>
            </group>
          </>
        )}

        {/* === HEAD === */}
        <group ref={headRef} position={[0, 0.56, 0]}>
          {/* Head - smooth sphere */}
          <mesh castShadow>
            <sphereGeometry args={[0.14, 24, 24]} />
            {skinMaterial}
          </mesh>

          {/* Hair - styled swoosh */}
          <group position={[0, 0.06, 0]}>
            {/* Main hair volume */}
            <mesh castShadow position={[0, 0.04, -0.02]}>
              <sphereGeometry args={[0.13, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color={hairColor} roughness={0.9} />
            </mesh>
            {/* Side hair */}
            <mesh castShadow position={[-0.1, -0.02, 0]}>
              <sphereGeometry args={[0.06, 12, 12]} />
              <meshStandardMaterial color={hairColor} roughness={0.9} />
            </mesh>
            <mesh castShadow position={[0.1, -0.02, 0]}>
              <sphereGeometry args={[0.06, 12, 12]} />
              <meshStandardMaterial color={hairColor} roughness={0.9} />
            </mesh>
            {/* Front styled part */}
            <mesh castShadow position={[0.04, 0.02, 0.1]} rotation={[0.3, 0.2, 0.1]}>
              <boxGeometry args={[0.08, 0.04, 0.06]} />
              <meshStandardMaterial color={hairColor} roughness={0.9} />
            </mesh>
          </group>

          {/* Face features */}
          <group position={[0, -0.02, 0.1]}>
            {/* Eyes - larger, more expressive */}
            <mesh position={[-0.045, 0.02, 0.04]}>
              <sphereGeometry args={[0.025, 16, 16]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0.045, 0.02, 0.04]}>
              <sphereGeometry args={[0.025, 16, 16]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            {/* Pupils */}
            <mesh position={[-0.045, 0.02, 0.065]}>
              <sphereGeometry args={[0.015, 12, 12]} />
              <meshStandardMaterial color="#2d1810" />
            </mesh>
            <mesh position={[0.045, 0.02, 0.065]}>
              <sphereGeometry args={[0.015, 12, 12]} />
              <meshStandardMaterial color="#2d1810" />
            </mesh>
            {/* Eye shine */}
            <mesh position={[-0.04, 0.03, 0.07]}>
              <sphereGeometry args={[0.005, 8, 8]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
            </mesh>
            <mesh position={[0.05, 0.03, 0.07]}>
              <sphereGeometry args={[0.005, 8, 8]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
            </mesh>

            {/* Eyebrows */}
            <mesh position={[-0.045, 0.055, 0.04]} rotation={[0, 0, 0.1]}>
              <boxGeometry args={[0.04, 0.008, 0.015]} />
              <meshStandardMaterial color={hairColor} roughness={0.9} />
            </mesh>
            <mesh position={[0.045, 0.055, 0.04]} rotation={[0, 0, -0.1]}>
              <boxGeometry args={[0.04, 0.008, 0.015]} />
              <meshStandardMaterial color={hairColor} roughness={0.9} />
            </mesh>

            {/* Nose - subtle */}
            <mesh position={[0, -0.01, 0.04]}>
              <sphereGeometry args={[0.02, 12, 12]} />
              <meshStandardMaterial color={skinColorDark} roughness={0.6} />
            </mesh>

            {/* Mouth - slight smile */}
            <mesh position={[0, -0.05, 0.03]}>
              <torusGeometry args={[0.025, 0.006, 8, 12, Math.PI]} />
              <meshStandardMaterial color="#c47a6a" roughness={0.8} />
            </mesh>
          </group>

          {/* Ears */}
          <mesh castShadow position={[-0.135, 0, 0]} rotation={[0, -0.3, 0]}>
            <sphereGeometry args={[0.03, 12, 12]} />
            {skinMaterial}
          </mesh>
          <mesh castShadow position={[0.135, 0, 0]} rotation={[0, 0.3, 0]}>
            <sphereGeometry args={[0.03, 12, 12]} />
            {skinMaterial}
          </mesh>

          {/* Glasses - stylish frames */}
          <group position={[0, 0, 0.12]}>
            {/* Left lens */}
            <mesh position={[-0.05, 0, 0]}>
              <ringGeometry args={[0.025, 0.032, 16]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.2} side={THREE.DoubleSide} />
            </mesh>
            {/* Right lens */}
            <mesh position={[0.05, 0, 0]}>
              <ringGeometry args={[0.025, 0.032, 16]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.2} side={THREE.DoubleSide} />
            </mesh>
            {/* Bridge */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.03, 0.008, 0.008]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Lens glass */}
            <mesh position={[-0.05, 0, 0.002]}>
              <circleGeometry args={[0.024, 16]} />
              <meshStandardMaterial color="#cceeff" transparent opacity={0.2} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0.05, 0, 0.002]}>
              <circleGeometry args={[0.024, 16]} />
              <meshStandardMaterial color="#cceeff" transparent opacity={0.2} side={THREE.DoubleSide} />
            </mesh>
            {/* Temple arms */}
            <mesh position={[-0.08, 0, -0.04]} rotation={[0, 0.3, 0]}>
              <boxGeometry args={[0.08, 0.006, 0.006]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0.08, 0, -0.04]} rotation={[0, -0.3, 0]}>
              <boxGeometry args={[0.08, 0.006, 0.006]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.2} />
            </mesh>
          </group>

          {/* Headphones - sleek design */}
          <group>
            {/* Headband */}
            <mesh position={[0, 0.12, 0]} rotation={[0.1, 0, 0]}>
              <torusGeometry args={[0.14, 0.012, 8, 24, Math.PI]} />
              <meshStandardMaterial color="#2d2d2d" metalness={0.7} roughness={0.3} />
            </mesh>
            {/* Padding on headband */}
            <mesh position={[0, 0.14, -0.02]}>
              <boxGeometry args={[0.08, 0.02, 0.025]} />
              <meshStandardMaterial color="#404040" roughness={0.8} />
            </mesh>
            {/* Left ear cup */}
            <group position={[-0.15, 0.02, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.055, 0.055, 0.025, 16]} />
                <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.4} />
              </mesh>
              <mesh position={[-0.015, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.045, 0.045, 0.01, 16]} />
                <meshStandardMaterial color="#00ccff" emissive="#00ccff" emissiveIntensity={0.3} />
              </mesh>
            </group>
            {/* Right ear cup */}
            <group position={[0.15, 0.02, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.055, 0.055, 0.025, 16]} />
                <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.4} />
              </mesh>
              <mesh position={[0.015, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.045, 0.045, 0.01, 16]} />
                <meshStandardMaterial color="#00ccff" emissive="#00ccff" emissiveIntensity={0.3} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

export default Character;
