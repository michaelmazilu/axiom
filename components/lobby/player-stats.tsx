import { cn } from '@/lib/utils'

interface PlayerStatsProps {
  profile: {
    eloProbability: number
    totalWins: number
    totalLosses: number
    totalDraws: number
  }
  className?: string
}

export function PlayerStats({ profile, className }: PlayerStatsProps) {
  const totalGames = profile.totalWins + profile.totalLosses + profile.totalDraws
  const winRate = totalGames > 0 ? Math.round((profile.totalWins / totalGames) * 100) : 0

  const stats = [
    { label: 'ELO', value: profile.eloProbability.toString() },
    { label: 'W / L / D', value: `${profile.totalWins} / ${profile.totalLosses} / ${profile.totalDraws}` },
    { label: 'Win rate', value: `${winRate}%` },
    { label: 'Matches', value: totalGames.toString() },
  ]

  return (
    <div className={cn('grid grid-cols-2 gap-4 sm:grid-cols-4', className)}>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col rounded-lg border border-border bg-card px-4 py-3"
        >
          <span className="text-xs text-muted-foreground">{stat.label}</span>
          <span className="mt-1 font-mono text-lg font-medium text-foreground">
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  )
}
