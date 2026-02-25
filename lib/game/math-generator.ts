import { createSeededRandom } from './seeded-random'
import { formatPolynomial } from './expression'

export type GameMode = 'statistics' | 'arithmetic' | 'functions' | 'calculus'

export interface MathProblem {
  question: string
  answer: number
  expressionAnswer?: string // canonical polynomial string for expression-type answers
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
    const baseDifficulty = Math.max(1, Math.min(5, progressDifficulty + randomVariance))
    // Make non-stat modes slightly harder overall while keeping deterministic generation.
    const difficulty =
      mode === 'statistics'
        ? baseDifficulty
        : Math.max(2, Math.min(5, baseDifficulty + 1))

    let problem: MathProblem

    switch (mode) {
      case 'statistics': {
        const cat = Math.floor(rng() * 3)
        problem = cat === 0
          ? genCombinatorics(rng, difficulty)
          : cat === 1
            ? genDiscrete(rng, difficulty)
            : genConditional(rng, difficulty)
        break
      }
      case 'arithmetic':
        problem = genArithmetic(rng, difficulty)
        break
      case 'functions':
        problem = genFunctions(rng, difficulty)
        break
      case 'calculus':
        problem = genCalculus(rng, difficulty)
        break
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

function intBetween(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

// ── COMBINATORICS (Statistics sub-generator) ────────────────────

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

// ── DISCRETE PROBABILITY (Statistics sub-generator) ─────────────

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

// ── CONDITIONAL PROBABILITY (Statistics sub-generator) ──────────

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

// ── ARITHMETIC ──────────────────────────────────────────────────

function genArithmetic(rng: () => number, difficulty: number): MathProblem {
  if (difficulty <= 1) {
    return pick(rng, [
      () => genSimpleAdd(rng),
      () => genSimpleSub(rng),
      () => genTinyMul(rng),
    ])()
  }
  if (difficulty <= 2) {
    return pick(rng, [
      () => genMediumAdd(rng),
      () => genMediumSub(rng),
      () => genSimpleMul(rng),
    ])()
  }
  if (difficulty <= 3) {
    return pick(rng, [
      () => genLargerMul(rng),
      () => genSimpleDiv(rng),
      () => genTwoStepAdd(rng),
    ])()
  }
  if (difficulty <= 4) {
    return pick(rng, [
      () => genMultiStep(rng),
      () => genLargerDiv(rng),
      () => genMixedOps(rng),
    ])()
  }
  return pick(rng, [
    () => genComplexExpr(rng),
    () => genSquareCalc(rng),
    () => genChainMul(rng),
  ])()
}

function genSimpleAdd(rng: () => number): MathProblem {
  const a = intBetween(rng, 2, 9)
  const b = intBetween(rng, 2, 9)
  return { question: `${a} + ${b} = ?`, answer: a + b, difficulty: 1 }
}

function genSimpleSub(rng: () => number): MathProblem {
  const a = intBetween(rng, 5, 15)
  const b = intBetween(rng, 1, a - 1)
  return { question: `${a} - ${b} = ?`, answer: a - b, difficulty: 1 }
}

function genTinyMul(rng: () => number): MathProblem {
  const a = intBetween(rng, 2, 5)
  const b = intBetween(rng, 2, 5)
  return { question: `${a} × ${b} = ?`, answer: a * b, difficulty: 1 }
}

function genMediumAdd(rng: () => number): MathProblem {
  const a = intBetween(rng, 10, 99)
  const b = intBetween(rng, 10, 99)
  return { question: `${a} + ${b} = ?`, answer: a + b, difficulty: 2 }
}

function genMediumSub(rng: () => number): MathProblem {
  const a = intBetween(rng, 30, 99)
  const b = intBetween(rng, 10, a - 1)
  return { question: `${a} - ${b} = ?`, answer: a - b, difficulty: 2 }
}

function genSimpleMul(rng: () => number): MathProblem {
  const a = intBetween(rng, 3, 9)
  const b = intBetween(rng, 3, 9)
  return { question: `${a} × ${b} = ?`, answer: a * b, difficulty: 2 }
}

function genLargerMul(rng: () => number): MathProblem {
  const a = intBetween(rng, 11, 25)
  const b = intBetween(rng, 3, 9)
  return { question: `${a} × ${b} = ?`, answer: a * b, difficulty: 3 }
}

function genSimpleDiv(rng: () => number): MathProblem {
  const b = intBetween(rng, 2, 9)
  const quotient = intBetween(rng, 2, 12)
  const a = b * quotient
  return { question: `${a} ÷ ${b} = ?`, answer: quotient, difficulty: 3 }
}

function genTwoStepAdd(rng: () => number): MathProblem {
  const a = intBetween(rng, 10, 50)
  const b = intBetween(rng, 10, 50)
  const c = intBetween(rng, 10, 50)
  return { question: `${a} + ${b} + ${c} = ?`, answer: a + b + c, difficulty: 3 }
}

function genMultiStep(rng: () => number): MathProblem {
  const a = intBetween(rng, 3, 12)
  const b = intBetween(rng, 3, 9)
  const c = intBetween(rng, 5, 30)
  return { question: `${a} × ${b} + ${c} = ?`, answer: a * b + c, difficulty: 4 }
}

function genLargerDiv(rng: () => number): MathProblem {
  const b = intBetween(rng, 4, 15)
  const quotient = intBetween(rng, 5, 20)
  const a = b * quotient
  return { question: `${a} ÷ ${b} = ?`, answer: quotient, difficulty: 4 }
}

function genMixedOps(rng: () => number): MathProblem {
  const a = intBetween(rng, 3, 9)
  const b = intBetween(rng, 3, 9)
  const c = intBetween(rng, 2, 5)
  const d = intBetween(rng, 2, 5)
  return { question: `${a} × ${b} - ${c} × ${d} = ?`, answer: a * b - c * d, difficulty: 4 }
}

function genComplexExpr(rng: () => number): MathProblem {
  const a = intBetween(rng, 10, 30)
  const b = intBetween(rng, 3, 9)
  const c = intBetween(rng, 10, 50)
  return { question: `${a} × ${b} - ${c} = ?`, answer: a * b - c, difficulty: 5 }
}

function genSquareCalc(rng: () => number): MathProblem {
  const a = intBetween(rng, 5, 15)
  const b = intBetween(rng, 5, 30)
  return { question: `${a}² + ${b} = ?`, answer: a * a + b, difficulty: 5 }
}

function genChainMul(rng: () => number): MathProblem {
  const a = intBetween(rng, 2, 6)
  const b = intBetween(rng, 2, 6)
  const c = intBetween(rng, 2, 6)
  return { question: `${a} × ${b} × ${c} = ?`, answer: a * b * c, difficulty: 5 }
}

// ── FUNCTIONS ───────────────────────────────────────────────────

function genFunctions(rng: () => number, difficulty: number): MathProblem {
  if (difficulty <= 1) {
    return pick(rng, [
      () => genLinearRootEasy(rng),
      () => genEvaluateLinear(rng),
    ])()
  }
  if (difficulty <= 2) {
    return pick(rng, [
      () => genLinearRoot(rng),
      () => genSimpleFOIL(rng),
      () => genEvaluateQuadratic(rng),
    ])()
  }
  if (difficulty <= 3) {
    return pick(rng, [
      () => genQuadraticRootSimple(rng),
      () => genExpandBinomials(rng),
      () => genLinearSystemValue(rng),
    ])()
  }
  if (difficulty <= 4) {
    return pick(rng, [
      () => genQuadraticRootGeneral(rng),
      () => genExpandWithCoeff(rng),
      () => genCubicExpand(rng),
    ])()
  }
  return pick(rng, [
    () => genTripleExpand(rng),
    () => genCubicRoot(rng),
    () => genExpandSquared(rng),
  ])()
}

function genLinearRootEasy(rng: () => number): MathProblem {
  const root = intBetween(rng, 1, 9)
  const a = 1
  const b = -root
  return {
    question: `Solve: x + ${b < 0 ? `(${b})` : b} = 0`,
    answer: root,
    difficulty: 1,
  }
}

function genEvaluateLinear(rng: () => number): MathProblem {
  const a = intBetween(rng, 2, 5)
  const b = intBetween(rng, -5, 10)
  const x = intBetween(rng, 1, 5)
  const bStr = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`
  return {
    question: `f(x) = ${a}x ${bStr}. Find f(${x}).`,
    answer: a * x + b,
    difficulty: 1,
  }
}

function genLinearRoot(rng: () => number): MathProblem {
  const a = intBetween(rng, 2, 6)
  const root = intBetween(rng, -5, 5)
  if (root === 0) return genLinearRoot(rng)
  const b = -a * root
  const bStr = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`
  return {
    question: `Solve: ${a}x ${bStr} = 0`,
    answer: root,
    difficulty: 2,
  }
}

function genSimpleFOIL(rng: () => number): MathProblem {
  const a = intBetween(rng, 1, 4)
  const b = intBetween(rng, 1, 4)
  // (x + a)(x + b) = x^2 + (a+b)x + ab
  const coeffs = [a * b, a + b, 1]
  const bStrA = a >= 0 ? `+ ${a}` : `- ${Math.abs(a)}`
  const bStrB = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`
  return {
    question: `Expand: (x ${bStrA})(x ${bStrB})`,
    answer: 0,
    expressionAnswer: formatPolynomial(coeffs),
    difficulty: 2,
  }
}

function genEvaluateQuadratic(rng: () => number): MathProblem {
  const a = 1
  const b = intBetween(rng, -3, 3)
  const c = intBetween(rng, -5, 5)
  const x = intBetween(rng, -2, 3)
  const bStr = b >= 0 ? `+ ${b}x` : `- ${Math.abs(b)}x`
  const cStr = c >= 0 ? `+ ${c}` : `- ${Math.abs(c)}`
  return {
    question: `f(x) = x² ${bStr} ${cStr}. Find f(${x}).`,
    answer: a * x * x + b * x + c,
    difficulty: 2,
  }
}

function genQuadraticRootSimple(rng: () => number): MathProblem {
  const root = intBetween(rng, 1, 7)
  return {
    question: `Find the positive root: x² - ${root * root} = 0`,
    answer: root,
    difficulty: 3,
  }
}

function genExpandBinomials(rng: () => number): MathProblem {
  const a = intBetween(rng, -4, 4)
  const b = intBetween(rng, -4, 4)
  if (a === 0 || b === 0) return genExpandBinomials(rng)
  // (x + a)(x + b)
  const coeffs = [a * b, a + b, 1]
  const aStr = a >= 0 ? `+ ${a}` : `- ${Math.abs(a)}`
  const bStr = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`
  return {
    question: `Expand: (x ${aStr})(x ${bStr})`,
    answer: 0,
    expressionAnswer: formatPolynomial(coeffs),
    difficulty: 3,
  }
}

function genLinearSystemValue(rng: () => number): MathProblem {
  const x = intBetween(rng, -3, 5)
  const a = intBetween(rng, 2, 4)
  const b = intBetween(rng, 1, 6)
  const result = a * x + b
  const bStr = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`
  return {
    question: `If ${a}x ${bStr} = ${result}, find x.`,
    answer: x,
    difficulty: 3,
  }
}

function genQuadraticRootGeneral(rng: () => number): MathProblem {
  const r1 = intBetween(rng, 1, 6)
  const r2 = intBetween(rng, -6, -1)
  // x^2 - (r1+r2)x + r1*r2 = 0, positive root is r1
  const b = -(r1 + r2)
  const c = r1 * r2
  const bStr = b >= 0 ? `+ ${b}x` : `- ${Math.abs(b)}x`
  const cStr = c >= 0 ? `+ ${c}` : `- ${Math.abs(c)}`
  return {
    question: `Find the positive root: x² ${bStr} ${cStr} = 0`,
    answer: r1,
    difficulty: 4,
  }
}

function genExpandWithCoeff(rng: () => number): MathProblem {
  const k = intBetween(rng, 2, 3)
  const a = intBetween(rng, 1, 4)
  const b = intBetween(rng, -3, 3)
  if (b === 0) return genExpandWithCoeff(rng)
  // (kx + a)(x + b) = kx^2 + (kb + a)x + ab
  const coeffs = [a * b, k * b + a, k]
  const aStr = a >= 0 ? `+ ${a}` : `- ${Math.abs(a)}`
  const bStr = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`
  return {
    question: `Expand: (${k}x ${aStr})(x ${bStr})`,
    answer: 0,
    expressionAnswer: formatPolynomial(coeffs),
    difficulty: 4,
  }
}

function genCubicExpand(rng: () => number): MathProblem {
  const a = intBetween(rng, -3, 3)
  if (a === 0) return genCubicExpand(rng)
  // (x + a)(x^2) = x^3 + ax^2
  const bCoeff = intBetween(rng, -2, 2)
  // (x + a)(x^2 + bx) = x^3 + (a+b)x^2 + abx
  const coeffs = [0, a * bCoeff, a + bCoeff, 1]
  const aStr = a >= 0 ? `+ ${a}` : `- ${Math.abs(a)}`
  const bStr = bCoeff === 0 ? '' : bCoeff > 0 ? ` + ${bCoeff}x` : ` - ${Math.abs(bCoeff)}x`
  return {
    question: `Expand: (x ${aStr})(x²${bStr})`,
    answer: 0,
    expressionAnswer: formatPolynomial(coeffs),
    difficulty: 4,
  }
}

function genTripleExpand(rng: () => number): MathProblem {
  const a = intBetween(rng, 1, 3)
  const b = intBetween(rng, -3, -1)
  const c = intBetween(rng, 1, 3)
  // (x+a)(x+b)(x+c) first: (x+a)(x+b) = x^2 + (a+b)x + ab
  // then multiply by (x+c):
  // x^3 + (a+b+c)x^2 + (ab+ac+bc)x + abc
  const coeffs = [a * b * c, a * b + a * c + b * c, a + b + c, 1]
  const aStr = a >= 0 ? `+ ${a}` : `- ${Math.abs(a)}`
  const bStr = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`
  const cStr = c >= 0 ? `+ ${c}` : `- ${Math.abs(c)}`
  return {
    question: `Expand: (x ${aStr})(x ${bStr})(x ${cStr})`,
    answer: 0,
    expressionAnswer: formatPolynomial(coeffs),
    difficulty: 5,
  }
}

function genCubicRoot(rng: () => number): MathProblem {
  const root = intBetween(rng, 1, 4)
  return {
    question: `Find the positive root: x³ - ${root * root * root} = 0`,
    answer: root,
    difficulty: 5,
  }
}

function genExpandSquared(rng: () => number): MathProblem {
  const a = intBetween(rng, -4, 4)
  if (a === 0) return genExpandSquared(rng)
  // (x + a)^2 = x^2 + 2ax + a^2
  const coeffs = [a * a, 2 * a, 1]
  const aStr = a >= 0 ? `+ ${a}` : `- ${Math.abs(a)}`
  return {
    question: `Expand: (x ${aStr})²`,
    answer: 0,
    expressionAnswer: formatPolynomial(coeffs),
    difficulty: 5,
  }
}

// ── CALCULUS ────────────────────────────────────────────────────

function genCalculus(rng: () => number, difficulty: number): MathProblem {
  if (difficulty <= 1) {
    return pick(rng, [
      () => genPowerRuleSimple(rng),
      () => genPowerRuleCoeff(rng),
      () => genQuadraticDeriv(rng),
    ])()
  }
  if (difficulty <= 2) {
    return pick(rng, [
      () => genPowerRuleCoeff(rng),
      () => genQuadraticDeriv(rng),
      () => genPowerRuleMedium(rng),
    ])()
  }
  if (difficulty <= 3) {
    return pick(rng, [
      () => genPolynomialDeriv(rng),
      () => genHigherPowerDeriv(rng),
      () => genExpDerivEval(rng),
    ])()
  }
  if (difficulty <= 4) {
    return pick(rng, [
      () => genLongerPolyDeriv(rng),
      () => genTrigDerivEval(rng),
      () => genLogDerivEval(rng),
    ])()
  }
  return pick(rng, [
    () => genChainPowerDeriv(rng),
    () => genProductDerivEval(rng),
    () => genFullPolyDeriv(rng),
  ])()
}

function genConstantDeriv(rng: () => number): MathProblem {
  const c = intBetween(rng, 2, 20)
  return {
    question: `d/dx (${c}) = ?`,
    answer: 0,
    difficulty: 1,
  }
}

function genLinearDeriv(rng: () => number): MathProblem {
  const a = intBetween(rng, 2, 9)
  return {
    question: `d/dx (${a}x) = ?`,
    answer: a,
    difficulty: 1,
  }
}

function genPowerRuleSimple(rng: () => number): MathProblem {
  const n = intBetween(rng, 2, 4)
  // d/dx(x^n) = nx^(n-1)
  const derivCoeffs: number[] = new Array(n).fill(0)
  derivCoeffs[n - 1] = n
  return {
    question: `d/dx (x${supNum(n)}) = ?`,
    answer: 0,
    expressionAnswer: formatPolynomial(derivCoeffs),
    difficulty: 1,
  }
}

function genPowerRuleCoeff(rng: () => number): MathProblem {
  const a = intBetween(rng, 2, 6)
  const n = intBetween(rng, 2, 3)
  // d/dx(ax^n) = anx^(n-1)
  const derivCoeffs: number[] = new Array(n).fill(0)
  derivCoeffs[n - 1] = a * n
  return {
    question: `d/dx (${a}x${supNum(n)}) = ?`,
    answer: 0,
    expressionAnswer: formatPolynomial(derivCoeffs),
    difficulty: 2,
  }
}

function genQuadraticDeriv(rng: () => number): MathProblem {
  const a = intBetween(rng, 1, 5)
  const b = intBetween(rng, -5, 5)
  if (b === 0) return genQuadraticDeriv(rng)
  // d/dx(ax^2 + bx) = 2ax + b
  const derivCoeffs = [b, 2 * a]
  const bStr = b > 0 ? `+ ${b}x` : `- ${Math.abs(b)}x`
  return {
    question: `d/dx (${a === 1 ? '' : a}x² ${bStr}) = ?`,
    answer: 0,
    expressionAnswer: formatPolynomial(derivCoeffs),
    difficulty: 2,
  }
}

function genPowerRuleMedium(rng: () => number): MathProblem {
  const a = intBetween(rng, 2, 5)
  const n = intBetween(rng, 3, 4)
  const b = intBetween(rng, 1, 6)
  // d/dx(ax^n + b) = anx^(n-1)
  const derivCoeffs: number[] = new Array(n).fill(0)
  derivCoeffs[n - 1] = a * n
  const bStr = `+ ${b}`
  return {
    question: `d/dx (${a}x${supNum(n)} ${bStr}) = ?`,
    answer: 0,
    expressionAnswer: formatPolynomial(derivCoeffs),
    difficulty: 2,
  }
}

function genPolynomialDeriv(rng: () => number): MathProblem {
  const a = intBetween(rng, 1, 4)
  const b = intBetween(rng, -4, 4)
  const c = intBetween(rng, -5, 5)
  if (b === 0 && c === 0) return genPolynomialDeriv(rng)
  // d/dx(ax^2 + bx + c) = 2ax + b
  const derivCoeffs = [b, 2 * a]
  const bStr = b >= 0 ? `+ ${b}x` : `- ${Math.abs(b)}x`
  const cStr = c >= 0 ? `+ ${c}` : `- ${Math.abs(c)}`
  return {
    question: `d/dx (${a === 1 ? '' : a}x² ${bStr} ${cStr}) = ?`,
    answer: 0,
    expressionAnswer: formatPolynomial(derivCoeffs),
    difficulty: 3,
  }
}

function genHigherPowerDeriv(rng: () => number): MathProblem {
  const a = intBetween(rng, 1, 3)
  const n = intBetween(rng, 3, 5)
  const b = intBetween(rng, -3, 3)
  if (b === 0) return genHigherPowerDeriv(rng)
  // d/dx(ax^n + bx) = anx^(n-1) + b
  const derivCoeffs: number[] = new Array(n).fill(0)
  derivCoeffs[n - 1] = a * n
  derivCoeffs[0] = b
  const bStr = b > 0 ? `+ ${b}x` : `- ${Math.abs(b)}x`
  return {
    question: `d/dx (${a === 1 ? '' : a}x${supNum(n)} ${bStr}) = ?`,
    answer: 0,
    expressionAnswer: formatPolynomial(derivCoeffs),
    difficulty: 3,
  }
}

function genExpDerivEval(rng: () => number): MathProblem {
  // d/dx(e^x) = e^x, evaluate at x = 0 → 1
  return {
    question: `f(x) = eˣ. Find f'(0).`,
    answer: 1,
    difficulty: 3,
  }
}

function genLongerPolyDeriv(rng: () => number): MathProblem {
  const a = intBetween(rng, 1, 3)
  const b = intBetween(rng, -3, 3)
  const c = intBetween(rng, -4, 4)
  const d = intBetween(rng, -5, 5)
  if (b === 0 && c === 0) return genLongerPolyDeriv(rng)
  // d/dx(ax^3 + bx^2 + cx + d) = 3ax^2 + 2bx + c
  const derivCoeffs = [c, 2 * b, 3 * a]
  const bStr = b >= 0 ? `+ ${b}x²` : `- ${Math.abs(b)}x²`
  const cStr = c >= 0 ? `+ ${c}x` : `- ${Math.abs(c)}x`
  const dStr = d >= 0 ? `+ ${d}` : `- ${Math.abs(d)}`
  return {
    question: `d/dx (${a === 1 ? '' : a}x³ ${bStr} ${cStr} ${dStr}) = ?`,
    answer: 0,
    expressionAnswer: formatPolynomial(derivCoeffs),
    difficulty: 4,
  }
}

function genTrigDerivEval(rng: () => number): MathProblem {
  const variant = Math.floor(rng() * 4)
  if (variant === 0) {
    // d/dx(sin x) at x=0 → cos(0) = 1
    return { question: `f(x) = sin(x). Find f'(0).`, answer: 1, difficulty: 4 }
  }
  if (variant === 1) {
    // d/dx(cos x) at x=0 → -sin(0) = 0
    return { question: `f(x) = cos(x). Find f'(0).`, answer: 0, difficulty: 4 }
  }
  if (variant === 2) {
    // d/dx(sin x) at x=π → cos(π) = -1
    return { question: `f(x) = sin(x). Find f'(π).`, answer: -1, difficulty: 4 }
  }
  // d/dx(cos x) at x=π → -sin(π) = 0
  return { question: `f(x) = cos(x). Find f'(π).`, answer: 0, difficulty: 4 }
}

function genLogDerivEval(rng: () => number): MathProblem {
  const x = intBetween(rng, 1, 5)
  // d/dx(ln x) = 1/x
  const answer = parseFloat((1 / x).toFixed(4))
  return {
    question: `f(x) = ln(x). Find f'(${x}).`,
    answer,
    difficulty: 4,
  }
}

function genChainPowerDeriv(rng: () => number): MathProblem {
  const a = intBetween(rng, 2, 4)
  const n = intBetween(rng, 4, 6)
  const b = intBetween(rng, -3, 3)
  const c = intBetween(rng, -3, 3)
  if (b === 0 && c === 0) return genChainPowerDeriv(rng)
  // d/dx(ax^n + bx^2 + cx) = anx^(n-1) + 2bx + c
  const derivCoeffs: number[] = new Array(n).fill(0)
  derivCoeffs[n - 1] = a * n
  derivCoeffs[1] = 2 * b
  derivCoeffs[0] = c
  const bStr = b >= 0 ? `+ ${b}x²` : `- ${Math.abs(b)}x²`
  const cStr = c >= 0 ? `+ ${c}x` : `- ${Math.abs(c)}x`
  return {
    question: `d/dx (${a}x${supNum(n)} ${bStr} ${cStr}) = ?`,
    answer: 0,
    expressionAnswer: formatPolynomial(derivCoeffs),
    difficulty: 5,
  }
}

function genProductDerivEval(rng: () => number): MathProblem {
  // d/dx(x * e^x) at x = 0 → e^0 + 0*e^0 = 1
  const variant = Math.floor(rng() * 3)
  if (variant === 0) {
    return { question: `f(x) = x·eˣ. Find f'(0).`, answer: 1, difficulty: 5 }
  }
  if (variant === 1) {
    // d/dx(x^2 * e^x) at x=0 → 2*0*e^0 + 0^2*e^0 = 0
    return { question: `f(x) = x²·eˣ. Find f'(0).`, answer: 0, difficulty: 5 }
  }
  // d/dx(x * ln(x)) at x=1 → ln(1) + 1 = 1
  return { question: `f(x) = x·ln(x). Find f'(1).`, answer: 1, difficulty: 5 }
}

function genFullPolyDeriv(rng: () => number): MathProblem {
  const a = intBetween(rng, 1, 2)
  const b = intBetween(rng, -3, 3)
  const c = intBetween(rng, -3, 3)
  const d = intBetween(rng, -4, 4)
  const e = intBetween(rng, -5, 5)
  if (b === 0 && c === 0 && d === 0) return genFullPolyDeriv(rng)
  // d/dx(ax^4 + bx^3 + cx^2 + dx + e) = 4ax^3 + 3bx^2 + 2cx + d
  const derivCoeffs = [d, 2 * c, 3 * b, 4 * a]
  const bStr = b >= 0 ? `+ ${b}x³` : `- ${Math.abs(b)}x³`
  const cStr = c >= 0 ? `+ ${c}x²` : `- ${Math.abs(c)}x²`
  const dStr = d >= 0 ? `+ ${d}x` : `- ${Math.abs(d)}x`
  const eStr = e >= 0 ? `+ ${e}` : `- ${Math.abs(e)}`
  return {
    question: `d/dx (${a === 1 ? '' : a}x⁴ ${bStr} ${cStr} ${dStr} ${eStr}) = ?`,
    answer: 0,
    expressionAnswer: formatPolynomial(derivCoeffs),
    difficulty: 5,
  }
}

// ── Display helpers ─────────────────────────────────────────────

function supNum(n: number): string {
  const sup: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  }
  return String(n).split('').map(c => sup[c] ?? c).join('')
}
