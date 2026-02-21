import { createSeededRandom } from './seeded-random'

export type GameMode = 'combinatorics' | 'discrete' | 'conditional' | 'all'

export interface MathProblem {
  question: string
  answer: number
  difficulty: number // 1-5
}

/**
 * Generate a sequence of problems from a deterministic seed.
 * Both players get identical problems in the same order.
 * Duplicate questions are skipped to guarantee variety.
 */
export function generateProblems(
  seed: string,
  mode: GameMode,
  count: number = 30
): MathProblem[] {
  const rng = createSeededRandom(seed)
  const problems: MathProblem[] = []
  const seen = new Set<string>()
  let attempts = 0

  while (problems.length < count && attempts < count * 10) {
    attempts++
    const progressDifficulty = Math.min(5, Math.floor(problems.length / 6) + 1)
    const randomVariance = Math.floor(rng() * 2) - 1
    const difficulty = Math.max(1, Math.min(5, progressDifficulty + randomVariance))

    let problem: MathProblem

    if (mode === 'all') {
      const cat = Math.floor(rng() * 3)
      problem = cat === 0
        ? genCombinatorics(rng, difficulty)
        : cat === 1
          ? genDiscrete(rng, difficulty)
          : genConditional(rng, difficulty)
    } else if (mode === 'combinatorics') {
      problem = genCombinatorics(rng, difficulty)
    } else if (mode === 'discrete') {
      problem = genDiscrete(rng, difficulty)
    } else {
      problem = genConditional(rng, difficulty)
    }

    if (!seen.has(problem.question)) {
      seen.add(problem.question)
      problems.push(problem)
    }
  }

  return problems
}

// ── Utility ──────────────────────────────────────────

function factorial(n: number): number {
  let result = 1
  for (let i = 2; i <= n; i++) result *= i
  return result
}

function C(n: number, r: number): number {
  if (r > n || r < 0) return 0
  if (r === 0 || r === n) return 1
  return factorial(n) / (factorial(r) * factorial(n - r))
}

function P(n: number, r: number): number {
  if (r > n) return 0
  return factorial(n) / factorial(n - r)
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

// ── COMBINATORICS ────────────────────────────────────

function genCombinatorics(rng: () => number, difficulty: number): MathProblem {
  if (difficulty <= 1) {
    return pick(rng, [
      () => genFactorial(rng),
      () => genMultiplyBasic(rng),
    ])()
  }
  if (difficulty <= 2) {
    return pick(rng, [
      () => genSmallCombination(rng),
      () => genSmallPermutation(rng),
      () => genMultiplyBasic(rng),
    ])()
  }
  if (difficulty <= 3) {
    return pick(rng, [
      () => genCombinationMed(rng),
      () => genPermutationMed(rng),
      () => genHandshakes(rng),
    ])()
  }
  if (difficulty <= 4) {
    return pick(rng, [
      () => genLargerCombination(rng),
      () => genArrangeConstraint(rng),
      () => genOutfits(rng),
    ])()
  }
  return pick(rng, [
    () => genCommitteeRoles(rng),
    () => genGridPaths(rng),
    () => genNotInSeat(rng),
  ])()
}

function genFactorial(rng: () => number): MathProblem {
  const n = Math.floor(rng() * 4) + 3
  return { question: `${n}! = ?`, answer: factorial(n), difficulty: 1 }
}

function genMultiplyBasic(rng: () => number): MathProblem {
  const a = Math.floor(rng() * 4) + 2
  const b = Math.floor(rng() * 4) + 2
  return {
    question: `${a} shirts and ${b} pants. How many outfits?`,
    answer: a * b,
    difficulty: a + b > 7 ? 2 : 1,
  }
}

function genSmallCombination(rng: () => number): MathProblem {
  const n = Math.floor(rng() * 3) + 4
  const r = Math.floor(rng() * 2) + 2
  return { question: `C(${n}, ${r}) = ?`, answer: C(n, r), difficulty: 2 }
}

function genSmallPermutation(rng: () => number): MathProblem {
  const n = Math.floor(rng() * 2) + 4
  const r = 2
  return { question: `P(${n}, ${r}) = ?`, answer: P(n, r), difficulty: 2 }
}

function genCombinationMed(rng: () => number): MathProblem {
  const n = Math.floor(rng() * 4) + 5
  const r = Math.min(Math.floor(rng() * 3) + 2, n - 1)
  return { question: `C(${n}, ${r}) = ?`, answer: C(n, r), difficulty: 3 }
}

function genPermutationMed(rng: () => number): MathProblem {
  const n = Math.floor(rng() * 3) + 5
  const r = Math.floor(rng() * 2) + 2
  return { question: `P(${n}, ${r}) = ?`, answer: P(n, r), difficulty: 3 }
}

function genHandshakes(rng: () => number): MathProblem {
  const n = Math.floor(rng() * 6) + 5
  return {
    question: `${n} people each shake hands once with everyone else. Total handshakes?`,
    answer: C(n, 2),
    difficulty: 3,
  }
}

function genLargerCombination(rng: () => number): MathProblem {
  const n = Math.floor(rng() * 4) + 7
  const r = Math.min(Math.floor(rng() * 3) + 2, n - 1)
  return { question: `C(${n}, ${r}) = ?`, answer: C(n, r), difficulty: 4 }
}

function genArrangeConstraint(rng: () => number): MathProblem {
  const n = Math.floor(rng() * 3) + 4
  return {
    question: `${n} people line up. Person A must be first. How many arrangements?`,
    answer: factorial(n - 1),
    difficulty: 4,
  }
}

function genOutfits(rng: () => number): MathProblem {
  const a = Math.floor(rng() * 3) + 3
  const b = Math.floor(rng() * 3) + 3
  const c = Math.floor(rng() * 2) + 2
  return {
    question: `${a} shirts, ${b} pants, ${c} hats. How many outfits?`,
    answer: a * b * c,
    difficulty: 4,
  }
}

function genCommitteeRoles(rng: () => number): MathProblem {
  const n = Math.floor(rng() * 3) + 6
  return {
    question: `From ${n} people, choose a president, VP, and secretary. How many ways?`,
    answer: P(n, 3),
    difficulty: 5,
  }
}

function genGridPaths(rng: () => number): MathProblem {
  const right = Math.floor(rng() * 2) + 2
  const down = Math.floor(rng() * 2) + 2
  return {
    question: `Grid: ${right} steps right, ${down} steps down. How many shortest paths?`,
    answer: C(right + down, right),
    difficulty: 5,
  }
}

function genNotInSeat(rng: () => number): MathProblem {
  const n = Math.floor(rng() * 2) + 4
  return {
    question: `${n} people, ${n} seats. Arrangements where person A is NOT in seat 1?`,
    answer: factorial(n) - factorial(n - 1),
    difficulty: 5,
  }
}

// ── DISCRETE PROBABILITY ─────────────────────────────

function genDiscrete(rng: () => number, difficulty: number): MathProblem {
  if (difficulty <= 1) {
    return pick(rng, [
      () => genCoinTotal(rng),
      () => genDieOutcomes(rng),
    ])()
  }
  if (difficulty <= 2) {
    return pick(rng, [
      () => genDiceSumWays(rng),
      () => genBagFavorable(rng),
      () => genCoinTotal(rng),
    ])()
  }
  if (difficulty <= 3) {
    return pick(rng, [
      () => genComplementCoin(rng),
      () => genExactHeads(rng),
      () => genDiceSumWays(rng),
    ])()
  }
  if (difficulty <= 4) {
    return pick(rng, [
      () => genExactDraw(rng),
      () => genDiceAtLeast(rng),
    ])()
  }
  return pick(rng, [
    () => genLargerExactDraw(rng),
    () => genNoSixes(rng),
  ])()
}

function genCoinTotal(rng: () => number): MathProblem {
  const n = Math.floor(rng() * 4) + 2
  return {
    question: `${n} coins are flipped. How many total possible outcomes?`,
    answer: Math.pow(2, n),
    difficulty: n <= 3 ? 1 : 2,
  }
}

function genDieOutcomes(rng: () => number): MathProblem {
  const target = Math.floor(rng() * 5) + 1
  return {
    question: `A fair die is rolled. How many outcomes show ≥ ${target}?`,
    answer: 7 - target,
    difficulty: 1,
  }
}

function genDiceSumWays(rng: () => number): MathProblem {
  const sumWays: Record<number, number> = {
    2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6,
    8: 5, 9: 4, 10: 3, 11: 2, 12: 1,
  }
  const sums = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  const target = pick(rng, sums)
  return {
    question: `Two dice are rolled. How many ways to get a sum of ${target}?`,
    answer: sumWays[target],
    difficulty: target === 7 || target === 2 || target === 12 ? 2 : 3,
  }
}

function genBagFavorable(rng: () => number): MathProblem {
  const red = Math.floor(rng() * 5) + 2
  const blue = Math.floor(rng() * 5) + 2
  const total = red + blue
  const isRed = rng() > 0.5
  const favorable = isRed ? red : blue
  const color = isRed ? 'red' : 'blue'
  return {
    question: `Bag: ${red} red, ${blue} blue (${total} total). Draw 1. Favorable outcomes for ${color}?`,
    answer: favorable,
    difficulty: 2,
  }
}

function genComplementCoin(rng: () => number): MathProblem {
  const n = Math.floor(rng() * 3) + 3
  return {
    question: `${n} coins flipped. How many outcomes have at least 1 head?`,
    answer: Math.pow(2, n) - 1,
    difficulty: 3,
  }
}

function genExactHeads(rng: () => number): MathProblem {
  const n = Math.floor(rng() * 3) + 4
  const k = Math.floor(rng() * (n - 1)) + 1
  return {
    question: `${n} coins flipped. How many outcomes have exactly ${k} heads?`,
    answer: C(n, k),
    difficulty: 3,
  }
}

function genExactDraw(rng: () => number): MathProblem {
  const red = Math.floor(rng() * 3) + 4
  const blue = Math.floor(rng() * 3) + 3
  const draw = 3
  const wantRed = Math.floor(rng() * 2) + 1
  const wantBlue = draw - wantRed
  if (wantBlue > blue || wantRed > red) {
    return {
      question: `Bag: ${red} red, ${blue} blue. Draw 2. Ways to get 1 red and 1 blue?`,
      answer: red * blue,
      difficulty: 4,
    }
  }
  return {
    question: `Bag: ${red} red, ${blue} blue. Draw ${draw}. Ways to get exactly ${wantRed} red?`,
    answer: C(red, wantRed) * C(blue, wantBlue),
    difficulty: 4,
  }
}

function genDiceAtLeast(rng: () => number): MathProblem {
  const n = Math.floor(rng() * 2) + 2
  return {
    question: `Roll ${n} dice. How many outcomes have at least one 6?`,
    answer: Math.pow(6, n) - Math.pow(5, n),
    difficulty: 4,
  }
}

function genLargerExactDraw(rng: () => number): MathProblem {
  const red = Math.floor(rng() * 3) + 5
  const blue = Math.floor(rng() * 3) + 4
  const draw = 4
  const wantRed = 2
  return {
    question: `Bag: ${red} red, ${blue} blue. Draw ${draw}. Ways to get exactly ${wantRed} red?`,
    answer: C(red, wantRed) * C(blue, draw - wantRed),
    difficulty: 5,
  }
}

function genNoSixes(rng: () => number): MathProblem {
  const n = Math.floor(rng() * 2) + 3
  return {
    question: `Roll ${n} dice. How many outcomes have NO sixes?`,
    answer: Math.pow(5, n),
    difficulty: 5,
  }
}

// ── CONDITIONAL PROBABILITY ──────────────────────────

function genConditional(rng: () => number, difficulty: number): MathProblem {
  if (difficulty <= 1) {
    return pick(rng, [
      () => genGivenEven(rng),
      () => genGivenRemaining(rng),
    ])()
  }
  if (difficulty <= 2) {
    return pick(rng, [
      () => genGivenGtThreshold(rng),
      () => genGivenAtLeastOneHead(rng),
    ])()
  }
  if (difficulty <= 3) {
    return pick(rng, [
      () => genGivenDiceSum(rng),
      () => genGivenFirstPerson(rng),
    ])()
  }
  if (difficulty <= 4) {
    return pick(rng, [
      () => genGivenOnCommittee(rng),
      () => genGivenInFirstK(rng),
    ])()
  }
  return pick(rng, [
    () => genGivenBothIncluded(rng),
    () => genGivenAdjacent(rng),
  ])()
}

function genGivenEven(rng: () => number): MathProblem {
  const variant = Math.floor(rng() * 4)
  if (variant === 0) {
    return { question: 'A die is rolled. Given it shows an even number, how many possible values?', answer: 3, difficulty: 1 }
  }
  if (variant === 1) {
    return { question: 'A die is rolled. Given it shows an odd number, how many possible values?', answer: 3, difficulty: 1 }
  }
  if (variant === 2) {
    return { question: 'A die is rolled. Given it shows a prime, how many possible values?', answer: 3, difficulty: 1 }
  }
  const t = Math.floor(rng() * 3) + 2
  return {
    question: `A die is rolled. Given it shows ≤ ${t}, how many possible values?`,
    answer: t,
    difficulty: 1,
  }
}

function genGivenRemaining(rng: () => number): MathProblem {
  const red = Math.floor(rng() * 4) + 3
  const blue = Math.floor(rng() * 4) + 2
  const total = red + blue
  return {
    question: `Bag: ${red} red, ${blue} blue (${total} total). 1 red marble is drawn. How many marbles remain?`,
    answer: total - 1,
    difficulty: 1,
  }
}

function genGivenGtThreshold(rng: () => number): MathProblem {
  const t = Math.floor(rng() * 4) + 2
  return {
    question: `A die is rolled. Given it shows > ${t}, how many possible values?`,
    answer: 6 - t,
    difficulty: 2,
  }
}

function genGivenAtLeastOneHead(rng: () => number): MathProblem {
  const n = Math.floor(rng() * 2) + 2
  return {
    question: `${n} coins flipped. Given at least 1 is heads, how many outcomes?`,
    answer: Math.pow(2, n) - 1,
    difficulty: 2,
  }
}

function genGivenDiceSum(rng: () => number): MathProblem {
  const sumWays: Record<number, number> = {
    3: 2, 4: 3, 5: 4, 6: 5, 7: 6,
    8: 5, 9: 4, 10: 3, 11: 2,
  }
  const target = pick(rng, [3, 4, 5, 6, 7, 8, 9, 10, 11])
  return {
    question: `Two dice rolled. Given the sum is ${target}, how many outcomes satisfy this?`,
    answer: sumWays[target],
    difficulty: 3,
  }
}

function genGivenFirstPerson(rng: () => number): MathProblem {
  const n = Math.floor(rng() * 3) + 4
  return {
    question: `${n} people in a line. Given person A is first, how many arrangements for the rest?`,
    answer: factorial(n - 1),
    difficulty: 3,
  }
}

function genGivenOnCommittee(rng: () => number): MathProblem {
  const n = Math.floor(rng() * 3) + 7
  const r = Math.floor(rng() * 2) + 3
  return {
    question: `Committee of ${r} from ${n}. Given person A is on it, how many ways to choose the rest?`,
    answer: C(n - 1, r - 1),
    difficulty: 4,
  }
}

function genGivenInFirstK(rng: () => number): MathProblem {
  const n = Math.floor(rng() * 3) + 5
  const k = 2
  return {
    question: `${n} people in a line. Given A is in the first ${k} positions, how many total arrangements?`,
    answer: k * factorial(n - 1),
    difficulty: 4,
  }
}

function genGivenBothIncluded(rng: () => number): MathProblem {
  const n = Math.floor(rng() * 3) + 8
  const r = Math.floor(rng() * 2) + 4
  return {
    question: `Select ${r} from ${n} people. Given A and B are both selected, ways to choose the rest?`,
    answer: C(n - 2, r - 2),
    difficulty: 5,
  }
}

function genGivenAdjacent(rng: () => number): MathProblem {
  const n = Math.floor(rng() * 2) + 4
  return {
    question: `${n} people in a line. Given A and B must be adjacent, how many arrangements?`,
    answer: 2 * factorial(n - 1),
    difficulty: 5,
  }
}
