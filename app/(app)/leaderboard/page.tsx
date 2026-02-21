import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { LeaderboardClient } from '@/components/leaderboard/leaderboard-client'

export const metadata = {
  title: 'Leaderboard',
}

export const dynamic = 'force-dynamic'

const PREVIEW_PROFILES = [
  { id: 'preview-1',  displayName: 'QuantumAce',      eloProbability: 3121, totalWins: 247, totalLosses: 38 },
  { id: 'preview-2',  displayName: 'ProbMaster',       eloProbability: 3054, totalWins: 231, totalLosses: 45 },
  { id: 'preview-3',  displayName: 'BayesianKing',     eloProbability: 2981, totalWins: 219, totalLosses: 52 },
  { id: 'preview-4',  displayName: 'StochasticWolf',   eloProbability: 2943, totalWins: 208, totalLosses: 61 },
  { id: 'preview-5',  displayName: 'MarkovChainGang',  eloProbability: 2897, totalWins: 195, totalLosses: 67 },
  { id: 'preview-6',  displayName: 'EulerPath',        eloProbability: 2851, totalWins: 184, totalLosses: 73 },
  { id: 'preview-7',  displayName: 'CombinatorX',      eloProbability: 2804, totalWins: 176, totalLosses: 80 },
  { id: 'preview-8',  displayName: 'DiscreteNinja',    eloProbability: 2762, totalWins: 168, totalLosses: 86 },
  { id: 'preview-9',  displayName: 'SetTheoryGod',     eloProbability: 2718, totalWins: 159, totalLosses: 91 },
  { id: 'preview-10', displayName: 'GraphTraverser',   eloProbability: 2689, totalWins: 152, totalLosses: 97 },
  { id: 'preview-11', displayName: 'PermutationPro',   eloProbability: 2658, totalWins: 144, totalLosses: 102 },
  { id: 'preview-12', displayName: 'ConditionalKid',   eloProbability: 2632, totalWins: 138, totalLosses: 108 },
]

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, display_name, elo_probability, total_wins, total_losses')
    .order('elo_probability', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[leaderboard] profiles query error:', error)
  }

  const realProfiles = (profiles ?? []).map((p) => ({
    id: p.id as string,
    displayName: (p.display_name ?? 'Unknown') as string,
    eloProbability: (p.elo_probability ?? 800) as number,
    totalWins: (p.total_wins ?? 0) as number,
    totalLosses: (p.total_losses ?? 0) as number,
  }))

  const combined = [...realProfiles, ...PREVIEW_PROFILES]
    .sort((a, b) => b.eloProbability - a.eloProbability)

  return (
    <LeaderboardClient
      profiles={combined}
      currentUserId={user?.id ?? null}
    />
  )
}
