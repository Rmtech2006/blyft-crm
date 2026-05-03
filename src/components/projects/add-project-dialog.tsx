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

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  clientId: z.string().min(1, 'Client is required'),
  type: z.enum(['SOCIAL_MEDIA', 'SEO', 'WEB_DESIGN', 'BRANDING', 'CONTENT', 'ADS', 'OTHER']),
  description: z.string().optional(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'ON_HOLD']),
  startDate: z.string().optional(),
  deadline: z.string().optional(),
  budgetAgreed: z.string().optional(),
  driveFolder: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function AddProjectDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const clients = useQuery(api.clients.list) ?? []
  const createProject = useMutation(api.projects.create)

  const PROJECT_TYPE_LABELS: Record<string, string> = {
    SOCIAL_MEDIA: 'Social Media', SEO: 'SEO', WEB_DESIGN: 'Web Design',
    BRANDING: 'Branding', CONTENT: 'Content', ADS: 'Ads', OTHER: 'Other',
  }
  const PROJECT_STATUS_LABELS: Record<string, string> = {
    NOT_STARTED: 'Not Started', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review',
    COMPLETED: 'Completed', ON_HOLD: 'On Hold',
  }

  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'OTHER', status: 'NOT_STARTED' },
  })
  const clientId = watch('clientId')
  const type = watch('type') ?? 'OTHER'
  const status = watch('status') ?? 'NOT_STARTED'

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      await createProject({
        name: data.name,
        clientId: data.clientId as Id<'clients'>,
        type: data.type,
        description: data.description || undefined,
        status: data.status,
        startDate: data.startDate ? new Date(data.startDate).getTime() : undefined,
        deadline: data.deadline ? new Date(data.deadline).getTime() : undefined,
        budgetAgreed: data.budgetAgreed ? parseFloat(data.budgetAgreed) : undefined,
        driveFolder: data.driveFolder || undefined,
      })
      toast.success('Project created')
      reset()
      setOpen(false)
    } catch {
      toast.error('Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="h-4 w-4 mr-1" /> New Project
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Create Project</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Project Name *</Label>
            <Input placeholder="Q1 Social Media Campaign" {...register('name')} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Client *</Label>
              <Select value={clientId || 'none'} onValueChange={(v) => setValue('clientId', v === 'none' ? '' : String(v ?? ''))}>
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="Select client">
                    <span className="block truncate">{clients.find((c) => c.id === clientId)?.companyName ?? 'Select client'}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select client</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.clientId && <p className="text-xs text-red-500">{errors.clientId.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setValue('type', v as FormData['type'])}>
                <SelectTrigger><SelectValue>{PROJECT_TYPE_LABELS[type]}</SelectValue></SelectTrigger>
                <SelectContent>
                  {['SOCIAL_MEDIA', 'SEO', 'WEB_DESIGN', 'BRANDING', 'CONTENT', 'ADS', 'OTHER'].map((t) => (
                    <SelectItem key={t} value={t}>{PROJECT_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea rows={2} placeholder="Project overview…" {...register('description')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setValue('status', v as FormData['status'])}>
                <SelectTrigger><SelectValue>{PROJECT_STATUS_LABELS[status]}</SelectValue></SelectTrigger>
                <SelectContent>
                  {['NOT_STARTED', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'ON_HOLD'].map((s) => (
                    <SelectItem key={s} value={s}>{PROJECT_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Budget (₹)</Label>
              <Input type="number" placeholder="0" {...register('budgetAgreed')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Start Date</Label>
              <Input type="date" {...register('startDate')} />
            </div>
            <div className="space-y-1">
              <Label>Deadline</Label>
              <Input type="date" {...register('deadline')} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Drive Folder Link</Label>
            <Input placeholder="https://drive.google.com/…" {...register('driveFolder')} />
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
