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
  name: z.string().min(1, 'Name is required'),
  company: z.string().optional(),
  industry: z.string().optional(),
  source: z.enum(['INSTAGRAM', 'REFERRAL', 'LINKEDIN', 'COLD_EMAIL', 'EVENT', 'WEBSITE', 'OTHER']),
  stage: z.enum(['LEAD_CAPTURED', 'QUALIFICATION_SUBMITTED', 'STRATEGY_CALL', 'PROPOSAL_SENT', 'PROPOSAL_ACCEPTED', 'NURTURE', 'LOST']),
  goals: z.string().optional(),
  budget: z.string().optional(),
  servicesRequired: z.string().optional(),
  timeline: z.string().optional(),
  contactName: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  estimatedValue: z.string().optional(),
  serviceType: z.string().optional(),
  followUpDate: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function AddLeadDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const createLead = useMutation(api.leads.create)

  const SOURCE_LABELS: Record<string, string> = {
    INSTAGRAM: 'Instagram', REFERRAL: 'Referral', LINKEDIN: 'LinkedIn',
    COLD_EMAIL: 'Cold Email', EVENT: 'Event', WEBSITE: 'Website', OTHER: 'Other',
  }
  const STAGE_LABELS: Record<string, string> = {
    LEAD_CAPTURED: 'Lead Captured', QUALIFICATION_SUBMITTED: 'Qualification Submitted',
    STRATEGY_CALL: 'Strategy Call', PROPOSAL_SENT: 'Proposal Sent',
    PROPOSAL_ACCEPTED: 'Proposal Accepted', NURTURE: 'Nurture', LOST: 'Lost',
  }

  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { source: 'OTHER', stage: 'LEAD_CAPTURED' },
  })
  const source = watch('source') ?? 'OTHER'
  const stage = watch('stage') ?? 'LEAD_CAPTURED'

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      await createLead({
        name: data.name,
        company: data.company || undefined,
        industry: data.industry || undefined,
        source: data.source,
        stage: data.stage,
        contactName: data.contactName || undefined,
        whatsapp: data.whatsapp || undefined,
        email: data.email || undefined,
        estimatedValue: data.estimatedValue ? parseFloat(data.estimatedValue) : undefined,
        serviceType: data.serviceType || undefined,
        followUpDate: data.followUpDate ? new Date(data.followUpDate).getTime() : undefined,
        goals: data.goals || undefined,
        budget: data.budget || undefined,
        servicesRequired: data.servicesRequired || undefined,
        timeline: data.timeline || undefined,
      })
      toast.success('Lead added')
      reset()
      setOpen(false)
    } catch {
      toast.error('Failed to add lead')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="h-4 w-4 mr-1" /> Add Lead
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Add Lead</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Lead Name *</Label>
              <Input placeholder="Full name or company" {...register('name')} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Company</Label>
              <Input placeholder="Company name" {...register('company')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Source</Label>
              <Select value={source} onValueChange={(v) => setValue('source', v as FormData['source'])}>
                <SelectTrigger><SelectValue>{SOURCE_LABELS[source]}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                  <SelectItem value="REFERRAL">Referral</SelectItem>
                  <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                  <SelectItem value="COLD_EMAIL">Cold Email</SelectItem>
                  <SelectItem value="EVENT">Event</SelectItem>
                  <SelectItem value="WEBSITE">Website</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Stage</Label>
              <Select value={stage} onValueChange={(v) => setValue('stage', v as FormData['stage'])}>
                <SelectTrigger><SelectValue>{STAGE_LABELS[stage]}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LEAD_CAPTURED">Lead Captured</SelectItem>
                  <SelectItem value="QUALIFICATION_SUBMITTED">Qualification Submitted</SelectItem>
                  <SelectItem value="STRATEGY_CALL">Strategy Call</SelectItem>
                  <SelectItem value="PROPOSAL_SENT">Proposal Sent</SelectItem>
                  <SelectItem value="PROPOSAL_ACCEPTED">Proposal Accepted</SelectItem>
                  <SelectItem value="NURTURE">Nurture</SelectItem>
                  <SelectItem value="LOST">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Contact Name</Label>
              <Input placeholder="Decision maker" {...register('contactName')} />
            </div>
            <div className="space-y-1">
              <Label>WhatsApp</Label>
              <Input placeholder="+91 98765 43210" {...register('whatsapp')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" placeholder="email@company.com" {...register('email')} />
            </div>
            <div className="space-y-1">
              <Label>Est. Value (₹)</Label>
              <Input type="number" placeholder="0" {...register('estimatedValue')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Service Type</Label>
              <Input placeholder="e.g. Social Media, SEO" {...register('serviceType')} />
            </div>
            <div className="space-y-1">
              <Label>Follow-up Date</Label>
              <Input type="date" {...register('followUpDate')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Goals</Label>
              <Input placeholder="Business goals" {...register('goals')} />
            </div>
            <div className="space-y-1">
              <Label>Budget</Label>
              <Input placeholder="e.g. ₹50k/mo" {...register('budget')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Services Required</Label>
              <Input placeholder="e.g. SEO, Ads" {...register('servicesRequired')} />
            </div>
            <div className="space-y-1">
              <Label>Timeline</Label>
              <Input placeholder="e.g. 3 months" {...register('timeline')} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Adding…' : 'Add Lead'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
