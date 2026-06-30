/* =====================================================================
   Deterministic seeded RNG (mulberry32) + small helpers. Same seed →
   same character, so the factory is reproducible and the "Regenerate"
   button just advances the seed.
   ===================================================================== */

export type Rng = () => number;

/** mulberry32 — tiny, fast, deterministic PRNG in [0,1). */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** float in [min,max) */
export function range(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** pick a random element */
export function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

/** small symmetric jitter around 1.0, e.g. jitter(rng,0.1) -> ~[0.9,1.1] */
export function jitter(rng: Rng, amount: number): number {
  return 1 + (rng() * 2 - 1) * amount;
}
