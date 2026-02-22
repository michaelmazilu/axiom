'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { generateProblems } from '@/lib/game/math-generator'
import type { GameMode, MathProblem } from '@/lib/game/math-generator'
import { checkAnswer } from '@/lib/game/answer-check'
import { MATCH_DURATION, COUNTDOWN_DURATION } from '@/lib/game/types'
import type { MatchResult, GameEvent } from '@/lib/game/types'
import { calculateElo } from '@/lib/game/elo'
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
  const me = isPlayer1 ? player1 : player2
  const opponent = isPlayer1 ? player2 : player1

  const [phase, setPhase] = useState<MatchPhase>('waiting')
  const [countdown, setCountdown] = useState(COUNTDOWN_DURATION)
  const [timeRemaining, setTimeRemaining] = useState(MATCH_DURATION)
  const [myScore, setMyScore] = useState(0)
  const [opponentScore, setOpponentScore] = useState(0)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null)
  const [result, setResult] = useState<MatchResult | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [problemKey, setProblemKey] = useState(0) // Force re-render when problem changes

  const problemsRef = useRef<MathProblem[]>([])
  const lockedProblemRef = useRef<MathProblem | null>(null)
  const lockedIndexRef = useRef<number>(0)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const eloUpdatedRef = useRef(false)
  const problemsGeneratedRef = useRef(false)
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Generate problems only once when component mounts - never regenerate during gameplay
  useEffect(() => {
    // Only generate if we haven't generated yet
    if (!problemsGeneratedRef.current) {
      const problems = generateProblems(seed, mode, 50)
      problemsRef.current = problems
      problemsGeneratedRef.current = true
      
      // Only set the first problem if we don't already have a locked problem
      if (lockedProblemRef.current === null && problems.length > 0) {
        const firstProblem = problems[0]
        lockedProblemRef.current = firstProblem
        lockedIndexRef.current = 0
        setProblemKey(0) // Force initial render
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  const finishGame = useCallback(async (finalMyScore: number, finalOpponentScore: number) => {
    if (timerRef.current) clearInterval(timerRef.current)
    setPhase('finished')

    let winnerId: string | null = null
    if (finalMyScore > finalOpponentScore) {
      winnerId = currentUserId
    } else if (finalOpponentScore > finalMyScore) {
      winnerId = opponent.id
    }

    const myElo = me.elo
    const oppElo = opponent.elo
    const scoreA = winnerId === currentUserId ? 1 : winnerId === null ? 0.5 : 0
    const eloResult = calculateElo(myElo, oppElo, scoreA)

    const myNewElo = eloResult.newRatingA
    const oppNewElo = eloResult.newRatingB
    const myDelta = eloResult.deltaA
    const oppDelta = eloResult.deltaB

    const matchResult: MatchResult = {
      matchId,
      mode,
      winnerId,
      player1: {
        id: player1.id,
        displayName: player1.displayName,
        score: isPlayer1 ? finalMyScore : finalOpponentScore,
        eloBefore: player1.elo,
        eloAfter: isPlayer1 ? myNewElo : oppNewElo,
        delta: isPlayer1 ? myDelta : oppDelta,
      },
      player2: {
        id: player2.id,
        displayName: player2.displayName,
        score: isPlayer1 ? finalOpponentScore : finalMyScore,
        eloBefore: player2.elo,
        eloAfter: isPlayer1 ? oppNewElo : myNewElo,
        delta: isPlayer1 ? oppDelta : myDelta,
      },
    }

    setResult(matchResult)

    channelRef.current?.send({
      type: 'broadcast',
      event: 'game_event',
      payload: { type: 'game_over', result: matchResult } satisfies GameEvent,
    })

    if (!eloUpdatedRef.current) {
      eloUpdatedRef.current = true
      try {
        await fetch(`/api/match/${matchId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ myScore: finalMyScore, opponentScore: finalOpponentScore }),
        })
      } catch {
        // non-blocking
      }
    }
  }, [currentUserId, isPlayer1, matchId, me.elo, mode, opponent.id, opponent.elo, player1, player2])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`match:${matchId}`, {
      config: { broadcast: { self: false } },
    })

    // Fallback: force countdown even if Realtime subscription is slow or fails
    const fallbackTimer = setTimeout(() => {
      setPhase((current) => {
        if (current === 'waiting') return 'countdown'
        return current
      })
    }, 5000)

    channel
      .on('broadcast', { event: 'game_event' }, ({ payload }) => {
        const event = payload as GameEvent

        if (event.type === 'player_ready') {
          clearTimeout(fallbackTimer)
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

          if (!eloUpdatedRef.current) {
            eloUpdatedRef.current = true
            const myResultData = event.result.player1.id === currentUserId
              ? event.result.player1
              : event.result.player2
            const oppResultData = event.result.player1.id === currentUserId
              ? event.result.player2
              : event.result.player1

            fetch(`/api/match/${event.result.matchId}/complete`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                myScore: myResultData.score,
                opponentScore: oppResultData.score,
              }),
            }).catch(() => {})
          }
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(fallbackTimer)

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
      clearTimeout(fallbackTimer)
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

    // Ensure current problem is set when starting to play - only set if not already locked
    // Once a problem is locked, it never changes during gameplay
    if (lockedProblemRef.current === null && problemsRef.current.length > 0) {
      const firstProblem = problemsRef.current[0]
      lockedProblemRef.current = firstProblem
      lockedIndexRef.current = 0
      setProblemKey(0) // Force render with first problem
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
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current)
        transitionTimeoutRef.current = null
      }
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

    const correct = checkAnswer(problem, answer)

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
      
      // Cancel any pending transition
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current)
      }
      
      transitionTimeoutRef.current = setTimeout(() => {
        const nextIndex = lockedIndexRef.current + 1
        const nextProblem = problemsRef.current[nextIndex]
        
        if (nextProblem) {
          // Lock the next problem immediately - update refs and state atomically
          lockedProblemRef.current = nextProblem
          lockedIndexRef.current = nextIndex
          setFeedback(null) // Clear feedback for new problem
          // Use a unique key to force re-render with the new problem
          setProblemKey(nextIndex)
        }
        
        setIsTransitioning(false)
        transitionTimeoutRef.current = null
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
      
      // Cancel any pending transition
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current)
      }
      
      // Flash red briefly, then transition
      transitionTimeoutRef.current = setTimeout(() => {
        const nextIndex = lockedIndexRef.current + 1
        const nextProblem = problemsRef.current[nextIndex]
        
        if (nextProblem) {
          // Lock the next problem immediately - update refs and state atomically
          lockedProblemRef.current = nextProblem
          lockedIndexRef.current = nextIndex
          setFeedback(null) // Clear feedback for new problem
          // Use a unique key to force re-render with the new problem
          setProblemKey(nextIndex)
        }
        
        setIsTransitioning(false)
        transitionTimeoutRef.current = null
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
      <div className="mb-8 grid grid-cols-3 items-center">
        <div className="flex justify-start">
          <ScoreBar
            name={me.displayName}
            score={myScore}
            align="left"
            isMe
          />
        </div>
        <div className="flex justify-center">
          <GameTimer timeRemaining={timeRemaining} />
        </div>
        <div className="flex justify-end">
          <ScoreBar
            name={opponent.displayName}
            score={opponentScore}
            align="right"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        {lockedProblemRef.current && (
          <div className="w-full flex justify-center" key={problemKey}>
            <ProblemDisplay
              problem={lockedProblemRef.current}
              index={lockedIndexRef.current}
              feedback={feedback}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-10 w-full max-w-xs">
          <input
            ref={inputRef}
            type="text"
            inputMode={mode === 'functions' || mode === 'calculus' ? 'text' : 'decimal'}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={mode === 'functions' || mode === 'calculus' ? 'e.g. 3x^2 - x + 1' : 'Your answer'}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
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
