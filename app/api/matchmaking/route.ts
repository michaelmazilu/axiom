import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateMatchSeed } from '@/lib/game/seeded-random'
import { GAME_MODES } from '@/lib/game/types'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const mode = GAME_MODES.includes(body.mode) ? body.mode : 'all'

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const playerElo = (profile.elo_probability ?? 1200) as number

  // Check if already waiting in queue
  const { data: existing } = await supabase
    .from('matchmaking_queue')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'waiting')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ status: 'waiting', queueId: existing.id })
  }

  // Look for an opponent in the queue
  const { data: opponents } = await supabase
    .from('matchmaking_queue')
    .select('*')
    .eq('mode', mode)
    .eq('status', 'waiting')
    .neq('user_id', user.id)
    .gte('elo', playerElo - 300)
    .lte('elo', playerElo + 300)
    .order('created_at', { ascending: true })
    .limit(1)

  if (opponents && opponents.length > 0) {
    const opponent = opponents[0]

    const { data: opponentProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', opponent.user_id)
      .single()

    if (!opponentProfile) {
      return NextResponse.json({ error: 'Opponent profile not found' }, { status: 500 })
    }

    const opponentElo = (opponentProfile.elo_probability ?? 1200) as number
    const seed = generateMatchSeed()

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        player1_id: opponent.user_id,
        player2_id: user.id,
        mode,
        player1_elo_before: opponentElo,
        player2_elo_before: playerElo,
        player1_elo_after: opponentElo,
        player2_elo_after: playerElo,
        seed,
        status: 'in_progress',
      })
      .select()
      .single()

    if (matchError || !match) {
      return NextResponse.json(
        { error: 'Failed to create match' },
        { status: 500 }
      )
    }

    await supabase
      .from('matchmaking_queue')
      .update({ status: 'matched', match_id: match.id })
      .eq('id', opponent.id)

    return NextResponse.json({
      status: 'matched',
      matchId: match.id,
      seed: match.seed,
      opponent: {
        id: opponentProfile.id,
        displayName: opponentProfile.display_name,
        elo: opponentElo,
      },
    })
  }

  // No opponent found — clean up old entries and join queue
  await supabase
    .from('matchmaking_queue')
    .delete()
    .eq('user_id', user.id)

  const { data: queueEntry, error: queueError } = await supabase
    .from('matchmaking_queue')
    .insert({
      user_id: user.id,
      mode,
      elo: playerElo,
      status: 'waiting',
    })
    .select()
    .single()

  if (queueError) {
    return NextResponse.json(
      { error: 'Failed to join queue: ' + queueError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ status: 'waiting', queueId: queueEntry.id })
}

export async function DELETE() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await supabase
    .from('matchmaking_queue')
    .delete()
    .eq('user_id', user.id)

  return NextResponse.json({ status: 'cancelled' })
}
