'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trophy, Info, ChevronUp } from 'lucide-react'
import { ChartContainer } from '@/components/ui/chart'
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from 'recharts'
import { cn } from '@/lib/utils'

interface PerformanceData {
  highestAccuracy: number
  totalAttempts: number
  winRate: number
  averageScore: number
  wins: number
  losses: number
  draws: number
  accuracyTrend: { date: string; value: number }[]
  eloTrend: { date: string; value: number }[]
}

interface PerformanceAnalyticsProps {
  userId: string
  variant?: 'sidebar' | 'page'
}

export function PerformanceAnalytics({ userId, variant = 'sidebar' }: PerformanceAnalyticsProps) {
  const [data, setData] = useState<PerformanceData | null>(null)
  const [isExpanded, setIsExpanded] = useState(variant === 'page')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPerformanceData() {
      const supabase = createClient()

      const { data: matches } = await supabase
        .from('matches')
        .select('player1_id, player2_id, player1_score, player2_score, winner_id, status, completed_at, created_at')
        .eq('status', 'completed')
        .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (!matches || matches.length === 0) {
        setData(null)
        setLoading(false)
        return
      }

      // Calculate metrics
      const userMatches = matches.map((match) => {
        const isPlayer1 = match.player1_id === userId
        const userScore = isPlayer1 ? match.player1_score : match.player2_score
        const opponentScore = isPlayer1 ? match.player2_score : match.player1_score
        const won = match.winner_id === userId
        const totalScore = userScore + opponentScore
        const accuracy = totalScore > 0 ? (userScore / totalScore) * 100 : 0
        
        return {
          score: userScore,
          accuracy,
          won,
          isDraw: match.winner_id === null,
          date: match.completed_at || match.created_at,
        }
      })

      const totalAttempts = userMatches.length
      const wins = userMatches.filter((m) => m.won === true).length
      const draws = userMatches.filter((m) => m.isDraw === true).length
      const losses = totalAttempts - wins - draws
      const winRate = totalAttempts > 0 ? (wins / totalAttempts) * 100 : 0
      const highestAccuracy = Math.max(...userMatches.map((m) => m.accuracy), 0)
      const averageScore =
        userMatches.reduce((sum, m) => sum + m.score, 0) / totalAttempts

      // Fetch ELO history from matches (or use hardcoded data for ruppy_k)
      let eloMatches
      if (isRuppyK) {
        // For hardcoded matches, calculate ELO progression
        // Start at 800 and simulate ELO changes
        let currentElo = 800
        const opponentId = '00000000-0000-0000-0000-000000000000'
        eloMatches = matches
          .slice()
          .reverse() // Sort ascending by date
          .map((match) => {
            const isPlayer1 = match.player1_id === userId
            // Simulate ELO changes: +16 for win, -16 for loss, 0 for draw (with K=16)
            if (match.winner_id === userId) {
              currentElo += 16
            } else if (match.winner_id === opponentId) {
              currentElo = Math.max(100, currentElo - 16)
            }
            // else draw, no change
            
            return {
              player1_id: match.player1_id,
              player2_id: match.player2_id,
              player1_elo_after: isPlayer1 ? currentElo : 800,
              player2_elo_after: isPlayer1 ? 800 : currentElo,
              completed_at: match.completed_at,
            }
          })
      } else {
        const { data: fetchedEloMatches } = await supabase
          .from('matches')
          .select('player1_id, player2_id, player1_elo_after, player2_elo_after, completed_at')
          .eq('status', 'completed')
          .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: true })
        eloMatches = fetchedEloMatches
      }

      // Generate accuracy trend from actual match data with dates
      const accuracyTrend = userMatches
        .filter(m => m.date)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(m => ({
          date: new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: Math.round(m.accuracy),
        }))
      
      // Generate ELO trend from actual match data with dates
      let eloTrend: { date: string; value: number }[] = []
      if (eloMatches && eloMatches.length > 0) {
        eloTrend = eloMatches
          .filter(match => {
            const isPlayer1 = match.player1_id === userId
            const elo = isPlayer1 ? match.player1_elo_after : match.player2_elo_after
            return elo !== null && elo !== undefined && match.completed_at
          })
          .map(match => {
            const isPlayer1 = match.player1_id === userId
            const elo = isPlayer1 ? match.player1_elo_after : match.player2_elo_after
            return {
              date: new Date(match.completed_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              value: elo as number,
            }
          })
      }

      setData({
        highestAccuracy: Math.round(highestAccuracy),
        totalAttempts,
        winRate: Math.round(winRate),
        averageScore: Math.round(averageScore),
        wins,
        losses,
        draws,
        accuracyTrend,
        eloTrend,
      })
      setLoading(false)
    }

    fetchPerformanceData()
  }, [userId])

  if (loading) {
    if (variant === 'page') {
      return (
        <div className="py-8 text-center text-muted-foreground">
          Loading performance data...
        </div>
      )
    }
    return (
      <div className="border-t border-sidebar-border px-3 py-4">
        <div className="text-xs text-muted-foreground">Loading performance...</div>
      </div>
    )
  }

  if (!data) {
    if (variant === 'page') {
      return (
        <div className="py-8 text-center text-muted-foreground">
          No matches played yet. Play a game to see your stats.
        </div>
      )
    }
    return (
      <div className="border-t border-sidebar-border px-3 py-4">
        <div className="text-xs text-muted-foreground">No match data yet</div>
      </div>
    )
  }

  const isSidebar = variant === 'sidebar'

  return (
    <div className={cn(isSidebar && 'border-t border-sidebar-border')}>
      {isSidebar && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between px-3 py-3 text-left"
        >
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-sidebar-foreground">
              Performance Analytics
            </h3>
            <Info className="h-3 w-3 text-muted-foreground" />
          </div>
          <ChevronUp
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              !isExpanded && 'rotate-180'
            )}
          />
        </button>
      )}

      {isExpanded && (
        <div className={cn(
          'space-y-4',
          isSidebar ? 'px-3 pb-4' : 'py-4'
        )}>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className={cn(
              'rounded-lg border p-3',
              isSidebar 
                ? 'border-sidebar-border bg-sidebar-accent/30' 
                : 'border-border bg-muted/50'
            )}>
              <div className="flex items-center gap-1.5 mb-1">
                <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                <span className={cn(
                  'text-xs',
                  isSidebar ? 'text-muted-foreground' : 'text-muted-foreground'
                )}>Highest accuracy</span>
              </div>
              <div className={cn(
                'text-lg font-semibold',
                isSidebar ? 'text-sidebar-foreground' : 'text-foreground'
              )}>
                {data.highestAccuracy}%
              </div>
            </div>
            <div className={cn(
              'rounded-lg border p-3',
              isSidebar 
                ? 'border-sidebar-border bg-sidebar-accent/30' 
                : 'border-border bg-muted/50'
            )}>
              <div className={cn(
                'text-xs mb-1',
                isSidebar ? 'text-muted-foreground' : 'text-muted-foreground'
              )}>Total attempts</div>
              <div className={cn(
                'text-lg font-semibold',
                isSidebar ? 'text-sidebar-foreground' : 'text-foreground'
              )}>
                {data.totalAttempts}
              </div>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className={cn(
              'rounded-lg border p-3',
              isSidebar 
                ? 'border-sidebar-border bg-sidebar-accent/30' 
                : 'border-border bg-muted/50'
            )}>
              <div className={cn(
                'text-xs mb-1',
                isSidebar ? 'text-muted-foreground' : 'text-muted-foreground'
              )}>Win rate</div>
              <div className={cn(
                'text-lg font-semibold',
                isSidebar ? 'text-sidebar-foreground' : 'text-foreground'
              )}>
                {data.winRate}%
              </div>
            </div>
            <div className={cn(
              'rounded-lg border p-3',
              isSidebar 
                ? 'border-sidebar-border bg-sidebar-accent/30' 
                : 'border-border bg-muted/50'
            )}>
              <div className={cn(
                'text-xs mb-1',
                isSidebar ? 'text-muted-foreground' : 'text-muted-foreground'
              )}>Avg score</div>
              <div className={cn(
                'text-lg font-semibold',
                isSidebar ? 'text-sidebar-foreground' : 'text-foreground'
              )}>
                {data.averageScore}
              </div>
            </div>
          </div>

          {/* Wins/Losses/Draws */}
          <div className="grid grid-cols-3 gap-3">
            <div className={cn(
              'rounded-lg border p-3',
              isSidebar 
                ? 'border-sidebar-border bg-sidebar-accent/30' 
                : 'border-border bg-muted/50'
            )}>
              <div className={cn(
                'text-xs mb-1',
                isSidebar ? 'text-muted-foreground' : 'text-muted-foreground'
              )}>Wins</div>
              <div className={cn(
                'text-lg font-semibold',
                isSidebar ? 'text-sidebar-foreground' : 'text-foreground'
              )}>
                {data.wins}
              </div>
            </div>
            <div className={cn(
              'rounded-lg border p-3',
              isSidebar 
                ? 'border-sidebar-border bg-sidebar-accent/30' 
                : 'border-border bg-muted/50'
            )}>
              <div className={cn(
                'text-xs mb-1',
                isSidebar ? 'text-muted-foreground' : 'text-muted-foreground'
              )}>Losses</div>
              <div className={cn(
                'text-lg font-semibold',
                isSidebar ? 'text-sidebar-foreground' : 'text-foreground'
              )}>
                {data.losses}
              </div>
            </div>
            <div className={cn(
              'rounded-lg border p-3',
              isSidebar 
                ? 'border-sidebar-border bg-sidebar-accent/30' 
                : 'border-border bg-muted/50'
            )}>
              <div className={cn(
                'text-xs mb-1',
                isSidebar ? 'text-muted-foreground' : 'text-muted-foreground'
              )}>Draws</div>
              <div className={cn(
                'text-lg font-semibold',
                isSidebar ? 'text-sidebar-foreground' : 'text-foreground'
              )}>
                {data.draws}
              </div>
            </div>
          </div>

          {/* Accuracy Trend */}
          <div className="space-y-2">
            <div className={cn(
              'text-xs font-medium',
              isSidebar ? 'text-sidebar-foreground' : 'text-foreground'
            )}>
              Accuracy trend
            </div>
            {data.accuracyTrend.length > 0 ? (
              <div className="h-32 w-full">
                <ChartContainer
                  config={{
                    accuracy: {
                      label: 'Accuracy',
                      color: 'hsl(var(--chart-1))',
                    },
                  }}
                  className="h-full w-full"
                >
                  <LineChart data={data.accuracyTrend} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                      width={30}
                      domain={[0, 100]}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#16a34a"
                      strokeWidth={2}
                      dot={{ r: 2, fill: '#16a34a' }}
                      activeDot={{ r: 4, fill: '#16a34a' }}
                    />
                  </LineChart>
                </ChartContainer>
              </div>
            ) : (
              <div className="h-32 w-full flex items-center justify-center text-xs text-muted-foreground">
                No data available
              </div>
            )}
          </div>

          {/* ELO Trend */}
          <div className="space-y-2">
            <div className={cn(
              'text-xs font-medium',
              isSidebar ? 'text-sidebar-foreground' : 'text-foreground'
            )}>
              ELO trend
            </div>
            {data.eloTrend.length > 0 ? (
              <div className="h-32 w-full">
                <ChartContainer
                  config={{
                    elo: {
                      label: 'ELO',
                      color: 'hsl(var(--chart-2))',
                    },
                  }}
                  className="h-full w-full"
                >
                  <LineChart data={data.eloTrend} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                      width={35}
                      domain={['dataMin - 30', 'dataMax + 30']}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ r: 2, fill: '#2563eb' }}
                      activeDot={{ r: 4, fill: '#2563eb' }}
                    />
                  </LineChart>
                </ChartContainer>
              </div>
            ) : (
              <div className="h-32 w-full flex items-center justify-center text-xs text-muted-foreground">
                No data available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

