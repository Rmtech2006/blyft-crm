'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus } from 'lucide-react'

const schema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  college: z.string().optional(),
  location: z.string().optional(),
  type: z.enum(['INTERN', 'FREELANCER', 'PART_TIME', 'FULL_TIME']),
  department: z.string().optional(),
  startDate: z.string().optional(),
  compensationMode: z.enum(['HOURLY', 'MONTHLY', 'PROJECT_BASED', '']).optional(),
  compensationRate: z.string().optional(),
  skills: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function AddMemberDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const createMember = useMutation(api.team.create)

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'INTERN' },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      await createMember({
        fullName: data.fullName,
        phone: data.phone || undefined,
        email: data.email || undefined,
        college: data.college || undefined,
        location: data.location || undefined,
        type: data.type,
        department: data.department || undefined,
        startDate: data.startDate ? new Date(data.startDate).getTime() : undefined,
        compensationMode: (data.compensationMode || undefined) as Parameters<typeof createMember>[0]['compensationMode'],
        compensationRate: data.compensationRate ? parseFloat(data.compensationRate) : undefined,
        skills: data.skills ? data.skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
      })
      toast.success('Team member added')
      reset()
      setOpen(false)
    } catch {
      toast.error('Failed to add member')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="h-4 w-4 mr-1" /> Add Member
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Full Name *</Label>
              <Input placeholder="John Doe" {...register('fullName')} />
              {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Type *</Label>
              <Select defaultValue="INTERN" onValueChange={(v) => setValue('type', v as FormData['type'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['INTERN', 'FREELANCER', 'PART_TIME', 'FULL_TIME'].map((t) => (
                    <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input placeholder="+91 98765 43210" {...register('phone')} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" placeholder="john@email.com" {...register('email')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Department</Label>
              <Input placeholder="Design, Marketing…" {...register('department')} />
            </div>
            <div className="space-y-1">
              <Label>Start Date</Label>
              <Input type="date" {...register('startDate')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Compensation Mode</Label>
              <Select onValueChange={(v) => setValue('compensationMode', v as FormData['compensationMode'])}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {['HOURLY', 'MONTHLY', 'PROJECT_BASED'].map((c) => (
                    <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Rate (₹)</Label>
              <Input type="number" placeholder="0" {...register('compensationRate')} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Skills (comma-separated)</Label>
            <Input placeholder="Design, Figma, React" {...register('skills')} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Adding…' : 'Add Member'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
