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
import { SubmitReimbursementDialog } from '@/components/reimbursements/submit-reimbursement-dialog'
import { toast } from 'sonner'
import { CheckCircle, XCircle } from 'lucide-react'

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}

export default function ReimbursementsPage() {
  const [activeTab, setActiveTab] = useState('ALL')
  const items = useQuery(api.reimbursements.list) ?? []
  const updateStatus = useMutation(api.reimbursements.updateStatus)
  const [updating, setUpdating] = useState<string | null>(null)

  const filtered = activeTab === 'ALL' ? items : items.filter((i) => i.status === activeTab)

  const pending = items.filter((i) => i.status === 'PENDING')
  const approved = items.filter((i) => i.status === 'APPROVED')
  const paid = items.filter((i) => i.status === 'PAID')

  async function handleUpdateStatus(id: string, status: string, rejectionNote?: string) {
    setUpdating(id)
    try {
      await updateStatus({
        id: id as Id<'reimbursements'>,
        status: status as Parameters<typeof updateStatus>[0]['status'],
        rejectionNote,
      })
      toast.success(`Marked as ${status.toLowerCase()}`)
    } catch {
      toast.error('Failed to update')
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reimbursements</h1>
        <SubmitReimbursementDialog />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending', value: pending.length, amount: pending.reduce((s, i) => s + i.amount, 0), color: 'text-yellow-600' },
          { label: 'Approved', value: approved.length, amount: approved.reduce((s, i) => s + i.amount, 0), color: 'text-blue-600' },
          { label: 'Paid', value: paid.length, amount: paid.reduce((s, i) => s + i.amount, 0), color: 'text-green-600' },
          { label: 'Rejected', value: items.filter(i => i.status === 'REJECTED').length, amount: 0, color: 'text-red-600' },
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
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No reimbursements</TableCell>
                  </TableRow>
                )}
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm">{new Date(item.date).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell className="text-sm">{item.teamMember?.fullName ?? item.submittedBy.name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{item.category.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{item.description}</TableCell>
                    <TableCell className="text-right font-semibold text-sm">{formatINR(item.amount)}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs border-0 ${statusColors[item.status]}`}>{item.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {item.status === 'PENDING' && (
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-green-500 hover:text-green-600"
                            disabled={updating === item.id}
                            onClick={() => handleUpdateStatus(item.id, 'APPROVED')}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-500 hover:text-red-600"
                            disabled={updating === item.id}
                            onClick={() => handleUpdateStatus(item.id, 'REJECTED')}
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
                          onClick={() => handleUpdateStatus(item.id, 'PAID')}
                        >
                          Mark Paid
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
    </div>
  )
}
