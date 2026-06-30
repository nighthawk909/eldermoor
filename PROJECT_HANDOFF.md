# PROJECT HANDOFF — Eldermoor

**Version (live):** v22 · **Live link:** https://eldermoor.vercel.app
**Working copy:** v23 in progress, **blocked** (see Blockers).
**Overall progress:** ~20% (features integrated + boot-verified; **~0% live-playtested**).
**Date:** 2026-06-29.

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
  auto-retaliate); attackable giant-rat mob + Attack verb.
- Banking interface (Bank of Eldermoor: deposit/withdraw, 1/5/10/X/All, deposit-inventory/worn).
- Tutorial L0–L17 state machine (objective + gating + handoff scaffolding, predicate-driven).
- Character creator (L0 gate) + appearance-apply to the player model.
- Make-X production interface (reusable).

**Count:** ~36 feature-level items integrated.

---

## 4. Incomplete / missing features (~54)

- **Trading** (player-to-player) — not started.
- **Multiplayer presence** (other players, white dots, PvP-off) — not started.
- **World build-out:** only the chapel grounds zone exists. Missing 9 of 10 zones (spawn house, full
  survival area, cook's house, quest house, mine/underground, combat ring, bank building, wizard area,
  departure dock) and the instructor roster placed in-world (data authored, NPCs not placed).
- **The gated lesson chain actually driving gameplay** (state machine exists; doors/areas not yet locked;
  grants/handoffs not fully wired to in-world actions).
- **Ranged + Magic combat** (melee works; ranged/spellcast projectiles not wired).
- **Prayer points / activation drain**, **rune consumption on cast**, **bury-bones**.
- **Smithing/cooking via the Make-X interface** (interface built; not yet called by the skills).
- **Equipment on the 3D avatar** (worn gear doesn't render on the model).
- **Banking PIN, tabs, search, placeholders, notes.**
- **Quest detail/accept/complete flow + reward screen.**
- **Audio: real per-zone music + action SFX coverage** (only procedural cues exist).
- **Accessibility, i18n, world-map POI search, collection log / diaries / GE** (future scope).
- **Mobile-specific HUD reflow.**
- Full list with pass/fail tests: `PARITY_AUDIT.md` (~645 itemised gaps); phase-level: `ROADMAP.md`.

---

## 5. Known bugs

1. **[BLOCKER, v23 working copy] Smart-quote → apostrophe break.** A smart-quote normalization pass
   converted curly apostrophes inside single-quoted strings to unescaped `'`, breaking several core
   modules (`world.js:157` `Expert's`, and likely a few more across the ~37 normalized files). Browser
   error: `Unexpected identifier 's'`. **The deployed v22 is NOT affected** (it predates the corruption);
   only the working copy / v23 is. `node --check` did not reliably catch these, so the fix must escape or
   remove the in-string apostrophes and re-verify in a real browser boot.
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

- **B1 (active):** the v23 apostrophe break — must be fixed before v23 can deploy. Live v22 is unaffected.
- **B2 (standing):** no live 3D-interaction testing in this environment → features can't be promoted from
  "integrated" to "complete" without a human (or a real-browser session) clicking through them.

---

## 7. Outstanding backlog (sources of truth)

- `ROADMAP.md` — phases P0–P10 + lessons L0–L17, honest `[ ]/[~]/[x]` status.
- `PARITY_AUDIT.md` — ~645 granular per-feature pass/fail tests (the real punch-list).
- `BUILD_QUEUE.md` — the fleet FIFO + reviewer re-queue.
- `ASSET_MANIFEST.md` — every 3D asset needed (zones, buildings, NPCs, fixtures) with status.

Near-term priority order: fix v23 → live-playtest the integrated features → wire the lesson chain to gate
real actions → build out zones/instructors (assets) → ranged/magic/prayer mechanics → audio/polish.

---

## 8. Exact next task

**Fix the smart-quote apostrophe breakage and ship v23:**
1. In `src/`, find every single-quoted string literal containing an unescaped apostrophe (start:
   `world.js:157` `'...Survival Expert's axe.'`) — escape (`\'`) or rephrase to remove the apostrophe.
   Scan all ~37 files the normalizer touched, not just world.js.
2. Verify with a **real browser boot** (stop/restart the preview server, hard-navigate, confirm
   `window.EMHUD` is defined + zero console errors), not just `node --check`.
3. Bump version to v22→v23 in `src/hud.js` (welcome line) + `index.modular.html` (#hud).
4. `cp index.modular.html index.html && vercel deploy --prod --yes`.
5. Then begin the **live-playtest pass** on the deployed link to promote integrated features to "complete."
</content>
