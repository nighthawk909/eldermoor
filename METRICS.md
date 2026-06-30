# METRICS.md — Eldermoor

> **v43 (2026-06-30) — real zone props + bank depth + quest reward.** ZONE-EXPORT: 8 Blender fixture meshes (range/furnace/anvil/bank_booth/altar/ladder/signpost/dock) exported to assets/kit/*.glb, registered in PIECES, wired so placeFixture uses the real mesh + manifest markers (ladder/altar/signpost/dock) place real props (placeholders remain only for gate/target/rune_rack/boat). BANK-DEPTH: tabs, search, withdraw-as-note, placeholders, 4-digit PIN (bank.js). QUEST-REWARD: OSRS reward scroll on completion (quests-tab.js). Clean-origin boot-verified (scene 519, EMBANK/EMQUEST live). Deployed v43.

> **v42 (2026-06-30) — ISLAND WALKABLE.** ZONE-RENDER landed: instanceManifest(world.js) now renders manifest buildings (procedural houses), skilling fixtures (fishing/fire/range/furnace/anvil/bank/poll via placeFixture), rat/chicken mobs, and placeholder landmarks; new runtime addNpc (npc.js, window.EMNPC.add) spawns the 10 instructors as procedural low-poly bodies with nameplate+click-proxy+collider+wander, talkable (talk() resolves their dialogue tree by id). Clean-origin boot-verified: loads (515 scene objs), player walks north through all 9 zones, 15 nameplates, dialogue trees present. No Blender needed for walkability. Deployed v42. Remaining: ZONE-EXPORT (optional fixture-mesh glb polish).

> **v41 wave — P4+P7 CONTENT authored (2026-06-30).** 7 agents landed: full L0-L17 lesson chain verified+wired (lessons.json), 11 instructor dialogue trees (dialogue.json, dual-keyed), 2 starter quests (quests.json), 67 examine lines (examine.json), 8 zone fixture builders (build_kit.py), 9-zone layout + instructor placement (world.manifest.json, ids reconciled to live dialogue/lesson/music ids), unique generative per-zone music (audio.js/music-engine.js, shipped v41). HONEST GAP: the zone layout is authored to the editor schema but the runtime instanceManifest(world.js) only reads objects/scatter/fixtures, and the 8 fixture meshes need a Blender GPU export — so the 9 new zones do NOT render in-game yet. Next: ZONE-RENDER (wire instanceManifest to render buildings/npcs/markers + NPC proxies) + ZONE-EXPORT (blender export fixture glb).

> **v40 (2026-06-30) — BOOT HOTFIX.** v39 bricked at "Entering the Chapel…": world.js read pos/player at module top-level (SPAWN), and the player<->world circular import made that a TDZ that crashed the whole ES module graph (so NOTHING booted and the loader never cleared — no JS ran to fire the 20s backstop). Fixed: SPAWN uses literal defaults, overwritten from colliders JSON. Verified on a clean origin: loader clears, EMHUD/EMTICK/EMCOMBAT/EMPRAYER init, scene=328 objects, login shows. Deployed v40.

> **v39 (2026-06-30) — QA-fix wave 2 SHIPPED (awaiting playtest).** 7 more agents: combat loop (walk-to-mob -> fight -> death/respawn + attack/death anim), skill-guide panel (click a skill in Stats), tutorial progression (lessons complete on the real action + 15s anti-brick grace), per-zone music + crossfade + persisted audio settings, 8 elemental/catalytic rune items (spells now castable), skill-guide wired into HUD. Camera keys (C9) + forgiving scenery tap (C11) were already live. Deployed v39 (modules 200) at https://eldermoor.vercel.app . Board: To Do 0 / Shipped 26 / Done 1. [~] pending on-device playtest via the v39 QA panel.

> **v38 (2026-06-30) — QA-fix wave SHIPPED (awaiting playtest).** 10 parallel agents shipped from v36 owner QA: login/landing + fixed logout; HUD overhaul (XP no longer overlaps inventory, persistent chatbox, stat-orb cluster, docked tab strip, blue->brown tone); combat styles (weapon-aware, per-style XP split); 28-prayer roster; 23-spell book (strike/bolt/blast/wave + teleports/alch, rune-gated); dialogue dismiss-on-walk-away + new-chat + Esc; dev toolbox (give/set/spawn/teleport); full dev rune+gear kit; +70 item tier ladder (Ferrite->Sunsteel); minimap (compass/click-to-walk/zoom/blips). Integrated (main.js+hud.js wiring), node --check clean, deployed-URL verified (modules 200) at https://eldermoor.vercel.app . [~] pending on-device playtest via the v38 in-game QA panel (auto-syncs to the dashboard). Character art (avatar/creator/mage-studio, src/char/*) owned by a SEPARATE chat.

_Snapshot 2026-06-30. Honest counts; integrated ≠ playtested._

## Headline
- **Overall:** ~24% complete (integrated + boot-verified).
- **Live version:** v36.

## Features
| State | Count | Definition |
|---|---|---|
| Integrated + boot-verified | ~47 | code merged into the build, boots clean (zero console errors) |
| **Live-playtested** | **~6** | actually clicked-through in a foreground browser (walking, camera, HUD chrome, chat, inventory render, stats) |
| Remaining | ~44 | not started or data-only |
| **Total target** | ~90 | feature-level rollup of the ~645 PARITY_AUDIT items |

## Audit (granular tests, PARITY_AUDIT.md)
- Total itemised gaps: ~645.
- Verified done: ~22. Partial/integrated-pending-playtest: ~120. Remaining: ~500.

## Build/codebase
- Client modules: ~37 `src/*.js`. Data files: 11 `assets/data/*.json`.
- Versions shipped this session: v15 → v27 (each boot-verified before deploy). v24 = ranged combat + magic-cast;
  v25 = prayer points + Make-X smith/cook + quest accept/complete + action SFX + apostrophe-delimiter fix;
  v26 = lesson gating (`gating.js`); v27 = single 0.6s global game tick (`tick.js`, combat + skilling share it);
  v28 = Mobile Sprint 1A — responsive UI framework (`mobile-ui.js`: orientation, single-panel docking, bottom-sheet
  dialogue, chat collapse, objective auto-hide, touch targets, haptics, character name entry);
  v29 = 1A QA fixes — dedicated landscape layout, top-right HUD cluster de-overlap, responsive panel sizing,
  inventory long-press context menu (mobile), objective persists on entry;
  v30 = test infrastructure — dev test character (all-99 + combat kit each load) + in-game QA checklist panel
  (Pass/Fail/Skip + notes per item, one-tap Copy/Share/Download report). Not a player feature.
  v31 = live QA sync backend — api/qa.js (Vercel KV) + QA panel auto-POST (needs KV connected);
  v32 = QA findability — version on QA button + XP counter de-overlap;
  v33 = character-creator live 2D paper-doll preview;
  v34 = mobile 1A QA round 3 — inventory tap action, equip-slot display fix, compact dialogue dock, objective
  recall pill, collapsible tabs, landscape tab-bar fix.
- Mobile Sprint plan: 1A framework (v28, done/await QA) → 1B inventory+equipment → 1C combat loop →
  1D tutorial progression → 1E audio/settings/prayer/save/logout. Each gated by Josh's on-device QA.
- Tooling: policy-driven Claude Code config installed (commit 3a9fe8d) — `.claude/settings.json` +
  SessionStart/PreToolUse/PostToolUse/Stop hooks, validated against simulated payloads.

## Process
- Build waves run via parallel subagents (Sonnet = feature code, Haiku = docs/QA/data, Opus = orchestrate
  + integrate). Per-agent model set via the Agent tool `model` param (runtime model not independently
  verifiable from the session).
- **Live fleet visibility:** `dashboard.html` is now a KANBAN (To Do / Building / Review / Shipped / Done),
  polling the prod KV endpoint; agents report via `node tools/progress.js set <id> <status>`. New `shipped`
  status = boot-verified + deployed, awaiting human playtest (distinct from `done`). In-session, the
  Workflow tool's `/workflows` view is the zero-setup live tree.
- **v37 P1 render wave:** explicit material roles, terrain map-null, water renderOrder, roof wiring (dormant
  until a roofed asset), sky tone-map, asymptotic altar-glow, loader counter — shipped via the parallel fleet
  (builder-A/B/C + orchestrator), boot-verified clean. `[~]` pending Josh's visual playtest.
- Every integration gated by: `node --check` → real-browser boot (cache-free copy / deployed URL) → deploy.

## Known risk
- ~32 features are "integrated" but **unproven in actual play** — the dominant gap between % integrated and %
  truly done. Closing it requires a human/real-browser playtest pass (see NEXT_TASKS #10).
</content>
