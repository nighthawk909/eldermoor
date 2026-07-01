# NEXT_TASKS.md — Eldermoor

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

The immediate, ordered next tasks. Each is one focused chunk (one file where possible) for a single agent.
Source of truth for the wider list: `BACKLOG.md` / `ROADMAP.md` / `PARITY_AUDIT.md`.

## Recently shipped (v24–v27)
- [x] **Ranged combat** (`combat.js`, v24) — bow + arrows consume ammo, projectile, max range, melee fallback.
- [x] **Magic cast** (`magic-tab.js`, v24) — combat spell → mob, consume runes, bolt projectile, Magic+HP XP.
- [x] **Prayer points** (`prayer-tab.js`, v25) — point pool = Prayer level, activation drain, bury-bones for XP.
- [x] **Make-X smith/cook** (`skilling.js`, v25) — smithing (anvil) + cooking (range) routed through Make-X.
- [x] **Quest accept/complete** (`quests-tab.js`, v25) — accept → track → complete flow + QP increment.
- [x] **Action SFX** (`sfx-actions.js`, v25) — chop/mine/fish/smith/hit/eat cues wired to actions.
- [x] **Lesson gating** (`src/gating.js`, v26, commit 11484f9) — gates skill/combat/bank actions + regions by
      tutorial step with OSRS nudge; anti-brick while instructors/zones absent.
- [x] **Fixed 0.6s global game tick** (`src/tick.js`, v27, commit e68d1b8) — one shared clock; combat +
      skilling subscribe to it. (7/7 functional test.)
      All v24–v27 integrated + boot-verified; **live-playtest pending** for the lot.
- [x] **Claude Code policy config** (commit 3a9fe8d) — settings + Session/Pre/Post/Stop hooks, validated.
- [x] **Mobile Sprint 1A — responsive UI framework** (v28→v29, `mobile-ui.js`/`emotes.js`/`charcreate.js`/`inventory-ops.js`):
      orientation detection, single-panel docking, bottom-sheet dialogue, chat collapse, objective auto-hide+persist,
      stray emote FAB removed, character name entry; **v29 QA fixes:** dedicated landscape layout, top-right HUD
      cluster de-overlap, responsive panel sizing (no clip), inventory long-press context menu on mobile
      (tap/long-press/Examine/Drop). 26/26 headless UI test. **Awaiting Josh's on-device QA before 1B.**
      *RESOLVED v35: character-creator part SHAPES now render on the in-world body via the procedural
      avatar (`avatar.js`). A higher-fidelity Blender-authored multi-part model can replace it later behind
      the same data contract (BACKLOG).*

## Test infrastructure (v30, owner-requested — supports the QA loop, not a milestone)
- [x] **Dev test character** (`devtest.js`): all skills 99 + combat kit each load (idempotent; toggle EMDEV).
- [x] **In-game QA panel** (`qa-panel.js` + `assets/data/qa.json`): per-item Pass/Fail/Skip + notes, one
      Copy/Share/Download report. **Process:** update `assets/data/qa.json` every release with what to test.
- [x] **Live QA sync** (v31, `api/qa.js` + Vercel KV): QA panel auto-POSTs results; dev reads `GET /api/qa`.
      **Setup (Josh):** connect Vercel KV + redeploy (HUMAN_ACTIONS.md).
- [x] **v32 QA findability**: version on the QA button (HUD hides the old version bar); XP counter de-overlap.
- [x] **v33 character-creator live preview**: 2D paper-doll updates on every part/colour toggle.
- [x] **v34 mobile 1A QA round 3**: inventory tap action, equip-slot display fix, compact dialogue dock,
      objective recall pill, collapsible tabs, landscape tab-bar fix. (Deferred: equip-on-avatar+eat anim=1B;
      combat anim/respawn=1C; QA live-sync=connect Vercel KV.)
- [x] **v35 parameterized player avatar** (`avatar.js`): character-creator parts + colours + body type now
      render on the in-world 3D body (was colour-only); limb pivots drive the walk cycle; worn weapon/shield
      show in the hands; `bury` op added. Fixed a glb-vs-avatar render race (loaders.js re-asserts the avatar
      after `player.glb` loads). Agent-QA'd before owner QA + 10/10 THREE-stub logic test.
- [x] **v36 worn gear on avatar + v35-QA fixes**: `avatar.js` renders ALL worn slots (weapon/shield/body/
      cape/gloves + helm/legs/feet anchors), not just weapon/shield; unequip removes the mesh. Tab panel
      translucent so the character is visible while equipping (`mobile-ui.js`). Name entry enforces 2–12
      chars w/ live counter. Objective fixed: dropped the bogus hardcoded "Brother Aldric" line + charcreate
      fires `appearance_confirmed` so L0 completes and the objective advances. Agent-QA'd + 8/8 logic test.
      **Awaiting on-device QA (dispatch can screenshot).**

## Still open from v35/v36 owner QA (next focused rounds)
- [ ] **1C combat smoke**: character must PATH to a distant mob before attacking; add death/respawn +
      basic attack/death animation. (FAIL in v35 QA.)
- [ ] **Landscape panel polish**: inventory/equipment panel clipping "top-right stuff" in landscape. (FAIL.)
- [ ] **3D in-creator preview**: current creator preview is 2D + basic — replace with the live 3D avatar.

## Mobile Sprint 1 — remaining milestones (sequential, each gated by on-device QA)
- **1B** Inventory + Equipment mobile interactions (tap/long-press use/wield/drop on touch).
- **1C** Combat loop end-to-end on mobile (path → attack → hits → death → respawn).
- **1D** Tutorial progression (lesson gating active, objectives, NPC dialogue flow).
- **1E** Audio, settings, prayer toggles, save/load, logout.

## Next 10 (deferred until Mobile Sprint 1 passes)
1. **Worn gear on avatar** (`appearance-apply.js` or new): attach/colour wielded weapon + armour on the model.
2. **Bank depth** (`bank.js`): tabs, search, withdraw-as-note, placeholders.
3. **Spawn house zone** (`build_kit.py` + manifest): first enclosed room + the Guide instructor placed.
4. **Instructor roster placed in-world** (manifest + `npc.js`): place the authored instructor NPCs per zone
   (also activates lesson gating, which is anti-brick/open until instructors exist).
5. **Openable doors/gates** (`world.js`/`interact.js`): door objects toggle passability + feed `EMGATE` regions.
6. **Per-zone music** (`music-tab.js`/`audio.js`): real per-zone tracks beyond the procedural cues.
7. **Trading + multiplayer presence**: player-to-player trade (two-screen confirm); other-player dots.
8. **Bank PIN** (`bank.js`): 4-digit PIN gate on withdraw/settings.
9. **Quest reward screen** (`quests-tab.js`): reward scroll UI on completion.
10. **Live-playtest harness**: a checklist run on the deployed URL promoting integrated → done.

## Fleet tooling (new — supports the parallel build, not a milestone)
- [x] **Live KANBAN dashboard** (`dashboard.html` + `progress.json` + `api/progress.js` + `tools/progress.js`):
      columns To Do / Building / Review / Shipped / Done, deployed to prod (KV connected), phone-visible at
      https://eldermoor.vercel.app/dashboard.html . New `shipped` status = boot-verified + deployed, awaiting
      your playtest. Agents report with `node tools/progress.js set <id> <status> [note] --agent NAME`.
      *Open: auto-report wired into agent definitions so the board self-populates.*

## P1 render-correctness wave — SHIPPED (awaiting your playtest)
- [~] All 8 P1 fixes shipped + boot-verified + deployed (see ROADMAP P1). **Your call:** playtest the
      deployed link and confirm the chapel scene looks right (sky gradient, no water holes, terrain/floor
      seam, altar glow fade) → then I promote them to `done`. P1.6 roof is wired but dormant (no roofed
      building asset exists yet).

## Hard rules for every task
- Straight ASCII quotes only; escape `'` inside single-quoted strings as `\'`.
- One file per agent where possible; new modules export `init*()` for `main.js` wiring.
- Verify with a real browser boot (cache-free copy or deployed URL) — `node --check` alone is insufficient.
- Never deploy from a subagent; the orchestrator integrates + boot-verifies + deploys.
</content>
