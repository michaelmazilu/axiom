'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Gamepad2, Trophy, User, LogOut, LogIn, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'

interface SidebarProps {
  user: {
    id: string
    displayName: string
  } | null
}

const navLinks = [
  { href: '/lobby', label: 'Play', icon: Gamepad2 },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
]

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/lobby')
    router.refresh()
  }

  return (
    <aside className="flex h-svh w-60 flex-shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="px-6 py-6">
        <Link href="/lobby" className="block">
          <span className="font-mono text-xl font-medium tracking-wide text-sidebar-foreground">
            A<span className="text-scholar-vermillion">(x)</span>iom
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3">
        <div className="flex flex-col gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon
            const active = pathname === link.href || pathname.startsWith(link.href + '/')
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-sidebar-accent text-sidebar-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            )
          })}

          {user && (
            <Link
              href={`/profile/${user.id}`}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                pathname.startsWith('/profile')
                  ? 'bg-sidebar-accent text-sidebar-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <User className="h-4 w-4" />
              Profile
            </Link>
          )}
        </div>
      </nav>

      {/* Bottom */}
      <div className="border-t border-sidebar-border px-3 py-4">
        <div className="mb-3 flex justify-center">
          <ThemeToggle />
        </div>

        {user ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 px-3 py-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sidebar-accent text-xs font-medium text-sidebar-foreground">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-sidebar-foreground truncate">
                {user.displayName}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="px-3 py-1 text-xs text-muted-foreground">Guest</span>
            <Link
              href="/auth/login"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </Link>
            <Link
              href="/auth/sign-up"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            >
              <UserPlus className="h-4 w-4" />
              Sign up
            </Link>
          </div>
        )}
      </div>
    </aside>
  )
}
