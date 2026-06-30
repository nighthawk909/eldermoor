/* =====================================================================
   ELDERMOOR - Equipment module (EQ1 / EQ5 / SYS S2).

   Worn-equipment model layered on top of the HUD\'s inventory. Self-
   contained: reads the bag + item definitions through window.EMHUD,
   moves items between the worn map and the inventory, and refreshes the
   HUD so the change is reflected. main.js calls initEquipment() once.

   Exposes:
     window.EMEQUIP = {
       worn,                 // { slot -> { id, count } }  (live map)
       equip(itemId),        // bag -> worn (handles 2H weapon/shield swap)
       unequip(slot),        // worn -> bag (if space)
       stats()               // summed equipBonus across worn
     }

   No-ops gracefully when EMHUD is not ready yet.
   ===================================================================== */

const INV_CAP = 28;

// Slots whose contents conflict with a two-handed weapon, and vice-versa.
// A 2H weapon occupies the weapon slot but also forbids a shield.
const WEAPON_SLOT = 'weapon';
const SHIELD_SLOT = 'shield';

export function initEquipment(){
  // The worn map is the single source of truth for what the player wears.
  // Kept as a plain object keyed by slot name; each value is an inventory
  // entry { id, count } so it round-trips cleanly back to the bag.
  const worn = {};

  // ---- internal helpers (never throw if the HUD isn\'t ready) -------------

  function hud(){
    const h = (typeof window !== 'undefined') ? window.EMHUD : null;
    return (h && typeof h.getInv === 'function' && typeof h.getItems === 'function') ? h : null;
  }

  function itemDef(h, id){
    const items = h.getItems() || {};
    return items[id] || null;
  }

  function isTwoHanded(def){
    if(!def) return false;
    // Support either an explicit flag or a "2h"/"two-handed" slot convention.
    if(def.twoHanded === true || def.two_handed === true) return true;
    const slot = def.slot;
    return slot === '2h' || slot === 'two-handed';
  }

  // Resolve which equipment slot a def actually occupies (2H lands on weapon).
  function slotFor(def){
    if(!def) return null;
    if(isTwoHanded(def)) return WEAPON_SLOT;
    return def.slot || null;
  }

  function findInvIndex(inv, id){
    for(let i = 0; i < inv.length; i++){ if(inv[i] && inv[i].id === id) return i; }
    return -1;
  }

  function refresh(h){ if(typeof h.refresh === 'function') h.refresh(); }

  function notify(h, text){ if(typeof h.addChat === 'function') h.addChat(text); }

  // Push a worn entry back into the bag. Returns true on success, false if full.
  function returnToBag(inv, entry){
    if(!entry) return true;
    if(inv.length >= INV_CAP) return false;
    inv.push({ id: entry.id, count: entry.count || 1 });
    return true;
  }

  // ---- public API --------------------------------------------------------

  function equip(itemId){
    const h = hud();
    if(!h || !itemId) return false;

    const inv = h.getInv();
    if(!Array.isArray(inv)) return false;

    const def = itemDef(h, itemId);
    if(!def){ notify(h, "You can\'t equip that."); return false; }

    // Must be equipable and resolve to a real slot.
    const slot = slotFor(def);
    const equipable = def.equipable !== false && !!slot;
    if(!equipable){ notify(h, 'That cannot be worn.'); return false; }

    const idx = findInvIndex(inv, itemId);
    if(idx < 0){ notify(h, "You don\'t have that to equip."); return false; }

    // Remove the item from the bag first; we hold it while we resolve swaps so
    // a freed slot leaves room for any displaced gear.
    const taken = inv.splice(idx, 1)[0];
    const incoming = { id: taken.id, count: taken.count || 1 };

    const twoH = isTwoHanded(def);

    // Collect everything that must come off to make room for `incoming`.
    const displaced = [];
    if(worn[slot]){ displaced.push(worn[slot]); }
    if(twoH && worn[SHIELD_SLOT]){ displaced.push(worn[SHIELD_SLOT]); }
    // Equipping a shield while wearing a two-handed weapon removes the weapon.
    if(slot === SHIELD_SLOT && worn[WEAPON_SLOT]){
      const wd = itemDef(h, worn[WEAPON_SLOT].id);
      if(isTwoHanded(wd)){ displaced.push(worn[WEAPON_SLOT]); }
    }

    // Ensure the bag can hold all displaced items (the incoming item already
    // vacated one slot, so capacity is generally fine, but verify to be safe).
    const freeAfter = INV_CAP - inv.length;
    if(displaced.length > freeAfter){
      // Roll back: put the incoming item back where it came from.
      inv.splice(idx, 0, taken);
      notify(h, 'Not enough space to swap your equipment.');
      return false;
    }

    // Clear the affected worn slots and return their contents to the bag.
    if(worn[slot]) delete worn[slot];
    if(twoH) delete worn[SHIELD_SLOT];
    if(slot === SHIELD_SLOT){
      const wd = worn[WEAPON_SLOT] ? itemDef(h, worn[WEAPON_SLOT].id) : null;
      if(isTwoHanded(wd)) delete worn[WEAPON_SLOT];
    }
    displaced.forEach(entry => returnToBag(inv, entry));

    // Wear the incoming item.
    worn[slot] = incoming;

    const verb = (def.verbs && def.verbs[0]) || 'Wield';
    notify(h, verb + ' ' + (def.name || itemId) + '.');
    refresh(h);
    return true;
  }

  function unequip(slot){
    const h = hud();
    if(!h || !slot) return false;

    const inv = h.getInv();
    if(!Array.isArray(inv)) return false;

    const entry = worn[slot];
    if(!entry){ return false; } // nothing in that slot - silent no-op

    if(inv.length >= INV_CAP){
      notify(h, "You don\'t have enough inventory space.");
      return false;
    }

    delete worn[slot];
    returnToBag(inv, entry);

    const def = itemDef(h, entry.id);
    notify(h, 'You remove your ' + ((def && def.name) || entry.id) + '.');
    refresh(h);
    return true;
  }

  function stats(){
    const total = { attack: 0, strength: 0, defence: 0, ranged: 0 };
    const h = hud();
    if(!h) return total;

    Object.keys(worn).forEach(slot => {
      const entry = worn[slot];
      const def = entry ? itemDef(h, entry.id) : null;
      const bonus = def && def.equipBonus;
      if(!bonus) return;
      Object.keys(bonus).forEach(k => {
        total[k] = (total[k] || 0) + (Number(bonus[k]) || 0);
      });
    });
    return total;
  }

  const api = { worn, equip, unequip, stats };
  if(typeof window !== 'undefined'){ window.EMEQUIP = api; }
  return api;
}
