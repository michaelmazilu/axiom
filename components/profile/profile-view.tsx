import { cn } from '@/lib/utils'
import { MODE_LABELS, resolveMode } from '@/lib/game/types'

interface ProfileData {
  id: string
  displayName: string
  eloProbability: number
  totalWins: number
  totalLosses: number
  totalDraws: number
  createdAt: string
}

interface MatchData {
  id: string
  mode: string
  player1Id: string
  player2Id: string
  player1Score: number
  player2Score: number
  winnerId: string | null
  completedAt: string | null
}

interface ProfileViewProps {
  profile: ProfileData
  matches: MatchData[]
  isOwnProfile: boolean
  viewingUserId: string
}

export function ProfileView({
  profile,
  matches,
  isOwnProfile,
  viewingUserId,
}: ProfileViewProps) {
  const joinDate = new Date(profile.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  })

  return (
    <div className="mx-auto max-w-4xl px-10 py-16 lg:py-20">
      {/* Header */}
      <div className="mb-12 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-xl font-medium text-foreground">
          {profile.displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            {profile.displayName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Joined {joinDate}
            {isOwnProfile && ' (you)'}
          </p>
        </div>
      </div>

      {/* ELO rating */}
      <div className="mb-12">
        <div className="rounded-lg border border-border bg-card px-6 py-5">
          <span className="text-xs text-muted-foreground">ELO</span>
          <div className="mt-1 font-mono text-2xl font-medium text-foreground">
            {profile.eloProbability}
          </div>
        </div>
      </div>

      {/* Match history */}
      <div>
        <h2 className="mb-6 text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Recent matches
        </h2>

        {matches.length === 0 && (
          <div className="rounded-lg border border-border bg-card px-5 py-12 text-center text-sm text-muted-foreground">
            No matches played yet.
          </div>
        )}

        <div className="flex flex-col rounded-lg border border-border bg-card">
          {matches.map((match, index) => {
            const isPlayer1 = match.player1Id === viewingUserId
            const myScore = isPlayer1 ? match.player1Score : match.player2Score
            const oppScore = isPlayer1 ? match.player2Score : match.player1Score
            const won = match.winnerId === viewingUserId
            const draw = match.winnerId === null
            const lost = !won && !draw

            return (
              <div
                key={match.id}
                className={cn(
                  'flex items-center justify-between px-5 py-3',
                  index < matches.length - 1 && 'border-b border-border'
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'w-12 text-xs font-medium',
                      won && 'text-scholar-success',
                      lost && 'text-scholar-vermillion',
                      draw && 'text-scholar-stone'
                    )}
                  >
                    {won ? 'WIN' : lost ? 'LOSS' : 'DRAW'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {MODE_LABELS[resolveMode(match.mode)]}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-foreground">
                    {myScore} - {oppScore}
                  </span>
                  {match.completedAt && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(match.completedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
