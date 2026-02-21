import { cn } from '@/lib/utils'

export function AxiomLogo({
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
        'font-mono font-medium tracking-wide text-foreground',
        sizeClasses[size],
        className
      )}
    >
      A<span className="text-red-500">(x)</span>iom
    </span>
  )
}
