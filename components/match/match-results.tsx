'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { MatchResult } from '@/lib/game/types'
import { MODE_LABELS } from '@/lib/game/types'

interface MatchResultsProps {
  result: MatchResult
  currentUserId: string
}

export function MatchResults({ result, currentUserId }: MatchResultsProps) {
  const isWinner = result.winnerId === currentUserId
  const isDraw = result.winnerId === null

  const me =
    result.player1.id === currentUserId ? result.player1 : result.player2
  const opponent =
    result.player1.id === currentUserId ? result.player2 : result.player1

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 py-12">
      {/* Outcome */}
      <div className="mb-2 text-sm uppercase tracking-widest text-muted-foreground">
        {MODE_LABELS[result.mode] ?? 'Probability'}
      </div>
      <h1
        className={cn(
          'text-3xl font-medium tracking-tight',
          isDraw
            ? 'text-scholar-stone'
            : isWinner
              ? 'text-scholar-success'
              : 'text-scholar-vermillion'
        )}
      >
        {isDraw ? 'Draw' : isWinner ? 'Victory' : 'Defeat'}
      </h1>

      {/* Score comparison */}
      <div className="mt-10 flex w-full items-center justify-between rounded-lg border border-border bg-card px-8 py-6">
        <div className="flex flex-col items-center">
          <span className="text-xs text-muted-foreground">You</span>
          <span className="mt-1 font-mono text-3xl font-medium text-foreground">
            {me.score}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">
            {me.displayName}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-xs text-scholar-stone">vs</span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-xs text-muted-foreground">Opponent</span>
          <span className="mt-1 font-mono text-3xl font-medium text-foreground">
            {opponent.score}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">
            {opponent.displayName}
          </span>
        </div>
      </div>

      {/* ELO changes */}
      <div className="mt-6 flex w-full items-center justify-between rounded-lg border border-border bg-card px-8 py-4">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Your rating</span>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-mono text-lg font-medium text-foreground">
              {me.eloAfter}
            </span>
            {me.delta !== 0 && (
              <span
                className={cn(
                  'font-mono text-sm',
                  me.delta > 0 ? 'text-scholar-success' : 'text-scholar-vermillion'
                )}
              >
                {me.delta > 0 ? '+' : ''}
                {me.delta}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-xs text-muted-foreground">Opponent rating</span>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-mono text-lg font-medium text-foreground">
              {opponent.eloAfter}
            </span>
            {opponent.delta !== 0 && (
              <span
                className={cn(
                  'font-mono text-sm',
                  opponent.delta > 0
                    ? 'text-scholar-success'
                    : 'text-scholar-vermillion'
                )}
              >
                {opponent.delta > 0 ? '+' : ''}
                {opponent.delta}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-10 flex items-center gap-4">
        <Link
          href="/lobby"
          onClick={(e) => {
            e.preventDefault()
            window.location.href = '/lobby'
          }}
          className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Play again
        </Link>
        <Link
          href="/leaderboard"
          className="rounded-md border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          Leaderboard
        </Link>
      </div>
    </div>
  )
}
