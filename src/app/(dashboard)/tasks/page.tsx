'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { AddTaskDialog } from '@/components/tasks/add-task-dialog'
import { ExportMenu } from '@/components/shared/export-menu'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertTriangle,
  Calendar,
  CheckSquare,
  Clock3,
  Search,
  Trash2,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { exportCsv, printReport } from '@/lib/export'
import { formatEnum } from '@/lib/utils'

const statusColumns = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'] as const
type TaskStatus = (typeof statusColumns)[number]

type TaskItem = {
  id: string
  title: string
  status: TaskStatus
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  dueDate?: number | null
  assignee?: { name: string } | null
  project?: { name: string } | null
}

const priorityColors: Record<TaskItem['priority'], string> = {
  CRITICAL: 'bg-red-500 text-white',
  HIGH: 'bg-orange-500/15 text-orange-500',
  MEDIUM: 'bg-primary/15 text-primary',
  LOW: 'bg-muted text-muted-foreground',
}

function isOverdue(dueDate?: number | null) {
  return Boolean(dueDate && dueDate < Date.now())
}

function daysUntil(timestamp?: number | null) {
  if (!timestamp) return null
  return Math.ceil((timestamp - Date.now()) / 86400000)
}

function getTaskWorkflow(task: TaskItem) {
  const days = daysUntil(task.dueDate)

  if (task.status === 'BLOCKED') {
    return {
      rank: 0,
      title: 'Blocked and waiting',
      helper: 'Something is actively stopping progress. Clear the dependency before work stalls further.',
      tone: 'danger',
    }
  }

  if (isOverdue(task.dueDate) && task.status !== 'DONE') {
    return {
      rank: 1,
      title: 'Due date has slipped',
      helper: `${Math.abs(days ?? 0)}d overdue. Reassign, rescope, or reset the due date before this disappears.`,
      tone: 'danger',
    }
  }

  if (task.priority === 'CRITICAL' && task.status !== 'DONE') {
    return {
      rank: 2,
      title: 'Critical work in motion',
      helper: 'This task needs explicit ownership and faster follow-through than the rest of the queue.',
      tone: 'warning',
    }
  }

  if (days !== null && days >= 0 && days <= 1 && task.status !== 'DONE') {
    return {
      rank: 3,
      title: days === 0 ? 'Due today' : 'Due tomorrow',
      helper: 'Keep this task close so the project does not drift at the handoff point.',
      tone: 'warning',
    }
  }

  return {
    rank: 4,
    title: 'Task is moving normally',
    helper: 'No obvious escalation is visible here right now.',
    tone: 'success',
  }
}

function getWorkflowTone(tone: 'danger' | 'warning' | 'success') {
  if (tone === 'danger') return 'border-destructive/25 bg-destructive/5'
  if (tone === 'warning') return 'border-amber-300/80 bg-amber-50/90'
  return 'border-emerald-300/80 bg-emerald-50/90'
}

function TasksSkeleton() {
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

      <div className="flex gap-3 overflow-x-auto pb-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="min-w-[240px] flex-shrink-0 space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TasksPage() {
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null)
  const [activeView, setActiveView] = useState('board')

  const tasksQuery = useQuery(api.tasks.list)
  const removeTask = useMutation(api.tasks.remove)
  const updateStatus = useMutation(api.tasks.updateStatus)
  const tasks = useMemo(() => ((tasksQuery ?? []) as TaskItem[]), [tasksQuery])

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const query = search.trim().toLowerCase()
        const matchPriority = priorityFilter === 'ALL' || task.priority === priorityFilter
        const matchSearch =
          !query ||
          task.title.toLowerCase().includes(query) ||
          (task.assignee?.name ?? '').toLowerCase().includes(query) ||
          (task.project?.name ?? '').toLowerCase().includes(query)

        return matchPriority && matchSearch
      }),
    [priorityFilter, search, tasks]
  )

  const sortedTasks = useMemo(
    () =>
      [...filteredTasks].sort((left, right) => {
        const leftPriority = getTaskWorkflow(left).rank
        const rightPriority = getTaskWorkflow(right).rank

        if (leftPriority !== rightPriority) return leftPriority - rightPriority

        const leftDue = left.dueDate ?? Number.MAX_SAFE_INTEGER
        const rightDue = right.dueDate ?? Number.MAX_SAFE_INTEGER

        if (leftDue !== rightDue) return leftDue - rightDue

        return left.title.localeCompare(right.title)
      }),
    [filteredTasks]
  )

  if (tasksQuery === undefined) return <TasksSkeleton />

  const blockedTasks = tasks.filter((task) => task.status === 'BLOCKED').length
  const overdueTasks = tasks.filter((task) => task.status !== 'DONE' && isOverdue(task.dueDate)).length
  const dueToday = tasks.filter((task) => {
    const days = daysUntil(task.dueDate)
    return days === 0 && task.status !== 'DONE'
  }).length
  const criticalTasks = tasks.filter((task) => task.priority === 'CRITICAL' && task.status !== 'DONE').length
  const inFlightTasks = tasks.filter((task) => task.status !== 'DONE').length

  function handleCsvExport() {
    exportCsv('tasks-export.csv', sortedTasks, [
      { header: 'Task', value: (task) => task.title },
      { header: 'Status', value: (task) => task.status },
      { header: 'Priority', value: (task) => task.priority },
      { header: 'Assignee', value: (task) => task.assignee?.name ?? 'N/A' },
      { header: 'Project', value: (task) => task.project?.name ?? 'N/A' },
      {
        header: 'Due date',
        value: (task) =>
          task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN') : 'N/A',
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
            ['Total tasks', tasks.length],
            ['In flight', inFlightTasks],
            ['Critical tasks', criticalTasks],
            ['Blocked tasks', blockedTasks],
            ['Overdue tasks', overdueTasks],
          ],
        },
        {
          title: 'Task list',
          columns: ['Task', 'Status', 'Priority', 'Assignee', 'Project', 'Due date'],
          rows: sortedTasks.map((task) => [
            task.title,
            formatEnum(task.status),
            formatEnum(task.priority),
            task.assignee?.name ?? 'N/A',
            task.project?.name ?? 'N/A',
            task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN') : 'N/A',
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-eyebrow">Execution workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Tasks</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
            Keep blockers, overdue work, and critical delivery items visible before they roll up into bigger project problems.
          </p>
        </div>
        <div className="flex gap-2">
          <ExportMenu onCsv={handleCsvExport} onPdf={handlePdfExport} />
          <AddTaskDialog />
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.95fr))]">
        <Card className="surface-card">
          <CardContent className="space-y-5 p-6">
            <div>
              <p className="section-eyebrow">Execution desk</p>
              <p className="mt-2 text-[1.9rem] font-semibold tracking-tight">
                The task board should answer what needs intervention today.
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                Start with blocked, overdue, and critical work. Then drop into the board or list once the urgent lane is clear.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="surface-muted p-4">
                <p className="section-eyebrow">Urgent queue</p>
                <p className="mt-3 text-2xl font-semibold tracking-tight">
                  {blockedTasks + overdueTasks + criticalTasks}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Combined blocked, overdue, and critical tasks currently demanding attention.
                </p>
              </div>

              <div className="surface-muted p-4">
                <p className="section-eyebrow">In flight</p>
                <p className="mt-3 text-2xl font-semibold tracking-tight">{inFlightTasks}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Active work still moving through execution or review.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {[
          {
            label: 'Blocked',
            value: blockedTasks,
            helper: 'Tasks that cannot move until a dependency or decision is cleared.',
            icon: AlertTriangle,
            tone:
              blockedTasks > 0
                ? 'border-destructive/25 bg-destructive/5 text-destructive'
                : 'border-border/80 bg-card/80 text-foreground',
          },
          {
            label: 'Overdue',
            value: overdueTasks,
            helper: 'Work with due dates already behind the team’s current pace.',
            icon: Clock3,
            tone:
              overdueTasks > 0
                ? 'border-amber-300/80 bg-amber-50 text-amber-700'
                : 'border-border/80 bg-card/80 text-foreground',
          },
          {
            label: 'Due today',
            value: dueToday,
            helper: 'Tasks closing out today that need follow-through before the day ends.',
            icon: Calendar,
            tone:
              dueToday > 0
                ? 'border-primary/20 bg-primary/5 text-primary'
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
          { label: 'Total', value: tasks.length, icon: CheckSquare, color: 'text-primary' },
          { label: 'Critical', value: criticalTasks, icon: AlertTriangle, color: 'text-destructive' },
          { label: 'Blocked', value: blockedTasks, icon: Clock3, color: 'text-amber-600' },
          { label: 'Done', value: tasks.filter((task) => task.status === 'DONE').length, icon: CheckSquare, color: 'text-emerald-500' },
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
            placeholder="Search tasks, assignee, or project..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value ?? 'ALL')}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Priorities</SelectItem>
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((priority) => (
              <SelectItem key={priority} value={priority}>
                {formatEnum(priority)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Showing {sortedTasks.length} of {tasks.length} tasks
        </p>
      </div>

      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>

        <TabsContent value="board">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20 text-center">
              <CheckSquare className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">No tasks yet</p>
              <p className="mb-4 text-xs text-muted-foreground/60">
                Create your first task to start managing execution properly.
              </p>
              <AddTaskDialog />
            </div>
          ) : (
            <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-3">
              {statusColumns.map((column) => {
                const columnTasks = sortedTasks.filter((task) => task.status === column)

                return (
                  <div key={column} className="min-w-[255px] flex-shrink-0">
                    <div className="mb-2.5 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {formatEnum(column)}
                      </span>
                      <Badge variant="outline" className="h-5 px-1.5 text-xs">
                        {columnTasks.length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {columnTasks.map((task) => {
                        const workflow = getTaskWorkflow(task)
                        const dueDays = daysUntil(task.dueDate)

                        return (
                          <Card
                            key={task.id}
                            className="group border shadow-none transition-colors hover:border-primary/30"
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between gap-2">
                                <Link href={`/tasks/${task.id}`} className="min-w-0 flex-1">
                                  <p className="text-sm font-medium leading-snug transition-colors hover:text-primary">
                                    {task.title}
                                  </p>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="-mr-1 -mt-0.5 h-6 w-6 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive"
                                  onClick={() => setTaskToDelete(task.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>

                              <div className={`mt-3 rounded-[16px] border px-3 py-2 ${getWorkflowTone(workflow.tone)}`}>
                                <p className="text-xs font-medium text-foreground">{workflow.title}</p>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <Badge className={`border-0 text-[10px] ${priorityColors[task.priority]}`}>
                                  {formatEnum(task.priority)}
                                </Badge>
                                {task.project && (
                                  <Badge variant="outline" className="text-[10px]">
                                    {task.project.name}
                                  </Badge>
                                )}
                              </div>

                              {task.assignee && (
                                <div className="mt-2 flex items-center gap-1">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                  <span className="truncate text-xs text-muted-foreground">{task.assignee.name}</span>
                                </div>
                              )}

                              {task.dueDate && (
                                <div className="mt-1 flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(task.dueDate).toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                    })}
                                    {dueDays !== null ? ` • ${dueDays >= 0 ? `${dueDays}d left` : `${Math.abs(dueDays)}d late`}` : ''}
                                  </span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })}
                      {columnTasks.length === 0 && (
                        <div className="rounded-lg border-2 border-dashed p-4 text-center text-xs text-muted-foreground/60">
                          No tasks
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
          {sortedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-16 text-center">
              <CheckSquare className="mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {search || priorityFilter !== 'ALL' ? 'No tasks match your filters' : 'No tasks yet'}
              </p>
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTasks.map((task) => (
                    <TableRow
                      key={task.id}
                      className={task.status === 'BLOCKED' || isOverdue(task.dueDate) ? 'bg-destructive/5' : ''}
                    >
                      <TableCell className="font-medium text-sm">
                        <Link href={`/tasks/${task.id}`} className="transition-colors hover:text-primary">
                          {task.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={task.status}
                          onValueChange={(value) => handleUpdateStatus(task.id, value as TaskStatus)}
                        >
                          <SelectTrigger className="h-7 w-36 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusColumns.map((status) => (
                              <SelectItem key={status} value={status} className="text-xs">
                                {formatEnum(status)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge className={`border-0 text-xs ${priorityColors[task.priority]}`}>
                          {formatEnum(task.priority)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {task.assignee?.name ?? 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {task.project?.name ?? 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setTaskToDelete(task.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
