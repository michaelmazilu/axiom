'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { generateProblems } from '@/lib/game/math-generator'
import type { GameMode, MathProblem } from '@/lib/game/math-generator'
import { MATCH_DURATION, COUNTDOWN_DURATION } from '@/lib/game/types'
import type { MatchResult, GameEvent } from '@/lib/game/types'
import { GameTimer } from './game-timer'
import { ProblemDisplay } from './problem-display'
import { ScoreBar } from './score-bar'
import { MatchResults } from './match-results'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface PlayerInfo {
  id: string
  displayName: string
  elo: number
}

interface MatchClientProps {
  matchId: string
  mode: GameMode
  seed: string
  currentUserId: string
  isPlayer1: boolean
  player1: PlayerInfo
  player2: PlayerInfo
}

type MatchPhase = 'waiting' | 'countdown' | 'playing' | 'finished'

export function MatchClient({
  matchId,
  mode,
  seed,
  currentUserId,
  isPlayer1,
  player1,
  player2,
}: MatchClientProps) {
  const [phase, setPhase] = useState<MatchPhase>('waiting')
  const [countdown, setCountdown] = useState(COUNTDOWN_DURATION)
  const [timeRemaining, setTimeRemaining] = useState(MATCH_DURATION)
  const [myScore, setMyScore] = useState(0)
  const [opponentScore, setOpponentScore] = useState(0)
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0)
  const [currentProblem, setCurrentProblem] = useState<MathProblem | null>(null)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null)
  const [result, setResult] = useState<MatchResult | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const problemsRef = useRef<MathProblem[]>([])
  const lockedProblemRef = useRef<MathProblem | null>(null)
  const lockedIndexRef = useRef<number>(0)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const me = isPlayer1 ? player1 : player2
  const opponent = isPlayer1 ? player2 : player1

  useEffect(() => {
    const problems = generateProblems(seed, mode, 50)
    problemsRef.current = problems
    // Set the first problem immediately and lock it
    if (problems.length > 0) {
      lockedProblemRef.current = problems[0]
      lockedIndexRef.current = 0
      setCurrentProblem(problems[0])
      setCurrentProblemIndex(0)
    }
  }, [seed, mode])

  const finishGame = useCallback(async (finalMyScore: number, finalOpponentScore: number) => {
    if (timerRef.current) clearInterval(timerRef.current)
    setPhase('finished')

    let winnerId: string | null = null
    if (finalMyScore > finalOpponentScore) {
      winnerId = currentUserId
    } else if (finalOpponentScore > finalMyScore) {
      winnerId = opponent.id
    }

    const matchResult: MatchResult = {
      matchId,
      mode,
      winnerId,
      player1: {
        id: player1.id,
        displayName: player1.displayName,
        score: isPlayer1 ? finalMyScore : finalOpponentScore,
        eloBefore: player1.elo,
        eloAfter: player1.elo,
        delta: 0,
      },
      player2: {
        id: player2.id,
        displayName: player2.displayName,
        score: isPlayer1 ? finalOpponentScore : finalMyScore,
        eloBefore: player2.elo,
        eloAfter: player2.elo,
        delta: 0,
      },
    }

    setResult(matchResult)

    channelRef.current?.send({
      type: 'broadcast',
      event: 'game_event',
      payload: { type: 'game_over', result: matchResult } satisfies GameEvent,
    })

    try {
      const supabase = createClient()
      const { calculateElo } = await import('@/lib/game/elo')
      const myElo = me.elo
      const oppElo = opponent.elo
      const scoreA = winnerId === currentUserId ? 1 : winnerId === null ? 0.5 : 0
      const eloResult = calculateElo(myElo, oppElo, scoreA)

      await supabase
        .from('matches')
        .update({
          player1_score: isPlayer1 ? finalMyScore : finalOpponentScore,
          player2_score: isPlayer1 ? finalOpponentScore : finalMyScore,
          winner_id: winnerId,
          player1_elo_after: isPlayer1 ? eloResult.newRatingA : eloResult.newRatingB,
          player2_elo_after: isPlayer1 ? eloResult.newRatingB : eloResult.newRatingA,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', matchId)

      const newElo = isPlayer1 ? eloResult.newRatingA : eloResult.newRatingB
      const myDelta = isPlayer1 ? eloResult.deltaA : eloResult.deltaB

      await supabase
        .from('profiles')
        .update({ elo_probability: newElo })
        .eq('id', currentUserId)

      setResult((prev) => {
        if (!prev) return prev
        const p1Delta = isPlayer1 ? myDelta : -myDelta
        return {
          ...prev,
          player1: {
            ...prev.player1,
            eloAfter: isPlayer1 ? eloResult.newRatingA : eloResult.newRatingB,
            delta: p1Delta,
          },
          player2: {
            ...prev.player2,
            eloAfter: isPlayer1 ? eloResult.newRatingB : eloResult.newRatingA,
            delta: -p1Delta,
          },
        }
      })
    } catch {
      // Match continues even if DB update fails
    }
  }, [currentUserId, isPlayer1, matchId, me.elo, mode, opponent.id, opponent.elo, player1, player2])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`match:${matchId}`, {
      config: { broadcast: { self: false } },
    })

    channel
      .on('broadcast', { event: 'game_event' }, ({ payload }) => {
        const event = payload as GameEvent

        if (event.type === 'player_ready') {
          setPhase('countdown')
        }

        if (event.type === 'answer_submitted') {
          if (event.playerId !== currentUserId) {
            setOpponentScore(event.newScore)
          }
        }

        if (event.type === 'game_over') {
          if (timerRef.current) clearInterval(timerRef.current)
          setPhase('finished')
          setResult(event.result)
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.send({
            type: 'broadcast',
            event: 'game_event',
            payload: { type: 'player_ready', playerId: currentUserId } satisfies GameEvent,
          })

          setTimeout(() => {
            setPhase((current) => {
              if (current === 'waiting') return 'countdown'
              return current
            })
          }, 2000)
        }
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [matchId, currentUserId])

  useEffect(() => {
    if (phase !== 'countdown') return

    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval)
          setPhase('playing')
          return 0
        }
        return c - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [phase])

  useEffect(() => {
    if (phase !== 'playing') return

    // Ensure current problem is set when starting to play
    if (!lockedProblemRef.current && problemsRef.current.length > 0) {
      lockedProblemRef.current = problemsRef.current[0]
      lockedIndexRef.current = 0
      setCurrentProblem(problemsRef.current[0])
      setCurrentProblemIndex(0)
    }

    inputRef.current?.focus()

    timerRef.current = setInterval(() => {
      setTimeRemaining((t) => {
        if (t <= 1) {
          setTimeRemaining(0)
          return 0
        }
        return t - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => {
    if (phase === 'playing' && timeRemaining === 0) {
      finishGame(myScore, opponentScore)
    }
  }, [timeRemaining, phase, myScore, opponentScore, finishGame])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (phase !== 'playing' || !answer.trim() || isTransitioning) return

    // Use locked problem to ensure we're checking the right one
    const problem = lockedProblemRef.current || problemsRef.current[lockedIndexRef.current]
    if (!problem) return

    const numAnswer = parseFloat(answer)
    const correct = Math.abs(numAnswer - problem.answer) < 0.01

    if (correct) {
      const points = problem.difficulty
      const newScore = myScore + points
      setMyScore(newScore)
      setFeedback('correct')

      channelRef.current?.send({
        type: 'broadcast',
        event: 'game_event',
        payload: {
          type: 'answer_submitted',
          playerId: currentUserId,
          problemIndex: lockedIndexRef.current,
          correct: true,
          newScore,
        } satisfies GameEvent,
      })

      // Move to next problem after brief delay
      setAnswer('')
      setIsTransitioning(true)
      
      setTimeout(() => {
        const nextIndex = lockedIndexRef.current + 1
        const nextProblem = problemsRef.current[nextIndex]
        
        if (nextProblem) {
          // Lock the next problem immediately
          lockedProblemRef.current = nextProblem
          lockedIndexRef.current = nextIndex
          setCurrentProblem(nextProblem)
          setCurrentProblemIndex(nextIndex)
          setFeedback(null) // Clear feedback for new problem
        } else {
          setCurrentProblem(null)
        }
        
        setIsTransitioning(false)
        setTimeout(() => inputRef.current?.focus(), 50)
      }, 200)
    } else {
      setFeedback('incorrect')

      channelRef.current?.send({
        type: 'broadcast',
        event: 'game_event',
        payload: {
          type: 'answer_submitted',
          playerId: currentUserId,
          problemIndex: lockedIndexRef.current,
          correct: false,
          newScore: myScore,
        } satisfies GameEvent,
      })

      // Flash red, then move to next problem
      setAnswer('')
      setIsTransitioning(true)
      
      // Flash red briefly, then transition
      setTimeout(() => {
        const nextIndex = lockedIndexRef.current + 1
        const nextProblem = problemsRef.current[nextIndex]
        
        if (nextProblem) {
          // Lock the next problem immediately
          lockedProblemRef.current = nextProblem
          lockedIndexRef.current = nextIndex
          setCurrentProblem(nextProblem)
          setCurrentProblemIndex(nextIndex)
          setFeedback(null) // Clear feedback for new problem
        } else {
          setCurrentProblem(null)
        }
        
        setIsTransitioning(false)
        setTimeout(() => inputRef.current?.focus(), 50)
      }, 250) // Brief delay for wrong answer to see the red flash
    }
  }

  if (phase === 'waiting') {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">
          Waiting for opponent to connect...
        </p>
        <div className="mt-6 flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">
            {me.displayName}
          </span>
          <span className="text-xs text-scholar-stone">vs</span>
          <span className="text-sm font-medium text-foreground">
            {opponent.displayName}
          </span>
        </div>
      </div>
    )
  }

  if (phase === 'countdown') {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6">
        <div className="mb-4 text-sm text-muted-foreground uppercase tracking-widest">
          Get ready
        </div>
        <div className="font-mono text-7xl font-medium text-foreground">
          {countdown}
        </div>
        <div className="mt-8 flex items-center gap-6">
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">
              {me.displayName}
            </p>
            <p className="font-mono text-xs text-scholar-stone">{me.elo}</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">
              {opponent.displayName}
            </p>
            <p className="font-mono text-xs text-scholar-stone">
              {opponent.elo}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'finished' && result) {
    return <MatchResults result={result} currentUserId={currentUserId} />
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <ScoreBar
          name={me.displayName}
          score={myScore}
          align="left"
          isMe
        />
        <GameTimer timeRemaining={timeRemaining} />
        <ScoreBar
          name={opponent.displayName}
          score={opponentScore}
          align="right"
        />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        {lockedProblemRef.current && (
          <ProblemDisplay
            problem={lockedProblemRef.current}
            index={lockedIndexRef.current}
            feedback={feedback}
          />
        )}

        <form onSubmit={handleSubmit} className="mt-10 w-full max-w-xs">
          <input
            ref={inputRef}
            type="number"
            step="any"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Your answer"
            autoFocus
            className="h-14 w-full rounded-lg border border-border bg-card px-4 text-center font-mono text-2xl text-foreground placeholder:text-muted-foreground/50 focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
          />
          <button type="submit" className="sr-only">
            Submit
          </button>
        </form>

        <p className="mt-4 text-xs text-muted-foreground">
          Press Enter to submit
        </p>
      </div>
    </div>
  )
}
