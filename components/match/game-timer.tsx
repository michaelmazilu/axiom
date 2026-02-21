import { cn } from '@/lib/utils'

interface GameTimerProps {
  timeRemaining: number
}

export function GameTimer({ timeRemaining }: GameTimerProps) {
  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60
  const isLow = timeRemaining <= 15
  const isCritical = timeRemaining <= 5

  return (
    <div className="flex flex-col items-center">
      <span
        className={cn(
          'font-mono text-3xl font-medium tabular-nums transition-colors',
          isCritical
            ? 'text-destructive'
            : isLow
              ? 'text-scholar-vermillion'
              : 'text-foreground'
        )}
      >
        {minutes}:{seconds.toString().padStart(2, '0')}
      </span>
      <span className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
        remaining
      </span>
    </div>
  )
}
