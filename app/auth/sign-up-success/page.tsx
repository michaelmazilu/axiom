import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function SignUpSuccessPage() {
  return (
    <div className="w-full max-w-sm text-center">
      <div className="mb-2 font-mono text-4xl text-scholar-vermillion">
        {'//'}
      </div>
      <h1 className="text-xl font-medium tracking-tight text-foreground text-balance">
        Check your email
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        We sent a confirmation link to your email address. Click it to activate
        your account and begin competing.
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
