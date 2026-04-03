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
import { TrendingUp, TrendingDown, Landmark, Trash2, Plus, Pencil, ArrowLeft, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { toast } from 'sonner'

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
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Account</Button>
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
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit balance">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
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

  let running = 0
  const rows = txns.map((t) => {
    const delta = t.type === 'INCOME' ? t.amount : -t.amount
    running += delta
    return { ...t, runningBalance: running }
  })
  rows.reverse()

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
            <p className={`text-xl font-bold ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatINR(account.balance)}</p>
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
              <TableHead className="text-right text-red-600">Debit</TableHead>
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
                <TableCell className="text-right font-medium text-green-600">{t.type === 'INCOME' ? formatINR(t.amount) : '—'}</TableCell>
                <TableCell className="text-right font-medium text-red-600">{t.type === 'EXPENSE' ? formatINR(t.amount) : '—'}</TableCell>
                <TableCell className={`text-right font-semibold text-sm ${t.runningBalance >= 0 ? 'text-foreground' : 'text-red-600'}`}>{formatINR(t.runningBalance)}</TableCell>
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

// ── Main Finance Page ─────────────────────────────────────────────────────────
export default function FinancePage() {
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)

  const transactions = useQuery(api.finance.listTransactions, {
    type: typeFilter !== 'ALL' ? (typeFilter as 'INCOME' | 'EXPENSE') : undefined,
    dateFrom: dateFrom ? new Date(dateFrom).getTime() : undefined,
    dateTo: dateTo ? new Date(dateTo).getTime() : undefined,
  }) ?? []

  const bankAccounts = useQuery(api.finance.listBankAccounts) ?? []
  const removeTransaction = useMutation(api.finance.removeTransaction)
  const removeBankAccount = useMutation(api.finance.removeBankAccount)

  const income = transactions.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
  const net = income - expense
  const totalBankBalance = bankAccounts.reduce((s, a) => s + a.balance, 0)

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
        <h1 className="text-2xl font-bold">Finance</h1>
        <AddTransactionDialog />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" /> Total Income
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{formatINR(income)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" /> Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-600">{formatINR(expense)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" /> Net Profit
            </CardTitle>
          </CardHeader>
          <CardContent><p className={`text-2xl font-bold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatINR(net)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Landmark className="h-4 w-4 text-purple-500" /> Total Bank Balance
            </CardTitle>
          </CardHeader>
          <CardContent><p className={`text-2xl font-bold ${totalBankBalance >= 0 ? 'text-purple-600' : 'text-red-600'}`}>{formatINR(totalBankBalance)}</p></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">All Transactions</TabsTrigger>
          <TabsTrigger value="bank">Bank Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
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
                  <TableHead className="text-right text-red-600">Debit</TableHead>
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
                    <TableCell className="text-right font-medium text-green-600">{t.type === 'INCOME' ? formatINR(t.amount) : '—'}</TableCell>
                    <TableCell className="text-right font-medium text-red-600">{t.type === 'EXPENSE' ? formatINR(t.amount) : '—'}</TableCell>
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
                          <p className={`text-2xl font-bold ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatINR(account.balance)}</p>
                        </div>
                        <div className="flex gap-4 pt-1 border-t">
                          <div>
                            <p className="text-xs text-muted-foreground">Credits</p>
                            <p className="text-sm font-medium text-green-600">{formatINR(credits)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Debits</p>
                            <p className="text-sm font-medium text-red-600">{formatINR(debits)}</p>
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
