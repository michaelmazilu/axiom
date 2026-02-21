import { BotMatchClient } from '@/components/match/bot-match-client'
import { createClient } from '@/lib/supabase/server'
import type { GameMode } from '@/lib/game/math-generator'
import { GAME_MODES } from '@/lib/game/types'

export const metadata = {
  title: 'Practice vs Bot',
}

export default async function BotMatchPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>
}) {
  const { mode } = await searchParams
  const gameMode: GameMode = GAME_MODES.includes(mode as GameMode)
    ? (mode as GameMode)
    : 'all'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let userElo = 1200
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('elo_probability')
      .eq('id', user.id)
      .single()
    userElo = profile?.elo_probability ?? 1200
  }

  return <BotMatchClient mode={gameMode} userElo={userElo} />
}
