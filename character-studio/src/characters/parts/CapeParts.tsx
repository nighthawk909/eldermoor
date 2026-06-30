/* =====================================================================
   Cape — a faceted draped sheet behind the torso. Double-sided so it
   reads from both front and back.
   ===================================================================== */
import * as THREE from 'three';
import { FlatMat } from './BodyParts';
import type { PartProps } from '../characterTypes';

export function Cape({ color }: PartProps) {
  return (
    <group position={[0, 0.1, -0.26]} rotation={[0.18, 0, 0]}>
      <mesh castShadow>
        <planeGeometry args={[0.7, 1.25, 2, 3]} />
        <meshStandardMaterial color={color} flatShading roughness={0.95} metalness={0.04} side={THREE.DoubleSide} />
      </mesh>
      {/* shoulder clasp bar so it reads as attached */}
      <mesh position={[0, 0.6, 0.02]}>
        <boxGeometry args={[0.74, 0.1, 0.06]} />
        <FlatMat color={color} />
      </mesh>
    </group>
  );
}
