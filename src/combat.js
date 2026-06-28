// combat.js — engage/melee tick, hitsplats, drops, respawn. Operates on the shared `player`.
import { scene, TAU } from './engine.js';
import { addXp } from './skills.js';
import { addItem } from './inventory.js';
import { checkStep } from './quests.js';
import { msg } from './ui.js';
const THREE = window.THREE;

const hits = [];
export function makeHit(pos, dmg) {
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const x = cv.getContext('2d');
  x.fillStyle = dmg > 0 ? '#c81e1e' : '#3a6f8c'; x.beginPath(); x.arc(32, 32, 26, 0, TAU); x.fill();
  x.fillStyle = '#fff'; x.font = 'bold 30px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(dmg, 32, 34);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false }));
  s.scale.set(0.7, 0.7, 1); s.position.copy(pos); s.position.y += 1.3; s.renderOrder = 998; scene.add(s);
  s.userData.t = 0; hits.push(s);
}

export function engage(player, st) { player.combat = st; }

/** Advance the combat state one frame. `u` is player.userData (limb groups). */
export function tickCombat(player, dt, u) {
  if (!player.combat) return;
  const st = player.combat;
  if (st.alive === false) { player.combat = null; return; }
  const d = Math.hypot(st.pos.x - player.position.x, st.pos.z - player.position.z);
  if (d < 2.0) {
    player.rotation.y = Math.atan2(st.pos.x - player.position.x, st.pos.z - player.position.z);
    st.atk = (st.atk || 0) + dt;
    if (st.atk > 0.8) {
      st.atk = 0; const dmg = 1 + Math.floor(Math.random() * 3); st.hp -= dmg;
      makeHit(st.obj.position, dmg); u.armR.rotation.x = -1.2;
      ['Attack', 'Strength', 'Defence'].forEach(s => addXp(s, 4)); addXp('Hitpoints', 2);
      if (st.hp <= 0) {
        st.alive = false; st.obj.visible = false; msg(`You defeat the ${st.label}.`);
        addItem(st.drop, 1); msg(`Drop: ${st.drop}.`); checkStep('rat'); player.combat = null;
        setTimeout(() => { st.hp = st.maxhp; st.alive = true; st.obj.visible = true; }, 6000);
      }
    }
  } else { player.target = new THREE.Vector2(st.pos.x, st.pos.z); player.combat = st; }
}

export function tickHits(dt) {
  for (let i = hits.length - 1; i >= 0; i--) {
    const h = hits[i]; h.userData.t += dt; h.position.y += dt * 0.6;
    if (h.userData.t > 0.9) { scene.remove(h); hits.splice(i, 1); }
  }
}
