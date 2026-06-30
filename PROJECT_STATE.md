# PROJECT_STATE.md — Eldermoor

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
