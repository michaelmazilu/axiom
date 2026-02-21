'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { generateProblems } from '@/lib/game/math-generator'
import type { MathProblem } from '@/lib/game/math-generator'
import { MATCH_DURATION, COUNTDOWN_DURATION } from '@/lib/game/types'
import { GameTimer } from './game-timer'
import { ProblemDisplay } from './problem-display'
import { ScoreBar } from './score-bar'
import { BotMatchResults } from './bot-match-results'

type MatchPhase = 'countdown' | 'playing' | 'finished'

export function BotMatchClient() {
  const [phase, setPhase] = useState<MatchPhase>('countdown')
  const [countdown, setCountdown] = useState(COUNTDOWN_DURATION)
  const [timeRemaining, setTimeRemaining] = useState(MATCH_DURATION)
  const [myScore, setMyScore] = useState(0)
  const [botScore, setBotScore] = useState(0)
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null)
  const [finished, setFinished] = useState(false)

  const seedRef = useRef(crypto.randomUUID())
  const problemsRef = useRef<MathProblem[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const botIndexRef = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const botScoreRef = useRef(0)

  useEffect(() => {
    problemsRef.current = generateProblems(seedRef.current, 'probability', 50)
  }, [])

  const finishGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (botTimerRef.current) clearTimeout(botTimerRef.current)
    setPhase('finished')
    setFinished(true)
  }, [])

  // Countdown
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

  // Game timer
  useEffect(() => {
    if (phase !== 'playing') return

    inputRef.current?.focus()

    timerRef.current = setInterval(() => {
      setTimeRemaining((t) => {
        if (t <= 1) {
          return 0
        }
        return t - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [phase])

  useEffect(() => {
    if (phase === 'playing' && timeRemaining === 0) {
      finishGame()
    }
  }, [timeRemaining, phase, finishGame])

  // Bot solver — schedules itself one problem at a time
  const scheduleBotSolve = useCallback(() => {
    const problem = problemsRef.current[botIndexRef.current]
    if (!problem) return

    const baseDuration = problem.difficulty <= 2 ? 3000 : problem.difficulty <= 4 ? 6000 : 9000
    const jitter = (Math.random() - 0.5) * 2000
    const delay = baseDuration + jitter

    const accuracy = problem.difficulty <= 2 ? 0.85 : problem.difficulty <= 4 ? 0.65 : 0.45

    botTimerRef.current = setTimeout(() => {
      if (Math.random() < accuracy) {
        const pts = problem.difficulty
        botScoreRef.current += pts
        setBotScore(botScoreRef.current)
      }
      botIndexRef.current += 1
      scheduleBotSolve()
    }, delay)
  }, [])

  useEffect(() => {
    if (phase !== 'playing') return

    scheduleBotSolve()

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current)
    }
  }, [phase, scheduleBotSolve])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (phase !== 'playing' || !answer.trim()) return

    const problem = problemsRef.current[currentProblemIndex]
    if (!problem) return

    const numAnswer = parseFloat(answer)
    const correct = Math.abs(numAnswer - problem.answer) < 0.01

    if (correct) {
      const points = problem.difficulty
      setMyScore((s) => s + points)
      setFeedback('correct')
    } else {
      setFeedback('incorrect')
    }

    setAnswer('')
    setCurrentProblemIndex((i) => i + 1)

    setTimeout(() => setFeedback(null), 400)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const currentProblem = problemsRef.current[currentProblemIndex]

  if (phase === 'countdown') {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6">
        <div className="mb-4 text-sm uppercase tracking-widest text-muted-foreground">
          Get ready
        </div>
        <div className="font-mono text-7xl font-medium text-foreground">
          {countdown}
        </div>
        <div className="mt-8 flex items-center gap-6">
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">You</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">Axiom Bot</p>
            <p className="font-mono text-xs text-muted-foreground">1200</p>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'finished' && finished) {
    return <BotMatchResults myScore={myScore} botScore={botScore} />
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <ScoreBar name="You" score={myScore} align="left" isMe />
        <GameTimer timeRemaining={timeRemaining} />
        <ScoreBar name="Axiom Bot" score={botScore} align="right" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        {currentProblem && (
          <ProblemDisplay
            problem={currentProblem}
            index={currentProblemIndex}
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
