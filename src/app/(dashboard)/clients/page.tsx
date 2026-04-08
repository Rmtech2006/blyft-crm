'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AddClientDialog } from '@/components/clients/add-client-dialog'
import { Users, TrendingUp, Building2, ExternalLink } from 'lucide-react'

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/15 text-emerald-500',
  PAUSED: 'bg-amber-500/15 text-amber-500',
  COMPLETED: 'bg-primary/15 text-primary',
  PROSPECT: 'bg-violet-500/15 text-violet-500',
}

export default function ClientsPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  const clients = useQuery(api.clients.list) ?? []

  const filtered = clients.filter((c) => {
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter
    const matchSearch = !search || c.companyName.toLowerCase().includes(search.toLowerCase()) || (c.industry ?? '').toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const activeClients = clients.filter((c) => c.status === 'ACTIVE')
  const totalRetainer = activeClients.reduce((s, c) => s + (c.retainerAmount ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
        <AddClientDialog />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Clients', value: clients.length, icon: Building2, color: 'text-primary' },
          { label: 'Active', value: activeClients.length, icon: Users, color: 'text-green-500' },
          { label: 'Prospects', value: clients.filter(c => c.status === 'PROSPECT').length, icon: TrendingUp, color: 'text-purple-500' },
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
        <Input placeholder="Search clients…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
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

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No clients found. Add your first client!</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <Card key={client.id} className="cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all" onClick={() => router.push(`/clients/${client.id}`)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{client.companyName}</h3>
                    {client.industry && <p className="text-xs text-muted-foreground">{client.industry}</p>}
                  </div>
                  <Badge className={`text-xs border-0 ${statusColors[client.status] ?? ''}`}>{client.status}</Badge>
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
                  <a href={client.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline">
                    <ExternalLink className="h-3 w-3" />Website
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
