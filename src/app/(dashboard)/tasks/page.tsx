'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { AddTaskDialog } from '@/components/tasks/add-task-dialog'
import { Calendar, User, Trash2, CheckSquare, Search } from 'lucide-react'
import { toast } from 'sonner'
import { formatEnum } from '@/lib/utils'
import Link from 'next/link'

const statusColumns = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'] as const
type TaskStatus = typeof statusColumns[number]

const statusColors: Record<string, string> = {
  TODO: 'bg-muted text-muted-foreground',
  IN_PROGRESS: 'bg-primary/15 text-primary',
  IN_REVIEW: 'bg-amber-500/15 text-amber-500',
  DONE: 'bg-emerald-500/15 text-emerald-500',
  BLOCKED: 'bg-destructive/15 text-destructive',
}

const priorityColors: Record<string, string> = {
  CRITICAL: 'bg-red-500 text-white',
  HIGH: 'bg-orange-500/15 text-orange-500',
  MEDIUM: 'bg-primary/15 text-primary',
  LOW: 'bg-muted text-muted-foreground',
}

function TasksSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-3 overflow-x-auto pb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="min-w-[220px] flex-shrink-0 space-y-2">
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

  const tasks = useQuery(api.tasks.list)
  const removeTask = useMutation(api.tasks.remove)
  const updateStatus = useMutation(api.tasks.updateStatus)

  if (tasks === undefined) return <TasksSkeleton />

  const filtered = tasks.filter((t) => {
    const matchPriority = priorityFilter === 'ALL' || t.priority === priorityFilter
    const matchSearch = !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.assignee?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (t.project?.name ?? '').toLowerCase().includes(search.toLowerCase())
    return matchPriority && matchSearch
  })

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
      {/* Delete confirmation dialog */}
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

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <AddTaskDialog />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search tasks, assignee, project…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v ?? 'ALL')}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Priorities</SelectItem>
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
              <SelectItem key={p} value={p}>{formatEnum(p)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="board">
        <TabsList>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>

        <TabsContent value="board">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl">
              <CheckSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No tasks yet</p>
              <p className="text-xs text-muted-foreground/60 mb-4">Create your first task to get started</p>
              <AddTaskDialog />
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1">
              {statusColumns.map((col) => {
                const colTasks = filtered.filter((t) => t.status === col)
                return (
                  <div key={col} className="min-w-[240px] flex-shrink-0">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {formatEnum(col)}
                      </span>
                      <Badge variant="outline" className="text-xs h-5 px-1.5">{colTasks.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {colTasks.map((task) => (
                        <Card key={task.id} className="shadow-none border hover:border-primary/30 transition-colors group">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <Link href={`/tasks/${task.id}`} className="flex-1 min-w-0">
                                <p className="text-sm font-medium leading-snug hover:text-primary transition-colors">{task.title}</p>
                              </Link>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0 -mt-0.5 -mr-1"
                                onClick={() => setTaskToDelete(task.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-1.5 mt-2">
                              <Badge className={`text-[10px] border-0 ${priorityColors[task.priority] ?? ''}`}>
                                {formatEnum(task.priority)}
                              </Badge>
                            </div>
                            {task.assignee && (
                              <div className="flex items-center gap-1 mt-2">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground truncate">{task.assignee.name}</span>
                              </div>
                            )}
                            {task.dueDate && (
                              <div className="flex items-center gap-1 mt-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {new Date(task.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      {colTasks.length === 0 && (
                        <div className="border-2 border-dashed rounded-lg p-4 text-center text-xs text-muted-foreground/60">
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
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl">
              <CheckSquare className="h-8 w-8 text-muted-foreground/40 mb-3" />
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
                  {filtered.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium text-sm">
                        <Link href={`/tasks/${task.id}`} className="hover:text-primary transition-colors">{task.title}</Link>
                      </TableCell>
                      <TableCell>
                        <Select value={task.status} onValueChange={(v) => handleUpdateStatus(task.id, v as TaskStatus)}>
                          <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {statusColumns.map((s) => (
                              <SelectItem key={s} value={s} className="text-xs">{formatEnum(s)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs border-0 ${priorityColors[task.priority] ?? ''}`}>
                          {formatEnum(task.priority)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{task.assignee?.name ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN') : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{task.project?.name ?? '—'}</TableCell>
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
