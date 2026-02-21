'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

interface ProfileRow {
  id: string
  displayName: string
  eloProbability: number
  totalWins: number
  totalLosses: number
}

interface LeaderboardClientProps {
  profiles: ProfileRow[]
  currentUserId: string | null
}

export function LeaderboardClient({
  profiles,
  currentUserId,
}: LeaderboardClientProps) {
  const sorted = [...profiles].sort((a, b) => b.eloProbability - a.eloProbability)

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 lg:py-16">
      <div className="mb-10">
        <h1 className="text-2xl font-medium tracking-tight text-foreground">
          Leaderboard
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Top players ranked by ELO rating
        </p>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        {/* Header */}
        <div className="flex items-center border-b border-border px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <span className="w-12">#</span>
          <span className="flex-1">Player</span>
          <span className="w-20 text-right">ELO</span>
          <span className="w-20 text-right">W/L</span>
        </div>

        {/* Rows */}
        {sorted.length === 0 && (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            No players yet. Be the first to compete.
          </div>
        )}

        {sorted.map((profile, index) => {
          const isMe = profile.id === currentUserId

          return (
            <Link
              key={profile.id}
              href={`/profile/${profile.id}`}
              className={cn(
                'flex items-center px-5 py-3 transition-colors hover:bg-secondary/50',
                index < sorted.length - 1 && 'border-b border-border',
                isMe && 'bg-scholar-warm'
              )}
            >
              <span
                className={cn(
                  'w-12 font-mono text-sm',
                  index < 3 ? 'text-scholar-vermillion font-medium' : 'text-muted-foreground'
                )}
              >
                {index + 1}
              </span>
              <span className="flex-1">
                <span
                  className={cn(
                    'text-sm',
                    isMe ? 'font-medium text-foreground' : 'text-foreground'
                  )}
                >
                  {profile.displayName}
                </span>
                {isMe && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (you)
                  </span>
                )}
              </span>
              <span className="w-20 text-right font-mono text-sm text-foreground">
                {profile.eloProbability}
              </span>
              <span className="w-20 text-right font-mono text-xs text-muted-foreground">
                {profile.totalWins}/{profile.totalLosses}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
