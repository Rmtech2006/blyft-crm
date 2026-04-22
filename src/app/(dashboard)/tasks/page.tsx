'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  CircleDot,
  Clock3,
  Flag,
  ListChecks,
  ListFilter,
  Pencil,
  Search,
  ShieldAlert,
  Trash2,
  User,
  Workflow,
} from 'lucide-react'
import { toast } from 'sonner'
import { AddTaskDialog } from '@/components/tasks/add-task-dialog'
import { EditTaskDialog } from '@/components/tasks/edit-task-dialog'
import { ExportMenu } from '@/components/shared/export-menu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { exportCsv, printReport } from '@/lib/export'
import { cn, formatEnum } from '@/lib/utils'

const statusColumns = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'] as const
type TaskStatus = typeof statusColumns[number]
type TaskPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

type TaskItem = {
  id: string
  title: string
  description?: string | null
  status: TaskStatus
  priority: TaskPriority
  dueDate?: number | null
  recurringType?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'NONE' | null
  projectId?: string | null
  assigneeId?: string | null
  assignee?: { name: string } | null
  project?: { name: string } | null
}

const priorityOptions: TaskPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

const statusMeta: Record<TaskStatus, {
  label: string
  dot: string
  badge: string
  panel: string
  icon: typeof CircleDot
}> = {
  TODO: {
    label: 'Todo',
    dot: 'bg-neutral-400',
    badge: 'border-neutral-200 bg-neutral-100 text-neutral-700',
    panel: 'border-neutral-200 bg-neutral-50/70',
    icon: CircleDot,
  },
  IN_PROGRESS: {
    label: 'In progress',
    dot: 'bg-neutral-950',
    badge: 'border-neutral-950/15 bg-neutral-950 text-white',
    panel: 'border-neutral-950/15 bg-white',
    icon: Clock3,
  },
  IN_REVIEW: {
    label: 'In review',
    dot: 'bg-amber-500',
    badge: 'border-amber-300/60 bg-amber-50 text-amber-800',
    panel: 'border-amber-200/70 bg-amber-50/35',
    icon: ListChecks,
  },
  DONE: {
    label: 'Done',
    dot: 'bg-emerald-500',
    badge: 'border-emerald-300/60 bg-emerald-50 text-emerald-800',
    panel: 'border-emerald-200/70 bg-emerald-50/35',
    icon: CheckCircle2,
  },
  BLOCKED: {
    label: 'Blocked',
    dot: 'bg-rose-500',
    badge: 'border-rose-300/70 bg-rose-50 text-rose-800',
    panel: 'border-rose-200/80 bg-rose-50/45',
    icon: ShieldAlert,
  },
}

const priorityMeta: Record<TaskPriority, {
  label: string
  badge: string
  marker: string
}> = {
  CRITICAL: {
    label: 'Critical',
    badge: 'border-rose-300 bg-rose-50 text-rose-800',
    marker: 'bg-rose-500',
  },
  HIGH: {
    label: 'High',
    badge: 'border-amber-300 bg-amber-50 text-amber-800',
    marker: 'bg-amber-500',
  },
  MEDIUM: {
    label: 'Medium',
    badge: 'border-cyan-300 bg-cyan-50 text-cyan-800',
    marker: 'bg-cyan-500',
  },
  LOW: {
    label: 'Low',
    badge: 'border-neutral-200 bg-neutral-100 text-neutral-700',
    marker: 'bg-neutral-400',
  },
}

function formatDate(value?: number | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return 'No due date'

  return new Date(value).toLocaleDateString('en-IN', options ?? {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function startOfToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

function daysUntil(value?: number | null) {
  if (!value) return null
  const dueDate = new Date(value)
  dueDate.setHours(0, 0, 0, 0)
  return Math.ceil((dueDate.getTime() - startOfToday().getTime()) / 86_400_000)
}

function isOverdue(task: TaskItem) {
  const days = daysUntil(task.dueDate)
  return task.status !== 'DONE' && days !== null && days < 0
}

function isDueSoon(task: TaskItem) {
  const days = daysUntil(task.dueDate)
  return task.status !== 'DONE' && days !== null && days >= 0 && days <= 7
}

function needsAttention(task: TaskItem) {
  if (task.status === 'DONE') return false
  return task.status === 'BLOCKED' || task.priority === 'CRITICAL' || isOverdue(task) || isDueSoon(task)
}

function getDueLabel(task: TaskItem) {
  if (task.status === 'DONE') return 'Completed'
  const days = daysUntil(task.dueDate)
  if (days === null) return 'No due date'
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days <= 7) return `Due in ${days}d`
  return formatDate(task.dueDate, { day: '2-digit', month: 'short' })
}

function getTaskTone(task: TaskItem) {
  if (isOverdue(task)) return 'border-rose-300/80 bg-rose-50/60'
  if (task.status === 'BLOCKED') return 'border-rose-300/80 bg-rose-50/60'
  if (task.priority === 'CRITICAL') return 'border-rose-300/70 bg-white'
  return statusMeta[task.status].panel
}

function TasksSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[292px] rounded-lg" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[118px] rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-[68px] rounded-lg" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-[360px] min-w-[280px] rounded-lg" />
        ))}
      </div>
    </div>
  )
}

export default function TasksPage() {
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null)

  const tasks = useQuery(api.tasks.list)
  const taskRecords = useMemo(() => (tasks ?? []) as TaskItem[], [tasks])
  const removeTask = useMutation(api.tasks.remove)
  const updateStatus = useMutation(api.tasks.updateStatus)

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()

    return taskRecords.filter((task) => {
      const matchPriority = priorityFilter === 'ALL' || task.priority === priorityFilter
      const matchSearch =
        !query ||
        task.title.toLowerCase().includes(query) ||
        (task.assignee?.name ?? '').toLowerCase().includes(query) ||
        (task.project?.name ?? '').toLowerCase().includes(query)

      return matchPriority && matchSearch
    })
  }, [priorityFilter, search, taskRecords])

  if (tasks === undefined) return <TasksSkeleton />

  const openTasks = taskRecords.filter((task) => task.status !== 'DONE')
  const inMotion = taskRecords.filter((task) => task.status === 'IN_PROGRESS' || task.status === 'IN_REVIEW')
  const completed = taskRecords.filter((task) => task.status === 'DONE')
  const blocked = taskRecords.filter((task) => task.status === 'BLOCKED')
  const overdue = taskRecords.filter(isOverdue)
  const dueSoon = taskRecords.filter(isDueSoon)
  const critical = taskRecords.filter((task) => task.priority === 'CRITICAL' && task.status !== 'DONE')
  const unassigned = taskRecords.filter((task) => !task.assignee && task.status !== 'DONE')
  const attentionQueue = [...filtered]
    .filter(needsAttention)
    .sort((a, b) => {
      const aScore =
        (isOverdue(a) ? 0 : 10) +
        (a.status === 'BLOCKED' ? 0 : 3) +
        (a.priority === 'CRITICAL' ? 0 : 2) +
        (daysUntil(a.dueDate) ?? 30)
      const bScore =
        (isOverdue(b) ? 0 : 10) +
        (b.status === 'BLOCKED' ? 0 : 3) +
        (b.priority === 'CRITICAL' ? 0 : 2) +
        (daysUntil(b.dueDate) ?? 30)
      return aScore - bScore
    })
    .slice(0, 4)

  function handleCsvExport() {
    exportCsv('tasks-export.csv', filtered, [
      { header: 'Task', value: (task) => task.title },
      { header: 'Status', value: (task) => task.status },
      { header: 'Priority', value: (task) => task.priority },
      { header: 'Assignee', value: (task) => task.assignee?.name ?? '-' },
      { header: 'Project', value: (task) => task.project?.name ?? '-' },
      {
        header: 'Due date',
        value: (task) => (task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN') : '-'),
      },
    ])
  }

  function handlePdfExport() {
    printReport({
      title: 'BLYFT Tasks Report',
      subtitle: `Generated on ${new Date().toLocaleDateString('en-IN')}`,
      sections: [
        {
          title: 'Task summary',
          columns: ['Metric', 'Value'],
          rows: [
            ['Total tasks', taskRecords.length],
            ['Open tasks', openTasks.length],
            ['Filtered tasks', filtered.length],
            ['Critical tasks', critical.length],
            ['Blocked tasks', blocked.length],
            ['Overdue tasks', overdue.length],
            ['Due soon', dueSoon.length],
          ],
        },
        {
          title: 'Task list',
          columns: ['Task', 'Status', 'Priority', 'Assignee', 'Project', 'Due date'],
          rows: filtered.map((task) => [
            task.title,
            formatEnum(task.status),
            formatEnum(task.priority),
            task.assignee?.name ?? '-',
            task.project?.name ?? '-',
            task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN') : '-',
          ]),
        },
      ],
    })
  }

  async function confirmDelete() {
    if (!taskToDelete) return
    try {
      await removeTask({ id: taskToDelete as Id<'tasks'> })
      toast.success('Task deleted')
    } catch {
      toast.error('Failed to delete task')
    } finally {
      setTaskToDelete(null)
    }
  }

  async function handleUpdateStatus(id: string, status: TaskStatus) {
    try {
      await updateStatus({ id: id as Id<'tasks'>, status })
    } catch {
      toast.error('Failed to update status')
    }
  }

  return (
    <div className="space-y-6">
      <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The task will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <section className="overflow-hidden rounded-lg border border-neutral-950/15 bg-neutral-950 text-white shadow-[0_30px_90px_-64px_rgba(0,0,0,0.92)]">
        <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/60">
              Operations desk
            </div>
            <div className="mt-5 space-y-3">
              <h1 className="text-3xl font-semibold tracking-normal text-white sm:text-4xl">
                Task Mission Control
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
                Triage open work, unblock delivery, and keep ownership clear across the task queue.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row xl:justify-end [&_[data-slot=button]]:rounded-lg [&_[data-slot=button]]:border-white/15 [&_[data-slot=button]]:bg-white/10 [&_[data-slot=button]]:text-white [&_[data-slot=button]]:shadow-none [&_[data-slot=button]:hover]:bg-white/20">
            <ExportMenu onCsv={handleCsvExport} onPdf={handlePdfExport} />
            <AddTaskDialog />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:col-span-2 xl:grid-cols-4">
            <HeroMetric label="Open tasks" value={openTasks.length} detail={`${inMotion.length} moving now`} />
            <HeroMetric label="Blocked" value={blocked.length} detail="Needs a decision" />
            <HeroMetric label="Due soon" value={dueSoon.length} detail={`${overdue.length} already overdue`} />
            <HeroMetric label="Completed" value={completed.length} detail="Closed from the board" />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <CommandCard
          label="Attention queue"
          value={attentionQueue.length}
          detail="Critical, blocked, overdue, or close to due"
          icon={AlertTriangle}
          tone="danger"
        />
        <CommandCard
          label="Critical priority"
          value={critical.length}
          detail="High consequence work still open"
          icon={Flag}
          tone="danger"
        />
        <CommandCard
          label="Unassigned work"
          value={unassigned.length}
          detail="Needs a clear owner"
          icon={User}
        />
        <CommandCard
          label="Current view"
          value={filtered.length}
          detail={`${taskRecords.length} tasks in the full queue`}
          icon={ListFilter}
        />
      </section>

      {attentionQueue.length > 0 && (
        <section className="rounded-lg border border-border/80 bg-white/90 p-4 shadow-[0_22px_70px_-58px_rgba(0,0,0,0.72)] backdrop-blur">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Next actions
              </p>
              <h2 className="mt-2 text-lg font-semibold tracking-normal text-foreground">What needs attention first</h2>
            </div>
            <p className="text-xs text-muted-foreground">Sorted by blocked, overdue, critical, and near-due work</p>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {attentionQueue.map((task) => (
              <AttentionTask key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}

      <Tabs defaultValue="board" className="space-y-4">
        <section className="rounded-lg border border-border/80 bg-white/90 p-3 shadow-[0_22px_70px_-58px_rgba(0,0,0,0.72)] backdrop-blur">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search task, owner, or project..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11 rounded-lg border-border/90 bg-white pl-9 text-sm shadow-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[180px_auto_auto] xl:flex xl:items-center">
              <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value ?? 'ALL')}>
                <SelectTrigger className="h-11 w-full rounded-lg border-border/90 bg-white shadow-none sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All priorities</SelectItem>
                  {priorityOptions.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priorityMeta[priority].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex h-11 items-center gap-2 rounded-lg border border-border/80 bg-muted/40 px-3 text-xs text-muted-foreground">
                <ListFilter className="h-4 w-4" />
                <span>{filtered.length} of {taskRecords.length} tasks</span>
              </div>

              <TabsList className="h-11 rounded-lg">
                <TabsTrigger value="board" className="gap-2">
                  <Workflow className="h-4 w-4" />
                  Board
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-2">
                  <ListChecks className="h-4 w-4" />
                  List
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
        </section>

        <TabsContent value="board" className="mt-0">
          {taskRecords.length === 0 ? (
            <EmptyTasksState />
          ) : filtered.length === 0 ? (
            <FilteredEmptyState />
          ) : (
            <section className="flex gap-4 overflow-x-auto pb-3">
              {statusColumns.map((status) => {
                const meta = statusMeta[status]
                const StatusIcon = meta.icon
                const columnTasks = filtered.filter((task) => task.status === status)
                const columnCritical = columnTasks.filter((task) => task.priority === 'CRITICAL').length

                return (
                  <div
                    key={status}
                    className="min-w-[286px] flex-1 rounded-lg border border-border/80 bg-white/80 p-3 shadow-[0_24px_70px_-62px_rgba(0,0,0,0.72)]"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn('h-2.5 w-2.5 rounded-full', meta.dot)} />
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            {meta.label}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {columnCritical ? `${columnCritical} critical` : 'Queue clear of critical items'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-white text-foreground">
                          <StatusIcon className="h-4 w-4" />
                        </span>
                        <Badge variant="outline" className="h-6 rounded-md px-2 text-[11px]">
                          {columnTasks.length}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {columnTasks.map((task) => (
                        <MissionTaskCard
                          key={task.id}
                          task={task}
                          onDelete={() => setTaskToDelete(task.id)}
                        />
                      ))}

                      {columnTasks.length === 0 && (
                        <div className="rounded-lg border border-dashed border-border/90 bg-white/60 px-4 py-8 text-center text-xs text-muted-foreground">
                          No tasks in this lane
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </section>
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-0">
          {filtered.length === 0 ? (
            <FilteredEmptyState />
          ) : (
            <Card className="overflow-hidden rounded-lg border-border/80 bg-white shadow-[0_24px_80px_-64px_rgba(0,0,0,0.72)]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/45 hover:bg-muted/45">
                    <TableHead>Task</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((task) => (
                    <TableRow key={task.id} className="hover:bg-muted/35">
                      <TableCell className="max-w-[320px]">
                        <Link
                          href={`/tasks/${task.id}`}
                          className="line-clamp-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
                        >
                          {task.title}
                        </Link>
                        <p className="mt-1 text-xs text-muted-foreground">{getDueLabel(task)}</p>
                      </TableCell>
                      <TableCell>
                        <Select value={task.status} onValueChange={(value) => handleUpdateStatus(task.id, value as TaskStatus)}>
                          <SelectTrigger className="h-8 w-36 rounded-lg text-xs shadow-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusColumns.map((status) => (
                              <SelectItem key={status} value={status} className="text-xs">
                                {statusMeta[status].label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('rounded-md border text-[10px]', priorityMeta[task.priority].badge)}>
                          {priorityMeta[task.priority].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{task.assignee?.name ?? '-'}</TableCell>
                      <TableCell className={cn('text-sm', isOverdue(task) ? 'font-medium text-rose-700' : 'text-muted-foreground')}>
                        {task.dueDate ? formatDate(task.dueDate, { day: '2-digit', month: 'short' }) : '-'}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                        {task.project?.name ?? '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <EditTaskDialog
                            task={task}
                            trigger={
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground" aria-label={`Edit ${task.title}`}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive"
                            onClick={() => setTaskToDelete(task.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
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

function HeroMetric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/10 p-4 backdrop-blur">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-normal text-white">{value}</p>
      <p className="mt-2 truncate text-xs text-white/50">{detail}</p>
    </div>
  )
}

function CommandCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string
  value: number
  detail: string
  icon: typeof AlertTriangle
  tone?: 'neutral' | 'danger'
}) {
  const iconClass = tone === 'danger'
    ? 'border-rose-200 bg-rose-50 text-rose-800'
    : 'border-border/70 bg-white text-foreground'

  return (
    <div className="rounded-lg border border-border/80 bg-white/90 p-4 shadow-[0_20px_60px_-48px_rgba(0,0,0,0.65)] backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-normal text-foreground">{value}</p>
        </div>
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-lg border', iconClass)}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  )
}

function AttentionTask({ task }: { task: TaskItem }) {
  return (
    <Link
      href={`/tasks/${task.id}`}
      className={cn(
        'group rounded-lg border p-4 transition-all hover:-translate-y-0.5 hover:border-neutral-950/25 hover:shadow-[0_22px_70px_-58px_rgba(0,0,0,0.75)]',
        getTaskTone(task)
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <Badge className={cn('rounded-md border text-[10px]', priorityMeta[task.priority].badge)}>
          {priorityMeta[task.priority].label}
        </Badge>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
      <p className="mt-3 line-clamp-2 text-sm font-semibold leading-snug text-foreground">{task.title}</p>
      <p className={cn('mt-3 text-xs', isOverdue(task) ? 'font-semibold text-rose-700' : 'text-muted-foreground')}>
        {getDueLabel(task)}
      </p>
    </Link>
  )
}

function MissionTaskCard({ task, onDelete }: { task: TaskItem; onDelete: () => void }) {
  const status = statusMeta[task.status]
  const priority = priorityMeta[task.priority]
  const dueWarning = isOverdue(task) || isDueSoon(task)

  return (
    <Card
      className={cn(
        'group rounded-lg border bg-white shadow-none transition-all hover:-translate-y-0.5 hover:border-neutral-950/20 hover:shadow-[0_20px_60px_-48px_rgba(0,0,0,0.72)]',
        getTaskTone(task)
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/tasks/${task.id}`} className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span className={cn('h-2 w-2 rounded-full', priority.marker)} />
              <span className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {task.project?.name ?? 'General task'}
              </span>
            </div>
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors hover:text-primary">
              {task.title}
            </h3>
          </Link>
          <div className="flex shrink-0 gap-1">
            <EditTaskDialog
              task={task}
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-muted-foreground opacity-70 transition-opacity group-hover:opacity-100"
                  aria-label={`Edit ${task.title}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              }
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground opacity-70 transition-opacity hover:text-destructive group-hover:opacity-100"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge className={cn('rounded-md border text-[10px]', priority.badge)}>
            {priority.label}
          </Badge>
          <Badge className={cn('rounded-md border text-[10px]', status.badge)}>
            {status.label}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 rounded-md border border-border/70 bg-white/70 px-3 py-2">
            <User className="h-3.5 w-3.5" />
            <span className="truncate">{task.assignee?.name ?? 'Unassigned'}</span>
          </div>
          <div
            className={cn(
              'flex items-center gap-2 rounded-md border px-3 py-2',
              dueWarning ? 'border-amber-200 bg-amber-50/70 text-amber-800' : 'border-border/70 bg-white/70'
            )}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span className="truncate">{getDueLabel(task)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyTasksState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/90 bg-white/75 px-6 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-950 text-white">
        <ListChecks className="h-6 w-6" />
      </div>
      <p className="mt-4 text-sm font-semibold text-foreground">No tasks yet</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
        Create the first task, assign an owner, and start tracking delivery work from Mission Control.
      </p>
      <div className="mt-5 [&_[data-slot=button]]:rounded-lg">
        <AddTaskDialog />
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
      <p className="mt-4 text-sm font-semibold text-foreground">No tasks match this view</p>
      <p className="mt-1 text-xs text-muted-foreground">Try a different search term or priority filter.</p>
    </div>
  )
}
