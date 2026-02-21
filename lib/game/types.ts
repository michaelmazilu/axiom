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

export const MODE_LABELS: Record<GameMode, string> = {
  combinatorics: 'Combinatorics',
  discrete: 'Discrete Probability',
  conditional: 'Conditional Probability',
  all: 'All Topics',
}

export const MODE_DESCRIPTIONS: Record<GameMode, string> = {
  combinatorics: 'Counting, permutations, and combinations',
  discrete: 'Outcomes, sample spaces, and probability counting',
  conditional: 'Counting under conditions and restrictions',
  all: 'Mix of all probability topics',
}

export const GAME_MODES: GameMode[] = ['all', 'combinatorics', 'discrete', 'conditional']
