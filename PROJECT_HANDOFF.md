# PROJECT HANDOFF — Eldermoor

**Version (live):** v35 · **Live link:** https://eldermoor.vercel.app
**Working copy:** v35 (parameterized player avatar + Mobile 1A QA round 3 + test infra + QA sync) on `claude/modular-v23`.
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
