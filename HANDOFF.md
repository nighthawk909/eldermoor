# HANDOFF — current state

**Status:** Phases 1–3 essentially done. Repo is live and **public** at
https://github.com/nighthawk909/eldermoor with CI; the game is modularized under `src/` and
the smoke-check gate (hook + CI) is wired. **One item outstanding: the Vercel live URL**
(deploy blocked on interactive auth — see Live URL below).

**Start here:** read `KICKOFF.md` + `CLAUDE.md` §0. Next real work is Phase 4 features — but
finish the Vercel deploy first so PRs get preview links.

## Changelog — 2026-06-27 (Phases 1–3)
- **Phase 1:** clean monorepo extracted from the kickoff zip; `git init`; force-pushed over the
  earlier private asset-only repo and flipped `nighthawk909/eldermoor` to **public**. Asset files
  preserved under `assets/pipeline/` (build_eldermoor.py carries the sword-grip/boot/clothing fixes).
  **Vercel deploy NOT done** — CLI needs interactive `vercel login`, no token in env, MCP deploy tool
  is advisory-only. See Live URL.
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
1. **Finish Vercel deploy** (Phase 1 remainder): connect `nighthawk909/eldermoor` in the Vercel
   dashboard (Add New → Project → import the repo; framework "Other", root `.`, no build) OR
   `vercel login` then `vercel --prod` + `vercel git connect`. Enable PR/preview deployments. Paste
   the production URL below + into CI status.
2. (Recommended) Add a Playwright headless load test (open page, assert no console errors + objective
   banner renders) and add it as a CI job — catches runtime errors the syntax-only smoke check misses.
3. (Optional) Port a Blender render-smoke CI job for `assets/pipeline/` if the asset pipeline keeps changing.
4. Phase 4 — feature branches/worktrees per area (see GAME_DESIGN roadmap); pull the top item only.

## Live URL
_PENDING — Vercel deploy blocked on interactive auth this session. Once connected, paste the
production URL here._ Local preview confirmed playable (served via `npm run dev`).
