'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface TypingStatsData {
  wpm: number
  accuracy: number
  testsCompleted: number
  bestWpm: number
  averageWpm: number
}

interface TypingStatsProps {
  userId: string
}

export function TypingStats({ userId }: TypingStatsProps) {
  const [data, setData] = useState<TypingStatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTypingStats() {
      const supabase = createClient()
      
      // Fetch user's completed matches to calculate typing-like stats
      const { data: matches } = await supabase
        .from('matches')
        .select('player1_id, player2_id, player1_score, player2_score, status, completed_at')
        .eq('status', 'completed')
        .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
        .order('completed_at', { ascending: false })

      if (!matches || matches.length === 0) {
        setData({
          wpm: 0,
          accuracy: 0,
          testsCompleted: 0,
          bestWpm: 0,
          averageWpm: 0,
        })
        setLoading(false)
        return
      }

      // Calculate typing-like metrics from match performance
      // Using score as a proxy for "words per minute" equivalent
      const userMatches = matches.map((match) => {
        const isPlayer1 = match.player1_id === userId
        const userScore = isPlayer1 ? match.player1_score : match.player2_score
        const opponentScore = isPlayer1 ? match.player2_score : match.player1_score
        const totalScore = userScore + opponentScore
        const accuracy = totalScore > 0 ? (userScore / totalScore) * 100 : 0
        
        // Convert score to WPM-like metric (score * 2 as rough estimate)
        const wpm = userScore * 2
        
        return {
          wpm,
          accuracy,
        }
      })

      const testsCompleted = userMatches.length
      const wpmValues = userMatches.map((m) => m.wpm)
      const bestWpm = Math.max(...wpmValues, 0)
      const averageWpm = wpmValues.reduce((sum, w) => sum + w, 0) / testsCompleted
      const avgAccuracy = userMatches.reduce((sum, m) => sum + m.accuracy, 0) / testsCompleted
      const currentWpm = wpmValues[0] || 0

      setData({
        wpm: Math.round(currentWpm),
        accuracy: Math.round(avgAccuracy),
        testsCompleted,
        bestWpm: Math.round(bestWpm),
        averageWpm: Math.round(averageWpm),
      })
      setLoading(false)
    }

    fetchTypingStats()
  }, [userId])

  if (loading || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Typing Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Typing Stats</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground mb-1">wpm</span>
            <span className="font-mono text-2xl font-semibold text-foreground">
              {data.wpm}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground mb-1">accuracy</span>
            <span className="font-mono text-2xl font-semibold text-foreground">
              {data.accuracy}%
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground mb-1">tests completed</span>
            <span className="font-mono text-2xl font-semibold text-foreground">
              {data.testsCompleted}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground mb-1">best</span>
            <span className="font-mono text-2xl font-semibold text-foreground">
              {data.bestWpm}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground mb-1">average</span>
            <span className="font-mono text-2xl font-semibold text-foreground">
              {data.averageWpm}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
