const examples = [
  { label: 'Counting', example: '4 coins flipped. Total outcomes?' },
  { label: 'Combinations', example: 'C(8, 3) = ?' },
  { label: 'Permutations', example: 'P(7, 3) = ?' },
  { label: 'Dice', example: '2 dice: ways to get sum 7?' },
  { label: 'Arrangements', example: '6 people line up. Person A first.' },
  { label: 'Grid Paths', example: '3 right, 2 down. Shortest paths?' },
]

export function LandingModes() {
  return (
    <section id="modes" className="border-t border-border px-6 py-20 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <h2 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl text-balance">
            Pure probability
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Counting, combinations, permutations, and chance — difficulty scales as you solve
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
