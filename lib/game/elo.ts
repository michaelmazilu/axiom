/**
 * Elo rating calculation.
 * K-factor of 16 for smaller rating changes per match (1 point instead of 2).
 */
const K = 16

/** Calculate the expected score for player A against player B */
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
 * @param ratingA - Current rating of player A
 * @param ratingB - Current rating of player B
 * @param scoreA - Actual score: 1 (win), 0.5 (draw), 0 (loss)
 */
export function calculateElo(
  ratingA: number,
  ratingB: number,
  scoreA: number
): EloResult {
  const expectedA = expectedScore(ratingA, ratingB)
  const expectedB = expectedScore(ratingB, ratingA)
  const scoreB = 1 - scoreA

  const deltaA = Math.round(K * (scoreA - expectedA))
  const deltaB = Math.round(K * (scoreB - expectedB))

  return {
    newRatingA: Math.max(100, ratingA + deltaA),
    newRatingB: Math.max(100, ratingB + deltaB),
    deltaA,
    deltaB,
  }
}
