'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Camera, CheckCircle2, FileText, Link2, ShieldCheck, Upload, X } from 'lucide-react'
import { BlyftLogo } from '@/components/brand/blyft-logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FREELANCER_SKILL_GROUPS } from '@/lib/freelancer-skills'

const schema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  whatsapp: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  portfolioUrl: z.string().optional(),
  behanceUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  otherSkill: z.string().optional(),
  experienceNotes: z.string().optional(),
  availability: z.string().optional(),
  expectedRate: z.string().optional(),
}).superRefine((data, ctx) => {
  if (!data.email && !data.whatsapp) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['whatsapp'],
      message: 'Add email or WhatsApp',
    })
  }
})

type FormData = z.infer<typeof schema>

const intakeNotes = [
  {
    icon: FileText,
    title: 'Profile review',
    description: 'Your submission goes into the BLYFT CRM queue before a team profile is created.',
  },
  {
    icon: Link2,
    title: 'Work links',
    description: 'Portfolio, Behance, and LinkedIn links help the team review your work faster.',
  },
  {
    icon: ShieldCheck,
    title: 'Internal use',
    description: 'Details are used only for team screening, assignment planning, and contact records.',
  },
]

function cleanText(value?: string) {
  const trimmed = value?.trim()
  return trimmed || undefined
}

function normalizeUrl(value?: string) {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

export default function FreelancerPage() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedSkills, setSelectedSkills] = useState<Record<string, string[]>>({})
  const [skillError, setSkillError] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const createApplication = useMutation(api.freelancerApplications.create)
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!photoFile) {
      setPreviewUrl(null)
      return
    }

    const url = URL.createObjectURL(photoFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [photoFile])

  function handleCategoryToggle(category: string) {
    setSkillError(null)
    setSelectedCategories((current) => toggleValue(current, category))
    setSelectedSkills((current) => {
      if (!selectedCategories.includes(category)) return current
      const next = { ...current }
      delete next[category]
      return next
    })
  }

  function handleSkillToggle(category: string, skill: string) {
    setSelectedSkills((current) => ({
      ...current,
      [category]: toggleValue(current[category] ?? [], skill),
    }))
  }

  async function onSubmit(data: FormData) {
    if (selectedCategories.length === 0) {
      setSkillError('Select at least one role category')
      return
    }

    setLoading(true)
    setSubmitError(null)
    setSkillError(null)

    try {
      let photoStorageId: string | undefined

      if (photoFile) {
        const uploadUrl = await generateUploadUrl()
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': photoFile.type },
          body: photoFile,
        })

        if (!response.ok) throw new Error('Photo upload failed')
        const result = await response.json() as { storageId: string }
        photoStorageId = result.storageId
      }

      await createApplication({
        fullName: data.fullName.trim(),
        photoStorageId,
        email: cleanText(data.email),
        whatsapp: cleanText(data.whatsapp),
        phone: cleanText(data.phone),
        location: cleanText(data.location),
        portfolioUrl: normalizeUrl(data.portfolioUrl),
        behanceUrl: normalizeUrl(data.behanceUrl),
        linkedinUrl: normalizeUrl(data.linkedinUrl),
        roleCategories: selectedCategories,
        roleSkills: selectedCategories.map((category) => ({
          category,
          skills: selectedSkills[category] ?? [],
        })),
        otherSkill: cleanText(data.otherSkill),
        experienceNotes: cleanText(data.experienceNotes),
        availability: cleanText(data.availability),
        expectedRate: cleanText(data.expectedRate),
      })

      setSubmitted(true)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not submit application. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="premium-panel px-8 py-10">
          <div className="space-y-4">
            <BlyftLogo variant="white" size="md" priority className="opacity-95" />
            <p className="premium-eyebrow">Freelancer profile received</p>
            <h1 className="font-heading text-4xl font-semibold leading-tight">
              Your profile is queued for review.
            </h1>
            <p className="max-w-lg text-sm leading-7 text-white/72">
              The BLYFT team will review your details inside the CRM before adding you to the active team directory.
            </p>
          </div>
        </section>

        <Card className="surface-card w-full bg-white/92">
          <CardContent className="flex min-h-[420px] flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-700">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="mt-6 text-2xl font-semibold tracking-normal text-foreground">Application submitted</h2>
            <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">
              Your work details are saved for admin approval. You will be contacted through the email or WhatsApp details you provided.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="premium-panel px-8 py-10">
        <div className="flex h-full flex-col justify-between gap-10">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <BlyftLogo variant="white" size="md" priority className="opacity-95" />
              <div>
                <p className="premium-eyebrow text-[10px]">Freelancer intake</p>
                <p className="font-heading text-xl font-semibold">BLYFT CRM</p>
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="font-heading text-4xl font-semibold leading-tight">
                Share your work profile for team review.
              </h1>
              <p className="max-w-lg text-sm leading-7 text-white/72">
                Add your contact details, work links, roles, and skills. Approved profiles are added to the internal Team page.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {intakeNotes.map((item) => {
              const Icon = item.icon

              return (
                <div key={item.title} className="premium-panel-muted px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-white/68">{item.description}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <Card className="surface-card w-full bg-white/94">
        <CardHeader className="pb-5">
          <p className="section-eyebrow">Application details</p>
          <CardTitle className="mt-2 text-3xl">Freelancer profile</CardTitle>
          <p className="text-sm leading-7 text-muted-foreground">
            Fill the details used for internal review, contact, and assignment planning.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="rounded-lg border border-border/80 bg-muted/25 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt="Profile preview" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-7 w-7 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Profile photo</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Upload a clear image for admin review.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                      <Upload className="mr-1 h-4 w-4" />
                      Upload photo
                    </Button>
                    {photoFile && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setPhotoFile(null)}>
                        <X className="mr-1 h-4 w-4" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Full name *</Label>
                <Input placeholder="Your full name" {...register('fullName')} />
                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input placeholder="City, country" {...register('location')} />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="you@example.com" {...register('email')} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input placeholder="+91 98765 43210" {...register('whatsapp')} />
                {errors.whatsapp && <p className="text-xs text-destructive">{errors.whatsapp.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input placeholder="+91 98765 43210" {...register('phone')} />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Portfolio</Label>
                <Input placeholder="portfolio.com/name" {...register('portfolioUrl')} />
              </div>
              <div className="space-y-2">
                <Label>Behance</Label>
                <Input placeholder="behance.net/name" {...register('behanceUrl')} />
              </div>
              <div className="space-y-2">
                <Label>LinkedIn</Label>
                <Input placeholder="linkedin.com/in/name" {...register('linkedinUrl')} />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Work categories *</Label>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Select every role that matches your work. Sub-skills open below each selected category.
                </p>
              </div>
              {skillError && <p className="text-xs text-destructive">{skillError}</p>}
              <div className="grid gap-3">
                {FREELANCER_SKILL_GROUPS.map((group) => {
                  const selected = selectedCategories.includes(group.category)

                  return (
                    <div key={group.category} className="rounded-lg border border-border/80 bg-white p-3">
                      <label className="flex cursor-pointer items-center gap-3">
                        <Checkbox checked={selected} onCheckedChange={() => handleCategoryToggle(group.category)} />
                        <span className="text-sm font-semibold text-foreground">{group.category}</span>
                      </label>

                      {selected && (
                        <div className="mt-3 grid gap-2 pl-7 sm:grid-cols-2">
                          {group.skills.map((skill) => (
                            <label key={skill} className="flex cursor-pointer items-center gap-2 rounded-md border border-border/70 bg-muted/25 px-3 py-2">
                              <Checkbox
                                checked={(selectedSkills[group.category] ?? []).includes(skill)}
                                onCheckedChange={() => handleSkillToggle(group.category, skill)}
                              />
                              <span className="text-xs text-muted-foreground">{skill}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Other skill</Label>
              <Input placeholder="Anything not listed above" {...register('otherSkill')} />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Availability</Label>
                <Input placeholder="For example 20 hours/week or project based" {...register('availability')} />
              </div>
              <div className="space-y-2">
                <Label>Expected rate or project fee</Label>
                <Input placeholder="For example INR 8,000/project" {...register('expectedRate')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Experience notes</Label>
              <Textarea
                rows={4}
                placeholder="Add past work, tools, industries, or anything useful for review."
                {...register('experienceNotes')}
              />
            </div>

            {submitError && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {submitError}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit for review'}
            </Button>

            <p className="text-center text-xs leading-6 text-muted-foreground">
              Applications are reviewed before profiles are added to the BLYFT team directory.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
