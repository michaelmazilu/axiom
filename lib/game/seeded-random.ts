/**
 * Mulberry32 — a fast, deterministic PRNG seeded from a string.
 * Given the same seed, both players generate identical problem sequences.
 */
export function createSeededRandom(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i)
    h |= 0
  }

  let state = h >>> 0

  return function next(): number {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Generate a random match seed string */
export function generateMatchSeed(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
