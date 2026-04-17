'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { ExportMenu } from '@/components/shared/export-menu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AddClientDialog } from '@/components/clients/add-client-dialog'
import { EditClientDialog } from '@/components/clients/edit-client-dialog'
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Globe2,
  Handshake,
  Pencil,
  Search,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { exportCsv, printReport } from '@/lib/export'
import { formatEnum, cn } from '@/lib/utils'

const statusMeta: Record<string, {
  label: string
  badge: string
  dot: string
  panel: string
}> = {
  ACTIVE: {
    label: 'Active',
    badge: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700',
    dot: 'bg-emerald-500',
    panel: 'border-emerald-500/20 bg-emerald-500/8',
  },
  PAUSED: {
    label: 'Paused',
    badge: 'border-amber-500/25 bg-amber-500/10 text-amber-700',
    dot: 'bg-amber-500',
    panel: 'border-amber-500/25 bg-amber-500/8',
  },
  COMPLETED: {
    label: 'Completed',
    badge: 'border-neutral-400/35 bg-neutral-900/8 text-neutral-700',
    dot: 'bg-neutral-500',
    panel: 'border-neutral-300 bg-neutral-950/5',
  },
  PROSPECT: {
    label: 'Prospect',
    badge: 'border-violet-500/20 bg-violet-500/10 text-violet-700',
    dot: 'bg-violet-500',
    panel: 'border-violet-500/20 bg-violet-500/8',
  },
  ONBOARDING: {
    label: 'Onboarding',
    badge: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-700',
    dot: 'bg-cyan-500',
    panel: 'border-cyan-500/20 bg-cyan-500/8',
  },
}

const statusOptions = [
  { value: 'ALL', label: 'All clients' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ONBOARDING', label: 'Onboarding' },
  { value: 'PROSPECT', label: 'Prospect' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'COMPLETED', label: 'Completed' },
]

function getStatusMeta(status: string) {
  return statusMeta[status] ?? {
    label: formatEnum(status),
    badge: 'border-border bg-muted text-foreground',
    dot: 'bg-muted-foreground',
    panel: 'border-border bg-muted/50',
  }
}

function normalizeWebsite(website?: string) {
  if (!website) return undefined
  return website.startsWith('http://') || website.startsWith('https://')
    ? website
    : `https://${website}`
}

function ClientsSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-[238px] rounded-lg" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[132px] rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-16 rounded-lg" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[210px] rounded-lg" />
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
  const removeClient = useMutation(api.clients.remove)
  const clientRecords = clients ?? []

  if (clients === undefined) return <ClientsSkeleton />

  const statusCounts = clientRecords.reduce<Record<string, number>>((counts, client) => {
    counts[client.status] = (counts[client.status] ?? 0) + 1
    return counts
  }, {})

  const filtered = clientRecords.filter((client) => {
    const matchStatus = statusFilter === 'ALL' || client.status === statusFilter
    const query = search.trim().toLowerCase()
    const matchSearch = !query ||
      client.companyName.toLowerCase().includes(query) ||
      (client.industry ?? '').toLowerCase().includes(query) ||
      (client.website ?? '').toLowerCase().includes(query)
    return matchStatus && matchSearch
  })

  const activeClients = clientRecords.filter((client) => client.status === 'ACTIVE')
  const onboardingClients = clientRecords.filter((client) => client.status === 'ONBOARDING')
  const completedClients = clientRecords.filter((client) => client.status === 'COMPLETED')
  const totalContacts = clientRecords.reduce((sum, client) => sum + client.contacts.length, 0)
  const totalProjects = clientRecords.reduce((sum, client) => sum + client.projects.length, 0)
  const livePortfolio = activeClients.length + onboardingClients.length
  const completionRate = clientRecords.length
    ? Math.round((completedClients.length / clientRecords.length) * 100)
    : 0

  const summaryCards = [
    {
      label: 'Total Clients',
      value: clientRecords.length,
      detail: `${filtered.length} in current view`,
      icon: Building2,
      tone: 'border-neutral-200 bg-white',
      iconTone: 'bg-neutral-950 text-white',
    },
    {
      label: 'Live Portfolio',
      value: livePortfolio,
      detail: `${activeClients.length} active, ${onboardingClients.length} onboarding`,
      icon: Handshake,
      tone: 'border-emerald-500/20 bg-emerald-500/8',
      iconTone: 'bg-emerald-600 text-white',
    },
    {
      label: 'Relationships',
      value: totalContacts,
      detail: `${totalProjects} linked projects`,
      icon: Users,
      tone: 'border-cyan-500/20 bg-cyan-500/8',
      iconTone: 'bg-cyan-600 text-white',
    },
    {
      label: 'Completed',
      value: `${completionRate}%`,
      detail: `${completedClients.length} accounts archived`,
      icon: CheckCircle2,
      tone: 'border-violet-500/20 bg-violet-500/8',
      iconTone: 'bg-violet-600 text-white',
    },
  ]

  async function handleDeleteClient(client: { id: string; companyName: string }) {
    if (!confirm(`Delete ${client.companyName}? This will remove the client, contacts, and notes.`)) return
    try {
      await removeClient({ id: client.id as Id<'clients'> })
      toast.success('Client deleted')
    } catch {
      toast.error('Failed to delete client')
    }
  }

  function handleCsvExport() {
    exportCsv('clients-export.csv', filtered, [
      { header: 'Company', value: (client) => client.companyName },
      { header: 'Status', value: (client) => client.status },
      { header: 'Industry', value: (client) => client.industry ?? '-' },
      { header: 'Contacts', value: (client) => client.contacts.length },
      { header: 'Projects', value: (client) => client.projects.length },
      { header: 'Website', value: (client) => client.website ?? '-' },
    ])
  }

  function handlePdfExport() {
    printReport({
      title: 'BLYFT Clients Report',
      subtitle: `Generated on ${new Date().toLocaleDateString('en-IN')}`,
      sections: [
        {
          title: 'Client summary',
          columns: ['Metric', 'Value'],
          rows: [
            ['Total clients', clientRecords.length],
            ['Active clients', activeClients.length],
            ['Onboarding clients', onboardingClients.length],
            ['Filtered records', filtered.length],
          ],
        },
        {
          title: 'Client list',
          columns: ['Company', 'Status', 'Industry', 'Contacts', 'Projects'],
          rows: filtered.map((client) => [
            client.companyName,
            formatEnum(client.status),
            client.industry ?? '-',
            client.contacts.length,
            client.projects.length,
          ]),
        },
      ],
    })
  }

  return (
    <div className="space-y-5 pb-3">
      <section className="surface-card hero-noise relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-white/8 blur-3xl" />
        </div>

        <div className="relative grid gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary-foreground/65">
              Client operations
            </div>
            <div className="mt-5 space-y-3">
              <h1 className="text-3xl font-semibold tracking-normal text-white sm:text-4xl">
                Clients
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-white/68 sm:text-base">
                Monitor retained accounts, onboarding status, contacts, and linked delivery work.
              </p>
            </div>
          </div>

          <div className="clients-page-actions flex flex-col gap-3 sm:flex-row xl:justify-end [&_[data-slot=button]]:rounded-lg [&_[data-slot=button]]:border-white/14 [&_[data-slot=button]]:bg-white/10 [&_[data-slot=button]]:text-white [&_[data-slot=button]]:shadow-none [&_[data-slot=button]:hover]:bg-white/16">
            <ExportMenu onCsv={handleCsvExport} onPdf={handlePdfExport} />
            <AddClientDialog />
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:col-span-2">
            <div className="rounded-lg border border-white/10 bg-white/8 p-4 backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/46">
                Client Book
              </p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <p className="text-3xl font-semibold">{clientRecords.length}</p>
                <Badge className="border-white/12 bg-white/10 text-white">
                  {activeClients.length} active
                </Badge>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/8 p-4 backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/46">
                Delivery Load
              </p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <p className="text-3xl font-semibold">{totalProjects}</p>
                <span className="text-xs text-white/52">projects linked</span>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/8 p-4 backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/46">
                Onboarding
              </p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <p className="text-3xl font-semibold">{onboardingClients.length}</p>
                <span className="text-xs text-white/52">accounts moving</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ label, value, detail, icon: Icon, tone, iconTone }) => (
          <div
            key={label}
            className={cn(
              'rounded-lg border p-4 shadow-[0_20px_60px_-48px_rgba(0,0,0,0.65)]',
              tone
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-normal text-foreground">{value}</p>
              </div>
              <span className={cn('flex h-10 w-10 items-center justify-center rounded-lg', iconTone)}>
                <Icon className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{detail}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-border/80 bg-white/86 p-3 shadow-[0_22px_70px_-58px_rgba(0,0,0,0.72)] backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search company, industry, or website..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 rounded-lg border-border/90 bg-white pl-9 text-sm shadow-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[180px_auto] lg:flex lg:items-center">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? 'ALL')}>
              <SelectTrigger className="h-11 w-full rounded-lg border-border/90 bg-white shadow-none sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <Clock3 className="h-4 w-4" />
              <span>{filtered.length} of {clientRecords.length} clients</span>
            </div>
          </div>
        </div>
      </section>

      {clientRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/90 bg-white/75 px-6 py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-950 text-white">
            <Building2 className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm font-semibold text-foreground">No clients yet</p>
          <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
            Start the client book with the first account, then track delivery and onboarding from here.
          </p>
          <div className="mt-5 [&_[data-slot=button]]:rounded-lg">
            <AddClientDialog />
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/90 bg-white/75 px-6 py-16 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Search className="h-5 w-5" />
          </div>
          <p className="mt-4 text-sm font-semibold text-foreground">No clients match this view</p>
          <p className="mt-1 text-xs text-muted-foreground">Try a different search term or status filter.</p>
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((client) => {
            const meta = getStatusMeta(client.status)
            const website = normalizeWebsite(client.website)

            return (
              <article
                key={client.id}
                role="button"
                tabIndex={0}
                aria-label={`Open ${client.companyName}`}
                className={cn(
                  'group cursor-pointer rounded-lg border bg-white p-5 shadow-[0_26px_80px_-64px_rgba(0,0,0,0.72)] transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-950/25 hover:shadow-[0_30px_90px_-58px_rgba(0,0,0,0.78)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25',
                  meta.panel
                )}
                onClick={() => router.push(`/clients/${client.id}`)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    router.push(`/clients/${client.id}`)
                  }
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', meta.dot)} />
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {client.industry ?? 'Client Services'}
                      </p>
                    </div>
                    <h2 className="mt-3 line-clamp-2 text-base font-semibold leading-snug text-foreground">
                      {client.companyName}
                    </h2>
                  </div>

                  <div className="flex shrink-0 items-center gap-1" onClick={(event) => event.stopPropagation()}>
                    <EditClientDialog
                      client={client}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-white hover:text-foreground"
                          title="Edit client"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-white hover:text-destructive"
                      title="Delete client"
                      onClick={() => handleDeleteClient(client)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <Badge className={cn('rounded-md border text-[10px]', meta.badge)}>
                    {meta.label}
                  </Badge>
                  {website && (
                    <a
                      href={website}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="inline-flex h-6 items-center gap-1 rounded-md border border-border/80 bg-white px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
                    >
                      <Globe2 className="h-3 w-3" />
                      Website
                    </a>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border/80 bg-white/76 p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="h-4 w-4" />
                      Contacts
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{client.contacts.length}</p>
                  </div>
                  <div className="rounded-lg border border-border/80 bg-white/76 p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FolderKanban className="h-4 w-4" />
                      Projects
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{client.projects.length}</p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/70 pt-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>{statusCounts[client.status] ?? 0} in {meta.label.toLowerCase()}</span>
                  </div>
                  <span className="inline-flex items-center gap-1 font-medium text-foreground">
                    Open
                    <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>
              </article>
            )
          })}
        </section>
      )}
    </div>
  )
}
