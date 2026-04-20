'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const PROJECT_TYPES = ['SOCIAL_MEDIA', 'SEO', 'WEB_DESIGN', 'BRANDING', 'CONTENT', 'ADS', 'OTHER'] as const
const PROJECT_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'ON_HOLD'] as const

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  clientId: z.string().min(1, 'Client is required'),
  type: z.enum(PROJECT_TYPES),
  description: z.string().optional(),
  status: z.enum(PROJECT_STATUSES),
  startDate: z.string().optional(),
  deadline: z.string().optional(),
  budgetAgreed: z.string().optional(),
  driveFolder: z.string().optional(),
})

type FormData = z.infer<typeof schema>

type Project = {
  id: string
  name: string
  clientId: string
  type: FormData['type']
  description?: string | null
  status: FormData['status']
  startDate?: number | null
  deadline?: number | null
  budgetAgreed?: number | null
  driveFolder?: string | null
}

type EditProjectDialogProps = {
  project: Project
  open: boolean
  onClose: () => void
}

function dateInputValue(value?: number | null) {
  return value ? new Date(value).toISOString().split('T')[0] : ''
}

function formatEnumLabel(value: string) {
  return value.replace(/_/g, ' ')
}

export function EditProjectDialog({ project, open, onClose }: EditProjectDialogProps) {
  const [loading, setLoading] = useState(false)
  const clients = useQuery(api.clients.list) ?? []
  const updateProject = useMutation(api.projects.update)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const selectedClientId = watch('clientId')
  const selectedType = watch('type')
  const selectedStatus = watch('status')

  useEffect(() => {
    if (!open) return

    reset({
      name: project.name,
      clientId: project.clientId,
      type: project.type,
      description: project.description ?? '',
      status: project.status,
      startDate: dateInputValue(project.startDate),
      deadline: dateInputValue(project.deadline),
      budgetAgreed: project.budgetAgreed ? String(project.budgetAgreed) : '',
      driveFolder: project.driveFolder ?? '',
    })
  }, [open, project, reset])

  async function onSubmit(data: FormData) {
    setLoading(true)

    try {
      await updateProject({
        id: project.id as Id<'projects'>,
        name: data.name,
        clientId: data.clientId as Id<'clients'>,
        type: data.type,
        description: data.description || undefined,
        status: data.status,
        startDate: data.startDate ? new Date(data.startDate).getTime() : undefined,
        deadline: data.deadline ? new Date(data.deadline).getTime() : undefined,
        budgetAgreed: data.budgetAgreed ? Number(data.budgetAgreed) : undefined,
        driveFolder: data.driveFolder || undefined,
      })
      toast.success('Project updated')
      onClose()
    } catch {
      toast.error('Failed to update project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="max-h-[72vh] space-y-4 overflow-y-auto pr-1">
          <div className="space-y-1">
            <Label>Project Name *</Label>
            <Input placeholder="Q1 Social Media Campaign" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Client *</Label>
              <Select value={selectedClientId} onValueChange={(value) => setValue('clientId', String(value ?? ''))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.clientId && <p className="text-xs text-destructive">{errors.clientId.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={selectedType} onValueChange={(value) => setValue('type', value as FormData['type'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {formatEnumLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea rows={3} placeholder="Project overview" {...register('description')} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={(value) => setValue('status', value as FormData['status'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {formatEnumLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Budget</Label>
              <Input type="number" min="0" placeholder="0" {...register('budgetAgreed')} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
            <Input placeholder="https://drive.google.com/..." {...register('driveFolder')} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
