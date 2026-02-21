import type { GameMode } from './math-generator'

export interface PlayerState {
  id: string
  displayName: string
  elo: number
  score: number
  currentProblem: number
  streak: number
}

export interface MatchState {
  id: string
  mode: GameMode
  seed: string
  player1: PlayerState
  player2: PlayerState
  status: 'waiting' | 'countdown' | 'playing' | 'finished'
  timeRemaining: number
  startedAt: number | null
}

export interface MatchResult {
  matchId: string
  mode: GameMode
  winnerId: string | null // null = draw
  player1: {
    id: string
    displayName: string
    score: number
    eloBefore: number
    eloAfter: number
    delta: number
  }
  player2: {
    id: string
    displayName: string
    score: number
    eloBefore: number
    eloAfter: number
    delta: number
  }
}

/** Events broadcast over Supabase Realtime */
export type GameEvent =
  | { type: 'player_ready'; playerId: string }
  | { type: 'countdown_start'; startsAt: number }
  | { type: 'answer_submitted'; playerId: string; problemIndex: number; correct: boolean; newScore: number }
  | { type: 'game_over'; result: MatchResult }

export const MATCH_DURATION = 120 // seconds
export const COUNTDOWN_DURATION = 3 // seconds

export const MODE_LABEL = 'Probability'
export const MODE_DESCRIPTION = '1v1 competitive probability — counting, combinations, and chance'
