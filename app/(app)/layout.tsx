import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/sidebar'
import { ChallengeListener } from '@/components/lobby/challenge-listener'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <div className="flex h-svh bg-background">
      <Sidebar
        user={
          user
            ? {
                id: user.id,
                displayName: profile?.display_name ?? 'Player',
              }
            : null
        }
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
      {user && <ChallengeListener userId={user.id} />}
    </div>
  )
}
