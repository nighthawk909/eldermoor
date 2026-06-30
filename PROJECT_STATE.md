# PROJECT_STATE.md — Eldermoor

**Authoritative current-state snapshot.** Pairs with ARCHITECTURE.md, BACKLOG.md, NEXT_TASKS.md, METRICS.md.
For the full narrative handoff see `PROJECT_HANDOFF.md`; phase status in `ROADMAP.md`; item-level tests in
`PARITY_AUDIT.md`.

- **Live version:** v30 · **Link:** https://eldermoor.vercel.app
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
