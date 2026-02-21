import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const EMAIL_DOMAIN = 'axiom-users.example.com'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: Request) {
  const { username, password } = await request.json()

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
  }

  const fakeEmail = `${username.toLowerCase().trim()}@${EMAIL_DOMAIN}`

  // Verify the user exists via admin API
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
  const matchedUser = users?.find(u => u.email === fakeEmail)

  if (!matchedUser) {
    return NextResponse.json({ error: 'No account found with that username' }, { status: 404 })
  }

  // If user somehow isn't confirmed, confirm them now
  if (!matchedUser.email_confirmed_at) {
    await supabaseAdmin.auth.admin.updateUser(matchedUser.id, {
      email_confirm: true,
    })
  }

  return NextResponse.json({ email: fakeEmail, confirmed: true })
}
