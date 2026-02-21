import { createSeededRandom } from './seeded-random'

export type GameMode = 'probability'

export interface MathProblem {
  question: string
  answer: number
  difficulty: number // 1-5
}

/**
 * Generate a sequence of probability problems from a seed.
 * Both players get identical problems in the same order.
 */
export function generateProblems(
  seed: string,
  _mode: GameMode,
  count: number = 30
): MathProblem[] {
  const rng = createSeededRandom(seed)
  const problems: MathProblem[] = []

  for (let i = 0; i < count; i++) {
    const progressDifficulty = Math.min(5, Math.floor(i / 6) + 1)
    const randomVariance = Math.floor(rng() * 2) - 1
    const difficulty = Math.max(1, Math.min(5, progressDifficulty + randomVariance))

    problems.push(generateProbability(rng, difficulty))
  }

  return problems
}

function factorial(n: number): number {
  let result = 1
  for (let i = 2; i <= n; i++) result *= i
  return result
}

function combinations(n: number, r: number): number {
  if (r > n) return 0
  if (r === 0 || r === n) return 1
  return factorial(n) / (factorial(r) * factorial(n - r))
}

function permutations(n: number, r: number): number {
  return factorial(n) / factorial(n - r)
}

function generateProbability(rng: () => number, difficulty: number): MathProblem {
  if (difficulty <= 1) {
    return pickRandom(rng, [
      () => genCoinOutcomes(rng),
      () => genDieBasic(rng),
      () => genSimpleFactorial(rng),
    ])()
  }

  if (difficulty <= 2) {
    return pickRandom(rng, [
      () => genCoinOutcomes(rng),
      () => genDiceSumWays(rng),
      () => genSmallCombination(rng),
      () => genBagDraw(rng),
    ])()
  }

  if (difficulty <= 3) {
    return pickRandom(rng, [
      () => genCombination(rng),
      () => genPermutation(rng),
      () => genHandshakes(rng),
      () => genComplementCoin(rng),
      () => genDiceSumWays(rng),
    ])()
  }

  if (difficulty <= 4) {
    return pickRandom(rng, [
      () => genLargerCombination(rng),
      () => genPermutation(rng),
      () => genArrangeWithConstraint(rng),
      () => genMultipleEvents(rng),
    ])()
  }

  // Difficulty 5
  return pickRandom(rng, [
    () => genLargerCombination(rng),
    () => genComplexCounting(rng),
    () => genMultipleEvents(rng),
    () => genArrangeWithConstraint(rng),
  ])()
}

function pickRandom<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

// --- Difficulty 1 generators ---

function genCoinOutcomes(rng: () => number): MathProblem {
  const n = Math.floor(rng() * 3) + 2 // 2-4 coins
  const answer = Math.pow(2, n)
  return {
    question: `${n} coins are flipped. How many possible outcomes?`,
    answer,
    difficulty: n <= 3 ? 1 : 2,
  }
}

function genDieBasic(rng: () => number): MathProblem {
  const target = Math.floor(rng() * 6) + 1
  const total = 6
  return {
    question: `A fair die is rolled. How many outcomes are ≥ ${target}?`,
    answer: total - target + 1,
    difficulty: 1,
  }
}

function genSimpleFactorial(rng: () => number): MathProblem {
  const n = Math.floor(rng() * 3) + 3 // 3-5
  return {
    question: `${n}! = ?`,
    answer: factorial(n),
    difficulty: 1,
  }
}

// --- Difficulty 2 generators ---

function genDiceSumWays(rng: () => number): MathProblem {
  const sumWays: Record<number, number> = {
    2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6,
    8: 5, 9: 4, 10: 3, 11: 2, 12: 1,
  }
  const sums = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  const target = sums[Math.floor(rng() * sums.length)]
  return {
    question: `Two dice are rolled. How many ways to get a sum of ${target}?`,
    answer: sumWays[target],
    difficulty: 2,
  }
}

function genSmallCombination(rng: () => number): MathProblem {
  const n = Math.floor(rng() * 3) + 4 // 4-6
  const r = Math.floor(rng() * 2) + 2 // 2-3
  return {
    question: `C(${n}, ${r}) = ?`,
    answer: combinations(n, r),
    difficulty: 2,
  }
}

function genBagDraw(rng: () => number): MathProblem {
  const red = Math.floor(rng() * 5) + 2
  const blue = Math.floor(rng() * 5) + 2
  const total = red + blue
  const pickColor = rng() > 0.5
  const favorable = pickColor ? red : blue
  const color = pickColor ? 'red' : 'blue'
  return {
    question: `A bag has ${red} red and ${blue} blue marbles. Pick 1. Favorable outcomes for ${color} out of ${total}?`,
    answer: favorable,
    difficulty: 2,
  }
}

// --- Difficulty 3 generators ---

function genCombination(rng: () => number): MathProblem {
  const n = Math.floor(rng() * 4) + 5 // 5-8
  const r = Math.floor(rng() * 3) + 2 // 2-4
  const actual_r = Math.min(r, n - 1)
  return {
    question: `C(${n}, ${actual_r}) = ?`,
    answer: combinations(n, actual_r),
    difficulty: 3,
  }
}

function genPermutation(rng: () => number): MathProblem {
  const n = Math.floor(rng() * 3) + 5 // 5-7
  const r = Math.floor(rng() * 2) + 2 // 2-3
  return {
    question: `P(${n}, ${r}) = ?`,
    answer: permutations(n, r),
    difficulty: 3,
  }
}

function genHandshakes(rng: () => number): MathProblem {
  const n = Math.floor(rng() * 6) + 5 // 5-10
  return {
    question: `${n} people each shake hands with everyone else exactly once. Total handshakes?`,
    answer: combinations(n, 2),
    difficulty: 3,
  }
}

function genComplementCoin(rng: () => number): MathProblem {
  const n = Math.floor(rng() * 3) + 3 // 3-5
  const total = Math.pow(2, n)
  return {
    question: `${n} coins flipped. How many outcomes have at least one head?`,
    answer: total - 1,
    difficulty: 3,
  }
}

// --- Difficulty 4 generators ---

function genLargerCombination(rng: () => number): MathProblem {
  const n = Math.floor(rng() * 4) + 7 // 7-10
  const r = Math.floor(rng() * 3) + 2 // 2-4
  const actual_r = Math.min(r, n - 1)
  return {
    question: `C(${n}, ${actual_r}) = ?`,
    answer: combinations(n, actual_r),
    difficulty: n >= 9 ? 5 : 4,
  }
}

function genArrangeWithConstraint(rng: () => number): MathProblem {
  const n = Math.floor(rng() * 3) + 4 // 4-6
  // Ways to arrange n people in a line where 1 specific person must be first
  const answer = factorial(n - 1)
  return {
    question: `${n} people line up. Person A must be first. How many arrangements?`,
    answer,
    difficulty: 4,
  }
}

function genMultipleEvents(rng: () => number): MathProblem {
  const shirts = Math.floor(rng() * 3) + 3 // 3-5
  const pants = Math.floor(rng() * 3) + 3 // 3-5
  const hats = Math.floor(rng() * 2) + 2 // 2-3
  return {
    question: `${shirts} shirts, ${pants} pants, ${hats} hats. How many outfits?`,
    answer: shirts * pants * hats,
    difficulty: 4,
  }
}

// --- Difficulty 5 generators ---

function genComplexCounting(rng: () => number): MathProblem {
  const type = Math.floor(rng() * 3)

  if (type === 0) {
    // Committee with roles from a group
    const n = Math.floor(rng() * 3) + 6 // 6-8
    const r = 3
    return {
      question: `From ${n} people, choose a president, VP, and secretary. How many ways?`,
      answer: permutations(n, r),
      difficulty: 5,
    }
  }

  if (type === 1) {
    // Paths on a grid
    const right = Math.floor(rng() * 2) + 2 // 2-3
    const down = Math.floor(rng() * 2) + 2 // 2-3
    const total = right + down
    return {
      question: `Grid paths: ${right} steps right, ${down} steps down. How many shortest paths?`,
      answer: combinations(total, right),
      difficulty: 5,
    }
  }

  // Derangement-adjacent: total arrangements minus fixed
  const n = Math.floor(rng() * 2) + 4 // 4-5
  const totalArr = factorial(n)
  // Arrangements where person A is NOT in seat 1
  const answer = totalArr - factorial(n - 1)
  return {
    question: `${n} people, ${n} seats. How many arrangements where person A is NOT in seat 1?`,
    answer,
    difficulty: 5,
  }
}
