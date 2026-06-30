/* =====================================================================
   ELDERMOOR - player module. Owns the player group, the walk rig, the
   shared `move` state + `pos`, and the player-movement step (followPath /
   arrive / cancelPending) plus the per-frame simStep that drives the
   player, marker fade, NPC update, altar glow and water drift.
   ===================================================================== */
import { scene, col, TEX, decayExp, updateRoofs, isInsideAnyRoof } from './engine.js';
import {
  clampX, clampZ, lineClear, moveBlocked, planPath, replan
} from './world.js';
import { marker, markerStep, showMarker } from './interact.js';
import { talk, prayAtAltar } from './dialogue.js';
import { updateNpcs } from './npc.js';

/* --------------------------------------------------------------- the player */
export const player = new THREE.Group();
export const pos = new THREE.Vector3(0, 0, 8.5);      // default; real spawn comes from the colliders JSON
player.position.copy(pos);
player.rotation.y = Math.PI;
scene.add(player);

export const move = { pending: null, moving: false, path: [], wp: 0, _lastGoal: null };
export const SPEED = 3.2;

/* run-energy model - orbs module reads/draws this via window.EMRUN */
export const run = { on: false, energy: 100 };
export function toggleRun(){ run.on = !run.on; return run.on; }
if(typeof window !== 'undefined') window.EMRUN = run;

export const rig = {};   // named limb pivots → swung for the walk cycle

/* ---- combat animation state (CBT-ANIM) -------------------------------------
   Lightweight, asset-free feedback driven entirely off the existing rig pivots
   (or the player group's own scale, if a rig isn't loaded yet): a brief
   arm-swing "lunge" on attack, and a fall/fade on death. combat.js only ever
   sets flags here (playerAnim.attackT / .dead) - all the actual per-frame
   pose math lives in simStep below, alongside the walk-cycle driver, so there
   is exactly one place that writes rig rotations each frame. */
export const playerAnim = { attackT: 0, dead: false, deadT: 0 };
export function playSwingAnim(){ playerAnim.attackT = 1; }   // combat.js calls this on every player swing
export function playDeathAnim(){ playerAnim.dead = true; playerAnim.deadT = 0; }
export function clearDeathAnim(){ playerAnim.dead = false; playerAnim.deadT = 0; player.rotation.z = 0; player.scale.set(1,1,1); }
/* exposed for combat.js (window-global accessor convention, same as EMPLAYERPOS/EMRIG)
   so death/attack feedback can be driven without a direct ES import. */
if(typeof window !== 'undefined'){
  window.EMPLAYERANIM = playerAnim;
  window.playSwingAnim = playSwingAnim;
  window.playDeathAnim = playDeathAnim;
  window.clearDeathAnim = clearDeathAnim;
}

/* altar glow - pulses warm when prayed at (glow.t shared with dialogue.prayAtAltar) */
export const altarGlow = new THREE.PointLight(col('#ffe2a0'), 0, 7, 2);
altarGlow.position.set(0, 1.3, -4.0); scene.add(altarGlow);
export const glow = { t: 0 };

let walkPhase = 0, stuckT = 0;

export function arrive(){           // in range of the pending target → act on it
  move.moving = false; move.path = []; stuckT = 0;
  if(move.pending){
    const t = move.pending; move.pending = null;
    player.rotation.y = Math.atan2(t.x - pos.x, t.z - pos.z);
    if(t.lines) talk(t);                        // NPC → dialogue
    else if(t.kind === 'altar') prayAtAltar();  // object → its action
    else if(t.kind === 'mob'){                  // mob → arrived in melee range, begin/resume the attack
      if(window.EMCOMBAT) EMCOMBAT.attack(t);
    }
    else if(t.kind === 'scenery'){              // scenery → fixture-aware routing, then skilling engine
      if(t.fixture === 'bank-booth'){
        if(window.EMBANK) EMBANK.open();
      } else if(t.fixture === 'poll-booth'){
        if(window.EMHUD) EMHUD.addChat('You consider the poll booth. (Voting - coming soon.)');
      } else if(window.EMSKILL && EMSKILL.doSceneryVerb){ EMSKILL.doSceneryVerb(t); }
      else if(window.EMHUD){ EMHUD.addChat('You '+ (t.verb||'use').toLowerCase() +' the '+t.name.toLowerCase()+', but you haven\'t learned that skill yet.'); }
    }
  }
}
export function cancelPending(){ move.pending = null; move.path = []; move.moving = false; stuckT = 0; }
export function followPath(dt){
  let wp = move.path[move.wp];
  if(!wp){ move.moving = false; return; }
  let dx = wp.x-pos.x, dz = wp.z-pos.z, d = Math.hypot(dx,dz);
  while(d < 0.18 && move.wp < move.path.length-1){ wp = move.path[++move.wp]; dx = wp.x-pos.x; dz = wp.z-pos.z; d = Math.hypot(dx,dz); }
  if(d < 0.12 && move.wp >= move.path.length-1){      // reached the end of the path
    move.moving = false; move.path = [];
    if(move.pending){ const t = move.pending;
      if(Math.hypot(t.x-pos.x, t.z-pos.z) <= t.talkRange) arrive(); else cancelPending(); }  // proximity gate
    return;
  }
  move.moving = true;
  // run energy: while moving, run drains; depleting forces a walk
  let spd = SPEED;
  if(run.on && run.energy > 0){
    spd = SPEED * 2;
    run.energy = Math.max(0, run.energy - 0.6 * dt);
    if(run.energy <= 0){ run.energy = 0; run.on = false; }   // out of energy → forced walk
  }
  const ux = dx/d, uz = dz/d, step = Math.min(d, spd*dt), ox = pos.x, oz = pos.z;
  const nx = clampX(pos.x+ux*step), nz = clampZ(pos.z+uz*step);
  if(!moveBlocked(pos.x, pos.z, nx, pos.z)) pos.x = nx;   // axis-separated slide; can escape an overlapping NPC
  if(!moveBlocked(pos.x, pos.z, pos.x, nz)) pos.z = nz;
  player.rotation.y = Math.atan2(ux, uz); walkPhase += dt*9;
  if(Math.hypot(pos.x-ox, pos.z-oz) < step*0.25){     // blocked (usually a wandering NPC in the way)
    stuckT += dt;
    if(stuckT > 0.5){ stuckT = 0;
      if((move._replan = (move._replan||0) + 1) <= 4){ replan(); }      // reroute from here (don\'t derail the path)
      else {                                                            // really can\'t get there - give up cleanly
        if(move.pending && Math.hypot(move.pending.x-pos.x, move.pending.z-pos.z) <= move.pending.talkRange) arrive();
        else cancelPending();
        move.path = []; move.moving = false;
      }
    }
  } else stuckT = 0;
}
export function simStep(dt){
  // proximity gate: stop & act the moment we\'re within range of (and can see) the target -
  // and re-path if the target is an NPC who has wandered.
  if(move.pending){
    const t = move.pending;
    if(Math.hypot(t.x-pos.x, t.z-pos.z) <= t.talkRange && lineClear(pos.x,pos.z, t.x,t.z)){ arrive(); }
    else if(move._lastGoal && Math.hypot(t.x-move._lastGoal.x, t.z-move._lastGoal.z) > 0.6){
      planPath(t.x, t.z); move._lastGoal = {x:t.x, z:t.z};
    }
  }
  followPath(dt);

  // run energy regen - recovers while walking/standing (i.e. not actively running)
  if(!(run.on && move.moving) && run.energy < 100){
    run.energy = Math.min(100, run.energy + 0.45 * dt);
  }

  // real walk cycle: swing legs/arms in opposite phase from the hip/shoulder pivots
  const sw = move.moving ? Math.sin(walkPhase)*0.55 : 0;
  if(rig.legL){ rig.legL.rotation.x =  sw;        rig.legR.rotation.x = -sw; }
  if(rig.armL){ rig.armL.rotation.x = -sw*0.6;    rig.armR.rotation.x =  sw*0.6; }
  const bob = move.moving ? Math.abs(Math.sin(walkPhase))*0.05 : 0;
  player.position.set(pos.x, bob, pos.z);

  // CBT-ANIM: brief attack lunge - a fast forward swing of the right arm (and a
  // small forward weight-shift on the whole group) that decays to 0 over ~0.35s.
  // Overrides the walk-cycle arm pose for its duration; harmless if no rig loaded.
  if(playerAnim.attackT > 0){
    playerAnim.attackT = Math.max(0, playerAnim.attackT - dt*2.85);
    const k = Math.sin(playerAnim.attackT * Math.PI);   // 0 → 1 → 0 swing envelope
    if(rig.armR) rig.armR.rotation.x = -1.1 * k;
    player.scale.set(1, 1, 1 + k*0.04);                  // tiny forward punch, asset-free
  } else if(!playerAnim.dead){
    player.scale.set(1,1,1);
  }

  // CBT-ANIM: death - topple + sink + fade over ~0.7s (matches combat.js's playerDeath
  // timing), then clearDeathAnim() (called by combat.js on respawn) resets the pose.
  if(playerAnim.dead){
    playerAnim.deadT = Math.min(1, playerAnim.deadT + dt/0.7);
    const t = playerAnim.deadT;
    player.rotation.z = -t * (Math.PI/2.1);   // topple onto its side
    player.position.y = bob - t * 0.55;       // sink into the ground
    player.scale.set(1 - t*0.25, 1 - t*0.25, 1 - t*0.25);
  }

  if(marker.visible){
    markerStep(dt);    // fade/scale the click marker (state owned by interact.js)
  }

  updateNpcs(dt);                                  // wandering NPCs
  updateRoofs(isInsideAnyRoof(pos));               // P1.6 - hide a roof when the player is under it
  // P1.7 - altar glow decays asymptotically now (smoother falloff) instead of a hard linear drop
  if(glow.t > 0.01){ glow.t = decayExp(glow.t, dt); altarGlow.intensity = glow.t * 3.0; }
  else if(glow.t !== 0){ glow.t = 0; altarGlow.intensity = 0; }
  TEX.water.offset.x += dt*0.012; TEX.water.offset.y += dt*0.008;   // drifting ripple
}
