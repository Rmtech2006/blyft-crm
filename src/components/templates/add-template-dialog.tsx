'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus } from 'lucide-react'

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  category: z.enum(['CLIENT_COMMS', 'LEAD_FOLLOWUP', 'INTERNAL', 'FINANCE', 'SOCIAL', 'PROPOSAL']),
  content: z.string().min(1, 'Content is required'),
})

type FormData = z.infer<typeof schema>

export function AddTemplateDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const createTemplate = useMutation(api.templates.create)

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'CLIENT_COMMS' },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      await createTemplate({
        title: data.title,
        category: data.category,
        content: data.content,
      })
      toast.success('Template created')
      reset()
      setOpen(false)
    } catch {
      toast.error('Failed to create template')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="h-4 w-4 mr-1" /> Add Template
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Create Template</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Title *</Label>
              <Input placeholder="Template name" {...register('title')} />
              {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select defaultValue="CLIENT_COMMS" onValueChange={(v) => setValue('category', v as FormData['category'])}>
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
            <p className="text-xs text-muted-foreground">Use {'{{variable}}'} for dynamic fields, e.g. {'{{clientName}}'}</p>
            <Textarea rows={8} placeholder="Hi {{clientName}},&#10;&#10;..." {...register('content')} />
            {errors.content && <p className="text-xs text-red-500">{errors.content.message}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
