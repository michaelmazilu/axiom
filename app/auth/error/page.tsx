import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function AuthErrorPage() {
  return (
    <div className="w-full max-w-sm text-center">
      <div className="mb-2 font-mono text-4xl text-destructive">{'!!'}</div>
      <h1 className="text-xl font-medium tracking-tight text-foreground text-balance">
        Authentication error
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Something went wrong during authentication. Please try again.
      </p>
      <Button
        variant="outline"
        asChild
        className="mt-8 h-11 w-full border-border text-foreground"
      >
        <Link href="/auth/login">Return to sign in</Link>
      </Button>
    </div>
  )
}
