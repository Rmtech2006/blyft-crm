'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { AddTemplateDialog } from '@/components/templates/add-template-dialog'
import { UseTemplateDialog } from '@/components/templates/use-template-dialog'
import { EditTemplateDialog } from '@/components/templates/edit-template-dialog'
import { VersionHistoryDialog } from '@/components/templates/version-history-dialog'
import { toast } from 'sonner'
import { Lock, Unlock, BarChart3, Pencil, History, Trash2 } from 'lucide-react'

const categoryColors: Record<string, string> = {
  CLIENT_COMMS: 'bg-primary/15 text-primary',
  LEAD_FOLLOWUP: 'bg-emerald-500/15 text-emerald-500',
  INTERNAL: 'bg-muted text-muted-foreground',
  FINANCE: 'bg-amber-500/15 text-amber-500',
  SOCIAL: 'bg-pink-500/15 text-pink-500',
  PROPOSAL: 'bg-violet-500/15 text-violet-500',
}

export default function TemplatesPage() {
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null)
  const [historyTemplate, setHistoryTemplate] = useState<string | null>(null)

  const templates = useQuery(api.templates.list) ?? []
  const toggleLock = useMutation(api.templates.toggleLock)
  const removeTemplate = useMutation(api.templates.remove)

  const filtered = templates.filter((t) => {
    const matchCat = categoryFilter === 'ALL' || t.category === categoryFilter
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.content.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const categories = ['CLIENT_COMMS', 'LEAD_FOLLOWUP', 'INTERNAL', 'FINANCE', 'SOCIAL', 'PROPOSAL']

  async function handleToggleLock(id: string) {
    try {
      await toggleLock({ id: id as Id<'messageTemplates'> })
    } catch {
      toast.error('Failed')
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"?`)) return
    try {
      await removeTemplate({ id: id as Id<'messageTemplates'> })
      toast.success('Deleted')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  const editingTpl = editingTemplate ? templates.find((t) => t.id === editingTemplate) : null
  const historyTpl = historyTemplate ? templates.find((t) => t.id === historyTemplate) : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Message Templates</h1>
        <AddTemplateDialog />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {categories.map((cat) => {
          const count = templates.filter((t) => t.category === cat).length
          return (
            <Card key={cat} className={`cursor-pointer transition-all ${categoryFilter === cat ? 'ring-2 ring-primary' : ''}`} onClick={() => setCategoryFilter(categoryFilter === cat ? 'ALL' : cat)}>
              <CardContent className="p-3">
                <Badge className={`text-[10px] border-0 ${categoryColors[cat]} mb-1`}>{cat.replace('_', ' ')}</Badge>
                <p className="text-lg font-bold">{count}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex gap-3">
        <Input placeholder="Search templates…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? 'ALL')}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No templates found. Create your first one!</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((template) => (
            <Card key={template.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm truncate">{template.title}</CardTitle>
                      {template.isLocked && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
                    </div>
                    <Badge className={`text-[10px] border-0 mt-1 ${categoryColors[template.category]}`}>
                      {template.category.replace('_', ' ')}
                    </Badge>
                  </div>
                  <UseTemplateDialog template={template} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                  {template.content}
                </p>

                {template.variables.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {template.variables.map((v) => (
                      <span key={v} className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-mono">{`{{${v}}}`}</span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1 mt-3 text-[10px] text-muted-foreground">
                  <BarChart3 className="h-3 w-3" />
                  Used {template.usageCount} times
                </div>

                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    title="Edit"
                    disabled={template.isLocked}
                    onClick={() => setEditingTemplate(template.id)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    title="Version history"
                    onClick={() => setHistoryTemplate(template.id)}
                  >
                    <History className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    title={template.isLocked ? 'Unlock' : 'Lock'}
                    onClick={() => handleToggleLock(template.id)}
                  >
                    {template.isLocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive ml-auto"
                    title="Delete"
                    disabled={template.isLocked}
                    onClick={() => handleDelete(template.id, template.title)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editingTpl && (
        <EditTemplateDialog
          template={editingTpl}
          open={!!editingTemplate}
          onClose={() => setEditingTemplate(null)}
        />
      )}

      {historyTpl && (
        <VersionHistoryDialog
          templateId={historyTpl.id}
          open={!!historyTemplate}
          onClose={() => setHistoryTemplate(null)}
        />
      )}
    </div>
  )
}
