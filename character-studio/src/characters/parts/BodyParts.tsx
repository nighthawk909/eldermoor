/* =====================================================================
   Low-poly body parts. All flat-shaded, chunky, minimal detail.
   FlatMat is the shared material helper used across every parts file.
   ===================================================================== */
import type { PartProps } from '../characterTypes';

export function FlatMat({ color, metal = false, rough }: { color: string; metal?: boolean; rough?: number }) {
  return (
    <meshStandardMaterial
      color={color}
      flatShading
      roughness={rough ?? (metal ? 0.42 : 0.95)}
      metalness={metal ? 0.55 : 0.04}
    />
  );
}

/** Chunky dodecahedron head with minimal eyes. */
export function LowPolyHead({ color, scale = 1, accent }: PartProps) {
  return (
    <group scale={scale}>
      <mesh castShadow scale={[1, 1.04, 0.94]}>
        <dodecahedronGeometry args={[0.32, 0]} />
        <FlatMat color={color} />
      </mesh>
      <mesh position={[-0.1, 0.02, 0.28]}>
        <boxGeometry args={[0.05, 0.07, 0.04]} />
        <FlatMat color={accent ?? '#241812'} />
      </mesh>
      <mesh position={[0.1, 0.02, 0.28]}>
        <boxGeometry args={[0.05, 0.07, 0.04]} />
        <FlatMat color={accent ?? '#241812'} />
      </mesh>
    </group>
  );
}

export function LowPolyTorso({
  color, width = 1, height = 0.8, depth = 0.42,
}: { color: string; width?: number; height?: number; depth?: number }) {
  return (
    <mesh castShadow>
      <boxGeometry args={[0.62 * width, height, depth]} />
      <FlatMat color={color} />
    </mesh>
  );
}

/** Upper limb. Origin is at the shoulder; mesh hangs downward by `length`. */
export function LowPolyArm({ color, length = 0.72 }: { color: string; length?: number }) {
  return (
    <mesh castShadow position={[0, -length / 2, 0]}>
      <boxGeometry args={[0.17, length, 0.17]} />
      <FlatMat color={color} />
    </mesh>
  );
}

/** Leg. Origin at the hip; mesh hangs downward by `length`. */
export function LowPolyLeg({ color, length = 0.82 }: { color: string; length?: number }) {
  return (
    <mesh castShadow position={[0, -length / 2, 0]}>
      <boxGeometry args={[0.21, length, 0.21]} />
      <FlatMat color={color} />
    </mesh>
  );
}

/** Oversized boot with a darker sole. */
export function LowPolyBoot({ color, accent }: PartProps) {
  return (
    <group>
      <mesh castShadow position={[0, -0.02, 0.05]}>
        <boxGeometry args={[0.25, 0.18, 0.36]} />
        <FlatMat color={color} />
      </mesh>
      <mesh position={[0, -0.12, 0.06]}>
        <boxGeometry args={[0.27, 0.06, 0.38]} />
        <FlatMat color={accent ?? '#241812'} />
      </mesh>
    </group>
  );
}

/** Big chunky hand. */
export function LowPolyHand({ color, scale = 1 }: PartProps) {
  return (
    <mesh castShadow scale={scale}>
      <boxGeometry args={[0.19, 0.19, 0.19]} />
      <FlatMat color={color} />
    </mesh>
  );
}
