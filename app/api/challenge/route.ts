import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const displayName = (body.displayName ?? '').trim()

  if (!displayName) {
    return NextResponse.json({ error: 'Display name is required' }, { status: 400 })
  }

  // Look up opponent by display name
  const { data: opponent } = await supabase
    .from('profiles')
    .select('id, display_name')
    .ilike('display_name', displayName)
    .neq('id', user.id)
    .limit(1)
    .maybeSingle()

  if (!opponent) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 })
  }

  // Cancel any existing pending challenges from this user
  await supabase
    .from('challenges')
    .update({ status: 'expired' })
    .eq('challenger_id', user.id)
    .eq('status', 'pending')

  // Create new challenge
  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .insert({
      challenger_id: user.id,
      challenged_id: opponent.id,
      status: 'pending',
    })
    .select()
    .single()

  if (challengeError || !challenge) {
    return NextResponse.json({ error: 'Failed to create challenge' }, { status: 500 })
  }

  return NextResponse.json({
    challengeId: challenge.id,
    opponent: {
      id: opponent.id,
      displayName: opponent.display_name,
    },
  })
}
