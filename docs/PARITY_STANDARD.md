# Eldermoor — Parity Standard (HARD DEFINITION OF DONE)

> We are building a **shippable product**. Depth over width. Build ONE feature completely before
> starting the next. The framing question for every feature is: **"Am I at parity with OSRS — or
> better?"** If any interaction a player would expect is missing, the feature is **not done**.

## The rule
A **player feature** is `Done` only when ALL of these hold:
1. **OSRS-parity interaction set** — every option a player expects works. Example for an item in the
   inventory: **Use / Wield(or Wear) / Eat(if food) / Bury(if bones) / Drop(→ ground item) / Examine
   (shows the description) / Use-on (item→item, item→object, item→NPC) / drag-to-rearrange**.
   Not "the inventory opens." All of it.
2. **Automated tests** (Vitest) cover the logic of every option.
3. **Mobile QA checklist** in `docs/parity/<id>.md` is **100% checked** — including the items only
   Josh can confirm on a real phone (tap, long-press, **haptics**). Claude fills the code-verifiable
   boxes; Josh confirms the device-only boxes and reports back.
4. CI green (tests + typecheck + smoke + parity-gate).

## No-drift mechanics (enforced, not promised)
- **`scripts/parity-gate.mjs`** runs in the pre-commit hook AND CI. It scans this matrix: any row
  tagged `parity:<id>` whose status says `Done` MUST have `docs/parity/<id>.md` with **zero unchecked
  boxes**. Otherwise the commit/CI **fails**. → You cannot mark a feature done without finishing its
  parity checklist.
- **`.claude/skills/game-feature`** is the build loop: checklist-first, build every option, test,
  mobile-QA, then advance. One feature at a time.
- **Engine primitives** (tick/grid/pathfinding/containers) are tracked separately and gated by tests
  only — they are building blocks, not the player feature. A primitive being tested ≠ the feature done.

## Per-feature parity checklist template (`docs/parity/<id>.md`)
```
# Parity: <Feature>
Reference bar: OSRS <equivalent>. Done only when every box is checked.
## Interactions (each must work + have a test)
- [ ] <option 1> …
## Mobile QA (Josh confirms on device)
- [ ] tap works first try
- [ ] long-press opens options
- [ ] haptic buzz on action
## Tests
- [ ] vitest: <file> covers each interaction
```

## Hard don'ts
- Don't start feature N+1 while feature N has an unchecked parity box.
- Don't mark `Done` to "make progress." Half-built is `In Progress` with the remaining boxes listed.
- Don't claim a device-only item (haptics/touch) verified — that's Josh's sign-off.
