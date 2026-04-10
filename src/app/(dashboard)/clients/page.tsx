'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { ExportMenu } from '@/components/shared/export-menu'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AddClientDialog } from '@/components/clients/add-client-dialog'
import { Users, TrendingUp, Building2, ExternalLink, Search } from 'lucide-react'
import { exportCsv, printReport } from '@/lib/export'
import { formatEnum } from '@/lib/utils'

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/15 text-emerald-500',
  PAUSED: 'bg-amber-500/15 text-amber-500',
  COMPLETED: 'bg-primary/15 text-primary',
  PROSPECT: 'bg-violet-500/15 text-violet-500',
}

function ClientsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3"><Skeleton className="h-8 w-8 rounded" /><div><Skeleton className="h-3 w-20 mb-1" /><Skeleton className="h-6 w-12" /></div></CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}><CardContent className="p-5"><Skeleton className="h-4 w-32 mb-2" /><Skeleton className="h-3 w-20 mb-4" /><Skeleton className="h-3 w-full mb-1" /><Skeleton className="h-3 w-3/4" /></CardContent></Card>
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
  const clientRecords = clients ?? []

  if (clients === undefined) return <ClientsSkeleton />

  const filtered = clientRecords.filter((c) => {
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter
    const matchSearch = !search ||
      c.companyName.toLowerCase().includes(search.toLowerCase()) ||
      (c.industry ?? '').toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const activeClients = clientRecords.filter((c) => c.status === 'ACTIVE')
  const totalRetainer = activeClients.reduce((s, c) => s + (c.retainerAmount ?? 0), 0)

  function handleCsvExport() {
    exportCsv('clients-export.csv', filtered, [
      { header: 'Company', value: (client) => client.companyName },
      { header: 'Status', value: (client) => client.status },
      { header: 'Industry', value: (client) => client.industry ?? '—' },
      { header: 'Retainer', value: (client) => client.retainerAmount ?? 0 },
      { header: 'Contacts', value: (client) => client.contacts.length },
      { header: 'Projects', value: (client) => client.projects.length },
      { header: 'Website', value: (client) => client.website ?? '—' },
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
            ['Filtered records', filtered.length],
            ['Monthly retainer', formatINR(totalRetainer)],
          ],
        },
        {
          title: 'Client list',
          columns: ['Company', 'Status', 'Industry', 'Retainer', 'Contacts', 'Projects'],
          rows: filtered.map((client) => [
            client.companyName,
            formatEnum(client.status),
            client.industry ?? '—',
            client.retainerAmount ? formatINR(client.retainerAmount) : '—',
            client.contacts.length,
            client.projects.length,
          ]),
        },
      ],
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
        <div className="flex gap-2">
          <ExportMenu onCsv={handleCsvExport} onPdf={handlePdfExport} />
          <AddClientDialog />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Clients', value: clientRecords.length, icon: Building2, color: 'text-primary' },
          { label: 'Active', value: activeClients.length, icon: Users, color: 'text-green-500' },
          { label: 'Prospects', value: clientRecords.filter(c => c.status === 'PROSPECT').length, icon: TrendingUp, color: 'text-purple-500' },
          { label: 'Monthly Retainer', value: formatINR(totalRetainer), icon: TrendingUp, color: 'text-orange-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`h-8 w-8 ${color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'ALL')}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="PROSPECT">Prospect</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {clientRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl">
          <Building2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No clients yet</p>
          <p className="text-xs text-muted-foreground/60 mb-4">Add your first client to get started</p>
          <AddClientDialog />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl">
          <Building2 className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No clients match your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <Card
              key={client.id}
              className="cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
              onClick={() => router.push(`/clients/${client.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{client.companyName}</h3>
                    {client.industry && <p className="text-xs text-muted-foreground">{client.industry}</p>}
                  </div>
                  <Badge className={`text-xs border-0 shrink-0 ml-2 ${statusColors[client.status] ?? ''}`}>
                    {formatEnum(client.status)}
                  </Badge>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {client.retainerAmount && (
                    <div className="flex justify-between">
                      <span>Retainer</span>
                      <span className="font-medium text-foreground">{formatINR(client.retainerAmount)}/mo</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Contacts</span>
                    <span>{client.contacts.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Projects</span>
                    <span>{client.projects.length}</span>
                  </div>
                </div>
                {client.website && (
                  <a
                    href={client.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> Website
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
