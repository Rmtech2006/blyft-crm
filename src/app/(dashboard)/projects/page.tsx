'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { AddProjectDialog } from '@/components/projects/add-project-dialog'
import { ExportMenu } from '@/components/shared/export-menu'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock3,
  FolderOpen,
  PauseCircle,
  Search,
  Target,
} from 'lucide-react'
import { exportCsv, printReport } from '@/lib/export'
import { formatEnum } from '@/lib/utils'

type ProjectStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'ON_HOLD'

type ProjectListItem = {
  id: string
  name: string
  description?: string
  status: ProjectStatus
  type: string
  client: { companyName: string }
  deadline?: number | null
  budgetAgreed?: number | null
  taskCount: number
}

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function daysUntil(timestamp?: number | null) {
  if (!timestamp) return null
  return Math.ceil((timestamp - Date.now()) / 86400000)
}

function getProjectWorkflow(project: ProjectListItem) {
  const deadlineDays = daysUntil(project.deadline)

  if (
    deadlineDays !== null &&
    deadlineDays < 0 &&
    project.status !== 'COMPLETED'
  ) {
    return {
      rank: 0,
      title: 'Delivery date has slipped',
      helper: `${Math.abs(deadlineDays)}d overdue. Reset scope, owners, and the next delivery checkpoint immediately.`,
      tone: 'danger',
    }
  }

  if (project.status === 'ON_HOLD') {
    return {
      rank: 1,
      title: 'Project is waiting on a decision',
      helper: 'Clarify whether this work should be revived, re-scoped, or formally paused with the client.',
      tone: 'warning',
    }
  }

  if (
    deadlineDays !== null &&
    deadlineDays >= 0 &&
    deadlineDays <= 5 &&
    project.status !== 'COMPLETED'
  ) {
    return {
      rank: 2,
      title: 'Deadline is coming up fast',
      helper:
        deadlineDays === 0
          ? 'Delivery checkpoint is due today.'
          : `Delivery checkpoint is ${deadlineDays} day${deadlineDays === 1 ? '' : 's'} away.`,
      tone: 'warning',
    }
  }

  if (project.taskCount === 0 && project.status !== 'COMPLETED') {
    return {
      rank: 3,
      title: 'Execution plan is missing',
      helper: 'This project has no linked tasks yet, which makes ownership and tracking unclear.',
      tone: 'warning',
    }
  }

  if (project.status === 'IN_REVIEW') {
    return {
      rank: 4,
      title: 'Waiting on review and approval',
      helper: 'Use this stage to clear feedback loops and move work toward approval or launch.',
      tone: 'success',
    }
  }

  return {
    rank: 5,
    title: 'Project is moving cleanly',
    helper: 'No obvious delivery blocker is visible from the project board right now.',
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

const statusColors: Record<ProjectStatus, string> = {
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
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.95fr))]">
        <Skeleton className="h-[260px] rounded-[28px]" />
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-[260px] rounded-[28px]" />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-7 w-12" />
              <Skeleton className="mt-2 h-3 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-2 h-3 w-28" />
              <Skeleton className="mt-4 h-16 w-full rounded-2xl" />
              <Skeleton className="mt-4 h-14 w-full rounded-2xl" />
            </CardContent>
          </Card>
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
  const [activeView, setActiveView] = useState('grid')

  const projectsQuery = useQuery(api.projects.list)
  const projects = useMemo(() => ((projectsQuery ?? []) as ProjectListItem[]), [projectsQuery])

  const filteredProjects = useMemo(
    () =>
      projects.filter((project) => {
        const query = search.trim().toLowerCase()
        const matchStatus = statusFilter === 'ALL' || project.status === statusFilter
        const matchType = typeFilter === 'ALL' || project.type === typeFilter
        const matchSearch =
          !query ||
          project.name.toLowerCase().includes(query) ||
          project.client.companyName.toLowerCase().includes(query) ||
          (project.description ?? '').toLowerCase().includes(query)

        return matchStatus && matchType && matchSearch
      }),
    [projects, search, statusFilter, typeFilter]
  )

  const sortedProjects = useMemo(
    () =>
      [...filteredProjects].sort((left, right) => {
        const leftPriority = getProjectWorkflow(left).rank
        const rightPriority = getProjectWorkflow(right).rank

        if (leftPriority !== rightPriority) return leftPriority - rightPriority

        const leftDeadline = left.deadline ?? Number.MAX_SAFE_INTEGER
        const rightDeadline = right.deadline ?? Number.MAX_SAFE_INTEGER

        if (leftDeadline !== rightDeadline) return leftDeadline - rightDeadline

        return left.name.localeCompare(right.name)
      }),
    [filteredProjects]
  )

  if (projectsQuery === undefined) return <ProjectsSkeleton />

  const inProgress = projects.filter((project) => project.status === 'IN_PROGRESS').length
  const completed = projects.filter((project) => project.status === 'COMPLETED').length
  const onHold = projects.filter((project) => project.status === 'ON_HOLD').length
  const inReview = projects.filter((project) => project.status === 'IN_REVIEW').length
  const dueThisWeek = projects.filter((project) => {
    const days = daysUntil(project.deadline)
    return days !== null && days >= 0 && days <= 7 && project.status !== 'COMPLETED'
  }).length
  const atRiskProjects = projects.filter((project) => getProjectWorkflow(project).rank <= 2).length

  function handleCsvExport() {
    exportCsv('projects-export.csv', sortedProjects, [
      { header: 'Project', value: (project) => project.name },
      { header: 'Client', value: (project) => project.client.companyName },
      { header: 'Status', value: (project) => project.status },
      { header: 'Type', value: (project) => project.type },
      { header: 'Task count', value: (project) => project.taskCount },
      {
        header: 'Deadline',
        value: (project) =>
          project.deadline ? new Date(project.deadline).toLocaleDateString('en-IN') : 'N/A',
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
            ['Total projects', projects.length],
            ['In progress', inProgress],
            ['In review', inReview],
            ['Completed', completed],
            ['On hold', onHold],
            ['At risk', atRiskProjects],
          ],
        },
        {
          title: 'Project list',
          columns: ['Project', 'Client', 'Status', 'Type', 'Tasks', 'Deadline'],
          rows: sortedProjects.map((project) => [
            project.name,
            project.client.companyName,
            formatEnum(project.status),
            formatEnum(project.type),
            project.taskCount,
            project.deadline
              ? new Date(project.deadline).toLocaleDateString('en-IN')
              : 'N/A',
          ]),
        },
      ],
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-eyebrow">Delivery workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
            See which client work is on track, approaching review, or slipping past its delivery window.
          </p>
        </div>
        <div className="flex gap-2">
          <ExportMenu onCsv={handleCsvExport} onPdf={handlePdfExport} />
          <AddProjectDialog />
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.95fr))]">
        <Card className="surface-card">
          <CardContent className="space-y-5 p-6">
            <div>
              <p className="section-eyebrow">Project desk</p>
              <p className="mt-2 text-[1.9rem] font-semibold tracking-tight">
                Delivery needs a sharper read before status meetings.
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                Start with at-risk work, then move into review and deadline pressure before you browse the full board.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="surface-muted p-4">
                <p className="section-eyebrow">At-risk projects</p>
                <p className="mt-3 text-2xl font-semibold tracking-tight">{atRiskProjects}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Work that is overdue, on hold, or too close to deadline without much room left.
                </p>
              </div>

              <div className="surface-muted p-4">
                <p className="section-eyebrow">Review and delivery load</p>
                <p className="mt-3 text-2xl font-semibold tracking-tight">
                  {inProgress + inReview}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Active execution plus review queue currently in motion.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {[
          {
            label: 'Due this week',
            value: dueThisWeek,
            helper: 'Deadlines inside the next 7 days that still need clean execution.',
            icon: Calendar,
            tone:
              dueThisWeek > 0
                ? 'border-amber-300/80 bg-amber-50 text-amber-700'
                : 'border-border/80 bg-card/80 text-foreground',
          },
          {
            label: 'Review queue',
            value: inReview,
            helper: 'Projects waiting for approval, feedback, or final sign-off.',
            icon: Target,
            tone:
              inReview > 0
                ? 'border-primary/20 bg-primary/5 text-primary'
                : 'border-border/80 bg-card/80 text-foreground',
          },
          {
            label: 'On hold',
            value: onHold,
            helper: 'Projects paused until scope, payment, or team decisions are resolved.',
            icon: PauseCircle,
            tone:
              onHold > 0
                ? 'border-destructive/25 bg-destructive/5 text-destructive'
                : 'border-border/80 bg-card/80 text-foreground',
          },
        ].map((item) => {
          const Icon = item.icon

          return (
            <Card key={item.label} className="surface-card">
              <CardContent className="space-y-4 p-5">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${item.tone}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="section-eyebrow">{item.label}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight">{item.value}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.helper}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Total', value: projects.length, icon: FolderOpen, color: 'text-primary' },
          { label: 'In Progress', value: inProgress, icon: Clock3, color: 'text-primary' },
          { label: 'Completed', value: completed, icon: CheckCircle, color: 'text-emerald-500' },
          { label: 'At Risk', value: atRiskProjects, icon: AlertTriangle, color: 'text-destructive' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 p-4">
              <Icon className={`h-8 w-8 ${color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects, clients, or scope..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? 'ALL')}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            {['NOT_STARTED', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'ON_HOLD'].map((status) => (
              <SelectItem key={status} value={status}>
                {formatEnum(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value ?? 'ALL')}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {['SOCIAL_MEDIA', 'SEO', 'WEB_DESIGN', 'BRANDING', 'CONTENT', 'ADS', 'OTHER'].map((type) => (
              <SelectItem key={type} value={type}>
                {formatEnum(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Showing {sortedProjects.length} of {projects.length} projects
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20 text-center">
          <FolderOpen className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">No projects yet</p>
          <p className="mb-4 text-xs text-muted-foreground/60">
            Create your first project to start tracking delivery properly.
          </p>
          <AddProjectDialog />
        </div>
      ) : (
        <Tabs value={activeView} onValueChange={setActiveView}>
          <TabsList>
            <TabsTrigger value="grid">Grid</TabsTrigger>
            <TabsTrigger value="board">Board</TabsTrigger>
          </TabsList>

          <TabsContent value="grid">
            {sortedProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-16 text-center">
                <FolderOpen className="mb-3 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No projects match your filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sortedProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onClick={() => router.push(`/projects/${project.id}`)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="board">
            <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-3">
              {(['NOT_STARTED', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'ON_HOLD'] as const).map((column) => {
                const columnProjects = sortedProjects.filter((project) => project.status === column)

                return (
                  <div key={column} className="min-w-[260px] flex-shrink-0">
                    <div className="mb-2.5 flex items-center justify-between">
                      <Badge className={`border-0 text-xs ${statusColors[column]}`}>
                        {formatEnum(column)}
                      </Badge>
                      <Badge variant="outline" className="h-5 px-1.5 text-xs">
                        {columnProjects.length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {columnProjects.map((project) => (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          onClick={() => router.push(`/projects/${project.id}`)}
                          compact
                        />
                      ))}
                      {columnProjects.length === 0 && (
                        <div className="rounded-lg border-2 border-dashed p-4 text-center text-xs text-muted-foreground/60">
                          No projects
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

function ProjectCard({
  project,
  onClick,
  compact = false,
}: {
  project: ProjectListItem
  onClick: () => void
  compact?: boolean
}) {
  const workflow = getProjectWorkflow(project)
  const deadlineDays = daysUntil(project.deadline)

  return (
    <Card
      className="cursor-pointer transition-all hover:border-primary/40 hover:shadow-sm"
      onClick={onClick}
    >
      <CardContent className={compact ? 'p-4' : 'p-5'}>
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="flex-1 text-sm font-semibold leading-tight">{project.name}</h3>
          <Badge className={`shrink-0 border-0 text-xs ${statusColors[project.status]}`}>
            {formatEnum(project.status)}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground">{project.client.companyName}</p>

        <div className={`mt-4 rounded-[18px] border px-3 py-3 ${getWorkflowTone(workflow.tone)}`}>
          <p className="text-xs font-medium text-foreground">{workflow.title}</p>
          {!compact && (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{workflow.helper}</p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge className={`border-0 text-xs ${typeColors[project.type] ?? 'bg-muted text-muted-foreground'}`}>
            {formatEnum(project.type)}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {project.taskCount} task{project.taskCount === 1 ? '' : 's'}
          </Badge>
        </div>

        <div className="mt-4 space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Deadline</span>
            <span>
              {project.deadline
                ? `${new Date(project.deadline).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                  })}${deadlineDays !== null ? ` • ${deadlineDays >= 0 ? `${deadlineDays}d left` : `${Math.abs(deadlineDays)}d late`}` : ''}`
                : 'Not set'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Budget</span>
            <span className="font-medium text-foreground">
              {project.budgetAgreed ? formatINR(project.budgetAgreed) : 'Not set'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
