'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MODE_LABELS, MATCH_DURATION, COUNTDOWN_DURATION } from '@/lib/game/types'
import type { GameMode } from '@/lib/game/math-generator'

const MATCH_STALE_MS = (MATCH_DURATION + COUNTDOWN_DURATION + 60) * 1000

type QueueStatus = 'joining' | 'waiting' | 'matched' | 'error'

interface QueueClientProps {
  mode: GameMode
}

export function QueueClient({ mode }: QueueClientProps) {
  const router = useRouter()
  const [status, setStatus] = useState<QueueStatus>('joining')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [matchId, setMatchId] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasJoined = useRef(false)

  const joinQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/matchmaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      })

      const data = await res.json()

      if (!res.ok) {
        const debugInfo = data.debug ? `\n[mode=${data.debug?.insertPayload?.mode}, code=${data.debug?.errorCode}]` : ''
        setErrorMsg((data.error || 'Server error') + debugInfo)
        setStatus('error')
        return
      }

      if (data.status === 'matched') {
        setStatus('matched')
        setMatchId(data.matchId)
        setTimeout(() => {
          router.push(`/match/${data.matchId}`)
        }, 1500)
        return
      }

      if (data.status === 'waiting') {
        setStatus('waiting')
        startPolling()
        return
      }

      setErrorMsg('Unexpected response')
      setStatus('error')
    } catch {
      setErrorMsg('Network error')
      setStatus('error')
    }
  }, [router, mode])

  function startPolling() {
    pollRef.current = setInterval(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: queueEntry } = await supabase
          .from('matchmaking_queue')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'matched')
          .maybeSingle()

        if (queueEntry?.match_id) {
          if (pollRef.current) clearInterval(pollRef.current)
          setStatus('matched')
          setMatchId(queueEntry.match_id)
          setTimeout(() => {
            router.push(`/match/${queueEntry.match_id}`)
          }, 1500)
          return
        }

        // Fallback: check matches table directly for a genuinely active match
        // Only consider recent matches (within match duration + buffer)
        const recentThreshold = new Date(Date.now() - MATCH_STALE_MS).toISOString()
        const { data: activeMatch } = await supabase
          .from('matches')
          .select('id')
          .eq('status', 'in_progress')
          .gte('created_at', recentThreshold)
          .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
          .limit(1)
          .maybeSingle()

        if (activeMatch) {
          if (pollRef.current) clearInterval(pollRef.current)
          supabase
            .from('matchmaking_queue')
            .delete()
            .eq('user_id', user.id)
            .then(() => {})
          setStatus('matched')
          setMatchId(activeMatch.id)
          setTimeout(() => {
            router.push(`/match/${activeMatch.id}`)
          }, 1500)
          return
        }

        const res = await fetch('/api/matchmaking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode }),
        })
        const data = await res.json()

        if (data.status === 'matched') {
          if (pollRef.current) clearInterval(pollRef.current)
          setStatus('matched')
          setMatchId(data.matchId)
          setTimeout(() => {
            router.push(`/match/${data.matchId}`)
          }, 1500)
        }
      } catch {
        // silently retry
      }
    }, 3000)
  }

  useEffect(() => {
    if (!hasJoined.current) {
      hasJoined.current = true
      joinQueue()
    }

    intervalRef.current = setInterval(() => {
      setElapsed((e) => e + 1)
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [joinQueue])

  async function handleCancel() {
    if (pollRef.current) clearInterval(pollRef.current)
    await fetch('/api/matchmaking', { method: 'DELETE' })
    router.push('/lobby')
  }

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center text-center">
        <div className="mb-8 inline-flex items-center rounded-full border border-border bg-secondary px-4 py-1.5">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {MODE_LABELS[mode]}
          </span>
        </div>

        {status === 'joining' && (
          <h1 className="text-xl font-medium text-foreground">
            Joining queue...
          </h1>
        )}

        {status === 'waiting' && (
          <>
            <h1 className="text-xl font-medium text-foreground">
              Searching for opponent
            </h1>

            <div className="mt-8 flex items-center gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-2 w-2 rounded-full bg-scholar-stone"
                  style={{
                    animation: 'pulse 1.4s ease-in-out infinite',
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>

            <p className="mt-6 font-mono text-sm text-muted-foreground">
              {minutes > 0 ? `${minutes}m ` : ''}
              {seconds.toString().padStart(2, '0')}s
            </p>

            <button
              onClick={handleCancel}
              className="mt-10 text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
            >
              Cancel
            </button>
          </>
        )}

        {status === 'matched' && (
          <>
            <h1 className="text-xl font-medium text-foreground">
              Opponent found
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Preparing your match...
            </p>

            <div className="mt-8 h-px w-24 bg-scholar-vermillion" />
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="text-xl font-medium text-foreground">
              Something went wrong
            </h1>
            {errorMsg && (
              <p className="mt-3 text-sm text-destructive">{errorMsg}</p>
            )}
            <button
              onClick={() => {
                setStatus('joining')
                setErrorMsg(null)
                joinQueue()
              }}
              className="mt-6 text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
            >
              Try again
            </button>
            <button
              onClick={() => router.push('/lobby')}
              className="mt-3 text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
            >
              Return to lobby
            </button>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%,
          80%,
          100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          40% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}
