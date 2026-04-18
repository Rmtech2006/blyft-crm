'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import {
  ArrowLeft,
  BadgeIndianRupee,
  BriefcaseBusiness,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Receipt,
} from 'lucide-react'
import { EditMemberDialog } from '@/components/team/edit-member-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn, formatEnum } from '@/lib/utils'

type MemberDetail = {
  id: string
  fullName: string
  photoUrl?: string | null
  phone?: string | null
  whatsapp?: string | null
  email?: string | null
  roleTitle?: string | null
  roleCategories?: string[] | null
  roleSkills?: Array<{ category: string; skills: string[] }> | null
  otherSkill?: string | null
  availability?: string | null
  expectedRate?: string | null
  portfolioUrl?: string | null
  behanceUrl?: string | null
  linkedinUrl?: string | null
  college?: string | null
  location?: string | null
  emergencyContact?: string | null
  type: 'INTERN' | 'FREELANCER' | 'PART_TIME' | 'FULL_TIME'
  status: 'ACTIVE' | 'ON_LEAVE' | 'OFFBOARDED'
  department?: string | null
  reportingTo?: string | null
  startDate?: number | null
  compensationMode?: 'HOURLY' | 'MONTHLY' | 'PROJECT_BASED' | null
  compensationRate?: number | null
  paymentMode?: string | null
  bankDetails?: string | null
  upiId?: string | null
  contractStatus?: string | null
  skills: string[]
  projects?: Array<{
    project: {
      id: string
      name: string
      status: string
      type: string
    }
  } | null>
  reimbursements?: Array<{
    id: string
    category: string
    amount: number
    description: string
    date: number
    status: string
  }>
}

const statusMeta: Record<MemberDetail['status'], {
  label: string
  badge: string
  dot: string
}> = {
  ACTIVE: {
    label: 'Active',
    badge: 'border-emerald-300/70 bg-emerald-50 text-emerald-800',
    dot: 'bg-emerald-500',
  },
  ON_LEAVE: {
    label: 'On leave',
    badge: 'border-amber-300/70 bg-amber-50 text-amber-800',
    dot: 'bg-amber-500',
  },
  OFFBOARDED: {
    label: 'Offboarded',
    badge: 'border-neutral-200 bg-neutral-100 text-neutral-700',
    dot: 'bg-neutral-500',
  },
}

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(value?: number | null) {
  return value ? new Date(value).toLocaleDateString('en-IN') : '-'
}

function getInitials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2)
}

function whatsappHref(value?: string | null) {
  const digits = value?.replace(/\D/g, '')
  return digits ? `https://wa.me/${digits}` : undefined
}

function TeamDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[300px] rounded-lg" />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Skeleton className="h-[260px] rounded-lg" />
        <Skeleton className="h-[260px] rounded-lg" />
      </div>
    </div>
  )
}

export default function TeamMemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const member = useQuery(api.team.get, { id: id as Id<'teamMembers'> }) as MemberDetail | null | undefined

  if (member === undefined) return <TeamDetailSkeleton />
  if (!member) return <div className="p-8 text-center text-muted-foreground">Team member not found</div>

  const status = statusMeta[member.status]
  const projects = (member.projects ?? []).filter((item): item is NonNullable<typeof item> => item !== null)
  const reimbursements = member.reimbursements ?? []
  const pendingReimbursements = reimbursements.filter((item) => item.status === 'PENDING')
  const paidReimbursements = reimbursements.filter((item) => item.status === 'PAID')
  const whatsApp = whatsappHref(member.whatsapp)

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-neutral-950/15 bg-neutral-950 text-white shadow-[0_30px_90px_-64px_rgba(0,0,0,0.92)]">
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-lg border border-white/10 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              onClick={() => router.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="[&_[data-slot=button]]:rounded-lg [&_[data-slot=button]]:border-white/15 [&_[data-slot=button]]:bg-white/10 [&_[data-slot=button]]:text-white [&_[data-slot=button]]:shadow-none [&_[data-slot=button]:hover]:bg-white/20">
              <EditMemberDialog member={member} />
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              <ProfilePhoto member={member} />
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
                  <span className={cn('h-2 w-2 rounded-full', status.dot)} />
                  {status.label}
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-normal text-white sm:text-4xl">{member.fullName}</h1>
                <p className="mt-2 text-sm text-white/70">
                  {member.roleTitle ?? formatEnum(member.type)}
                  {member.department ? ` / ${member.department}` : ''}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[430px]">
              <HeroMetric label="Projects" value={projects.length} detail="Assigned delivery" />
              <HeroMetric label="Pending claims" value={pendingReimbursements.length} detail="Needs finance review" />
              <HeroMetric label="Paid claims" value={paidReimbursements.length} detail={formatINR(paidReimbursements.reduce((sum, item) => sum + item.amount, 0))} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="rounded-lg border-border/80 bg-white shadow-[0_20px_70px_-58px_rgba(0,0,0,0.72)]">
            <CardHeader><CardTitle className="text-sm">Contact Desk</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <ContactRow icon={Mail} label="Email" value={member.email} href={member.email ? `mailto:${member.email}` : undefined} />
              <ContactRow icon={MessageCircle} label="WhatsApp" value={member.whatsapp} href={whatsApp} />
              <ContactRow icon={Phone} label="Phone" value={member.phone} href={member.phone ? `tel:${member.phone}` : undefined} />
              <ContactRow icon={MapPin} label="Location" value={member.location} />
            </CardContent>
          </Card>

          <Card className="rounded-lg border-border/80 bg-white shadow-[0_20px_70px_-58px_rgba(0,0,0,0.72)]">
            <CardHeader><CardTitle className="text-sm">Profile Links</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <ContactRow icon={ExternalLink} label="Portfolio" value={member.portfolioUrl ? 'Open portfolio' : undefined} href={member.portfolioUrl ?? undefined} />
              <ContactRow icon={ExternalLink} label="Behance" value={member.behanceUrl ? 'Open Behance' : undefined} href={member.behanceUrl ?? undefined} />
              <ContactRow icon={ExternalLink} label="LinkedIn" value={member.linkedinUrl ? 'Open LinkedIn' : undefined} href={member.linkedinUrl ?? undefined} />
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="rounded-lg">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="projects">Projects ({projects.length})</TabsTrigger>
            <TabsTrigger value="compensation">Compensation</TabsTrigger>
            <TabsTrigger value="reimbursements">Claims ({reimbursements.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-0">
            <div className="grid gap-4 xl:grid-cols-2">
              <InfoPanel
                title="Employment"
                rows={[
                  ['Type', formatEnum(member.type)],
                  ['Status', status.label],
                  ['Role', member.roleTitle],
                  ['Categories', member.roleCategories?.join(', ')],
                  ['Department', member.department],
                  ['Reporting to', member.reportingTo],
                  ['Availability', member.availability],
                  ['Start date', formatDate(member.startDate)],
                  ['Contract', member.contractStatus],
                ]}
              />
              <InfoPanel
                title="Personal"
                rows={[
                  ['College', member.college],
                  ['Location', member.location],
                  ['Emergency contact', member.emergencyContact],
                ]}
              />
            </div>

            <Card className="mt-4 rounded-lg border-border/80 bg-white shadow-[0_20px_70px_-58px_rgba(0,0,0,0.72)]">
              <CardHeader><CardTitle className="text-sm">Skills</CardTitle></CardHeader>
              <CardContent>
                {member.skills.length > 0 || member.roleSkills?.length || member.otherSkill ? (
                  <div className="space-y-3">
                    {member.roleSkills?.map((group) => (
                      <div key={group.category} className="rounded-lg border border-border/70 bg-muted/25 p-3">
                        <p className="text-xs font-semibold text-foreground">{group.category}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {group.skills.length > 0 ? (
                            group.skills.map((skill) => (
                              <span key={`${group.category}-${skill}`} className="rounded-md bg-white px-2 py-1 text-xs text-muted-foreground">{skill}</span>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">No sub-skills selected</span>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2">
                      {member.skills.map((skill) => (
                        <span key={skill} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{skill}</span>
                      ))}
                      {member.otherSkill && (
                        <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">Other: {member.otherSkill}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No skills added</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects" className="mt-0">
            <div className="space-y-3">
              {projects.length === 0 && <EmptyPanel icon={BriefcaseBusiness} label="No projects assigned" />}
              {projects.map((item) => (
                <Card key={item.project.id} className="cursor-pointer rounded-lg border-border/80 bg-white shadow-none transition-all hover:border-neutral-950/20" onClick={() => router.push(`/projects/${item.project.id}`)}>
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{item.project.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatEnum(item.project.type)}</p>
                    </div>
                    <Badge variant="outline" className="rounded-md text-xs">{formatEnum(item.project.status)}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="compensation" className="mt-0">
            <InfoPanel
              title="Compensation Details"
              rows={[
                ['Mode', member.compensationMode ? formatEnum(member.compensationMode) : '-'],
                ['Rate', member.compensationRate ? formatINR(member.compensationRate) : '-'],
                ['Expected rate', member.expectedRate],
                ['Payment mode', member.paymentMode],
                ['UPI ID', member.upiId],
                ['Bank details', member.bankDetails],
              ]}
            />
          </TabsContent>

          <TabsContent value="reimbursements" className="mt-0">
            <div className="space-y-3">
              {reimbursements.length === 0 && <EmptyPanel icon={Receipt} label="No reimbursements" />}
              {reimbursements.map((item) => (
                <Card key={item.id} className="rounded-lg border-border/80 bg-white shadow-none">
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{item.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatEnum(item.category)} / {formatDate(item.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{formatINR(item.amount)}</p>
                      <Badge variant="outline" className="mt-1 rounded-md text-xs">{formatEnum(item.status)}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function ProfilePhoto({ member }: { member: Pick<MemberDetail, 'fullName' | 'photoUrl'> }) {
  return (
    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/15 bg-white/10 text-2xl font-semibold text-white">
      {member.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={member.photoUrl} alt={member.fullName} className="h-full w-full object-cover" />
      ) : (
        getInitials(member.fullName)
      )}
    </div>
  )
}

function HeroMetric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/10 p-4 backdrop-blur">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-3 truncate text-3xl font-semibold tracking-normal text-white">{value}</p>
      <p className="mt-2 truncate text-xs text-white/50">{detail}</p>
    </div>
  )
}

function ContactRow({ icon: Icon, label, value, href }: { icon: typeof Mail; label: string; value?: string | null; href?: string }) {
  const content = (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/25 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <span className="truncate text-right text-sm font-medium text-foreground">{value ?? '-'}</span>
    </div>
  )

  if (!href || !value) return content

  return (
    <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}>
      {content}
    </a>
  )
}

function InfoPanel({ title, rows }: { title: string; rows: Array<[string, string | number | null | undefined]> }) {
  return (
    <Card className="rounded-lg border-border/80 bg-white shadow-[0_20px_70px_-58px_rgba(0,0,0,0.72)]">
      <CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <span className="text-muted-foreground">{label}</span>
            <span className="max-w-[60%] whitespace-pre-wrap text-right font-medium text-foreground">{value || '-'}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function EmptyPanel({ icon: Icon, label }: { icon: typeof BadgeIndianRupee; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/90 bg-white/75 px-6 py-16 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm font-semibold text-foreground">{label}</p>
    </div>
  )
}
