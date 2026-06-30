/* =====================================================================
   ELDERMOOR - dev/test character (DEV1). A TESTING aid, not shipped gameplay.

   On every load (and therefore every newly-deployed version), if enabled, it
   gives the player a max-level, combat-ready test character:
     • all skills set to level 99,
     • a combat kit (melee set auto-worn, bow + arrows, runes, food, bones,
       coins) topped up to target quantities.

   Idempotent + non-destructive: quantities are ENSURED (only the shortfall is
   granted), so reloading never overflows the bag, and items consumed during
   testing are replenished on the next load. Levels are set by writing the live
   skill-xp map the HUD exposes (no level-up chat spam).

   Enabled by default during the mobile test sprint; toggle with
   window.EMDEV.setEnabled(false) (persisted) or window.EM_DEVTEST_OFF.
   Reads everything through window.EMHUD / window.EMEQUIP and no-ops until they
   are ready. main.js calls initDevTest() once.
   ===================================================================== */

const KEY = 'eldermoor:devtest';

// The test kit. `equip:true` items are auto-worn (when their slot is free) so
// they leave the bag and combat is ready to go.
const KIT = [
  { id: 'bronze-sword',   qty: 1,     equip: true },
  { id: 'wooden-shield',  qty: 1,     equip: true },
  { id: 'leather-body',   qty: 1,     equip: true },
  { id: 'leather-gloves', qty: 1,     equip: true },
  { id: 'tutorial-cape',  qty: 1,     equip: true },
  { id: 'shortbow',       qty: 1 },
  { id: 'bronze-arrows',  qty: 500 },
  { id: 'bronze-dagger',  qty: 1 },
  { id: 'air-rune',       qty: 1000 },
  { id: 'mind-rune',      qty: 1000 },
  { id: 'cooked-shrimp',  qty: 5 },
  { id: 'bones',          qty: 5 },
  { id: 'coins',          qty: 10000 },
];

function hud(){
  const h = (typeof window !== 'undefined') ? window.EMHUD : null;
  return (h && typeof h.getInv === 'function' && typeof h.getSkills === 'function'
    && typeof h.giveItem === 'function') ? h : null;
}
function equipApi(){
  const e = (typeof window !== 'undefined') ? window.EMEQUIP : null;
  return (e && typeof e.equip === 'function') ? e : null;
}

function loadEnabled(){
  try {
    if (typeof window !== 'undefined' && window.EM_DEVTEST_OFF) return false;
    if (typeof localStorage === 'undefined') return true;
    return localStorage.getItem(KEY) !== 'off';
  } catch (e) { return true; }
}

let enabled = true;

/* how many of `id` the player has across bag + worn (so we don't re-grant
   things that were auto-equipped or already stacked) */
function countId(h, id){
  let n = 0;
  (h.getInv() || []).forEach(e => { if (e && e.id === id) n += (e.count || 1); });
  const worn = (equipApi() && window.EMEQUIP.worn) || {};
  Object.keys(worn).forEach(slot => { const w = worn[slot]; const wid = w && (w.id || w); if (wid === id) n += 1; });
  return n;
}

function maxLevels(h){
  const sk = h.getSkills();
  if (!sk || !Array.isArray(sk.skills) || !Array.isArray(sk.xpTable)) return false;
  const xpMap = (typeof h.getSkillXp === 'function') ? h.getSkillXp() : null;
  if (!xpMap) return false;
  const maxXp = sk.xpTable[Math.min(98, sk.xpTable.length - 1)] || sk.xpTable[sk.xpTable.length - 1] || 0;
  sk.skills.forEach(s => { xpMap[s.id] = maxXp; });   // mutate the live map the HUD owns
  return true;
}

function ensureKit(h){
  const items = (typeof h.getItems === 'function') ? (h.getItems() || {}) : {};
  KIT.forEach(k => {
    if (!items[k.id]) return;                          // unknown item id - skip safely
    const have = countId(h, k.id);
    if (have < k.qty) h.giveItem(k.id, k.qty - have);
    // NOTE: auto-equip is intentionally OFF until Milestone 1B (the equipment-tab
    // worn-display fix lives there). Gear is delivered to the bag; equip via the
    // inventory long-press -> Wield to test combat. The `equip` flags stay in the
    // KIT data so 1B can switch this on later.
  });
}

let applied = false;
function apply(){
  if (!enabled) return false;
  const h = hud();
  if (!h) return false;
  const sk = h.getSkills();
  if (!sk || !Array.isArray(sk.skills)) return false;   // data not loaded yet
  const okLevels = maxLevels(h);
  ensureKit(h);
  if (typeof h.refresh === 'function') h.refresh();
  if (!applied && okLevels && typeof h.addChat === 'function'){
    h.addChat('<span style="color:#8fe08f">[dev]</span> Test character ready: all levels 99 + combat kit. Disable with EMDEV.setEnabled(false).', '', true);
    applied = true;
  }
  return true;
}

export function initDevTest(){
  if (typeof window === 'undefined') return null;
  if (window.EMDEV) return window.EMDEV;
  enabled = loadEnabled();

  // Poll until the HUD + skill data are ready, then apply. Re-apply once more a
  // moment later to win over any late save-restore. Cap the polling.
  let tries = 0;
  function pump(){
    if (apply()){
      setTimeout(apply, 1200);   // defensive second pass (e.g. after save load)
      return;
    }
    if (++tries < 120) setTimeout(pump, 150);   // ~18s budget
  }
  if (enabled) pump();

  window.EMDEV = {
    apply,
    setEnabled(v){ enabled = !!v; try { localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch (e) {}
      if (enabled){ applied = false; pump(); } return enabled; },
    enabled(){ return enabled; },
    kit: KIT.slice(),
  };
  return window.EMDEV;
}

export default initDevTest;
