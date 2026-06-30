/* =====================================================================
   CharacterSheet — lays the 12 characters out in a 4x3 grid, each on a
   small circular base with a label, like a character viewer.
   ===================================================================== */
import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { Character } from './Character';
import { createCharacterSheet } from '../characters/characterFactory';
import type { AnimationState } from '../characters/characterTypes';

interface SheetProps {
  seed: number;
  animation: AnimationState | 'auto';
}

const COLS = 4;
const SPACING_X = 3.0;
const SPACING_Z = 3.7;

export function CharacterSheet({ seed, animation }: SheetProps) {
  const roster = useMemo(() => createCharacterSheet(seed), [seed]);
  const rows = Math.ceil(roster.length / COLS);
  const originX = -((COLS - 1) / 2) * SPACING_X;
  const originZ = -((rows - 1) / 2) * SPACING_Z;

  return (
    <group>
      {roster.map((cfg, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const x = originX + col * SPACING_X;
        const z = originZ + row * SPACING_Z;
        return (
          <group key={cfg.id} position={[x, 0, z]}>
            {/* circular base */}
            <mesh position={[0, -0.06, 0]} receiveShadow>
              <cylinderGeometry args={[0.95, 1.05, 0.12, 18]} />
              <meshStandardMaterial color="#211d17" flatShading roughness={1} metalness={0} />
            </mesh>
            <Character config={cfg} animation={animation === 'auto' ? undefined : animation} phase={i * 0.7} />
            {/* label */}
            <Html position={[0, -0.45, 0]} center distanceFactor={9}>
              <div
                style={{
                  font: '600 13px -apple-system,Segoe UI,Roboto,sans-serif',
                  color: '#efe7d4',
                  background: 'rgba(20,17,12,0.85)',
                  border: '1px solid #3a2f1f',
                  borderRadius: 6,
                  padding: '3px 9px',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                }}
              >
                {cfg.name}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

export default CharacterSheet;
