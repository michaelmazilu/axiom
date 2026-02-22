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

  // Check if this is ruppy_k user
  const isRuppyK = profile.display_name === 'ruppy_k'
  
  let matches
  if (isRuppyK) {
    // Hardcoded data for ruppy_k: 5 days, 6 games per day, more wins than losses
    const now = new Date()
    const hardcodedMatches = []
    const opponentId = '00000000-0000-0000-0000-000000000000' // Dummy opponent ID
    
    // Generate 30 matches across 5 days (6 per day)
    // More wins than losses: 18 wins, 10 losses, 2 draws
    const results = [
      ...Array(18).fill('win'),
      ...Array(10).fill('loss'),
      ...Array(2).fill('draw')
    ]
    
    // Shuffle results for randomness
    for (let i = results.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [results[i], results[j]] = [results[j], results[i]]
    }
    
    let resultIndex = 0
    for (let day = 0; day < 5; day++) {
      const date = new Date(now)
      date.setDate(date.getDate() - day)
      date.setHours(12, 0, 0, 0) // Set to noon
      
      for (let game = 0; game < 6; game++) {
        const gameTime = new Date(date)
        gameTime.setHours(12 + game, 0, 0, 0) // Spread games throughout the day
        
        const result = results[resultIndex++]
        const isPlayer1 = Math.random() > 0.5
        
        let player1Score, player2Score, winnerId
        if (result === 'win') {
          player1Score = isPlayer1 ? 15 + Math.floor(Math.random() * 10) : 5 + Math.floor(Math.random() * 8)
          player2Score = isPlayer1 ? 5 + Math.floor(Math.random() * 8) : 15 + Math.floor(Math.random() * 10)
          winnerId = id
        } else if (result === 'loss') {
          player1Score = isPlayer1 ? 5 + Math.floor(Math.random() * 8) : 15 + Math.floor(Math.random() * 10)
          player2Score = isPlayer1 ? 15 + Math.floor(Math.random() * 10) : 5 + Math.floor(Math.random() * 8)
          winnerId = opponentId
        } else { // draw
          const score = 8 + Math.floor(Math.random() * 6)
          player1Score = isPlayer1 ? score : score
          player2Score = isPlayer1 ? score : score
          winnerId = null
        }
        
        hardcodedMatches.push({
          id: `hardcoded-${day}-${game}`,
          mode: ['statistics', 'arithmetic', 'functions', 'calculus'][Math.floor(Math.random() * 4)],
          player1_id: isPlayer1 ? id : opponentId,
          player2_id: isPlayer1 ? opponentId : id,
          player1_score: player1Score,
          player2_score: player2Score,
          winner_id: winnerId,
          completed_at: gameTime.toISOString(),
        })
      }
    }
    
    // Sort by date descending (most recent first) and limit to 20
    matches = hardcodedMatches
      .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
      .slice(0, 20)
  } else {
    const { data: fetchedMatches } = await supabase
      .from('matches')
      .select('*')
      .or(`player1_id.eq.${id},player2_id.eq.${id}`)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(20)
    matches = fetchedMatches
  }

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
        id: m.id || `match-${Math.random()}`,
        mode: m.mode || 'statistics',
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
