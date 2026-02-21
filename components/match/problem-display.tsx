import { cn } from '@/lib/utils'
import type { MathProblem } from '@/lib/game/math-generator'

interface ProblemDisplayProps {
  problem: MathProblem
  index: number
  feedback: 'correct' | 'incorrect' | null
}

export function ProblemDisplay({ problem, index, feedback }: ProblemDisplayProps) {
  return (
    <div className="flex flex-col items-center">
      {/* Problem number & difficulty */}
      <div className="mb-4 flex items-center gap-3">
        <span className="font-mono text-xs text-muted-foreground">
          #{index + 1}
        </span>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1 w-3 rounded-full',
                i < problem.difficulty
                  ? 'bg-scholar-vermillion'
                  : 'bg-border'
              )}
            />
          ))}
        </div>
      </div>

      {/* Question */}
      <div
        className={cn(
          'rounded-lg border px-8 py-6 transition-colors',
          feedback === 'correct'
            ? 'border-scholar-success bg-scholar-success/5'
            : feedback === 'incorrect'
              ? 'border-destructive bg-destructive/5'
              : 'border-border bg-card'
        )}
      >
        <p className="text-center font-mono text-2xl font-medium text-foreground sm:text-3xl">
          {problem.question}
        </p>
      </div>
    </div>
  )
}
