'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AddLeadDialog } from '@/components/leads/add-lead-dialog'
import { Calendar, AlertCircle, Link2 } from 'lucide-react'
import { toast } from 'sonner'

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

const stageOrder = ['NEW_LEAD', 'CONTACTED', 'DISCOVERY', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST']
const stageColors: Record<string, string> = {
  NEW_LEAD: 'bg-muted text-muted-foreground',
  CONTACTED: 'bg-primary/15 text-primary',
  DISCOVERY: 'bg-violet-500/15 text-violet-500',
  PROPOSAL_SENT: 'bg-amber-500/15 text-amber-500',
  NEGOTIATION: 'bg-orange-500/15 text-orange-500',
  WON: 'bg-emerald-500/15 text-emerald-500',
  LOST: 'bg-destructive/15 text-destructive',
}

const sourceColors: Record<string, string> = {
  INSTAGRAM: 'bg-pink-500/15 text-pink-500',
  REFERRAL: 'bg-emerald-500/15 text-emerald-500',
  LINKEDIN: 'bg-primary/15 text-primary',
  COLD_EMAIL: 'bg-amber-500/15 text-amber-500',
  EVENT: 'bg-violet-500/15 text-violet-500',
  WEBSITE: 'bg-cyan-100 text-cyan-700',
  OTHER: 'bg-muted text-muted-foreground',
}

const now = Date.now()

function isOverdue(followUpDate?: number | null) {
  return followUpDate && followUpDate < now
}

export default function LeadsPage() {
  const router = useRouter()
  const leads = useQuery(api.leads.list) ?? []
  const overdueCount = leads.filter(l => !['WON', 'LOST'].includes(l.stage) && isOverdue(l.followUpDate)).length

  const pipelineValue = leads.filter((l) => !['WON', 'LOST'].includes(l.stage)).reduce((s, l) => s + (l.estimatedValue ?? 0), 0)
  const wonLeads = leads.filter((l) => l.stage === 'WON').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const url = `${window.location.origin}/capture`
              navigator.clipboard.writeText(url)
              toast.success('Capture form link copied!')
            }}
          >
            <Link2 className="h-4 w-4 mr-1.5" /> Copy Capture Link
          </Button>
          <AddLeadDialog />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Leads', value: leads.length },
          { label: 'Won', value: wonLeads },
          { label: 'Lost', value: leads.filter(l => l.stage === 'LOST').length },
          { label: 'Pipeline Value', value: formatINR(pipelineValue) },
          { label: 'Follow-up Overdue', value: overdueCount, highlight: overdueCount > 0 },
        ].map(({ label, value, highlight }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-xl font-bold mt-0.5 ${highlight ? 'text-destructive' : ''}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          <div className="grid grid-cols-7 gap-2 overflow-x-auto min-w-0">
            {stageOrder.map((stage) => {
              const stageLeads = leads.filter((l) => l.stage === stage)
              return (
                <div key={stage} className="min-w-[160px]">
                  <div className="mb-2">
                    <Badge className={`text-[10px] border-0 ${stageColors[stage]}`}>{stage.replace('_', ' ')}</Badge>
                    <span className="text-xs text-muted-foreground ml-1">({stageLeads.length})</span>
                  </div>
                  <div className="space-y-2">
                    {stageLeads.map((lead) => (
                      <Card key={lead.id} className="cursor-pointer hover:border-primary/40 shadow-none" onClick={() => router.push(`/leads/${lead.id}`)}>
                        <CardContent className="p-3">
                          <p className="text-xs font-medium leading-tight">{lead.name}</p>
                          {lead.company && <p className="text-[10px] text-muted-foreground">{lead.company}</p>}
                          {lead.estimatedValue && <p className="text-[10px] font-semibold text-emerald-500 mt-1">{formatINR(lead.estimatedValue)}</p>}
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge className={`text-[10px] border-0 ${sourceColors[lead.source]}`}>{lead.source.replace('_', ' ')}</Badge>
                          </div>
                          {lead.followUpDate && (
                            <div className="flex items-center gap-1 mt-1">
                              {isOverdue(lead.followUpDate) && !['WON', 'LOST'].includes(lead.stage) ? (
                                <AlertCircle className="h-3 w-3 text-destructive" />
                              ) : (
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                              )}
                              <span className={`text-[10px] ${isOverdue(lead.followUpDate) && !['WON', 'LOST'].includes(lead.stage) ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                                {new Date(lead.followUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    {stageLeads.length === 0 && (
                      <div className="border-2 border-dashed rounded-lg p-3 text-center text-[10px] text-muted-foreground">Empty</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Est. Value</TableHead>
                  <TableHead>Follow-up</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No leads yet</TableCell></TableRow>
                )}
                {leads.map((lead) => (
                  <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/leads/${lead.id}`)}>
                    <TableCell className="font-medium text-sm">{lead.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{lead.company ?? '—'}</TableCell>
                    <TableCell><Badge className={`text-xs border-0 ${stageColors[lead.stage]}`}>{lead.stage.replace('_', ' ')}</Badge></TableCell>
                    <TableCell><Badge className={`text-xs border-0 ${sourceColors[lead.source]}`}>{lead.source.replace('_', ' ')}</Badge></TableCell>
                    <TableCell className="text-sm">{lead.estimatedValue ? formatINR(lead.estimatedValue) : '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString('en-IN') : '—'}
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
