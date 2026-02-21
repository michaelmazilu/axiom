import { createClient } from '@/lib/supabase/server'
import { LobbyClient } from '@/components/lobby/lobby-client'

export const metadata = {
  title: 'Lobby',
}

export default async function LobbyPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <LobbyClient
        isGuest
        profile={{
          id: 'guest',
          displayName: 'Guest',
          eloProbability: 800,
          totalWins: 0,
          totalLosses: 0,
          totalDraws: 0,
        }}
      />
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return (
      <LobbyClient
        isGuest
        profile={{
          id: 'guest',
          displayName: 'Guest',
          eloProbability: 800,
          totalWins: 0,
          totalLosses: 0,
          totalDraws: 0,
        }}
      />
    )
  }

  return (
    <LobbyClient
      profile={{
        id: profile.id,
        displayName: profile.display_name,
        eloProbability: profile.elo_probability ?? 800,
        totalWins: profile.total_wins,
        totalLosses: profile.total_losses,
        totalDraws: profile.total_draws,
      }}
    />
  )
}
