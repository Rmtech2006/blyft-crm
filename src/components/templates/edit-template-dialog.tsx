'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  category: z.enum(['CLIENT_COMMS', 'LEAD_FOLLOWUP', 'INTERNAL', 'FINANCE', 'SOCIAL', 'PROPOSAL']),
  content: z.string().min(1, 'Content is required'),
})

type FormData = z.infer<typeof schema>

interface Template {
  id: string
  title: string
  category: string
  content: string
  variables: string[]
  isLocked: boolean
}

interface Props {
  template: Template
  open: boolean
  onClose: () => void
}

export function EditTemplateDialog({ template, open, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const updateTemplate = useMutation(api.templates.update)

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (open) {
      reset({
        title: template.title,
        category: template.category as FormData['category'],
        content: template.content,
      })
    }
  }, [open, template, reset])

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      await updateTemplate({
        id: template.id as Id<'messageTemplates'>,
        title: data.title,
        category: data.category,
        content: data.content,
      })
      toast.success('Template updated')
      onClose()
    } catch {
      toast.error('Failed to update template')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Edit Template</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Title *</Label>
              <Input placeholder="Template name" {...register('title')} />
              {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select
                defaultValue={template.category}
                onValueChange={(v) => setValue('category', v as FormData['category'])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['CLIENT_COMMS', 'LEAD_FOLLOWUP', 'INTERNAL', 'FINANCE', 'SOCIAL', 'PROPOSAL'].map((c) => (
                    <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Content</Label>
            <p className="text-xs text-muted-foreground">Use {`{{variable}}`} for dynamic fields</p>
            <Textarea rows={8} {...register('content')} />
            {errors.content && <p className="text-xs text-red-500">{errors.content.message}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
