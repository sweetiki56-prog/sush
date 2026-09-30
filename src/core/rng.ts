export type Rng = () => number;

/** Seeded PRNG (mulberry32). Tests inject it for deterministic skill checks. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sequence RNG for tests: returns the given values in order, then repeats the last. */
export function fixedRng(values: number[]): Rng {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}
