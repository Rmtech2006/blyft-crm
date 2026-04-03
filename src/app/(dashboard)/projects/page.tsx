'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AddProjectDialog } from '@/components/projects/add-project-dialog'
import { FolderOpen, Clock, CheckCircle, PauseCircle, Calendar } from 'lucide-react'

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

const statusColors: Record<string, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  IN_REVIEW: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  ON_HOLD: 'bg-red-100 text-red-700',
}

const typeColors: Record<string, string> = {
  SOCIAL_MEDIA: 'bg-pink-100 text-pink-700',
  SEO: 'bg-green-100 text-green-700',
  WEB_DESIGN: 'bg-purple-100 text-purple-700',
  BRANDING: 'bg-orange-100 text-orange-700',
  CONTENT: 'bg-cyan-100 text-cyan-700',
  ADS: 'bg-red-100 text-red-700',
  OTHER: 'bg-gray-100 text-gray-700',
}

export default function ProjectsPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  const projects = useQuery(api.projects.list) ?? []

  const filtered = projects.filter((p) => {
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter
    const matchType = typeFilter === 'ALL' || p.type === typeFilter
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.client.companyName.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchType && matchSearch
  })

  const inProgress = projects.filter((p) => p.status === 'IN_PROGRESS').length
  const completed = projects.filter((p) => p.status === 'COMPLETED').length
  const onHold = projects.filter((p) => p.status === 'ON_HOLD').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <AddProjectDialog />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: projects.length, icon: FolderOpen, color: 'text-blue-500' },
          { label: 'In Progress', value: inProgress, icon: Clock, color: 'text-blue-600' },
          { label: 'Completed', value: completed, icon: CheckCircle, color: 'text-green-500' },
          { label: 'On Hold', value: onHold, icon: PauseCircle, color: 'text-red-500' },
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

      <div className="flex gap-3 flex-wrap">
        <Input placeholder="Search projects…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            {['NOT_STARTED', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'ON_HOLD'].map((s) => (
              <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {['SOCIAL_MEDIA', 'SEO', 'WEB_DESIGN', 'BRANDING', 'CONTENT', 'ADS', 'OTHER'].map((t) => (
              <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No projects found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <Card key={project.id} className="cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all" onClick={() => router.push(`/projects/${project.id}`)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm leading-tight flex-1 mr-2">{project.name}</h3>
                  <Badge className={`text-xs border-0 shrink-0 ${statusColors[project.status] ?? ''}`}>{project.status.replace('_', ' ')}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{project.client.companyName}</p>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={`text-xs border-0 ${typeColors[project.type] ?? ''}`}>{project.type.replace('_', ' ')}</Badge>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {project.deadline && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Due {new Date(project.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Tasks</span>
                    <span>{project.taskCount}</span>
                  </div>
                  {project.budgetAgreed && (
                    <div className="flex justify-between">
                      <span>Budget</span>
                      <span className="font-medium text-foreground">{formatINR(project.budgetAgreed)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
