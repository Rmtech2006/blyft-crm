'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AddTemplateDialog } from '@/components/templates/add-template-dialog'
import { UseTemplateDialog } from '@/components/templates/use-template-dialog'
import { Lock, BarChart3 } from 'lucide-react'

const categoryColors: Record<string, string> = {
  CLIENT_COMMS: 'bg-blue-100 text-blue-700',
  LEAD_FOLLOWUP: 'bg-green-100 text-green-700',
  INTERNAL: 'bg-gray-100 text-gray-700',
  FINANCE: 'bg-yellow-100 text-yellow-700',
  SOCIAL: 'bg-pink-100 text-pink-700',
  PROPOSAL: 'bg-purple-100 text-purple-700',
}

export default function TemplatesPage() {
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  const templates = useQuery(api.templates.list) ?? []

  const filtered = templates.filter((t) => {
    const matchCat = categoryFilter === 'ALL' || t.category === categoryFilter
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.content.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const categories = ['CLIENT_COMMS', 'LEAD_FOLLOWUP', 'INTERNAL', 'FINANCE', 'SOCIAL', 'PROPOSAL']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Message Templates</h1>
        <AddTemplateDialog />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {categories.map((cat) => {
          const count = templates.filter((t) => t.category === cat).length
          return (
            <Card key={cat} className={`cursor-pointer transition-all ${categoryFilter === cat ? 'ring-2 ring-blue-500' : ''}`} onClick={() => setCategoryFilter(categoryFilter === cat ? 'ALL' : cat)}>
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
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
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
                      <span key={v} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-mono">{`{{${v}}}`}</span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1 mt-3 text-[10px] text-muted-foreground">
                  <BarChart3 className="h-3 w-3" />
                  Used {template.usageCount} times
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
