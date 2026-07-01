# BACKLOG.md — Eldermoor

> **v47 (2026-06-30) — REAL CHARACTER.** The blocky procedural avatar is replaced by the CC0 KayKit rigged glTF character (avatar.js loads assets/ext/characters/*.glb, THREE.AnimationMixer drives idle/walk/attack/death/cast, weapon+shield clone onto handslot.r/.l bones). player.js drives mixer state when the glb is active, else the procedural rig (boot-safe fallback preserved). Verified: usingGlb flips true on appearance set, Knight.glb 200, gear sockets populate. Deployed v47.

> **v46 (2026-06-30) — core loop FIXED (from owner playtest).** Root cause of dead combat AND dead magic: world.js placeMob() handed the click-picker a throwaway CLONE, not the canonical mob node, so HP/death never stuck — fixed at root (proxy.userData.mob = node) + defensive resolvers in combat.js/magic-tab.js. Magic now casts on the real mob with element-coloured projectile + impact. Prayer shows clear on/off + overhead sprite. HUD: desktop dock-lock (panel no longer dragged top-left over XP/QA by mobile-ius landscape rule), full-width skills grid, WORKING chat input. Creator: OSRS 2-column no-scroll + rotating 3D preview. CC0 KayKit pack downloaded (5 rigged chars + 14 gear) for the avatar swap (next). Boot-verified, deployed v46.

> **IN FLIGHT (2026-06-30, post-v45 owner playtest).** Owner playtest found the shipped core loop functionally broken (boot-verified != works). Two tracks running: (1) ASSET PIVOT — operating-law 0.1 revised to allow free CC0 assets; sourcing real low-poly character+gear to replace the blocky procedural avatar (ASSETS-REAL). (2) FUNCTIONAL FIXES from the bug list: HUD-FIX (inventory/XP overlap, skills panel space, tab dock, working chat input), COMBAT-FIX (melee actually works), PRAYER-FIX (on/off clarity + overheads), MAGIC-FIX (cast + animation), CREATOR-LAYOUT (OSRS 2-column, no-scroll). Each will be integrated + boot-verified + deployed as it lands; owner re-playtests as the gate.

> **v45 (2026-06-30) — 3D character creator + interaction parity.** Replaced the flat 2D paper-doll creator preview with a live rotating 3D render of the REAL in-world avatar (charcreate.js uses a mini THREE scene + window.EMAVATAR.buildBody(sel); SVG paper-doll kept only as a no-THREE fallback). Boot-verified: creator preview is a 300x300 canvas updating per option, not SVG. Also P2 interaction parity (interact.js): examine-on-everything to chat, nearest-pick on overlapping taps, red X + "I cant reach that" feedback, wall occlusion on walk-taps, red Cancel last in menus. Clean-origin boot-verified. Deployed v45.

> **v44 (2026-06-30) — all zone props modelled.** PROPS-FINISH: rat_pen_gate/target_butt/rune_rack/boat authored (build_kit.py), Blender-exported to assets/kit, registered in PIECES + MARKER_PIECE — every placeholder block is now a real faceted mesh. Clean-origin boot-verified (scene 523). Deployed v44.

> **v43 (2026-06-30) — real zone props + bank depth + quest reward.** ZONE-EXPORT: 8 Blender fixture meshes (range/furnace/anvil/bank_booth/altar/ladder/signpost/dock) exported to assets/kit/*.glb, registered in PIECES, wired so placeFixture uses the real mesh + manifest markers (ladder/altar/signpost/dock) place real props (placeholders remain only for gate/target/rune_rack/boat). BANK-DEPTH: tabs, search, withdraw-as-note, placeholders, 4-digit PIN (bank.js). QUEST-REWARD: OSRS reward scroll on completion (quests-tab.js). Clean-origin boot-verified (scene 519, EMBANK/EMQUEST live). Deployed v43.

> **v42 (2026-06-30) — ISLAND WALKABLE.** ZONE-RENDER landed: instanceManifest(world.js) now renders manifest buildings (procedural houses), skilling fixtures (fishing/fire/range/furnace/anvil/bank/poll via placeFixture), rat/chicken mobs, and placeholder landmarks; new runtime addNpc (npc.js, window.EMNPC.add) spawns the 10 instructors as procedural low-poly bodies with nameplate+click-proxy+collider+wander, talkable (talk() resolves their dialogue tree by id). Clean-origin boot-verified: loads (515 scene objs), player walks north through all 9 zones, 15 nameplates, dialogue trees present. No Blender needed for walkability. Deployed v42. Remaining: ZONE-EXPORT (optional fixture-mesh glb polish).

> **v41 wave — P4+P7 CONTENT authored (2026-06-30).** 7 agents landed: full L0-L17 lesson chain verified+wired (lessons.json), 11 instructor dialogue trees (dialogue.json, dual-keyed), 2 starter quests (quests.json), 67 examine lines (examine.json), 8 zone fixture builders (build_kit.py), 9-zone layout + instructor placement (world.manifest.json, ids reconciled to live dialogue/lesson/music ids), unique generative per-zone music (audio.js/music-engine.js, shipped v41). HONEST GAP: the zone layout is authored to the editor schema but the runtime instanceManifest(world.js) only reads objects/scatter/fixtures, and the 8 fixture meshes need a Blender GPU export — so the 9 new zones do NOT render in-game yet. Next: ZONE-RENDER (wire instanceManifest to render buildings/npcs/markers + NPC proxies) + ZONE-EXPORT (blender export fixture glb).

> **v40 (2026-06-30) — BOOT HOTFIX.** v39 bricked at "Entering the Chapel…": world.js read pos/player at module top-level (SPAWN), and the player<->world circular import made that a TDZ that crashed the whole ES module graph (so NOTHING booted and the loader never cleared — no JS ran to fire the 20s backstop). Fixed: SPAWN uses literal defaults, overwritten from colliders JSON. Verified on a clean origin: loader clears, EMHUD/EMTICK/EMCOMBAT/EMPRAYER init, scene=328 objects, login shows. Deployed v40.

> **v39 (2026-06-30) — QA-fix wave 2 SHIPPED (awaiting playtest).** 7 more agents: combat loop (walk-to-mob -> fight -> death/respawn + attack/death anim), skill-guide panel (click a skill in Stats), tutorial progression (lessons complete on the real action + 15s anti-brick grace), per-zone music + crossfade + persisted audio settings, 8 elemental/catalytic rune items (spells now castable), skill-guide wired into HUD. Camera keys (C9) + forgiving scenery tap (C11) were already live. Deployed v39 (modules 200) at https://eldermoor.vercel.app . Board: To Do 0 / Shipped 26 / Done 1. [~] pending on-device playtest via the v39 QA panel.

> **v38 (2026-06-30) — QA-fix wave SHIPPED (awaiting playtest).** 10 parallel agents shipped from v36 owner QA: login/landing + fixed logout; HUD overhaul (XP no longer overlaps inventory, persistent chatbox, stat-orb cluster, docked tab strip, blue->brown tone); combat styles (weapon-aware, per-style XP split); 28-prayer roster; 23-spell book (strike/bolt/blast/wave + teleports/alch, rune-gated); dialogue dismiss-on-walk-away + new-chat + Esc; dev toolbox (give/set/spawn/teleport); full dev rune+gear kit; +70 item tier ladder (Ferrite->Sunsteel); minimap (compass/click-to-walk/zoom/blips). Integrated (main.js+hud.js wiring), node --check clean, deployed-URL verified (modules 200) at https://eldermoor.vercel.app . [~] pending on-device playtest via the v38 in-game QA panel (auto-syncs to the dashboard). Character art (avatar/creator/mage-studio, src/char/*) owned by a SEPARATE chat.

Outstanding work to 100%. Item-level pass/fail tests in `PARITY_AUDIT.md` (~645 items); phase status in
`ROADMAP.md`. This is the prioritized feature backlog.

## Test infrastructure (v30 — supports QA; keep current each release)
- [x] Dev test character (`devtest.js`) — all skills 99 + combat kit every load (idempotent; `EMDEV` toggle).
- [x] In-game QA panel (`qa-panel.js` + `assets/data/qa.json`) — per-item Pass/Fail/Skip + notes, one-tap
      Copy/Share/Download report. **Per-release chore:** refresh `assets/data/qa.json` with the build's test items.
- [x] QA report auto-delivery — DONE v31: `api/qa.js` (Vercel KV) + QA-panel auto-POST; dev reads GET /api/qa.
      Requires Josh to connect a Vercel KV store once (HUMAN_ACTIONS.md).

## Fleet tooling (supports the parallel build)
- [x] **Live KANBAN dashboard** — `dashboard.html` (To Do/Building/Review/Shipped/Done), KV-backed, DEPLOYED
      to https://eldermoor.vercel.app/dashboard.html (KV was already connected). `tools/progress.js` reporter
      CLI; new `shipped` status = boot-verified + deployed, awaiting human playtest.
- [ ] **Auto-report from agents** — add a `tools/progress.js set` call to each agent's start/finish so the
      board updates without the orchestrator hand-writing entries.
- [ ] **Auto-promote review→shipped** — a deterministic boot-verify step (no console errors + logic asserts)
      that machine-promotes chunks to `shipped`, leaving only the visual `shipped→done` for Josh (closes the
      perceived bottleneck for non-visual work).

## P0 — Mobile Playability (Sprint 1, ACTIVE — blocks new gameplay)
- [~] **1A Responsive UI framework** (v28→v29) — orientation, single-panel docking, bottom-sheet dialogue,
      chat collapse, objective auto-hide+persist, ≥44px touch targets, haptics, name entry, FAB removed;
      v29 QA fixes: dedicated landscape layout, top-right HUD cluster de-overlap, responsive panel sizing
      (no clip), inventory long-press context menu. Boot-verified (26/26 headless UI test); **re-QA on device.**
- [x] **Parameterized player model (avatar customization made fully visible).** — DONE v35 via a
      **procedural** avatar (`avatar.js`): builds the in-world body from THREE primitives off
      `eldermoor:appearance` (parts + colours + body type) so every saved selection shows — hair, beard,
      head, torso (incl. robe/dress), arms, hands, legs (incl. skirts), footwear (boots/shoes/sandals),
      body type, per-part colour. Limb pivots drive the existing walk cycle; worn weapon/shield render in
      the hands; static `player.glb` hidden. **Save format read as-is (no migration).** Agent-QA'd + a
      glb-vs-avatar render race fixed (loaders.js re-asserts after `player.glb` loads).
- [ ] **Blender high-fidelity parameterized model (replace the procedural avatar).** Author the part
      meshes in Blender (`build_eldermoor.py`/kit) at the MODELING_SPEC bar, exported as togglable
      sub-meshes or swappable glTFs keyed by the existing part ids, dropped in behind the SAME data
      contract `avatar.js` already uses (`eldermoor:appearance` + `EMEQUIP.worn`). No save migration.
      Keep ALL customization options — do not trim the creator to match model limits.
- [x] **Character-creator live preview** — DONE v33: a 2D SVG paper-doll in the creator updates live on every
      part/colour toggle (reflects part shapes + colours). Future: an in-world/3D preview once the
      parameterized player model exists (above).
- [ ] **1B** Inventory + Equipment mobile interactions.
- [ ] **1C** Combat loop end-to-end on mobile.
- [ ] **1D** Tutorial progression on mobile.
- [ ] **1E** Audio, settings, prayer, save/load, logout on mobile.

## P0 — promote integrated → done
- [ ] **Live-playtest pass** on the deployed link for every "integrated + boot-verified" feature; demote any
      that doesn't actually fire in 3D. *(the gate blocking ~all features from "complete")*
- [ ] **Production promotion** of v27 to the eldermoor.vercel.app production alias (`vercel --prod`, done
      outside the sandbox) — currently the latest push deploys as a preview.
- [x] Wire the tutorial lesson chain to **gate real actions** — `src/gating.js` (v26): gates skill/combat/bank
      actions + movement regions by lesson step with OSRS nudge; anti-brick until instructors/zones exist.
- [x] Fixed ~0.6s game tick for actions/combat — `src/tick.js` (v27): one shared `EMTICK` clock; combat +
      skilling subscribe to it. Integrated + boot-verified (7/7 functional test); live-playtest pending.

## P1 — combat & skilling depth
- [x] Ranged combat (bow+arrows, projectile, Ranged+HP XP) — integrated v24, playtest pending.
- [x] Magic cast (combat spell → mob, consume runes, bolt projectile, Magic+HP XP) — integrated v24, playtest pending.
- [x] Prayer points pool + activation drain + bury-bones — integrated v25, playtest pending.
- [x] Route smithing/cooking through the Make-X interface — integrated v25, playtest pending.
- [x] Equipment renders on the 3D avatar — DONE v36: `avatar.js` `renderWorn()` renders all worn slots
      (weapon/shield/body/cape/gloves + helm/legs/feet anchors) from `EMEQUIP.worn`; unequip removes the
      mesh. Procedural low-poly; a higher-fidelity per-item mesh set can replace it later behind the same
      data contract (see the Blender high-fidelity item below).
- [ ] Combat pathing + death/respawn + attack/death animation (1C) — character must walk to a distant mob
      before attacking; death anim + respawn. *(FAIL in v35 owner QA.)*

## P2 — world build-out (needs assets via build_kit.py)
- [ ] 9 missing zones: spawn house, full survival area, cook's house, quest house, mine/underground,
      combat ring, bank building, wizard area, departure dock.
- [ ] Instructor roster placed in-world (data authored; NPCs not placed).
- [ ] Openable doors/gates between zones.

## P3 — systems
- [ ] Trading (player-to-player) · multiplayer presence.
- [ ] Bank PIN/tabs/search/notes/placeholders. *(reference impl salvaged from the retired fork:
      `salvage/opus-wave-v26/bank.js` — cherry-pick the depth features onto v31's bank.js.)*
- [~] Quest accept/track/complete flow — accept/complete + QP increment integrated v25; reward screen pending.
- [~] Audio: action-SFX coverage integrated v25 (`sfx-actions.js`); real per-zone music still pending.

## P4 — polish / later
- [ ] Mobile HUD reflow · accessibility (colourblind/text-scale/keyboard nav) · i18n.
- [ ] World-map POI search; collection log / diaries / GE (future scope).
- [ ] Perf/LOD (InstancedMesh scatter), camera collision, engine-port bridge.

**Counts:** ~46 features integrated, ~44 remaining (see METRICS.md).

**Tooling:** policy-driven Claude Code config installed (commit 3a9fe8d) — `.claude/settings.json` +
SessionStart/PreToolUse/PostToolUse/Stop hooks (validated). Governs session bootstrap, destructive-git
approval, doc-staleness flagging, and stop-gating.
</content>
