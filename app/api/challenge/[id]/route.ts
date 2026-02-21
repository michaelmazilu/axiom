import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateMatchSeed } from '@/lib/game/seeded-random'

const MODE = 'probability' as const

// POST = accept challenge
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch the challenge
  const { data: challenge } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', id)
    .eq('status', 'pending')
    .single()

  if (!challenge) {
    return NextResponse.json({ error: 'Challenge not found or already resolved' }, { status: 404 })
  }

  // Only the challenged player can accept
  if (challenge.challenged_id !== user.id) {
    return NextResponse.json({ error: 'Not authorized to accept this challenge' }, { status: 403 })
  }

  // Get both profiles for Elo
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', [challenge.challenger_id, challenge.challenged_id])

  if (!profiles || profiles.length < 2) {
    return NextResponse.json({ error: 'Profiles not found' }, { status: 500 })
  }

  const challenger = profiles.find((p) => p.id === challenge.challenger_id)!
  const challenged = profiles.find((p) => p.id === challenge.challenged_id)!
  const challengerElo = (challenger.elo_probability ?? 1200) as number
  const challengedElo = (challenged.elo_probability ?? 1200) as number
  const seed = generateMatchSeed()

  // Create match
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      player1_id: challenge.challenger_id,
      player2_id: challenge.challenged_id,
      mode: MODE,
      player1_elo_before: challengerElo,
      player2_elo_before: challengedElo,
      player1_elo_after: challengerElo,
      player2_elo_after: challengedElo,
      seed,
      status: 'in_progress',
    })
    .select()
    .single()

  if (matchError || !match) {
    return NextResponse.json({ error: 'Failed to create match' }, { status: 500 })
  }

  // Update challenge with match ID and accepted status
  await supabase
    .from('challenges')
    .update({ status: 'accepted', match_id: match.id })
    .eq('id', id)

  return NextResponse.json({
    status: 'accepted',
    matchId: match.id,
  })
}

// DELETE = decline challenge
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Either participant can decline/cancel
  const { error } = await supabase
    .from('challenges')
    .update({ status: 'declined' })
    .eq('id', id)
    .eq('status', 'pending')
    .or(`challenger_id.eq.${user.id},challenged_id.eq.${user.id}`)

  if (error) {
    return NextResponse.json({ error: 'Failed to decline challenge' }, { status: 500 })
  }

  return NextResponse.json({ status: 'declined' })
}
