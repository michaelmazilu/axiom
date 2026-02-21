import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppNav } from '@/components/app-nav'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <AppNav
        user={{
          id: user.id,
          email: user.email ?? '',
          displayName: profile?.display_name ?? 'Player',
        }}
      />
      <main className="flex-1">{children}</main>
    </div>
  )
}
