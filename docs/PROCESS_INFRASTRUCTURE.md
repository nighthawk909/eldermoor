# Eldermoor — Process Infrastructure (skills · hooks · loops · gates)

> **READ THIS FIRST in any new session.** It is the single source of truth for HOW we work so we
> never drift. Pairs with `PARITY_STANDARD.md`, `AI_Agent_Instructions.md`, `CLAUDE.md` §0.
> Status legend: ✅ in place · 🟡 partial · ⬜ to build.

## Standing rules (norms — always on)
- ⬜→always **Address the owner as "Josh"** — begin EVERY response with his name. (saved in memory)
- ✅ **Depth over width.** Build ONE feature to full OSRS parity before starting the next. Never
  half-build. "Am I at parity with OSRS — or better?" is the test for every feature.
- ✅ **No shortcuts / no lean.** Treat this as a shippable product; every detail matters.
- 🟡 **Reusable, data-driven assets** (art playbook): author an asset once via factories, place by
  data anywhere; never re-model per object. (see `Technical_Architecture.md` §5b)
- 🟡 **CURRENT PRIORITY: CHARACTERS FIRST.** Hero + human NPCs + monsters must match the Blender
  asset quality (`assets/pipeline/build_eldermoor.py`), not blocky boxes. Everything else waits.

## Architecture conventions (scale "full software dev style")
See `Technical_Architecture.md` §5 for the tree. The binding rules:
- **Assets live in `assets/`** (the library) and are the source of truth. Build/update assets there;
  game code references them via `render/` factories + `data/`. Never re-model inline per object.
- **One chunk per system.** Adding a system (quest, dialogue, combat, skill, shop, …) means creating:
  `src/sim/<area>/<x>.ts` + `src/data/…` + `docs/modules/<X>.md` + `docs/parity/<x>.md` +
  `tests/sim/<x>.test.ts`. Never bolt a system into an unrelated file.
- **Content is data, not code** (`src/data/`): items, npcs, objects, drop tables, quests, dialogue,
  zones — so content scales without engine edits.
- **Sim is headless** (no DOM/THREE); **render/ui/input** are separate layers.

## Skills (`.claude/skills/…`)
| Skill | Purpose | Status |
|-------|---------|--------|
| `game-feature` | The depth-first, parity-gated build loop for a player feature: write parity checklist → build EVERY interaction → tests → mobile QA → matrix → merge. | 🟡 exists, must be upgraded to enforce PARITY_STANDARD + "don't advance until 100% checked" |
| `parity-check` | For a given feature, generate the FULL OSRS-parity interaction checklist (every left-click default + right-click/long-press option) into `docs/parity/<id>.md`. e.g. Equipment → open, view, remove, wield/wear, examine; Inventory item → use/wield/eat/drop/bury/examine/use-on. | ⬜ to build |
| `eldermoor-asset` | Build/refine 3D assets via the reusable factory + art playbook (style, palette, MODELING_SPEC). | 🟡 exists, point it at the realtime factory too |

## Hooks (mechanical — harness/git runs them, cannot be skipped)
| Hook | What it enforces | Status |
|------|------------------|--------|
| git `pre-commit` (`hooks/pre-commit`, `core.hooksPath=hooks`) | Block broken commits: run `npm run smoke` + `npm test` + `npm run typecheck` + `npm run parity`. | 🟡 currently smoke only — wire the rest |
| GitHub Actions `ci.yml` | Same gates on every push/PR before merge. | 🟡 runs vitest+typecheck+smoke — add `parity` |
| (optional) Claude Code `Stop` hook (settings.json) | Refuse to end a "feature done" turn unless its parity file is 100% checked. | ⬜ optional |

## Loops
| Loop | Description | Status |
|------|-------------|--------|
| **Feature loop** (depth-first) | one feature → `docs/parity/<id>.md` checklist → build every option → tests → mobile QA → Josh signs off device-only boxes → matrix `Done` → next. | 🟡 adopt as the only loop (replaces the old "race through modules" loop) |
| **Mobile-QA reporting loop** | Claude can't feel haptics / real touch. Claude posts the device-only checklist; Josh tests on his phone and reports "works / doesn't"; Claude checks the boxes. | ✅ see `MOBILE_QA.md` |
| **Ship-and-notify cadence** | After EVERY shipped feature/sub-feature: push → Vercel deploys → **ping Josh with the live link + "test on mobile"**. Never make him wait for the whole build. | ✅ binding |

## Gates (Definition-of-Done enforcement)
| Gate | Rule | Status |
|------|------|--------|
| **parity-gate** (`scripts/parity-gate.mjs`) | A matrix row tagged `parity:<id>` marked `Done` MUST have `docs/parity/<id>.md` with ZERO unchecked boxes, or commit/CI fails. | ✅ written — 🟡 wire into hook + CI |
| test gate | `npm test` (Vitest) green. | ✅ in CI — 🟡 add to pre-commit |
| typecheck gate | `tsc --noEmit` clean. | ✅ in CI — 🟡 add to pre-commit |
| smoke gate | prototype `scripts/smoke-check.mjs`. | ✅ |
| mobile sign-off gate | device-only parity boxes (tap/long-press/haptics) require Josh's confirmation. | 🟡 manual, tracked in each `docs/parity/<id>.md` |

## How a new session should start
1. Read this file, `PARITY_STANDARD.md`, `CLAUDE.md` §0, `FEATURE_COMPLETION_MATRIX.md`.
2. Implement any ⬜/🟡 items above that aren't done yet (wire the gates, upgrade the skills).
3. Work the CURRENT PRIORITY (characters) to full parity using the feature loop. Address Josh by name.
