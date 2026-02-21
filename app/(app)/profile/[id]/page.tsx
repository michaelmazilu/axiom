import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileView } from '@/components/profile/profile-view'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', id)
    .single()

  return {
    title: profile?.display_name ?? 'Profile',
  }
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!profile) redirect('/lobby')

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .or(`player1_id.eq.${id},player2_id.eq.${id}`)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(20)

  return (
    <ProfileView
      profile={{
        id: profile.id,
        displayName: profile.display_name,
        eloProbability: profile.elo_probability ?? 800,
        totalWins: profile.total_wins ?? 0,
        totalLosses: profile.total_losses ?? 0,
        totalDraws: profile.total_draws ?? 0,
        createdAt: profile.created_at,
      }}
      matches={(matches ?? []).map((m) => ({
        id: m.id,
        mode: m.mode,
        player1Id: m.player1_id,
        player2Id: m.player2_id,
        player1Score: m.player1_score,
        player2Score: m.player2_score,
        winnerId: m.winner_id,
        completedAt: m.completed_at,
      }))}
      isOwnProfile={user?.id === id}
      viewingUserId={id}
    />
  )
}
