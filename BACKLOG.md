# BACKLOG.md — Eldermoor

> **v65 (2026-07-01) — owner-playtest fixes, batch 1 (world visuals), each VERIFIED BY LOOKING.** Using the new capture harness (see v64) to actually view the rendered game: (1) **Roofs reveal interiors** — placeHouse roofs are now registerRoof()'d and engine.updateRoofsFor(pos) hides only the roof(s) the player is under (was: manifest roofs never registered → you could never see inside a building). Verified by capture: standing in spawn_house, the roof hides and Warden Halric + the interior are visible. (2) **Trees out of buildings** — instanceManifest scatter now excludes house footprints (+1.5u) and a 2.5u radius around every placed object/NPC (was: trees grew through walls/roofs and on instructors). Verified: 0 trees inside any of the 5 house footprints. (3) **Tab-toggle relocated** — #emtabs-toggle moved from the top minimap cluster to directly above the tab strip, bottom-right (owner asked repeatedly). (4) **Chat readable** — #emchat 178px → min(42vh,300px) + wider, so it shows many lines not one. NOTE: (3)/(4) are DOM/CSS and can't be visually verified in-sandbox (headless 0×0 viewport collapses vw/vh) — owner confirms in a real browser. Deployed v65. STILL OPEN (batch 2+): walk-through walls + unclimbable stairs (collision), click-mob combat + animations, equip no-op, banker/bank, world map, walk-backwards (char-art = other chat), blocky creator (other chat).

> **v64 (2026-07-01) — REALITY CHECK: owner playtest exposed the game as broadly broken; began real visual QC.** Owner playtest of the live build found it broadly non-functional (all-water world, walk-through walls, no combat/animation on click, unreadable chat, mislabeled version, etc.) — proving the prior "functional verification" (driving window.EM* APIs) was inadequate: it confirmed code paths execute, NOT that a player clicking things works. Two structural fixes this pass + a QC unlock: (1) **Still-frame capture harness** — engine.js renderer now uses preserveDrawingBuffer:true so the live WebGL canvas can be copied (drawImage→toDataURL→POST to a local shot-server→PNG on disk) and actually LOOKED AT; preview_screenshot hangs on the continuous rAF loop, so this is how visual QC happens now. (2) **Grass island terrain** — the world.glb ships only chapel-grounds terrain; the multi-zone island sat over the 360×360 ocean plane → "everything is blue". world.js addIslandGround() lays a tiled-grass floor across the whole play area (below terrain/floors/pond, above ocean). Verified by CAPTURE: island now reads as grass with a contained pond, not open water. (3) **Honest version label** — qa.json bumped v58→v64 (the QA badge had lied through 5 deploys). Boot-verified + visually verified. Deployed v64. REMAINING owner-reported (tracked): walk-through walls, roofs hide interiors, no combat/anim on click, equip no-op, chat unreadable, tab-button placement, world map, banker/bank, unclimbable stairs, blocky creator (other chat).

> **v63 (2026-07-01) — tutorial lesson flags wired to real actions (L13/L15/L17) + boardable ferry.** A cross-check of every lesson complete_when vs. what the game actually dispatches found 6 lesson flags that NOTHING fired (they only ever advanced via the 15s anti-brick grace, or hard-bricked): controls_taught(L1) quests_taught(L7) bank_used(L13) account_taught(L14) bones_buried(L15) departed(L17). This pass wired the 3 ACTION-based ones live: bank.js showBankPanel dispatches `bank_used`; inventory-ops.js runOp('bury') dispatches `bones_buried` (the WORKING bury path — EMPRAYER.buryBones was found to be dead code depending on a nonexistent window.EMINV); and the ferry dock is now a boardable scenery node (world.js SCENERY_DESC gains dock+boat with verb 'Board') that fires `departed` via a new player.arrive() branch. Also confirmed the bread chain is complete (flour+water→dough→bread bake recipe) so L6 is satisfiable, and all 8 has: items exist. Verified on a CLEAN origin (port 8194): bank_used + bones_buried + departed all dispatch live from their real actions, dock reachable/boardable, 0 console errors. Remaining dialogue-driven flags (L1/L7/L14) + dead buryBones + non-clickable markers logged to BACKLOG. Boot-verified. Deployed v63.

> **v62 (2026-07-01) — ROOT-CAUSE fix: 3 sealed buildings made every indoor interactable unreachable.** Extending the v61 reachability probe to ALL 28 world interactables exposed the real root cause behind v61's symptom: `world.colliders.json` contained pipeline-generated **full-footprint solid-fill rects** for quest_house, bank and wizard_tower (e.g. the entire bank interior as one solid box) PLUS wall rects whose door gap was on the *north* while `placeHouse` draws the visual door on the *south*. Net: those 3 rooms were 100% sealed, so bank_booth, poll_booth, altar, rune_rack, practice_chicken AND the 4 instructors inside were all unreachable (A* stopped at the footprint's south edge). Fix (world.colliders.json): removed all 18 rects inside those 3 footprints, making them ghost-walled like the already-working spawn_house/cooks_house (visual walls remain). With the rooms open, the v61 instructor relocations were REVERTED so all 6 stand in their proper in-room spots again; fire_ring nudged 1.5u to a clean tile. Verified on a CLEAN origin (port 8190): ALL 22 interactables reachable from spawn (6 instructors within talkRange + 16 fixtures/mobs/landmarks), 0 bricks, 6 doors intact, 0 console errors. Solid walls with real door-portals remains the BACKLOG follow-up. Boot-verified. Deployed v62.

> **v61 (2026-07-01) — tutorial-brick fix: indoor instructors were UNREACHABLE.** While investigating solid house walls, a spawn→instructor A* reachability probe exposed a PRE-EXISTING bug (present since the zones landed, independent of walls): 4 of 6 instructors — Loremaster Edda (quest_guide), Teller Wynn (banker), Steward Brann (account_guide), Magus Sorrel (magic_instructor) — sat on top of their station-fixture colliders (bank_booth/altar/rune_rack/teaching props), which enclosed their tile in a ~4-unit blocked ring. A* stopped 3.6–5.1 units short even when starting AT the door, so the player could never get within talkRange → could not talk-to them → lesson guidance bricked. Fix (world.manifest.json): the 4 were relocated to the nearest spawn-reachable tile beside their station (empirically found via probe). Verified on a CLEAN origin (port 8186): all 6 instructors now reachable from spawn within talkRange (dist 0.08–1.34, real multi-waypoint paths), 6 doors intact, 0 console errors. Also: solid house walls attempted and REVERTED (sealed instructors in at current grid resolution — see BACKLOG for the proper portal approach). Boot-verified. Deployed v61.

> **v60 (2026-07-01) — pathfinding robustness (2 audit bugs).** Two real A* defects from PARITY_AUDIT closed in world.js: **BUG+6** — the cell key `ci*1000+cj` aliased once a grid exceeded 1000 cols/rows (a hard cap on the OSRS-massive world-scale mandate); now encodes with the live row count `ci*G.rows+cj` (decode `k/KR`, `k%KR`), collision-free at any size. **BUG+7** — `cellWalkable` indexed `WALK[ci][cj]` with no bounds guard, so a path touching the exact BOUND edge could throw "Cannot read properties of undefined"; now guarded (`inb + WALK[ci] + cell`). Verified on a CLEAN origin (port 8180): normal path still reaches its target (encode/decode round-trips, no regression), a path planned to a BOUND-corner tile returns cleanly with no throw, 6 doors still place, 0 console errors. Boot-verified. Deployed v60.

> **v59 (2026-07-01) — openable doors + gates.** New `src/doors.js` (`window.EMDOORS`, published at import time so world load can use it): a hinged wooden leaf in every house doorway + an iron-banded rat-pen gate, clicked to swing open/shut with a creak, Open/Close verb + Examine (reuses the scenery node shape for free picking/hover). Collision is a DYNAMIC predicate (`window.EMDOORS.blocks`) consulted by `world.moveBlocked()` — mirrors the lesson-region gate, so the baked A* path grid is untouched and pathfinding is unchanged. House doors start OPEN (the verified-walkable island is unregressed); the rat-pen gate starts SHUT — open it to enter the pen (true OSRS Tutorial-Island progression). Wired: `world.placeHouse` + `rat_pen_gate` object branch, `player.arrive()` door branch, main-loop swing tween. Verified on a CLEAN origin (port 8178): 6 doors placed (5 house + gate), gate-shut blocks its gap / open clears it / verb toggles Open<->Close / swing tween completes, an open house door blocks nothing, 0 console errors. Boot-verified. Deployed v59.

> **v58 (2026-07-01) — CRITICAL tutorial fix (found via live smoke test).** The lesson poll (lessons.js check()) only evaluated the current STEP predicate, never the lesson-level complete_when. L0 has no step predicates and completes via flag:appearance_confirmed, which charcreate sets through an em-flag event (nothing fires em-lesson complete:L0). Result: after character creation the tutorial was STUCK on L0 forever. Fix: check() now completes a lesson whenever its complete_when holds (also hardens every action lesson). Verified on a clean origin: real charcreate path (em-flag only, poll-driven) advances L0->L1, and the chain drives L1..L6. Deployed v58.

> **v57 (2026-07-01) — dev kit slimmed (smoke-test finding).** A scripted functional smoke test (driving the live APIs: giveItem/addXp/EMLESSON/em-flag/combat/skill/ground/bank/equip/devtools) confirmed all subsystems respond, and surfaced that the dev test character filled all 28 bag slots -> could not gather during tutorial testing. devtest.js KIT slimmed to essentials (worn combat kit + 1 bow + full runes + core tools + food); extra gear tiers/tools now spawnable via the dev toolbox. Verified: bag 25/28, 3 free, giveItem(logs) works. Boot-verified. Deployed v57.

> **v56 (2026-07-01) — QA sweep + fix.** Full static defect sweep of the v37-v55 body: 49/49 src syntax-clean, 15/15 JSON valid, no monkey-patch double-wraps, no rAF leaks, canonical-mob resolvers agree, all lesson-predicate ids aligned (docs/QA_SWEEP.md). One real fix: skilling.js firemaking success now dispatches em-flag lit:fire so L3 completes on the action (not the 15s anti-brick grace). Orphaned em-settings-change event noted as backlog (harmless). Boot-verified. Deployed v56.

> **v55 (2026-07-01) — quest journal + tooltip depth.** quests-tab.js: locked-quest greying + missing-req tooltip/banner + disabled Start + brown-stone styling (state colouring/grouping/QP total already present). tooltip.js: rich item hovers (name/verb/slot/equip bonuses/value/examine) + world-target tooltips mirroring the hover label, XSS-safe, skipped on touch. Boot-verified. Deployed v55.

> **v54 (2026-07-01) — run animation.** player.js drives the avatar Running_A clip when run energy is on + moving (was always the walk clip). Boot-verified. Deployed v54.

> **v53 (2026-06-30) — skilling anim + zone content.** avatar.js: player plays a looping gather/work-swing animation while EMSKILL.isActive() (chop/mine/smith/etc.), coexists with walk/attack/death, boot-safe. world.manifest.json: signpost + 1-3 teaching props added to all 9 zones (existing kit ids only; scene 524->562). Boot-verified. Deployed v53.

> **v52 (2026-06-30) — instructors are real models.** npc.js addNpc now loads a KayKit rigged glb per role (guide/guard->Knight, mage->Mage, rogue/survival->Rogue, barbarian->Barbarian) with an AnimationMixer (Idle/Walking_A driven off the wander c.moving flag), hiding the procedural box body; defensive fallback to the box if GLTFLoader/glb fails. World now visually consistent: real rigged player + real rigged instructors. Boot-verified (15 nameplates, clean). Deployed v52.

> **v51 (2026-06-30) — polish batch.** levelup.js (new, wired): OSRS level-up popup + jingle, polls EMHUD levels. sfx-actions.js: full procedural SFX coverage for chop/mine/fish/fire/smith/smelt/cook/hit/block/eat/bury/drop/take/equip/bank/prayer/cast/UI/level-up (fixed a dead rawBeep that reached a non-existent EMAUDIO._ctx; own mixer/mute-aware Web Audio bus). items.json: value/weight/highalch/lowalch/examine across all 110 items. Boot-verified. Deployed v51.

> **v50 (2026-06-30) — tutorial chain wired end-to-end.** Fixed the L0-L17 completion breaks found by direct trace: combat.js now dispatches em-flag killed:<mob> (+ _ranged) on kill (giant-rat->giant_rat) for L11/L12; magic-tab.js dispatches cast:<spell> and L16 predicate aligned to the real spell id (gale_bolt = Wind Strike); skilling.js mine now yields BOTH copper-ore AND tin-ore (random) so L8 (has:tin-ore&has:copper-ore) + smelting are reachable. All lesson item ids verified present. Boot-verified clean. Deployed v50.

> **v49 (2026-06-30) — Use-on.** inventory-ops.js: OSRS Use flow (arm Use on a bag item -> tap another item OR a world fixture). Data-driven recipes in assets/data/useon.json: flour+water->dough, tinderbox+logs->fire (lit:fire flag for L3), raw-shrimp on fire/range->cooked, ore on furnace->bronze-bar, bar on anvil->bronze-dagger; fixture recipes route through window.EMSKILL (no dup). Boot-verified. Deployed v49.

> **v48 (2026-06-30) — combat formulas + ground items + chat depth.** combat.js: OSRS effective-level/accuracy-roll/max-hit formulas + per-weapon attack-speed cadence + style stance bonuses (combat.json). grounditems.js (new, wired into main loop + inventory Drop): drop->ground mesh+proxy->Take/Examine, stacking, 60s despawn. hud.js chat: coloured/categorised by channel, timestamps, PM From/To, working filters, 200-line scrollback, XSS-safe sanitize. Boot-verified (EMGROUND.drop live, scene 524). Deployed v48.

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
- [x] Openable doors/gates between zones. **(v59 — src/doors.js: hinged house doors + rat-pen gate, swing + creak + Open/Close/Examine, dynamic collision via EMDOORS.blocks in world.moveBlocked.)**
- [ ] Solid house walls. *(v59 note: manifest houses render wall meshes but add NO colliders — you can walk through the walls; doors block only their gap. **v61 ATTEMPTED + REVERTED:** adding RECT wall colliders sealed the indoor instructors in — at the 0.45 path-grid + RAD inflation the 2.0 door gap isn't reliably routable (A* stopped OUTSIDE 4/6 houses, verified by reachability probe). To do this safely: make the doorway a real portal — widen the gap to ≥3.0, and/or lay explicit walkable "door cells" bridging interior↔exterior, and/or refine the A* grid near doorways. Only then add wall colliders. Verify with the same spawn→each-instructor reachability probe before shipping.)*

## Tutorial completion gaps (found v63 via lesson-predicate cross-check)
- [ ] **Dialogue-driven lesson flags never dispatched: controls_taught (L1), quests_taught (L7), account_taught (L14).** These 3 flags exist ONLY as complete_when predicates in lessons.json; nothing fires them, so those lessons advance only via the 15s anti-brick grace (IF the instructor dialogue fires `em-lesson complete:LN`) — not by the real action. Fix: add a dialogue→flag hook (a dialogue node that dispatches em-flag) or wire them at the natural action site (controls_taught after first movement; quests_taught on opening the quest journal; account_taught on the account-guide dialogue completing). *(v63 wired the ACTION-based siblings bank_used/bones_buried/departed live.)*
- [ ] **Dead API: `EMPRAYER.buryBones()` depends on `window.EMINV`, which is never set → always returns false.** Harmless (the working bury is inventory-ops.js `runOp('bury')`, which v63 now flags), but fix or remove the dead export to avoid a landmine.
- [ ] **Non-clickable world markers.** `place()` only builds click proxies for tree/bush/rock (+ dock/boat as of v63). altar, signpost, target_butt, rune_rack, ladder render as decoration with NO scenery node → not interactable (can't pray at the wizard-tower altar, read a signpost, shoot the target butt, or use the rune rack). Add SCENERY_DESC entries + verb handlers (Pray-at/Read/Shoot/Search).

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
