import { Suspense } from 'react'
import { QueueClient } from '@/components/queue/queue-client'
import type { GameMode } from '@/lib/game/math-generator'
import { GAME_MODES } from '@/lib/game/types'

export const metadata = {
  title: 'Finding match',
}

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>
}) {
  const { mode } = await searchParams
  const gameMode: GameMode = GAME_MODES.includes(mode as GameMode)
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
