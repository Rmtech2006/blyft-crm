'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AddTaskDialog } from '@/components/tasks/add-task-dialog'
import { Calendar, User, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

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

export default function TasksPage() {
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const tasks = useQuery(api.tasks.list) ?? []
  const removeTask = useMutation(api.tasks.remove)
  const updateStatus = useMutation(api.tasks.updateStatus)

  const filtered = tasks.filter((t) => priorityFilter === 'ALL' || t.priority === priorityFilter)

  async function deleteTask(id: string) {
    if (!confirm('Delete this task?')) return
    try {
      await removeTask({ id: id as Id<'tasks'> })
      toast.success('Deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  async function handleUpdateStatus(id: string, status: TaskStatus) {
    try {
      await updateStatus({ id: id as Id<'tasks'>, status })
    } catch {
      toast.error('Failed to update')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <div className="flex items-center gap-3">
          <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v ?? 'ALL')}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Priority</SelectItem>
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AddTaskDialog />
        </div>
      </div>

      <Tabs defaultValue="board">
        <TabsList>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>

        <TabsContent value="board">
          <div className="grid grid-cols-5 gap-3 overflow-x-auto min-w-0">
            {statusColumns.map((col) => {
              const colTasks = filtered.filter((t) => t.status === col)
              return (
                <div key={col} className="min-w-[200px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{col.replace('_', ' ')}</span>
                    <Badge variant="outline" className="text-xs h-5">{colTasks.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {colTasks.map((task) => (
                      <Card key={task.id} className="shadow-none border">
                        <CardContent className="p-3">
                          <p className="text-xs font-medium leading-snug mb-2">{task.title}</p>
                          <div className="flex items-center justify-between">
                            <Badge className={`text-[10px] border-0 ${priorityColors[task.priority] ?? ''}`}>{task.priority}</Badge>
                          </div>
                          {task.assignee && (
                            <div className="flex items-center gap-1 mt-2">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground truncate">{task.assignee.name}</span>
                            </div>
                          )}
                          {task.dueDate && (
                            <div className="flex items-center gap-1 mt-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(task.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    {colTasks.length === 0 && (
                      <div className="border-2 border-dashed rounded-lg p-4 text-center text-[10px] text-muted-foreground">Empty</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="list">
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
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No tasks found</TableCell></TableRow>
                )}
                {filtered.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium text-sm">{task.title}</TableCell>
                    <TableCell>
                      <Select value={task.status} onValueChange={(v) => handleUpdateStatus(task.id, v as TaskStatus)}>
                        <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {statusColumns.map((s) => (
                            <SelectItem key={s} value={s} className="text-xs">{s.replace('_', ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Badge className={`text-xs border-0 ${priorityColors[task.priority] ?? ''}`}>{task.priority}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{task.assignee?.name ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN') : '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{task.project?.name ?? '—'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => deleteTask(task.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
