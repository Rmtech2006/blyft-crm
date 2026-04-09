'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { ExportMenu } from '@/components/shared/export-menu'
import { AddClientDialog } from '@/components/clients/add-client-dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  ExternalLink,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react'
import { exportCsv, printReport } from '@/lib/export'
import { cn, formatEnum } from '@/lib/utils'

type ClientListItem = {
  id: string
  companyName: string
  industry?: string
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'PROSPECT' | 'ONBOARDING'
  retainerAmount?: number
  retainerEndDate?: number
  healthScore?: number
  website?: string
  contacts: Array<{ id: string }>
  projects: Array<{ id: string }>
  contractSigned?: boolean
  invoicePaid?: boolean
  onboardingFormSubmitted?: boolean
  accessGranted?: boolean
  kickoffDone?: boolean
  firstDeliverableSent?: boolean
}

const statusColors: Record<ClientListItem['status'], string> = {
  ACTIVE: 'bg-emerald-500/15 text-emerald-500',
  PAUSED: 'bg-amber-500/15 text-amber-500',
  COMPLETED: 'bg-primary/15 text-primary',
  PROSPECT: 'bg-violet-500/15 text-violet-500',
  ONBOARDING: 'bg-cyan-500/15 text-cyan-600',
}

const onboardingSteps: Array<keyof Pick<
  ClientListItem,
  | 'contractSigned'
  | 'invoicePaid'
  | 'onboardingFormSubmitted'
  | 'accessGranted'
  | 'kickoffDone'
  | 'firstDeliverableSent'
>> = [
  'contractSigned',
  'invoicePaid',
  'onboardingFormSubmitted',
  'accessGranted',
  'kickoffDone',
  'firstDeliverableSent',
]

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function daysUntil(timestamp?: number) {
  if (!timestamp) return null
  return Math.ceil((timestamp - Date.now()) / 86400000)
}

function getOnboardingProgress(client: ClientListItem) {
  const completed = onboardingSteps.filter((step) => Boolean(client[step])).length
  return Math.round((completed / onboardingSteps.length) * 100)
}

function getHealthLabel(client: ClientListItem) {
  if (client.healthScore === undefined) {
    return {
      label: 'Health not scored',
      className: 'border-border/80 text-muted-foreground',
    }
  }

  if (client.healthScore <= 5) {
    return {
      label: `Risk ${client.healthScore}/10`,
      className: 'border-destructive/30 bg-destructive/5 text-destructive',
    }
  }

  if (client.healthScore <= 7) {
    return {
      label: `Stable ${client.healthScore}/10`,
      className: 'border-amber-300/80 bg-amber-50 text-amber-700',
    }
  }

  return {
    label: `Healthy ${client.healthScore}/10`,
    className: 'border-emerald-300/80 bg-emerald-50 text-emerald-700',
  }
}

function getWorkflowState(client: ClientListItem) {
  const renewalWindow = daysUntil(client.retainerEndDate)
  const onboardingProgress = getOnboardingProgress(client)

  if (client.status === 'ONBOARDING' && onboardingProgress < 100) {
    return {
      rank: 0,
      title: 'Onboarding is still in motion',
      helper: `${onboardingProgress}% complete. Push the next onboarding milestone to activate the account.`,
      tone: 'danger',
    }
  }

  if (client.status === 'PAUSED') {
    return {
      rank: 1,
      title: 'Needs leadership decision',
      helper: 'This account is paused. Confirm whether to revive, close, or restructure the engagement.',
      tone: 'warning',
    }
  }

  if ((client.healthScore ?? 10) <= 5) {
    return {
      rank: 2,
      title: 'Relationship health is slipping',
      helper: 'Low health score suggests churn risk. Review delivery quality, communication cadence, and open concerns.',
      tone: 'danger',
    }
  }

  if (client.contacts.length === 0) {
    return {
      rank: 3,
      title: 'Primary contact missing',
      helper: 'Add the main stakeholder so communication, billing, and onboarding do not stall.',
      tone: 'warning',
    }
  }

  if (renewalWindow !== null && renewalWindow >= 0 && renewalWindow <= 30) {
    return {
      rank: 4,
      title: 'Renewal window is open',
      helper:
        renewalWindow === 0
          ? 'Retainer review is due today.'
          : `Retainer end date is ${renewalWindow} day${renewalWindow === 1 ? '' : 's'} away.`,
      tone: 'warning',
    }
  }

  if (client.status === 'ACTIVE' && client.projects.length === 0) {
    return {
      rank: 5,
      title: 'Active client without live delivery',
      helper: 'There is an active account but no linked project. Confirm if work is paused or missing from the CRM.',
      tone: 'warning',
    }
  }

  return {
    rank: 6,
    title: 'Account is moving cleanly',
    helper: 'No obvious workflow blockers are visible on this account right now.',
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

function ClientsSkeleton() {
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-2 h-4 w-24" />
              <Skeleton className="mt-4 h-20 w-full rounded-2xl" />
              <Skeleton className="mt-4 h-16 w-full rounded-2xl" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function ClientsPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const clients = useQuery(api.clients.list)
  const typedClients = useMemo(() => (clients ?? []) as ClientListItem[], [clients])

  const filtered = useMemo(
    () =>
      typedClients.filter((client) => {
        const query = search.trim().toLowerCase()
        const matchStatus = statusFilter === 'ALL' || client.status === statusFilter
        const matchSearch =
          !query ||
          client.companyName.toLowerCase().includes(query) ||
          (client.industry ?? '').toLowerCase().includes(query)

        return matchStatus && matchSearch
      }),
    [search, statusFilter, typedClients]
  )

  const sortedClients = useMemo(
    () =>
      [...filtered].sort((left, right) => {
        const leftPriority = getWorkflowState(left).rank
        const rightPriority = getWorkflowState(right).rank

        if (leftPriority !== rightPriority) return leftPriority - rightPriority
        return left.companyName.localeCompare(right.companyName)
      }),
    [filtered]
  )

  if (clients === undefined) return <ClientsSkeleton />

  const activeClients = typedClients.filter((client) => client.status === 'ACTIVE')
  const totalRetainer = activeClients.reduce((sum, client) => sum + (client.retainerAmount ?? 0), 0)
  const onboardingClients = typedClients.filter((client) => client.status === 'ONBOARDING').length
  const renewalWindowCount = typedClients.filter((client) => {
    const days = daysUntil(client.retainerEndDate)
    return days !== null && days >= 0 && days <= 30
  }).length
  const attentionCount = typedClients.filter((client) => getWorkflowState(client).rank <= 3).length
  const missingContacts = typedClients.filter((client) => client.contacts.length === 0).length

  function handleCsvExport() {
    exportCsv('clients-export.csv', sortedClients, [
      { header: 'Company', value: (client) => client.companyName },
      { header: 'Status', value: (client) => client.status },
      { header: 'Industry', value: (client) => client.industry ?? 'N/A' },
      { header: 'Retainer', value: (client) => client.retainerAmount ?? 0 },
      { header: 'Contacts', value: (client) => client.contacts.length },
      { header: 'Projects', value: (client) => client.projects.length },
      { header: 'Health score', value: (client) => client.healthScore ?? 'N/A' },
      {
        header: 'Renewal in days',
        value: (client) => {
          const days = daysUntil(client.retainerEndDate)
          return days ?? 'N/A'
        },
      },
    ])
  }

  function handlePdfExport() {
    printReport({
      title: 'BLYFT Clients Report',
      subtitle: `Generated on ${new Date().toLocaleDateString('en-IN')}`,
      sections: [
        {
          title: 'Portfolio summary',
          columns: ['Metric', 'Value'],
          rows: [
            ['Total clients', typedClients.length],
            ['Active clients', activeClients.length],
            ['Clients needing attention', attentionCount],
            ['Onboarding clients', onboardingClients],
            ['Renewals within 30 days', renewalWindowCount],
            ['Monthly retainer', formatINR(totalRetainer)],
          ],
        },
        {
          title: 'Portfolio list',
          columns: ['Company', 'Status', 'Next focus', 'Retainer', 'Contacts', 'Projects'],
          rows: sortedClients.map((client) => [
            client.companyName,
            formatEnum(client.status),
            getWorkflowState(client).title,
            client.retainerAmount ? formatINR(client.retainerAmount) : 'N/A',
            client.contacts.length,
            client.projects.length,
          ]),
        },
      ],
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-eyebrow">Portfolio</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Clients</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Scan account health, onboarding blockers, and renewal risk from one surface.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <ExportMenu onCsv={handleCsvExport} onPdf={handlePdfExport} />
          <AddClientDialog />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Accounts needing attention',
            value: attentionCount,
            note: 'Paused, low-health, missing contact, or onboarding friction.',
            icon: AlertTriangle,
            color: 'text-amber-600',
          },
          {
            label: 'Onboarding in motion',
            value: onboardingClients,
            note: 'Accounts still moving through the launch checklist.',
            icon: TrendingUp,
            color: 'text-cyan-600',
          },
          {
            label: 'Renewal window',
            value: renewalWindowCount,
            note: 'Clients whose retainer end date lands within the next 30 days.',
            icon: Calendar,
            color: 'text-violet-600',
          },
          {
            label: 'Missing main contact',
            value: missingContacts,
            note: 'Accounts without a primary stakeholder captured in the CRM.',
            icon: Users,
            color: 'text-primary',
          },
        ].map(({ label, value, note, icon: Icon, color }) => (
          <Card key={label} className="surface-card">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  {label}
                </p>
                <Icon className={cn('h-4 w-4 shrink-0', color)} />
              </div>
              <p className="text-3xl font-semibold tracking-tight">{value}</p>
              <p className="text-sm leading-6 text-muted-foreground">{note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="surface-card flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search clients by company or industry..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? 'ALL')}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="ONBOARDING">Onboarding</SelectItem>
              <SelectItem value="PAUSED">Paused</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="PROSPECT">Prospect</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{sortedClients.length}</span> of{' '}
          <span className="font-medium text-foreground">{typedClients.length}</span> clients
        </div>
      </div>

      {typedClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[28px] border-2 border-dashed py-20 text-center">
          <Building2 className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">No clients yet</p>
          <p className="mb-4 text-xs text-muted-foreground/60">
            Add your first client to start tracking onboarding, retention, and account health.
          </p>
          <AddClientDialog />
        </div>
      ) : sortedClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[28px] border-2 border-dashed py-16 text-center">
          <Building2 className="mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No clients match your current filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
          {sortedClients.map((client) => {
            const workflow = getWorkflowState(client)
            const onboardingProgress = getOnboardingProgress(client)
            const health = getHealthLabel(client)
            const renewalDays = daysUntil(client.retainerEndDate)

            return (
              <Card
                key={client.id}
                className="surface-card cursor-pointer transition-all hover:border-foreground/10 hover:shadow-[0_24px_60px_-44px_rgba(15,23,42,0.35)]"
                onClick={() => router.push(`/clients/${client.id}`)}
              >
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-lg font-semibold tracking-tight">
                          {client.companyName}
                        </h3>
                        <Badge className={cn('border-0 shadow-none', statusColors[client.status])}>
                          {formatEnum(client.status)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {client.industry || 'Industry not set'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline" className={cn('shadow-none', health.className)}>
                          {health.label}
                        </Badge>
                        {client.retainerAmount && (
                          <Badge variant="outline" className="shadow-none">
                            {formatINR(client.retainerAmount)} / month
                          </Badge>
                        )}
                      </div>
                    </div>

                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>

                  <div className={cn('rounded-[22px] border px-4 py-4', getWorkflowTone(workflow.tone))}>
                    <p className="text-sm font-medium text-foreground">{workflow.title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{workflow.helper}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="surface-muted p-4">
                      <p className="section-eyebrow">Delivery footprint</p>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Projects</p>
                          <p className="mt-1 font-medium text-foreground">{client.projects.length}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Contacts</p>
                          <p className="mt-1 font-medium text-foreground">{client.contacts.length}</p>
                        </div>
                      </div>
                    </div>

                    <div className="surface-muted p-4">
                      <p className="section-eyebrow">Renewal readiness</p>
                      <p className="mt-3 text-sm font-medium text-foreground">
                        {renewalDays === null
                          ? 'No retainer end date'
                          : renewalDays < 0
                            ? `Expired ${Math.abs(renewalDays)} day${Math.abs(renewalDays) === 1 ? '' : 's'} ago`
                            : renewalDays === 0
                              ? 'Renewal due today'
                              : `${renewalDays} day${renewalDays === 1 ? '' : 's'} remaining`}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Keep account planning, renewal conversations, and delivery aligned.
                      </p>
                    </div>
                  </div>

                  {client.status === 'ONBOARDING' && (
                    <div className="rounded-[22px] border border-border/80 bg-card/70 px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-foreground">Launch checklist progress</p>
                        <span className="text-sm font-semibold text-foreground">{onboardingProgress}%</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-foreground transition-all"
                          style={{ width: `${Math.max(8, onboardingProgress)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {client.website && (
                    <a
                      href={client.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Visit website
                    </a>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
