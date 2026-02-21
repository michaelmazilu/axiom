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
      {/* Problem number */}
      <div className="mb-4">
        <span className="font-mono text-sm font-medium text-muted-foreground">
          #{index + 1}
        </span>
      </div>

      {/* Question */}
      <div
        className={cn(
          'rounded-lg border px-8 py-6 transition-all duration-200',
          feedback === 'correct'
            ? 'border-2 border-scholar-success bg-scholar-success/20 scale-105 shadow-lg shadow-scholar-success/20'
            : feedback === 'incorrect'
              ? 'border-2 border-destructive bg-destructive/30 scale-105 shadow-lg shadow-destructive/30 animate-pulse'
              : 'border border-border bg-card'
        )}
      >
        <p className="text-center font-mono text-2xl font-medium text-foreground sm:text-3xl">
          {problem.question}
        </p>
      </div>
    </div>
  )
}
