'use client'

import { ReactElement, useEffect, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'

type Milestone = {
  id: string
  title: string
  dueDate: number
}

function dateInputValue(value: number) {
  return new Date(value).toISOString().slice(0, 10)
}

export function EditMilestoneDialog({ milestone, trigger }: { milestone: Milestone; trigger?: ReactElement }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(milestone.title)
  const [dueDate, setDueDate] = useState(dateInputValue(milestone.dueDate))
  const [loading, setLoading] = useState(false)
  const updateMilestone = useMutation(api.projects.updateMilestone)

  useEffect(() => {
    if (!open) return
    setTitle(milestone.title)
    setDueDate(dateInputValue(milestone.dueDate))
  }, [milestone, open])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim() || !dueDate) return
    setLoading(true)
    try {
      await updateMilestone({
        id: milestone.id as Id<'milestones'>,
        title: title.trim(),
        dueDate: new Date(dueDate).getTime(),
      })
      toast.success('Milestone updated')
      setOpen(false)
    } catch {
      toast.error('Failed to update milestone')
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
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Edit Milestone</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
          </div>
          <div className="space-y-1">
            <Label>Due Date</Label>
            <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading || !title.trim() || !dueDate}>{loading ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
