# 02_AI_DEV_WORKFLOW.md — how we guarantee parity & kill back-and-forth

The single biggest risk to this project is **iteration thrash**: vague specs → I build the wrong
thing → owner corrects → repeat. This document defines the process that makes that not happen.
The contract: **the owner reviews for taste and direction, never to catch my defects.**

_Codified 2026-06-28._

---

## 1. The 10-stage feature process (never skip)

Analyze → Architect → Design → Document → Build → Test → Refactor → Benchmark → Verify → Mark
Complete. Stages 1–4 produce the spec; 5–9 are run **by me, internally, in a loop** until the
spec's acceptance passes; only then does the owner see it.

## 2. Every parity-critical item carries four things

A spec line is not "drafted" until it has all four. This is what makes it executable without guessing:

1. **Annotated reference.** The OSRS-equivalent screenshot (reference only — never reused as
   asset), with the specific features that must match called out in words: "stone blocks ~0.6
   tiles wide, visible darker mortar, two tonal variants, running bond."
2. **Measurable acceptance criteria.** Numbers, not adjectives. Dimensions in tiles, palette in
   hex, poly budget, counts, positions, states. "Wall height = 1.5 tiles (3.0 units)," not "tall
   walls."
3. **Verification procedure.** Exactly how done-ness is checked: "render from the game camera
   (`40_ART_SPEC` §2) at 1600×1100; each checklist row pass/fail against the reference."
4. **Tests.** Unit/integration for logic; for art, the render-compare checklist is the test.

If any of the four is missing, the spec is incomplete and the back-and-forth risk is live. Fix the
spec, not the code.

## 3. The internal verification loop (where iteration actually lives)

For any buildable item, I run this **myself** before surfacing it:

```
BUILD   → produce the asset/feature exactly to spec
RENDER  → render from the game camera / run the feature (GPU)
COMPARE → side-by-side vs the annotated reference; score each acceptance row
CRITIQUE→ write down every row that fails and WHY
FIX     → correct the specific failure
REPEAT  → until every acceptance row passes
SURFACE → only now show the owner, with the passed checklist attached
```

This is the same loop we used today on the kit corner (v1 stone failed → diagnosed UV/orientation
bug → v2 passed). The owner saw v2, not v1. That's the model for everything.

## 4. Reference library

Parity needs references on hand. We keep an annotated reference set per system (screenshots are
study material, never shipped assets) under `docs/_reference/` with a notes file per image listing
the measurable targets. A feature's spec links its reference. (IP: study only, `03_IP_AND_ORIGINALITY`.)

## 5. Definition of done (parity items)

Done = **every acceptance row passes its verification**, AND the `00_PROJECT_VISION` §8 gates
(documented/tested/modular/performant/reusable/expandable/integrated/no-known-issues/on-aesthetic/
original) are met. "It renders" or "it runs" is not done.

## 6. What this buys the owner

- **First-go quality:** you see work that already passed its own checklist.
- **Bounded reviews:** you're judging taste against a reference, not hunting bugs.
- **Trust is structural, not promised:** the spec *is* the contract; the checklist *is* the proof.
  If something's off, we fix the spec's acceptance row, and it's permanently nailed.

## 7. Owner's role

Set direction, taste, and priorities; approve specs at the depth shown in `43_ENVIRONMENT_KIT`
(Chapel worked example). Once a spec's acceptance is approved, execution is deterministic and
needs no further owner input until it surfaces, passed.
