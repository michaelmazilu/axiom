import type { MathProblem } from './math-generator'
import { parsePolynomial, comparePolynomials } from './expression'

/**
 * Unified answer checking for both numeric and polynomial expression answers.
 */
export function checkAnswer(problem: MathProblem, userInput: string): boolean {
  const trimmed = userInput.trim()
  if (!trimmed) return false

  if (problem.expressionAnswer !== undefined) {
    return checkExpressionAnswer(problem.expressionAnswer, trimmed)
  }

  const numAnswer = parseFloat(trimmed)
  if (isNaN(numAnswer)) return false
  return Math.abs(numAnswer - problem.answer) < 0.01
}

function checkExpressionAnswer(canonical: string, userInput: string): boolean {
  const expected = parsePolynomial(canonical)
  const actual = parsePolynomial(userInput)

  if (expected && actual) {
    return comparePolynomials(expected, actual)
  }

  // Fallback: exact string comparison after normalization
  return normalizeStr(canonical) === normalizeStr(userInput)
}

function normalizeStr(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase()
}
