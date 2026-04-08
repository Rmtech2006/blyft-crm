'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const schema = z.object({
  name: z.string().min(1),
  company: z.string().optional(),
  industry: z.string().optional(),
  source: z.enum(['INSTAGRAM', 'REFERRAL', 'LINKEDIN', 'COLD_EMAIL', 'EVENT', 'WEBSITE', 'OTHER']),
  stage: z.enum(['NEW_LEAD', 'CONTACTED', 'DISCOVERY', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST']),
  contactName: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().optional(),
  estimatedValue: z.string().optional(),
  serviceType: z.string().optional(),
  followUpDate: z.string().optional(),
  ownerId: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Lead {
  id: string
  name: string
  company?: string | null
  industry?: string | null
  source: string
  stage: string
  contactName?: string | null
  whatsapp?: string | null
  email?: string | null
  estimatedValue?: number | null
  serviceType?: string | null
  followUpDate?: number | null
  ownerId?: string | null
}

interface Props {
  lead: Lead
  open: boolean
  onClose: () => void
}

export function EditLeadDialog({ lead, open, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const updateLead = useMutation(api.leads.update)

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (open) {
      reset({
        name: lead.name,
        company: lead.company ?? '',
        industry: lead.industry ?? '',
        source: lead.source as FormData['source'],
        stage: lead.stage as FormData['stage'],
        contactName: lead.contactName ?? '',
        whatsapp: lead.whatsapp ?? '',
        email: lead.email ?? '',
        estimatedValue: lead.estimatedValue ? String(lead.estimatedValue) : '',
        serviceType: lead.serviceType ?? '',
        followUpDate: lead.followUpDate ? new Date(lead.followUpDate).toISOString().split('T')[0] : '',
        ownerId: lead.ownerId ?? '',
      })
    }
  }, [open, lead, reset])

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      await updateLead({
        id: lead.id as Id<'leads'>,
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
        ownerId: data.ownerId || undefined,
      })
      toast.success('Lead updated')
      onClose()
    } catch {
      toast.error('Failed to update lead')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Edit Lead</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input {...register('name')} />
              {errors.name && <p className="text-xs text-red-500">Required</p>}
            </div>
            <div className="space-y-1">
              <Label>Company</Label>
              <Input {...register('company')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Industry</Label>
              <Input {...register('industry')} />
            </div>
            <div className="space-y-1">
              <Label>Service Type</Label>
              <Input {...register('serviceType')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Source</Label>
              <Select defaultValue={lead.source} onValueChange={(v) => setValue('source', v as FormData['source'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['INSTAGRAM', 'REFERRAL', 'LINKEDIN', 'COLD_EMAIL', 'EVENT', 'WEBSITE', 'OTHER'].map((s) => (
                    <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Stage</Label>
              <Select defaultValue={lead.stage} onValueChange={(v) => setValue('stage', v as FormData['stage'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['NEW_LEAD', 'CONTACTED', 'DISCOVERY', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST'].map((s) => (
                    <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Contact Name</Label>
              <Input {...register('contactName')} />
            </div>
            <div className="space-y-1">
              <Label>WhatsApp</Label>
              <Input {...register('whatsapp')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" {...register('email')} />
            </div>
            <div className="space-y-1">
              <Label>Est. Value (₹)</Label>
              <Input type="number" {...register('estimatedValue')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Follow-up Date</Label>
              <Input type="date" {...register('followUpDate')} />
            </div>
            <div className="space-y-1">
              <Label>Owner</Label>
              <Select defaultValue={lead.ownerId ?? undefined} onValueChange={(v) => setValue('ownerId', v ?? undefined)}>
                <SelectTrigger><SelectValue placeholder="Assign owner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ritish">Ritish</SelectItem>
                  <SelectItem value="eshaan">Eshaan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
