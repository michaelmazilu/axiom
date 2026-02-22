'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Globe, Bot, UserPlus, X, Flame } from 'lucide-react'
import type { GameMode } from '@/lib/game/math-generator'
import { MODE_LABELS, MODE_DESCRIPTIONS, GAME_MODES } from '@/lib/game/types'
import { cn } from '@/lib/utils'

interface ProfileData {
  id: string
  displayName: string
  eloProbability: number
  totalWins: number
  totalLosses: number
  totalDraws: number
}

interface OutgoingChallenge {
  id: string
  opponentName: string
}

interface LobbyClientProps {
  profile: ProfileData
  isGuest?: boolean
}

function calculateStreak(matchDates: string[]): number {
  if (matchDates.length === 0) return 0
  
  // Get unique dates (one per day)
  const uniqueDates = new Set<string>()
  matchDates.forEach(dateStr => {
    const date = new Date(dateStr)
    date.setHours(0, 0, 0, 0)
    uniqueDates.add(date.toISOString())
  })
  
  // Sort dates descending (most recent first)
  const sortedDates = Array.from(uniqueDates)
    .map(d => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime())
  
  if (sortedDates.length === 0) return 0
  
  // Check if most recent match was today or yesterday
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  const mostRecent = sortedDates[0]
  mostRecent.setHours(0, 0, 0, 0)
  
  // If most recent match wasn't today or yesterday, streak is 0
  if (mostRecent.getTime() !== today.getTime() && mostRecent.getTime() !== yesterday.getTime()) {
    return 0
  }
  
  // Count consecutive days
  let streak = 0
  let checkDate = new Date(mostRecent)
  
  for (const matchDate of sortedDates) {
    matchDate.setHours(0, 0, 0, 0)
    if (matchDate.getTime() === checkDate.getTime()) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else if (matchDate.getTime() < checkDate.getTime()) {
      // Gap found, streak broken
      break
    }
  }
  
  return streak
}

export function LobbyClient({ profile, isGuest = false }: LobbyClientProps) {
  const router = useRouter()
  const [selectedMode, setSelectedMode] = useState<GameMode>('statistics')
  const [friendName, setFriendName] = useState('')
  const [challengeLoading, setChallengeLoading] = useState(false)
  const [challengeError, setChallengeError] = useState<string | null>(null)
  const [outgoing, setOutgoing] = useState<OutgoingChallenge | null>(null)
  const [showFriendInput, setShowFriendInput] = useState(false)
  const [streak, setStreak] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const segmentRefs = useRef<Map<GameMode, HTMLButtonElement>>(new Map())
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })

  useEffect(() => {
    const el = segmentRefs.current.get(selectedMode)
    if (!el) return
    const parent = el.parentElement
    if (!parent) return
    const parentRect = parent.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    setIndicator({
      left: elRect.left - parentRect.left,
      width: elRect.width,
    })
  }, [selectedMode])
  
  useEffect(() => {
    if (isGuest) return
    
    async function fetchStreak() {
      const supabase = createClient()
      const { data: matches } = await supabase
        .from('matches')
        .select('completed_at')
        .eq('status', 'completed')
        .or(`player1_id.eq.${profile.id},player2_id.eq.${profile.id}`)
        .not('completed_at', 'is', null)
      
      if (matches) {
        const matchDates = matches.map(m => m.completed_at).filter(Boolean) as string[]
        setStreak(calculateStreak(matchDates))
      }
    }
    
    fetchStreak()
  }, [profile.id, isGuest])

  function handlePlayOnline() {
    if (isGuest) {
      router.push('/auth/sign-up')
      return
    }
    router.push(`/queue?mode=${selectedMode}`)
  }

  function handlePlayBot() {
    router.push(`/match/bot?mode=${selectedMode}`)
  }

  function handlePlayFriend() {
    if (isGuest) {
      router.push('/auth/sign-up')
      return
    }
    setShowFriendInput(true)
  }

  async function handleChallenge(e: React.FormEvent) {
    e.preventDefault()
    if (!friendName.trim()) return

    setChallengeError(null)
    setChallengeLoading(true)

    try {
      const res = await fetch('/api/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: friendName.trim(), mode: selectedMode }),
      })

      const data = await res.json()

      if (!res.ok) {
        setChallengeError(data.error ?? 'Failed to send challenge')
        setChallengeLoading(false)
        return
      }

      setOutgoing({ id: data.challengeId, opponentName: data.opponent.displayName })
      setChallengeLoading(false)
      startPolling(data.challengeId)
    } catch {
      setChallengeError('Something went wrong')
      setChallengeLoading(false)
    }
  }

  function startPolling(challengeId: string) {
    pollRef.current = setInterval(async () => {
      try {
        const supabase = createClient()
        const { data: challenge } = await supabase
          .from('challenges')
          .select('status, match_id')
          .eq('id', challengeId)
          .single()

        if (!challenge) return

        if (challenge.status === 'accepted' && challenge.match_id) {
          if (pollRef.current) clearInterval(pollRef.current)
          router.push(`/match/${challenge.match_id}`)
        }

        if (challenge.status === 'declined') {
          if (pollRef.current) clearInterval(pollRef.current)
          setOutgoing(null)
          setChallengeError('Challenge was declined')
        }

        if (challenge.status === 'expired') {
          if (pollRef.current) clearInterval(pollRef.current)
          setOutgoing(null)
        }
      } catch {
        // silently retry
      }
    }, 2000)
  }

  async function handleCancelChallenge() {
    if (!outgoing) return
    if (pollRef.current) clearInterval(pollRef.current)

    await fetch(`/api/challenge/${outgoing.id}`, { method: 'DELETE' })
    setOutgoing(null)
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const playModes = [
    {
      icon: Globe,
      title: 'Play Online',
      description: 'Find a random opponent',
      onClick: handlePlayOnline,
      accent: 'group-hover:text-scholar-success',
      bg: 'group-hover:bg-scholar-success/10',
    },
    {
      icon: Bot,
      title: 'Play vs Bot',
      description: 'Practice against AI',
      onClick: handlePlayBot,
      accent: 'group-hover:text-blue-400',
      bg: 'group-hover:bg-blue-400/10',
    },
    {
      icon: UserPlus,
      title: 'Play a Friend',
      description: 'Challenge by username',
      onClick: handlePlayFriend,
      accent: 'group-hover:text-scholar-vermillion',
      bg: 'group-hover:bg-scholar-vermillion/10',
    },
  ]

  return (
    <div className="mx-auto max-w-[1040px] px-6 py-12 lg:py-16">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
          {isGuest ? 'Welcome to Axiom' : `Ready, ${profile.displayName}`}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          1v1 math duels — 120 seconds
        </p>
        {!isGuest && (
          <div className="mt-3 flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="font-mono text-sm font-medium text-foreground">{streak}</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">ELO</span>
              <span className="font-mono text-base font-medium text-foreground">{profile.eloProbability}</span>
            </div>
          </div>
        )}
      </div>

      {/* Mode Selector */}
      <div className="mb-6 flex flex-col items-center gap-2">
        <div className="relative inline-flex rounded-lg border border-border bg-card p-1">
          <div
            className="absolute top-1 bottom-1 rounded-md bg-foreground shadow-sm transition-all duration-200 ease-out"
            style={{ left: indicator.left, width: indicator.width }}
          />
          {GAME_MODES.map((mode) => (
            <button
              key={mode}
              ref={(el) => { if (el) segmentRefs.current.set(mode, el) }}
              onClick={() => setSelectedMode(mode)}
              className={cn(
                'relative z-10 flex flex-col items-center px-5 py-2 text-sm font-medium transition-colors duration-150 rounded-md',
                selectedMode === mode
                  ? 'text-background'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span>{MODE_LABELS[mode]}</span>
              <span className={cn(
                'text-[10px] font-normal leading-tight transition-colors duration-150',
                selectedMode === mode ? 'text-background/70' : 'text-muted-foreground/60'
              )}>
                {MODE_DESCRIPTIONS[mode]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Play Mode Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {playModes.map((mode) => {
          const Icon = mode.icon
          return (
            <button
              key={mode.title}
              onClick={mode.onClick}
              className={`group flex flex-col items-center rounded-xl border border-border bg-card px-6 py-8 text-center transition-all hover:border-foreground/20 hover:shadow-sm ${mode.bg}`}
            >
              <div className={`mb-4 rounded-full border border-border p-3.5 transition-colors ${mode.bg}`}>
                <Icon className={`h-6 w-6 text-muted-foreground transition-colors ${mode.accent}`} />
              </div>
              <span className="text-sm font-medium text-foreground">
                {mode.title}
              </span>
              <span className="mt-1.5 text-xs text-muted-foreground">
                {mode.description}
              </span>
            </button>
          )
        })}
      </div>

      {/* Challenge a Friend — inline section */}
      {showFriendInput && !outgoing && (
        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Challenge a friend</span>
            <button
              onClick={() => { setShowFriendInput(false); setChallengeError(null) }}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleChallenge} className="flex gap-2">
            <input
              type="text"
              value={friendName}
              onChange={(e) => { setFriendName(e.target.value); setChallengeError(null) }}
              placeholder="Enter username"
              autoFocus
              className="h-10 flex-1 rounded-md border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
            />
            <button
              type="submit"
              disabled={challengeLoading || !friendName.trim()}
              className="h-10 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {challengeLoading ? 'Sending...' : 'Challenge'}
            </button>
          </form>
          {challengeError && (
            <p className="mt-2 text-sm text-destructive">{challengeError}</p>
          )}
        </div>
      )}

      {/* Outgoing challenge waiting state */}
      {outgoing && (
        <div className="mt-6 flex flex-col items-center rounded-xl border border-border bg-card p-8">
          <p className="text-sm text-foreground">
            Waiting for <span className="font-medium">{outgoing.opponentName}</span> to accept...
          </p>
          <div className="mt-3 flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>
          <button
            onClick={handleCancelChallenge}
            className="mt-4 text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
