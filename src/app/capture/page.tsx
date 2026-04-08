'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle2 } from 'lucide-react'

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

export default function CapturePage() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const createLead = useMutation(api.leads.create)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
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
        stage: 'NEW_LEAD',
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
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" />
          <div>
            <h2 className="text-xl font-bold">Thank you!</h2>
            <p className="text-muted-foreground text-sm mt-1">
              We've received your inquiry. Our team will reach out to you shortly.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-black text-primary-foreground">B</span>
          </div>
          <span className="font-bold text-lg">BLYFT</span>
        </div>
        <CardTitle className="text-xl">Get in Touch</CardTitle>
        <p className="text-sm text-muted-foreground">Tell us about your project and we'll get back to you within 24 hours.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Your Name / Brand Name *</Label>
            <Input placeholder="e.g. Rahul Sharma / Indiq Threads" {...register('name')} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Company</Label>
            <Input placeholder="Company name (optional)" {...register('company')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>WhatsApp *</Label>
              <Input placeholder="+91 98765 43210" {...register('whatsapp')} />
              {errors.whatsapp && <p className="text-xs text-red-500">{errors.whatsapp.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" placeholder="you@example.com" {...register('email')} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Service Needed</Label>
            <Input placeholder="e.g. Social Media, SEO, Branding…" {...register('serviceType')} />
          </div>

          <div className="space-y-1">
            <Label>How did you find us?</Label>
            <Select defaultValue="WEBSITE" onValueChange={(v) => setValue('source', v as FormData['source'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[
                  { value: 'INSTAGRAM', label: 'Instagram' },
                  { value: 'REFERRAL', label: 'Referral' },
                  { value: 'LINKEDIN', label: 'LinkedIn' },
                  { value: 'WEBSITE', label: 'Website' },
                  { value: 'EVENT', label: 'Event' },
                  { value: 'COLD_EMAIL', label: 'Email' },
                  { value: 'OTHER', label: 'Other' },
                ].map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Submitting…' : 'Submit Inquiry'}
          </Button>

          <p className="text-[11px] text-muted-foreground text-center">
            We'll respond within 24 hours. Your info is kept confidential.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
