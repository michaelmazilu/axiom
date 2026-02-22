const examples = [
  { label: 'Statistics', example: 'C(8, 3) = ?' },
  { label: 'Statistics', example: '2 dice: ways to get sum 7?' },
  { label: 'Arithmetic', example: '17 × 8 - 23 = ?' },
  { label: 'Arithmetic', example: '144 ÷ 12 = ?' },
  { label: 'Functions', example: 'Expand: (x + 3)(x - 2)' },
  { label: 'Calculus', example: 'd/dx (3x² + 2x) = ?' },
]

export function LandingModes() {
  return (
    <section id="modes" className="border-t border-border px-6 py-20 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <h2 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl text-balance">
            Four game modes
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Statistics, arithmetic, functions, and calculus — difficulty scales as you solve
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {examples.map((item) => (
            <div
              key={item.label}
              className="group flex flex-col rounded-lg border border-border bg-card p-5 transition-colors hover:border-scholar-stone/40"
            >
              <span className="mb-2 text-xs font-medium uppercase tracking-widest text-scholar-stone">
                {item.label}
              </span>
              <p className="font-mono text-sm text-foreground">
                {item.example}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
