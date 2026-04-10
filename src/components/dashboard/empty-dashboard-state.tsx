import Link from 'next/link'
import { Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function EmptyDashboardState() {
  return (
    <Card className="surface-card">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <Target className="h-10 w-10 text-muted-foreground/35" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">All dashboard blocks are hidden</p>
          <p className="text-sm text-muted-foreground">
            Re-enable sections from Settings to rebuild your personal control room.
          </p>
        </div>
        <Button variant="outline" render={<Link href="/settings" />}>
          Open dashboard settings
        </Button>
      </CardContent>
    </Card>
  )
}
