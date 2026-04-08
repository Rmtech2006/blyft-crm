'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { RotateCcw } from 'lucide-react'

interface Props {
  templateId: string
  open: boolean
  onClose: () => void
}

export function VersionHistoryDialog({ templateId, open, onClose }: Props) {
  const versions = useQuery(api.templates.getVersions, open ? { id: templateId as Id<'messageTemplates'> } : 'skip')
  const restoreVersion = useMutation(api.templates.restoreVersion)
  const [restoring, setRestoring] = useState<number | null>(null)

  async function handleRestore(content: string, index: number) {
    setRestoring(index)
    try {
      await restoreVersion({ templateId: templateId as Id<'messageTemplates'>, content })
      toast.success('Version restored')
      onClose()
    } catch {
      toast.error('Failed to restore')
    } finally {
      setRestoring(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Version History</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {!versions || versions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No previous versions found.</p>
          ) : (
            versions.map((v, i) => (
              <div key={v._id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Version {versions.length - i} · {new Date(v._creationTime).toLocaleString('en-IN')}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs"
                    disabled={restoring === i}
                    onClick={() => handleRestore(v.content, i)}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    {restoring === i ? 'Restoring…' : 'Restore'}
                  </Button>
                </div>
                <pre className="text-xs bg-muted rounded p-2 whitespace-pre-wrap line-clamp-4 font-sans">
                  {v.content}
                </pre>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
