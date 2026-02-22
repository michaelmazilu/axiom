import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MatchClient } from '@/components/match/match-client'
import { resolveMode } from '@/lib/game/types'

export const metadata = {
  title: 'Match',
}

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', id)
    .single()

  if (!match) redirect('/lobby')

  if (match.player1_id !== user.id && match.player2_id !== user.id) {
    redirect('/lobby')
  }

  // Clean up queue entries now that the player has entered the match
  await supabase
    .from('matchmaking_queue')
    .delete()
    .eq('user_id', user.id)

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', [match.player1_id, match.player2_id])

  if (!profiles || profiles.length < 2) redirect('/lobby')

  const p1Profile = profiles.find((p) => p.id === match.player1_id)!
  const p2Profile = profiles.find((p) => p.id === match.player2_id)!

  const isPlayer1 = user.id === match.player1_id

  return (
    <MatchClient
      matchId={match.id}
      mode={resolveMode(match.mode)}
      seed={match.seed}
      currentUserId={user.id}
      isPlayer1={isPlayer1}
      player1={{
        id: p1Profile.id,
        displayName: p1Profile.display_name,
        elo: match.player1_elo_before,
      }}
      player2={{
        id: p2Profile.id,
        displayName: p2Profile.display_name,
        elo: match.player2_elo_before,
      }}
    />
  )
}
