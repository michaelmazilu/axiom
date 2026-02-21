'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trophy, Info, ChevronUp } from 'lucide-react'
import { ChartContainer } from '@/components/ui/chart'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

interface PerformanceData {
  highestAccuracy: number
  totalAttempts: number
  winRate: number
  averageScore: number
  accuracyTrend: { value: number }[]
  speedTrend: { value: number }[]
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
      
      // Fetch user's completed matches
      const { data: matches } = await supabase
        .from('matches')
        .select('player1_id, player2_id, player1_score, player2_score, winner_id, status, completed_at, created_at')
        .eq('status', 'completed')
        .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (!matches || matches.length === 0) {
        // Return default data for new users
        setData({
          highestAccuracy: 0,
          totalAttempts: 0,
          winRate: 0,
          averageScore: 0,
          accuracyTrend: generateTrendData(0, 100),
          speedTrend: generateTrendData(0, 100),
        })
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
        }
      })

      const totalAttempts = userMatches.length
      const wins = userMatches.filter((m) => m.won).length
      const winRate = totalAttempts > 0 ? (wins / totalAttempts) * 100 : 0
      const highestAccuracy = Math.max(...userMatches.map((m) => m.accuracy), 0)
      const averageScore =
        userMatches.reduce((sum, m) => sum + m.score, 0) / totalAttempts

      // Generate trend data (simulated based on recent matches)
      // In a real app, you'd track this over time
      const accuracyTrend = generateTrendData(
        Math.max(0, highestAccuracy - 20),
        highestAccuracy
      )
      const speedTrend = generateTrendData(60, 100) // Simulated speed trend

      setData({
        highestAccuracy: Math.round(highestAccuracy),
        totalAttempts,
        winRate: Math.round(winRate),
        averageScore: Math.round(averageScore),
        accuracyTrend,
        speedTrend,
      })
      setLoading(false)
    }

    fetchPerformanceData()
  }, [userId])

  if (loading || !data) {
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

          {/* Accuracy Trend */}
          <div className="space-y-2">
            <div className={cn(
              'text-xs font-medium',
              isSidebar ? 'text-sidebar-foreground' : 'text-foreground'
            )}>
              Accuracy trend
            </div>
            <div className="h-20 w-full">
              <ChartContainer
                config={{
                  accuracy: {
                    label: 'Accuracy',
                    color: 'hsl(var(--chart-1))',
                  },
                }}
                className="h-full w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.accuracyTrend} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id={`accuracyGradient-${userId}-${variant}`} x1="0" y1="1" x2="0" y2="0">
                        <stop
                          offset="0%"
                          stopColor="rgb(239, 68, 68)"
                          stopOpacity={1}
                        />
                        <stop
                          offset="25%"
                          stopColor="rgb(251, 146, 60)"
                          stopOpacity={0.9}
                        />
                        <stop
                          offset="50%"
                          stopColor="rgb(34, 197, 94)"
                          stopOpacity={1}
                        />
                        <stop
                          offset="75%"
                          stopColor="rgb(251, 146, 60)"
                          stopOpacity={0.9}
                        />
                        <stop
                          offset="100%"
                          stopColor="rgb(239, 68, 68)"
                          stopOpacity={1}
                        />
                      </linearGradient>
                    </defs>
                    <Area
                      type="linear"
                      dataKey="value"
                      stroke="none"
                      fill={`url(#accuracyGradient-${userId}-${variant})`}
                      fillOpacity={1}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </div>

          {/* Speed Trend */}
          <div className="space-y-2">
            <div className={cn(
              'text-xs font-medium',
              isSidebar ? 'text-sidebar-foreground' : 'text-foreground'
            )}>
              Speed trend
            </div>
            <div className="h-20 w-full">
              <ChartContainer
                config={{
                  speed: {
                    label: 'Speed',
                    color: 'hsl(var(--chart-2))',
                  },
                }}
                className="h-full w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.speedTrend} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id={`speedGradient-${userId}-${variant}`} x1="0" y1="1" x2="0" y2="0">
                        <stop
                          offset="0%"
                          stopColor="rgb(147, 197, 253)"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="50%"
                          stopColor="rgb(59, 130, 246)"
                          stopOpacity={1}
                        />
                        <stop
                          offset="100%"
                          stopColor="rgb(147, 197, 253)"
                          stopOpacity={0.4}
                        />
                      </linearGradient>
                    </defs>
                    <Area
                      type="linear"
                      dataKey="value"
                      stroke="none"
                      fill={`url(#speedGradient-${userId}-${variant})`}
                      fillOpacity={1}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Generate smooth bell curve trend data (like Monkeytype)
function generateTrendData(min: number, max: number): { value: number }[] {
  const points = 30
  const data: { value: number }[] = []
  const center = points / 2
  const range = max - min
  const sigma = points / 4.5 // Controls curve width

  for (let i = 0; i < points; i++) {
    // Smoother bell curve formula
    const x = (i - center) / sigma
    const bellValue = Math.exp(-(x * x) / 2)
    const value = min + bellValue * range
    data.push({ value: Math.max(min, Math.round(value)) })
  }

  return data
}
