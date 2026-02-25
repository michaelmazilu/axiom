/**
 * Elo rating calculation using probability-based statistics.
 * 
 * Core concept: ELO estimates the probability that a player wins, then updates
 * ratings based on the actual outcome.
 * 
 * The system is self-balancing: equal skill → equal ratings → equal expected outcomes.
 */
const K = 18

/**
 * Calculate the expected score (win probability) for player A against player B.
 * 
 * Formula: Expected Score = 1 / (1 + 10^((OpponentRating - YourRating) / 400))
 * 
 * Examples:
 * - Equal ratings (800 vs 800): Expected = 0.5 (50% chance)
 * - 400 points higher: Expected ≈ 0.91 (91% chance)
 * - 400 points lower: Expected ≈ 0.09 (9% chance)
 * 
 * The 400 is a scaling factor: a 400-point gap means about a 10:1 win probability.
 * This comes from a logistic model where log-odds of winning are proportional
 * to the rating difference.
 */
function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

export interface EloResult {
  newRatingA: number
  newRatingB: number
  deltaA: number
  deltaB: number
}

/**
 * Calculate new Elo ratings after a match.
 * 
 * Rating Update Formula: New Rating = Old Rating + K × (Actual Score - Expected Score)
 * 
 * How it works:
 * - If you win when expected to win: small gain
 * - If you win when expected to lose: large gain
 * - If you lose when expected to win: large loss
 * - If you lose when expected to lose: small loss
 * 
 * For equal ratings:
 * - Expected score = 0.5 (50/50 chance)
 * - Winner gains 9 points, loser loses 9 points (half the maximum ±18)
 * - Draw results in no change (0 points)
 * 
 * @param ratingA - Current rating of player A
 * @param ratingB - Current rating of player B
 * @param scoreA - Actual score: 1 (win), 0.5 (draw), 0 (loss)
 */
export function calculateElo(
  ratingA: number,
  ratingB: number,
  scoreA: number
): EloResult {
  // Calculate expected win probability for each player
  const expectedA = expectedScore(ratingA, ratingB)
  const expectedB = expectedScore(ratingB, ratingA)
  const scoreB = 1 - scoreA

  // Update ratings based on actual vs expected performance
  // K-factor (18) controls how much ratings change per match
  const deltaA = Math.round(K * (scoreA - expectedA))
  const deltaB = Math.round(K * (scoreB - expectedB))

  return {
    newRatingA: Math.max(100, ratingA + deltaA),
    newRatingB: Math.max(100, ratingB + deltaB),
    deltaA,
    deltaB,
  }
}
