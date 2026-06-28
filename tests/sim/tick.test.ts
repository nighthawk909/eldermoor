import { describe, it, expect } from 'vitest';
import { TickEngine, type System } from '../../src/sim/tick.js';
import { makeRNG } from '../../src/sim/rng.js';
import { makeWorld, addEntity, serializeWorld, type Entity } from '../../src/sim/world.js';

class FakeClock {
  t = 0;
  now() { return this.t; }
  advance(ms: number) { this.t += ms; }
}

function engine(systems: System[], opts: Partial<{ seed: number; clock: FakeClock; maxCatchUp: number; msPerTick: number }> = {}) {
  const clock = opts.clock ?? new FakeClock();
  const e = new TickEngine({
    world: makeWorld(),
    rng: makeRNG(opts.seed ?? 1),
    systems,
    clock,
    maxCatchUp: opts.maxCatchUp ?? 5,
    msPerTick: opts.msPerTick ?? 600,
  });
  return { e, clock };
}

describe('Tick engine', () => {
  it('AC1: step(1) advances tickCount by exactly 1 and runs every system once', () => {
    let a = 0, b = 0;
    const { e } = engine([() => a++, () => b++]);
    e.step(1);
    expect(e.tickCount).toBe(1);
    expect(a).toBe(1);
    expect(b).toBe(1);
    e.step(1);
    expect(e.tickCount).toBe(2);
    expect(a).toBe(2);
  });

  it('AC2: systems execute in the fixed (array) order', () => {
    const order: string[] = [];
    const { e } = engine([
      () => order.push('movement'),
      () => order.push('skilling'),
      () => order.push('combat'),
    ]);
    e.step(1);
    expect(order).toEqual(['movement', 'skilling', 'combat']);
  });

  it('AC3: scheduleIn(3, fn) fires on exactly the 3rd subsequent tick, once', () => {
    let fired = 0;
    let firedAtTick = -1;
    const { e } = engine([]);
    e.scheduleIn(3, () => { fired++; firedAtTick = e.tickCount; });
    e.step(1); expect(fired).toBe(0);
    e.step(1); expect(fired).toBe(0);
    e.step(1); expect(fired).toBe(1); expect(firedAtTick).toBe(3);
    e.step(5); expect(fired).toBe(1); // never fires again
  });

  it('AC4: deterministic — identical seed + state + systems ⇒ identical state after 100 ticks', () => {
    const accumulate: System = (ctx) => {
      const acc = ctx.world.entities.get('acc') as Entity;
      (acc.sum as number) += ctx.rng.next();
      (acc.ticks as number) += 1;
    };
    const mk = () => {
      const world = makeWorld();
      addEntity(world, { id: 'acc', sum: 0, ticks: 0 });
      const e = new TickEngine({ world, rng: makeRNG(12345), systems: [accumulate], clock: new FakeClock() });
      return { e, world };
    };
    const A = mk();
    const B = mk();
    A.e.step(100);
    B.e.step(100);
    expect(serializeWorld(A.world)).toBe(serializeWorld(B.world));
    expect((A.world.entities.get('acc') as Entity).ticks).toBe(100);
  });

  it('AC5: catch-up is bounded after a long gap (no spiral)', () => {
    let ticks = 0;
    const clock = new FakeClock();
    const { e } = engine([() => ticks++], { clock, maxCatchUp: 5 });
    e.advance();              // first call initializes the clock baseline (no ticks)
    expect(ticks).toBe(0);
    clock.advance(5000);      // ~8.3 ticks worth of time
    e.advance();
    expect(ticks).toBe(5);    // capped at maxCatchUp, not 8
    expect(e.tickCount).toBe(5);
  });

  it('AC6: start/stop toggle running; setRate changes cadence', () => {
    const clock = new FakeClock();
    let ticks = 0;
    const { e } = engine([() => ticks++], { clock, msPerTick: 600 });
    expect(e.running).toBe(false);
    e.start();
    expect(e.running).toBe(true);
    e.stop();
    expect(e.running).toBe(false);

    // setRate while stopped, then drive via advance(): 900ms at 300ms/tick = 3 ticks
    e.setRate(300);
    e.advance();            // init baseline
    clock.advance(900);
    e.advance();
    expect(ticks).toBe(3);
  });

  it('step() auto-pauses if running, then advances', () => {
    const { e } = engine([]);
    e.start();
    expect(e.running).toBe(true);
    e.step(2);
    expect(e.running).toBe(false);
    expect(e.tickCount).toBe(2);
  });
});
