'use client'

import { useEffect, useRef, useState } from 'react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Camera, Pencil, X } from 'lucide-react'

const schema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  roleTitle: z.string().optional(),
  portfolioUrl: z.string().optional(),
  behanceUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  college: z.string().optional(),
  location: z.string().optional(),
  type: z.enum(['INTERN', 'FREELANCER', 'PART_TIME', 'FULL_TIME']),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'OFFBOARDED']),
  department: z.string().optional(),
  startDate: z.string().optional(),
  compensationMode: z.enum(['HOURLY', 'MONTHLY', 'PROJECT_BASED', 'NONE']),
  compensationRate: z.string().optional(),
  skills: z.string().optional(),
})

type FormData = z.infer<typeof schema>

type TeamMemberProfile = {
  id: string
  fullName: string
  photoUrl?: string | null
  phone?: string | null
  whatsapp?: string | null
  email?: string | null
  roleTitle?: string | null
  portfolioUrl?: string | null
  behanceUrl?: string | null
  linkedinUrl?: string | null
  college?: string | null
  location?: string | null
  type: 'INTERN' | 'FREELANCER' | 'PART_TIME' | 'FULL_TIME'
  status: 'ACTIVE' | 'ON_LEAVE' | 'OFFBOARDED'
  department?: string | null
  startDate?: number | null
  compensationMode?: 'HOURLY' | 'MONTHLY' | 'PROJECT_BASED' | null
  compensationRate?: number | null
  skills: string[]
}

function normalizeUrl(value?: string) {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function cleanText(value?: string) {
  const trimmed = value?.trim()
  return trimmed || undefined
}

function formatDateInput(value?: number | null) {
  if (!value) return ''
  return new Date(value).toISOString().split('T')[0]
}

export function EditMemberDialog({ member }: { member: TeamMemberProfile }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(member.photoUrl ?? null)
  const fileRef = useRef<HTMLInputElement>(null)
  const updateMember = useMutation(api.team.update)
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: member.fullName,
      phone: member.phone ?? '',
      whatsapp: member.whatsapp ?? '',
      email: member.email ?? '',
      roleTitle: member.roleTitle ?? '',
      portfolioUrl: member.portfolioUrl ?? '',
      behanceUrl: member.behanceUrl ?? '',
      linkedinUrl: member.linkedinUrl ?? '',
      college: member.college ?? '',
      location: member.location ?? '',
      type: member.type,
      status: member.status,
      department: member.department ?? '',
      startDate: formatDateInput(member.startDate),
      compensationMode: member.compensationMode ?? 'NONE',
      compensationRate: member.compensationRate ? String(member.compensationRate) : '',
      skills: member.skills.join(', '),
    },
  })

  useEffect(() => {
    if (!open) return
    reset({
      fullName: member.fullName,
      phone: member.phone ?? '',
      whatsapp: member.whatsapp ?? '',
      email: member.email ?? '',
      roleTitle: member.roleTitle ?? '',
      portfolioUrl: member.portfolioUrl ?? '',
      behanceUrl: member.behanceUrl ?? '',
      linkedinUrl: member.linkedinUrl ?? '',
      college: member.college ?? '',
      location: member.location ?? '',
      type: member.type,
      status: member.status,
      department: member.department ?? '',
      startDate: formatDateInput(member.startDate),
      compensationMode: member.compensationMode ?? 'NONE',
      compensationRate: member.compensationRate ? String(member.compensationRate) : '',
      skills: member.skills.join(', '),
    })
    setPhotoFile(null)
    setPreviewUrl(member.photoUrl ?? null)
  }, [member, open, reset])

  useEffect(() => {
    if (!photoFile) {
      if (open) setPreviewUrl(member.photoUrl ?? null)
      return
    }

    const url = URL.createObjectURL(photoFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [member.photoUrl, open, photoFile])

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      let photoStorageId: string | undefined

      if (photoFile) {
        const uploadUrl = await generateUploadUrl()
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': photoFile.type },
          body: photoFile,
        })
        const result = await response.json() as { storageId: string }
        photoStorageId = result.storageId
      }

      await updateMember({
        id: member.id as Id<'teamMembers'>,
        fullName: data.fullName.trim(),
        photoStorageId,
        phone: cleanText(data.phone),
        whatsapp: cleanText(data.whatsapp),
        email: cleanText(data.email),
        roleTitle: cleanText(data.roleTitle),
        portfolioUrl: normalizeUrl(data.portfolioUrl),
        behanceUrl: normalizeUrl(data.behanceUrl),
        linkedinUrl: normalizeUrl(data.linkedinUrl),
        college: cleanText(data.college),
        location: cleanText(data.location),
        type: data.type,
        status: data.status,
        department: cleanText(data.department),
        startDate: data.startDate ? new Date(data.startDate).getTime() : undefined,
        compensationMode: data.compensationMode === 'NONE' ? undefined : data.compensationMode,
        compensationRate: data.compensationRate ? parseFloat(data.compensationRate) : undefined,
        skills: data.skills ? data.skills.split(',').map((skill) => skill.trim()).filter(Boolean) : [],
      })
      toast.success('Team member updated')
      setOpen(false)
    } catch {
      toast.error('Failed to update member')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Pencil className="mr-1 h-4 w-4" /> Edit profile
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>Edit Team Member</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="rounded-lg border border-border/80 bg-muted/25 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt={member.fullName} className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-7 w-7 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                    Upload new photo
                  </Button>
                  {photoFile && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setPhotoFile(null)}>
                      <X className="mr-1 h-4 w-4" /> Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Full Name *</Label>
              <Input placeholder="John Doe" {...register('fullName')} />
              {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Role / Title</Label>
              <Input placeholder="Visual Designer" {...register('roleTitle')} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select defaultValue={member.type} onValueChange={(value) => setValue('type', value as FormData['type'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['INTERN', 'FREELANCER', 'PART_TIME', 'FULL_TIME'].map((type) => (
                    <SelectItem key={type} value={type}>{type.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select defaultValue={member.status} onValueChange={(value) => setValue('status', value as FormData['status'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['ACTIVE', 'ON_LEAVE', 'OFFBOARDED'].map((status) => (
                    <SelectItem key={status} value={status}>{status.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Department</Label>
              <Input placeholder="Design, Marketing" {...register('department')} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input placeholder="+91 98765 43210" {...register('phone')} />
            </div>
            <div className="space-y-1">
              <Label>WhatsApp</Label>
              <Input placeholder="+91 98765 43210" {...register('whatsapp')} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" placeholder="john@email.com" {...register('email')} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Portfolio</Label>
              <Input placeholder="portfolio.com/name" {...register('portfolioUrl')} />
            </div>
            <div className="space-y-1">
              <Label>Behance</Label>
              <Input placeholder="behance.net/name" {...register('behanceUrl')} />
            </div>
            <div className="space-y-1">
              <Label>LinkedIn</Label>
              <Input placeholder="linkedin.com/in/name" {...register('linkedinUrl')} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>College</Label>
              <Input placeholder="College or institute" {...register('college')} />
            </div>
            <div className="space-y-1">
              <Label>Location</Label>
              <Input placeholder="City" {...register('location')} />
            </div>
            <div className="space-y-1">
              <Label>Start Date</Label>
              <Input type="date" {...register('startDate')} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Compensation Mode</Label>
              <Select defaultValue={member.compensationMode ?? 'NONE'} onValueChange={(value) => setValue('compensationMode', value as FormData['compensationMode'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  {['HOURLY', 'MONTHLY', 'PROJECT_BASED'].map((mode) => (
                    <SelectItem key={mode} value={mode}>{mode.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Rate (INR)</Label>
              <Input type="number" placeholder="0" {...register('compensationRate')} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Skills (comma-separated)</Label>
            <Input placeholder="Design, Figma, React" {...register('skills')} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save changes'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
