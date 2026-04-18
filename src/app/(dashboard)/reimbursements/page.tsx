'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import {
  CheckCircle2,
  CreditCard,
  Download,
  FileWarning,
  Receipt,
  ShieldCheck,
  WalletCards,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { SubmitReimbursementDialog } from '@/components/reimbursements/submit-reimbursement-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { cn, formatEnum } from '@/lib/utils'

type ReimbursementStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED'

type ReimbursementItem = {
  id: string
  date: number
  amount: number
  category: string
  description: string
  status: ReimbursementStatus
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

const statuses: Array<ReimbursementStatus | 'ALL'> = ['ALL', 'PENDING', 'APPROVED', 'PAID', 'REJECTED']

const statusMeta: Record<ReimbursementStatus, {
  label: string
  badge: string
  dot: string
}> = {
  PENDING: {
    label: 'Pending',
    badge: 'border-amber-300/70 bg-amber-50 text-amber-800',
    dot: 'bg-amber-500',
  },
  APPROVED: {
    label: 'Approved',
    badge: 'border-cyan-300/70 bg-cyan-50 text-cyan-800',
    dot: 'bg-cyan-500',
  },
  PAID: {
    label: 'Paid',
    badge: 'border-emerald-300/70 bg-emerald-50 text-emerald-800',
    dot: 'bg-emerald-500',
  },
  REJECTED: {
    label: 'Rejected',
    badge: 'border-rose-300/70 bg-rose-50 text-rose-800',
    dot: 'bg-rose-500',
  },
}

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(value: number) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function exportCSV(items: ReimbursementItem[]) {
  const headers = ['Date', 'Team Member', 'Category', 'Description', 'Amount (INR)', 'Status']
  const rows = items.map((item) => [
    formatDate(item.date),
    item.teamMember?.fullName ?? item.submittedBy.name ?? '-',
    formatEnum(item.category),
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
  const [activeTab, setActiveTab] = useState<ReimbursementStatus | 'ALL'>('ALL')
  const itemsQuery = useQuery(api.reimbursements.list)
  const items = useMemo(() => (itemsQuery ?? []) as ReimbursementItem[], [itemsQuery])
  const updateStatus = useMutation(api.reimbursements.updateStatus)
  const [updating, setUpdating] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [payTarget, setPayTarget] = useState<ReimbursementItem | null>(null)

  const filtered = useMemo(
    () => activeTab === 'ALL' ? items : items.filter((item) => item.status === activeTab),
    [activeTab, items]
  )
  const pending = items.filter((item) => item.status === 'PENDING')
  const approved = items.filter((item) => item.status === 'APPROVED')
  const paid = items.filter((item) => item.status === 'PAID')
  const rejected = items.filter((item) => item.status === 'REJECTED')
  const pendingAmount = pending.reduce((sum, item) => sum + item.amount, 0)
  const approvedAmount = approved.reduce((sum, item) => sum + item.amount, 0)
  const paidAmount = paid.reduce((sum, item) => sum + item.amount, 0)
  const payoutExposure = pendingAmount + approvedAmount

  async function handleApprove(id: string) {
    setUpdating(id)
    try {
      await updateStatus({ id: id as Id<'reimbursements'>, status: 'APPROVED', approverId: 'ritish' })
      toast.success('Approved')
    } catch {
      toast.error('Failed to approve')
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
      toast.error('Failed to reject')
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
      toast.error('Failed to mark paid')
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-neutral-950/15 bg-neutral-950 text-white shadow-[0_30px_90px_-64px_rgba(0,0,0,0.92)]">
        <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/60">
              Payout desk
            </div>
            <div className="mt-5 space-y-3">
              <h1 className="text-3xl font-semibold tracking-normal text-white sm:text-4xl">
                Reimbursements
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
                Review claims, approve expenses, and keep payout details ready for finance closeout.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row xl:justify-end [&_[data-slot=button]]:rounded-lg [&_[data-slot=button]]:border-white/15 [&_[data-slot=button]]:bg-white/10 [&_[data-slot=button]]:text-white [&_[data-slot=button]]:shadow-none [&_[data-slot=button]:hover]:bg-white/20">
            <Button size="sm" variant="outline" onClick={() => exportCSV(filtered)}>
              <Download className="mr-1.5 h-4 w-4" /> Export CSV
            </Button>
            <SubmitReimbursementDialog />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:col-span-2 xl:grid-cols-4">
            <HeroMetric label="Pending payout" value={formatINR(payoutExposure)} detail={`${pending.length + approved.length} claims open`} />
            <HeroMetric label="Pending review" value={pending.length} detail={formatINR(pendingAmount)} />
            <HeroMetric label="Approved" value={approved.length} detail={formatINR(approvedAmount)} />
            <HeroMetric label="Paid" value={paid.length} detail={formatINR(paidAmount)} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Review queue" value={pending.length} detail={formatINR(pendingAmount)} icon={FileWarning} tone="warning" />
        <SummaryCard label="Ready to pay" value={approved.length} detail={formatINR(approvedAmount)} icon={CreditCard} />
        <SummaryCard label="Paid out" value={paid.length} detail={formatINR(paidAmount)} icon={ShieldCheck} tone="success" />
        <SummaryCard label="Rejected" value={rejected.length} detail="Closed without payout" icon={XCircle} tone="danger" />
      </section>

      <section className="rounded-lg border border-border/80 bg-white/90 p-3 shadow-[0_22px_70px_-58px_rgba(0,0,0,0.72)] backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ReimbursementStatus | 'ALL')}>
            <TabsList className="h-auto flex-wrap justify-start rounded-lg">
              {statuses.map((status) => (
                <TabsTrigger key={status} value={status} className="gap-2">
                  {status !== 'ALL' && <span className={cn('h-2 w-2 rounded-full', statusMeta[status].dot)} />}
                  {status === 'ALL' ? 'All' : statusMeta[status].label}
                  <span className="text-muted-foreground">
                    {status === 'ALL' ? items.length : items.filter((item) => item.status === status).length}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="flex h-10 items-center gap-2 rounded-lg border border-border/80 bg-muted/35 px-3 text-xs text-muted-foreground">
            <WalletCards className="h-4 w-4" />
            {filtered.length} visible claims
          </div>
        </div>
      </section>

      <Card className="overflow-hidden rounded-lg border-border/80 bg-white shadow-[0_24px_80px_-64px_rgba(0,0,0,0.72)]">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/45 hover:bg-muted/45">
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
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-14 text-center text-muted-foreground">No reimbursements in this view</TableCell>
              </TableRow>
            )}
            {filtered.map((item) => (
              <TableRow key={item.id} className="hover:bg-muted/35">
                <TableCell className="text-sm">{formatDate(item.date)}</TableCell>
                <TableCell className="text-sm font-medium">{item.teamMember?.fullName ?? item.submittedBy.name ?? '-'}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="rounded-md text-xs">{formatEnum(item.category)}</Badge>
                </TableCell>
                <TableCell className="max-w-[260px] text-sm">
                  <p className="truncate font-medium text-foreground">{item.description}</p>
                  {item.status === 'REJECTED' && item.rejectionNote && (
                    <p className="mt-0.5 truncate text-xs text-destructive">Note: {item.rejectionNote}</p>
                  )}
                </TableCell>
                <TableCell className="text-right text-sm font-semibold">{formatINR(item.amount)}</TableCell>
                <TableCell>
                  {item.receiptUrl ? (
                    <a href={item.receiptUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg">
                        <Receipt className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={cn('rounded-md border text-xs', statusMeta[item.status].badge)}>{statusMeta[item.status].label}</Badge>
                </TableCell>
                <TableCell>
                  {item.status === 'PENDING' && (
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-lg text-emerald-600 hover:text-emerald-700"
                        disabled={updating === item.id}
                        onClick={() => handleApprove(item.id)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-lg text-rose-600 hover:text-rose-700"
                        disabled={updating === item.id}
                        onClick={() => { setRejectTarget(item.id); setRejectNote('') }}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {item.status === 'APPROVED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg text-xs"
                      disabled={updating === item.id}
                      onClick={() => setPayTarget(item)}
                    >
                      <CreditCard className="mr-1 h-3 w-3" /> Pay
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!rejectTarget} onOpenChange={(value) => !value && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Reject Reimbursement</DialogTitle></DialogHeader>
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
              <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject} disabled={!!updating}>
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!payTarget} onOpenChange={(value) => !value && setPayTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Mark as Paid</DialogTitle></DialogHeader>
          {payTarget && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border/80 bg-muted/35 p-4">
                <p className="text-sm font-semibold">{payTarget.teamMember?.fullName ?? payTarget.submittedBy.name}</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-700">{formatINR(payTarget.amount)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{payTarget.description}</p>
              </div>
              {payTarget.teamMember && (payTarget.teamMember.upiId || payTarget.teamMember.bankDetails || payTarget.teamMember.paymentMode) && (
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Payment Details</p>
                  <PaymentRow label="UPI ID" value={payTarget.teamMember.upiId} />
                  <PaymentRow label="Preferred Mode" value={payTarget.teamMember.paymentMode} />
                  {payTarget.teamMember.bankDetails && (
                    <div>
                      <span className="text-xs text-muted-foreground">Bank Details</span>
                      <p className="mt-1 whitespace-pre-wrap text-sm font-medium">{payTarget.teamMember.bankDetails}</p>
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPayTarget(null)}>Cancel</Button>
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

function HeroMetric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/10 p-4 backdrop-blur">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-3 truncate text-3xl font-semibold tracking-normal text-white">{value}</p>
      <p className="mt-2 truncate text-xs text-white/50">{detail}</p>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string
  value: string | number
  detail: string
  icon: typeof FileWarning
  tone?: 'neutral' | 'warning' | 'success' | 'danger'
}) {
  const iconClass = {
    neutral: 'border-border/70 bg-white text-foreground',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    danger: 'border-rose-200 bg-rose-50 text-rose-800',
  }[tone]

  return (
    <div className="rounded-lg border border-border/80 bg-white/90 p-4 shadow-[0_20px_60px_-48px_rgba(0,0,0,0.65)] backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-normal text-foreground">{value}</p>
        </div>
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-lg border', iconClass)}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

function PaymentRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null

  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}
