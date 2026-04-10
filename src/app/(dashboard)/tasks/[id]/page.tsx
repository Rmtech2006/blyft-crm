'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Plus, Trash2, Send, Calendar, User, FolderKanban, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { formatEnum } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'

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

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  useSession()

  const task = useQuery(api.tasks.get, { id: id as Id<'tasks'> })
  const updateStatus = useMutation(api.tasks.updateStatus)
  const addSubtask = useMutation(api.tasks.addSubtask)
  const toggleSubtask = useMutation(api.tasks.toggleSubtask)
  const removeSubtask = useMutation(api.tasks.removeSubtask)
  const addComment = useMutation(api.tasks.addComment)
  const removeComment = useMutation(api.tasks.removeComment)

  const [newSubtask, setNewSubtask] = useState('')
  const [comment, setComment] = useState('')
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [postingComment, setPostingComment] = useState(false)

  if (!task) return <div className="p-8 text-center text-muted-foreground">Loading…</div>

  const subtasks = task.subtasks ?? []
  const comments = task.comments ?? []
  const completedCount = subtasks.filter((s) => s.completed).length

  async function handleAddSubtask() {
    if (!newSubtask.trim()) return
    setAddingSubtask(true)
    try {
      await addSubtask({ taskId: id as Id<'tasks'>, title: newSubtask.trim() })
      setNewSubtask('')
    } catch {
      toast.error('Failed to add subtask')
    } finally {
      setAddingSubtask(false)
    }
  }

  async function handlePostComment() {
    if (!comment.trim()) return
    setPostingComment(true)
    try {
      await addComment({ taskId: id as Id<'tasks'>, content: comment.trim() })
      setComment('')
    } catch {
      toast.error('Failed to post comment')
    } finally {
      setPostingComment(false)
    }
  }

  async function handleStatusChange(status: TaskStatus) {
    try {
      await updateStatus({ id: id as Id<'tasks'>, status })
      toast.success(`Status updated to ${formatEnum(status)}`)
    } catch {
      toast.error('Failed to update status')
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">{task.title}</h1>
          {task.project && <p className="text-xs text-muted-foreground mt-0.5">{task.project.name}</p>}
        </div>
        <Select value={task.status} onValueChange={(v) => handleStatusChange(v as TaskStatus)}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'] as TaskStatus[]).map((s) => (
              <SelectItem key={s} value={s} className="text-xs">{formatEnum(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {task.description && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Description</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{task.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Subtasks */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Subtasks</CardTitle>
                {subtasks.length > 0 && (
                  <span className="text-xs text-muted-foreground">{completedCount}/{subtasks.length} done</span>
                )}
              </div>
              {subtasks.length > 0 && (
                <div className="w-full h-1.5 bg-muted rounded-full mt-2">
                  <div
                    className="h-1.5 bg-primary rounded-full transition-all"
                    style={{ width: `${(completedCount / subtasks.length) * 100}%` }}
                  />
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {subtasks.map((s) => (
                <div key={s.id} className="flex items-center gap-2.5 group">
                  <Checkbox
                    checked={s.completed}
                    onCheckedChange={(checked) =>
                      toggleSubtask({ id: s.id as Id<'subtasks'>, completed: !!checked })
                    }
                  />
                  <span className={`flex-1 text-sm ${s.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {s.title}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={() => removeSubtask({ id: s.id as Id<'subtasks'> })}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1">
                <Input
                  placeholder="Add a subtask…"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  className="h-8 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                />
                <Button
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleAddSubtask}
                  disabled={addingSubtask || !newSubtask.trim()}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Comments {comments.length > 0 && `(${comments.length})`}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comments.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No comments yet. Start the discussion.</p>
              )}
              {comments.map((c) => (
                <div key={c.id} className="flex items-start gap-3 group">
                  <div className="h-7 w-7 shrink-0 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                    {c.authorName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{c.authorName}</span>
                      <span className="text-[11px] text-muted-foreground/60">
                        {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90 mt-0.5 leading-snug">{c.content}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => removeComment({ id: c.id as Id<'taskComments'> })}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <div className="flex items-end gap-2 pt-1 border-t border-border">
                <Textarea
                  placeholder="Add a comment…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  className="text-sm resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePostComment()
                  }}
                />
                <Button
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={handlePostComment}
                  disabled={postingComment || !comment.trim()}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar details */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge className={`text-xs border-0 ${statusColors[task.status]}`}>{formatEnum(task.status)}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Priority</span>
                <Badge className={`text-xs border-0 ${priorityColors[task.priority]}`}>{formatEnum(task.priority)}</Badge>
              </div>
              {task.assignee && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" />Assignee</span>
                  <span className="font-medium text-xs">{task.assignee.name}</span>
                </div>
              )}
              {task.dueDate && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Due</span>
                  <span className={`font-medium text-xs ${task.dueDate < Date.now() && task.status !== 'DONE' ? 'text-destructive' : ''}`}>
                    {new Date(task.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              )}
              {task.project && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1"><FolderKanban className="h-3 w-3" />Project</span>
                  <span className="font-medium text-xs">{task.project.name}</span>
                </div>
              )}
              {task.recurringType && task.recurringType !== 'NONE' && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1"><RefreshCw className="h-3 w-3" />Recurring</span>
                  <span className="font-medium text-xs">{formatEnum(task.recurringType)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
