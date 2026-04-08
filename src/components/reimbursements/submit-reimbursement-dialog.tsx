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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus } from 'lucide-react'

const schema = z.object({
  category: z.enum(['TRAVEL', 'FOOD_ENTERTAINMENT', 'TOOLS_SOFTWARE', 'OFFICE_SUPPLIES', 'AD_SPEND', 'MISCELLANEOUS']),
  amount: z.string().min(1, 'Amount required'),
  description: z.string().min(1, 'Description required'),
  date: z.string().min(1, 'Date required'),
  receiptUrl: z.string().optional(),
  teamMemberId: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function SubmitReimbursementDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const teamMembers = useQuery(api.team.list) ?? []
  const createReimbursement = useMutation(api.reimbursements.create)

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: 'MISCELLANEOUS',
      date: new Date().toISOString().split('T')[0],
    },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      await createReimbursement({
        category: data.category,
        amount: parseFloat(data.amount),
        description: data.description,
        date: new Date(data.date).getTime(),
        receiptUrl: data.receiptUrl || undefined,
        teamMemberId: data.teamMemberId ? (data.teamMemberId as Id<'teamMembers'>) : undefined,
        submittedById: 'ritish',
      })
      toast.success('Reimbursement submitted')
      reset()
      setOpen(false)
    } catch {
      toast.error('Failed to submit')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="h-4 w-4 mr-1" /> Submit Reimbursement
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Submit Reimbursement</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Category</Label>
            <Select defaultValue="MISCELLANEOUS" onValueChange={(v) => setValue('category', v as FormData['category'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['TRAVEL', 'FOOD_ENTERTAINMENT', 'TOOLS_SOFTWARE', 'OFFICE_SUPPLIES', 'AD_SPEND', 'MISCELLANEOUS'].map((c) => (
                  <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Amount (₹) *</Label>
              <Input type="number" step="0.01" placeholder="0.00" {...register('amount')} />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Date *</Label>
              <Input type="date" {...register('date')} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Description *</Label>
            <Input placeholder="What was this for?" {...register('description')} />
            {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Team Member</Label>
            <Select onValueChange={(v) => setValue('teamMemberId', v === 'none' || v == null ? undefined : String(v))}>
              <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Self</SelectItem>
                {teamMembers.map((m) => <SelectItem key={m.id} value={m.id}>{m.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Receipt URL</Label>
            <Input placeholder="https://drive.google.com/…" {...register('receiptUrl')} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Submitting…' : 'Submit'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
