/* =====================================================================
   Character — assembles modular parts into one grouped, animatable model
   with named limb pivots (head, torso, leftArm, rightArm, leftLeg,
   rightLeg, weapon, shield). Flat-shaded throughout.
   ===================================================================== */
import { useRef } from 'react';
import * as THREE from 'three';
import type { AnimationState, CharacterConfig, ChestType, HelmetType, OffhandType, WeaponType } from '../characters/characterTypes';
import { useCharacterAnimation } from '../animation/useCharacterAnimation';
import { LowPolyHead, LowPolyTorso, LowPolyArm, LowPolyLeg, LowPolyBoot, LowPolyHand, FlatMat } from '../characters/parts/BodyParts';
import { ChestArmor, Robe, ShoulderPads, Helmet, Hood, AntlerHood } from '../characters/parts/ArmorParts';
import { WizardHat, PirateHat, Crown, SkullFace, DesertWrap } from '../characters/parts/HeadParts';
import { Sword, Dagger, Staff, Bow, Mace, Axe, Spear, Shield } from '../characters/parts/WeaponParts';
import { Cape } from '../characters/parts/CapeParts';

const ARM_LEN = 0.72;
const LEG_LEN = 0.82;
const SHOULDER_Y = 1.78;
const HIP_Y = 0.95;
const TORSO_Y = 1.42;
const HEAD_Y = 2.12;

interface CharacterProps {
  config: CharacterConfig;
  animation?: AnimationState;       // overrides config.animation when set
  position?: [number, number, number];
  phase?: number;                   // desync offset for idle/walk
}

function HeadGear({ type, p }: { type: HelmetType; p: CharacterConfig['palette'] }) {
  switch (type) {
    case 'helmet': return <Helmet color={p.metal} accent={p.secondary} />;
    case 'hood': return <Hood color={p.primary} accent="#0c0a08" />;
    case 'antlerHood': return <AntlerHood color={p.primary} accent={p.accent} />;
    case 'wizardHat': return <WizardHat color={p.primary} accent={p.accent} />;
    case 'pirateHat': return <PirateHat color={p.primary} accent={p.accent} />;
    case 'crown': return <Crown color={p.metal} accent={p.accent} />;
    case 'skullFace': return <SkullFace color={p.skin} accent="#1a1a1a" />;
    case 'desertWrap': return <DesertWrap color={p.primary} accent={p.secondary} />;
    default: return null;
  }
}

function ChestGear({ type, p }: { type: ChestType; p: CharacterConfig['palette'] }) {
  switch (type) {
    case 'plate': return (<><ChestArmor color={p.metal} accent={p.secondary} /><ShoulderPads color={p.metal} /></>);
    case 'robe': return <Robe color={p.primary} accent={p.secondary} />;
    case 'leather': return (
      <mesh castShadow><boxGeometry args={[0.66, 0.6, 0.46]} /><FlatMat color={p.secondary} /></mesh>
    );
    case 'tunic': return (
      <mesh castShadow><boxGeometry args={[0.64, 0.5, 0.44]} /><FlatMat color={p.primary} /></mesh>
    );
    default: return null;
  }
}

function WeaponGear({ type, p }: { type: WeaponType; p: CharacterConfig['palette'] }) {
  switch (type) {
    case 'sword': return <Sword color={p.metal} accent={p.secondary} />;
    case 'dagger': return <Dagger color={p.metal} accent={p.secondary} />;
    case 'staff': return <Staff color={p.secondary} accent={p.accent} />;
    case 'bow': return <Bow color={p.secondary} accent={p.accent} />;
    case 'mace': return <Mace color={p.metal} accent={p.secondary} />;
    case 'axe': return <Axe color={p.metal} accent={p.secondary} />;
    case 'spear': return <Spear color={p.metal} accent={p.secondary} />;
    default: return null;
  }
}

function OffhandGear({ type, p }: { type: OffhandType; p: CharacterConfig['palette'] }) {
  if (type === 'shield') return <Shield color={p.metal} accent={p.accent} />;
  return null;
}

export function Character({ config, animation, position = [0, 0, 0], phase = 0 }: CharacterProps) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);

  const state = animation ?? config.animation;
  useCharacterAnimation({ root, head, leftArm, rightArm, leftLeg, rightLeg }, state, phase);

  const { palette: p, body, equipment } = config;
  const shoulderX = 0.31 * body.width + 0.12;
  const hipX = 0.15;

  return (
    <group position={position}>
      <group scale={body.height}>
        <group ref={root}>
          {/* torso */}
          <group position={[0, TORSO_Y, 0]}>
            <LowPolyTorso color={p.primary} width={body.width} />
            <ChestGear type={equipment.chest} p={p} />
          </group>
          {/* pelvis bridge */}
          <mesh position={[0, HIP_Y + 0.02, 0]}>
            <boxGeometry args={[0.5 * body.width, 0.22, 0.4]} />
            <FlatMat color={p.secondary} />
          </mesh>
          {/* neck */}
          <mesh position={[0, SHOULDER_Y + 0.1, 0]}>
            <boxGeometry args={[0.16, 0.14, 0.16]} />
            <FlatMat color={p.skin} />
          </mesh>

          {/* head */}
          <group ref={head} position={[0, HEAD_Y, 0]}>
            <LowPolyHead color={p.skin} scale={body.headScale} accent="#241812" />
            <HeadGear type={equipment.helmet} p={p} />
          </group>

          {/* left arm + shield */}
          <group ref={leftArm} position={[-shoulderX, SHOULDER_Y, 0]}>
            <LowPolyArm color={p.primary} length={ARM_LEN} />
            <group position={[0, -ARM_LEN, 0]}>
              <LowPolyHand color={p.skin} />
              <group position={[0.02, -0.05, 0.12]} rotation={[0, 0, 0]}>
                <OffhandGear type={equipment.offhand} p={p} />
              </group>
            </group>
          </group>

          {/* right arm + weapon */}
          <group ref={rightArm} position={[shoulderX, SHOULDER_Y, 0]}>
            <LowPolyArm color={p.primary} length={ARM_LEN} />
            <group position={[0, -ARM_LEN, 0]}>
              <LowPolyHand color={p.skin} />
              <group position={[0, -0.04, 0.08]} rotation={[-0.18, 0, 0]}>
                <WeaponGear type={equipment.weapon} p={p} />
              </group>
            </group>
          </group>

          {/* legs + boots */}
          <group ref={leftLeg} position={[-hipX, HIP_Y, 0]}>
            <LowPolyLeg color={p.secondary} length={LEG_LEN} />
            <group position={[0, -LEG_LEN, 0]}><LowPolyBoot color={p.metal} accent="#241812" /></group>
          </group>
          <group ref={rightLeg} position={[hipX, HIP_Y, 0]}>
            <LowPolyLeg color={p.secondary} length={LEG_LEN} />
            <group position={[0, -LEG_LEN, 0]}><LowPolyBoot color={p.metal} accent="#241812" /></group>
          </group>

          {/* cape (static, hung off the shoulders) */}
          {equipment.cape && (
            <group position={[0, TORSO_Y + 0.2, 0]}><Cape color={p.primary} /></group>
          )}
        </group>
      </group>
    </group>
  );
}

export default Character;
