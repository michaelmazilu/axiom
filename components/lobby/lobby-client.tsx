'use client'

import { useRouter } from 'next/navigation'
import { PlayerStats } from './player-stats'

interface ProfileData {
  id: string
  displayName: string
  eloProbability: number
  totalWins: number
  totalLosses: number
  totalDraws: number
}

export function LobbyClient({ profile }: { profile: ProfileData }) {
  const router = useRouter()

  function handlePlay() {
    router.push('/queue')
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 lg:py-16">
      {/* Greeting */}
      <div className="mb-12">
        <h1 className="text-2xl font-medium tracking-tight text-foreground">
          Ready, {profile.displayName}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          1v1 probability duels — find a match and prove your skill
        </p>
      </div>

      {/* Stats summary */}
      <PlayerStats profile={profile} className="mb-12" />

      {/* Play button */}
      <div className="flex justify-center">
        <button
          onClick={handlePlay}
          className="group relative h-14 rounded-md bg-primary px-12 text-base font-medium text-primary-foreground transition-all hover:bg-primary/90"
        >
          Find match
        </button>
      </div>
    </div>
  )
}
