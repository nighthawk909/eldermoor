# ARCHITECTURE.md — Eldermoor

Original OSRS-style web game. Vanilla ES modules, no build step. Detailed file map in `PROJECT_HANDOFF.md`.

## Stack
- **Client:** `index.html` (= copy of `index.modular.html`, the canonical shell) loads Three.js **r128** +
  GLTFLoader from CDN as globals, then `<script type="module" src="src/main.js">`.
- **Renderer:** Three.js, faceted/flat-shaded OSRS register, fog, AgX-ish grade.
- **Assets:** Blender-authored glTF (`assets/*.glb`) + `*.colliders.json`/`*.manifest.json` sidecars
  (`build_kit.py`); tiling textures (`make_textures.py`); content JSON in `assets/data/`.
- **Hosting:** Vercel static. Deploy: `cp index.modular.html index.html && vercel deploy --prod --yes`.
  Rollback: `cp eldermoor_client.html index.html && vercel deploy --prod --yes`.

## Module pattern
- `src/main.js` is the only orchestrator: imports every module, exposes shared globals
  (`EMPLAYERPOS, EMRIG, EMMOVE, EMSCENE, EMTOGGLERUN, EMWALK`), calls each `init*()`, runs the rAF loop.
- Each feature = one `src/*.js` exporting `init*()` and registering a `window.EM*` global
  (`EMHUD, EMCOMBAT, EMBANK, EMSKILL, EMEQUIP, EMLESSON, ...`).
- **Decoupling:** modules talk via `window.EM*` globals + DOM CustomEvents (`em-data-ready`, `em-lesson`,
  `em-walk`, `em-appearance`), not tight imports — so each degrades gracefully if a dep isn't ready yet.
- **HUD tabs:** `hud.js` renders the cluster; `window.EMTABS[tabId] = (panel,state)=>{}` lets any module
  own a tab's panel without editing `hud.js`.
- **Data:** `loaders.js` fetches `assets/data/*.json` → `window.EMDATA`, fires `em-data-ready`.

## Core module groups
- Engine/world/movement: `engine, world, player, npc, dialogue, interact, input, loaders`.
- HUD + tabs: `hud, tooltip, orbs, xpcounter, worldmap, minimap-nav, minimap-render` + per-tab modules.
- Systems: `combat, skilling, equipment, save, audio, bank, lessons, make-interface, charcreate, appearance-apply`.

## Conventions
- Straight ASCII quotes only; escape apostrophes inside single-quoted strings as `\'` (a stray `'` breaks
  the ES module — root cause of the v22→v23 blocker).
- Verify every integration with a real browser boot (cache-free copy or deployed URL), not just `node --check`.
- Immutable data updates; small verified chunks; original IP (OSRS roles, never Jagex specifics).
</content>
