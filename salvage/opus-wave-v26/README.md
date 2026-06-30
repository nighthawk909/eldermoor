# Salvage — `claude/opus-wave-v26` (retired fork)

Reference code rescued from the parallel **`claude/opus-wave-v26`** fork (a divergent
"v26" line built by another agent) before that branch was retired, so no work is lost.

**Provenance:** fork tip `856d318`, branched from canonical **v25** (`88eaa61`) — i.e.
*before* canonical v26 (lesson gating), v27 (tick), v28–v29 (mobile UI), v30 (test infra),
v31 (QA sync). These files are **reference only — NOT wired into the build.** They target
the v25 API and must be **ported onto the current v31 line and re-verified** when their
milestone comes up. Do not import them as-is.

## What's here (genuinely new — not on canonical)
- **`worn-render.js`** (214 lines) — attaches THREE primitive meshes (weapon/shield) to the
  player rig on `EMEQUIP.worn` change; `window.EMWORNRENDER.refresh`. → Port during **Milestone 1B
  (equipment)** / the "Equipment renders on the 3D avatar" backlog item. Note: reads
  `EMEQUIP.worn`; on canonical that value is `{id,count}` (handle both shapes).
- **`bank.js`** (598 lines) — bank **depth**: search filter, withdraw-as-note (cosmetic),
  placeholders, tab row. → Port during the **bank-depth** backlog item. This is the fork's full
  bank module (diverged from canonical `src/bank.js`); cherry-pick the depth features, don't blind-replace.
- **`full.patch`** — the complete fork diff vs the v25 merge-base (includes the above plus the
  fork's own `gating.js`/`prayer-tab.js`, which are **duplicate** divergent versions of features
  canonical already shipped — ignore those).

## Not salvaged (already on canonical, newer)
Lesson gating (canonical `gating.js`, v26), prayer points (v25), Make-X/SFX (v25), version bumps.

## Why the fork was retired
Two agents on one project caused a production-alias tug-of-war (the fork had `vercel --prod`'d
its v26 over `eldermoor.vercel.app`). Canonical is `claude/modular-v23` (v31); prod is v31.
Retiring the fork removes the competing deployable line. The fork's unique value lives here.
