// ui.js — ALL HUD/DOM: skills panel, inventory grid, objective banner, chat log,
// xp drops, action progress, finish screen. Wires the pure modules' listeners.
import { SKILLS, ICON, levelFromXp, skill, addXp, setXpListener, totalLevel } from './skills.js';
import { inv, addItem, setInvListener } from './inventory.js';
import { STEPS, setStepListener, checkStep } from './quests.js';

const logEl = document.getElementById('log');
export function msg(t) {
  const d = document.createElement('div'); d.textContent = t; logEl.appendChild(d);
  while (logEl.children.length > 5) logEl.removeChild(logEl.firstChild);
}
export function xpDrop(s, amt) {
  const e = document.createElement('div'); e.className = 'xp'; e.textContent = `+${amt} ${s}`;
  document.getElementById('xpd').appendChild(e); setTimeout(() => e.remove(), 1400);
}

export function renderSkills() {
  const g = document.getElementById('skillGrid'); g.innerHTML = ''; let tot = 0;
  SKILLS.forEach(([s, ic]) => {
    const lv = levelFromXp(skill[s].xp); tot += lv;
    g.insertAdjacentHTML('beforeend', `<div class="sk"><span class="ic">${ic}</span>${s.slice(0, 4)}<span class="lv">${lv}</span></div>`);
  });
  document.getElementById('totalLv').textContent = `Total level: ${tot}`;
}
export function renderInv() {
  const g = document.getElementById('invGrid'); g.innerHTML = ''; const names = Object.keys(inv);
  for (let i = 0; i < 16; i++) {
    const n = names[i];
    if (n) g.insertAdjacentHTML('beforeend', `<div class="slot" data-n="${n}"><span class="ct">${inv[n].ct}</span><span class="ic">${inv[n].ic}</span><span class="nm">${n}</span></div>`);
    else g.insertAdjacentHTML('beforeend', `<div class="slot empty"></div>`);
  }
  g.querySelectorAll('.slot[data-n]').forEach(el => el.onclick = () => useItem(el.dataset.n));
}
function useItem(n) {
  if (n === 'Bones') { addItem('Bones', -1); addXp('Prayer', 12); msg('You bury the bones.'); checkStep('Prayer'); }
}

/* objective banner */
export function setObjective(t) { document.getElementById('objtx').textContent = t; }

/* action progress bar */
export const progEl = document.getElementById('prog');
export function showProgress() { progEl.style.display = 'block'; }
export function setProgress(pct) { progEl.firstElementChild.style.width = pct + '%'; }
export function hideProgress() { progEl.style.display = 'none'; progEl.firstElementChild.style.width = 0; }

/* finish screen */
export function showFinish() {
  document.getElementById('fintx').innerHTML =
    `You trained every skill. Total level <b>${totalLevel()}</b>.<br>The boat sails for the mainland…`;
  document.getElementById('fin').style.display = 'flex';
}

/* panel toggles */
function togglePanel(p, b) {
  const el = document.getElementById(p); el.classList.toggle('show');
  document.getElementById(b).classList.toggle('active', el.classList.contains('show'));
}
export function initPanels() {
  document.getElementById('bSkills').onclick = () => { togglePanel('pSkills', 'bSkills'); document.getElementById('pInv').classList.remove('show'); document.getElementById('bInv').classList.remove('active'); };
  document.getElementById('bInv').onclick = () => { togglePanel('pInv', 'bInv'); document.getElementById('pSkills').classList.remove('show'); document.getElementById('bSkills').classList.remove('active'); };
}

/* wire the pure modules' UI listeners + initial render */
export function initHud() {
  setXpListener((s, amt, info) => { xpDrop(s, amt); renderSkills(); if (info.leveled) msg(`⭐ ${s} level ${info.after}!`); });
  setInvListener(renderInv);
  setStepListener(step => { if (step >= STEPS.length) showFinish(); else setObjective(STEPS[step] ? STEPS[step].t : 'Done!'); });
  renderSkills(); renderInv();
}
