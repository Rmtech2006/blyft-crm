'use client'

import { useMemo, useState } from 'react'
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
import { ExportMenu } from '@/components/shared/export-menu'
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Landmark,
  Pencil,
  Plus,
  TrendingDown,
  TrendingUp,
  Trash2,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { exportCsv, printReport } from '@/lib/export'

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
    date: number
    paymentMode: string
    client?: { companyName: string } | null
  }>
}

function BankStatement({ accountId, bankAccounts, onBack }: { accountId: string; bankAccounts: BankAccountWithTx[]; onBack: () => void }) {
  const removeTransaction = useMutation(api.finance.removeTransaction)
  const account = bankAccounts.find((a) => a.id === accountId)

  if (!account) return null

  const txns = [...account.transactions].sort((a, b) => a.date - b.date)
  const rows = txns.reduce<Array<(typeof txns)[number] & { runningBalance: number }>>((acc, transaction) => {
    const previousBalance = acc.at(-1)?.runningBalance ?? 0
    const delta = transaction.type === 'INCOME' ? transaction.amount : -transaction.amount

    acc.push({
      ...transaction,
      runningBalance: previousBalance + delta,
    })

    return acc
  }, []).reverse()

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
            <p className={`text-xl font-bold ${account.balance >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>{formatINR(account.balance)}</p>
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
                      {t.client && <p className="text-xs text-muted-foreground">{t.client.companyName}</p>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.category}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{t.paymentMode.replace('_', ' ')}</Badge></TableCell>
                <TableCell className="text-right font-medium text-emerald-500">{t.type === 'INCOME' ? formatINR(t.amount) : '—'}</TableCell>
                <TableCell className="text-right font-medium text-destructive">{t.type === 'EXPENSE' ? formatINR(t.amount) : '—'}</TableCell>
                <TableCell className={`text-right font-semibold text-sm ${t.runningBalance >= 0 ? 'text-foreground' : 'text-destructive'}`}>{formatINR(t.runningBalance)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => deleteTransaction(t.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
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
          <p className="text-xl font-bold text-destructive">{formatINR(totalOutstanding)}</p>
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
                <TableCell className="text-right text-sm text-muted-foreground">{formatINR(c.retainerAmount)}</TableCell>
                <TableCell className="text-right text-sm text-emerald-500 font-medium">{formatINR(c.receivedThisMonth)}</TableCell>
                <TableCell className="text-right">
                  <span className="font-bold text-destructive text-sm">{formatINR(c.outstanding)}</span>
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
          <p className={`text-xl font-bold ${balance >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>{formatINR(balance)}</p>
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
                <TableCell className="text-right font-medium text-emerald-500">{e.type === 'IN' ? formatINR(e.amount) : '—'}</TableCell>
                <TableCell className="text-right font-medium text-destructive">{e.type === 'OUT' ? formatINR(e.amount) : '—'}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => removeEntry({ id: e.id as Id<'pettyCash'> })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
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
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('transactions')

  const transactions = useQuery(api.finance.listTransactions, {
    type: typeFilter !== 'ALL' ? (typeFilter as 'INCOME' | 'EXPENSE') : undefined,
    dateFrom: dateFrom ? new Date(dateFrom).getTime() : undefined,
    dateTo: dateTo ? new Date(dateTo).getTime() : undefined,
  }) ?? []

  const bankAccounts = useQuery(api.finance.listBankAccounts) ?? []
  const snapshot = useQuery(api.finance.getSnapshot)
  const outstanding = useQuery(api.finance.getOutstanding) ?? []
  const pettyCashEntries = useQuery(api.finance.listPettyCash) ?? []
  const removeTransaction = useMutation(api.finance.removeTransaction)
  const removeBankAccount = useMutation(api.finance.removeBankAccount)

  const income = transactions.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
  const net = income - expense
  const totalBankBalance = bankAccounts.reduce((s, a) => s + a.balance, 0)
  const pettyCashBalance = pettyCashEntries.reduce(
    (sum, entry) => (entry.type === 'IN' ? sum + entry.amount : sum - entry.amount),
    0
  )
  const outstandingTotal = outstanding.reduce((sum, client) => sum + client.outstanding, 0)
  const monthIncome = snapshot?.monthIncome ?? income
  const monthExpense = snapshot?.monthExpense ?? expense
  const monthNet = monthIncome - monthExpense
  const financeFocusCount = [
    outstandingTotal > 0,
    pettyCashBalance < 0,
    monthNet < 0,
  ].filter(Boolean).length
  const financeFocusCards = useMemo(
    () => [
      {
        label: 'Receivables',
        value: formatINR(outstandingTotal),
        helper:
          outstandingTotal > 0
            ? `${outstanding.length} client${outstanding.length === 1 ? '' : 's'} still have unpaid retainer value this month.`
            : 'No unpaid retainers are visible in the current cycle.',
        action: 'Review outstanding',
        onClick: () => setActiveTab('outstanding'),
        icon: AlertTriangle,
        tone:
          outstandingTotal > 0
            ? 'border-destructive/25 bg-destructive/5 text-destructive'
            : 'border-emerald-300/80 bg-emerald-50 text-emerald-700',
      },
      {
        label: 'Petty cash',
        value: formatINR(pettyCashBalance),
        helper:
          pettyCashBalance < 0
            ? 'Cash on hand is negative. Reconcile entries or replenish the float.'
            : 'Small cash movement is within a healthy range right now.',
        action: 'Open petty cash',
        onClick: () => setActiveTab('petty'),
        icon: Wallet,
        tone:
          pettyCashBalance < 0
            ? 'border-amber-300/80 bg-amber-50 text-amber-700'
            : 'border-border/80 bg-card/80 text-foreground',
      },
      {
        label: 'Bank desk',
        value: String(bankAccounts.length),
        helper:
          bankAccounts.length > 0
            ? `${bankAccounts.length} active account${bankAccounts.length === 1 ? '' : 's'} ready for reconciliation and statement review.`
            : 'No bank accounts are connected yet. Add one to track balances cleanly.',
        action: 'Open bank accounts',
        onClick: () => setActiveTab('bank'),
        icon: Landmark,
        tone: 'border-border/80 bg-card/80 text-foreground',
      },
    ],
    [bankAccounts.length, outstandingTotal, outstanding.length, pettyCashBalance]
  )

  function handleCsvExport() {
    exportCsv('finance-transactions.csv', transactions, [
      { header: 'Date', value: (transaction) => formatDate(transaction.date) },
      { header: 'Type', value: (transaction) => transaction.type },
      { header: 'Category', value: (transaction) => transaction.category },
      { header: 'Description', value: (transaction) => transaction.description },
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
            ['Total income', formatINR(income)],
            ['Total expenses', formatINR(expense)],
            ['Net profit', formatINR(net)],
            ['Bank balance', formatINR(totalBankBalance)],
            ['Filtered transactions', transactions.length],
          ],
        },
        {
          title: 'Transaction list',
          columns: ['Date', 'Type', 'Category', 'Description', 'Amount', 'Client'],
          rows: transactions.map((transaction) => [
            formatDate(transaction.date),
            transaction.type,
            transaction.category,
            transaction.description,
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-eyebrow">Business controls</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Finance</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
            Run payments, receivables, petty cash, and bank visibility from one operating desk.
          </p>
        </div>
        <div className="flex gap-2">
          <ExportMenu onCsv={handleCsvExport} onPdf={handlePdfExport} />
          <AddTransactionDialog />
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.95fr))]">
        <Card className="surface-card">
          <CardHeader className="pb-3">
            <p className="section-eyebrow">Finance desk</p>
            <CardTitle className="mt-2 text-[1.8rem]">Today&apos;s money workflow</CardTitle>
            <p className="text-sm leading-7 text-muted-foreground">
              Start with collections and cash confidence, then drop into the tab that needs action.
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-4xl font-semibold tracking-tight">
                  {financeFocusCount === 0 ? 'Clear' : financeFocusCount}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {financeFocusCount === 0
                    ? 'No finance alerts are currently escalating. Use this desk to stay ahead of reconciliation.'
                    : `${financeFocusCount} finance lane${financeFocusCount === 1 ? ' is' : 's are'} asking for attention today.`}
                </p>
              </div>

              <div className="rounded-[20px] border border-border/80 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">This month net: {formatINR(monthNet)}</p>
                <p className="mt-1">Income {formatINR(monthIncome)} vs expense {formatINR(monthExpense)}.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="surface-muted p-4">
                <p className="section-eyebrow">Bank coverage</p>
                <p className={`mt-3 text-2xl font-semibold tracking-tight ${totalBankBalance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                  {formatINR(totalBankBalance)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Combined live balance across tracked accounts.
                </p>
              </div>

              <div className="surface-muted p-4">
                <p className="section-eyebrow">Outstanding this month</p>
                <p className={`mt-3 text-2xl font-semibold tracking-tight ${outstandingTotal > 0 ? 'text-destructive' : 'text-foreground'}`}>
                  {formatINR(outstandingTotal)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Retainer revenue still left to collect from active clients.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {financeFocusCards.map((item) => {
          const Icon = item.icon

          return (
            <Card key={item.label} className="surface-card">
              <CardContent className="flex h-full flex-col gap-5 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${item.tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 px-2" onClick={item.onClick}>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="section-eyebrow">{item.label}</p>
                  <p className="text-3xl font-semibold tracking-tight">{item.value}</p>
                  <p className="text-sm leading-6 text-muted-foreground">{item.helper}</p>
                </div>

                <Button variant="outline" className="mt-auto w-full" onClick={item.onClick}>
                  {item.action}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" /> This Month Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-500">{formatINR(monthIncome)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" /> This Month Expense
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatINR(monthExpense)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Filtered Net
            </CardTitle>
          </CardHeader>
          <CardContent><p className={`text-2xl font-bold ${net >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>{formatINR(net)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Landmark className="h-4 w-4 text-purple-500" /> Total Bank Balance
            </CardTitle>
          </CardHeader>
          <CardContent><p className={`text-2xl font-bold ${totalBankBalance >= 0 ? 'text-purple-600' : 'text-destructive'}`}>{formatINR(totalBankBalance)}</p></CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
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
            <Input type="date" className="w-40" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" className="w-40" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            {(typeFilter !== 'ALL' || dateFrom || dateTo) && (
              <Button variant="outline" size="sm" onClick={() => { setTypeFilter('ALL'); setDateFrom(''); setDateTo('') }}>
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
                          {t.client && <p className="text-xs text-muted-foreground">{t.client.companyName}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{t.category}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.bankAccount?.name ?? '—'}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{t.paymentMode.replace('_', ' ')}</Badge></TableCell>
                    <TableCell className="text-right font-medium text-emerald-500">{t.type === 'INCOME' ? formatINR(t.amount) : '—'}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">{t.type === 'EXPENSE' ? formatINR(t.amount) : '—'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => deleteTransaction(t.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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
                            <EditBalanceDialog account={account} />
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
                          <p className={`text-2xl font-bold ${account.balance >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>{formatINR(account.balance)}</p>
                        </div>
                        <div className="flex gap-4 pt-1 border-t">
                          <div>
                            <p className="text-xs text-muted-foreground">Credits</p>
                            <p className="text-sm font-medium text-emerald-500">{formatINR(credits)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Debits</p>
                            <p className="text-sm font-medium text-destructive">{formatINR(debits)}</p>
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
