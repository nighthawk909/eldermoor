# PROJECT_STATE.md — Eldermoor

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

**Authoritative current-state snapshot.** Pairs with ARCHITECTURE.md, BACKLOG.md, NEXT_TASKS.md, METRICS.md.
For the full narrative handoff see `PROJECT_HANDOFF.md`; phase status in `ROADMAP.md`; item-level tests in
`PARITY_AUDIT.md`.

- **Live version:** v36 · **Link:** https://eldermoor.vercel.app (production auto-deploys from `claude/modular-v23`)
- **Overall:** ~24% (features integrated + boot-verified; **live-playtested separately — see METRICS**).
- **Client:** modular ES (`src/*.js`, ~37 modules) + `index.modular.html` shell, Three.js r128 (CDN),
  data-driven from `assets/data/*.json`. Deployed on Vercel. `eldermoor_client.html` = frozen v17 rollback.

## Works (verified in a foreground browser)
Walking / A* pathfinding / collision · camera (orbit, pinch, arrow/WASD/MMB) · HUD chrome (14 tabs, chat
channel filters, minimap, inventory, 23-skill stats total 32).

## Integrated + boot-verified (NOT yet live-playtested)
Render-correctness fixes · scenery + data-driven examine · status orbs + run energy · hover text + tooltips
· world map · minimap terrain + click-to-walk · XP counter · procedural audio · save/load · branching
dialogue runner · NPC speech bubbles · inventory right-click ops · equipment system + tab · Prayer / Magic /
Quests / Settings / Emotes / Music / Friends / Ignore / Account / Logout tabs · skilling engine + fixtures ·
resource depletion · combat engine (melee + ranged + magic-cast, player HP, death/respawn, retaliate) ·
attackable rat + Attack · banking · tutorial state machine · character creator + appearance-apply ·
Make-X interface (wired to smithing/cooking) · prayer points (drain + bury-bones) · quest accept/track/
complete flow · action SFX coverage (`sfx-actions.js`) · lesson gating (`gating.js`) · single 0.6s global
game tick (`tick.js`, shared by combat + skilling).

## Recently resolved
- **P1 render-correctness wave (shipped, boot-verified + deployed; live playtest pending):** the parallel
  fleet (builder-A on engine.js, builder-B on npc.js, builder-C on meshes/loader, + orchestrator wiring in
  player.js) landed all 8 P1 fixes — explicit material-role map (P1.5), terrain map-null (P1.1), water
  renderOrder (P1.2), roof register + `isInsideAnyRoof` + z-offset wired in player.js (P1.6, dormant until a
  roofed building exists), sky `toneMapped` + asymptotic altar-glow `decayExp` (P1.7), loader counts
  content-data + 20s backstop (P1.8); P1.3 (nameplates) and P1.4 (flat-shading) verified already-correct
  no-ops. QA'd (P1.6/P1.7 REQUEUE resolved by the orchestrator wiring — QA raced the edit). Boot-verified
  clean (zero console errors on the rebooted deployed build).
- **Kanban dashboard + `shipped` status:** `dashboard.html` rebuilt as a kanban (To Do / Building / Review /
  Shipped / Done) with a bottleneck highlight, an honest banner naming the real gate (human playtest), and a
  "Needs my eyes" filter. New `shipped` status = boot-verified + deployed, awaiting human playtest (distinct
  from `done` = playtest-confirmed) — so forward progress is visible instead of piling at "review".
- **Fleet live-progress dashboard (tooling, not a player feature):** `dashboard.html` + `progress.json`
  (local single-writer board) + `api/progress.js` (Vercel KV, mirrors `api/qa.js`) + `tools/progress.js`
  (reporter CLI). Watch the parallel build fleet live in-session (preview) or on any device once KV is
  connected. Statuses: queued/building/review/requeue/done/blocked/failed. Boot-verified live (status flip
  reflected on the board with no reload). Not yet deployed to production.
- **v36 — Worn gear on the avatar (all slots) + QA fixes (from v35 owner QA):** `avatar.js` `renderWorn()`
  now renders EVERY worn slot, not just weapon/shield — weapon (hand), shield (hand), body/armour
  (torso shell + pauldrons), cape (back), gloves (hands), and helm/legs/feet anchors are ready for
  future items; unequipping removes the mesh. The tab panel (`mobile-ui.js`) is now translucent so the
  3D character is visible behind the open Inventory/Equipment panel (you can watch gear appear). Name
  entry enforces **2–12 chars** with a live counter/hint. Objective no longer stale: removed the bogus
  hardcoded "Brother Aldric" objective (NPC not in data) and charcreate now fires `appearance_confirmed`
  so lesson L0 completes and the objective advances after character creation. Production now
  auto-deploys from `claude/modular-v23` (Vercel Production Branch switched). Agent-QA'd + 8/8 worn-gear
  logic test. **Still open from v35 QA: combat pathing/death/respawn (1C); landscape panel polish.**
- **v35 — Parameterized player avatar (`avatar.js`):** the character-creator picks now appear on the
  in-world 3D body. A procedural humanoid is built from THREE primitives off `window.EMAPPEARANCE`
  (parts + colours + body type): head/hair/beard/hood, torso (tunic/robe/jerkin/yoke), arms
  (sleeved/bare/wrapped), hands (bare/gloves/bracers), legs (trousers/skirt/breeches), feet
  (boots/shoes/sandals). Limb pivots register onto `window.EMRIG` so the existing `player.js` walk
  cycle animates them; the static `player.glb` is hidden while the avatar is active. Worn weapon/shield
  from `EMEQUIP.worn` render in the hands. Save format unchanged. **loaders.js re-asserts the avatar
  after `player.glb` loads** (fixes a glb-vs-avatar render race — QA blocker). `bury` op added
  (removes bones + Prayer XP). Agent-QA'd (PARTIAL→fixed) + 10/10 THREE-stub logic test before owner QA.
- **v34 — Mobile 1A QA round 3 (from in-game QA report):** inventory **tap** now performs the default
  action (Wield equips, Eat eats, Examine prints) instead of doing nothing; equipping no longer **bugs the
  equipment slot** (equipment-tab handles the {id,count} worn shape); **dialogue** is now a compact bottom
  dock in both orientations (no more mid-screen float / oversized box) with a smaller Continue button; the
  **objective** collapses to an always-visible tappable pill (never lost; tap to recall); **tabs are
  collapsible** (toggle top-right) and the **landscape** tab bar is fixed on-screen (7-col, 2 rows).
  Boot-verified 16/16 headless. Still later milestones: equip-on-avatar + eating animation (1B), combat
  death/respawn/animation (1C), QA live-sync (needs Vercel KV connected).
- **v33 — Character-creator LIVE PREVIEW (owner-requested):** a 2D SVG paper-doll in the
  creator (`charcreate.js`) updates as you toggle every option (hood/beard, tunic/robe/jerkin/yoke,
  trousers/skirt/breeches, boots/shoes/sandals, sleeved/bare/wrapped arms, gloves/bracers, body type) plus
  all colours (skin/hair/torso/legs/feet). Sticky at the top of the creator so it stays visible while cycling.
  It shows part shapes the static 3D model does not, so it is a real preview now; a 3D/in-world preview can
  follow with the parameterized model. Boot-verified 11/11 headless.
- **v32 — QA findability + top-left declutter (1A polish from on-device QA):** the in-game **QA**
  button now shows the build **version** (the game HUD hides the original version bar, so this is where you
  read it) and is bigger/clearer; the XP-gained counter was moved BELOW the QA button so the two no longer
  overlap in the top-left. Boot-verified 9/9 (button visible, shows v32, ≥40px, no XP overlap, overlay+notes
  open). Backlogged (owner-requested): a **character-creator live preview**. 
- **v31 — Live QA sync backend (owner-requested):** the project gains its first **backend** — a
  zero-dependency Vercel serverless function `api/qa.js` backed by **Vercel KV** (Upstash REST via the
  injected `KV_REST_API_URL`/`KV_REST_API_TOKEN`). The QA panel (`qa-panel.js`) now auto-POSTs results
  every few seconds (debounced; footer shows synced/offline; failures silent), so the tester just plays +
  checks boxes and the dev reads the latest via `GET /api/qa` (no copy/paste). Static serve unchanged
  (no package.json/build; Vercel auto-builds `/api`). **Setup required (Josh): connect a Vercel KV store
  to the project + redeploy — see HUMAN_ACTIONS.md;** until then the function returns 503 and the panel
  falls back to Copy/Share/Download. Client sync boot-verified 6/6 (POST payload: version/results/report/
  counts/device + graceful failure); function `node --check` clean (runs live once KV is connected).
- **v30 — Test infrastructure (owner-requested; not Milestone 1B):**
  - **Dev test character** (`src/devtest.js`, `window.EMDEV`): on every load sets all skills to level 99
    and tops up a combat kit in the bag (bronze-sword, shortbow, 500 arrows, 1000 air+mind runes,
    bronze-dagger, cooked-shrimp, bones, 10k coins). Idempotent (ensures quantities, never overflows);
    no auto-equip yet (equip via inventory long-press → Wield; auto-equip waits for 1B's equip-tab fix).
    Default-on; toggle `EMDEV.setEnabled(false)` / `window.EM_DEVTEST_OFF`.
  - **In-game QA panel** (`src/qa-panel.js`, `window.EMQA`, `assets/data/qa.json`): a "QA" launcher
    (top-left) opens a mobile-first checklist for the current build — Pass/Fail/Skip + a note field per
    item, persisted to `eldermoor:qa:<version>`, compiled into one Markdown report with Copy / Share /
    Download. The tester checks off items in-game and sends back ONE report instead of retyping per item.
    I update `qa.json` each release with what to test. Boot-verified by an 18/18 headless test.
- **v29 — Milestone 1A QA fixes (round 2):** dedicated **landscape** layout (tab panel docks left,
  anchored top+bottom so it never clips; minimap cluster top-right; tabs bottom-right); the top-right HUD
  cluster (minimap/orbs/world-map button) reflowed into one non-overlapping right-edge stack and the XP
  counter moved top-left (they used to overlap each other and the panel); responsive panel sizing
  (`max-width:100vw-12px`, on-screen in both orientations); **inventory touch interactions** — long-press
  opens the option menu on mobile (`inventory-ops.js`; tap = op0, long-press = context menu with
  Use/Wield/Eat/Drop/Examine, trailing-click suppressed, haptics); objective banner now re-shows on entry
  (`em-appearance`) and stays ~8s. Boot-verified by a 26/26 headless-Chromium UI test (incl. landscape
  no-clip/no-overlap, cluster non-overlap, long-press menu, Examine→chat). **Pending Josh's on-device QA.**
  Known limitation: character-creator **part SHAPES** (e.g. boots vs sandals, trousers vs skirt) don't yet
  change the model — the player is a single static glTF; only COLOURS apply. Options/skirts/footwear exist
  and persist; reflecting part shape needs a parameterized player model (separate modeling milestone).
- **v28 — Mobile Sprint 1, Milestone 1A (responsive UI framework):** new `src/mobile-ui.js`
  (`window.EMUI` + `window.EMHAPTIC`). Live portrait/landscape orientation detection (body
  `em-portrait`/`em-landscape`, no reload); fluid panel/tab/chat layout that stacks without overlap;
  ≥44px touch targets; dialogue restyled as a docked bottom sheet; single active panel (tab panel ↔
  dialogue mutually exclusive, chat yields); collapsible chat; auto-hiding objective banner; stray
  floating emote FAB removed (`emotes.js`); character **name entry** + validation in the creator
  (`charcreate.js`, saved to `eldermoor:name`/`window.EMNAME`); `viewport-fit=cover` for safe areas;
  haptic framework. Boot-verified by a 19/19 headless-Chromium UI test. **Pending Josh's on-device QA.**
  Gameplay (combat/skills/quests/banking/audio) intentionally untouched (later milestones).
- **v27:** single authoritative **0.6s global game tick** (`src/tick.js`, `window.EMTICK`): combat and
  skilling dropped their two independent `setInterval`/`setTimeout` clocks and now subscribe to one shared
  cadence (OSRS one-tick model), with a private-interval fallback if the clock is absent. Verified by a 7/7
  functional test (shared clock, sub/unsub, teardown). Shipped v27 (commit e68d1b8). Live-playtest pending.
- **Tooling:** policy-driven **Claude Code configuration** installed (commit 3a9fe8d) — `.claude/settings.json`
  + SessionStart / PreToolUse / PostToolUse / Stop hooks, all validated against simulated payloads, plus a
  CLAUDE.md EXECUTION POLICY section. Converts prompt-driven behaviour to enforced policy.
- **v26:** lesson gating (`src/gating.js`, `window.EMGATE`) — gates skill/combat/bank actions + movement
  regions by tutorial step with OSRS-style nudges; anti-brick (open while instructors/zones absent). Shipped
  v26 (commit 11484f9). Live-playtest pending.
- **v25:** prayer points/tab (point pool, activation drain, bury-bones), Make-X wired to smithing (anvil) +
  cooking (range), quest accept → track → complete flow, and action SFX coverage (`sfx-actions.js`); plus a
  fix un-escaping invalid `\'` string delimiters in `sfx-actions.js` + `skilling.js`. Integrated + cache-free
  boot-verified; shipped v25 (commit 88eaa61). Live-playtest still pending.
- **v24:** ranged combat (bow + arrows consume ammo, projectile, max range, melee fallback, Ranged+HP XP) and
  magic-cast on mobs (click combat spell → target a mob, consume runes, bolt projectile, Magic+HP XP) both
  integrated + cache-free boot-verified; shipped v24. Live-playtest still pending (see METRICS / NEXT_TASKS).
- **BLOCKER (fixed):** a smart-quote normalization pass left unescaped apostrophes inside single-quoted
  strings (e.g. `Expert's`), which `node --check` tolerated but the browser rejected (`Unexpected
  identifier 's'`). Escaped across 33 files; cache-free boot verified clean; shipped v23.

## Standing constraint
No live 3D-interaction testing in the build environment → "integrated" features are unproven in actual play
until a real-browser playtest pass. The headless preview also caches ES-module deps, so re-verification uses
a cache-free copy or the deployed URL.
</content>
