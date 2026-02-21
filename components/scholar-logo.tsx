import { cn } from '@/lib/utils'

export function ScholarLogo({
  className,
  size = 'md',
}: {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  }

  return (
    <span
      className={cn(
        'font-mono tracking-[0.2em] uppercase font-medium text-foreground',
        sizeClasses[size],
        className
      )}
    >
      Scholar
    </span>
  )
}
