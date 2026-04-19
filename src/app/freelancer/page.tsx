'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Camera, CheckCircle2, FileText, Link2, Plus, ShieldCheck, Trash2, Upload, X } from 'lucide-react'
import { BlyftLogo } from '@/components/brand/blyft-logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { normalizeWorkLinkRows } from '@/lib/freelancer-links.mjs'
import { FREELANCER_SKILL_GROUPS } from '@/lib/freelancer-skills'

const schema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  whatsapp: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  otherSkill: z.string().optional(),
  experienceNotes: z.string().optional(),
  availability: z.string().optional(),
  expectedRate: z.string().optional(),
  bestFitWorkType: z.string().optional(),
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
    title: 'Client opportunities',
    description: 'Share the kind of work you do so we can match your profile with the right client needs.',
  },
  {
    icon: Link2,
    title: 'Proof of work',
    description: 'Add portfolios, live projects, GitHub, demos, Behance, LinkedIn, or any link that shows your best work.',
  },
  {
    icon: ShieldCheck,
    title: 'Reviewed by the team',
    description: 'Every profile is reviewed first. Approved collaborators are contacted for fitting work.',
  },
]

function cleanText(value?: string) {
  const trimmed = value?.trim()
  return trimmed || undefined
}

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

type WorkLinkRow = {
  label: string
  url: string
}

export default function FreelancerPage() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedSkills, setSelectedSkills] = useState<Record<string, string[]>>({})
  const [skillError, setSkillError] = useState<string | null>(null)
  const [workLinks, setWorkLinks] = useState<WorkLinkRow[]>([
    { label: 'Portfolio', url: '' },
    { label: 'LinkedIn', url: '' },
  ])
  const [linkError, setLinkError] = useState<string | null>(null)
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

  function updateWorkLink(index: number, field: keyof WorkLinkRow, value: string) {
    setLinkError(null)
    setWorkLinks((current) => current.map((link, linkIndex) => (
      linkIndex === index ? { ...link, [field]: value } : link
    )))
  }

  function addWorkLink() {
    setLinkError(null)
    setWorkLinks((current) => [...current, { label: 'Work link', url: '' }])
  }

  function removeWorkLink(index: number) {
    setLinkError(null)
    setWorkLinks((current) => current.filter((_, linkIndex) => linkIndex !== index))
  }

  async function onSubmit(data: FormData) {
    if (selectedCategories.length === 0) {
      setSkillError('Select at least one role category')
      return
    }

    let normalizedLinks: WorkLinkRow[]
    try {
      normalizedLinks = normalizeWorkLinkRows(workLinks) as WorkLinkRow[]
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : 'Check your work links')
      return
    }

    setLoading(true)
    setSubmitError(null)
    setSkillError(null)
    setLinkError(null)

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

      const findLink = (label: string) => normalizedLinks.find((link) => link.label.toLowerCase() === label)?.url

      await createApplication({
        fullName: data.fullName.trim(),
        photoStorageId,
        email: cleanText(data.email),
        whatsapp: cleanText(data.whatsapp),
        phone: cleanText(data.phone),
        location: cleanText(data.location),
        portfolioUrl: findLink('portfolio'),
        behanceUrl: findLink('behance'),
        linkedinUrl: findLink('linkedin'),
        workLinks: normalizedLinks,
        roleCategories: selectedCategories,
        roleSkills: selectedCategories.map((category) => ({
          category,
          skills: selectedSkills[category] ?? [],
        })),
        otherSkill: cleanText(data.otherSkill),
        experienceNotes: cleanText(data.experienceNotes),
        availability: cleanText(data.availability),
        expectedRate: cleanText(data.expectedRate),
        bestFitWorkType: cleanText(data.bestFitWorkType),
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
              The BLYFT team will review your details before reaching out for fitting client opportunities.
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
              Your work details are saved for team review. You will be contacted through the email or WhatsApp details you provided.
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
              <p className="premium-eyebrow text-[10px]">Freelancer network</p>
            </div>

            <div className="space-y-3">
              <h1 className="font-heading text-4xl font-semibold leading-tight">
                Work with BLYFT clients. Earn, learn, and grow with us.
              </h1>
              <p className="max-w-lg text-sm leading-7 text-white/72">
                Share your skills, links, and availability for client projects, ongoing collaborations, and high-trust delivery work.
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
            Tell us what you build, create, automate, or manage. The team reviews every profile before contacting collaborators.
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
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Upload a clear image for team review.</p>
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

            <div className="space-y-3">
              <div>
                <Label>Work and profile links</Label>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Add portfolios, GitHub, live websites, app links, SaaS demos, Behance, LinkedIn, or case studies.
                </p>
              </div>
              {linkError && <p className="text-xs text-destructive">{linkError}</p>}
              <div className="grid gap-3">
                {workLinks.map((link, index) => (
                  <div key={index} className="grid gap-2 rounded-lg border border-border/80 bg-muted/20 p-3 sm:grid-cols-[160px_minmax(0,1fr)_auto] sm:items-center">
                    <Input
                      placeholder="Label"
                      value={link.label}
                      onChange={(event) => updateWorkLink(index, 'label', event.target.value)}
                    />
                    <Input
                      placeholder="github.com/name, portfolio.com, app link..."
                      value={link.url}
                      onChange={(event) => updateWorkLink(index, 'url', event.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="justify-self-start rounded-lg text-muted-foreground sm:justify-self-end"
                      onClick={() => removeWorkLink(index)}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={addWorkLink}>
                <Plus className="mr-1 h-4 w-4" />
                Add link
              </Button>
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
              <Label>Best-fit work type</Label>
              <Input placeholder="Project-based, retainer, urgent tasks, ongoing support..." {...register('bestFitWorkType')} />
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
              Profiles are reviewed before anyone is added to the BLYFT collaborator directory.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
