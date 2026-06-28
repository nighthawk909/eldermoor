# HANDOFF.md — Eldermoor

Session state for the next agent/session. Pairs with CLAUDE.md.

_Last updated: 2026-06-27_

---

## Status

Art direction is locked. The **Adventurer** model is in **active iteration** (no longer
"approved-final" — a revision pass just landed, see Changelog). Full-quality GPU renders
run clean on this machine: **1800×2250 @ 384 spp, ~2m34s on OptiX**. Repo is live at
`github.com/nighthawk909/eldermoor` (private) with a `render-smoke` CI check.

## Changelog

- **2026-06-27 — model revision pass (this machine):** addressed look feedback on the
  hero. (1) **Sword is now gripped** by the near hand — grip/crossguard/pommel aligned to
  a beefed-up fist with a forearm bridging the sleeve cuff (was floating ~0.16 forward of
  the hand). (2) **Boots rebuilt** as rounded shoes — heel + arched sole + tapered upper +
  spherical toe cap + ankle cuff (were flat axis-aligned slabs). (3) **Less blocky overall**
  — global bevel width up (cube 0.012 / cyl 0.008) and segments 2→3. (4) **Clothing defined**
  — rounded leather spaulders, neck collar, sleeve cuffs, flared tunic hem over the belt.
  Output path now resolves relative `--out` against the script folder (was failing to `C:\`).

## Done

- Visual language defined: faceted flat-shading, palette, three-point + AgX-Punchy grade
  (see CLAUDE.md §4).
- `eldermoor.html` — interactive web prototype (look + interaction reference).
- `build_eldermoor.py` — builds the Adventurer (sculpted head, shaped boots, sword/shield/
  cape, slim proportions), three-point lighting, DOF camera, GPU auto-detect, production
  defaults. Verified to run headless; geometry confirmed correct on a CPU smoke render.

## Decided

- Original-assets IP guardrail (CLAUDE.md §2).
- Free-now / pay-to-scale cost philosophy.
- Blender → engine asset pipeline; Cycles GPU rendering.

## Open questions

- **Engine lock:** Unity is the working lean (free → seats). Confirm vs. Godot 4 / web-first
  before any heavy engine investment.
- **Browser vs. native** delivery target (affects engine + pipeline).
- **Texture pass** timing — geometry-only face vs. painted skin/eye map.

## Immediate next steps

1. Run full-quality render and confirm GPU:
   ```
   blender --background --python build_eldermoor.py
   ```
   Check log for `[eldermoor] render device: GPU (...)`. Open `eldermoor_hero.png`.
2. Report render time + GPU device back to the chat thread for quality judgment.
3. On approval: add `build_merchant()` + `build_brute()`, render a **cast lineup**, and a
   **turntable** of the hero.

## Files

- `build_eldermoor.py` — generator/renderer
- `eldermoor.html` — web prototype (open in a browser)
- `README.md` — quick start
- `CLAUDE.md` — durable project context/rules
