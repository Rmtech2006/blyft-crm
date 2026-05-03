'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus } from 'lucide-react'

const ADMIN_USERS = [
  { id: 'ritish', fullName: 'Ritish' },
  { id: 'eshaan', fullName: 'Eshaan' },
]

const STATUS_LABELS: Record<string, string> = {
  TODO: 'To Do', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review',
  DONE: 'Done', BLOCKED: 'Blocked',
}
const PRIORITY_LABELS: Record<string, string> = {
  CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low',
}
const RECURRING_LABELS: Record<string, string> = {
  NONE: 'None', DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly',
}

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED']),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  dueDate: z.string().optional(),
  recurringType: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'NONE']),
  projectId: z.string().optional(),
  assigneeId: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function AddTaskDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const projects = useQuery(api.projects.list) ?? []
  const users = useQuery(api.team.list) ?? []
  const createTask = useMutation(api.tasks.create)

  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'TODO', priority: 'MEDIUM', recurringType: 'NONE' },
  })
  const status = watch('status') ?? 'TODO'
  const priority = watch('priority') ?? 'MEDIUM'
  const recurringType = watch('recurringType') ?? 'NONE'
  const projectId = watch('projectId')
  const assigneeId = watch('assigneeId')
  const allAssignees = [...ADMIN_USERS, ...users.filter((u) => u.status !== 'OFFBOARDED')]

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      await createTask({
        title: data.title,
        description: data.description || undefined,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate).getTime() : undefined,
        recurringType: data.recurringType,
        projectId: data.projectId ? (data.projectId as Id<'projects'>) : undefined,
        assigneeId: data.assigneeId || undefined,
      })
      toast.success('Task created')
      reset()
      setOpen(false)
    } catch {
      toast.error('Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="h-4 w-4 mr-1" /> Add Task
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Title *</Label>
            <Input placeholder="Task title" {...register('title')} />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea rows={2} placeholder="Task details…" {...register('description')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setValue('status', v as FormData['status'])}>
                <SelectTrigger><SelectValue>{STATUS_LABELS[status]}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODO">To Do</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="IN_REVIEW">In Review</SelectItem>
                  <SelectItem value="DONE">Done</SelectItem>
                  <SelectItem value="BLOCKED">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setValue('priority', v as FormData['priority'])}>
                <SelectTrigger><SelectValue>{PRIORITY_LABELS[priority]}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Due Date</Label>
              <Input type="date" {...register('dueDate')} />
            </div>
            <div className="space-y-1">
              <Label>Recurring</Label>
              <Select value={recurringType} onValueChange={(v) => setValue('recurringType', v as FormData['recurringType'])}>
                <SelectTrigger><SelectValue>{RECURRING_LABELS[recurringType]}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Project</Label>
              <Select value={projectId || 'none'} onValueChange={(v) => setValue('projectId', v === 'none' || v == null ? undefined : String(v))}>
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="None">
                    <span className="block truncate">{projects.find((p) => p.id === projectId)?.name ?? 'None'}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Assignee</Label>
              <Select value={assigneeId || 'none'} onValueChange={(v) => setValue('assigneeId', v === 'none' || v == null ? undefined : String(v))}>
                <SelectTrigger><SelectValue placeholder="Unassigned">
                  {allAssignees.find((u) => u.id === assigneeId)?.fullName ?? 'Unassigned'}
                </SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {ADMIN_USERS.map((u) => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}
                  {users
                    .filter((u) => u.status !== 'OFFBOARDED')
                    .map((u) => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
