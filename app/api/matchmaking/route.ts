import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateMatchSeed } from '@/lib/game/seeded-random'
import { GAME_MODES, MATCH_DURATION, COUNTDOWN_DURATION } from '@/lib/game/types'

const MATCH_STALE_MS = (MATCH_DURATION + COUNTDOWN_DURATION + 60) * 1000

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const mode = GAME_MODES.includes(body.mode) ? body.mode : 'statistics'

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const playerElo = (profile.elo_probability ?? 800) as number

  // Check if already matched (prevents race where polling overwrites a matched entry)
  const { data: matched } = await supabase
    .from('matchmaking_queue')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'matched')
    .maybeSingle()

  if (matched?.match_id) {
    const { data: matchCheck } = await supabase
      .from('matches')
      .select('status, created_at')
      .eq('id', matched.match_id)
      .single()

    const isRecent = matchCheck?.created_at &&
      new Date(matchCheck.created_at).getTime() > Date.now() - MATCH_STALE_MS

    if (matchCheck?.status === 'in_progress' && isRecent) {
      return NextResponse.json({
        status: 'matched',
        matchId: matched.match_id,
      })
    }

    // Stale or completed — clean up the queue entry
    await supabase
      .from('matchmaking_queue')
      .delete()
      .eq('id', matched.id)
  }

  // Mark any abandoned in_progress matches as completed (older than match duration + buffer)
  const staleThreshold = new Date(Date.now() - MATCH_STALE_MS).toISOString()
  await supabase
    .from('matches')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('status', 'in_progress')
    .lt('created_at', staleThreshold)
    .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)

  // Check if already in a genuinely active match (created recently)
  const { data: activeMatch } = await supabase
    .from('matches')
    .select('id')
    .eq('status', 'in_progress')
    .gte('created_at', staleThreshold)
    .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
    .limit(1)
    .maybeSingle()

  if (activeMatch) {
    await supabase
      .from('matchmaking_queue')
      .delete()
      .eq('user_id', user.id)

    return NextResponse.json({
      status: 'matched',
      matchId: activeMatch.id,
    })
  }

  // Always search for opponents (don't short-circuit on existing waiting entry,
  // otherwise two players who join simultaneously both get stuck waiting)
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

    const opponentElo = (opponentProfile.elo_probability ?? 800) as number
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

    const { data: updated } = await supabase
      .from('matchmaking_queue')
      .update({ status: 'matched', match_id: match.id })
      .eq('id', opponent.id)
      .eq('status', 'waiting')
      .select()

    if (!updated || updated.length === 0) {
      // Queue entry ID may have changed (deleted+recreated) — fall back to user_id
      await supabase
        .from('matchmaking_queue')
        .update({ status: 'matched', match_id: match.id })
        .eq('user_id', opponent.user_id)
        .eq('mode', mode)
        .eq('status', 'waiting')
    }

    // Clean up own waiting entries only (never delete matched entries)
    await supabase
      .from('matchmaking_queue')
      .delete()
      .eq('user_id', user.id)
      .eq('status', 'waiting')

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

  // No opponent found — ensure we have a waiting entry
  const { data: existing } = await supabase
    .from('matchmaking_queue')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'waiting')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ status: 'waiting', queueId: existing.id })
  }

  // Only delete stale waiting entries (preserve matched entries)
  await supabase
    .from('matchmaking_queue')
    .delete()
    .eq('user_id', user.id)
    .eq('status', 'waiting')

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
    // Could fail if we got matched between our check and insert (unique constraint)
    const { data: raceMatched } = await supabase
      .from('matchmaking_queue')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'matched')
      .maybeSingle()

    if (raceMatched?.match_id) {
      return NextResponse.json({
        status: 'matched',
        matchId: raceMatched.match_id,
      })
    }

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
