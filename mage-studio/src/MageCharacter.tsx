/* =====================================================================
   MageCharacter.tsx — one low-poly fantasy mage, composed from the custom
   geometry in geometry.ts. Named groups per the brief:
     root, hood, face, torso, robe, robePanels, leftSleeve, rightSleeve,
     leftHand, rightHand, boots, belt, staff, crystal.
   Idle-only animation: a gentle body bob + a slight staff sway + crystal pulse.
   Silhouette Mode swaps every material for a flat dark shape so the OUTLINE
   can be judged.
   ===================================================================== */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  createRobeGeometry, createRobePanelGeometry, createHoodGeometry, createHoodBrowGeometry,
  createSleeveGeometry, createShoulderGeometry, createBootGeometry, createHandGeometry,
  createTorsoGeometry, createStaffGeometry, createCrystalGeometry,
} from './geometry';

/* muted blue / gray / brown palette */
const C = {
  robe: '#3e5468', hood: '#33485a', panel: '#2b3e4d', sleeve: '#3a4f61', cuff: '#283844',
  face: '#0a0d11', skin: '#caa078', boot: '#48382a', belt: '#6a4d2e', buckle: '#c9a24a',
  torso: '#2d3f4e', shoulder: '#2b3d4c', staff: '#5b4632', crystal: '#86dceb',
};

type MatProps = { color: string; emissive?: string; sil: boolean };
function M({ color, emissive, sil }: MatProps) {
  if (sil) return <meshBasicMaterial color="#0b0c0e" side={THREE.DoubleSide} />;
  return (
    <meshStandardMaterial
      color={color}
      emissive={emissive ?? '#000000'}
      emissiveIntensity={emissive ? 0.9 : 0}
      flatShading
      roughness={0.86}
      metalness={0.06}
      side={THREE.DoubleSide}
    />
  );
}

export function MageCharacter({ silhouette = false }: { silhouette?: boolean }) {
  const root = useRef<THREE.Group>(null);
  const staff = useRef<THREE.Group>(null);
  const crystalMat = useRef<THREE.MeshStandardMaterial>(null);

  const g = useMemo(() => ({
    robe: createRobeGeometry(0.32, 0.66, 1.05, 8),
    panel: createRobePanelGeometry(),
    hood: createHoodGeometry(),
    brow: createHoodBrowGeometry(),
    sleeve: createSleeveGeometry(),
    shoulder: createShoulderGeometry(),
    boot: createBootGeometry(),
    hand: createHandGeometry(),
    torso: createTorsoGeometry(),
    staff: createStaffGeometry(2.05),
    crystal: createCrystalGeometry(),
  }), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (root.current) root.current.position.y = Math.sin(t * 1.6) * 0.04;          // body bob
    if (staff.current) staff.current.rotation.z = Math.sin(t * 1.1) * 0.045;       // staff sway
    if (crystalMat.current) crystalMat.current.emissiveIntensity = 0.7 + (Math.sin(t * 2.2) + 1) * 0.45; // pulse
  });

  const sil = silhouette;

  return (
    <group name="root" ref={root}>
      {/* boots (rotated so the toe points forward +z); peek under the hem */}
      <group name="boots">
        {[-1, 1].map((s) => (
          <mesh key={s} geometry={g.boot} position={[s * 0.15, 0, -0.02]} rotation={[0, -Math.PI / 2, 0]}>
            <M color={C.boot} sil={sil} />
          </mesh>
        ))}
      </group>

      {/* robe: hem (wide) at the bottom, waist (narrow) at the top */}
      <mesh name="robe" geometry={g.robe} position={[0, 0.08, 0]}>
        <M color={C.robe} sil={sil} />
      </mesh>

      {/* layered overlapping front panel + a back drape for depth */}
      <group name="robePanels">
        <mesh geometry={g.panel} position={[0, 0.14, 0.17]}>
          <M color={C.panel} sil={sil} />
        </mesh>
        <mesh geometry={g.panel} position={[0, 0.16, -0.16]} rotation={[0, Math.PI, 0]}>
          <M color={C.panel} sil={sil} />
        </mesh>
      </group>

      {/* belt / sash at the waist + a flat buckle block */}
      <group name="belt" position={[0, 1.0, 0]}>
        <mesh geometry={g.torso} scale={[0.98, 0.34, 0.98]} position={[0, -0.05, 0]}>
          <M color={C.belt} sil={sil} />
        </mesh>
        <mesh geometry={g.torso} scale={[0.42, 0.2, 0.34]} position={[0, -0.04, 0.3]}>
          <M color={C.buckle} sil={sil} />
        </mesh>
      </group>

      {/* upper torso under the hood */}
      <mesh name="torso" geometry={g.torso} position={[0, 1.12, 0]}>
        <M color={C.torso} sil={sil} />
      </mesh>

      {/* sloped shoulders (gentle slope, tucked so no facet juts out) */}
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={g.shoulder} position={[s * 0.24, 1.47, 0]} rotation={[0, 0, s * 0.32]}>
          <M color={C.shoulder} sil={sil} />
        </mesh>
      ))}

      {/* sleeves -> hands (angled out so the arms read; hands lower) */}
      <group name="leftSleeve" position={[-0.32, 1.5, 0.04]} rotation={[0, 0, 0.22]}>
        <mesh geometry={g.sleeve}><M color={C.sleeve} sil={sil} /></mesh>
        <mesh name="leftHand" geometry={g.hand} position={[-0.04, -0.62, 0.05]}>
          <M color={C.skin} sil={sil} />
        </mesh>
      </group>
      <group name="rightSleeve" position={[0.32, 1.5, 0.04]} rotation={[0, 0, -0.16]}>
        <mesh geometry={g.sleeve}><M color={C.sleeve} sil={sil} /></mesh>
        <mesh name="rightHand" geometry={g.hand} position={[0.1, -0.64, 0.16]}>
          <M color={C.skin} sil={sil} />
        </mesh>
      </group>

      {/* dark recessed face — centred, set back into the hood opening so it
          reads as a shadowed face, not a window. */}
      <mesh name="face" geometry={g.torso} scale={[0.54, 0.62, 0.4]} position={[0, 1.52, 0.0]}>
        <M color={C.face} sil={sil} />
      </mesh>

      {/* the hood — big, back-leaning, open at the front */}
      <mesh name="hood" geometry={g.hood} position={[0, 1.46, 0]}>
        <M color={C.hood} sil={sil} />
      </mesh>
      <mesh name="hoodBrow" geometry={g.brow} position={[0, 1.74, 0.16]}>
        <M color={C.hood} sil={sil} />
      </mesh>

      {/* staff held out to the RIGHT side so the crystal clears the face */}
      <group name="staff" ref={staff} position={[0.62, 0, 0.12]} rotation={[0, 0, -0.06]}>
        <mesh geometry={g.staff}><M color={C.staff} sil={sil} /></mesh>
        <mesh name="crystal" geometry={g.crystal} scale={0.85} position={[0, 2.12, 0]}>
          {sil
            ? <meshBasicMaterial color="#0b0c0e" side={THREE.DoubleSide} />
            : <meshStandardMaterial ref={crystalMat} color={C.crystal} emissive={C.crystal} emissiveIntensity={0.9} flatShading roughness={0.25} metalness={0.1} side={THREE.DoubleSide} />}
        </mesh>
      </group>
    </group>
  );
}

export default MageCharacter;
