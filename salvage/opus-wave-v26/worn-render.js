/* =====================================================================
   ELDERMOOR - worn-render module (EQ4 / FEEL+6).

   Attaches simple THREE.js primitive meshes to the player rig to
   represent wielded/worn gear (weapon + shield) whenever
   window.EMEQUIP.worn changes.

   Exposes: window.EMWORNRENDER = { refresh }
   main.js calls initWornRender() once after initEquipment().

   Defensive contract:
   - No-ops if window.THREE, window.EMEQUIP, or window.EMRIG are absent.
   - Polls window.EMEQUIP.worn at ~3 Hz and also listens for the
     "em-equip-changed" event so the display is immediate on equip/unequip.
   - Meshes are attached as children of the right-arm pivot (armR) for the
     weapon and the left-arm pivot (armL) for the shield.  Falls back to
     window.EMSCENE if neither limb pivot exists.
   - Old meshes are disposed (geometry + material) before building new ones.

   Shape / colour table:
     Weapon slot
       *sword*, *dagger*, *mace*, *axe*, *warhammer*, *scimitar*
           -> thin elongated box (blade), steel #c2cad4
       *staff*, *wand*
           -> thin tall box (staff), dark wood #5a3f28
       *bow*, *shortbow*, *longbow*, *crossbow*
           -> narrow flat box (limbs), wood #5a3f28
       (unknown weapon)
           -> thin box, iron grey #8a8a8a
     Shield slot
       *shield*
           -> flat square slab, steel #c2cad4
       (unknown shield)
           -> flat square slab, iron grey #8a8a8a

   Mesh local-space layout (relative to arm pivot, +Y up, +Z forward):
     Weapon: x=0.18, y=-0.35, z=0 (held forward of right fist)
     Shield: x=-0.18, y=-0.25, z=0.06 (on left forearm, facing front)
   ===================================================================== */

export function initWornRender() {
  if (typeof window === "undefined") return;
  if (window.__emWornRenderInit) return;
  window.__emWornRenderInit = true;

  /* ------------------------------------------------------------------ deps */
  // All global references are read lazily so load-order doesn\'t matter.
  function THREE()  { return window.THREE || null; }
  function equip()  { return window.EMEQUIP || null; }
  function rig()    { return window.EMRIG   || null; }
  function scene()  { return window.EMSCENE || (window.EMENGINE && window.EMENGINE.scene) || null; }

  /* ---------------------------------------------------------- state */
  // Track the currently-attached mesh for each slot so we can remove/dispose.
  const attached = { weapon: null, shield: null };

  // Last snapshot of worn ids used to skip redundant rebuilds.
  const prev = { weapon: null, shield: null };

  /* ------------------------------------------------ colour lookup */
  // Returns an integer colour suitable for THREE.MeshLambertMaterial.
  function colourForWeapon(id) {
    if (!id) return 0x8a8a8a;
    const lo = id.toLowerCase();
    if (/bow/.test(lo) || /staff/.test(lo) || /wand/.test(lo)) return 0x5a3f28; // wood
    if (/sword/.test(lo) || /dagger/.test(lo) || /mace/.test(lo) ||
        /axe/.test(lo)   || /hammer/.test(lo) || /scimitar/.test(lo)) return 0xc2cad4; // steel
    return 0x8a8a8a; // unknown -> iron grey
  }

  function colourForShield(/*id*/) {
    return 0xc2cad4; // all shields -> steel
  }

  /* ----------------------------------------------- geometry helpers */
  // Returns { w, h, d } box dimensions for the weapon id.
  function weaponDims(id) {
    if (!id) return { w: 0.04, h: 0.55, d: 0.04 };
    const lo = id.toLowerCase();
    if (/bow/.test(lo)) return { w: 0.04, h: 0.60, d: 0.02 };  // bow stave, flat
    if (/staff/.test(lo) || /wand/.test(lo)) return { w: 0.03, h: 0.70, d: 0.03 }; // tall thin staff
    // swords, daggers, axes, maces, etc.
    return { w: 0.04, h: 0.55, d: 0.05 };
  }

  /* ------------------------------------------- mesh factory helpers */
  function makeMesh(T, geo, colour) {
    const mat = new T.MeshLambertMaterial({ color: colour });
    const mesh = new T.Mesh(geo, mat);
    mesh.name = "__worn_mesh__";
    return mesh;
  }

  function buildWeaponMesh(T, id) {
    const dims = weaponDims(id);
    const geo = new T.BoxGeometry(dims.w, dims.h, dims.d);
    const mesh = makeMesh(T, geo, colourForWeapon(id));
    // Position: out to the right of the arm, below the pivot, centred depth
    mesh.position.set(0.18, -0.35, 0.0);
    return mesh;
  }

  function buildShieldMesh(T, id) {
    const geo = new T.BoxGeometry(0.30, 0.30, 0.04); // flat slab
    const mesh = makeMesh(T, geo, colourForShield(id));
    // Position: left arm, facing outward
    mesh.position.set(-0.18, -0.25, 0.06);
    return mesh;
  }

  /* ------------------------------------------------- disposal */
  function disposeMesh(mesh) {
    if (!mesh) return;
    if (mesh.parent) mesh.parent.remove(mesh);
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(function(m) { m.dispose(); });
      } else {
        mesh.material.dispose();
      }
    }
  }

  /* --------------------------------- anchor helpers (arm or scene) */
  function weaponAnchor() {
    const r = rig();
    if (r && r.armR) return r.armR;
    return scene();
  }

  function shieldAnchor() {
    const r = rig();
    if (r && r.armL) return r.armL;
    return scene();
  }

  /* -------------------------------------------- core refresh */
  function refresh() {
    const T = THREE();
    if (!T) return;           // THREE not loaded yet
    const eq = equip();
    if (!eq || !eq.worn) return; // EMEQUIP not ready

    const worn = eq.worn;

    // Slot ids -- worn[slot] is { id, count } per equipment.js contract,
    // or a bare string id in older schemas; handle both.
    function slotId(entry) {
      if (!entry) return null;
      if (typeof entry === "string") return entry;
      return entry.id || null;
    }

    const wId = slotId(worn.weapon) || null;
    const sId = slotId(worn.shield) || null;

    // ----- weapon -----
    if (wId !== prev.weapon) {
      prev.weapon = wId;
      disposeMesh(attached.weapon);
      attached.weapon = null;

      if (wId) {
        const anchor = weaponAnchor();
        if (anchor && typeof anchor.add === "function") {
          const mesh = buildWeaponMesh(T, wId);
          anchor.add(mesh);
          attached.weapon = mesh;
        }
      }
    }

    // ----- shield -----
    if (sId !== prev.shield) {
      prev.shield = sId;
      disposeMesh(attached.shield);
      attached.shield = null;

      if (sId) {
        const anchor = shieldAnchor();
        if (anchor && typeof anchor.add === "function") {
          const mesh = buildShieldMesh(T, sId);
          anchor.add(mesh);
          attached.shield = mesh;
        }
      }
    }
  }

  /* ----------------------------------------- event listener */
  // Instant response when the equipment module fires its change event.
  window.addEventListener("em-equip-changed", refresh);

  /* ------------------------------------------- polling */
  // Fallback poll at ~3 Hz covers modules that mutate worn without firing the event.
  let _pollHandle = null;

  function startPoll() {
    if (_pollHandle !== null) return;
    _pollHandle = setInterval(refresh, 333);
  }

  // Start polling immediately; if THREE/EMEQUIP aren\'t ready yet the refresh
  // is a cheap no-op that returns early.
  startPoll();

  // First eager refresh in case everything is already loaded synchronously.
  refresh();

  /* ------------------------------------------- public API */
  const api = { refresh: refresh };
  window.EMWORNRENDER = api;
}
