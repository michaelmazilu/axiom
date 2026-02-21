import { Suspense } from 'react'
import { QueueClient } from '@/components/queue/queue-client'

export const metadata = {
  title: 'Finding match',
}

export default function QueuePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      }
    >
      <QueueClient />
    </Suspense>
  )
}
