'use client'

import { ReactElement, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pencil } from 'lucide-react'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  designation: z.string().optional(),
  email: z.string().optional(),
  whatsapp: z.string().optional(),
})

type FormData = z.infer<typeof schema>

type EditableClientContact = {
  id: string
  name: string
  email?: string
  whatsapp?: string
  designation?: string
}

export function EditClientContactDialog({
  contact,
  trigger,
}: {
  contact: EditableClientContact
  trigger?: ReactElement
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const updateContact = useMutation(api.clients.updateContact)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: contact.name,
      designation: contact.designation ?? '',
      email: contact.email ?? '',
      whatsapp: contact.whatsapp ?? '',
    },
  })

  useEffect(() => {
    if (!open) return
    reset({
      name: contact.name,
      designation: contact.designation ?? '',
      email: contact.email ?? '',
      whatsapp: contact.whatsapp ?? '',
    })
  }, [contact, open, reset])

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      await updateContact({
        id: contact.id as Id<'clientContacts'>,
        name: data.name,
        designation: data.designation || undefined,
        email: data.email || undefined,
        whatsapp: data.whatsapp || undefined,
      })
      toast.success('Contact updated')
      setOpen(false)
    } catch {
      toast.error('Failed to update contact')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger render={trigger} />
      ) : (
        <DialogTrigger render={<Button size="sm" variant="outline" />}>
          <Pencil className="h-4 w-4 mr-1" /> Edit
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Name *</Label>
            <Input placeholder="Contact name" {...register('name')} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Designation</Label>
            <Input placeholder="e.g. Founder" {...register('designation')} />
          </div>

          <div className="space-y-1">
            <Label>Email</Label>
            <Input placeholder="name@example.com" {...register('email')} />
          </div>

          <div className="space-y-1">
            <Label>WhatsApp</Label>
            <Input placeholder="+91 98765 43210" {...register('whatsapp')} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Contact'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
