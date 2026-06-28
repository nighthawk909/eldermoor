# HANDOFF — current state (read after the canon docs)

**Canon (read first, in order):** `docs/PROCESS_INFRASTRUCTURE.md` → `docs/PARITY_STANDARD.md` →
`docs/Master_Game_Design_Spec.md` → `docs/Technical_Architecture.md` → `FEATURE_COMPLETION_MATRIX.md`.
Address the owner as **Josh**.

## What this is
An original **OSRS-inspired** browser MMORPG. We are building **Tutorial Island** as the vertical
slice — **everything scales off it** (the same features power the main game). Build each feature to
full OSRS parity, depth-first, sub-feature by sub-feature, QC'd on mobile. No shortcuts.

## Current priority
**CHARACTERS FIRST** (`docs/parity/characters.md`): hero + human NPCs + monsters must match the
Blender asset quality (`assets/pipeline/build_eldermoor.py`), built as a reusable factory
(`src/render/characters.ts`). The old in-game characters are blocky placeholders being replaced.

## Done (tested building blocks — NOT finished player features)
Engine primitives, all Vitest-green: Tick · World/grid · Movement (pathfinding) · Inventory
container · Equipment logic. These are foundations; their *player features* (full interaction sets)
are tracked as parity-gated rows in the matrix and are Not Started.

## Process now in force
- Depth over width; OSRS-parity Definition of Done; sub-feature-sequential build + QC.
- Gates (`npm run smoke && test && typecheck && parity`) in pre-commit + CI; `parity` blocks
  "Done" without a 100%-checked `docs/parity/<id>.md`.
- Ship-and-notify: each feature pushed + Josh pinged with the live link to test on mobile.

## Live
- https://eldermoor.vercel.app/progress.html (hub) · `/` current game · `/movement-harness.html`,
  `/tick-harness.html`, soon `/characters-showcase.html`.

## Superseded / removed (do not resurrect)
- `BACKLOG.md` (old interaction-overhaul list) → folded into the matrix + parity features.
- `MANIFEST.md` (old asset A1–A6 EPICs) → replaced by `FEATURE_COMPLETION_MATRIX.md` + `Build_Roadmap.md`.
