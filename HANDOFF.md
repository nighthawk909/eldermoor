# HANDOFF — current state

**Status:** Phases 1–3 complete. Repo is live and **public** at
https://github.com/nighthawk909/eldermoor with CI; the game is modularized under `src/`; the
smoke-check gate (hook + CI) is wired; and the game is **deployed live at
https://eldermoor.vercel.app** (Vercel↔GitHub integration: `main` auto-deploys to production,
every PR gets a preview link).

**Start here:** read `KICKOFF.md` + `CLAUDE.md` §0. Next real work is **Phase 4 features**
(branch/worktree per area — see GAME_DESIGN roadmap; pull the top item only).

## Changelog — 2026-06-27 (playability fix)
- **fix/playable-actions:** the game was effectively unplayable — found two bugs by driving the
  live build in a real browser:
  1. **Action timer unit mismatch (critical):** `action.t` accumulated in *seconds* (`dt`) but station
     `dur` values are in *milliseconds*, so every timed skill (woodcutting/fishing/mining/smithing/
     cooking/crafting/ranged/magic/prayer/melee) would take ~27 min to finish. Fixed: `action.t += dt*1000`.
  2. **Finicky click targets:** low-poly stations are small on screen; a near-miss silently became a
     ground-move. Added forgiving targeting — a tap within ~1.6 units of a station interacts with it.
  Verified end-to-end: all 13 tutorial steps now complete (woodcutting → … → board boat), items are
  produced, combat kills the rat and drops bones, prayer/ranged/magic/crafting all advance.
  (`src/main.js` also has a localhost/`?dbg`-guarded `window.__EM` hook for browser-driven testing.)

## Changelog — 2026-06-27 (Phases 1–3)
- **Phase 1:** clean monorepo extracted from the kickoff zip; `git init`; force-pushed over the
  earlier private asset-only repo and flipped `nighthawk909/eldermoor` to **public**. Asset files
  preserved under `assets/pipeline/` (build_eldermoor.py carries the sword-grip/boot/clothing fixes).
  **Deployed to Vercel** via the GitHub integration → **https://eldermoor.vercel.app** (production on
  `main`, automatic PR preview deploys). Imported through the dashboard (CLI login is interactive).
- **Phase 2:** `refactor/modularize` → split `index.html` into 11 `src/` ES modules (clean, cycle-free
  graph; pure skills/inventory via listener hooks). Verified in a local preview: no console errors,
  plays identically. Merged via PR #1.
- **Phase 3:** pre-commit hook installed (`git config core.hooksPath hooks`) and confirmed firing;
  `.github/workflows/ci.yml` gates push/PR on the smoke check; `package.json` has `check`/`dev`.

## What's done
- `index.html` — playable Tutorial Island: walkable low-poly world, click-to-move + orbit camera,
  15 skills with the OSRS XP curve, inventory, guided objective chain with beacon, chat log, XP drops,
  basic combat (rat with hitsplats/drops/respawn). Style is the crisp low-poly look we locked.
- `prototypes/eldermoor.html` — earlier walkable world prototype (reference).
- `assets/pipeline/` — Blender asset pipeline (build_hero_v2.py hero, make_face_tex.py + face_tex.png
  painted face). Renders are stills only; not wired into the game yet. Style reference, not a blocker.
- Docs: CLAUDE.md, GAME_DESIGN.md, MODELING_SPEC.md, MANIFEST.md.
- Tooling staged: scripts/smoke-check.mjs, hooks/pre-commit, package.json,
  .claude/skills/{eldermoor-asset,game-feature}/SKILL.md.

## Decisions locked
- Crisp low-poly blockout style over the soft lofted-mesh attempt (Josh's call).
- The browser prototype is the real game client; Blender output is reference/optional asset source.
- Data-driven content (STN stations, STEPS quests) so features parallelize cleanly.

## Next (do in order)
1. (Recommended) Add a Playwright headless load test (open page, assert no console errors + objective
   banner renders) and add it as a CI job — catches runtime errors the syntax-only smoke check misses.
2. (Optional) Port a Blender render-smoke CI job for `assets/pipeline/` if the asset pipeline keeps changing.
3. Phase 4 — feature branches/worktrees per area (see GAME_DESIGN roadmap); pull the top item only.

## Live URL
**https://eldermoor.vercel.app** — production (auto-deploys from `main`). PRs get their own preview
URLs automatically. Verified playable on production this session.
