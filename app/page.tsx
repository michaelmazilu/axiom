import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AxiomLogo } from '@/components/axiom-logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { LandingHero } from '@/components/landing/hero'
import { LandingModes } from '@/components/landing/modes'

export default async function LandingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/lobby')

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-4 lg:px-12">
        <div className="flex items-center gap-3">
          <AxiomLogo size="sm" />
          <div className="h-4 w-px bg-border" />
          <span className="text-sm text-muted-foreground">Guest</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/auth/login"
            className="px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            href="/auth/sign-up"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Play now
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <LandingHero />
        <LandingModes />
      </main>

      <footer className="border-t border-border px-6 py-8 lg:px-12">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <AxiomLogo size="sm" className="text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Built for competition. Speed is everything.
          </p>
        </div>
      </footer>
    </div>
  )
}
