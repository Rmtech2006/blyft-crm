'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus } from 'lucide-react'

const schema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.string().min(1, 'Amount is required'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  date: z.string().min(1, 'Date is required'),
  paymentMode: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CARD', 'OTHER']),
  bankAccountId: z.string().optional(),
  gstTagged: z.boolean().default(false),
  gstAmount: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface AddTransactionDialogProps {
  defaultBankAccountId?: string
  triggerLabel?: string
}

export function AddTransactionDialog({
  defaultBankAccountId,
  triggerLabel = 'Add Transaction',
}: AddTransactionDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const bankAccounts = useQuery(api.finance.listBankAccounts) ?? []
  const createTransaction = useMutation(api.finance.createTransaction)

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'INCOME',
      paymentMode: 'UPI',
      gstTagged: false,
      bankAccountId: defaultBankAccountId ?? '',
      date: new Date().toISOString().split('T')[0],
    },
  })

  const gstTagged = watch('gstTagged')

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      await createTransaction({
        type: data.type,
        amount: parseFloat(data.amount),
        category: data.category,
        description: data.description,
        date: new Date(data.date).getTime(),
        paymentMode: data.paymentMode,
        bankAccountId: (data.bankAccountId || undefined) as Id<'bankAccounts'> | undefined,
        gstTagged: data.gstTagged,
        gstAmount: data.gstAmount ? parseFloat(data.gstAmount) : undefined,
      })
      toast.success('Transaction recorded')
      reset({
        type: 'INCOME',
        paymentMode: 'UPI',
        gstTagged: false,
        bankAccountId: defaultBankAccountId ?? '',
        date: new Date().toISOString().split('T')[0],
        amount: '',
        category: '',
        description: '',
      })
      setOpen(false)
    } catch {
      toast.error('Failed to record transaction')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> {triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Record Transaction</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select defaultValue="INCOME" onValueChange={(v) => setValue('type', v as 'INCOME' | 'EXPENSE')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">Credit (Income)</SelectItem>
                  <SelectItem value="EXPENSE">Debit (Expense)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Amount (₹)</Label>
              <Input type="number" step="0.01" placeholder="0.00" {...register('amount')} />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Description</Label>
            <Input placeholder="e.g. Payment from Acme Corp" {...register('description')} />
            {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Category</Label>
            <Input placeholder="e.g. Client Payment, Salary, Ads, Tools" {...register('category')} />
            {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" {...register('date')} />
            </div>
            <div className="space-y-1">
              <Label>Payment Mode</Label>
              <Select defaultValue="UPI" onValueChange={(v) => setValue('paymentMode', v as FormData['paymentMode'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CARD', 'OTHER'].map((m) => (
                    <SelectItem key={m} value={m}>{m.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Bank Account (optional)</Label>
            {defaultBankAccountId ? (
              <p className="text-sm text-muted-foreground">
                {bankAccounts.find((a) => a.id === defaultBankAccountId)?.name ?? 'Selected account'}
              </p>
            ) : (
              <Select defaultValue="" onValueChange={(v) => setValue('bankAccountId', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="No account" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No account</SelectItem>
                  {bankAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name} — {a.bankName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="gstTagged" checked={gstTagged} onCheckedChange={(v) => setValue('gstTagged', !!v)} />
            <Label htmlFor="gstTagged">GST Tagged</Label>
          </div>

          {gstTagged && (
            <div className="space-y-1">
              <Label>GST Amount (₹)</Label>
              <Input type="number" step="0.01" placeholder="0.00" {...register('gstAmount')} />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Record'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
