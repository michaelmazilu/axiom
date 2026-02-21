'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PlayerStats } from './player-stats'

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
  const [friendName, setFriendName] = useState('')
  const [challengeLoading, setChallengeLoading] = useState(false)
  const [challengeError, setChallengeError] = useState<string | null>(null)
  const [outgoing, setOutgoing] = useState<OutgoingChallenge | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function handlePlay() {
    if (isGuest) {
      router.push('/auth/sign-up')
      return
    }
    router.push('/queue')
  }

  async function handleChallenge(e: React.FormEvent) {
    e.preventDefault()

    if (isGuest) {
      router.push('/auth/sign-up')
      return
    }

    if (!friendName.trim()) return

    setChallengeError(null)
    setChallengeLoading(true)

    try {
      const res = await fetch('/api/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: friendName.trim() }),
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

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 lg:py-16">
      {/* Greeting */}
      <div className="mb-12">
        <h1 className="text-2xl font-medium tracking-tight text-foreground">
          {isGuest ? 'Welcome to Axiom' : `Ready, ${profile.displayName}`}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {isGuest
            ? 'Create an account to start competing in 1v1 probability duels'
            : '1v1 probability duels — find a match and prove your skill'}
        </p>
      </div>

      {/* Stats summary — only for logged-in users */}
      {!isGuest && <PlayerStats profile={profile} className="mb-12" />}

      {/* Actions */}
      <div className="flex flex-col items-center gap-8">
        {/* Find match */}
        <button
          onClick={handlePlay}
          className="h-14 w-full max-w-sm rounded-md bg-primary text-base font-medium text-primary-foreground transition-all hover:bg-primary/90"
        >
          {isGuest ? 'Sign up to play' : 'Find match'}
        </button>

        {/* Divider */}
        <div className="flex w-full max-w-sm items-center gap-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Play a friend */}
        {outgoing ? (
          <div className="flex w-full max-w-sm flex-col items-center rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-foreground">
              Waiting for <span className="font-medium">{outgoing.opponentName}</span> to accept...
            </p>
            <div className="mt-4 flex items-center gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                  style={{
                    animation: 'challengePulse 1.4s ease-in-out infinite',
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
            <button
              onClick={handleCancelChallenge}
              className="mt-5 text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
            >
              Cancel
            </button>

            <style jsx>{`
              @keyframes challengePulse {
                0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
                40% { opacity: 1; transform: scale(1); }
              }
            `}</style>
          </div>
        ) : (
          <form onSubmit={handleChallenge} className="flex w-full max-w-sm flex-col gap-3">
            <label className="text-sm font-medium text-muted-foreground">
              Play a friend
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={friendName}
                onChange={(e) => {
                  setFriendName(e.target.value)
                  setChallengeError(null)
                }}
                placeholder="Enter username"
                className="h-11 flex-1 rounded-md border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
              />
              <button
                type="submit"
                disabled={challengeLoading || (!isGuest && !friendName.trim())}
                className="h-11 rounded-md border border-border bg-card px-5 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
              >
                {challengeLoading ? 'Sending...' : 'Challenge'}
              </button>
            </div>
            {challengeError && (
              <p className="text-sm text-destructive">{challengeError}</p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
