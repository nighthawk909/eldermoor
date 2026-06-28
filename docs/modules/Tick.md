# Module: Tick Engine

**Phase 1 · build #1.** The heartbeat every other system runs on. Headless, deterministic, testable.

## Purpose
Advance the whole simulation in fixed **600ms** steps. Provide ordered system execution, a tick
counter, scheduling (run X in N ticks), and debug controls (pause / step / set rate). Decouple
simulation from rendering.

## Data model
```ts
interface TickContext {
  tick: number;            // monotonic tick counter
  dtMs: 600;               // fixed
  rng: RNG;                // seeded PRNG (no Math.random in sim)
  world: World;            // entity store + tile grid
}
type System = (ctx: TickContext) => void;     // mutates world; no DOM/THREE
interface Scheduler { at(tick:number, fn:()=>void): void; in(ticks:number, fn:()=>void): void; }
interface TickEngine {
  tickCount: number; running: boolean;
  systems: System[];       // executed in fixed order each tick
  start(): void; stop(): void; step(n?:number): void;  // step works while paused (debug)
  setRate(msPerTick:number): void;                      // debug only; default 600
}
```
System order (fixed): `movement → interaction/skilling → combat → npcAI → timers → stateMachine`.

## Behavior
- A wall-clock driver (setInterval/accumulator) calls `tickOnce()` every 600ms when running.
- `tickOnce()`: increment counter → run due scheduler callbacks → run each system in order →
  emit `tick` event.
- Render loop is **separate** (rAF) and never advances the tick; it interpolates using
  `(now - lastTickTime)/600`.
- Determinism: `tickOnce()` depends only on world state + injected `rng` + scheduled callbacks.

## Edge cases
- **Tab backgrounded / rAF throttled:** the tick driver uses an accumulator against `performance.now()`
  so catch-up is bounded (max N catch-up ticks per frame, e.g. 5) — never spiral.
- **Long pause then resume:** do **not** fast-forward thousands of ticks; clamp catch-up.
- **`step()` while running:** ignored or auto-pauses first (defined: auto-pause then step).
- **Re-entrancy:** a system must not trigger a nested tick; scheduler callbacks run at tick start only.
- **Time source in tests:** injectable clock (no real timers in unit tests; advance manually).

## Acceptance criteria (testable)
1. `step(1)` advances `tickCount` by exactly 1 and runs every system once, in order.
2. Systems execute in the fixed order (assert via a recording stub).
3. `scheduler.in(3, fn)` fires `fn` on exactly the 3rd subsequent tick, once.
4. With a seeded RNG and identical starting state, 100 ticks produce byte-identical serialized
   state across two runs (determinism).
5. Accumulator driver: simulating a 5s gap advances at most the catch-up cap, not ~8 ticks unbounded.
6. `stop()` halts advancement; `start()` resumes; `setRate()` changes cadence (debug).

## Manual QA checklist (browser, via debug panel)
- [ ] Debug panel shows a live tick counter incrementing ~every 0.6s.
- [ ] "Pause" stops it; "Step" advances exactly one tick (counter +1); "Resume" continues.
- [ ] Background the tab 5s, return → no huge tick jump (counter advanced by a small bounded amount).
- [ ] Movement/skilling visibly resolve on tick boundaries (not per-frame).

## Tests (Vitest) — `tests/sim/tick.test.ts`
Cover all 6 acceptance criteria with an injected clock + recording systems + seeded RNG.
