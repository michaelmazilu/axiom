const steps = [
  {
    number: '01',
    title: 'Enter the queue',
    description: 'Matchmaking pairs you with an opponent of similar skill. Fair fights only.',
  },
  {
    number: '02',
    title: 'Solve in 120 seconds',
    description: 'Both players receive identical probability problems. Answer correctly to score. Speed wins.',
  },
  {
    number: '03',
    title: 'Climb the ranks',
    description: 'Win to gain Elo. Lose to drop. Track your progress on the leaderboard.',
  },
]

export function LandingHow() {
  return (
    <section id="how" className="border-t border-border px-6 py-20 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-3xl">
        <div className="mb-14 text-center">
          <h2 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl text-balance">
            How it works
          </h2>
        </div>

        <div className="flex flex-col gap-8">
          {steps.map((step) => (
            <div key={step.number} className="flex gap-6">
              <div className="flex-shrink-0">
                <span className="font-mono text-xs text-scholar-stone">
                  {step.number}
                </span>
              </div>
              <div className="flex-1 border-b border-border pb-8">
                <h3 className="text-base font-medium text-foreground">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
