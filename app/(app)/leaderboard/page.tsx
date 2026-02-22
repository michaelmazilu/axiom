import { createClient } from '@/lib/supabase/server'
import { LeaderboardClient } from '@/components/leaderboard/leaderboard-client'

export const metadata = {
  title: 'Leaderboard',
}

export const dynamic = 'force-dynamic'

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, elo_probability, total_wins, total_losses')
    .order('elo_probability', { ascending: false })
    .limit(50)

  return (
    <LeaderboardClient
      profiles={(profiles ?? []).map((p) => ({
        id: p.id,
        displayName: p.display_name ?? 'Unknown',
        eloProbability: p.elo_probability ?? 800,
        totalWins: p.total_wins ?? 0,
        totalLosses: p.total_losses ?? 0,
      }))}
      currentUserId={user?.id ?? null}
    />
  )
}
