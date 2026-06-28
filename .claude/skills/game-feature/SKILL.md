---
name: game-feature
description: >
  Build or extend an Eldermoor game feature (a skill, map area, quest, dialogue, combat change, UI panel).
  Use whenever the task is "add/build/implement a <skill|map|quest|story|dialogue|combat|item> feature."
  Enforces branch → small chunks → smoke check → play-test in preview → PR with honest notes → merge.
---

# Eldermoor — Game Feature Build Loop

Read `GAME_DESIGN.md` and `CLAUDE.md` (§0 operating law) before starting. Match the existing low-poly
style and the data-driven structure. Never copy Jagex specifics — original content only.

## The loop (one feature = one branch = one PR)
1. **Scope.** Pick ONE backlog item from `GAME_DESIGN.md` → Roadmap. State the smallest shippable chunk.
2. **Branch.** `git checkout -b feature/<area>` (or a worktree). Touch your area's module + add content as
   **data** in `world.js`/`quests.js`. Don't edit other features' modules.
3. **Build in small steps.** After each step, serve and load the page; verify it still plays. Commit
   per concern (`feat: …`).
4. **Gate.** `npm run check` (smoke check must pass). Fix anything it flags.
5. **Play-test.** Actually walk through the affected flow in the browser/preview deploy. Confirm:
   - no console errors,
   - the tutorial still completes (no regression),
   - the new thing works and feels right.
6. **Self-critique.** Write down what's still weak. If it isn't good enough, keep iterating — don't ship
   a stub and call it done.
7. **PR.** `gh pr create` with: what changed · how you tested (preview URL + "played through X") · known
   gaps. Confirm the preview deployment is green.
8. **Merge** to `main` after green, delete the branch, update `GAME_DESIGN.md`/`HANDOFF.md`.

## Hard don'ts
- No copied assets, names, maps, or UI from RuneScape/Jagex.
- No merging with a failing smoke check or console errors.
- No engine rewrites smuggled inside a feature PR — refactors are their own PR.
- No leaving TODO stubs in merged code.

## Definition of Done
Smoke check passes · plays in the preview deploy with no console errors · tutorial flow unbroken ·
docs updated · PR describes real state honestly.
