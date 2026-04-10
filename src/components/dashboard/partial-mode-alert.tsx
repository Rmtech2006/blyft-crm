import { AlertTriangle } from 'lucide-react'

export function DashboardPartialModeAlert() {
  return (
    <div className="surface-muted flex items-start gap-3 border border-amber-200/70 bg-amber-50/80 px-4 py-4 text-sm text-amber-950">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
      <div className="space-y-1">
        <p className="font-medium">Advanced dashboard blocks are in fallback mode.</p>
        <p className="text-amber-900/80">
          The frontend is ahead of the Convex backend right now. Run <span className="font-mono">npm run convex:sync</span> before the next Vercel rollout to restore the full sales-target view.
        </p>
      </div>
    </div>
  )
}
