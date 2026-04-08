'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AddProjectDialog } from '@/components/projects/add-project-dialog'
import { FolderOpen, Clock, CheckCircle, PauseCircle, Calendar, Search } from 'lucide-react'
import { formatEnum } from '@/lib/utils'

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

const statusColors: Record<string, string> = {
  NOT_STARTED: 'bg-muted text-muted-foreground',
  IN_PROGRESS: 'bg-primary/15 text-primary',
  IN_REVIEW: 'bg-amber-500/15 text-amber-500',
  COMPLETED: 'bg-emerald-500/15 text-emerald-500',
  ON_HOLD: 'bg-destructive/15 text-destructive',
}

const typeColors: Record<string, string> = {
  SOCIAL_MEDIA: 'bg-pink-500/15 text-pink-500',
  SEO: 'bg-emerald-500/15 text-emerald-500',
  WEB_DESIGN: 'bg-violet-500/15 text-violet-500',
  BRANDING: 'bg-orange-500/15 text-orange-500',
  CONTENT: 'bg-cyan-100 text-cyan-700',
  ADS: 'bg-destructive/15 text-destructive',
  OTHER: 'bg-muted text-muted-foreground',
}

function ProjectsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3"><Skeleton className="h-8 w-8 rounded" /><div><Skeleton className="h-3 w-16 mb-1" /><Skeleton className="h-6 w-8" /></div></CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}><CardContent className="p-5"><Skeleton className="h-4 w-40 mb-1" /><Skeleton className="h-3 w-24 mb-3" /><Skeleton className="h-3 w-full mb-1" /><Skeleton className="h-3 w-3/4" /></CardContent></Card>
        ))}
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  const projects = useQuery(api.projects.list)

  if (projects === undefined) return <ProjectsSkeleton />

  const filtered = projects.filter((p) => {
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter
    const matchType = typeFilter === 'ALL' || p.type === typeFilter
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.client.companyName.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchType && matchSearch
  })

  const inProgress = projects.filter((p) => p.status === 'IN_PROGRESS').length
  const completed = projects.filter((p) => p.status === 'COMPLETED').length
  const onHold = projects.filter((p) => p.status === 'ON_HOLD').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
        <AddProjectDialog />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: projects.length, icon: FolderOpen, color: 'text-primary' },
          { label: 'In Progress', value: inProgress, icon: Clock, color: 'text-primary' },
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
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search projects or clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'ALL')}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            {['NOT_STARTED', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'ON_HOLD'].map((s) => (
              <SelectItem key={s} value={s}>{formatEnum(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? 'ALL')}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {['SOCIAL_MEDIA', 'SEO', 'WEB_DESIGN', 'BRANDING', 'CONTENT', 'ADS', 'OTHER'].map((t) => (
              <SelectItem key={t} value={t}>{formatEnum(t)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl">
          <FolderOpen className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No projects yet</p>
          <p className="text-xs text-muted-foreground/60 mb-4">Create your first project to start tracking work</p>
          <AddProjectDialog />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl">
          <FolderOpen className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No projects match your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
              onClick={() => router.push(`/projects/${project.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm leading-tight flex-1 mr-2">{project.name}</h3>
                  <Badge className={`text-xs border-0 shrink-0 ${statusColors[project.status] ?? ''}`}>
                    {formatEnum(project.status)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{project.client.companyName}</p>
                <div className="mb-3">
                  <Badge className={`text-xs border-0 ${typeColors[project.type] ?? ''}`}>
                    {formatEnum(project.type)}
                  </Badge>
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
