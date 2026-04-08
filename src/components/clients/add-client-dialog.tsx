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
  companyName: z.string().min(1, 'Company name is required'),
  industry: z.string().optional(),
  gstNumber: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'PROSPECT']),
  retainerAmount: z.string().optional(),
  paymentTerms: z.string().optional(),
  startDate: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function AddClientDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const createClient = useMutation(api.clients.create)

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'PROSPECT' },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      await createClient({
        companyName: data.companyName,
        industry: data.industry || undefined,
        gstNumber: data.gstNumber || undefined,
        website: data.website || undefined,
        address: data.address || undefined,
        status: data.status,
        retainerAmount: data.retainerAmount ? parseFloat(data.retainerAmount) : undefined,
        paymentTerms: data.paymentTerms || undefined,
        startDate: data.startDate ? new Date(data.startDate).getTime() : undefined,
      })
      toast.success('Client added')
      reset()
      setOpen(false)
    } catch {
      toast.error('Failed to add client')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="h-4 w-4 mr-1" /> Add Client
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Company Name *</Label>
            <Input placeholder="ACME Corp" {...register('companyName')} />
            {errors.companyName && <p className="text-xs text-red-500">{errors.companyName.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Industry</Label>
              <Input placeholder="e.g. E-commerce" {...register('industry')} />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select defaultValue="PROSPECT" onValueChange={(v) => setValue('status', v as FormData['status'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROSPECT">Prospect</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PAUSED">Paused</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>GST Number</Label>
              <Input placeholder="22AAAAA0000A1Z5" {...register('gstNumber')} />
            </div>
            <div className="space-y-1">
              <Label>Retainer (₹/month)</Label>
              <Input type="number" placeholder="0" {...register('retainerAmount')} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Website</Label>
            <Input placeholder="https://example.com" {...register('website')} />
          </div>

          <div className="space-y-1">
            <Label>Address</Label>
            <Input placeholder="City, State" {...register('address')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Start Date</Label>
              <Input type="date" {...register('startDate')} />
            </div>
            <div className="space-y-1">
              <Label>Payment Terms</Label>
              <Input placeholder="e.g. Net 30" {...register('paymentTerms')} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Adding…' : 'Add Client'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
