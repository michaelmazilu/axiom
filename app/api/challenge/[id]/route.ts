import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateMatchSeed } from '@/lib/game/seeded-random'

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

  const { data: challenge } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', id)
    .eq('status', 'pending')
    .single()

  if (!challenge) {
    return NextResponse.json({ error: 'Challenge not found or already resolved' }, { status: 404 })
  }

  if (challenge.challenged_id !== user.id) {
    return NextResponse.json({ error: 'Not authorized to accept this challenge' }, { status: 403 })
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', [challenge.challenger_id, challenge.challenged_id])

  if (!profiles || profiles.length < 2) {
    return NextResponse.json({ error: 'Profiles not found' }, { status: 500 })
  }

  const challenger = profiles.find((p) => p.id === challenge.challenger_id)!
  const challenged = profiles.find((p) => p.id === challenge.challenged_id)!
  const challengerElo = (challenger.elo_probability ?? 800) as number
  const challengedElo = (challenged.elo_probability ?? 800) as number
  const seed = generateMatchSeed()

  const mode = challenge.mode ?? 'all'

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      player1_id: challenge.challenger_id,
      player2_id: challenge.challenged_id,
      mode,
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

  await supabase
    .from('challenges')
    .update({ status: 'accepted', match_id: match.id })
    .eq('id', id)

  return NextResponse.json({
    status: 'accepted',
    matchId: match.id,
  })
}

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
