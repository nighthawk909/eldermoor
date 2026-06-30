/* =====================================================================
   MageCharacter.tsx — one low-poly fantasy mage, composed from the custom
   geometry in geometry.ts. Named groups per the brief:
     root, hood, face, torso, robe, robePanels, leftSleeve, rightSleeve,
     leftHand, rightHand, boots, belt, staff, crystal.
   Idle-only animation: a gentle body bob + a slight staff sway + crystal pulse.
   Silhouette Mode swaps every material for a flat dark shape so the OUTLINE
   can be judged.

   Silhouette is built to READ as a figure, not a cone: wide sloped shoulder
   collar -> waist pinch -> hem flare, with the sleeves hanging OUT to break the
   side outline and the right arm reaching to the staff.
   ===================================================================== */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  createRobeGeometry, createRobePanelGeometry, createHoodGeometry, createHoodBrowGeometry,
  createSleeveGeometry, createBootGeometry, createHandGeometry, createTorsoGeometry,
  createStaffGeometry, createCrystalGeometry, createTaperedPrismGeometry,
} from './geometry';

/* muted blue / gray / brown palette */
const C = {
  robe: '#3e5468', hood: '#33485a', panel: '#2b3e4d', sleeve: '#3a4f61', collar: '#37495a',
  face: '#0a0d11', skin: '#caa078', boot: '#46362a', belt: '#6a4d2e', buckle: '#c9a24a',
  torso: '#2d3f4e', staff: '#5b4632', crystal: '#86dceb',
};

function M({ color, sil }: { color: string; sil: boolean }) {
  if (sil) return <meshBasicMaterial color="#0b0c0e" side={THREE.DoubleSide} />;
  return <meshStandardMaterial color={color} flatShading roughness={0.86} metalness={0.06} side={THREE.DoubleSide} />;
}

export function MageCharacter({ silhouette = false }: { silhouette?: boolean }) {
  const root = useRef<THREE.Group>(null);
  const staff = useRef<THREE.Group>(null);
  const crystalMat = useRef<THREE.MeshStandardMaterial>(null);
  const sil = silhouette;

  const g = useMemo(() => ({
    robe: createRobeGeometry(0.34, 0.56, 1.28, 8),
    panel: createRobePanelGeometry(),
    hood: createHoodGeometry(),
    brow: createHoodBrowGeometry(),
    sleeve: createSleeveGeometry(),
    collar: createTaperedPrismGeometry(0.84, 0.44, 0.5, 0.34, 0.18, 6), // wide sloped shoulders
    forearm: createTaperedPrismGeometry(0.13, 0.13, 0.1, 0.1, 0.34, 5),
    boot: createBootGeometry(),
    hand: createHandGeometry(),
    torso: createTorsoGeometry(),
    staff: createStaffGeometry(2.05),
    crystal: createCrystalGeometry(),
  }), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (root.current) root.current.position.y = Math.sin(t * 1.6) * 0.04;
    if (staff.current) staff.current.rotation.z = Math.sin(t * 1.1) * 0.045;
    if (crystalMat.current) crystalMat.current.emissiveIntensity = 0.7 + (Math.sin(t * 2.2) + 1) * 0.45;
  });

  return (
    <group name="root" ref={root}>
      {/* boots peek out the front under the hem */}
      <group name="boots">
        {[-1, 1].map((s) => (
          <mesh key={s} geometry={g.boot} position={[s * 0.14, 0, 0.04]} rotation={[0, -Math.PI / 2, 0]}>
            <M color={C.boot} sil={sil} />
          </mesh>
        ))}
      </group>

      {/* columnar robe: flares only at the hem */}
      <mesh name="robe" geometry={g.robe} position={[0, 0.1, 0]}>
        <M color={C.robe} sil={sil} />
      </mesh>

      {/* overlapping front + back panels (layering) */}
      <group name="robePanels">
        <mesh geometry={g.panel} position={[0, 0.16, 0.16]}><M color={C.panel} sil={sil} /></mesh>
        <mesh geometry={g.panel} position={[0, 0.18, -0.15]} rotation={[0, Math.PI, 0]}><M color={C.panel} sil={sil} /></mesh>
      </group>

      {/* belt + flat buckle at the waist */}
      <group name="belt" position={[0, 1.02, 0]}>
        <mesh geometry={g.torso} scale={[0.9, 0.3, 0.9]} position={[0, -0.05, 0]}><M color={C.belt} sil={sil} /></mesh>
        <mesh geometry={g.torso} scale={[0.42, 0.2, 0.32]} position={[0, -0.04, 0.26]}><M color={C.buckle} sil={sil} /></mesh>
      </group>

      {/* chest under the collar */}
      <mesh name="torso" geometry={g.torso} position={[0, 1.16, 0]}><M color={C.torso} sil={sil} /></mesh>

      {/* WIDE sloped shoulder collar -> creates the shoulder line + neck pinch */}
      <mesh geometry={g.collar} position={[0, 1.3, 0]}><M color={C.collar} sil={sil} /></mesh>

      {/* sleeves hang OUT at the sides so the arms break the silhouette */}
      <group name="leftSleeve" position={[-0.4, 1.36, 0.02]} rotation={[0, 0, 0.18]}>
        <mesh geometry={g.sleeve}><M color={C.sleeve} sil={sil} /></mesh>
        <mesh name="leftHand" geometry={g.hand} position={[-0.04, -0.6, 0.02]}><M color={C.skin} sil={sil} /></mesh>
      </group>
      <group name="rightSleeve" position={[0.4, 1.36, 0.02]} rotation={[0, 0, -0.5]}>
        <mesh geometry={g.sleeve}><M color={C.sleeve} sil={sil} /></mesh>
      </group>

      {/* right forearm bridges the sleeve to the staff grip (no floating hand) */}
      <mesh geometry={g.forearm} position={[0.42, 0.98, 0.16]} rotation={[Math.PI / 2 - 0.5, 0, -0.5]}>
        <M color={C.skin} sil={sil} />
      </mesh>

      {/* dark recessed face, centred in the hood opening */}
      <mesh name="face" geometry={g.torso} scale={[0.5, 0.5, 0.4]} position={[0, 1.54, 0.04]}>
        <M color={C.face} sil={sil} />
      </mesh>

      {/* shorter, wider hood (a cowl, not a cone) sitting on the shoulders */}
      <mesh name="hood" geometry={g.hood} position={[0, 1.5, 0]}><M color={C.hood} sil={sil} /></mesh>
      <mesh geometry={g.brow} position={[0, 1.72, 0.18]}><M color={C.hood} sil={sil} /></mesh>

      {/* staff to the right, gripped, crystal on top */}
      <group name="staff" ref={staff} position={[0.52, 0, 0.18]} rotation={[0, 0, -0.05]}>
        <mesh geometry={g.staff}><M color={C.staff} sil={sil} /></mesh>
        <mesh name="rightHand" geometry={g.hand} scale={1.15} position={[-0.03, 1.02, 0.0]} rotation={[0, 0, 0.3]}>
          <M color={C.skin} sil={sil} />
        </mesh>
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
