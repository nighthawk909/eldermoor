/* =====================================================================
   Non-armour headwear & face coverings (hats, wraps, crowns, skull face).
   ===================================================================== */
import { FlatMat } from './BodyParts';
import type { PartProps } from '../characterTypes';

/** Tall pointed wizard hat with a brim. */
export function WizardHat({ color, accent }: PartProps) {
  return (
    <group>
      <mesh castShadow position={[0, 0.45, -0.02]} rotation={[0.08, 0, 0.04]}>
        <coneGeometry args={[0.3, 0.8, 6]} />
        <FlatMat color={color} />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.06, 8]} />
        <FlatMat color={color} />
      </mesh>
      <mesh position={[0, 0.78, 0.02]}>
        <icosahedronGeometry args={[0.07, 0]} />
        <FlatMat color={accent ?? '#4cc9f0'} />
      </mesh>
    </group>
  );
}

/** Tricorne-ish pirate hat. */
export function PirateHat({ color, accent }: PartProps) {
  return (
    <group position={[0, 0.18, 0]}>
      <mesh castShadow rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.46, 0.5, 0.1, 3]} />
        <FlatMat color={color} />
      </mesh>
      <mesh position={[0, -0.06, 0]}>
        <coneGeometry args={[0.34, 0.22, 6]} />
        <FlatMat color={color} />
      </mesh>
      {/* skull emblem */}
      <mesh position={[0, 0.02, 0.3]}>
        <boxGeometry args={[0.08, 0.08, 0.04]} />
        <FlatMat color={accent ?? '#e0cda0'} />
      </mesh>
    </group>
  );
}

/** Simple pointed crown. */
export function Crown({ color, accent }: PartProps) {
  return (
    <group position={[0, 0.22, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.34, 0.34, 0.14, 6]} />
        <FlatMat color={color} metal />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.3, 0.12, Math.sin(a) * 0.3]}>
            <coneGeometry args={[0.05, 0.16, 4]} />
            <FlatMat color={accent ?? '#bfe6f0'} metal />
          </mesh>
        );
      })}
    </group>
  );
}

/** Skull face plate for the skeleton fighter. */
export function SkullFace({ color, accent }: PartProps) {
  return (
    <group position={[0, 0, 0.02]}>
      <mesh castShadow>
        <dodecahedronGeometry args={[0.3, 0]} />
        <FlatMat color={color} />
      </mesh>
      <mesh position={[-0.1, 0.02, 0.26]}><boxGeometry args={[0.08, 0.09, 0.05]} /><FlatMat color={accent ?? '#1a1a1a'} /></mesh>
      <mesh position={[0.1, 0.02, 0.26]}><boxGeometry args={[0.08, 0.09, 0.05]} /><FlatMat color={accent ?? '#1a1a1a'} /></mesh>
      <mesh position={[0, -0.16, 0.26]}><boxGeometry args={[0.16, 0.05, 0.04]} /><FlatMat color={accent ?? '#1a1a1a'} /></mesh>
    </group>
  );
}

/** Desert nomad cloth wrap covering the head, leaving an eye slit. */
export function DesertWrap({ color, accent }: PartProps) {
  return (
    <group>
      <mesh castShadow position={[0, 0.05, 0]}>
        <sphereGeometry args={[0.36, 6, 5]} />
        <FlatMat color={color} />
      </mesh>
      {/* drape down the back/side */}
      <mesh position={[0.05, -0.2, -0.18]} rotation={[0.3, 0, 0.1]}>
        <boxGeometry args={[0.4, 0.5, 0.06]} />
        <FlatMat color={accent ?? color} />
      </mesh>
      {/* eye slit */}
      <mesh position={[0, 0.0, 0.3]}>
        <boxGeometry args={[0.3, 0.06, 0.06]} />
        <FlatMat color="#1a1410" />
      </mesh>
    </group>
  );
}
