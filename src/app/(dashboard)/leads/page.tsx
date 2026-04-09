'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { ExportMenu } from '@/components/shared/export-menu'
import { AddLeadDialog } from '@/components/leads/add-lead-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Link2,
  Search,
  TrendingUp,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { exportCsv, printReport } from '@/lib/export'
import { formatEnum, cn } from '@/lib/utils'
import { LEAD_STAGES, STAGE_COLORS, TERMINAL_STAGES } from '@/lib/leads'

type LeadListItem = {
  id: string
  name: string
  company?: string
  contactName?: string
  email?: string
  source: 'INSTAGRAM' | 'REFERRAL' | 'LINKEDIN' | 'COLD_EMAIL' | 'EVENT' | 'WEBSITE' | 'OTHER'
  stage:
    | 'LEAD_CAPTURED'
    | 'QUALIFICATION_SUBMITTED'
    | 'STRATEGY_CALL'
    | 'PROPOSAL_SENT'
    | 'PROPOSAL_ACCEPTED'
    | 'NURTURE'
    | 'LOST'
  estimatedValue?: number
  followUpDate?: number
  owner?: { id: string; name: string } | null
}

type FocusFilter = 'ALL' | 'URGENT' | 'THIS_WEEK' | 'PROPOSAL' | 'HIGH_VALUE'

const stageOrder = LEAD_STAGES
const stageColors: Record<string, string> = STAGE_COLORS

const sourceColors: Record<LeadListItem['source'], string> = {
  INSTAGRAM: 'bg-pink-500/15 text-pink-500',
  REFERRAL: 'bg-emerald-500/15 text-emerald-500',
  LINKEDIN: 'bg-primary/15 text-primary',
  COLD_EMAIL: 'bg-amber-500/15 text-amber-500',
  EVENT: 'bg-violet-500/15 text-violet-500',
  WEBSITE: 'bg-cyan-100 text-cyan-700',
  OTHER: 'bg-muted text-muted-foreground',
}

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function isOverdue(followUpDate?: number | null) {
  return Boolean(followUpDate && followUpDate < Date.now())
}

function daysUntil(timestamp?: number) {
  if (!timestamp) return null
  return Math.ceil((timestamp - Date.now()) / 86400000)
}

function getFollowUpCopy(lead: LeadListItem) {
  const days = daysUntil(lead.followUpDate)

  if (days === null) return 'No follow-up set'
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `Due in ${days}d`
}

function getLeadWorkflow(lead: LeadListItem) {
  if (isOverdue(lead.followUpDate) && !TERMINAL_STAGES.includes(lead.stage)) {
    return {
      rank: 0,
      title: 'Follow-up overdue',
      helper: 'This lead has crossed its promised follow-up date and needs a same-day touchpoint.',
      tone: 'danger',
    }
  }

  if (!lead.owner && !TERMINAL_STAGES.includes(lead.stage)) {
    return {
      rank: 1,
      title: 'Assign an owner',
      helper: 'The opportunity is active but no one is clearly accountable for the next move.',
      tone: 'warning',
    }
  }

  if (lead.stage === 'PROPOSAL_SENT') {
    return {
      rank: 2,
      title: 'Proposal decision pending',
      helper: 'Follow up on objections, pricing, and commercial clarity before the lead cools down.',
      tone: 'warning',
    }
  }

  if (lead.stage === 'STRATEGY_CALL') {
    return {
      rank: 3,
      title: 'Run the strategy conversation',
      helper: 'Use the next conversation to sharpen need, urgency, budget, and service fit.',
      tone: 'warning',
    }
  }

  if (lead.stage === 'QUALIFICATION_SUBMITTED') {
    return {
      rank: 4,
      title: 'Review submitted qualification',
      helper: 'Turn qualification details into a clear sales plan and decide the next meeting.',
      tone: 'success',
    }
  }

  if (lead.stage === 'LEAD_CAPTURED') {
    return {
      rank: 5,
      title: 'Qualify this opportunity',
      helper: 'Confirm fit, service need, and urgency before it becomes pipeline noise.',
      tone: 'success',
    }
  }

  return {
    rank: 6,
    title: 'Keep the conversation warm',
    helper: 'This lead is stable in the current stage. Maintain momentum with the next clear touchpoint.',
    tone: 'success',
  }
}

function getWorkflowTone(tone: 'danger' | 'warning' | 'success') {
  if (tone === 'danger') {
    return 'border-destructive/25 bg-destructive/5'
  }

  if (tone === 'warning') {
    return 'border-amber-300/80 bg-amber-50/90'
  }

  return 'border-emerald-300/80 bg-emerald-50/90'
}

function LeadsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-8 w-20" />
              <Skeleton className="mt-3 h-3 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-5">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-2 h-4 w-24" />
              <Skeleton className="mt-4 h-28 w-full rounded-2xl" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function LeadsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [focusFilter, setFocusFilter] = useState<FocusFilter>('ALL')
  const leads = useQuery(api.leads.list)
  const typedLeads = useMemo(() => (leads ?? []) as LeadListItem[], [leads])

  const overdueCount = typedLeads.filter(
    (lead) => !TERMINAL_STAGES.includes(lead.stage) && isOverdue(lead.followUpDate)
  ).length
  const pipelineValue = typedLeads
    .filter((lead) => !TERMINAL_STAGES.includes(lead.stage))
    .reduce((sum, lead) => sum + (lead.estimatedValue ?? 0), 0)
  const proposalDesk = typedLeads.filter((lead) => lead.stage === 'PROPOSAL_SENT').length
  const strategyCalls = typedLeads.filter((lead) => lead.stage === 'STRATEGY_CALL').length
  const highValueCount = typedLeads.filter((lead) => (lead.estimatedValue ?? 0) >= 100000).length

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase()

    return typedLeads.filter((lead) => {
      const matchSearch =
        !query ||
        lead.name.toLowerCase().includes(query) ||
        (lead.company ?? '').toLowerCase().includes(query) ||
        (lead.contactName ?? '').toLowerCase().includes(query) ||
        lead.stage.toLowerCase().includes(query) ||
        (lead.owner?.name ?? '').toLowerCase().includes(query)

      if (!matchSearch) return false

      switch (focusFilter) {
        case 'URGENT':
          return !TERMINAL_STAGES.includes(lead.stage) && isOverdue(lead.followUpDate)
        case 'THIS_WEEK': {
          const days = daysUntil(lead.followUpDate)
          return days !== null && days >= 0 && days <= 7
        }
        case 'PROPOSAL':
          return lead.stage === 'PROPOSAL_SENT'
        case 'HIGH_VALUE':
          return (lead.estimatedValue ?? 0) >= 100000
        default:
          return true
      }
    })
  }, [focusFilter, search, typedLeads])

  const sortedLeads = useMemo(
    () =>
      [...filteredLeads].sort((left, right) => {
        const leftPriority = getLeadWorkflow(left).rank
        const rightPriority = getLeadWorkflow(right).rank

        if (leftPriority !== rightPriority) return leftPriority - rightPriority
        return (right.estimatedValue ?? 0) - (left.estimatedValue ?? 0)
      }),
    [filteredLeads]
  )

  if (leads === undefined) return <LeadsSkeleton />

  function handleCsvExport() {
    exportCsv('leads-export.csv', sortedLeads, [
      { header: 'Lead', value: (lead) => lead.name },
      { header: 'Company', value: (lead) => lead.company ?? 'N/A' },
      { header: 'Stage', value: (lead) => lead.stage },
      { header: 'Owner', value: (lead) => lead.owner?.name ?? 'Unassigned' },
      { header: 'Source', value: (lead) => lead.source },
      { header: 'Estimated value', value: (lead) => lead.estimatedValue ?? 0 },
      { header: 'Follow-up', value: (lead) => lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString('en-IN') : 'N/A' },
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
            ['Total leads', typedLeads.length],
            ['Needs follow-up now', overdueCount],
            ['Strategy calls', strategyCalls],
            ['Proposal desk', proposalDesk],
            ['High value opportunities', highValueCount],
            ['Pipeline value', formatINR(pipelineValue)],
          ],
        },
        {
          title: 'Lead list',
          columns: ['Lead', 'Stage', 'Owner', 'Next action', 'Value', 'Follow-up'],
          rows: sortedLeads.map((lead) => [
            lead.name,
            formatEnum(lead.stage),
            lead.owner?.name ?? 'Unassigned',
            getLeadWorkflow(lead).title,
            lead.estimatedValue ? formatINR(lead.estimatedValue) : 'N/A',
            lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString('en-IN') : 'N/A',
          ]),
        },
      ],
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-eyebrow">Pipeline</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Leads</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Prioritize follow-up, spot proposal risk, and move opportunities through a clearer selling workflow.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <ExportMenu onCsv={handleCsvExport} onPdf={handlePdfExport} />
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const url = `${window.location.origin}/capture`
              navigator.clipboard.writeText(url)
              toast.success('Capture form link copied')
            }}
          >
            <Link2 className="mr-1.5 h-4 w-4" /> Copy Capture Link
          </Button>
          <AddLeadDialog />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Needs action today',
            value: overdueCount,
            note: 'Leads with overdue follow-up that risk going cold.',
          },
          {
            label: 'Strategy calls live',
            value: strategyCalls,
            note: 'Conversations that need discovery and commercial direction.',
          },
          {
            label: 'Proposal desk',
            value: proposalDesk,
            note: 'Deals waiting on pricing follow-up, objection handling, or close support.',
          },
          {
            label: 'High value pipeline',
            value: formatINR(pipelineValue),
            note: `${highValueCount} opportunities at or above ₹1L estimated value.`,
          },
        ].map((card) => (
          <Card key={card.label} className="surface-card">
            <CardContent className="space-y-4 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                {card.label}
              </p>
              <p className="text-3xl font-semibold tracking-tight">{card.value}</p>
              <p className="text-sm leading-6 text-muted-foreground">{card.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="surface-card space-y-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search leads, company, stage, owner..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>

          <div className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{sortedLeads.length}</span> of{' '}
            <span className="font-medium text-foreground">{typedLeads.length}</span> leads
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'ALL', label: 'All pipeline', value: typedLeads.length },
            { id: 'URGENT', label: 'Overdue now', value: overdueCount },
            { id: 'THIS_WEEK', label: 'Due this week', value: typedLeads.filter((lead) => {
              const days = daysUntil(lead.followUpDate)
              return days !== null && days >= 0 && days <= 7
            }).length },
            { id: 'PROPOSAL', label: 'Proposal desk', value: proposalDesk },
            { id: 'HIGH_VALUE', label: 'High value', value: highValueCount },
          ].map((option) => (
            <Button
              key={option.id}
              type="button"
              size="sm"
              variant={focusFilter === option.id ? 'default' : 'outline'}
              onClick={() => setFocusFilter(option.id as FocusFilter)}
              className="gap-2"
            >
              {option.label}
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                  focusFilter === option.id
                    ? 'bg-primary-foreground/15 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {option.value}
              </span>
            </Button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          {typedLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[28px] border-2 border-dashed py-20 text-center">
              <TrendingUp className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">No leads yet</p>
              <p className="mb-4 text-xs text-muted-foreground/60">
                Add your first lead to start tracking pipeline, follow-up, and close probability.
              </p>
              <AddLeadDialog />
            </div>
          ) : sortedLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[28px] border-2 border-dashed py-16 text-center">
              <TrendingUp className="mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No leads match your current focus</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1">
              {stageOrder.map((stage) => {
                const stageLeads = sortedLeads.filter((lead) => lead.stage === stage)

                return (
                  <div key={stage} className="min-w-[285px] flex-shrink-0">
                    <div className="mb-2.5 flex items-center gap-2">
                      <Badge className={cn('border-0 text-xs', stageColors[stage])}>
                        {formatEnum(stage)}
                      </Badge>
                      <span className="text-xs font-medium text-muted-foreground">
                        {stageLeads.length}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {stageLeads.map((lead) => {
                        const workflow = getLeadWorkflow(lead)

                        return (
                          <Card
                            key={lead.id}
                            className="cursor-pointer border-border/80 shadow-none transition-all hover:border-primary/35 hover:shadow-sm"
                            onClick={() => router.push(`/leads/${lead.id}`)}
                          >
                            <CardContent className="space-y-3 p-4">
                              <div>
                                <p className="text-sm font-medium leading-tight">{lead.name}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {lead.company || 'Independent opportunity'}
                                </p>
                              </div>

                              <div className={cn('rounded-[18px] border px-3 py-3', getWorkflowTone(workflow.tone))}>
                                <p className="text-sm font-medium text-foreground">{workflow.title}</p>
                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                  {workflow.helper}
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <Badge className={cn('border-0 text-[10px]', sourceColors[lead.source])}>
                                  {formatEnum(lead.source)}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] shadow-none">
                                  {lead.owner?.name ?? 'Unassigned'}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[10px] shadow-none',
                                    isOverdue(lead.followUpDate)
                                      ? 'border-destructive/30 bg-destructive/5 text-destructive'
                                      : 'border-border/80 text-muted-foreground'
                                  )}
                                >
                                  {getFollowUpCopy(lead)}
                                </Badge>
                              </div>

                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>
                                  {lead.estimatedValue ? formatINR(lead.estimatedValue) : 'Value not set'}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <UserRound className="h-3 w-3" />
                                  {lead.owner?.name ?? 'Needs owner'}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}

                      {stageLeads.length === 0 && (
                        <div className="rounded-lg border-2 border-dashed p-4 text-center text-xs text-muted-foreground/60">
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
          {typedLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[28px] border-2 border-dashed py-20 text-center">
              <TrendingUp className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">No leads yet</p>
              <p className="mb-4 text-xs text-muted-foreground/60">
                Start tracking prospects and close more deals with a disciplined follow-up process.
              </p>
              <AddLeadDialog />
            </div>
          ) : sortedLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[28px] border-2 border-dashed py-16 text-center">
              <TrendingUp className="mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No leads match your current focus</p>
            </div>
          ) : (
            <Card className="surface-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Next action</TableHead>
                    <TableHead>Follow-up</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLeads.map((lead) => {
                    const workflow = getLeadWorkflow(lead)

                    return (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/leads/${lead.id}`)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{lead.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {lead.company || 'Independent opportunity'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('border-0 text-xs', stageColors[lead.stage])}>
                            {formatEnum(lead.stage)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {lead.owner?.name ?? 'Unassigned'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium text-foreground">{workflow.title}</p>
                            <p className="text-xs text-muted-foreground">{workflow.helper}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <span
                            className={cn(
                              isOverdue(lead.followUpDate) ? 'font-medium text-destructive' : 'text-muted-foreground'
                            )}
                          >
                            {getFollowUpCopy(lead)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {lead.estimatedValue ? formatINR(lead.estimatedValue) : 'N/A'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
