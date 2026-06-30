/* =====================================================================
   Armour & helmets — layered OVER the body parts. Flat-shaded, faceted.
   ===================================================================== */
import { FlatMat } from './BodyParts';
import type { PartProps } from '../characterTypes';

/** Plate chest shell, sits just proud of the torso. */
export function ChestArmor({ color, accent }: PartProps) {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.7, 0.72, 0.5]} />
        <FlatMat color={color} metal />
      </mesh>
      {/* emblem / belt accent */}
      <mesh position={[0, -0.42, 0.24]}>
        <boxGeometry args={[0.74, 0.12, 0.52]} />
        <FlatMat color={accent ?? '#5c3a1e'} />
      </mesh>
    </group>
  );
}

/** Tapered faceted robe skirt that flares below the torso. */
export function Robe({ color, accent }: PartProps) {
  return (
    <group>
      <mesh castShadow position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.36, 0.62, 1.05, 6, 1]} />
        <FlatMat color={color} />
      </mesh>
      <mesh position={[0, -0.02, 0.01]}>
        <cylinderGeometry args={[0.3, 0.36, 0.2, 6, 1]} />
        <FlatMat color={accent ?? color} />
      </mesh>
    </group>
  );
}

/** Two angular shoulder pads. */
export function ShoulderPads({ color }: PartProps) {
  return (
    <group>
      {[-1, 1].map((s) => (
        <mesh key={s} castShadow position={[s * 0.42, 0.3, 0]} rotation={[0, 0, s * -0.3]}>
          <boxGeometry args={[0.26, 0.2, 0.5]} />
          <FlatMat color={color} metal />
        </mesh>
      ))}
    </group>
  );
}

/** Domed metal helmet with a brow guard. */
export function Helmet({ color, accent }: PartProps) {
  return (
    <group>
      <mesh castShadow position={[0, 0.05, 0]}>
        <coneGeometry args={[0.36, 0.42, 6]} />
        <FlatMat color={color} metal />
      </mesh>
      <mesh position={[0, -0.12, 0.26]}>
        <boxGeometry args={[0.5, 0.12, 0.16]} />
        <FlatMat color={accent ?? color} metal />
      </mesh>
      {/* nasal guard */}
      <mesh position={[0, -0.22, 0.32]}>
        <boxGeometry args={[0.07, 0.2, 0.08]} />
        <FlatMat color={color} metal />
      </mesh>
    </group>
  );
}

/** Cloth hood — faceted cone with a shadowed face opening. */
export function Hood({ color, accent }: PartProps) {
  return (
    <group>
      <mesh castShadow position={[0, 0.06, -0.04]}>
        <coneGeometry args={[0.42, 0.6, 6]} />
        <FlatMat color={color} />
      </mesh>
      {/* dark face void */}
      <mesh position={[0, -0.05, 0.24]}>
        <boxGeometry args={[0.34, 0.34, 0.12]} />
        <FlatMat color={accent ?? '#0c0a08'} />
      </mesh>
    </group>
  );
}

/** Druid hood with branching antlers. */
export function AntlerHood({ color, accent }: PartProps) {
  const antler = (s: number) => (
    <group position={[s * 0.22, 0.28, -0.02]} rotation={[0, 0, s * -0.2]}>
      <mesh castShadow><cylinderGeometry args={[0.03, 0.05, 0.5, 5]} /><FlatMat color={accent ?? '#d8c98a'} /></mesh>
      <mesh position={[s * 0.12, 0.28, 0]} rotation={[0, 0, s * -0.9]}>
        <cylinderGeometry args={[0.02, 0.035, 0.26, 5]} /><FlatMat color={accent ?? '#d8c98a'} />
      </mesh>
      <mesh position={[s * -0.05, 0.3, 0]} rotation={[0, 0, s * 0.6]}>
        <cylinderGeometry args={[0.02, 0.035, 0.22, 5]} /><FlatMat color={accent ?? '#d8c98a'} />
      </mesh>
    </group>
  );
  return (
    <group>
      <mesh castShadow position={[0, 0.04, -0.04]}>
        <coneGeometry args={[0.4, 0.5, 6]} />
        <FlatMat color={color} />
      </mesh>
      {antler(-1)}
      {antler(1)}
    </group>
  );
}
