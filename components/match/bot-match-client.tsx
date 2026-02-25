'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { generateProblems } from '@/lib/game/math-generator'
import type { GameMode, MathProblem } from '@/lib/game/math-generator'
import { checkAnswer } from '@/lib/game/answer-check'
import { MATCH_DURATION, COUNTDOWN_DURATION, MODE_LABELS } from '@/lib/game/types'
import { GameTimer } from './game-timer'
import { ProblemDisplay } from './problem-display'
import { ScoreBar } from './score-bar'
import { BotMatchResults } from './bot-match-results'

type MatchPhase = 'countdown' | 'playing' | 'finished'
const BOT_DIFFICULTY_MULTIPLIER = 2

interface BotMatchClientProps {
  mode: GameMode
  userElo?: number
}

export function BotMatchClient({ mode, userElo = 800 }: BotMatchClientProps) {
  const [phase, setPhase] = useState<MatchPhase>('countdown')
  const [countdown, setCountdown] = useState(COUNTDOWN_DURATION)
  const [timeRemaining, setTimeRemaining] = useState(MATCH_DURATION)
  const [myScore, setMyScore] = useState(0)
  const [botScore, setBotScore] = useState(0)
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0)
  const [currentProblem, setCurrentProblem] = useState<MathProblem | null>(null)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null)
  const [finished, setFinished] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [botName, setBotName] = useState('Axiom Bot 1')
  const [botElo, setBotElo] = useState(Math.round(userElo / 100) * 100)

  const seedRef = useRef(crypto.randomUUID())
  const problemsRef = useRef<MathProblem[]>([])
  const lockedProblemRef = useRef<MathProblem | null>(null)
  const lockedIndexRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const botIndexRef = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const botScoreRef = useRef(0)
  const botNumberRef = useRef(1)

  // Generate problems only when mode changes
  useEffect(() => {
    const problems = generateProblems(seedRef.current, mode, 50)
    problemsRef.current = problems
    // Only set the first problem if we don't already have a locked problem
    // This prevents resetting during the game
    if (lockedProblemRef.current === null && problems.length > 0) {
      const firstProblem = problems[0]
      lockedProblemRef.current = firstProblem
      lockedIndexRef.current = 0
      setCurrentProblem(firstProblem)
      setCurrentProblemIndex(0)
    }
  }, [mode])

  // Initialize bot name only once
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedBotNumber = localStorage.getItem('botNumber')
      if (storedBotNumber) {
        const num = parseInt(storedBotNumber, 10)
        botNumberRef.current = num
        setBotName(`Axiom Bot ${num}`)
      } else {
        botNumberRef.current = 1
        setBotName('Axiom Bot 1')
        localStorage.setItem('botNumber', '1')
      }
    }
  }, [])

  // Update bot ELO whenever userElo changes, rounded to nearest 100
  useEffect(() => {
    setBotElo(Math.round(userElo / 100) * 100)
  }, [userElo])

  const finishGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (botTimerRef.current) clearTimeout(botTimerRef.current)
    setPhase('finished')
    setFinished(true)
    
    // Increment bot number for next match (only by 1)
    if (typeof window !== 'undefined') {
      const currentNum = botNumberRef.current
      botNumberRef.current = currentNum + 1
      localStorage.setItem('botNumber', botNumberRef.current.toString())
    }
  }, [])

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

    // Ensure current problem is set when starting to play - only set once if not already locked
    if (lockedProblemRef.current === null && problemsRef.current.length > 0) {
      const firstProblem = problemsRef.current[0]
      lockedProblemRef.current = firstProblem
      lockedIndexRef.current = 0
      setCurrentProblem(firstProblem)
      setCurrentProblemIndex(0)
    } else if (lockedProblemRef.current) {
      // If we already have a locked problem, make sure state is in sync
      setCurrentProblem(lockedProblemRef.current)
      setCurrentProblemIndex(lockedIndexRef.current)
    }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => {
    if (phase === 'playing' && timeRemaining === 0) {
      finishGame()
    }
  }, [timeRemaining, phase, finishGame])

  const scheduleBotSolve = useCallback(() => {
    const problem = problemsRef.current[botIndexRef.current]
    if (!problem) return

    // Bot ELO always matches user ELO rounded to nearest 100
    setBotElo(Math.round(userElo / 100) * 100)

    // Bot performance based on user ELO
    // For 800 ELO bot, aim for 8-12 questions correct (out of ~50 in 120 seconds)
    // That's roughly 16-24% accuracy overall
    // Bot ELO always matches user ELO, so performance is based on userElo
    let baseAccuracy: number
    if (userElo <= 800) {
      // For 800 ELO: 20-30% accuracy depending on difficulty to get 8-12 correct
      baseAccuracy = problem.difficulty <= 2 ? 0.3 : problem.difficulty <= 4 ? 0.25 : 0.2
    } else if (userElo <= 1000) {
      baseAccuracy = problem.difficulty <= 2 ? 0.4 : problem.difficulty <= 4 ? 0.35 : 0.3
    } else if (userElo <= 1200) {
      baseAccuracy = problem.difficulty <= 2 ? 0.5 : problem.difficulty <= 4 ? 0.45 : 0.4
    } else {
      baseAccuracy = problem.difficulty <= 2 ? 0.6 : problem.difficulty <= 4 ? 0.55 : 0.5
    }
    const adjustedAccuracy = baseAccuracy - (problem.difficulty - 3) * 0.05 // Smaller difficulty penalty
    
    const baseDuration = problem.difficulty <= 2 ? 3000 : problem.difficulty <= 4 ? 6000 : 9000
    // Bot speed scales with user ELO - higher ELO users get faster bots
    const eloMultiplier = userElo <= 800 ? 1.2 : userElo <= 1000 ? 1.0 : userElo <= 1200 ? 0.85 : 0.7
    const jitter = (Math.random() - 0.5) * 2000
    // Higher multiplier means the bot answers faster (2x harder => ~half the delay).
    const delay = (baseDuration * eloMultiplier + jitter) / BOT_DIFFICULTY_MULTIPLIER

    botTimerRef.current = setTimeout(() => {
      if (Math.random() < adjustedAccuracy) {
        // Bot scores 1 point per correct answer
        botScoreRef.current += 1
        setBotScore(botScoreRef.current)
      }
      botIndexRef.current += 1
      scheduleBotSolve()
    }, delay)
  }, [userElo])

  useEffect(() => {
    if (phase !== 'playing') return

    scheduleBotSolve()

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current)
    }
  }, [phase, scheduleBotSolve])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (phase !== 'playing' || !answer.trim() || isTransitioning) return

    // Use locked problem to ensure we're checking the right one
    const problem = lockedProblemRef.current || problemsRef.current[lockedIndexRef.current]
    if (!problem) return

    const correct = checkAnswer(problem, answer)

    if (correct) {
      const points = problem.difficulty
      setMyScore((s) => s + points)
      setFeedback('correct')

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


  if (phase === 'countdown') {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6">
        <div className="font-mono text-7xl font-medium text-foreground">
          {countdown}
        </div>
        <div className="mt-8 flex items-center gap-6">
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">You</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">{botName}</p>
            <p className="font-mono text-xs text-muted-foreground">{botElo}</p>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'finished' && finished) {
    return <BotMatchResults myScore={myScore} botScore={botScore} mode={mode} />
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col px-6 py-8">
      <div className="mb-8 grid grid-cols-3 items-center">
        <div className="flex justify-start">
          <ScoreBar name="You" score={myScore} align="left" isMe />
        </div>
        <div className="flex justify-center">
          <GameTimer timeRemaining={timeRemaining} />
        </div>
        <div className="flex justify-end">
          <ScoreBar name={botName} score={botScore} align="right" />
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        {lockedProblemRef.current && (
          <div className="w-full flex justify-center">
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
