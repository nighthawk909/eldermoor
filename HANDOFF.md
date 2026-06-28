# HANDOFF — current state

**Status:** Playable Tutorial Island exists as a single file (`index.html`). Ready to move into Claude
Code: repo → deploy → modularize → tooling → features.

**Start here:** read and execute `KICKOFF.md` (phases in order). Obey `CLAUDE.md` §0 operating law.

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
1. Phase 1 — git init, push to nighthawk909/eldermoor, deploy to Vercel, record the live URL here.
2. Phase 2 — refactor/modularize: split index.html into src/ modules (see KICKOFF), keep it playable.
3. Phase 3 — install pre-commit hook (git config core.hooksPath hooks), confirm npm run check.
4. Phase 4 — feature branches/worktrees per area (see GAME_DESIGN roadmap); pull the top item only.

## Live URL
_(paste the Vercel production URL here after Phase 1)_
