import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LobbyClient } from '@/components/lobby/lobby-client'

export const metadata = {
  title: 'Lobby',
}

export default async function LobbyPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  return (
    <LobbyClient
      profile={{
        id: profile.id,
        displayName: profile.display_name,
        eloProbability: profile.elo_probability ?? 1200,
        totalWins: profile.total_wins,
        totalLosses: profile.total_losses,
        totalDraws: profile.total_draws,
      }}
    />
  )
}
