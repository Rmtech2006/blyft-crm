'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from 'convex/react'
import { CheckCircle2, Clock3, MessageSquareText, ShieldCheck } from 'lucide-react'
import { api } from '@convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  company: z.string().optional(),
  contactName: z.string().optional(),
  whatsapp: z.string().min(10, 'Enter a valid WhatsApp number'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  serviceType: z.string().optional(),
  source: z.enum(['INSTAGRAM', 'REFERRAL', 'LINKEDIN', 'COLD_EMAIL', 'EVENT', 'WEBSITE', 'OTHER']),
})

type FormData = z.infer<typeof schema>

const intakeNotes = [
  {
    icon: Clock3,
    title: 'Fast response window',
    description: 'Our team reviews new inquiries quickly and usually replies within one business day.',
  },
  {
    icon: MessageSquareText,
    title: 'Clear intake flow',
    description: 'Your details drop directly into the BLYFT CRM so the right team sees them immediately.',
  },
  {
    icon: ShieldCheck,
    title: 'Private and secure',
    description: 'The information you submit stays internal and is used only to continue the conversation.',
  },
]

export default function CapturePage() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const createLead = useMutation(api.leads.create)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { source: 'WEBSITE' },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)

    try {
      await createLead({
        name: data.name,
        company: data.company || undefined,
        contactName: data.contactName || undefined,
        whatsapp: data.whatsapp,
        email: data.email || undefined,
        serviceType: data.serviceType || undefined,
        source: data.source,
        stage: 'LEAD_CAPTURED',
      })
      setSubmitted(true)
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="surface-card hero-noise bg-primary px-8 py-10 text-primary-foreground">
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-primary-foreground/55">
              Inquiry received
            </p>
            <h1 className="font-heading text-4xl font-semibold tracking-tight">
              Thanks for reaching out to BLYFT.
            </h1>
            <p className="max-w-lg text-sm leading-7 text-primary-foreground/72">
              Your request is now in our intake queue and the team will follow up with the next step shortly.
            </p>
          </div>
        </section>

        <Card className="surface-card w-full bg-white/92">
          <CardContent className="flex min-h-[420px] flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-700">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
              Thank you
            </h2>
            <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">
              We have received your inquiry and our team will reach out to you shortly with the next step.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="surface-card hero-noise bg-primary px-8 py-10 text-primary-foreground">
        <div className="flex h-full flex-col justify-between gap-10">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-white text-sm font-black tracking-[0.2em] text-black">
                B
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-primary-foreground/55">
                  Lead intake
                </p>
                <p className="font-heading text-xl font-semibold tracking-tight">BLYFT CRM</p>
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="font-heading text-4xl font-semibold tracking-tight leading-tight">
                Tell us what you need and we will take it from there.
              </h1>
              <p className="max-w-lg text-sm leading-7 text-primary-foreground/72">
                Share a few details about your business or project. Your inquiry will land directly inside our CRM for fast internal routing.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {intakeNotes.map((item) => {
              const Icon = item.icon

              return (
                <div
                  key={item.title}
                  className="rounded-[24px] border border-white/12 bg-white/6 px-4 py-4 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-primary-foreground/68">
                        {item.description}
                      </p>
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
          <p className="section-eyebrow">Start inquiry</p>
          <CardTitle className="mt-2 text-3xl">Get in touch</CardTitle>
          <p className="text-sm leading-7 text-muted-foreground">
            Tell us about your project and we will respond within 24 hours.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label>Your name or brand name *</Label>
              <Input placeholder="For example Rahul Sharma or Indiq Threads" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Company</Label>
              <Input placeholder="Company name (optional)" {...register('company')} />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label>WhatsApp *</Label>
                <Input placeholder="+91 98765 43210" {...register('whatsapp')} />
                {errors.whatsapp && <p className="text-xs text-destructive">{errors.whatsapp.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="you@example.com" {...register('email')} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Service needed</Label>
              <Input placeholder="For example social media, SEO, branding" {...register('serviceType')} />
            </div>

            <div className="space-y-2">
              <Label>How did you find us?</Label>
              <Select defaultValue="WEBSITE" onValueChange={(value) => setValue('source', value as FormData['source'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { value: 'INSTAGRAM', label: 'Instagram' },
                    { value: 'REFERRAL', label: 'Referral' },
                    { value: 'LINKEDIN', label: 'LinkedIn' },
                    { value: 'WEBSITE', label: 'Website' },
                    { value: 'EVENT', label: 'Event' },
                    { value: 'COLD_EMAIL', label: 'Email' },
                    { value: 'OTHER', label: 'Other' },
                  ].map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit inquiry'}
            </Button>

            <p className="text-center text-xs leading-6 text-muted-foreground">
              We will respond within 24 hours. Your information is kept confidential.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
