'use client'

import { useEffect, useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Pencil, Plus } from 'lucide-react'

const schema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.string().min(1, 'Amount is required'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  notes: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  paymentMode: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CARD', 'OTHER']),
  bankAccountId: z.string().optional(),
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  gstTagged: z.boolean(),
  gstAmount: z.string().optional(),
})

type FormData = z.infer<typeof schema>

type EditableTransaction = {
  id: string
  type: 'INCOME' | 'EXPENSE'
  amount: number
  category: string
  description: string
  notes?: string
  date: number
  paymentMode: FormData['paymentMode']
  bankAccountId?: string
  clientId?: string
  projectId?: string
  gstTagged?: boolean
  gstAmount?: number
}

interface AddTransactionDialogProps {
  defaultBankAccountId?: string
  triggerLabel?: string
  transaction?: EditableTransaction
}

function toDateInput(date: number) {
  return new Date(date).toISOString().split('T')[0]
}

export function AddTransactionDialog({
  defaultBankAccountId,
  triggerLabel = 'Add Transaction',
  transaction,
}: AddTransactionDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const isEditing = Boolean(transaction)

  const bankAccounts = useQuery(api.finance.listBankAccounts) ?? []
  const clients = useQuery(api.clients.list) ?? []
  const projects = useQuery(api.projects.list) ?? []
  const createTransaction = useMutation(api.finance.createTransaction)
  const updateTransaction = useMutation(api.finance.updateTransaction)

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'INCOME',
      paymentMode: 'UPI',
      gstTagged: false,
      bankAccountId: defaultBankAccountId ?? '',
      clientId: '',
      projectId: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    },
  })

  useEffect(() => {
    if (!open) return

    reset({
      type: transaction?.type ?? 'INCOME',
      paymentMode: transaction?.paymentMode ?? 'UPI',
      gstTagged: transaction?.gstTagged ?? false,
      bankAccountId: transaction?.bankAccountId ?? defaultBankAccountId ?? '',
      clientId: transaction?.clientId ?? '',
      projectId: transaction?.projectId ?? '',
      date: transaction ? toDateInput(transaction.date) : new Date().toISOString().split('T')[0],
      amount: transaction ? String(transaction.amount) : '',
      category: transaction?.category ?? '',
      description: transaction?.description ?? '',
      notes: transaction?.notes ?? '',
      gstAmount: transaction?.gstAmount ? String(transaction.gstAmount) : '',
    })
  }, [defaultBankAccountId, open, reset, transaction])

  const gstTagged = watch('gstTagged')
  const type = watch('type')
  const paymentMode = watch('paymentMode')
  const bankAccountId = watch('bankAccountId')
  const clientId = watch('clientId')
  const projectId = watch('projectId')
  const selectedBankAccount = bankAccounts.find((a) => a.id === bankAccountId)
  const selectedBankAccountLabel = selectedBankAccount
    ? `${selectedBankAccount.name} - ${selectedBankAccount.bankName}`
    : 'No account'
  const selectedDefaultBankAccountLabel = bankAccounts.find((a) => a.id === defaultBankAccountId)?.name ?? 'Selected account'
  const selectedClientLabel = clients.find((client) => client.id === clientId)?.companyName ?? 'No client'
  const selectedProjectLabel = projects.find((project) => project.id === projectId)?.name ?? 'No project'

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const payload = {
        type: data.type,
        amount: parseFloat(data.amount),
        category: data.category,
        description: data.description,
        notes: data.notes?.trim() || undefined,
        date: new Date(data.date).getTime(),
        paymentMode: data.paymentMode,
        bankAccountId: (data.bankAccountId || undefined) as Id<'bankAccounts'> | undefined,
        clientId: (data.clientId || undefined) as Id<'clients'> | undefined,
        projectId: (data.projectId || undefined) as Id<'projects'> | undefined,
        gstTagged: data.gstTagged,
        gstAmount: data.gstAmount ? parseFloat(data.gstAmount) : undefined,
      }

      if (transaction) {
        await updateTransaction({
          id: transaction.id as Id<'transactions'>,
          ...payload,
        })
      } else {
        await createTransaction(payload)
      }

      toast.success(transaction ? 'Transaction updated' : 'Transaction recorded')
      reset({
        type: 'INCOME',
        paymentMode: 'UPI',
        gstTagged: false,
        bankAccountId: defaultBankAccountId ?? '',
        clientId: '',
        projectId: '',
        date: new Date().toISOString().split('T')[0],
        amount: '',
        category: '',
        description: '',
        notes: '',
      })
      setOpen(false)
    } catch {
      toast.error(transaction ? 'Failed to update transaction' : 'Failed to record transaction')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size={isEditing ? 'icon' : 'sm'}
            variant={isEditing ? 'ghost' : 'default'}
            className={isEditing ? 'h-7 w-7 text-muted-foreground hover:text-foreground' : undefined}
            title={isEditing ? 'Edit transaction' : undefined}
          />
        }
      >
        {isEditing ? <Pencil className="h-3.5 w-3.5" /> : <><Plus className="h-4 w-4 mr-1" /> {triggerLabel}</>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader className="shrink-0"><DialogTitle>{isEditing ? 'Edit Transaction' : 'Record Transaction'}</DialogTitle></DialogHeader>
        <div className="overflow-y-auto flex-1 pr-1">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setValue('type', v as 'INCOME' | 'EXPENSE')}>
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
            <Label>Notes</Label>
            <Textarea placeholder="Add internal notes, invoice reference, or context" {...register('notes')} />
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
              <Select value={paymentMode} onValueChange={(v) => setValue('paymentMode', v as FormData['paymentMode'])}>
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
                {selectedDefaultBankAccountLabel}
              </p>
            ) : (
              <Select value={bankAccountId || 'none'} onValueChange={(v) => setValue('bankAccountId', v == null ? '' : v === 'none' ? '' : v)}>
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="No account">
                    <span className="block truncate">{selectedBankAccountLabel}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No account</SelectItem>
                  {bankAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name} - {a.bankName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Link to client</Label>
              <Select value={clientId || 'none'} onValueChange={(v) => setValue('clientId', v == null ? '' : v === 'none' ? '' : v)}>
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="No client">
                    <span className="block truncate">{selectedClientLabel}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>{client.companyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Link to project</Label>
              <Select value={projectId || 'none'} onValueChange={(v) => setValue('projectId', v == null ? '' : v === 'none' ? '' : v)}>
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="No project">
                    <span className="block truncate">{selectedProjectLabel}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

          <div className="flex justify-end gap-2 pt-2 pb-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Record'}</Button>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
