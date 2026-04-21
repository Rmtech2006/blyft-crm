'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { EditProjectDialog } from '@/components/projects/edit-project-dialog'
import { ManageProjectTeamDialog } from '@/components/projects/manage-project-team-dialog'
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
import { Archive, ArchiveRestore, ArrowLeft, ExternalLink, Calendar, Pencil, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

function formatTimelineDate(value: number) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  })
}

const statusColors: Record<string, string> = {
  NOT_STARTED: 'bg-muted text-muted-foreground',
  IN_PROGRESS: 'bg-primary/15 text-primary',
  IN_REVIEW: 'bg-amber-500/15 text-amber-500',
  COMPLETED: 'bg-emerald-500/15 text-emerald-500',
  ON_HOLD: 'bg-destructive/15 text-destructive',
}

const taskStatusColors: Record<string, string> = {
  TODO: 'bg-muted text-muted-foreground',
  IN_PROGRESS: 'bg-primary/15 text-primary',
  IN_REVIEW: 'bg-amber-500/15 text-amber-500',
  DONE: 'bg-emerald-500/15 text-emerald-500',
  BLOCKED: 'bg-destructive/15 text-destructive',
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const project = useQuery(api.projects.get, { id: id as Id<'projects'> })
  const addMilestone = useMutation(api.projects.addMilestone)
  const toggleMilestone = useMutation(api.projects.toggleMilestone)
  const archiveProject = useMutation(api.projects.archive)
  const restoreProject = useMutation(api.projects.restore)
  const removeProject = useMutation(api.projects.remove)
  const [milestoneForm, setMilestoneForm] = useState({ title: '', dueDate: '' })
  const [addingMilestone, setAddingMilestone] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (!project) return <div className="p-8 text-center text-muted-foreground">Loading...</div>

  async function handleArchiveToggle() {
    try {
      if (project.archivedAt) {
        await restoreProject({ id: id as Id<'projects'> })
        toast.success('Project restored')
      } else {
        await archiveProject({ id: id as Id<'projects'> })
        toast.success('Project archived')
      }
    } catch {
      toast.error(project.archivedAt ? 'Failed to restore project' : 'Failed to archive project')
    }
  }

  async function confirmDeleteProject() {
    try {
      await removeProject({ id: id as Id<'projects'> })
      toast.success('Project deleted')
      router.push('/projects')
    } catch {
      toast.error('Failed to delete project')
    }
  }

  async function handleAddMilestone() {
    if (!milestoneForm.title || !milestoneForm.dueDate) return
    setAddingMilestone(true)
    try {
      await addMilestone({
        projectId: id as Id<'projects'>,
        title: milestoneForm.title,
        dueDate: new Date(milestoneForm.dueDate).getTime(),
      })
      toast.success('Milestone added')
      setMilestoneForm({ title: '', dueDate: '' })
    } catch {
      toast.error('Failed to add milestone')
    } finally {
      setAddingMilestone(false)
    }
  }

  const projectTimelineItems = [
    ...(project.milestones ?? []).map((milestone) => ({
      id: `milestone-${milestone.id}`,
      type: 'Milestone' as const,
      title: milestone.title,
      date: milestone.dueDate,
      state: milestone.completed ? 'Done' : 'Pending',
    })),
    ...(project.tasks ?? [])
      .filter((task) => task.dueDate)
      .map((task) => ({
        id: `task-${task.id}`,
        type: 'Task' as const,
        title: task.title,
        date: task.dueDate!,
        state: task.status.replace('_', ' '),
      })),
  ]
    .sort((a, b) => a.date - b.date)
    .slice(0, 8)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            <Badge className={`border-0 ${statusColors[project.status] ?? ''}`}>{project.status.replace('_', ' ')}</Badge>
            <Badge variant="outline" className="text-xs">{project.type.replace('_', ' ')}</Badge>
            {project.archivedAt && <Badge variant="secondary" className="text-xs">Archived</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{project.client?.companyName}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3 w-3 mr-1" /> Edit
          </Button>
          <Button variant="outline" size="sm" onClick={handleArchiveToggle}>
            {project.archivedAt ? (
              <ArchiveRestore className="h-3 w-3 mr-1" />
            ) : (
              <Archive className="h-3 w-3 mr-1" />
            )}
            {project.archivedAt ? 'Restore' : 'Archive'}
          </Button>
          <Button variant="outline" size="sm" className="text-rose-700 hover:text-rose-700" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-3 w-3 mr-1" /> Delete
          </Button>
          {project.driveFolder && (
            <a href={project.driveFolder} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm"><ExternalLink className="h-3 w-3 mr-1" /> Drive</Button>
            </a>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({project.tasks?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="milestones">Milestones ({project.milestones?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="team">Team ({project.teamMembers?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Project Details</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  ['Client', project.client?.companyName],
                  ['Type', project.type?.replace('_', ' ')],
                  ['Status', project.status?.replace('_', ' ')],
                  ['Start Date', project.startDate ? new Date(project.startDate).toLocaleDateString('en-IN') : null],
                  ['Deadline', project.deadline ? new Date(project.deadline).toLocaleDateString('en-IN') : null],
                  ['Budget', project.budgetAgreed ? formatINR(project.budgetAgreed) : null],
                ].map(([label, value]) => value && (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Description</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.description || 'No description provided'}</p>
              </CardContent>
            </Card>
          </div>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-sm">Project Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {projectTimelineItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No dated tasks or milestones yet.</p>
              ) : (
                <div className="space-y-3">
                  {projectTimelineItems.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 rounded-lg border border-border/80 bg-muted/30 p-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{item.type}</Badge>
                          <span className="text-xs text-muted-foreground">{formatTimelineDate(item.date)}</span>
                        </div>
                        <p className="mt-1 truncate text-sm font-medium">{item.title}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-[10px]">{item.state}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <div className="space-y-2">
            {(project.tasks ?? []).length === 0 && <p className="text-center py-8 text-muted-foreground">No tasks yet</p>}
            {(project.tasks ?? []).map((t) => (
              <Card key={t.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{t.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {t.dueDate && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(t.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge className={`text-xs border-0 ${taskStatusColors[t.status] ?? ''}`}>{t.status.replace('_', ' ')}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="milestones" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Add Milestone</CardTitle></CardHeader>
            <CardContent className="flex gap-3">
              <Input placeholder="Milestone title" value={milestoneForm.title} onChange={(e) => setMilestoneForm(f => ({ ...f, title: e.target.value }))} />
              <Input type="date" className="w-40" value={milestoneForm.dueDate} onChange={(e) => setMilestoneForm(f => ({ ...f, dueDate: e.target.value }))} />
              <Button size="sm" onClick={handleAddMilestone} disabled={addingMilestone}>Add</Button>
            </CardContent>
          </Card>
          <div className="space-y-2">
            {(project.milestones ?? []).map((m) => (
              <Card key={m.id}>
                <CardContent className="p-4 flex items-center gap-3">
                  <Checkbox checked={m.completed} onCheckedChange={(v) => toggleMilestone({ id: m.id as Id<'milestones'>, completed: !!v })} />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${m.completed ? 'line-through text-muted-foreground' : ''}`}>{m.title}</p>
                    <p className="text-xs text-muted-foreground">Due {new Date(m.dueDate).toLocaleDateString('en-IN')}</p>
                  </div>
                  {m.completed && <Badge className="bg-emerald-500/15 text-emerald-500 border-0 text-xs">Done</Badge>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="team">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Assigned team</p>
              <p className="text-xs text-muted-foreground">
                Add or remove people working on this project from here.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setTeamDialogOpen(true)}>
              <Users className="mr-1.5 h-4 w-4" /> Assign team
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(project.teamMembers ?? []).length === 0 && <p className="text-center py-8 text-muted-foreground col-span-2">No team members assigned</p>}
            {(project.teamMembers ?? []).map((ptm) => ptm && (
              <Card key={ptm.teamMember.id}>
                <CardContent className="p-4">
                  <p className="font-medium text-sm">{ptm.teamMember.fullName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{ptm.teamMember.type.replace('_', ' ')}</Badge>
                    {ptm.teamMember.department && <span className="text-xs text-muted-foreground">{ptm.teamMember.department}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <EditProjectDialog project={project} open={editOpen} onClose={() => setEditOpen(false)} />
      <ManageProjectTeamDialog
        projectId={project.id}
        projectName={project.name}
        assignedTeamMembers={project.teamMembers ?? []}
        open={teamDialogOpen}
        onClose={() => setTeamDialogOpen(false)}
      />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {project.name} plus linked tasks, milestones, and team assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProject}>Delete project</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
