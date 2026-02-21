'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PlayerStats } from './player-stats'
import { Globe, Bot, UserPlus, X } from 'lucide-react'
import type { GameMode } from '@/lib/game/math-generator'
import { MODE_LABELS, GAME_MODES } from '@/lib/game/types'
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

export function LobbyClient({ profile, isGuest = false }: LobbyClientProps) {
  const router = useRouter()
  const [selectedMode, setSelectedMode] = useState<GameMode>('all')
  const [friendName, setFriendName] = useState('')
  const [challengeLoading, setChallengeLoading] = useState(false)
  const [challengeError, setChallengeError] = useState<string | null>(null)
  const [outgoing, setOutgoing] = useState<OutgoingChallenge | null>(null)
  const [showFriendInput, setShowFriendInput] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
    <div className="mx-auto max-w-3xl px-6 py-12 lg:py-16">
      <div className="mb-10">
        <h1 className="text-3xl font-medium tracking-tight text-foreground">
          {isGuest ? 'Welcome to Axiom' : `Ready, ${profile.displayName}`}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          1v1 probability duels - 120 seconds
        </p>
      </div>

      {/* Category Selector */}
      <div className="mb-8 flex flex-wrap gap-2">
        {GAME_MODES.map((mode) => (
          <button
            key={mode}
            onClick={() => setSelectedMode(mode)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              selectedMode === mode
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            {MODE_LABELS[mode]}
          </button>
        ))}
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
              <div className={`mb-4 rounded-full border border-border p-3 transition-colors ${mode.bg}`}>
                <Icon className={`h-6 w-6 text-muted-foreground transition-colors ${mode.accent}`} />
              </div>
              <span className="text-sm font-medium text-foreground">
                {mode.title}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                {mode.description}
              </span>
            </button>
          )
        })}
      </div>

      {/* Challenge a Friend — inline section */}
      {showFriendInput && !outgoing && (
        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
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
              className="h-11 flex-1 rounded-md border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
            />
            <button
              type="submit"
              disabled={challengeLoading || !friendName.trim()}
              className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {challengeLoading ? 'Sending...' : 'Challenge'}
            </button>
          </form>
          {challengeError && (
            <p className="mt-3 text-sm text-destructive">{challengeError}</p>
          )}
        </div>
      )}

      {/* Outgoing challenge waiting state */}
      {outgoing && (
        <div className="mt-6 flex flex-col items-center rounded-xl border border-border bg-card p-8">
          <p className="text-sm text-foreground">
            Waiting for <span className="font-medium">{outgoing.opponentName}</span> to accept...
          </p>
          <div className="mt-4 flex items-center gap-2">
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
            className="mt-5 text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Player stats */}
      {!isGuest && <PlayerStats profile={profile} className="mt-10" />}
    </div>
  )
}
