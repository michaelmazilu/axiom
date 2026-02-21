import { createClient } from '@/lib/supabase/server'
import { LeaderboardClient } from '@/components/leaderboard/leaderboard-client'

export const metadata = {
  title: 'Leaderboard',
}

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('elo_probability', { ascending: false })
    .limit(50)

  return (
    <LeaderboardClient
      profiles={
        (profiles ?? []).map((p) => ({
          id: p.id,
          displayName: p.display_name,
          eloProbability: p.elo_probability ?? 800,
          totalWins: p.total_wins,
          totalLosses: p.total_losses,
        }))
      }
      currentUserId={user?.id ?? null}
    />
  )
}
