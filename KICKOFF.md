# Eldermoor — Claude Code Kickoff

**Paste this whole file to Claude Code as the opening task, or tell it: "Read KICKOFF.md and execute the phases in order."**

You are picking up Eldermoor: an original, RuneScape-style (OSRS-era low-poly) browser game.
A playable **Tutorial Island** already exists as a single file (`index.html`). Your job is to put it
under version control, deploy it for a live preview link, refactor it into modules so features can be
built in parallel without merge conflicts, add the tooling that keeps `main` always-playable, and then
build features branch-by-branch.

---

## Operating law (non-negotiable — read `CLAUDE.md` §0 first)
- **Claude-built only.** No stock assets, no copied Jagex content. Match the *style*, never the specifics.
- **No shortcuts. Fully baked.** No stubs/TODOs left behind in a merged PR.
- **Small verified chunks, never one-shot.** Build → run → inspect → fix → commit. One concern per commit.
- **Reference-driven & honest.** If something isn't good enough, say so in the PR description; don't oversell.
- After every phase: commit, and update `HANDOFF.md` with current state + next step.

## A note on "sub-agents" (set expectations correctly)
There is no roster of autonomous bots. The pattern that delivers separate-commits-PRs-preview-links is
**git worktrees + one feature branch per area**, plus **subagents for scoped tasks** (e.g. "write the
combat module," "review this diff"). One operator (you) directs. Do NOT attempt literal parallel
autonomous agents — set up worktrees/branches instead (Phase 4).

---

## Phase 0 — Orient
1. Read `CLAUDE.md`, `GAME_DESIGN.md`, `MODELING_SPEC.md`, `MANIFEST.md`, `HANDOFF.md`.
2. Open `index.html` and confirm it runs (serve locally: `npx serve .` then load the page). Walk through
   the tutorial end-to-end so you know the current behavior before changing anything.

## Phase 1 — Repo + live preview link
1. `git init`, sensible first commit of everything here.
2. Create the GitHub repo and push `main`:
   `gh repo create nighthawk909/eldermoor --public --source=. --remote=origin --push`
3. Deploy for a **live, shareable preview URL** (Josh uses Vercel):
   - `vercel` (link project) then `vercel --prod`, OR connect the GitHub repo in the Vercel dashboard.
   - It's a static site; root is the deploy dir, `index.html` is the entry. No build step yet.
   - **Enable PR/preview deployments** so every PR gets its own preview link.
4. Output the production URL and confirm the game loads and is playable there.
5. Commit. Update `HANDOFF.md` with the live URL.

## Phase 2 — Modularize (THE unlock for parallel work)
Split the single `index.html` into ES modules under `src/`. Keep the game **fully working** at every step
(refactor in small commits, re-test after each). Target structure:

```
index.html            # thin shell: <canvas> + HUD markup + <script type="module" src="src/main.js">
src/
  engine.js           # renderer, scene, camera, lights, sky, fog, terrain (gh/terrainCol), sea, resize
  characters.js       # makeChar / makeRat / nameplate factories (the crisp low-poly style)
  props.js            # makeTree, makeRock, makeFire, makeFishSpot, furnace, anvil, dummy, target, altar, table, boat
  skills.js           # SKILLS list, OSRS xp table, levelFromXp, addXp  (pure data + math, no DOM)
  inventory.js        # item model, addItem/hasItem/useItem, ITEM icons
  world.js            # STN station definitions + placement (DATA-DRIVEN; new content goes here)
  quests.js           # STEPS tutorial chain, checkStep, beacon (DATA-DRIVEN)
  dialogue.js         # dialogue queue/box
  combat.js           # engage/melee/ranged/magic, hitsplats, drops, respawn
  ui.js               # HUD: skills panel, inventory grid, objective banner, chat log, xp drops, progress bar
  main.js             # imports the above, wires input (click-to-move, orbit cam), runs the animate loop
```
Rules:
- Modules expose explicit exports; `main.js` is the only orchestrator. No circular imports.
- `skills.js` and `inventory.js` stay DOM-free (pure logic) so they're unit-testable.
- **Content lives as data** in `world.js`/`quests.js` so future features add stations/quests without
  touching the engine. This is what lets branches not collide.
- Do it on a branch `refactor/modularize` → PR → confirm preview plays identically → merge.

## Phase 3 — Tooling (keep `main` always-playable)
1. `scripts/smoke-check.mjs` is provided: it `node --check`s every `src/**/*.js` and verifies `index.html`
   references `src/main.js`. Wire it as the gate.
2. Install the pre-commit hook: `git config core.hooksPath hooks` (the `hooks/pre-commit` here runs the
   smoke check and blocks broken commits). Confirm it fires.
3. Add `package.json` with `"scripts": { "check": "node scripts/smoke-check.mjs", "dev": "npx serve ." }`.
   Optional but recommended: add a headless load test (Playwright) that opens the page and asserts no
   console errors + the objective banner renders; gate PRs on it via a GitHub Action.
4. The build/test loop for features lives in `.claude/skills/game-feature/SKILL.md` — read it; follow it.
5. Commit. Update `HANDOFF.md`.

## Phase 4 — Build features (branch/worktree per area)
Use a worktree per concurrent feature so sessions don't step on each other:
```
git worktree add ../eldermoor-skills   feature/skills
git worktree add ../eldermoor-map      feature/map
git worktree add ../eldermoor-quests   feature/quests
```
For each feature, follow `.claude/skills/game-feature/SKILL.md`:
branch from `main` → build ONE chunk in its owned module → `npm run check` → load in a browser/preview
and actually play it → self-review → commit (`feat:`/`fix:`) → `gh pr create` with a description of what
changed and what still isn't great → confirm the preview deploy is green → merge → delete branch.

**Ownership to avoid conflicts** (each feature edits mainly its module + appends data):
- `feature/skills`   → `skills.js` (+ training actions in `world.js` data)
- `feature/map`      → `engine.js` terrain + `world.js` placement/props
- `feature/combat`   → `combat.js`
- `feature/quests`   → `quests.js` (+ new stations as data in `world.js`)
- `feature/dialogue` → `dialogue.js` (+ NPC dialogue data)
- `feature/story`    → `GAME_DESIGN.md` + `quests.js` content

See `GAME_DESIGN.md` → Roadmap for the actual feature backlog. Pull the top item, not all at once.

## Conventions
- **Commits:** `feat: …`, `fix: …`, `refactor: …`, `docs: …`. One concern each.
- **Branches:** `feature/<area>`, `fix/<thing>`, `refactor/<thing>`.
- **PRs:** what changed · how you tested (preview link + "played through X") · known gaps. No green-washing.
- **Definition of Done:** smoke check passes · plays in the preview deploy with no console errors ·
  no regression to the tutorial flow · docs (`GAME_DESIGN.md`/`HANDOFF.md`) updated.
- **Living memory:** when a decision or constraint is discovered, write it into `GAME_DESIGN.md` or a
  dated note in `decisions/` so it survives across sessions.

## First three things to actually do
1. Phase 1 (repo + Vercel) → paste the live URL into `HANDOFF.md`.
2. Phase 2 (`refactor/modularize`) → PR → merge once the preview plays identically.
3. Phase 3 (smoke check + hook + `package.json`) → PR → merge.
Then stop and report the live URL + module map before starting Phase 4 features.
