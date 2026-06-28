# Module: Quest flow (`src/sim/quest.ts`)

Headless, deterministic, immutable step machine driving guided progression (Tutorial Island).

## Model
- **QuestDef** — `{ id, name, steps[] }`; authored as data (the Tutorial Island step list lives in
  the world data, not in code).
- **QuestStep** — `{ id, instruction, condition }`. `instruction` is the HUD objective text.
- **QuestCondition** — one of:
  - `{ type: 'talk', target }` — talk-to an NPC id
  - `{ type: 'interact', target }` — use/examine an object id (a skill station)
  - `{ type: 'reach', x, y }` — arrive at a tile
- **QuestState** — `{ questId, stepIndex, done }`. `stepIndex === steps.length ⇒ done`.
- **QuestEvent** — what the player did this tick (mirrors the condition shapes).

## API
- `startQuest(def) → QuestState` — step 0 (or done if no steps).
- `currentStep(def, state) → QuestStep | null` — the active objective (null when done).
- `conditionMet(cond, ev) → boolean` — pure match (type + target/coords).
- `applyEvent(def, state, ev) → QuestState` — advances **immutably** iff the active step's
  condition is met; events after completion are no-ops.
- `progress(def, state) → { current, total }` — for a HUD readout.

## Guarantees
- Pure + deterministic (no `Math.random`, no clock); always returns a new state object.
- The client emits events from the existing interaction layer (talk/interact) and movement
  (reach) and feeds them to `applyEvent`; the HUD shows `currentStep().instruction`.

## Tests — `tests/sim/quest.test.ts` (8): start, non-match no-op, advance, immutability,
reach match, completion, post-completion no-op, progress.
