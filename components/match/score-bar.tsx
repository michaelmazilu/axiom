import { cn } from '@/lib/utils'

interface ScoreBarProps {
  name: string
  score: number
  align: 'left' | 'right'
  isMe?: boolean
}

export function ScoreBar({ name, score, align, isMe }: ScoreBarProps) {
  return (
    <div
      className={cn('flex flex-col gap-0.5', align === 'right' && 'items-end')}
    >
      <span
        className={cn(
          'text-xs',
          isMe ? 'text-foreground font-medium' : 'text-muted-foreground'
        )}
      >
        {name}
      </span>
      <span className="font-mono text-2xl font-medium text-foreground tabular-nums">
        {score}
      </span>
    </div>
  )
}
