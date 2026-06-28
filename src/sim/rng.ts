// Seeded deterministic PRNG (mulberry32). The sim must never call Math.random() —
// inject an RNG so ticks are reproducible (required for deterministic tests).

export interface RNG {
  next(): number;            // float in [0, 1)
  int(maxExclusive: number): number;
  chance(p: number): boolean;
}

export function makeRNG(seed: number): RNG {
  let s = seed >>> 0;
  const next = (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (maxExclusive: number) => Math.floor(next() * maxExclusive),
    chance: (p: number) => next() < p,
  };
}
