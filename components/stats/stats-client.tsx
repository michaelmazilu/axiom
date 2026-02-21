'use client'

import Link from 'next/link'
import { BarChart3, LogIn, UserPlus } from 'lucide-react'
import { PerformanceAnalytics } from '@/components/sidebar/performance-analytics'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface StatsClientProps {
  user: {
    id: string
    displayName: string
  } | null
}

export function StatsClient({ user }: StatsClientProps) {
  if (!user) {
    return (
      <div className="container mx-auto max-w-5xl px-10 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight">Performance Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Track your performance, accuracy, and improvement over time
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-muted-foreground" />
              <div>
                <CardTitle>Sign in to view your stats</CardTitle>
                <CardDescription>
                  Create an account or sign in to track your performance metrics
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild className="flex-1">
                <Link href="/auth/sign-up">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Sign up
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/auth/login">
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign in
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-5xl px-10 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Performance Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Track your performance, accuracy, and improvement over time
        </p>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Your Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <PerformanceAnalytics userId={user.id} variant="page" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
