'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import {
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  CircleDot,
  Clock3,
  FolderKanban,
  FolderOpen,
  KanbanSquare,
  ListFilter,
  PauseCircle,
  Search,
} from 'lucide-react'
import { AddProjectDialog } from '@/components/projects/add-project-dialog'
import { ExportMenu } from '@/components/shared/export-menu'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { exportCsv, printReport } from '@/lib/export'
import { cn, formatEnum } from '@/lib/utils'

type ProjectStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'ON_HOLD'
type ProjectType = 'SOCIAL_MEDIA' | 'SEO' | 'WEB_DESIGN' | 'BRANDING' | 'CONTENT' | 'ADS' | 'OTHER'

type ProjectItem = {
  id: string
  name: string
  status: ProjectStatus
  type: ProjectType
  client: { companyName: string }
  deadline?: number | null
  budgetAgreed?: number | null
  taskCount: number
}

const statusOptions: ProjectStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'ON_HOLD']
const typeOptions: ProjectType[] = ['SOCIAL_MEDIA', 'SEO', 'WEB_DESIGN', 'BRANDING', 'CONTENT', 'ADS', 'OTHER']

const statusMeta: Record<ProjectStatus, {
  label: string
  badge: string
  panel: string
  dot: string
  icon: typeof FolderOpen
}> = {
  NOT_STARTED: {
    label: 'Not started',
    badge: 'border-neutral-200 bg-neutral-100 text-neutral-700',
    panel: 'border-neutral-200/80 bg-neutral-50/70',
    dot: 'bg-neutral-400',
    icon: CircleDot,
  },
  IN_PROGRESS: {
    label: 'In progress',
    badge: 'border-zinc-950/15 bg-zinc-950 text-white',
    panel: 'border-zinc-950/15 bg-white',
    dot: 'bg-zinc-950',
    icon: Clock3,
  },
  IN_REVIEW: {
    label: 'In review',
    badge: 'border-amber-300/60 bg-amber-50 text-amber-800',
    panel: 'border-amber-200/70 bg-amber-50/35',
    dot: 'bg-amber-500',
    icon: BarChart3,
  },
  COMPLETED: {
    label: 'Completed',
    badge: 'border-emerald-300/60 bg-emerald-50 text-emerald-800',
    panel: 'border-emerald-200/70 bg-emerald-50/35',
    dot: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  ON_HOLD: {
    label: 'On hold',
    badge: 'border-rose-300/60 bg-rose-50 text-rose-800',
    panel: 'border-rose-200/70 bg-rose-50/35',
    dot: 'bg-rose-500',
    icon: PauseCircle,
  },
}

const typeMeta: Record<ProjectType, string> = {
  SOCIAL_MEDIA: 'border-pink-200 bg-pink-50 text-pink-700',
  SEO: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  WEB_DESIGN: 'border-sky-200 bg-sky-50 text-sky-700',
  BRANDING: 'border-stone-300 bg-stone-100 text-stone-700',
  CONTENT: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  ADS: 'border-rose-200 bg-rose-50 text-rose-700',
  OTHER: 'border-neutral-200 bg-neutral-100 text-neutral-700',
}

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(value?: number | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return 'No deadline'

  return new Date(value).toLocaleDateString('en-IN', options ?? {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function isDeadlineSoon(value?: number | null) {
  if (!value) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadline = new Date(value)
  deadline.setHours(0, 0, 0, 0)
  const days = Math.ceil((deadline.getTime() - today.getTime()) / 86_400_000)
  return days >= 0 && days <= 7
}

function isOverdue(project: ProjectItem) {
  if (!project.deadline || project.status === 'COMPLETED') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadline = new Date(project.deadline)
  deadline.setHours(0, 0, 0, 0)
  return deadline.getTime() < today.getTime()
}

function ProjectsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[292px] rounded-lg" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[132px] rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-[68px] rounded-lg" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-[240px] rounded-lg" />
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
  const projectRecords = useMemo(() => (projects ?? []) as ProjectItem[], [projects])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()

    return projectRecords.filter((project) => {
      const matchStatus = statusFilter === 'ALL' || project.status === statusFilter
      const matchType = typeFilter === 'ALL' || project.type === typeFilter
      const matchSearch =
        !query ||
        project.name.toLowerCase().includes(query) ||
        project.client.companyName.toLowerCase().includes(query)

      return matchStatus && matchType && matchSearch
    })
  }, [projectRecords, search, statusFilter, typeFilter])

  if (projects === undefined) return <ProjectsSkeleton />

  const activeProjects = projectRecords.filter((project) =>
    ['IN_PROGRESS', 'IN_REVIEW'].includes(project.status)
  )
  const completed = projectRecords.filter((project) => project.status === 'COMPLETED')
  const onHold = projectRecords.filter((project) => project.status === 'ON_HOLD')
  const overdue = projectRecords.filter(isOverdue)
  const dueSoon = projectRecords.filter((project) => isDeadlineSoon(project.deadline) && project.status !== 'COMPLETED')
  const budgetTotal = projectRecords.reduce((sum, project) => sum + (project.budgetAgreed ?? 0), 0)
  const taskTotal = projectRecords.reduce((sum, project) => sum + project.taskCount, 0)
  const nextDeadline = [...projectRecords]
    .filter((project) => project.deadline && project.status !== 'COMPLETED')
    .sort((a, b) => (a.deadline ?? 0) - (b.deadline ?? 0))[0]

  function handleCsvExport() {
    exportCsv('projects-export.csv', filtered, [
      { header: 'Project', value: (project) => project.name },
      { header: 'Client', value: (project) => project.client.companyName },
      { header: 'Status', value: (project) => project.status },
      { header: 'Type', value: (project) => project.type },
      { header: 'Task count', value: (project) => project.taskCount },
      { header: 'Budget', value: (project) => project.budgetAgreed ?? 0 },
      {
        header: 'Deadline',
        value: (project) => (project.deadline ? new Date(project.deadline).toLocaleDateString('en-IN') : '-'),
      },
    ])
  }

  function handlePdfExport() {
    printReport({
      title: 'BLYFT Projects Report',
      subtitle: `Generated on ${new Date().toLocaleDateString('en-IN')}`,
      sections: [
        {
          title: 'Project summary',
          columns: ['Metric', 'Value'],
          rows: [
            ['Total projects', projectRecords.length],
            ['Active delivery', activeProjects.length],
            ['Completed', completed.length],
            ['On hold', onHold.length],
            ['Due this week', dueSoon.length],
            ['Overdue', overdue.length],
            ['Filtered records', filtered.length],
          ],
        },
        {
          title: 'Project list',
          columns: ['Project', 'Client', 'Status', 'Type', 'Tasks', 'Deadline'],
          rows: filtered.map((project) => [
            project.name,
            project.client.companyName,
            formatEnum(project.status),
            formatEnum(project.type),
            project.taskCount,
            project.deadline ? new Date(project.deadline).toLocaleDateString('en-IN') : '-',
          ]),
        },
      ],
    })
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-neutral-950/15 bg-neutral-950 text-white shadow-[0_30px_90px_-64px_rgba(0,0,0,0.92)]">
        <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/60">
              Delivery workspace
            </div>
            <div className="mt-5 space-y-3">
              <h1 className="text-3xl font-semibold tracking-normal text-white sm:text-4xl">
                Projects
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
                Track active delivery, reviews, deadlines, budgets, and task load from one operating view.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row xl:justify-end [&_[data-slot=button]]:rounded-lg [&_[data-slot=button]]:border-white/15 [&_[data-slot=button]]:bg-white/10 [&_[data-slot=button]]:text-white [&_[data-slot=button]]:shadow-none [&_[data-slot=button]:hover]:bg-white/20">
            <ExportMenu onCsv={handleCsvExport} onPdf={handlePdfExport} />
            <AddProjectDialog />
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:col-span-2">
            <HeroMetric label="Active delivery" value={activeProjects.length} detail={`${taskTotal} total tasks`} />
            <HeroMetric label="Budget logged" value={formatINR(budgetTotal)} detail="Across current project book" />
            <HeroMetric
              label="Next deadline"
              value={nextDeadline ? formatDate(nextDeadline.deadline, { day: '2-digit', month: 'short' }) : 'Clear'}
              detail={nextDeadline?.name ?? 'No active deadline'}
            />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Project book" value={projectRecords.length} detail={`${filtered.length} in current view`} icon={FolderOpen} />
        <SummaryCard label="In motion" value={activeProjects.length} detail="In progress or review" icon={Clock3} />
        <SummaryCard label="Completed" value={completed.length} detail="Delivered work" icon={CheckCircle2} tone="success" />
        <SummaryCard label="Needs attention" value={overdue.length + onHold.length} detail={`${overdue.length} overdue, ${onHold.length} on hold`} icon={PauseCircle} tone="danger" />
      </section>

      <section className="rounded-lg border border-border/80 bg-white/90 p-3 shadow-[0_22px_70px_-58px_rgba(0,0,0,0.72)] backdrop-blur">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search project or client..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 rounded-lg border-border/90 bg-white pl-9 text-sm shadow-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[180px_180px_auto] xl:flex xl:items-center">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? 'ALL')}>
              <SelectTrigger className="h-11 w-full rounded-lg border-border/90 bg-white shadow-none sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All status</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusMeta[status].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value ?? 'ALL')}>
              <SelectTrigger className="h-11 w-full rounded-lg border-border/90 bg-white shadow-none sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                {typeOptions.map((type) => (
                  <SelectItem key={type} value={type}>
                    {formatEnum(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex h-11 items-center gap-2 rounded-lg border border-border/80 bg-muted/40 px-3 text-xs text-muted-foreground">
              <ListFilter className="h-4 w-4" />
              <span>{filtered.length} of {projectRecords.length} projects</span>
            </div>
          </div>
        </div>
      </section>

      {projectRecords.length === 0 ? (
        <EmptyProjectsState />
      ) : (
        <Tabs defaultValue="grid" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="rounded-lg">
              <TabsTrigger value="grid" className="gap-2">
                <FolderKanban className="h-4 w-4" />
                Grid
              </TabsTrigger>
              <TabsTrigger value="board" className="gap-2">
                <KanbanSquare className="h-4 w-4" />
                Board
              </TabsTrigger>
            </TabsList>
            <p className="text-xs text-muted-foreground">
              {dueSoon.length} due this week / {overdue.length} overdue
            </p>
          </div>

          <TabsContent value="grid" className="mt-0">
            {filtered.length === 0 ? (
              <FilteredEmptyState />
            ) : (
              <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onClick={() => router.push(`/projects/${project.id}`)}
                  />
                ))}
              </section>
            )}
          </TabsContent>

          <TabsContent value="board" className="mt-0">
            <section className="flex gap-4 overflow-x-auto pb-3">
              {statusOptions.map((status) => {
                const meta = statusMeta[status]
                const columnProjects = filtered.filter((project) => project.status === status)

                return (
                  <div
                    key={status}
                    className="min-w-[278px] flex-1 rounded-lg border border-border/80 bg-white/80 p-3 shadow-[0_24px_70px_-62px_rgba(0,0,0,0.72)]"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className={cn('h-2.5 w-2.5 rounded-full', meta.dot)} />
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {meta.label}
                        </p>
                      </div>
                      <Badge variant="outline" className="h-6 rounded-md px-2 text-[11px]">
                        {columnProjects.length}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {columnProjects.map((project) => (
                        <BoardProjectCard
                          key={project.id}
                          project={project}
                          onClick={() => router.push(`/projects/${project.id}`)}
                        />
                      ))}

                      {columnProjects.length === 0 && (
                        <div className="rounded-lg border border-dashed border-border/90 bg-white/60 px-4 py-8 text-center text-xs text-muted-foreground">
                          No projects in this lane
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </section>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

function HeroMetric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/10 p-4 backdrop-blur">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-3 truncate text-3xl font-semibold tracking-normal text-white">{value}</p>
      <p className="mt-2 truncate text-xs text-white/50">{detail}</p>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string
  value: number
  detail: string
  icon: typeof FolderOpen
  tone?: 'neutral' | 'success' | 'danger'
}) {
  const toneClass = {
    neutral: 'bg-white text-foreground',
    success: 'bg-emerald-50 text-emerald-800',
    danger: 'bg-rose-50 text-rose-800',
  }[tone]

  return (
    <div className="rounded-lg border border-border/80 bg-white/90 p-4 shadow-[0_20px_60px_-48px_rgba(0,0,0,0.65)] backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-normal text-foreground">{value}</p>
        </div>
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-lg border border-border/70', toneClass)}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

function EmptyProjectsState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/90 bg-white/75 px-6 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-950 text-white">
        <FolderOpen className="h-6 w-6" />
      </div>
      <p className="mt-4 text-sm font-semibold text-foreground">No projects yet</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
        Create the first delivery record, then track status, tasks, deadlines, and budgets from here.
      </p>
      <div className="mt-5 [&_[data-slot=button]]:rounded-lg">
        <AddProjectDialog />
      </div>
    </div>
  )
}

function FilteredEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/90 bg-white/75 px-6 py-16 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Search className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm font-semibold text-foreground">No projects match this view</p>
      <p className="mt-1 text-xs text-muted-foreground">Try a different search term, status, or type filter.</p>
    </div>
  )
}

function ProjectCard({ project, onClick }: { project: ProjectItem; onClick: () => void }) {
  const status = statusMeta[project.status]
  const StatusIcon = status.icon
  const overdue = isOverdue(project)
  const dueSoon = isDeadlineSoon(project.deadline) && project.status !== 'COMPLETED'

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Open ${project.name}`}
      className={cn(
        'group cursor-pointer rounded-lg border bg-white p-5 shadow-[0_26px_80px_-64px_rgba(0,0,0,0.72)] transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-950/25 hover:shadow-[0_30px_90px_-58px_rgba(0,0,0,0.78)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25',
        status.panel
      )}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', status.dot)} />
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {project.client.companyName}
            </p>
          </div>
          <h2 className="mt-3 line-clamp-2 text-base font-semibold leading-snug text-foreground">
            {project.name}
          </h2>
        </div>

        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-white text-foreground">
          <StatusIcon className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Badge className={cn('rounded-md border text-[10px]', status.badge)}>
          {status.label}
        </Badge>
        <Badge className={cn('rounded-md border text-[10px]', typeMeta[project.type])}>
          {formatEnum(project.type)}
        </Badge>
        {overdue && (
          <Badge className="rounded-md border border-rose-300 bg-rose-50 text-[10px] text-rose-800">
            Overdue
          </Badge>
        )}
        {!overdue && dueSoon && (
          <Badge className="rounded-md border border-amber-300 bg-amber-50 text-[10px] text-amber-800">
            Due soon
          </Badge>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border/80 bg-white/75 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Deadline
          </div>
          <p className="mt-2 truncate text-sm font-semibold text-foreground">
            {formatDate(project.deadline, { day: '2-digit', month: 'short' })}
          </p>
        </div>
        <div className="rounded-lg border border-border/80 bg-white/75 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            Tasks
          </div>
          <p className="mt-2 text-sm font-semibold text-foreground">{project.taskCount}</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/70 pt-4 text-xs text-muted-foreground">
        <span>{project.budgetAgreed ? formatINR(project.budgetAgreed) : 'Budget not set'}</span>
        <span className="inline-flex items-center gap-1 font-medium text-foreground">
          Open
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </article>
  )
}

function BoardProjectCard({ project, onClick }: { project: ProjectItem; onClick: () => void }) {
  return (
    <Card
      className="cursor-pointer rounded-lg border-border/80 bg-white shadow-none transition-all hover:-translate-y-0.5 hover:border-neutral-950/20 hover:shadow-[0_18px_50px_-42px_rgba(0,0,0,0.7)]"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{project.name}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{project.client.companyName}</p>
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Badge className={cn('rounded-md border text-[10px]', typeMeta[project.type])}>
            {formatEnum(project.type)}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="rounded-md border border-border/70 bg-muted/35 p-2">
            <span className="block">Tasks</span>
            <span className="mt-1 block font-semibold text-foreground">{project.taskCount}</span>
          </div>
          <div className="rounded-md border border-border/70 bg-muted/35 p-2">
            <span className="block">Due</span>
            <span className="mt-1 block truncate font-semibold text-foreground">
              {formatDate(project.deadline, { day: '2-digit', month: 'short' })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
