# PROJECT HANDOFF — Eldermoor

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

**Version (live):** v36 · **Live link:** https://eldermoor.vercel.app (production auto-deploys from `claude/modular-v23`)
**Working copy:** v36 (worn gear on avatar all-slots + v35-QA fixes: panel translucency, name 2–12, objective advance) on `claude/modular-v23`.
**Test tools (v30):** dev test character (`devtest.js`, all-99 + combat kit each load) and an in-game QA
panel (`qa-panel.js` + `assets/data/qa.json`) — tester checks Pass/Fail/Skip + notes per item and sends back
ONE Copy/Share/Download report. Refresh `qa.json` every release. v31 adds the FIRST backend — `api/qa.js` + Vercel KV — so the QA
panel auto-syncs results (dev reads GET /api/qa); needs Josh to connect a Vercel KV store once
(HUMAN_ACTIONS.md). Milestone 1B remains ON HOLD pending 1A QA.
**Overall progress:** ~24% (features integrated + boot-verified; **~6 features live-playtested**).
**Date:** 2026-06-30.
**Production note:** v26–v28 build as Vercel **previews**; production-alias promotion (`vercel --prod`)
is done outside the sandbox. On-device QA of v24–v28 is pending (see HUMAN_ACTIONS.md).
**Active sprint:** Mobile Playability (P0). Milestone 1A — v28 shipped, failed Josh's QA; **v29 addresses
the QA items** (landscape layout, top-right HUD de-overlap, responsive panel sizing, inventory long-press
context menu, objective persistence). Boot-verified by a 26/26 headless UI test; **awaiting Josh's on-device
re-QA before Milestone 1B.** **v35 resolves the parameterized-model limitation:** creator part shapes +
colours + body type now render on the in-world body via the procedural avatar (`avatar.js`), with worn
weapon/shield in the hands; a Blender-authored multi-part model can replace it later behind the same data contract.

**P1 render-correctness wave (shipped, boot-verified, deployed; playtest pending):** all 8 P1 fixes landed
via the parallel fleet (engine.js material-roles/terrain/water/roof/sky, player.js glow+roof wiring,
loaders.js load-counter; npc.js + flat-shading verified no-ops). Boot-verified clean on the deployed build.
Marked `shipped` on the board (awaiting Josh's on-device playtest = the gate to `done`).

**Fleet visibility (new):** a **live KANBAN dashboard** now exists — `dashboard.html` (To Do / Building /
Review / Shipped / Done) polls the prod KV endpoint, names the real bottleneck (human playtest), and has a
"Needs my eyes" filter. New `shipped` status = boot-verified + deployed, awaiting playtest. It also polls `progress.json`
(local single-writer board) every 2s and `/api/progress` (Vercel KV, mirrors `api/qa.js`) when connected, so
build status is watchable in-session and on any device. Agents/orchestrator report via
`node tools/progress.js set <id> <status> [note] --agent NAME`. Statuses: queued/building/review/requeue/done/
blocked/failed. Verified live in the preview (status flip → board updated with no reload). Not yet deployed to prod.

> **Honesty note:** "Completed" below means *integrated into the build + boot-verified in a headless
> browser (no console errors)*. It does **not** mean manually playtested in the 3D scene — that gate is
> still pending for almost everything, because this environment can't run live 3D-interaction tests.

---

## 1. Current architecture

- **Client:** vanilla ES-module web app. `index.html` is a thin shell (`index.modular.html` copied to it on
  deploy) that loads Three.js **r128** + GLTFLoader from CDN as globals, then `<script type="module"
  src="src/main.js">`. `main.js` imports ~37 modules, exposes shared `window.EM*` globals, inits every
  feature module, and runs the rAF loop.
- **Module pattern:** each feature is one `src/*.js` file that exports an `init*()` and self-registers on a
  `window.EM*` global (e.g. `EMHUD`, `EMCOMBAT`, `EMBANK`). Cross-module communication is via these globals
  + DOM CustomEvents (`em-data-ready`, `em-lesson`, `em-walk`, `em-appearance`), NOT tight imports — so
  modules degrade gracefully if a dependency isn't ready.
- **HUD tab system:** `hud.js` renders the tab cluster; a registry hook (`window.EMTABS[tabId]`) lets any
  module own a tab's panel without editing `hud.js`. 14 tab buttons; 10 tabs have registered content.
- **Data-driven:** content lives in `assets/data/*.json` (items, skills, lessons, dialogue, quests, emotes,
  music, settings, appearance, combat, examine), fetched by `loaders.js` into `window.EMDATA`.
- **3D assets:** Blender-authored glTF (`assets/*.glb`) + collider/manifest JSON sidecars, authored by
  `build_kit.py`. Tiling textures from `make_textures.py`.
- **Deploy:** `cp index.modular.html index.html && vercel deploy --prod --yes`. **Rollback:** `cp
  eldermoor_client.html index.html && vercel deploy --prod --yes` (the frozen v17 monolith).
- **Agent studio:** `.claude/agents/eldermoor-*.md` (pm, builder, qa, auditor, content, story, modeler) —
  reusable per-project subagents.

---

## 2. File structure

```
index.html                 # deploy entry (= copy of index.modular.html)
index.modular.html         # the modular shell (canonical source)
eldermoor_client.html      # FROZEN v17 monolith — rollback only
src/
  main.js                  # entry: imports/wires all modules, exposes EM* globals, runs the loop
  engine.js                # renderer, scene, camera, lights, sky, fog, tiling textures, dressMaterials
  world.js                 # bounds, colliders, A* pathfinding, scatter, scenery, fixtures, mobs
  player.js                # player group, rig, movement (followPath/arrive/simStep), run energy
  npc.js                   # NPC roster, proxies, nameplates, wander, speech bubbles
  dialogue.js              # #dlg box: flat lines + branching tree runner (runDialogue)
  interact.js              # pickAt / worldClick / openMenu / examine / hover action-text / mob Attack
  input.js                 # camera (orbit/pinch/wheel + arrow/WASD/MMB keys)
  loaders.js               # glTF + JSON loading → window.EMDATA
  hud.js                   # the OSRS HUD: 14 tabs, chat (channels), minimap, inventory/stats/combat
  tooltip.js  orbs.js  xpcounter.js  worldmap.js  minimap-nav.js  minimap-render.js
  emotes.js  music-tab.js  social.js  prayer-tab.js  magic-tab.js  quests-tab.js
  settings-tab.js  equipment.js  equipment-tab.js  inventory-ops.js  skill-guide.js
  combat.js  skilling.js  save.js  audio.js  bank.js  logout-tab.js  lessons.js
  charcreate.js  appearance-apply.js  make-interface.js
assets/
  *.glb                    # world, player, kit pieces, NPCs
  *.colliders.json *.manifest.json
  data/*.json              # items, skills, lessons, dialogue, quests, emotes, music, settings,
                           # appearance, combat, examine
textures/*.png
build_kit.py build_eldermoor.py make_textures.py editor.html
docs/                      # MMORPG bible (00_INDEX = TOC)
CLAUDE.md  HANDOFF.md  ROADMAP.md  PARITY_AUDIT.md  ASSET_MANIFEST.md  BUILD_QUEUE.md
ART_SPEC.md  MODELING_SPEC.md  SKILL.md  README.md
.claude/agents/eldermoor-*.md
```

---

## 3. Completed features (integrated + boot-verified; playtest pending unless noted)

**Genuinely playable (verified earlier, foreground browser):**
- Walking / tap-to-move with A* pathfinding; static + dynamic collision (stuck-NPC bug fixed).
- Camera: orbit drag, pinch/wheel zoom, arrow/WASD + middle-mouse rotate.
- HUD chrome: 14 tabs, chatbox with working channel filters, live minimap, 28-slot inventory, 23-skill
  stats (total 32), XP-drop animation.

**Integrated + boot-verified (NOT yet playtested in 3D):**
- Render-correctness pass (the inside/outside glitch fixes: terrain map, water depthWrite, nameplate
  occlusion, character shading, sky tone-map, loader-waits-for-all).
- Scenery interaction (trees/rocks/bushes right-click + examine); data-driven examine text.
- Examine routed to chat (not a modal).
- Status orbs (HP/Prayer/Run/Spec) + run energy + run toggle; HP orb reads live combat HP.
- Hover action-text + cursor; tooltips.
- World map overlay; minimap terrain render + click-to-walk.
- XP counter.
- Procedural audio engine (UI click, level-up, ambient) — original, no copyrighted music.
- Save/load (localStorage): skills, inventory, settings, tutorial progress; autosave.
- Branching dialogue runner wired to NPC talk (consumes `dialogue.json` trees).
- NPC overhead speech bubbles.
- Inventory right-click ops (Use/Wield/Wear/Eat/Drop/Examine).
- Equipment system + Equipment tab (worn slots, stats, unequip).
- Prayer tab (8 prayers, level-gated), Magic tab (12 spells, rune/level-gated), Quests tab (from
  `quests.json`, red/yellow/green, QP total), Settings tab (4 groups, persisted), Emotes tab + FAB.
- Friends / Ignore / Account tabs; Music tab + playback; Logout tab + title screen.
- Skilling engine (chop/mine/fish/light/cook/smelt/smith) + in-world fixtures (fishing-spot/fire/
  furnace/anvil); resource-node depletion + respawn.
- Combat engine (tick-based, accuracy/max-hit, hitsplats, HP bars, player HP + death/respawn +
  auto-retaliate); attackable giant-rat mob + Attack verb. **Ranged (bow+arrows, projectile, max range,
  melee fallback) and magic-cast on mobs (consume runes, bolt projectile) added v24.**
- Banking interface (Bank of Eldermoor: deposit/withdraw, 1/5/10/X/All, deposit-inventory/worn).
- Tutorial L0–L17 state machine (objective + gating + handoff scaffolding, predicate-driven).
- Character creator (L0 gate) + appearance-apply to the player model.
- Make-X production interface (reusable), **wired to smithing (anvil) + cooking (range) (v25).**
- **Prayer points (v25):** pool = Prayer level, activation drain, bury-bones for XP.
- **Quest accept → track → complete flow + QP increment (v25)** (reward screen still pending).
- **Action SFX coverage (v25):** chop/mine/fish/smith/hit/eat cues via `sfx-actions.js`.
- **Lesson gating (v26):** `src/gating.js` / `window.EMGATE` — gates skill/combat/bank actions + movement
  regions by tutorial step with OSRS-style nudges; anti-brick (open while instructors/zones are absent).
- **Single 0.6s global game tick (v27):** `src/tick.js` / `window.EMTICK` — one shared clock; combat +
  skilling subscribe to it instead of each running its own `setInterval` (OSRS one-tick model).

**Count:** ~46 feature-level items integrated.

**Tooling (not a game feature):** policy-driven Claude Code config (commit 3a9fe8d) — `.claude/settings.json`
+ SessionStart/PreToolUse/PostToolUse/Stop hooks (validated). See CLAUDE.md "EXECUTION POLICY".

---

## 4. Incomplete / missing features (~44)

- **Trading** (player-to-player) — not started.
- **Multiplayer presence** (other players, white dots, PvP-off) — not started.
- **World build-out:** only the chapel grounds zone exists. Missing 9 of 10 zones (spawn house, full
  survival area, cook's house, quest house, mine/underground, combat ring, bank building, wizard area,
  departure dock) and the instructor roster placed in-world (data authored, NPCs not placed).
- **The gated lesson chain actually driving gameplay** (state machine exists; doors/areas not yet locked;
  grants/handoffs not fully wired to in-world actions).
- **Equipment on the 3D avatar** (worn gear doesn't render on the model).
- **Banking PIN, tabs, search, placeholders, notes.**
- **Quest reward screen** (accept/track/complete flow + QP shipped v25; reward screen still missing).
- **Audio: real per-zone music** (action SFX shipped v25; per-zone music still missing).
- **Accessibility, i18n, world-map POI search, collection log / diaries / GE** (future scope).
- **Mobile-specific HUD reflow.**
- Full list with pass/fail tests: `PARITY_AUDIT.md` (~645 itemised gaps); phase-level: `ROADMAP.md`.

---

## 5. Known bugs

1. **[RESOLVED — shipped v23, follow-up v25] Apostrophe-in-string break.** A smart-quote normalization pass
   converted curly apostrophes inside single-quoted strings to unescaped `'`, breaking several core modules
   (browser error `Unexpected identifier 's'`). Escaped/rephrased across the affected files; cache-free boot
   verified clean and shipped v23. v25 fixed the inverse case — invalid `\'` backslash-apostrophe delimiters
   in `sfx-actions.js` + `skilling.js`. No longer blocking.
2. **Verification limit (not a code bug):** the headless preview caches ES-module dependencies, so a
   `?cachebuster` on one module doesn't refresh its static imports — making in-tool boot re-verification
   unreliable after edits. Mitigation: stop/restart the preview server and hard-navigate, or verify on the
   deployed URL.
3. **Combat cadence ambiguity:** clock ticks at 600ms but player swing uses a 4-tick weapon speed (~2.4s)
   — confirm intended.
4. **Cook burn double-roll:** success roll then a separate burn roll (~14% effective) — confirm intended.
5. **No live-playtest confirmation:** every "integrated" feature above is unproven in actual 3D play.
6. **Item `value`/`weight`/op-set** present but not all systems consume them; `coins`/`burnt-shrimp` lack a
   `Use` op (intentional debate).

---

## 6. Current blockers

- **B1 (RESOLVED):** the apostrophe-in-string break — fixed and shipped v23; v25 cleared a follow-up `\'`
  delimiter case. No longer blocking.
- **B2 (standing):** no live 3D-interaction testing in this environment → features can't be promoted from
  "integrated" to "complete" without a human (or a real-browser session) clicking through them.

---

## 7. Outstanding backlog (sources of truth)

- `ROADMAP.md` — phases P0–P10 + lessons L0–L17, honest `[ ]/[~]/[x]` status.
- `PARITY_AUDIT.md` — ~645 granular per-feature pass/fail tests (the real punch-list).
- `BUILD_QUEUE.md` — the fleet FIFO + reviewer re-queue.
- `ASSET_MANIFEST.md` — every 3D asset needed (zones, buildings, NPCs, fixtures) with status.

Near-term priority order: **CHECKPOINT (awaiting sprint approval)** → promote v27 to production +
browser-playtest v24–v27 → render worn gear on the avatar → bank depth + quest reward screen → build out
zones/instructors (assets, which also activates lesson gating) → per-zone music / polish.

---

## 8. Exact next task

**Status: Mobile Sprint 1 — Milestone 1A v29 (QA-fix round 2) shipped to preview; awaiting on-device re-QA.**
v28 failed QA (landscape/HUD-overlap/panel-clip/inventory-touch/objective); v29 fixes those.
Next milestone (1B) does NOT start until Josh approves 1A on a real phone.

**1A delivered (v28):** `src/mobile-ui.js` (`window.EMUI`/`window.EMHAPTIC`) — orientation detection,
single-panel docking, bottom-sheet dialogue, chat collapse, objective auto-hide, ≥44px touch targets,
haptics; stray emote FAB removed (`emotes.js`); character name entry + validation (`charcreate.js`);
`viewport-fit=cover`. Boot-verified by a headless-Chromium UI harness (19/19). Gameplay untouched.

**When 1A is approved, Milestone 1B = Inventory + Equipment mobile interactions** (tap/long-press
use/wield/wear/drop/examine on touch; proper touch targets in the inv/equip panels). Single-agent
(shared HUD panel render).

--- prior checkpoint context retained below ---

**P0 core plumbing (lesson gating v26, 0.6s tick v27) is committed/pushed.**

Two non-coding gates remain before features can be promoted "done":
1. **Promote v27 to production** — `cp index.modular.html index.html && vercel deploy --prod --yes`
   (run outside the sandbox; GitHub pushes here only build previews).
2. **Browser playtest** v24–v27 on the deployed URL (combat/magic/ranged, prayer, Make-X, quests, SFX,
   lesson nudges, and that all actions beat on the single 0.6s tick). Demote anything that doesn't fire in 3D.

When the next sprint is approved, the recommended first chunk is **Worn gear on the 3D avatar**
(`appearance-apply.js`) — isolated, parallelizable, no shared control-flow edits.
</content>
