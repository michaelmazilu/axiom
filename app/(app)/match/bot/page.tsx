import { BotMatchClient } from '@/components/match/bot-match-client'
import type { GameMode } from '@/lib/game/math-generator'

export const metadata = {
  title: 'Practice vs Bot',
}

const VALID_MODES: GameMode[] = ['combinatorics', 'discrete', 'conditional', 'all']

export default async function BotMatchPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>
}) {
  const { mode } = await searchParams
  const gameMode: GameMode = VALID_MODES.includes(mode as GameMode)
    ? (mode as GameMode)
    : 'all'

  return <BotMatchClient mode={gameMode} />
}
