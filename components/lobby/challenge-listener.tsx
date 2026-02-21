'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface IncomingChallenge {
  id: string
  challengerName: string
}

export function ChallengeListener({ userId }: { userId: string }) {
  const router = useRouter()
  const [incoming, setIncoming] = useState<IncomingChallenge | null>(null)
  const [responding, setResponding] = useState(false)

  const checkPendingChallenges = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('challenges')
      .select('id, challenger_id, profiles!challenges_challenger_id_fkey(display_name)')
      .eq('challenged_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      const challenge = data[0]
      const challengerProfile = challenge.profiles as unknown as { display_name: string } | null
      setIncoming({
        id: challenge.id,
        challengerName: challengerProfile?.display_name ?? 'Someone',
      })
    }
  }, [userId])

  useEffect(() => {
    checkPendingChallenges()

    // Poll for new challenges every 3 seconds
    const interval = setInterval(checkPendingChallenges, 3000)

    return () => {
      clearInterval(interval)
    }
  }, [checkPendingChallenges])

  async function handleAccept() {
    if (!incoming) return
    setResponding(true)

    try {
      const res = await fetch(`/api/challenge/${incoming.id}`, {
        method: 'POST',
      })

      const data = await res.json()

      if (res.ok && data.matchId) {
        setIncoming(null)
        router.push(`/match/${data.matchId}`)
      } else {
        setIncoming(null)
        setResponding(false)
      }
    } catch {
      setIncoming(null)
      setResponding(false)
    }
  }

  async function handleDecline() {
    if (!incoming) return
    setResponding(true)

    try {
      await fetch(`/api/challenge/${incoming.id}`, {
        method: 'DELETE',
      })
    } catch {
      // ignore
    }

    setIncoming(null)
    setResponding(false)
  }

  if (!incoming) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="rounded-lg border border-border bg-card p-5 shadow-lg">
        <p className="text-sm font-medium text-foreground">
          <span className="text-scholar-vermillion">{incoming.challengerName}</span>{' '}
          challenged you!
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          1v1 Probability Duel
        </p>

        <div className="mt-4 flex gap-2">
          <button
            onClick={handleAccept}
            disabled={responding}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {responding ? 'Loading...' : 'Accept'}
          </button>
          <button
            onClick={handleDecline}
            disabled={responding}
            className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  )
}
