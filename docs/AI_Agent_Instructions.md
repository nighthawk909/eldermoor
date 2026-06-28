# Eldermoor — AI Agent Instructions (build discipline)

Binding process for whoever (human or Claude) builds Eldermoor. Pairs with `CLAUDE.md` §0.

## The per-module loop (one module at a time)
For each module in the active phase's build order:
1. **SPEC** — author/confirm `docs/modules/<Module>.md` containing: purpose, **data model**,
   behavior, **edge cases**, **acceptance criteria** (testable), and a **manual QA checklist**.
   Do not code beyond what the spec defines.
2. **TESTS-WITH-IMPLEMENTATION** — write Vitest tests for the acceptance criteria *as you build*
   the module in `src/sim/…`. Headless: no DOM/THREE/`Math.random()` in sim code.
3. **WIRE** — connect render/UI/input as needed (these can be tested by manual QA).
4. **MANUAL QA** — play it in a real browser like a user (clicks, long-press, screenshots).
   Logic passing in a test is **not** sufficient to mark done.
5. **VERIFY** — `npm test` green + manual QA checklist passes + acceptance criteria met.
6. **RECORD** — flip the row in `FEATURE_COMPLETION_MATRIX.md` to `Done` with date + "tests: N passing".
7. **COMMIT/PR** — one module ≈ one branch ≈ one PR; CI (smoke + Vitest) must be green to merge.

## Hard rules
- **Never mark complete unless all acceptance criteria pass** (automated + manual).
- **Never silently skip functionality.** If you can't finish an item, leave it `Blocked`/`Partial`
  in the matrix with **reason · blocker · next step**, and don't claim the module done.
- **If a feature is too large, split into sub-features** (new matrix rows) — never simplify it away.
- **No content from memory/assumption.** Build only what the spec defines. Missing spec → write it
  first (or open a tracked TODO), don't guess.
- **Determinism in sim** — seeded RNG injected; same inputs ⇒ same tick output (so tests are stable).
- **Working systems over visual polish.**
- Keep `main` always-playable: smoke check + Vitest + manual QA before every merge.

## Definition of Done (per module)
Acceptance criteria pass · automated tests pass · manual QA checklist passes in a real browser ·
matrix row updated · merged with green CI. Anything short of that is `Partial` with a tracked next step.
