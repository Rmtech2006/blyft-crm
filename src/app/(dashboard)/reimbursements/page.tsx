'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { SubmitReimbursementDialog } from '@/components/reimbursements/submit-reimbursement-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertTriangle,
  CheckCircle,
  CreditCard,
  Download,
  Receipt,
  Search,
  Wallet,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function daysOld(timestamp: number) {
  return Math.floor((Date.now() - timestamp) / 86400000)
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-500',
  APPROVED: 'bg-primary/15 text-primary',
  PAID: 'bg-emerald-500/15 text-emerald-500',
  REJECTED: 'bg-destructive/15 text-destructive',
}

type ReimbursementItem = {
  id: string
  date: number
  amount: number
  category: string
  description: string
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED'
  receiptUrl?: string
  rejectionNote?: string
  teamMember?: {
    id: string
    fullName: string
    upiId?: string
    bankDetails?: string
    paymentMode?: string
  } | null
  submittedBy: { id: string; name: string }
}

function getReimbursementWorkflow(item: ReimbursementItem) {
  const age = daysOld(item.date)

  if (item.status === 'PENDING' && age >= 5) {
    return {
      rank: 0,
      title: 'Pending too long',
      helper: `This request is ${age}d old and still waiting for approval.`,
      tone: 'danger',
    }
  }

  if (item.status === 'APPROVED') {
    return {
      rank: 1,
      title: 'Ready for payout',
      helper: 'Approval is done. The next action is to complete payment and close the request.',
      tone: 'warning',
    }
  }

  if (item.status === 'REJECTED') {
    return {
      rank: 2,
      title: 'Closed with rejection',
      helper: 'Make sure the submitter understands the reason so this request does not come back unclear.',
      tone: 'warning',
    }
  }

  return {
    rank: 3,
    title: 'Request is moving normally',
    helper: 'No escalation signal is visible on this reimbursement right now.',
    tone: 'success',
  }
}

function exportCSV(items: ReimbursementItem[]) {
  const headers = ['Date', 'Team Member', 'Category', 'Description', 'Amount (INR)', 'Status']
  const rows = items.map((item) => [
    new Date(item.date).toLocaleDateString('en-IN'),
    item.teamMember?.fullName ?? item.submittedBy.name ?? '',
    item.category.replaceAll('_', ' '),
    `"${item.description.replace(/"/g, '""')}"`,
    item.amount,
    item.status,
  ])
  const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `reimbursements-${new Date().toISOString().slice(0, 7)}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function ReimbursementsPage() {
  const [activeTab, setActiveTab] = useState('ALL')
  const [search, setSearch] = useState('')
  const itemsQuery = useQuery(api.reimbursements.list)
  const items = useMemo(() => ((itemsQuery ?? []) as ReimbursementItem[]), [itemsQuery])
  const updateStatus = useMutation(api.reimbursements.updateStatus)
  const [updating, setUpdating] = useState<string | null>(null)

  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')

  const [payTarget, setPayTarget] = useState<ReimbursementItem | null>(null)

  const pending = items.filter((item) => item.status === 'PENDING')
  const approved = items.filter((item) => item.status === 'APPROVED')
  const paid = items.filter((item) => item.status === 'PAID')
  const rejected = items.filter((item) => item.status === 'REJECTED')
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()

    return items
      .filter((item) => {
        const matchTab = activeTab === 'ALL' || item.status === activeTab
        const matchSearch =
          !query ||
          item.description.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query) ||
          (item.teamMember?.fullName ?? '').toLowerCase().includes(query) ||
          item.submittedBy.name.toLowerCase().includes(query)

        return matchTab && matchSearch
      })
      .sort((left, right) => {
        const leftPriority = getReimbursementWorkflow(left).rank
        const rightPriority = getReimbursementWorkflow(right).rank

        if (leftPriority !== rightPriority) return leftPriority - rightPriority
        return right.date - left.date
      })
  }, [activeTab, items, search])

  const pendingAmount = pending.reduce((sum, item) => sum + item.amount, 0)
  const approvedAmount = approved.reduce((sum, item) => sum + item.amount, 0)
  const paidAmount = paid.reduce((sum, item) => sum + item.amount, 0)
  const oldestPendingDays =
    pending.length > 0 ? Math.max(...pending.map((item) => daysOld(item.date))) : 0

  async function handleApprove(id: string) {
    setUpdating(id)
    try {
      await updateStatus({ id: id as Id<'reimbursements'>, status: 'APPROVED', approverId: 'ritish' })
      toast.success('Approved')
    } catch {
      toast.error('Failed')
    } finally {
      setUpdating(null)
    }
  }

  async function handleReject() {
    if (!rejectTarget) return
    setUpdating(rejectTarget)
    try {
      await updateStatus({
        id: rejectTarget as Id<'reimbursements'>,
        status: 'REJECTED',
        rejectionNote: rejectNote || undefined,
      })
      toast.success('Rejected')
      setRejectTarget(null)
      setRejectNote('')
    } catch {
      toast.error('Failed')
    } finally {
      setUpdating(null)
    }
  }

  async function handleMarkPaid(id: string) {
    setUpdating(id)
    try {
      await updateStatus({ id: id as Id<'reimbursements'>, status: 'PAID' })
      toast.success('Marked as paid')
      setPayTarget(null)
    } catch {
      toast.error('Failed')
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-eyebrow">Approval workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Reimbursements</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
            Keep expense approvals, payout queues, and rejected claims visible so finance does not slow down the team.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportCSV(filteredItems)}>
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
          <SubmitReimbursementDialog />
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.95fr))]">
        <Card className="surface-card">
          <CardContent className="space-y-5 p-6">
            <div>
              <p className="section-eyebrow">Approval desk</p>
              <p className="mt-2 text-[1.9rem] font-semibold tracking-tight">
                Reimbursements should move in one clean line: review, pay, close.
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                Start with stale pending requests, then finish approved payouts before they turn into avoidable finance backlog.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="surface-muted p-4">
                <p className="section-eyebrow">Approval pressure</p>
                <p className="mt-3 text-2xl font-semibold tracking-tight">
                  {pending.length + approved.length}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Requests still waiting on either approval or payout completion.
                </p>
              </div>

              <div className="surface-muted p-4">
                <p className="section-eyebrow">Oldest pending</p>
                <p className="mt-3 text-2xl font-semibold tracking-tight">
                  {pending.length > 0 ? `${oldestPendingDays}d` : 'Clear'}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  The age of the oldest request still waiting for an approval decision.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {[
          {
            label: 'Pending approvals',
            value: formatINR(pendingAmount),
            helper: `${pending.length} request${pending.length === 1 ? '' : 's'} still waiting for review.`,
            icon: AlertTriangle,
            tone:
              pending.length > 0
                ? 'border-destructive/25 bg-destructive/5 text-destructive'
                : 'border-border/80 bg-card/80 text-foreground',
          },
          {
            label: 'Ready to pay',
            value: formatINR(approvedAmount),
            helper: `${approved.length} approved request${approved.length === 1 ? '' : 's'} sitting in the payout queue.`,
            icon: CreditCard,
            tone:
              approved.length > 0
                ? 'border-amber-300/80 bg-amber-50 text-amber-700'
                : 'border-border/80 bg-card/80 text-foreground',
          },
          {
            label: 'Paid this cycle',
            value: formatINR(paidAmount),
            helper: `${paid.length} request${paid.length === 1 ? '' : 's'} already closed as paid.`,
            icon: Wallet,
            tone:
              paid.length > 0
                ? 'border-emerald-300/80 bg-emerald-50 text-emerald-700'
                : 'border-border/80 bg-card/80 text-foreground',
          },
        ].map((item) => {
          const Icon = item.icon

          return (
            <Card key={item.label} className="surface-card">
              <CardContent className="space-y-4 p-5">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${item.tone}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="section-eyebrow">{item.label}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight">{item.value}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.helper}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Pending', value: pending.length, color: 'text-amber-600' },
          { label: 'Approved', value: approved.length, color: 'text-primary' },
          { label: 'Paid', value: paid.length, color: 'text-emerald-500' },
          { label: 'Rejected', value: rejected.length, color: 'text-destructive' },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search member, category, or description..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-8"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Showing {filteredItems.length} of {items.length} reimbursements
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="ALL">All ({items.length})</TabsTrigger>
          <TabsTrigger value="PENDING">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved ({approved.length})</TabsTrigger>
          <TabsTrigger value="PAID">Paid ({paid.length})</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected ({rejected.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Team Member</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      No reimbursements match this view
                    </TableCell>
                  </TableRow>
                )}
                {filteredItems.map((item) => {
                  const workflow = getReimbursementWorkflow(item)

                  return (
                    <TableRow key={item.id} className={workflow.rank <= 1 ? 'bg-amber-50/40' : ''}>
                      <TableCell className="text-sm">
                        {new Date(item.date).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.teamMember?.fullName ?? item.submittedBy.name ?? 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.category.replaceAll('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[220px] text-sm">
                        <p className="truncate">{item.description}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{workflow.title}</p>
                        {item.status === 'REJECTED' && item.rejectionNote && (
                          <p className="mt-0.5 truncate text-xs text-destructive">
                            Note: {item.rejectionNote}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold">
                        {formatINR(item.amount)}
                      </TableCell>
                      <TableCell>
                        {item.receiptUrl ? (
                          <a href={item.receiptUrl} target="_blank" rel="noopener noreferrer">
                            <Button size="icon" variant="ghost" className="h-7 w-7">
                              <Receipt className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`border-0 text-xs ${statusColors[item.status]}`}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.status === 'PENDING' && (
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-green-500 hover:text-emerald-500"
                              disabled={updating === item.id}
                              onClick={() => handleApprove(item.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-red-500 hover:text-destructive"
                              disabled={updating === item.id}
                              onClick={() => {
                                setRejectTarget(item.id)
                                setRejectNote('')
                              }}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {item.status === 'APPROVED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={updating === item.id}
                            onClick={() => setPayTarget(item)}
                          >
                            <CreditCard className="mr-1 h-3 w-3" /> Pay
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Reimbursement</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Reason (optional)</Label>
              <Textarea
                rows={3}
                placeholder="Add a rejection reason..."
                value={rejectNote}
                onChange={(event) => setRejectNote(event.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectTarget(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={!!updating}>
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!payTarget} onOpenChange={(open) => !open && setPayTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark as Paid</DialogTitle>
          </DialogHeader>
          {payTarget && (
            <div className="space-y-4">
              <div className="space-y-2 rounded-lg bg-muted p-3">
                <p className="text-sm font-medium">
                  {payTarget.teamMember?.fullName ?? payTarget.submittedBy.name}
                </p>
                <p className="text-lg font-bold text-emerald-500">{formatINR(payTarget.amount)}</p>
                <p className="text-xs text-muted-foreground">{payTarget.description}</p>
              </div>
              {payTarget.teamMember && (payTarget.teamMember.upiId || payTarget.teamMember.bankDetails) && (
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Payment Details
                  </p>
                  {payTarget.teamMember.upiId && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">UPI ID</span>
                      <span className="font-mono text-sm font-medium">{payTarget.teamMember.upiId}</span>
                    </div>
                  )}
                  {payTarget.teamMember.bankDetails && (
                    <div>
                      <span className="text-xs text-muted-foreground">Bank Details</span>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm">{payTarget.teamMember.bankDetails}</p>
                    </div>
                  )}
                  {payTarget.teamMember.paymentMode && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Preferred Mode</span>
                      <span className="text-sm">{payTarget.teamMember.paymentMode}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPayTarget(null)}>
                  Cancel
                </Button>
                <Button onClick={() => handleMarkPaid(payTarget.id)} disabled={!!updating}>
                  Confirm Paid
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
