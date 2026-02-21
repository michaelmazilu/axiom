import Link from 'next/link'

export function LandingHero() {
  return (
    <section className="flex flex-col items-center px-6 pt-24 pb-20 text-center lg:pt-36 lg:pb-28">
      <div className="mb-6 inline-flex items-center rounded-full border border-border bg-secondary px-4 py-1.5">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          1v1 Probability Duels
        </span>
      </div>

      <h1 className="max-w-3xl text-4xl font-medium leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl text-balance">
        Where probability{' '}
        <span className="text-scholar-vermillion">meets competition</span>
      </h1>

      <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground text-pretty">
        120 seconds. Two players. One answer at a time. Scholar is a real-time
        competitive probability platform where speed and precision determine everything.
      </p>

      <div className="mt-10 flex items-center gap-4">
        <Link
          href="/auth/sign-up"
          className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Start competing
        </Link>
        <Link
          href="#how"
          className="rounded-md border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          How it works
        </Link>
      </div>

      {/* Decorative line */}
      <div className="mt-20 flex items-center gap-4">
        <div className="h-px w-16 bg-border" />
        <span className="font-mono text-xs text-scholar-stone tracking-widest">
          120s
        </span>
        <div className="h-px w-16 bg-border" />
      </div>
    </section>
  )
}
