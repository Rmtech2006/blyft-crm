'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AddTransactionDialog } from '@/components/finance/add-transaction-dialog'
import { FinanceSummaryCards } from '@/components/finance/summary-cards'
import { ExportMenu } from '@/components/shared/export-menu'
import { TrendingUp, Landmark, Trash2, Plus, Pencil, ArrowLeft, ArrowUpRight, ArrowDownLeft, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { exportCsv, printReport } from '@/lib/export'
import { usePrivacyMode } from '@/contexts/privacy-mode-context'
import {
  buildStatementRowsFromCurrentBalance,
  sortTransactionsByDateDesc,
  sumNonOperatingIncome,
  sumOperatingIncome,
} from '@/lib/finance-classification.mjs'

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(date: number | string) {
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Add Bank Account Dialog ───────────────────────────────────────────────────
function AddBankAccountDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', bankName: '', accountNumber: '', balance: '' })
  const createBankAccount = useMutation(api.finance.createBankAccount)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.bankName) {
      toast.error('Account name and bank name are required')
      return
    }
    setLoading(true)
    try {
      await createBankAccount({
        name: form.name,
        bankName: form.bankName,
        accountNumber: form.accountNumber || undefined,
        balance: form.balance ? parseFloat(form.balance) : undefined,
      })
      toast.success('Bank account added')
      setForm({ name: '', bankName: '', accountNumber: '', balance: '' })
      setOpen(false)
    } catch {
      toast.error('Failed to add bank account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="h-4 w-4 mr-1" /> Add Account
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Add Bank Account</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Account Label</Label>
            <Input placeholder="e.g. BLYFT Operations" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Bank Name</Label>
            <Input placeholder="e.g. HDFC Bank" value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Account Number (last 4 digits optional)</Label>
            <Input placeholder="e.g. xxxx xxxx 4521" value={form.accountNumber} onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Opening Balance (₹)</Label>
            <Input type="number" step="0.01" placeholder="0" value={form.balance} onChange={(e) => setForm((f) => ({ ...f, balance: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Adding…' : 'Add Account'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Edit Balance Dialog ───────────────────────────────────────────────────────
// Kept as a lightweight balance-only editor if the full account form needs to be split again.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function EditBalanceDialog({ account }: { account: { id: string; name: string; balance: number } }) {
  const [open, setOpen] = useState(false)
  const [balance, setBalance] = useState(String(account.balance))
  const [loading, setLoading] = useState(false)
  const updateBalance = useMutation(api.finance.updateBankAccountBalance)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await updateBalance({ id: account.id as Id<'bankAccounts'>, balance: parseFloat(balance) })
      toast.success('Balance updated')
      setOpen(false)
    } catch {
      toast.error('Failed to update balance')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" title="Edit balance" />}>
        <Pencil className="h-3.5 w-3.5" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader><DialogTitle>Edit Balance — {account.name}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Current Balance (₹)</Label>
            <Input type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} autoFocus />
            <p className="text-xs text-muted-foreground">This sets the balance directly. Transactions still affect it automatically.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditBankAccountDialog({
  account,
  trigger,
}: {
  account: { id: string; name: string; bankName: string; accountNumber?: string; balance: number }
  trigger?: React.ReactElement
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: account.name,
    bankName: account.bankName,
    accountNumber: account.accountNumber ?? '',
    balance: String(account.balance),
  })
  const updateBankAccount = useMutation(api.finance.updateBankAccount)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.name.trim() || !form.bankName.trim()) {
      toast.error('Account name and bank name are required')
      return
    }
    setLoading(true)
    try {
      await updateBankAccount({
        id: account.id as Id<'bankAccounts'>,
        name: form.name.trim(),
        bankName: form.bankName.trim(),
        accountNumber: form.accountNumber.trim() || undefined,
        balance: parseFloat(form.balance || '0'),
      })
      toast.success('Bank account updated')
      setOpen(false)
    } catch {
      toast.error('Failed to update bank account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen)
      if (nextOpen) {
        setForm({
          name: account.name,
          bankName: account.bankName,
          accountNumber: account.accountNumber ?? '',
          balance: String(account.balance),
        })
      }
    }}>
      {trigger ? (
        <DialogTrigger render={trigger} />
      ) : (
        <DialogTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" title="Edit account" />}>
          <Pencil className="h-3.5 w-3.5" />
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Edit Bank Account</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Account Label</Label>
            <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Bank Name</Label>
            <Input value={form.bankName} onChange={(event) => setForm((current) => ({ ...current, bankName: event.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Account Number</Label>
            <Input value={form.accountNumber} onChange={(event) => setForm((current) => ({ ...current, accountNumber: event.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Balance</Label>
            <Input type="number" step="0.01" value={form.balance} onChange={(event) => setForm((current) => ({ ...current, balance: event.target.value }))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditPettyCashDialog({
  entry,
  trigger,
}: {
  entry: { id: string; description: string; amount: number; type: 'IN' | 'OUT'; date: number; category: string }
  trigger?: React.ReactElement
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    description: entry.description,
    amount: String(entry.amount),
    type: entry.type,
    category: entry.category,
    date: new Date(entry.date).toISOString().slice(0, 10),
  })
  const updatePettyCash = useMutation(api.finance.updatePettyCash)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.description.trim() || !form.amount || !form.category.trim()) {
      toast.error('Fill all fields')
      return
    }
    setLoading(true)
    try {
      await updatePettyCash({
        id: entry.id as Id<'pettyCash'>,
        description: form.description.trim(),
        amount: parseFloat(form.amount),
        type: form.type,
        category: form.category.trim(),
        date: new Date(form.date).getTime(),
      })
      toast.success('Petty cash entry updated')
      setOpen(false)
    } catch {
      toast.error('Failed to update petty cash entry')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen)
      if (nextOpen) {
        setForm({
          description: entry.description,
          amount: String(entry.amount),
          type: entry.type,
          category: entry.category,
          date: new Date(entry.date).toISOString().slice(0, 10),
        })
      }
    }}>
      {trigger ? (
        <DialogTrigger render={trigger} />
      ) : (
        <DialogTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" title="Edit petty cash entry" />}>
          <Pencil className="h-3.5 w-3.5" />
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Edit Petty Cash Entry</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value as 'IN' | 'OUT' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">Cash In</SelectItem>
                  <SelectItem value="OUT">Cash Out</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input type="number" step="1" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Bank Statement View ───────────────────────────────────────────────────────
type BankAccountWithTx = {
  id: string
  name: string
  bankName: string
  accountNumber?: string
  balance: number
  lastUpdated: number
  transactions: Array<{
    id: string
    type: 'INCOME' | 'EXPENSE'
    amount: number
    category: string
    description: string
    notes?: string
    date: number
    paymentMode: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE' | 'CARD' | 'OTHER'
    bankAccountId?: string
    gstTagged?: boolean
    gstAmount?: number
    client?: { companyName: string } | null
  }>
}

function BankStatement({ accountId, bankAccounts, onBack }: { accountId: string; bankAccounts: BankAccountWithTx[]; onBack: () => void }) {
  const removeTransaction = useMutation(api.finance.removeTransaction)
  const { mask } = usePrivacyMode()
  const account = bankAccounts.find((a) => a.id === accountId)

  if (!account) return null

  const rows = buildStatementRowsFromCurrentBalance(account.transactions, account.balance)

  async function deleteTransaction(id: string) {
    if (!confirm('Delete this transaction? The bank balance will be reversed.')) return
    try {
      await removeTransaction({ id: id as Id<'transactions'> })
      toast.success('Transaction deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h2 className="font-semibold text-lg">{account.name}</h2>
            <p className="text-sm text-muted-foreground">{account.bankName}{account.accountNumber ? ` · ${account.accountNumber}` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Current Balance</p>
            <p className={`text-xl font-bold ${account.balance >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>{mask(account.balance, formatINR)}</p>
          </div>
          <AddTransactionDialog defaultBankAccountId={account.id} triggerLabel="Add Entry" />
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead className="text-right text-green-700">Credit</TableHead>
              <TableHead className="text-right text-destructive">Debit</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-12">No transactions yet. Add your first entry above.</TableCell>
              </TableRow>
            )}
            {rows.map((t) => (
              <TableRow key={t.id} className="hover:bg-muted/30">
                <TableCell className="text-sm whitespace-nowrap">{formatDate(t.date)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {t.type === 'INCOME' ? <ArrowUpRight className="h-3.5 w-3.5 text-green-500 shrink-0" /> : <ArrowDownLeft className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                    <div>
                      <p className="font-medium text-sm">{t.description}</p>
                      {t.notes && <p className="text-xs text-muted-foreground">{t.notes}</p>}
                      {t.client && <p className="text-xs text-muted-foreground">{t.client.companyName}</p>}
                      {t.project && <p className="text-xs text-muted-foreground">{t.project.name}</p>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.category}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{t.paymentMode.replace('_', ' ')}</Badge></TableCell>
                <TableCell className="text-right font-medium text-emerald-500">{t.type === 'INCOME' ? mask(t.amount, formatINR) : '—'}</TableCell>
                <TableCell className="text-right font-medium text-destructive">{t.type === 'EXPENSE' ? mask(t.amount, formatINR) : '—'}</TableCell>
                <TableCell className={`text-right font-semibold text-sm ${t.runningBalance >= 0 ? 'text-foreground' : 'text-destructive'}`}>{mask(t.runningBalance, formatINR)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <AddTransactionDialog transaction={t} />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => deleteTransaction(t.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

// ── Outstanding Payments Tab ──────────────────────────────────────────────────
function OutstandingTab() {
  const outstanding = useQuery(api.finance.getOutstanding) ?? []
  const { mask } = usePrivacyMode()

  if (outstanding.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl">
        <TrendingUp className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No outstanding payments</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Add active clients with retainer amounts to track receivables.</p>
      </div>
    )
  }

  const totalOutstanding = outstanding.reduce((s, c) => s + c.outstanding, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{outstanding.length} client{outstanding.length !== 1 ? 's' : ''} with outstanding payments</p>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total Outstanding</p>
          <p className="text-xl font-bold text-destructive">{mask(totalOutstanding, formatINR)}</p>
        </div>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Retainer/mo</TableHead>
              <TableHead className="text-right">Received (this month)</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead>Last Payment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {outstanding.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium text-sm">{c.companyName}</TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">{mask(c.retainerAmount, formatINR)}</TableCell>
                <TableCell className="text-right text-sm text-emerald-500 font-medium">{mask(c.receivedThisMonth, formatINR)}</TableCell>
                <TableCell className="text-right">
                  <span className="font-bold text-destructive text-sm">{mask(c.outstanding, formatINR)}</span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.lastPaymentDate
                    ? `${formatDate(c.lastPaymentDate)} (${c.daysSincePayment}d ago)`
                    : 'Never'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

// ── Petty Cash Tab ────────────────────────────────────────────────────────────
function PettyCashTab() {
  const [form, setForm] = useState({ description: '', amount: '', type: 'OUT' as 'IN' | 'OUT', category: '', date: new Date().toISOString().slice(0, 10) })
  const [loading, setLoading] = useState(false)
  const entries = useQuery(api.finance.listPettyCash) ?? []
  const addEntry = useMutation(api.finance.addPettyCash)
  const removeEntry = useMutation(api.finance.removePettyCash)

  const balance = entries.reduce((s, e) => e.type === 'IN' ? s + e.amount : s - e.amount, 0)
  const { mask } = usePrivacyMode()

  async function handleAdd(evt: React.FormEvent) {
    evt.preventDefault()
    if (!form.description || !form.amount || !form.category) { toast.error('Fill all fields'); return }
    setLoading(true)
    try {
      await addEntry({ description: form.description, amount: parseFloat(form.amount), type: form.type, date: new Date(form.date).getTime(), category: form.category, addedBy: 'Admin' })
      toast.success('Entry added')
      setForm((f) => ({ ...f, description: '', amount: '', category: '' }))
    } catch {
      toast.error('Failed to add entry')
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Track small cash movements separately from bank transactions</p>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Petty Cash Balance</p>
          <p className={`text-xl font-bold ${balance >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>{mask(balance, formatINR)}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Add Entry</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-wrap gap-2 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as 'IN' | 'OUT' }))}>
                <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">Cash In</SelectItem>
                  <SelectItem value="OUT">Cash Out</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 flex-1 min-w-[150px]">
              <Label className="text-xs">Description</Label>
              <Input className="h-8 text-sm" placeholder="What for?" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1 w-28">
              <Label className="text-xs">Amount (₹)</Label>
              <Input className="h-8 text-sm" type="number" step="1" placeholder="0" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="space-y-1 w-32">
              <Label className="text-xs">Category</Label>
              <Input className="h-8 text-sm" placeholder="Travel, Food…" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
            </div>
            <div className="space-y-1 w-36">
              <Label className="text-xs">Date</Label>
              <Input className="h-8 text-sm" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <Button type="submit" size="sm" className="h-8" disabled={loading}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right text-emerald-700">Cash In</TableHead>
              <TableHead className="text-right text-destructive">Cash Out</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No petty cash entries yet</TableCell></TableRow>
            )}
            {entries.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-sm whitespace-nowrap">{formatDate(e.date)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {e.type === 'IN' ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <ArrowDownLeft className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                    <span className="text-sm font-medium">{e.description}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{e.category}</TableCell>
                <TableCell className="text-right font-medium text-emerald-500">{e.type === 'IN' ? mask(e.amount, formatINR) : '—'}</TableCell>
                <TableCell className="text-right font-medium text-destructive">{e.type === 'OUT' ? mask(e.amount, formatINR) : '—'}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <EditPettyCashDialog entry={e} />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => removeEntry({ id: e.id as Id<'pettyCash'> })}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

// ── Main Finance Page ─────────────────────────────────────────────────────────
export default function FinancePage() {
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const { isHidden, toggle, mask } = usePrivacyMode()

  const clients = useQuery(api.clients.list) ?? []
  const projects = useQuery(api.projects.list) ?? []
  const transactionsQuery = useQuery(api.finance.listTransactions, {
    type: typeFilter !== 'ALL' ? (typeFilter as 'INCOME' | 'EXPENSE') : undefined,
    dateFrom: dateFrom ? new Date(dateFrom).getTime() : undefined,
    dateTo: dateTo ? new Date(dateTo).getTime() : undefined,
    clientId: selectedClientId ? (selectedClientId as Id<'clients'>) : undefined,
    projectId: selectedProjectId ? (selectedProjectId as Id<'projects'>) : undefined,
  }) ?? []
  const transactions = sortTransactionsByDateDesc(transactionsQuery)

  const bankAccounts = useQuery(api.finance.listBankAccounts) ?? []
  const removeTransaction = useMutation(api.finance.removeTransaction)
  const removeBankAccount = useMutation(api.finance.removeBankAccount)

  const income = sumOperatingIncome(transactions)
  const nonOperatingIncome = sumNonOperatingIncome(transactions)
  const expense = transactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
  const net = income - expense
  const totalBankBalance = bankAccounts.reduce((s, a) => s + a.balance, 0)

  function handleCsvExport() {
    exportCsv('finance-transactions.csv', transactions, [
      { header: 'Date', value: (transaction) => formatDate(transaction.date) },
      { header: 'Type', value: (transaction) => transaction.type },
      { header: 'Category', value: (transaction) => transaction.category },
      { header: 'Description', value: (transaction) => transaction.description },
      { header: 'Notes', value: (transaction) => transaction.notes ?? '' },
      { header: 'Amount', value: (transaction) => transaction.amount },
      { header: 'Payment mode', value: (transaction) => transaction.paymentMode },
      { header: 'Client', value: (transaction) => transaction.client?.companyName ?? '—' },
      { header: 'Project', value: (transaction) => transaction.project?.name ?? '—' },
    ])
  }

  function handlePdfExport() {
    printReport({
      title: 'BLYFT Finance Report',
      subtitle: `Generated on ${new Date().toLocaleDateString('en-IN')}`,
      sections: [
        {
          title: 'Finance summary',
          columns: ['Metric', 'Value'],
          rows: [
            ['Operating income', formatINR(income)],
            ['Non-operating income', formatINR(nonOperatingIncome)],
            ['Total expenses', formatINR(expense)],
            ['Operating profit', formatINR(net)],
            ['Bank balance', formatINR(totalBankBalance)],
            ['Filtered transactions', transactions.length],
          ],
        },
        {
          title: 'Transaction list',
          columns: ['Date', 'Type', 'Category', 'Description', 'Notes', 'Amount', 'Client'],
          rows: transactions.map((transaction) => [
            formatDate(transaction.date),
            transaction.type,
            transaction.category,
            transaction.description,
            transaction.notes ?? '',
            formatINR(transaction.amount),
            transaction.client?.companyName ?? '—',
          ]),
        },
      ],
    })
  }

  async function deleteTransaction(id: string) {
    if (!confirm('Delete this transaction?')) return
    try {
      await removeTransaction({ id: id as Id<'transactions'> })
      toast.success('Deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  async function deleteAccount(id: string) {
    if (!confirm('Remove this bank account?')) return
    try {
      await removeBankAccount({ id: id as Id<'bankAccounts'> })
      toast.success('Account removed')
    } catch {
      toast.error('Failed to remove account')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Finance</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={toggle} title={isHidden ? 'Show amounts' : 'Hide amounts'}>
            {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <ExportMenu onCsv={handleCsvExport} onPdf={handlePdfExport} />
          <AddTransactionDialog />
        </div>
      </div>

      <FinanceSummaryCards
        income={income}
        nonOperatingIncome={nonOperatingIncome}
        expense={expense}
        net={net}
        totalBankBalance={totalBankBalance}
        formatINR={formatINR}
      />

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
          <TabsTrigger value="petty">Petty Cash</TabsTrigger>
          <TabsTrigger value="bank">Bank Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? 'ALL')}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="INCOME">Credit (Income)</SelectItem>
                <SelectItem value="EXPENSE">Debit (Expense)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedClientId ?? 'ALL'} onValueChange={(value) => setSelectedClientId(value === 'ALL' ? null : value)}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All clients" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All clients</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>{client.companyName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedProjectId ?? 'ALL'} onValueChange={(value) => setSelectedProjectId(value === 'ALL' ? null : value)}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All projects" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" className="w-40" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" className="w-40" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            {(typeFilter !== 'ALL' || dateFrom || dateTo || selectedClientId || selectedProjectId) && (
              <Button variant="outline" size="sm" onClick={() => { setTypeFilter('ALL'); setDateFrom(''); setDateTo(''); setSelectedClientId(null); setSelectedProjectId(null) }}>
                Clear
              </Button>
            )}
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead className="text-right text-green-700">Credit</TableHead>
                  <TableHead className="text-right text-destructive">Debit</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-10">No transactions found</TableCell></TableRow>
                )}
                {transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm whitespace-nowrap">{formatDate(t.date)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {t.type === 'INCOME' ? <ArrowUpRight className="h-3.5 w-3.5 text-green-500 shrink-0" /> : <ArrowDownLeft className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                        <div>
                          <p className="font-medium text-sm">{t.description}</p>
                          {t.notes && <p className="text-xs text-muted-foreground">{t.notes}</p>}
                          {(t.client || t.project) && (
                            <p className="text-xs text-muted-foreground">
                              {[t.client?.companyName, t.project?.name].filter(Boolean).join(' • ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{t.category}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.bankAccount?.name ?? '—'}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{t.paymentMode.replace('_', ' ')}</Badge></TableCell>
                    <TableCell className="text-right font-medium text-emerald-500">{t.type === 'INCOME' ? mask(t.amount, formatINR) : '—'}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">{t.type === 'EXPENSE' ? mask(t.amount, formatINR) : '—'}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <AddTransactionDialog transaction={t} />
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => deleteTransaction(t.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="outstanding">
          <OutstandingTab />
        </TabsContent>

        <TabsContent value="petty">
          <PettyCashTab />
        </TabsContent>

        <TabsContent value="bank" className="space-y-4">
          {selectedAccountId ? (
            <BankStatement
              accountId={selectedAccountId}
              bankAccounts={bankAccounts as BankAccountWithTx[]}
              onBack={() => setSelectedAccountId(null)}
            />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Click an account to view its statement</p>
                <AddBankAccountDialog />
              </div>

              {bankAccounts.length === 0 && (
                <Card className="p-12 text-center text-muted-foreground">
                  <Landmark className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No bank accounts added yet</p>
                  <p className="text-sm mt-1">Add your first account to start tracking your bank balance.</p>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bankAccounts.map((account) => {
                  const credits = account.transactions.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
                  const debits = account.transactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)

                  return (
                    <Card key={account.id} className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all" onClick={() => setSelectedAccountId(account.id)}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Landmark className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{account.name}</p>
                              <p className="text-xs text-muted-foreground">{account.bankName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <EditBankAccountDialog account={account} />
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => deleteAccount(account.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {account.accountNumber && <p className="text-xs text-muted-foreground font-mono">{account.accountNumber}</p>}
                        <div>
                          <p className="text-xs text-muted-foreground">Current Balance</p>
                          <p className={`text-2xl font-bold ${account.balance >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>{mask(account.balance, formatINR)}</p>
                        </div>
                        <div className="flex gap-4 pt-1 border-t">
                          <div>
                            <p className="text-xs text-muted-foreground">Credits</p>
                            <p className="text-sm font-medium text-emerald-500">{mask(credits, formatINR)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Debits</p>
                            <p className="text-sm font-medium text-destructive">{mask(debits, formatINR)}</p>
                          </div>
                          <div className="ml-auto text-right">
                            <p className="text-xs text-muted-foreground">Entries</p>
                            <p className="text-sm font-medium">{account.transactions.length}</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">Updated {formatDate(account.lastUpdated)}</p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
