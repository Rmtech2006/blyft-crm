'use client'

import { AlertTriangle, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center px-4 py-10">
      <Card className="surface-card w-full">
        <CardHeader className="space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl tracking-tight">This dashboard hit a loading issue</CardTitle>
            <CardDescription className="text-sm leading-6">
              The most common cause is a frontend deploy reaching Vercel before Convex finishes syncing the new query shape.
              If this happens after a rollout, run <code className="rounded bg-muted px-1.5 py-0.5 text-xs">npm run convex:sync</code> and reload.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/35 px-4 py-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Latest error</p>
            <p className="mt-1 break-words">{error.message || 'Unexpected dashboard error'}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={reset} className="gap-1.5">
              <RefreshCcw className="h-3.5 w-3.5" />
              Try again
            </Button>
            <Button variant="outline" onClick={() => window.location.assign('/settings')}>
              Open settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
