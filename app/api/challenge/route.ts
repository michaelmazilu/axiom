import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
  const displayName = (body.displayName ?? '').trim()
  const mode = GAME_MODES.includes(body.mode) ? body.mode : 'statistics'

  if (!displayName) {
    return NextResponse.json({ error: 'Display name is required' }, { status: 400 })
  }

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

  await supabase
    .from('challenges')
    .update({ status: 'expired' })
    .eq('challenger_id', user.id)
    .eq('status', 'pending')

  // Try insert with mode first, fall back to without mode if column doesn't exist
  let challenge = null
  let challengeError = null

  const { data: d1, error: e1 } = await supabase
    .from('challenges')
    .insert({
      challenger_id: user.id,
      challenged_id: opponent.id,
      mode,
      status: 'pending',
    })
    .select()
    .single()

  if (e1) {
    // Retry without mode in case the column is missing or has a bad constraint
    const { data: d2, error: e2 } = await supabase
      .from('challenges')
      .insert({
        challenger_id: user.id,
        challenged_id: opponent.id,
        status: 'pending',
      })
      .select()
      .single()

    challenge = d2
    challengeError = e2
  } else {
    challenge = d1
  }

  if (challengeError || !challenge) {
    return NextResponse.json(
      { error: challengeError?.message ?? 'Failed to create challenge' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    challengeId: challenge.id,
    opponent: {
      id: opponent.id,
      displayName: opponent.display_name,
    },
  })
}
