---
name: game-feature
description: >
  Build ONE Eldermoor player feature to full OSRS parity, depth-first, no shortcuts. Use for any
  "build/extend the <equipment|inventory|combat|skill|quest|dialogue|bank|characters> feature."
  Enforces: research parity → enumerate sub-features → build+QA each sub-feature SEQUENTIALLY →
  gate → merge. Read docs/PARITY_STANDARD.md + docs/PROCESS_INFRASTRUCTURE.md first.
---

# Eldermoor — Deep Feature Build (parity-gated, sub-feature-sequential)

This is how we build, every time. Treat it as a shippable product. No lean, no half-built, no
"good enough." Address the owner as **Josh**.

## Step 1 — RESEARCH parity
Research how Old School RuneScape actually does this feature. Write down the full behavior:
every interaction, every right-click (desktop) / long-press (mobile) option, every edge case.
(Use prior knowledge; web-research if unsure. Original IP only — match behavior, not assets/names.)

## Step 2 — ENUMERATE sub-features (the QA checklist)
Turn the research into `docs/parity/<id>.md`: a checklist where **each box is one micro-feature**
that must independently work + be tested + QA'd. This is the QA contract. Example (equipment):
open interface · show slots · wield from inventory · remove to inventory (full-inv guard) · examine ·
right-click/long-press menu · bonuses panel updates · etc. — each its own box.

## Step 3 — BUILD + QC each sub-feature SEQUENTIALLY (the inner loop)
For micro-feature #1, then #2, … in order — **do not start the next until the current is done**:
1. Implement just that micro-feature (sim + render/ui as needed).
2. Test it (Vitest for logic).
3. **QA it like a player** in the browser (real clicks; phone-width for touch).
4. For device-only items (tap/long-press/**haptics**), post it to Josh's mobile QA list; he confirms.
5. Check its box in `docs/parity/<id>.md`. Only then move to the next.

## Step 4 — GATE + DONE
When every box is checked: `npm run smoke && npm test && npm run typecheck && npm run parity` green,
matrix row → `Done`, commit/PR/merge with green CI. `npm run parity` will refuse "Done" if any box
is unchecked — that's the safety net.

## Architecture (per docs/Technical_Architecture.md §5)
One chunk per system: `src/sim/<area>/<x>.ts` + `src/data/…` + `docs/modules/<X>.md` +
`docs/parity/<x>.md` + `tests/sim/<x>.test.ts`. Assets come from the `assets/` library via `render/`
factories — author once, place by data, never re-model inline.

## Hard don'ts
- Don't build sub-features 1–10 in parallel; one fully done at a time, QC along the way.
- Don't mark a box/feature done off a console call — player-level QA required (Josh confirms device-only).
- Don't start a new feature while the current parity checklist has an unchecked box.
