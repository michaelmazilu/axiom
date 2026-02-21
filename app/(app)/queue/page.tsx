import { Suspense } from 'react'
import { QueueClient } from '@/components/queue/queue-client'
import type { GameMode } from '@/lib/game/math-generator'

export const metadata = {
  title: 'Finding match',
}

const VALID_MODES: GameMode[] = ['combinatorics', 'discrete', 'conditional', 'all']

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>
}) {
  const { mode } = await searchParams
  const gameMode: GameMode = VALID_MODES.includes(mode as GameMode)
    ? (mode as GameMode)
    : 'all'

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      }
    >
      <QueueClient mode={gameMode} />
    </Suspense>
  )
}
