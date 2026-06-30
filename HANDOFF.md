# HANDOFF.md — Eldermoor

Session state for the next agent/session. Pairs with CLAUDE.md.

_Last updated: 2026-06-29_

---

## ⭐ START HERE (read this first)

**What this is:** Eldermoor — an original web game built to **OSRS Tutorial Island parity**
(style + mechanics). The playable client is `eldermoor_client.html` (Three.js, vanilla JS, no
build step) loading Blender-authored glTF from `assets/` + content JSON from `assets/data/`.

**▶ PLAYABLE LINK (live):** **https://eldermoor.vercel.app** — currently **v22** (integrated).
- ⚠️ **Open it in a REAL browser tab (Chrome/Safari), NOT the Claude Code preview panel.** The
  embedded preview sandboxes `fetch`/asset loading, so the world + data won't load there (it'll
  hang on "Entering the Chapel…" + "HUD data failed to load"). On the real https link everything loads.
- Sanity check you're on the live build: chatbox line 1 = "Welcome to Eldermoor (v22)", Stats tab total level = 32.

**What works right now (v14):** spawn in the chapel grounds; tap-to-walk with **A* pathfinding**;
tap NPCs (Brother Aldric + wandering villagers) → dialogue; long-press = right-click menu
(Talk-to/Examine/Walk here); walk out the gate into a **procedural forest** + past a **pond**
(surrounding sea, heightmap terrain, tile-blended ground); **altar** → real Prayer XP; full
**OSRS HUD** (8 tabs, 28-slot inventory, 23 skills w/ real XP curve, chatbox, live minimap).

**Current focus / NEXT:** wire the authored content into live gameplay —
1. **Dialogue:** `assets/data/dialogue.json` (14 NPC branching trees) → replace the inline NPC
   `lines` in the client's `NPCS` array with a dialogue-tree runner (options/branches/portraits).
2. **Lesson state machine (Phase F):** `assets/data/lessons.json` (L0–L17) → a gated `progress`
   driver (prereq → steps → grants/XP → unlock next), with the **0.6s tick** (E1).
3. Then more zones/buildings (Phase C), the remaining systems (E), polish, audio (I).
- ⚠️ **Known issue:** item ids differ in case across data files (items.json kebab `bronze-axe`
  vs lessons.json snake `bronze_axe`). Normalize when wiring lessons.

**How to build / deploy:**
- Blender (assets): `"C:/Program Files/Blender Foundation/Blender 4.3/blender.exe" --background --python build_kit.py -- --scene grounds --export assets/world.glb` (emits `world.colliders.json` sidecar too). Scenes: `grounds`, `chapel`, `lineup`, `player`, `npc:<id>`, `kit:<tree|bush|rock>`.
- Textures: `python make_textures.py` → `textures/*.png`.
- Deploy (v18+, MODULAR): edit `src/*.js` + the shell, then `cp index.modular.html index.html && vercel deploy --prod --yes` (CLI authed as nighthawk909; aliases to eldermoor.vercel.app). Bump the `v##` tag in `src/hud.js` (welcome line) + `index.modular.html` (#hud). **Rollback to the pre-split monolith:** `cp eldermoor_client.html index.html && vercel deploy --prod --yes`.
- ⚙️ **The client is now MODULAR** (`src/*.js`, ~35 modules + `index.modular.html` shell, adopted v18, verified live; v20 integrated ~26 feature modules into `src/main.js`, boot-clean). `eldermoor_client.html` is the frozen v17 monolith kept only as rollback. Per-module map + the build fleet are in `BUILD_QUEUE.md`.
- Verify headless: a local `python -m http.server` + the Claude_Preview tools (`preview_eval`) —
  NOTE the preview tab runs hidden so rAF/WebGL pause (screenshots/animation won't render there);
  call `scene.updateMatrixWorld(true)` before headless raycast tests. Verify game logic via eval,
  not screenshots.

**Key files:** `eldermoor_client.html` (THE game), `build_kit.py` (asset/world forge + collider
export), `make_textures.py`, `editor.html` (map editor → world manifest), `assets/` (glb + data +
kit), **`ROADMAP.md`** (the master phased checklist P0–P10 + lessons L0–L17 — done vs outstanding),
**`PARITY_AUDIT.md`** (the granular ~250-item per-feature test sheet), `ASSET_MANIFEST.md` (assets),
`CLAUDE.md` (operating law + doc map).
> **Docs were consolidated 2026-06-29** (they were duplicative + had no clean checklist): BUILD_PLAN.md
> + TUTORIAL_ISLAND_PARITY.md → **ROADMAP.md**; MANIFEST.md → ASSET_MANIFEST.md §9; KICKOFF.md retired.

---

## Changelog (latest)

- **v22 — integrated, boot-verified clean: Bank of Eldermoor interface (deposit/withdraw/quantity dialogue), logout tab + title screen, attackable giant-rat mob + Attack verb wired to the combat engine, HP orb now shows live combat HP, NPC talk now routes to the authored branching dialogue trees. Live in-world playtest pending.**

- **v21 — integrated the second feature wave into src/main.js, boot-verified clean (zero console errors):** tutorial L0–L17 state machine, character creator (L0 gate), music tab + playback, Friends/Ignore/Account tabs (now 14 HUD tabs), combat player-HP + death/respawn + auto-retaliate, skilling fixtures (fishing/fire/furnace/anvil), data-driven examine, minimap terrain render, skill-guide popups + XP tooltips. Live in-world playtest still pending.

- **2026-06-29 — modular client + ~26 feature modules integrated (client v20).** The 800-line monolith
  is fully split into `src/*.js` (~35 modules now) behind the `index.modular.html` shell. v20 then
  **integrated ~26 new feature modules into `src/main.js`**, all **boot-verified clean in a real browser
  (zero console errors)**: HUD **status orbs** (HP/Prayer/Run/Spec), **run energy**, **hover action-text**,
  **world map**, **XP counter**, **procedural audio**, **save/load** (localStorage), a **branching dialogue
  runner**, **NPC speech bubbles**, **scene fog**, **resource-node depletion**, and **functional tabs** —
  Inventory ops (right-click), Equipment (system + tab), Prayer, Magic, Quests, Settings, Emotes, plus the
  **skilling + combat engines**. Deploy (modular): `cp index.modular.html index.html && vercel deploy --prod
  --yes`; rollback: `cp eldermoor_client.html index.html && vercel deploy --prod --yes`. **HONEST STATUS:**
  the modules are *integrated and boot-clean* — but **live 3D-interaction playtesting (clicking each feature
  in-world) is still pending**, so ROADMAP/BUILD_QUEUE items these modules touch are marked done *at the
  module level only*, awaiting in-browser feature playtests. NEXT: playtest each integrated feature on the
  live link, fix what doesn't actually fire, then resume the ROADMAP P-list.

- **2026-06-29 — persistent agent studio + parallel build/QA fleet (client v17).** Stood up a reusable,
  version-controlled **agent studio** in `.claude/agents/`: `eldermoor-pm` (orchestrate/groom the queue),
  `eldermoor-builder` (one surgical chunk, self-syntax-checks), `eldermoor-qa` (deterministic-check-first
  review → REQUEUE), `eldermoor-auditor` (OSRS gap hunting), `eldermoor-content` (data JSON), `eldermoor-story`
  (lore/dialogue), `eldermoor-modeler` (Blender glTF). **They load at session start — available as `subagent_type`s
  in any future chat opened in this repo, no re-explaining.** Added `BUILD_QUEUE.md` (the fleet's FIFO). Ran the
  first cycle: shipped **v17** (scenery right-click + examine-to-chat), authored the full data layer in parallel
  (`quests.json`, `emotes.json`, `music.json`, `settings.json`, `appearance.json`; reconciled items/lessons).
  QA verified v17 clean (a "syntax blocker" was a false positive — curly ’ is valid; lesson baked into the QA
  agent: always `node`-syntax-check, never eyeball). Re-queued C11 (scenery off-centre tap) + C12 (item Use ops).
  **Q0 module split is in flight — the unlock for fanning out one builder per module.** NEXT: verify Q0 (needs a
  real-browser load to confirm), adopt it, then run builders C3–C10 with QA gating each.

- **2026-06-29 — render-correctness pass + audit wave 2 (client v16).** (1) **P1 render fixes** (subagent,
  reviewed + verified): nulled the stray terrain texture, water `depthWrite:false` (no more floor holes),
  nameplate `depthTest:true` (names no longer render through walls), `flatShading` opt-out for character
  meshes (smooth faces restored), sky `toneMapped:false`, terrain `FrontSide`, and the loader now waits for
  ALL 8 assets (no scenery/NPC pop-in). Deployed v16. (2) **Audit wave 2** — 4 more parallel OSRS-expert
  critics took `PARITY_AUDIT.md` from ~250 to **~500 itemised gaps** (new §26 items/Use-on/banking, §27
  combat & skilling mechanics, §28 social/account/music/pre-game, §29 render/animation/audio/mobile/feel).
  Surfaced a real DATA BUG (XP+5): `skills.json` and `lessons.json` award conflicting XP. NEXT: keep
  cycling audit waves until one returns mostly empty; serialized client builders down the ROADMAP P-list
  (P2 interaction next) + parallel data/asset builders on separate files.

- **2026-06-29 — parity audit + stuck-NPC fix + doc consolidation (client v15).**
  (1) **Bug fix:** the player could get permanently glued to a wandering NPC (asymmetric collision —
  NPCs only kept 0.6 clear but the player's body-block radius is 0.74, so an NPC could overlap you and
  every escape tile stayed blocked). Fixed with a `moveBlocked` escape hatch (always allows a step that
  increases distance from an overlapping NPC) + raised the NPC keep-clear to 0.92; also guarded a
  pinch-zoom divide-by-zero that could NaN the camera to black. Deployed v15.
  (2) **PARITY_AUDIT.md** authored — a ~250-item, no-stone-unturned punch-list of every broken/missing
  micro-interaction (every HUD tab, minimap, camera, overworld interaction, chat, rooms, plus a
  code-level defect register), each written as a pass/fail test. Built via 1 authored pass + 4 parallel
  OSRS-expert critics. Root-caused the "inside/outside texture glitch": nameplates render through walls
  (`depthTest:false`), water `depthWrite` punches holes in the floor, terrain multiplies a stray texture.
  (3) **Docs consolidated** — BUILD_PLAN + TUTORIAL_ISLAND_PARITY → **ROADMAP.md** (one master phased
  checklist, honest `[ ]/[~]/[x]` status); MANIFEST → ASSET_MANIFEST §9; KICKOFF retired. CLAUDE.md got
  a doc map. NEXT: P1 render-correctness pass (kills the glitch on sight), then P2 interaction layer.

- **2026-06-29 — game content data + OSRS HUD (client v14).** Subagent fan-out authored the
  tutorial **content as data**: `assets/data/items.json` (31 items), `dialogue.json` (14 NPC
  branching trees), `lessons.json` (L0–L17 gated chain), `skills.json` (23 skills + the real
  99-level OSRS XP table + per-action tutorial XP). Built + integrated an **OSRS-style HUD**
  (`EMHUD`, appended to `eldermoor_client.html`): brown-stone skin, 8-tab sidebar (Inventory/
  Stats/Equipment/Combat/Prayer/Magic/Quests/Settings), 28-slot inventory, 23-skill stats grid
  with correct level math (HP starts L10 → total 32), chatbox, XP-drop animation, and a live
  **minimap** (player + NPC dots, fed from the game loop). Altar now grants real **Prayer XP**.
  Verified headless (tabs/slots/skills/xp/give all work) + deployed. KNOWN: item ids differ in
  case across data files (items kebab `bronze-axe` vs lessons snake `bronze_axe`) — reconcile
  when wiring lessons. NEXT: wire dialogue.json into NPC talk + the lesson state machine (F) +
  tick model (E1), then place more zones/buildings.

---

## Status

**The project pivoted to a real game pipeline.** The playable client is now the web
(`eldermoor_client.html`, Three.js) loading **Blender-authored glTF** assets — this is the
source of truth for "what you see" (CLAUDE.md §3/§5/§6). The end-to-end bridge is **proven and
verified in-browser**: `build_kit.py → assets/chapel.glb → eldermoor_client.html`, with seamless
tiling brick/plank textures. The Chapel (room + altar/organ/banners + monk NPC) renders cleanly
in the browser at OSRS-grade fidelity.

Art direction is locked. The **Adventurer** hero (`build_eldermoor.py`) remains a separate
character-asset track (Cycles stills; not yet ported into the client). Full-quality hero GPU
renders run clean here: **1800×2250 @ 384 spp, ~2m34s on OptiX**. Repo:
`github.com/nighthawk909/eldermoor` (private), `render-smoke` CI.

There is a full **MMORPG Bible in `docs/`** (`docs/00_INDEX.md` = master TOC) and a
**Tutorial Island parity manifest** (`TUTORIAL_ISLAND_PARITY.md`, = docs/91) — the gap list +
chunked build plan to reach OSRS parity. Read both before continuing.

## Changelog

- **2026-06-28 — water + shoreline (client v13).** Phase A5. Added a **pond** in the survival-area
  land (terrain basin via `_terr_h`/POND + sand-shore vertex colours + water-surface plane +
  collider so you can't walk in), a **surrounding sea** plane (shows beyond the island edges), and
  **animated water** (client scrolls `TEX.water.offset`); water material translucent. Verified via
  render (pond + sea + island read) + clean client load. **Phase A (world system) now essentially
  complete.** NEXT: Phase B building pack + Phase C — place a 2nd building (spawn house) and build
  the survival zone at the pond, by manifest.

- **2026-06-28 — heightmap terrain + vertex-colour tile blending (client v12).** Phase A2+A3.
  Replaced the flat grass slab with a faceted **vertex-coloured heightmap terrain mesh**
  (`build_terrain`): flat (y=0) across the playable rectangle so buildings/player sit level,
  rolling **hills rise beyond the edges** as backdrop; per-vertex colour blends grass tones,
  dirt patches, the **dirt path stripe**, and rocky hilltops (authentic OSRS flat-shaded coloured
  terrain — no texture needed). Material uses a Blender VertexColor node → exports COLOR_0; client
  sets `material.vertexColors=true` for `terrain`. Verified via Cycles render (path + blend show)
  and clean in-client load. Running as an autonomous `/loop` through BUILD_PLAN.md. NEXT: A5 water
  + shoreline, then compose real zones (survival area + pond) by manifest.

- **2026-06-28 — manifest-driven world + PROCEDURAL SCATTER (client v10→v11).** Phase A1+A4.
  (v10) The world manifest now **drives the world**: trees are instanced in-client from a reusable
  `assets/kit/tree.glb` at each placement the manifest lists (not baked into world.glb). (v11)
  Added **procedural scatter** — manifest `scatter` regions `{type,x0..z1,count,seed,spacing,sMin/sMax,exclude}`
  deterministically fill an area with kit pieces (added `bush.glb`/`rock.glb`), collision-aware +
  min-spacing + path-excluded. Result: open land south of the chapel is now a **dense forest/meadow
  (~150 instances) from 3 lines of data**. `build_grounds` enlarged (bound to z=60, x±26); trees no
  longer baked. Verified: 152 colliders, all 3 kit pieces instanced, no errors, all pathable.
  This is the "paint a region → it fills in" system. NEXT: A2 heightmap terrain + A3 tile blending
  (relief + ground transitions) for the next detail jump, then compose real zones by manifest.

- **2026-06-28 — MAP EDITOR + world-manifest format (`editor.html`).** Built a browser map editor
  (the "zoom out and drop everything" tool): top-down pan/zoom canvas, paint terrain
  (grass/dirt/sand/water on a 2u grid), drop buildings/props(tree/bush/rock/sign)/NPCs/spawn,
  draw dirt paths, rotate, erase, import/export a **world manifest JSON**. Preloads the current
  Chapel Grounds. Deployed at `/editor.html`. Verified: place + paint update the manifest; JSON
  round-trips. This is the design tool that makes the island scale by DATA. NEXT: (a) game client
  consumes the manifest — instances a library of kit-piece glbs (tree/house/...) + procedural
  nature scatter + heightmap terrain from the tile map; (b) **audio system** — original per-zone
  music + action SFX via Web Audio (Claude-built, zone-triggered crossfade).

- **2026-06-28 — ground textures + courtyard gate + z-fight fix (client v9).** Playtest fixes:
  (1) **z-fighting** — grass terrain top dropped to y=-0.05 (below the chapel plank floor at 0)
  so they no longer flicker. (2) **locked in** — cut a gate gap in the south fence + dirt path
  through it + extended walkable `bound` to z=34 and scattered trees → you can leave the courtyard
  into open land. (3) **detail** — added seamless `grass/dirt/sand/water` tiling textures
  (`make_textures.py` `_field()` generator) applied in-client by material name. Verified: walk
  out the gate to open land; textures serve. NEXT (the 10/10 plan): heightmap terrain + tile
  blending + density scatter + asset packs (nature/building/prop) + a **world manifest** that
  composes the whole island from data. LOD honestly ~3/10 now; the systems above take it to 8-10.

- **2026-06-28 — collision/nav EXPORT pipeline + Chapel goes outdoors (client v8).** The key
  scalability step: the kit now emits a `<world>.colliders.json` beside each glb (wall rects,
  prop circles, walkable `bound`, `spawn`) via `creg_rect/creg_circle/cset_bound/cset_spawn`,
  and the client's `applyColliders()` builds its RECTS/CIRCLES/BOUND/spawn + bakes the A* grid
  from it — **no hand-coded collision per building**. `build_grounds` scene = grass terrain +
  the chapel + a fenced courtyard (enter via the south door) + dirt path + trees, exported to
  `assets/world.glb` (+ sidecar). Client now loads `world.glb`, spawns in the courtyard.
  Verified end-to-end: player walks courtyard → through the door → around the pews → to the
  monk inside (proximity-gated dialogue), all from JSON colliders. NEXT (per Josh): a **world
  manifest** (data-driven placement of terrain chunks + buildings + props + NPCs) so the island
  scales massive by editing data, not code. Terrain should be reusable/tileable + detailed.

- **2026-06-28 — A* pathfinding + chat proximity gate (client v7).** Fixed two playtest issues:
  (1) **player got stuck behind props** — added grid A* pathfinding (`buildGrid`/`astar`/`smooth`,
  cell 0.45, obstacles inflated by RAD) so the player routes *around* walls/pews/props; dynamic
  NPC bodies are treated as obstacles too (A* can still reach the specific NPC you're walking to
  via an `ignoreCol`); on a dynamic block the player **replans** instead of derailing the path.
  (2) **chat opened from anywhere** — root cause was the old stuck-detector calling `arrive()`
  wherever you jammed. Now dialogue only fires through a true **proximity gate**: act only when
  within `talkRange` of the target's *current* position AND with line-of-sight; NPCs are tracked
  live (their `x/z` update as they wander) so the player follows a moving NPC and talks only when
  adjacent. NPCs also **freeze + face you** while in conversation (`chatNpc`). Split colliders
  into static (`CIRCLES`, baked into the path grid) vs dynamic (`NPCCOLS`). Verified: routes
  around pews to a spot behind them; chat stays closed at 5.5u and opens only at 1.2u.

- **2026-06-28 — chapel dressing + working altar + wandering NPCs (client v6).** Addressed
  playtest feedback: (1) **richer interior** — `build_chapel` now adds 6 pews (2 blocks × 3 rows),
  4 stained-glass windows, a lectern, wall sconces, and an altar dais; monk moved beside the
  altar so it's independently tappable; re-exported `chapel.glb`. (2) **working altar** —
  generalized the interaction system to non-NPC `OBJECTS`; tap/long-press the altar → "Pray-at"
  → walk over → prayer message + warm glow pulse (`altarGlow`). (3) **wandering NPCs** — each
  glb NPC with a `wander` radius gets a controller that picks random nearby targets, walks
  (rigged leg/arm swing), pauses, repeats; collider + proxy + nameplate follow it; avoids walls,
  pews, props, other NPCs, and the player. Added pew colliders + a `skip` param to `blocked()`.
  Verified: altar tap→pray→dialogue+glow; all 3 visitors wander ~1u and stay clear of pews.

- **2026-06-28 — variation system + populated Chapel (client v5).** Added palette-driven variety
  to the factory (`SKIN_TONES/HAIR_COLORS/CLOTH_COLORS/LEG_COLORS/BEARDS/BUILDS` + `villager(seed)`)
  — ~37 authored data points yield ≈950k distinct NPCs, zero new geometry per villager (see
  ASSET_MANIFEST §0). Made the **client NPC system data-driven**: NPCS roster entries with a `glb`
  field auto-load, place, get a proxy + nameplate + body collider + dialogue/examine. Exported 3
  chapel visitors (`assets/npcs/{sister,pilgrim1,pilgrim2}.glb`) and placed them — the Chapel is
  now populated with 4 distinct, tappable NPCs (Brother Aldric, Sister Wenna, Pilgrim Joss, Old
  Maven). Verified all 4 register on tap + show correct name in the long-press menu (clickTargets=4).
  Added 3 missing instructor specs (survival/quest/account) to ROSTER. Live on the Vercel link.

- **2026-06-28 — asset factory: one humanoid method → a whole cast.** Generalized the rounded-form
  character into `build_humanoid(spec, pos, prefix)` in `build_kit.py` — spec-driven
  (palette / robe-vs-trousers / hat / hood / beard / cape / shoulder build / hand-prop staff|sword),
  legs+arms still parent to named pivot nodes so every NPC can walk in the client. Added
  `build_rat` (quadruped mob), a `ROSTER` of 7 original-design tutorial NPCs (guide/chef/miner/
  guard/banker/wizard/monk-like), a `lineup` scene + camera, and arg wiring (`--scene lineup`,
  `--scene npc:<id>` to export one NPC, `--scene rat`). Rendered `cast_lineup.png` (GPU) — 7
  distinct silhouettes + the rat, proving the scale-out. NEXT: bump rat to "giant" scale, export
  the roster to `assets/npcs/*.glb`, place a few in the chapel/town, then build the building/prop
  kit out for the tutorial structures (EPIC 4 E1). Contributes EPIC 5 N1 (instructor roster).

- **2026-06-28 — NPC interaction fixed + OSRS context menu (client v3).** Bug: tapping the
  monk walked the player into him forever and (seemingly) never talked. Two real fixes:
  `arrive()` now **halts** at the target (was resuming toward the NPC's tile after talking,
  jamming the collider) + a **stuck-detector** (no infinite walk into any prop). Added the
  **long-press / right-click context menu** (Talk-to / Examine / Walk here) — the OSRS
  interaction model Josh asked for; single-tap = default action (talk/walk). Verified the REAL
  tap path by projecting the monk to screen and calling the click handler: detection returns
  the monk, menu actions fire (Talk-to→walk+talk, Examine→flavor text). KEY GOTCHA for future
  debugging: the hidden preview tab doesn't run the render loop, so object world-matrices never
  update and raycasts miss — call `scene.updateMatrixWorld(true)` before headless raycast tests
  (on a real foregrounded device matrices update every frame, so it Just Works). Added a visible
  `v3` build tag in the HUD so we can confirm Josh isn't on a Safari-cached copy.

- **2026-06-28 — playable hardening: rig walk, mobile interaction, NPC dialogue, collision.**
  Fixed regressions vs. the old `tutorial_island.html` prototype (caught in review):
  (1) **Real walk cycle** — the player avatar was a single fused glb (glided). Re-authored
  `build_player` so legs/arms are parented to named pivot nodes (`legL/legR/armL/armR`,
  hip/shoulder) in `player.glb`; the client now swings them in opposite phase → an actual
  stride (verified by stepping the sim: `legL` oscillates ±0.55, `armR` ±0.33, snaps to rest
  on arrival). (2) **Mobile-first input restored** — replaced OrbitControls with the
  prototype's proven custom follow-camera (1-finger orbit, 2-finger pinch-zoom, tap-to-act);
  taps now register on touch. (3) **NPC clickable + dialogue** — tap the monk (Brother Aldric)
  → walk to him → OSRS-style dialogue box; nameplate sprite overhead. (4) **Haptics**
  (`navigator.vibrate`) on tap/interact. (5) **Click marker** color-coded (yellow walk / cyan
  interact). (6) **Object collision** added earlier this session (altar/organ/candles/monk) so
  you can't stand inside props. Also hardened `setPointerCapture` (try/catch) and split
  sim/render (`simStep`). NOTE: the automated preview tab runs hidden, so rAF/WebGL pause there
  (screenshots/anim can't be seen in-tool) — it runs full-speed foregrounded on a real device.

- **2026-06-28 — the Chapel is now PLAYABLE (first playable build).** Turned
  `eldermoor_client.html` from an orbit-viewer into a space you walk in. Added: a
  Blender-authored **player avatar** (`build_kit.py build_player` → `assets/player.glb`,
  rounded-form adventurer, blue tunic/palette-correct), **click-to-move** (raycast the floor,
  tap vs. drag disambiguated), **wall collision** (interior box clamp) **+ prop collision**
  (altar / pipe-organ rectangles, candle-stand / monk circles, axis-separated slide), a
  **follow camera** (RS-style: locked orbit target lerps to the player, no free-pan, steep
  clamp), a **walk bob**, and a fading **click marker**. Verified in-browser on :8100 —
  walks, collides with walls AND props (fixed: was clipping into the prayer altar), camera
  follows, no console errors. This is the base lessons/gating/UI hang off (EPIC 0 / M4).

- **2026-06-28 — pipeline pivot: web client IS the game.** Closed the two-track gap (offline
  Blender PNGs vs. a disconnected web prototype). Established the real pipeline:
  `build_kit.py → assets/*.glb (glTF export) → eldermoor_client.html (Three.js GLTFLoader) →
  browser`. Now "what I build is what you see." Added: monk NPC (`build_npc_monk`, rounded
  forms per `docs/44_CHARACTER_RIG.md`), `--export` glTF mode (procedural mats swapped for
  solid palette colors on export), `eldermoor_client.html` (loads chapel.glb, flat-shaded,
  OSRS camera), `make_textures.py` (zero-dep seamless brick/plank tiles), world-space tiled
  textures applied by material name. Verified in-browser: chapel renders with brick walls +
  plank floor + altar/banners/organ/monk. `tutorial_island.html` skill-sampler is retired as
  the look target. NEXT: bake remaining material detail, make the client interactive
  (player + click-to-move + collision), then scale the kit to all tutorial rooms + island.

- **2026-06-27 — model revision pass (this machine):** addressed look feedback on the
  hero. (1) **Sword is now gripped** by the near hand — grip/crossguard/pommel aligned to
  a beefed-up fist with a forearm bridging the sleeve cuff (was floating ~0.16 forward of
  the hand). (2) **Boots rebuilt** as rounded shoes — heel + arched sole + tapered upper +
  spherical toe cap + ankle cuff (were flat axis-aligned slabs). (3) **Less blocky overall**
  — global bevel width up (cube 0.012 / cyl 0.008) and segments 2→3. (4) **Clothing defined**
  — rounded leather spaulders, neck collar, sleeve cuffs, flared tunic hem over the belt.
  Output path now resolves relative `--out` against the script folder (was failing to `C:\`).

## Done

- Visual language defined: faceted flat-shading, palette, three-point + AgX-Punchy grade
  (CLAUDE.md §4).
- **Blender → glTF → web-client pipeline** built and verified in-browser (see Changelog).
- **Chapel asset** (`docs/43_ENVIRONMENT_KIT` worked spec) built, rendered, exported to
  `assets/chapel.glb`, loaded in `eldermoor_client.html` with tiling textures.
- **Monk NPC** (`build_npc_monk`) — rounded-form character (not boxes), per `docs/44_CHARACTER_RIG`.
- **Tiling textures** (`make_textures.py`) — brick + plank, zero-dep, applied by material name.
- `build_eldermoor.py` — Adventurer hero (sculpted head, shaped boots, gear), Cycles, GPU. Verified.
- Repo cleanup: 21 duplicate/stale junk files removed (one canonical of each remains).
- Bible (`docs/`) + Tutorial Island parity manifest authored.

## Decided

- **Web-first: the playable client is Three.js; Blender is the asset forge via glTF** (CLAUDE.md §3).
  Native engine port is later/optional, not the path.
- Original-assets IP guardrail (CLAUDE.md §2). Free-now / pay-to-scale cost philosophy.
- Full structural + art + mechanics parity with OSRS Tutorial Island; no compromise tier.

## Locked next-step order (do in sequence; small verified chunks)

1. ~~**Client → real game**~~ ✅ **DONE 2026-06-28** — player avatar (`assets/player.glb`),
   click-to-move, wall + prop collision, follow camera, walk bob all live in
   `eldermoor_client.html`. Verified in-browser. *Next refinement candidates: a fixed ~0.6s
   tick (EPIC 0 F5), pathfinding around props (currently slides/stops, doesn't route), and a
   rigged walk cycle (avatar bobs but limbs are static — glb has no skeleton).*
2. **Scale the kit** — drive every tutorial structure (spawn house, survival area, cook's house,
   mine, combat ring, bank, wizard area) + island terrain through `build_kit.py --export`.
3. **NPC roster + dialogue trees** — instructor chain over the shared character base (`docs/44`, `57`).
4. **Gated lesson flow** — wire L0–L17 (now `ROADMAP.md` P7) with real gating.
5. **UI/HUD parity** — OSRS tabbed interface, chatbox, minimap, right-click menus.
6. **Material/texture deepening + audio + polish.**

> ⚠️ This hand-written order is **superseded by `ROADMAP.md`** (the master phased checklist P0–P10).
> Use ROADMAP for sequencing + status and `PARITY_AUDIT.md` for the granular per-feature tests.

Deferred sub-task: deepen wall/floor material detail (current tiles are good; could bake AO/normal later).

## Regression / QC checklist (run before shipping ANY client change)

Lesson from 2026-06-28: a from-scratch client rewrite silently dropped features the prototype
had. Before calling a client build done, diff it against `tutorial_island.html` (the last-known-good
interaction reference) AND verify on a **foregrounded** browser (the preview tab runs hidden →
rAF/WebGL paused, so it can't confirm motion). Must still pass:

- [ ] **Tap-to-walk** works on **touch** (not just mouse) — tap vs. drag disambiguated.
- [ ] **Tap an NPC** → walks to it → dialogue opens. (NPCs are click targets, not just the floor.)
- [ ] **Click/tile marker** visible at the tap point.
- [ ] **Haptic** buzz on tap/interact (`navigator.vibrate`).
- [ ] Character **walks** (limbs swing) — does not glide.
- [ ] **Collision**: can't pass through walls OR props.
- [ ] Camera: 1-finger orbit, 2-finger pinch-zoom, follows the player.
- [ ] No console errors; assets load.

## Where to look first (new session)

1. `CLAUDE.md` — operating law + the pipeline decision (§3/§5/§6) + the doc map (§10).
2. This file — status + changelog.
3. `ROADMAP.md` — the master phased checklist (what's done vs left); `PARITY_AUDIT.md` — the granular tests.
4. `docs/00_INDEX.md` — Bible master TOC (lore/world reference).
5. `eldermoor_client.html` + `build_kit.py` — the live pipeline. Run it (CLAUDE.md §6) to see current state.
