import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const DEMO_EMAIL = 'lucid342@demo.axiom.local'
const DEMO_PASSWORD = 'demo-password-lucid342'
const DEMO_NAME = 'lucid342'

export async function POST(request: NextRequest) {
  const admin = createAdminClient()

  const body = await request.json().catch(() => ({}))
  const mode = body.mode || 'statistics'
  const elo = body.elo ?? 800

  // Find or create the demo auth user
  const { data: existingUsers } = await admin.auth.admin.listUsers()
  let demoUser = existingUsers?.users?.find(u => u.email === DEMO_EMAIL)

  if (!demoUser) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
    })
    if (createErr || !created.user) {
      return NextResponse.json({ error: 'Failed to create demo user', detail: createErr?.message }, { status: 500 })
    }
    demoUser = created.user
  }

  // Upsert profile
  const { error: profileErr } = await admin
    .from('profiles')
    .upsert({
      id: demoUser.id,
      display_name: DEMO_NAME,
      elo_probability: elo,
      total_wins: 12,
      total_losses: 8,
      total_draws: 2,
    }, { onConflict: 'id' })

  if (profileErr) {
    return NextResponse.json({ error: 'Failed to upsert profile', detail: profileErr.message }, { status: 500 })
  }

  // Clean up any existing queue entries for this user
  await admin
    .from('matchmaking_queue')
    .delete()
    .eq('user_id', demoUser.id)

  // Try inserting with the requested mode; fall back to 'all' if DB constraints haven't been migrated yet
  let insertMode = mode
  const { error: queueErr } = await admin
    .from('matchmaking_queue')
    .insert({ user_id: demoUser.id, mode: insertMode, elo, status: 'waiting' })

  if (queueErr) {
    insertMode = 'all'
    const { error: fallbackErr } = await admin
      .from('matchmaking_queue')
      .insert({ user_id: demoUser.id, mode: insertMode, elo, status: 'waiting' })

    if (fallbackErr) {
      return NextResponse.json({ error: 'Failed to insert queue entry', detail: fallbackErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({
    status: 'ok',
    message: `${DEMO_NAME} is now waiting in the ${insertMode} queue`,
    userId: demoUser.id,
    actualMode: insertMode,
  })
}
