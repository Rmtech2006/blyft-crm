'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { ExportMenu } from '@/components/shared/export-menu'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AddLeadDialog } from '@/components/leads/add-lead-dialog'
import { Calendar, AlertCircle, Link2, Search, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { exportCsv, printReport } from '@/lib/export'
import { formatEnum } from '@/lib/utils'
import { LEAD_STAGES, STAGE_COLORS, TERMINAL_STAGES } from '@/lib/leads'

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

const stageOrder = LEAD_STAGES
const stageColors: Record<string, string> = STAGE_COLORS

const sourceColors: Record<string, string> = {
  INSTAGRAM: 'bg-pink-500/15 text-pink-500',
  REFERRAL: 'bg-emerald-500/15 text-emerald-500',
  LINKEDIN: 'bg-primary/15 text-primary',
  COLD_EMAIL: 'bg-amber-500/15 text-amber-500',
  EVENT: 'bg-violet-500/15 text-violet-500',
  WEBSITE: 'bg-cyan-100 text-cyan-700',
  OTHER: 'bg-muted text-muted-foreground',
}

function isOverdue(followUpDate?: number | null) {
  return followUpDate && followUpDate < Date.now()
}

function LeadsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-3 w-20 mb-2" /><Skeleton className="h-6 w-12" /></CardContent></Card>
        ))}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="min-w-[240px] flex-shrink-0 space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LeadsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const leads = useQuery(api.leads.list)

  if (leads === undefined) return <LeadsSkeleton />

  const isTerminal = (s: string) => (TERMINAL_STAGES as string[]).includes(s)
  const overdueCount = leads.filter(l => !isTerminal(l.stage) && isOverdue(l.followUpDate)).length
  const pipelineValue = leads.filter((l) => !isTerminal(l.stage)).reduce((s, l) => s + (l.estimatedValue ?? 0), 0)
  const wonLeads = leads.filter((l) => l.stage === 'PROPOSAL_ACCEPTED').length
  const filteredLeads = leads.filter((lead) =>
    !search ||
    lead.name.toLowerCase().includes(search.toLowerCase()) ||
    (lead.company ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (lead.contactName ?? '').toLowerCase().includes(search.toLowerCase()) ||
    lead.stage.toLowerCase().includes(search.toLowerCase())
  )

  function handleCsvExport() {
    exportCsv('leads-export.csv', filteredLeads, [
      { header: 'Lead', value: (lead) => lead.name },
      { header: 'Company', value: (lead) => lead.company ?? '—' },
      { header: 'Stage', value: (lead) => lead.stage },
      { header: 'Source', value: (lead) => lead.source },
      { header: 'Estimated value', value: (lead) => lead.estimatedValue ?? 0 },
      {
        header: 'Follow-up',
        value: (lead) => (lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString('en-IN') : '—'),
      },
    ])
  }

  function handlePdfExport() {
    printReport({
      title: 'BLYFT Leads Report',
      subtitle: `Generated on ${new Date().toLocaleDateString('en-IN')}`,
      sections: [
        {
          title: 'Lead summary',
          columns: ['Metric', 'Value'],
          rows: [
            ['Total leads', leads.length],
            ['Accepted', wonLeads],
            ['Lost', leads.filter((lead) => lead.stage === 'LOST').length],
            ['Pipeline value', formatINR(pipelineValue)],
            ['Filtered leads', filteredLeads.length],
          ],
        },
        {
          title: 'Lead list',
          columns: ['Lead', 'Company', 'Stage', 'Source', 'Value', 'Follow-up'],
          rows: filteredLeads.map((lead) => [
            lead.name,
            lead.company ?? '—',
            formatEnum(lead.stage),
            formatEnum(lead.source),
            lead.estimatedValue ? formatINR(lead.estimatedValue) : '—',
            lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString('en-IN') : '—',
          ]),
        },
      ],
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
        <div className="flex gap-2">
          <ExportMenu onCsv={handleCsvExport} onPdf={handlePdfExport} />
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
          { label: 'Accepted', value: wonLeads },
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

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search leads, company, stage…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-8"
        />
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          {leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl">
              <TrendingUp className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No leads yet</p>
              <p className="text-xs text-muted-foreground/60 mb-4">Add your first lead to start tracking your pipeline</p>
              <AddLeadDialog />
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl">
              <TrendingUp className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No leads match your search</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1">
              {stageOrder.map((stage) => {
                const stageLeads = filteredLeads.filter((l) => l.stage === stage)
                return (
                  <div key={stage} className="min-w-[240px] flex-shrink-0">
                    <div className="flex items-center gap-2 mb-2.5">
                      <Badge className={`text-xs border-0 ${stageColors[stage]}`}>{formatEnum(stage)}</Badge>
                      <span className="text-xs text-muted-foreground font-medium">{stageLeads.length}</span>
                    </div>
                    <div className="space-y-2">
                      {stageLeads.map((lead) => (
                        <Card
                          key={lead.id}
                          className="cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all shadow-none"
                          onClick={() => router.push(`/leads/${lead.id}`)}
                        >
                          <CardContent className="p-3">
                            <p className="text-sm font-medium leading-tight">{lead.name}</p>
                            {lead.company && <p className="text-xs text-muted-foreground mt-0.5">{lead.company}</p>}
                            {lead.estimatedValue && (
                              <p className="text-xs font-semibold text-emerald-500 mt-1.5">{formatINR(lead.estimatedValue)}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge className={`text-[10px] border-0 ${sourceColors[lead.source]}`}>{formatEnum(lead.source)}</Badge>
                            </div>
                            {lead.followUpDate && (
                              <div className="flex items-center gap-1 mt-1.5">
                                {isOverdue(lead.followUpDate) && !(TERMINAL_STAGES as string[]).includes(lead.stage) ? (
                                  <AlertCircle className="h-3 w-3 text-destructive" />
                                ) : (
                                  <Calendar className="h-3 w-3 text-muted-foreground" />
                                )}
                                <span className={`text-xs ${isOverdue(lead.followUpDate) && !(TERMINAL_STAGES as string[]).includes(lead.stage) ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                                  {new Date(lead.followUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      {stageLeads.length === 0 && (
                        <div className="border-2 border-dashed rounded-lg p-4 text-center text-xs text-muted-foreground/60">
                          No leads
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="list">
          {leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl">
              <TrendingUp className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No leads yet</p>
              <p className="text-xs text-muted-foreground/60 mb-4">Start tracking prospects and close more deals</p>
              <AddLeadDialog />
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl">
              <TrendingUp className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No leads match your search</p>
            </div>
          ) : (
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
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/leads/${lead.id}`)}>
                      <TableCell className="font-medium text-sm">{lead.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{lead.company ?? '—'}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs border-0 ${stageColors[lead.stage]}`}>{formatEnum(lead.stage)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs border-0 ${sourceColors[lead.source]}`}>{formatEnum(lead.source)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{lead.estimatedValue ? formatINR(lead.estimatedValue) : '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString('en-IN') : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
