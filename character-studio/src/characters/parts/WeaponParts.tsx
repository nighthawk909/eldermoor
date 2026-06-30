/* =====================================================================
   Oversized, readable low-poly weapons. Each is authored with its grip
   near the local origin so Character can drop it straight into a hand.
   ===================================================================== */
import { FlatMat } from './BodyParts';
import type { PartProps } from '../characterTypes';

export function Sword({ color, accent }: PartProps) {
  return (
    <group>
      <mesh position={[0, 0.02, 0]}><boxGeometry args={[0.08, 0.18, 0.08]} /><FlatMat color={accent ?? '#5a3f28'} /></mesh>
      <mesh position={[0, 0.14, 0]}><boxGeometry args={[0.32, 0.07, 0.1]} /><FlatMat color={color} metal /></mesh>
      <mesh castShadow position={[0, 0.62, 0]}><boxGeometry args={[0.13, 0.86, 0.04]} /><FlatMat color={color} metal /></mesh>
      <mesh position={[0, 1.07, 0]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[0.092, 0.092, 0.04]} /><FlatMat color={color} metal /></mesh>
    </group>
  );
}

export function Dagger({ color, accent }: PartProps) {
  return (
    <group>
      <mesh position={[0, 0.02, 0]}><boxGeometry args={[0.07, 0.15, 0.07]} /><FlatMat color={accent ?? '#3a2a1c'} /></mesh>
      <mesh position={[0, 0.11, 0]}><boxGeometry args={[0.2, 0.05, 0.08]} /><FlatMat color={color} metal /></mesh>
      <mesh castShadow position={[0, 0.34, 0]}><boxGeometry args={[0.1, 0.42, 0.03]} /><FlatMat color={color} metal /></mesh>
      <mesh position={[0, 0.56, 0]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[0.07, 0.07, 0.03]} /><FlatMat color={color} metal /></mesh>
    </group>
  );
}

export function Staff({ color, accent }: PartProps) {
  return (
    <group>
      <mesh castShadow position={[0, 0.55, 0]}><cylinderGeometry args={[0.045, 0.055, 1.5, 6]} /><FlatMat color={color} /></mesh>
      <mesh position={[0, 1.34, 0]}><icosahedronGeometry args={[0.13, 0]} /><FlatMat color={accent ?? '#4cc9f0'} /></mesh>
      <mesh position={[0, 1.18, 0]}><cylinderGeometry args={[0.1, 0.06, 0.12, 6]} /><FlatMat color={color} metal /></mesh>
    </group>
  );
}

export function Bow({ color, accent }: PartProps) {
  return (
    <group rotation={[0, 0, 0]}>
      <mesh castShadow position={[0, 0.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.55, 0.035, 5, 9, Math.PI * 1.15]} />
        <FlatMat color={color} />
      </mesh>
      {/* string */}
      <mesh position={[0, 0.5, 0]}><boxGeometry args={[0.012, 1.02, 0.012]} /><FlatMat color={accent ?? '#e0d8c0'} /></mesh>
    </group>
  );
}

export function Mace({ color, accent }: PartProps) {
  return (
    <group>
      <mesh castShadow position={[0, 0.4, 0]}><cylinderGeometry args={[0.05, 0.06, 0.9, 6]} /><FlatMat color={accent ?? '#5a3f28'} /></mesh>
      <mesh position={[0, 0.92, 0]}><icosahedronGeometry args={[0.18, 0]} /><FlatMat color={color} metal /></mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.18, 0.92, Math.sin(a) * 0.18]} rotation={[Math.PI / 2, 0, a]}>
            <coneGeometry args={[0.05, 0.12, 4]} /><FlatMat color={color} metal />
          </mesh>
        );
      })}
    </group>
  );
}

export function Axe({ color, accent }: PartProps) {
  return (
    <group>
      <mesh castShadow position={[0, 0.45, 0]}><cylinderGeometry args={[0.05, 0.055, 1.0, 6]} /><FlatMat color={accent ?? '#5a3f28'} /></mesh>
      <mesh position={[0.16, 0.9, 0]} rotation={[0, 0, -0.15]}><boxGeometry args={[0.34, 0.34, 0.05]} /><FlatMat color={color} metal /></mesh>
      <mesh position={[0.34, 0.9, 0]} rotation={[0, 0, -Math.PI / 2 - 0.15]}><coneGeometry args={[0.18, 0.36, 3]} /><FlatMat color={color} metal /></mesh>
    </group>
  );
}

export function Spear({ color, accent }: PartProps) {
  return (
    <group>
      <mesh castShadow position={[0, 0.5, 0]}><cylinderGeometry args={[0.04, 0.045, 1.5, 6]} /><FlatMat color={accent ?? '#5a3f28'} /></mesh>
      <mesh position={[0, 1.36, 0]}><coneGeometry args={[0.1, 0.36, 4]} /><FlatMat color={color} metal /></mesh>
    </group>
  );
}

/** Round shield — a faceted disc with a rim and central boss. Offhand. */
export function Shield({ color, accent }: PartProps) {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow><cylinderGeometry args={[0.34, 0.34, 0.08, 8]} /><FlatMat color={color} metal /></mesh>
      <mesh position={[0, 0.05, 0]}><cylinderGeometry args={[0.36, 0.36, 0.04, 8]} /><FlatMat color={accent ?? '#5c3a1e'} metal /></mesh>
      <mesh position={[0, 0.08, 0]}><icosahedronGeometry args={[0.09, 0]} /><FlatMat color={accent ?? '#d8b25a'} metal /></mesh>
    </group>
  );
}
