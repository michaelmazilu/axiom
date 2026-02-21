import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateElo } from '@/lib/game/elo'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { myScore, opponentScore } = body as {
    myScore: number
    opponentScore: number
  }

  if (typeof myScore !== 'number' || typeof opponentScore !== 'number') {
    return NextResponse.json({ error: 'Invalid scores' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: match } = await admin
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single()

  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  if (match.player1_id !== user.id && match.player2_id !== user.id) {
    return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
  }

  if (match.status === 'completed') {
    return NextResponse.json({ status: 'already_completed' })
  }

  const isPlayer1 = user.id === match.player1_id
  const p1Score = isPlayer1 ? myScore : opponentScore
  const p2Score = isPlayer1 ? opponentScore : myScore

  let winnerId: string | null = null
  if (p1Score > p2Score) winnerId = match.player1_id
  else if (p2Score > p1Score) winnerId = match.player2_id

  const p1EloBefore = match.player1_elo_before ?? 800
  const p2EloBefore = match.player2_elo_before ?? 800

  const scoreA = winnerId === match.player1_id ? 1 : winnerId === null ? 0.5 : 0
  const elo = calculateElo(p1EloBefore, p2EloBefore, scoreA)

  const { data: updated, error: matchError } = await admin
    .from('matches')
    .update({
      player1_score: p1Score,
      player2_score: p2Score,
      winner_id: winnerId,
      player1_elo_after: elo.newRatingA,
      player2_elo_after: elo.newRatingB,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', matchId)
    .eq('status', 'in_progress')
    .select('id')

  if (matchError) {
    console.error('[match/complete] match update error:', matchError)
    return NextResponse.json({ error: 'Match update failed' }, { status: 500 })
  }

  // If no rows updated, another request already completed this match
  if (!updated || updated.length === 0) {
    return NextResponse.json({ status: 'already_completed' })
  }

  const p1IsWinner = winnerId === match.player1_id
  const p2IsWinner = winnerId === match.player2_id
  const isDraw = winnerId === null

  const { data: p1Profile } = await admin
    .from('profiles')
    .select('total_wins, total_losses, total_draws')
    .eq('id', match.player1_id)
    .single()

  const { error: p1Error } = await admin
    .from('profiles')
    .update({
      elo_probability: elo.newRatingA,
      total_wins: (p1Profile?.total_wins ?? 0) + (p1IsWinner ? 1 : 0),
      total_losses: (p1Profile?.total_losses ?? 0) + (p2IsWinner ? 1 : 0),
      total_draws: (p1Profile?.total_draws ?? 0) + (isDraw ? 1 : 0),
    })
    .eq('id', match.player1_id)

  if (p1Error) {
    console.error('[match/complete] p1 profile update error:', p1Error)
  }

  const { data: p2Profile } = await admin
    .from('profiles')
    .select('total_wins, total_losses, total_draws')
    .eq('id', match.player2_id)
    .single()

  const { error: p2Error } = await admin
    .from('profiles')
    .update({
      elo_probability: elo.newRatingB,
      total_wins: (p2Profile?.total_wins ?? 0) + (p2IsWinner ? 1 : 0),
      total_losses: (p2Profile?.total_losses ?? 0) + (p1IsWinner ? 1 : 0),
      total_draws: (p2Profile?.total_draws ?? 0) + (isDraw ? 1 : 0),
    })
    .eq('id', match.player2_id)

  if (p2Error) {
    console.error('[match/complete] p2 profile update error:', p2Error)
  }

  return NextResponse.json({
    status: 'completed',
    winnerId,
    player1: {
      id: match.player1_id,
      eloBefore: p1EloBefore,
      eloAfter: elo.newRatingA,
      delta: elo.deltaA,
    },
    player2: {
      id: match.player2_id,
      eloBefore: p2EloBefore,
      eloAfter: elo.newRatingB,
      delta: elo.deltaB,
    },
  })
}
