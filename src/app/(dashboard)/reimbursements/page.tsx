'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { SubmitReimbursementDialog } from '@/components/reimbursements/submit-reimbursement-dialog'
import { toast } from 'sonner'
import { CheckCircle, XCircle, Download, Receipt, CreditCard } from 'lucide-react'

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
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
  status: string
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

function exportCSV(items: ReimbursementItem[]) {
  const headers = ['Date', 'Team Member', 'Category', 'Description', 'Amount (₹)', 'Status']
  const rows = items.map((i) => [
    new Date(i.date).toLocaleDateString('en-IN'),
    i.teamMember?.fullName ?? i.submittedBy.name ?? '',
    i.category.replace('_', ' '),
    `"${i.description.replace(/"/g, '""')}"`,
    i.amount,
    i.status,
  ])
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `reimbursements-${new Date().toISOString().slice(0, 7)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReimbursementsPage() {
  const [activeTab, setActiveTab] = useState('ALL')
  const items = (useQuery(api.reimbursements.list) ?? []) as ReimbursementItem[]
  const updateStatus = useMutation(api.reimbursements.updateStatus)
  const [updating, setUpdating] = useState<string | null>(null)

  // Rejection dialog state
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')

  // Pay dialog state
  const [payTarget, setPayTarget] = useState<ReimbursementItem | null>(null)

  const filtered = activeTab === 'ALL' ? items : items.filter((i) => i.status === activeTab)
  const pending = items.filter((i) => i.status === 'PENDING')
  const approved = items.filter((i) => i.status === 'APPROVED')
  const paid = items.filter((i) => i.status === 'PAID')

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Reimbursements</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportCSV(filtered)}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
          <SubmitReimbursementDialog />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending', value: pending.length, amount: pending.reduce((s, i) => s + i.amount, 0), color: 'text-yellow-600' },
          { label: 'Approved', value: approved.length, amount: approved.reduce((s, i) => s + i.amount, 0), color: 'text-primary' },
          { label: 'Paid', value: paid.length, amount: paid.reduce((s, i) => s + i.amount, 0), color: 'text-emerald-500' },
          { label: 'Rejected', value: items.filter(i => i.status === 'REJECTED').length, amount: 0, color: 'text-destructive' },
        ].map(({ label, value, amount, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              {amount > 0 && <p className="text-xs text-muted-foreground">{formatINR(amount)}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="ALL">All ({items.length})</TabsTrigger>
          <TabsTrigger value="PENDING">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="PAID">Paid</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
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
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No reimbursements</TableCell>
                  </TableRow>
                )}
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm">{new Date(item.date).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell className="text-sm">{item.teamMember?.fullName ?? item.submittedBy.name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{item.category.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-[180px]">
                      <p className="truncate">{item.description}</p>
                      {item.status === 'REJECTED' && item.rejectionNote && (
                        <p className="text-xs text-destructive mt-0.5 truncate">Note: {item.rejectionNote}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm">{formatINR(item.amount)}</TableCell>
                    <TableCell>
                      {item.receiptUrl ? (
                        <a href={item.receiptUrl} target="_blank" rel="noopener noreferrer">
                          <Button size="icon" variant="ghost" className="h-7 w-7">
                            <Receipt className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs border-0 ${statusColors[item.status]}`}>{item.status}</Badge>
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
                          className="h-7 text-xs"
                          disabled={updating === item.id}
                          onClick={() => setPayTarget(item)}
                        >
                          <CreditCard className="h-3 w-3 mr-1" /> Pay
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Rejection dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(v) => !v && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Reject Reimbursement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Reason (optional)</Label>
              <Textarea
                rows={3}
                placeholder="Add a rejection reason…"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
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

      {/* Pay dialog with UPI/bank details */}
      <Dialog open={!!payTarget} onOpenChange={(v) => !v && setPayTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Mark as Paid</DialogTitle></DialogHeader>
          {payTarget && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3 space-y-2">
                <p className="text-sm font-medium">{payTarget.teamMember?.fullName ?? payTarget.submittedBy.name}</p>
                <p className="text-lg font-bold text-emerald-500">{formatINR(payTarget.amount)}</p>
                <p className="text-xs text-muted-foreground">{payTarget.description}</p>
              </div>
              {payTarget.teamMember && (payTarget.teamMember.upiId || payTarget.teamMember.bankDetails) && (
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment Details</p>
                  {payTarget.teamMember.upiId && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">UPI ID</span>
                      <span className="text-sm font-mono font-medium">{payTarget.teamMember.upiId}</span>
                    </div>
                  )}
                  {payTarget.teamMember.bankDetails && (
                    <div>
                      <span className="text-xs text-muted-foreground">Bank Details</span>
                      <p className="text-sm mt-0.5 whitespace-pre-wrap">{payTarget.teamMember.bankDetails}</p>
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
