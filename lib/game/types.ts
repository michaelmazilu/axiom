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
  statistics: 'Statistics',
  arithmetic: 'Arithmetic',
  functions: 'Functions',
  calculus: 'Calculus',
}

export const MODE_DESCRIPTIONS: Record<GameMode, string> = {
  statistics: 'Probability & counting',
  arithmetic: 'Speed fundamentals',
  functions: 'Algebra mastery',
  calculus: 'Derivative sprints',
}

export const GAME_MODES: GameMode[] = ['statistics', 'arithmetic', 'functions', 'calculus']

/**
 * Map legacy database mode values to current modes for display.
 */
export const LEGACY_MODE_MAP: Record<string, GameMode> = {
  all: 'statistics',
  combinatorics: 'statistics',
  discrete: 'statistics',
  conditional: 'statistics',
  probability: 'statistics',
}

/** Resolve a stored mode string to a current GameMode, handling legacy values. */
export function resolveMode(stored: string): GameMode {
  if (GAME_MODES.includes(stored as GameMode)) return stored as GameMode
  return LEGACY_MODE_MAP[stored] ?? 'statistics'
}
