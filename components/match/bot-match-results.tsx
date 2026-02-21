'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

interface BotMatchResultsProps {
  myScore: number
  botScore: number
}

export function BotMatchResults({ myScore, botScore }: BotMatchResultsProps) {
  const isWinner = myScore > botScore
  const isDraw = myScore === botScore

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 py-12">
      <div className="mb-2 text-sm uppercase tracking-widest text-muted-foreground">
        Practice Match
      </div>
      <h1
        className={cn(
          'text-3xl font-medium tracking-tight',
          isDraw
            ? 'text-muted-foreground'
            : isWinner
              ? 'text-scholar-success'
              : 'text-scholar-vermillion'
        )}
      >
        {isDraw ? 'Draw' : isWinner ? 'Victory' : 'Defeat'}
      </h1>

      <div className="mt-10 flex w-full items-center justify-between rounded-lg border border-border bg-card px-8 py-6">
        <div className="flex flex-col items-center">
          <span className="text-xs text-muted-foreground">You</span>
          <span className="mt-1 font-mono text-3xl font-medium text-foreground">
            {myScore}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-xs text-muted-foreground">vs</span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-xs text-muted-foreground">Axiom Bot</span>
          <span className="mt-1 font-mono text-3xl font-medium text-foreground">
            {botScore}
          </span>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Practice matches don&apos;t affect your rating
      </p>

      <div className="mt-10 flex items-center gap-4">
        <Link
          href="/match/bot"
          className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Play again
        </Link>
        <Link
          href="/lobby"
          className="rounded-md border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          Back to lobby
        </Link>
      </div>
    </div>
  )
}
