'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, Wand2 } from 'lucide-react'
import { toast } from 'sonner'

interface Template {
  id: string
  title: string
  content: string
  variables: string[]
}

export function UseTemplateDialog({ template }: { template: Template }) {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [filled, setFilled] = useState('')
  const [loading, setLoading] = useState(false)
  const incrementUsage = useMutation(api.templates.incrementUsage)

  function preview() {
    let content = template.content
    for (const [key, value] of Object.entries(values)) {
      content = content.replaceAll(`{{${key}}}`, value)
    }
    setFilled(content)
  }

  async function fillAndCopy() {
    setLoading(true)
    try {
      let content = template.content
      for (const [key, value] of Object.entries(values)) {
        content = content.replaceAll(`{{${key}}}`, value)
      }
      await navigator.clipboard.writeText(content)
      await incrementUsage({ id: template.id as Id<'messageTemplates'> })
      toast.success('Copied to clipboard!')
      setOpen(false)
    } catch {
      toast.error('Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) { setValues({}); setFilled('') } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs">
          <Wand2 className="h-3 w-3 mr-1" /> Use
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Use: {template.title}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {template.variables.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Fill in variables</p>
              {template.variables.map((v) => (
                <div key={v} className="space-y-1">
                  <Label className="text-xs">{v}</Label>
                  <Input
                    placeholder={`Enter ${v}`}
                    value={values[v] ?? ''}
                    onChange={(e) => setValues(prev => ({ ...prev, [v]: e.target.value }))}
                  />
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={preview}>Preview</Button>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Content</p>
            <pre className="text-xs bg-muted rounded-lg p-3 whitespace-pre-wrap max-h-60 overflow-y-auto font-sans">
              {filled || template.content}
            </pre>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={fillAndCopy} disabled={loading}>
              <Copy className="h-4 w-4 mr-1" /> Copy to Clipboard
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
