// Tick engine — the simulation heartbeat. Fixed 600ms ticks, deterministic, headless.
// See docs/modules/Tick.md for the spec + acceptance criteria.
import type { RNG } from './rng.js';
import type { World } from './world.js';

export interface TickContext {
  tick: number;
  dtMs: 600;
  rng: RNG;
  world: World;
}

export type System = (ctx: TickContext) => void;

export interface Clock {
  now(): number;
}
export const realClock: Clock = { now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) };

export interface TickEngineOptions {
  world: World;
  rng: RNG;
  systems: System[];        // executed in this fixed order every tick
  msPerTick?: number;       // default 600
  clock?: Clock;            // injectable for tests
  maxCatchUp?: number;      // bound catch-up after a pause/throttle (default 5)
}

export class TickEngine {
  tickCount = 0;
  running = false;
  systems: System[];

  private world: World;
  private rng: RNG;
  private msPerTick: number;
  private clock: Clock;
  private maxCatchUp: number;
  private acc = 0;
  private last = 0;
  private started = false;
  private scheduled = new Map<number, Array<() => void>>();
  private listeners: Array<(tick: number) => void> = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(o: TickEngineOptions) {
    this.world = o.world;
    this.rng = o.rng;
    this.systems = o.systems;
    this.msPerTick = o.msPerTick ?? 600;
    this.clock = o.clock ?? realClock;
    this.maxCatchUp = o.maxCatchUp ?? 5;
  }

  onTick(fn: (tick: number) => void): void {
    this.listeners.push(fn);
  }

  /** Run fn at the start of the given absolute tick number (once). */
  scheduleAt(tick: number, fn: () => void): void {
    const a = this.scheduled.get(tick) ?? [];
    a.push(fn);
    this.scheduled.set(tick, a);
  }
  /** Run fn N ticks from now (min 1). */
  scheduleIn(ticks: number, fn: () => void): void {
    this.scheduleAt(this.tickCount + Math.max(1, ticks), fn);
  }

  private tickOnce(): void {
    this.tickCount++;
    const due = this.scheduled.get(this.tickCount);
    if (due) {
      this.scheduled.delete(this.tickCount);
      for (const fn of due) fn();
    }
    const ctx: TickContext = { tick: this.tickCount, dtMs: 600, rng: this.rng, world: this.world };
    for (const sys of this.systems) sys(ctx);
    for (const l of this.listeners) l(this.tickCount);
  }

  /** Advance based on elapsed wall-clock, with bounded catch-up (no spiral-of-death). */
  advance(): void {
    const t = this.clock.now();
    if (!this.started) { this.started = true; this.last = t; return; }
    this.acc += t - this.last;
    this.last = t;
    let n = 0;
    while (this.acc >= this.msPerTick && n < this.maxCatchUp) {
      this.acc -= this.msPerTick;
      this.tickOnce();
      n++;
    }
    if (this.acc > this.msPerTick) this.acc = 0; // drop unprocessed backlog beyond the cap
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.started = false;
    this.timer = setInterval(() => this.advance(), Math.min(this.msPerTick, 50));
  }

  stop(): void {
    this.running = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  /** Debug: advance exactly n ticks. Auto-pauses if running (per spec). */
  step(n = 1): void {
    if (this.running) this.stop();
    for (let i = 0; i < n; i++) this.tickOnce();
  }

  /** Debug: change cadence. */
  setRate(msPerTick: number): void {
    this.msPerTick = msPerTick;
    if (this.running) { this.stop(); this.start(); }
  }
}
