/* =====================================================================
   Code-driven character animation. Mutates the limb pivot groups every
   frame based on the current AnimationState. No keyframes, no assets.
   ===================================================================== */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AnimationState } from '../characters/characterTypes';

export interface CharRefs {
  root: React.RefObject<THREE.Group>;
  head: React.RefObject<THREE.Group>;
  leftArm: React.RefObject<THREE.Group>;
  rightArm: React.RefObject<THREE.Group>;
  leftLeg: React.RefObject<THREE.Group>;
  rightLeg: React.RefObject<THREE.Group>;
}

export function useCharacterAnimation(refs: CharRefs, state: AnimationState, phase = 0) {
  const t = useRef(phase);

  useFrame((_, dt) => {
    t.current += dt;
    const time = t.current;
    const { root, head, leftArm, rightArm, leftLeg, rightLeg } = refs;
    if (!root.current) return;

    // reset arms/legs to neutral each frame, then pose
    const la = leftArm.current, ra = rightArm.current;
    const ll = leftLeg.current, rl = rightLeg.current;

    switch (state) {
      case 'walk': {
        const s = Math.sin(time * 6);
        if (ll) ll.rotation.x = s * 0.6;
        if (rl) rl.rotation.x = -s * 0.6;
        if (la) la.rotation.x = -s * 0.5;
        if (ra) ra.rotation.x = s * 0.5;
        root.current.position.y = Math.abs(Math.sin(time * 6)) * 0.05;
        break;
      }
      case 'attack': {
        const swing = Math.sin(time * 7);
        if (ra) ra.rotation.x = -0.4 - Math.max(0, swing) * 1.6; // chop forward/up
        if (la) la.rotation.x = 0.15;
        if (ll) ll.rotation.x = 0;
        if (rl) rl.rotation.x = 0;
        root.current.position.y = 0;
        break;
      }
      case 'cast': {
        if (ra) ra.rotation.x = -1.5 + Math.sin(time * 4) * 0.12; // staff raised, bobbing
        if (la) la.rotation.x = -0.3 + Math.sin(time * 4 + 1) * 0.08;
        if (ll) ll.rotation.x = 0;
        if (rl) rl.rotation.x = 0;
        if (head.current) head.current.rotation.x = -0.08;
        root.current.position.y = Math.sin(time * 2) * 0.025;
        break;
      }
      case 'idle':
      default: {
        const breathe = Math.sin(time * 2);
        if (la) la.rotation.x = breathe * 0.06;
        if (ra) ra.rotation.x = -breathe * 0.06;
        if (ll) ll.rotation.x = 0;
        if (rl) rl.rotation.x = 0;
        if (head.current) head.current.rotation.x = breathe * 0.03;
        root.current.position.y = breathe * 0.03;
        break;
      }
    }
  });
}
