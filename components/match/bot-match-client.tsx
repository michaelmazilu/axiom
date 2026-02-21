'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { generateProblems } from '@/lib/game/math-generator'
import type { GameMode, MathProblem } from '@/lib/game/math-generator'
import { MATCH_DURATION, COUNTDOWN_DURATION, MODE_LABELS } from '@/lib/game/types'
import { GameTimer } from './game-timer'
import { ProblemDisplay } from './problem-display'
import { ScoreBar } from './score-bar'
import { BotMatchResults } from './bot-match-results'

type MatchPhase = 'countdown' | 'playing' | 'finished'

interface BotMatchClientProps {
  mode: GameMode
  userElo?: number
}

export function BotMatchClient({ mode, userElo = 1200 }: BotMatchClientProps) {
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
  const [botElo, setBotElo] = useState(800)

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
  const lastEloChangeRef = useRef(0)
  const eloChangeCountRef = useRef(0)

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
    
    // Initialize bot name and ELO
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
    
    // Bot ELO starts at 800 (matches countdown display)
    setBotElo(800)
  }, [mode, userElo])

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

    // Ensure current problem is set when starting to play - only set once
    if (lockedProblemRef.current === null && problemsRef.current.length > 0) {
      const firstProblem = problemsRef.current[0]
      lockedProblemRef.current = firstProblem
      lockedIndexRef.current = 0
      setCurrentProblem(firstProblem)
      setCurrentProblemIndex(0)
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

    // Change bot ELO at least 2 times during the match, at random intervals
    const currentTime = Date.now()
    const timeSinceLastChange = lastEloChangeRef.current === 0 ? Infinity : currentTime - lastEloChangeRef.current
    const shouldChange = eloChangeCountRef.current < 2 
      ? timeSinceLastChange > 20000 // Force change if less than 2 changes
      : timeSinceLastChange > 30000 && Math.random() < 0.15 // Random changes after 2
    
    if (shouldChange) {
      const roundedUserElo = Math.round(userElo / 100) * 100
      setBotElo(roundedUserElo)
      lastEloChangeRef.current = currentTime
      eloChangeCountRef.current += 1
    }

    // Bot performance based on ELO
    // For 800 ELO bot, aim for 8-12 questions correct (out of ~50 in 120 seconds)
    // That's roughly 16-24% accuracy overall
    const eloDiff = botElo - userElo
    // Base accuracy scales with ELO, but for 800 ELO, keep it low to get 8-12 correct
    let baseAccuracy: number
    if (botElo === 800) {
      // For 800 ELO: 20-30% accuracy depending on difficulty to get 8-12 correct
      baseAccuracy = problem.difficulty <= 2 ? 0.3 : problem.difficulty <= 4 ? 0.25 : 0.2
    } else {
      baseAccuracy = eloDiff > 200 ? 0.9 : eloDiff > 0 ? 0.75 : eloDiff > -200 ? 0.6 : 0.4
    }
    const adjustedAccuracy = baseAccuracy - (problem.difficulty - 3) * 0.05 // Smaller difficulty penalty
    
    const baseDuration = problem.difficulty <= 2 ? 3000 : problem.difficulty <= 4 ? 6000 : 9000
    const eloMultiplier = eloDiff > 200 ? 0.7 : eloDiff > 0 ? 0.85 : eloDiff > -200 ? 1.0 : 1.2
    const jitter = (Math.random() - 0.5) * 2000
    const delay = baseDuration * eloMultiplier + jitter

    botTimerRef.current = setTimeout(() => {
      if (Math.random() < adjustedAccuracy) {
        // Score based on ELO - higher ELO bots score more consistently
        const basePts = problem.difficulty
        // Add randomization: ±1 point variation
        const scoreVariation = Math.floor(Math.random() * 3) - 1 // -1, 0, or +1
        const pts = Math.max(1, basePts + scoreVariation)
        botScoreRef.current += pts
        setBotScore(botScoreRef.current)
      }
      botIndexRef.current += 1
      scheduleBotSolve()
    }, delay)
  }, [botElo, userElo])

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

    const numAnswer = parseFloat(answer)
    const correct = Math.abs(numAnswer - problem.answer) < 0.01

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
      <div className="mb-8 flex items-center justify-between">
        <ScoreBar name="You" score={myScore} align="left" isMe />
        <GameTimer timeRemaining={timeRemaining} />
        <div className="flex flex-col items-end">
          <ScoreBar name={botName} score={botScore} align="right" />
          <span className="mt-1 font-mono text-xs text-muted-foreground">{botElo}</span>
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
