'use client'

import { ReactElement, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pencil } from 'lucide-react'

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

type EditableTask = {
  id: string
  title: string
  description?: string | null
  status: FormData['status']
  priority: FormData['priority']
  dueDate?: number | null
  recurringType?: FormData['recurringType'] | null
  projectId?: string | null
  assigneeId?: string | null
}

function dateInputValue(value?: number | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : ''
}

export function EditTaskDialog({ task, trigger }: { task: EditableTask; trigger?: ReactElement }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const projects = useQuery(api.projects.list) ?? []
  const users = useQuery(api.team.list) ?? []
  const updateTask = useMutation(api.tasks.update)
  const allAssignees = [
    ...ADMIN_USERS,
    ...users.filter((u) => u.status !== 'OFFBOARDED'),
  ]

  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: task.title,
      description: task.description ?? '',
      status: task.status,
      priority: task.priority,
      dueDate: dateInputValue(task.dueDate),
      recurringType: task.recurringType ?? 'NONE',
      projectId: task.projectId ?? '',
      assigneeId: task.assigneeId ?? '',
    },
  })

  useEffect(() => {
    if (!open) return
    reset({
      title: task.title,
      description: task.description ?? '',
      status: task.status,
      priority: task.priority,
      dueDate: dateInputValue(task.dueDate),
      recurringType: task.recurringType ?? 'NONE',
      projectId: task.projectId ?? '',
      assigneeId: task.assigneeId ?? '',
    })
  }, [open, reset, task])

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      await updateTask({
        id: task.id as Id<'tasks'>,
        title: data.title,
        description: data.description || undefined,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate).getTime() : undefined,
        recurringType: data.recurringType,
        projectId: data.projectId ? (data.projectId as Id<'projects'>) : undefined,
        assigneeId: data.assigneeId || undefined,
      })
      toast.success('Task updated')
      setOpen(false)
    } catch {
      toast.error('Failed to update task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger render={trigger} />
      ) : (
        <DialogTrigger render={<Button size="sm" variant="outline" />}>
          <Pencil className="h-4 w-4 mr-1" /> Edit
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Title *</Label>
            <Input placeholder="Task title" {...register('title')} />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea rows={2} placeholder="Task details..." {...register('description')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={watch('status')} onValueChange={(v) => setValue('status', v as FormData['status'])}>
                <SelectTrigger><SelectValue>{STATUS_LABELS[watch('status')]}</SelectValue></SelectTrigger>
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
              <Select value={watch('priority')} onValueChange={(v) => setValue('priority', v as FormData['priority'])}>
                <SelectTrigger><SelectValue>{PRIORITY_LABELS[watch('priority')]}</SelectValue></SelectTrigger>
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
              <Select value={watch('recurringType')} onValueChange={(v) => setValue('recurringType', v as FormData['recurringType'])}>
                <SelectTrigger><SelectValue>{RECURRING_LABELS[watch('recurringType')]}</SelectValue></SelectTrigger>
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
              <Select value={watch('projectId') || 'none'} onValueChange={(v) => setValue('projectId', v === 'none' ? '' : String(v))}>
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="None">
                    <span className="block truncate">{projects.find((p) => p.id === watch('projectId'))?.name ?? 'None'}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Assignee</Label>
              <Select value={watch('assigneeId') || 'none'} onValueChange={(v) => setValue('assigneeId', v === 'none' ? '' : String(v))}>
                <SelectTrigger><SelectValue placeholder="Unassigned">
                  {allAssignees.find((u) => u.id === watch('assigneeId'))?.fullName ?? 'Unassigned'}
                </SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {ADMIN_USERS.map((u) => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}
                  {users.filter((user) => user.status !== 'OFFBOARDED').map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Task'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
