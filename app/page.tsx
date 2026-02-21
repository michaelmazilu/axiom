import Link from 'next/link'
import { ScholarLogo } from '@/components/scholar-logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { LandingHero } from '@/components/landing/hero'
import { LandingModes } from '@/components/landing/modes'
import { LandingHow } from '@/components/landing/how-it-works'

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-4 lg:px-12">
        <ScholarLogo size="sm" />
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
        <LandingHow />
      </main>

      <footer className="border-t border-border px-6 py-8 lg:px-12">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <ScholarLogo size="sm" className="text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Built for scholars. Speed is everything.
          </p>
        </div>
      </footer>
    </div>
  )
}
