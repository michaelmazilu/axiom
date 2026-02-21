'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, Trophy, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ScholarLogo } from '@/components/scholar-logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface AppNavProps {
  user: {
    id: string
    email: string
    displayName: string
  }
}

const navLinks = [
  { href: '/lobby', label: 'Play' },
  { href: '/leaderboard', label: 'Leaderboard' },
]

export function AppNav({ user }: AppNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-3 lg:px-12">
      <div className="flex items-center gap-8">
        <Link href="/lobby">
          <ScholarLogo size="sm" />
        </Link>
        <nav className="hidden items-center gap-1 sm:flex" aria-label="Main navigation">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                pathname === link.href
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-9 gap-2 px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-medium text-foreground">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline">{user.displayName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href={`/profile/${user.id}`} className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/leaderboard" className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Leaderboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
