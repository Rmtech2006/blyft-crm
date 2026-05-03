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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pencil } from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  TRAVEL: 'Travel', FOOD_ENTERTAINMENT: 'Food & Entertainment',
  TOOLS_SOFTWARE: 'Tools & Software', OFFICE_SUPPLIES: 'Office Supplies',
  AD_SPEND: 'Ad Spend', MISCELLANEOUS: 'Miscellaneous',
}

const schema = z.object({
  category: z.enum(['TRAVEL', 'FOOD_ENTERTAINMENT', 'TOOLS_SOFTWARE', 'OFFICE_SUPPLIES', 'AD_SPEND', 'MISCELLANEOUS']),
  amount: z.string().min(1, 'Amount required'),
  description: z.string().min(1, 'Description required'),
  date: z.string().min(1, 'Date required'),
  teamMemberId: z.string().optional(),
  submittedById: z.string().min(1, 'Submitter required'),
})

type FormData = z.infer<typeof schema>

const SUBMITTERS = [
  { id: 'ritish', name: 'Ritish' },
  { id: 'eshaan', name: 'Eshaan' },
]

type EditableReimbursement = {
  id: string
  category: FormData['category']
  amount: number
  description: string
  date: number
  receiptUrl?: string
  teamMember?: { id: string } | null
  submittedBy: { id: string }
}

function dateInputValue(value: number) {
  return new Date(value).toISOString().slice(0, 10)
}

export function EditReimbursementDialog({
  reimbursement,
  trigger,
}: {
  reimbursement: EditableReimbursement
  trigger?: ReactElement
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const teamMembers = useQuery(api.team.list) ?? []
  const updateReimbursement = useMutation(api.reimbursements.update)

  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: reimbursement.category,
      amount: String(reimbursement.amount),
      description: reimbursement.description,
      date: dateInputValue(reimbursement.date),
      teamMemberId: reimbursement.teamMember?.id ?? '',
      submittedById: reimbursement.submittedBy.id,
    },
  })

  useEffect(() => {
    if (!open) return
    reset({
      category: reimbursement.category,
      amount: String(reimbursement.amount),
      description: reimbursement.description,
      date: dateInputValue(reimbursement.date),
      teamMemberId: reimbursement.teamMember?.id ?? '',
      submittedById: reimbursement.submittedBy.id,
    })
  }, [open, reimbursement, reset])

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      await updateReimbursement({
        id: reimbursement.id as Id<'reimbursements'>,
        category: data.category,
        amount: parseFloat(data.amount),
        description: data.description,
        date: new Date(data.date).getTime(),
        receiptUrl: reimbursement.receiptUrl,
        teamMemberId: data.teamMemberId ? (data.teamMemberId as Id<'teamMembers'>) : undefined,
        submittedById: data.submittedById,
      })
      toast.success('Reimbursement updated')
      setOpen(false)
    } catch {
      toast.error('Failed to update reimbursement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger render={trigger} />
      ) : (
        <DialogTrigger render={<Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" />}>
          <Pencil className="h-3.5 w-3.5" />
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Edit Reimbursement</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Category</Label>
            <Select value={watch('category')} onValueChange={(v) => setValue('category', v as FormData['category'])}>
              <SelectTrigger><SelectValue>{CATEGORY_LABELS[watch('category')]}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="TRAVEL">Travel</SelectItem>
                <SelectItem value="FOOD_ENTERTAINMENT">Food & Entertainment</SelectItem>
                <SelectItem value="TOOLS_SOFTWARE">Tools & Software</SelectItem>
                <SelectItem value="OFFICE_SUPPLIES">Office Supplies</SelectItem>
                <SelectItem value="AD_SPEND">Ad Spend</SelectItem>
                <SelectItem value="MISCELLANEOUS">Miscellaneous</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input type="number" step="0.01" {...register('amount')} />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" {...register('date')} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Input {...register('description')} />
            {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Submitted By</Label>
            <Select value={watch('submittedById') ?? ''} onValueChange={(v) => v && setValue('submittedById', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SUBMITTERS.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Team Member</Label>
            <Select value={watch('teamMemberId') || 'none'} onValueChange={(v) => setValue('teamMemberId', v === 'none' ? '' : String(v))}>
              <SelectTrigger><SelectValue placeholder="Self" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Self</SelectItem>
                {teamMembers.map((member) => <SelectItem key={member.id} value={member.id}>{member.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
