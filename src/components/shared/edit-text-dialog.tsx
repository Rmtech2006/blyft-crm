'use client'

import { ReactElement, useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type EditTextDialogProps = {
  title: string
  label: string
  value: string
  successMessage: string
  trigger?: ReactElement
  onSave: (value: string) => Promise<void>
}

export function EditTextDialog({
  title,
  label,
  value,
  successMessage,
  trigger,
  onSave,
}: EditTextDialogProps) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState(value)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) setContent(value)
  }, [open, value])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!content.trim()) return
    setLoading(true)
    try {
      await onSave(content.trim())
      const { toast } = await import('sonner')
      toast.success(successMessage)
      setOpen(false)
    } catch {
      const { toast } = await import('sonner')
      toast.error('Failed to update')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger render={trigger} />
      ) : (
        <DialogTrigger render={<Button size="icon" variant="ghost" className="h-7 w-7" />}>
          <Pencil className="h-3.5 w-3.5" />
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>{label}</Label>
            <Textarea rows={4} value={content} onChange={(event) => setContent(event.target.value)} autoFocus />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading || !content.trim()}>{loading ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
