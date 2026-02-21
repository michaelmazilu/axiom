'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const trimmedEmail = email.trim().toLowerCase()
    const displayName = trimmedEmail.split('@')[0]

    const supabase = createClient()

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    })

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        setError('An account with this email already exists')
      } else if (signUpError.message.includes('rate limit')) {
        setError('Too many attempts. Please wait a moment and try again.')
      } else {
        setError(signUpError.message)
      }
      setLoading(false)
      return
    }

    if (signUpData?.session) {
      router.push('/lobby')
      router.refresh()
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    router.push('/lobby')
    router.refresh()
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-10 text-center">
        <h1 className="text-xl font-medium tracking-tight text-foreground text-balance">
          Begin your journey
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create an account to compete
        </p>
      </div>

      <form onSubmit={handleSignUp} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-sm text-muted-foreground">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="h-11 bg-background border-border"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="text-sm text-muted-foreground">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Min 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="h-11 bg-background border-border"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="mt-2 h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {loading ? 'Creating account...' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href="/auth/login"
          className="text-foreground underline underline-offset-4 hover:text-accent"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
