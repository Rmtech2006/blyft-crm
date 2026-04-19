'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  Copy,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  XCircle,
  UserRound,
  Users,
} from 'lucide-react'
import { AddMemberDialog } from '@/components/team/add-member-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { toast } from 'sonner'
import { cn, formatEnum } from '@/lib/utils'

type TeamMember = {
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
  workLinks?: WorkLink[] | null
  college?: string | null
  location?: string | null
  type: 'INTERN' | 'FREELANCER' | 'PART_TIME' | 'FULL_TIME'
  status: 'ACTIVE' | 'ON_LEAVE' | 'OFFBOARDED'
  department?: string | null
  compensationMode?: 'HOURLY' | 'MONTHLY' | 'PROJECT_BASED' | null
  compensationRate?: number | null
  bestFitWorkType?: string | null
  skills: string[]
  projects: unknown[]
}

type WorkLink = {
  label: string
  url: string
}

type FreelancerApplication = {
  id: string
  fullName: string
  photoUrl?: string | null
  email?: string | null
  whatsapp?: string | null
  phone?: string | null
  location?: string | null
  portfolioUrl?: string | null
  behanceUrl?: string | null
  linkedinUrl?: string | null
  workLinks?: WorkLink[] | null
  roleCategories: string[]
  roleSkills: Array<{ category: string; skills: string[] }>
  otherSkill?: string | null
  experienceNotes?: string | null
  availability?: string | null
  expectedRate?: string | null
  bestFitWorkType?: string | null
  submittedAt: number
}

const typeOptions = ['INTERN', 'FREELANCER', 'PART_TIME', 'FULL_TIME'] as const
const statusOptions = ['ACTIVE', 'ON_LEAVE', 'OFFBOARDED'] as const

const typeMeta: Record<TeamMember['type'], string> = {
  INTERN: 'border-cyan-200 bg-cyan-50 text-cyan-800',
  FREELANCER: 'border-violet-200 bg-violet-50 text-violet-800',
  PART_TIME: 'border-amber-200 bg-amber-50 text-amber-800',
  FULL_TIME: 'border-emerald-200 bg-emerald-50 text-emerald-800',
}

const statusMeta: Record<TeamMember['status'], {
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

function getInitials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2)
}

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function whatsappHref(value?: string | null) {
  const digits = value?.replace(/\D/g, '')
  return digits ? `https://wa.me/${digits}` : undefined
}

function formatShortDate(value: number) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  })
}

function visibleProfileLinks(profile: {
  workLinks?: WorkLink[] | null
  portfolioUrl?: string | null
  behanceUrl?: string | null
  linkedinUrl?: string | null
}) {
  const links: Array<{ label: string; href: string; icon: typeof ExternalLink }> = []
  const seen = new Set<string>()

  function add(label: string, href?: string | null) {
    if (!href || seen.has(href)) return
    seen.add(href)
    links.push({ label, href, icon: ExternalLink })
  }

  profile.workLinks?.forEach((link) => add(link.label || 'Work link', link.url))
  add('Portfolio', profile.portfolioUrl)
  add('Behance', profile.behanceUrl)
  add('LinkedIn', profile.linkedinUrl)

  return links
}

function TeamSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[292px] rounded-lg" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[132px] rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-[68px] rounded-lg" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-[260px] rounded-lg" />
        ))}
      </div>
    </div>
  )
}

export default function TeamPage() {
  const router = useRouter()
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  const membersQuery = useQuery(api.team.list)
  const applicationsQuery = useQuery(api.freelancerApplications.listPending)
  const approveApplication = useMutation(api.freelancerApplications.approve)
  const rejectApplication = useMutation(api.freelancerApplications.reject)
  const members = useMemo(() => (membersQuery ?? []) as TeamMember[], [membersQuery])
  const applications = useMemo(() => (applicationsQuery ?? []) as FreelancerApplication[], [applicationsQuery])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()

    return members.filter((member) => {
      const matchType = typeFilter === 'ALL' || member.type === typeFilter
      const matchStatus = statusFilter === 'ALL' || member.status === statusFilter
      const haystack = [
        member.fullName,
        member.roleTitle,
        member.department,
        member.email,
        member.whatsapp,
        member.phone,
        member.location,
        member.portfolioUrl,
        member.behanceUrl,
        member.linkedinUrl,
        ...((member.workLinks ?? []).flatMap((link) => [link.label, link.url])),
        ...(member.roleCategories ?? []),
        ...((member.roleSkills ?? []).flatMap((group) => [group.category, ...group.skills])),
        member.otherSkill,
        member.availability,
        member.expectedRate,
        member.bestFitWorkType,
        ...member.skills,
      ].filter(Boolean).join(' ').toLowerCase()

      return matchType && matchStatus && (!query || haystack.includes(query))
    })
  }, [members, search, statusFilter, typeFilter])

  if (membersQuery === undefined) return <TeamSkeleton />

  const active = members.filter((member) => member.status === 'ACTIVE')
  const onLeave = members.filter((member) => member.status === 'ON_LEAVE')
  const linkedProfiles = members.filter((member) => member.portfolioUrl || member.behanceUrl || member.linkedinUrl || member.workLinks?.length)
  const departments = new Set(members.map((member) => member.department).filter(Boolean))
  const projectAssignments = members.reduce((sum, member) => sum + member.projects.length, 0)

  function copyFreelancerLink() {
    const url = `${window.location.origin}/freelancer`
    navigator.clipboard.writeText(url)
    toast.success('Freelancer application link copied')
  }

  async function handleApprove(id: string) {
    setReviewingId(id)
    try {
      await approveApplication({ id: id as Id<'freelancerApplications'> })
      toast.success('Freelancer approved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve application')
    } finally {
      setReviewingId(null)
    }
  }

  async function handleReject(id: string) {
    setReviewingId(id)
    try {
      await rejectApplication({ id: id as Id<'freelancerApplications'> })
      toast.success('Application rejected')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reject application')
    } finally {
      setReviewingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-neutral-950/15 bg-neutral-950 text-white shadow-[0_30px_90px_-64px_rgba(0,0,0,0.92)]">
        <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/60">
              People directory
            </div>
            <div className="mt-5 space-y-3">
              <h1 className="text-3xl font-semibold tracking-normal text-white sm:text-4xl">
                Team Profile OS
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
                Keep roles, ownership, contact paths, links, and payment context ready for internal operations.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-start gap-2 xl:justify-end [&_[data-slot=button]]:rounded-lg [&_[data-slot=button]]:border-white/15 [&_[data-slot=button]]:bg-white/10 [&_[data-slot=button]]:text-white [&_[data-slot=button]]:shadow-none [&_[data-slot=button]:hover]:bg-white/20">
            <Button type="button" size="sm" variant="outline" onClick={copyFreelancerLink}>
              <Copy className="mr-1 h-4 w-4" />
              Freelancer Link
            </Button>
            <AddMemberDialog />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:col-span-2 xl:grid-cols-4">
            <HeroMetric label="Active team" value={active.length} detail={`${members.length} total profiles`} />
            <HeroMetric label="On leave" value={onLeave.length} detail="Availability watch" />
            <HeroMetric label="Departments" value={departments.size} detail="Operating groups" />
            <HeroMetric label="Linked profiles" value={linkedProfiles.length} detail="Portfolio or social ready" />
          </div>
        </div>
      </section>

      {applications.length > 0 && (
        <section className="rounded-lg border border-neutral-950/10 bg-white p-5 shadow-[0_24px_80px_-62px_rgba(0,0,0,0.72)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Freelancer applications
              </p>
              <h2 className="mt-2 text-xl font-semibold text-foreground">Pending review</h2>
            </div>
            <p className="text-sm text-muted-foreground">{applications.length} waiting for approval</p>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {applications.map((application) => (
              <FreelancerApplicationCard
                key={application.id}
                application={application}
                reviewing={reviewingId === application.id}
                onApprove={() => handleApprove(application.id)}
                onReject={() => handleReject(application.id)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total people" value={members.length} detail={`${filtered.length} in current view`} icon={Users} />
        <SummaryCard label="Project seats" value={projectAssignments} detail="Assignments across delivery" icon={BriefcaseBusiness} />
        <SummaryCard label="Contact-ready" value={members.filter((member) => member.email || member.whatsapp).length} detail="Email or WhatsApp saved" icon={Mail} />
        <SummaryCard label="Active coverage" value={`${members.length ? Math.round((active.length / members.length) * 100) : 0}%`} detail="Available team ratio" icon={ShieldCheck} />
      </section>

      <section className="rounded-lg border border-border/80 bg-white/90 p-3 shadow-[0_22px_70px_-58px_rgba(0,0,0,0.72)] backdrop-blur">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search member, role, skill, email, link..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 rounded-lg border-border/90 bg-white pl-9 text-sm shadow-none"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[180px_180px] xl:flex xl:items-center">
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value ?? 'ALL')}>
              <SelectTrigger className="h-11 w-full rounded-lg border-border/90 bg-white shadow-none sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                {typeOptions.map((type) => (
                  <SelectItem key={type} value={type}>{formatEnum(type)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? 'ALL')}>
              <SelectTrigger className="h-11 w-full rounded-lg border-border/90 bg-white shadow-none sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All status</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>{statusMeta[status].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {members.length === 0 ? (
        <EmptyTeamState />
      ) : filtered.length === 0 ? (
        <FilteredEmptyState />
      ) : (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((member) => (
            <MemberCard key={member.id} member={member} onOpen={() => router.push(`/team/${member.id}`)} />
          ))}
        </section>
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

function FreelancerApplicationCard({
  application,
  reviewing,
  onApprove,
  onReject,
}: {
  application: FreelancerApplication
  reviewing: boolean
  onApprove: () => void
  onReject: () => void
}) {
  const whatsApp = whatsappHref(application.whatsapp)
  const visibleLinks = visibleProfileLinks(application)
  const populatedSkillGroups = application.roleSkills.filter((group) => group.skills.length > 0)

  return (
    <article className="rounded-lg border border-border/80 bg-white p-4 shadow-[0_18px_60px_-52px_rgba(0,0,0,0.65)]">
      <div className="flex items-start gap-4">
        <ProfilePhoto member={application} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-800">
              Pending
            </span>
            <span className="text-xs text-muted-foreground">Submitted {formatShortDate(application.submittedAt)}</span>
          </div>
          <h3 className="mt-2 truncate text-base font-semibold text-foreground">{application.fullName}</h3>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {application.roleCategories.join(', ')}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {application.email && <ContactLink href={`mailto:${application.email}`} label="Email" icon={Mail} />}
        {whatsApp && <ContactLink href={whatsApp} label="WhatsApp" icon={MessageCircle} />}
        {application.location && (
          <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/70 px-2.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {application.location}
          </span>
        )}
      </div>

      {visibleLinks.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {visibleLinks.map((link) => (
            <ContactLink key={link.label} href={link.href} label={link.label} icon={link.icon} />
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {application.roleCategories.map((category) => (
          <Badge key={category} variant="outline" className="rounded-md text-[10px]">
            {category}
          </Badge>
        ))}
      </div>

      {populatedSkillGroups.length > 0 && (
        <div className="mt-4 grid gap-2">
          {populatedSkillGroups.map((group) => (
            <div key={group.category} className="rounded-lg border border-border/70 bg-muted/30 p-3">
              <p className="text-xs font-semibold text-foreground">{group.category}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {group.skills.map((skill) => (
                  <span key={`${group.category}-${skill}`} className="rounded-md bg-white px-2 py-1 text-[10px] text-muted-foreground">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {(application.otherSkill || application.availability || application.expectedRate || application.bestFitWorkType) && (
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <MiniStat label="Other skill" value={application.otherSkill ?? '-'} />
          <MiniStat label="Availability" value={application.availability ?? '-'} />
          <MiniStat label="Expected rate" value={application.expectedRate ?? '-'} />
          <MiniStat label="Best fit" value={application.bestFitWorkType ?? '-'} />
        </div>
      )}

      {application.experienceNotes && (
        <p className="mt-4 line-clamp-3 rounded-lg border border-border/70 bg-muted/25 p-3 text-xs leading-5 text-muted-foreground">
          {application.experienceNotes}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={onReject} disabled={reviewing}>
          <XCircle className="mr-1 h-4 w-4" />
          Reject
        </Button>
        <Button type="button" size="sm" className="rounded-lg" onClick={onApprove} disabled={reviewing}>
          <Check className="mr-1 h-4 w-4" />
          {reviewing ? 'Reviewing...' : 'Approve'}
        </Button>
      </div>
    </article>
  )
}

function SummaryCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string
  value: string | number
  detail: string
  icon: typeof Users
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-white/90 p-4 shadow-[0_20px_60px_-48px_rgba(0,0,0,0.65)] backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-normal text-foreground">{value}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 bg-white text-foreground">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

function MemberCard({ member, onOpen }: { member: TeamMember; onOpen: () => void }) {
  const whatsApp = whatsappHref(member.whatsapp)
  const status = statusMeta[member.status]
  const visibleLinks = visibleProfileLinks(member)

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
      className="group cursor-pointer rounded-lg border border-border/80 bg-white p-5 shadow-[0_26px_80px_-64px_rgba(0,0,0,0.72)] transition-all hover:-translate-y-0.5 hover:border-neutral-950/25 hover:shadow-[0_30px_90px_-58px_rgba(0,0,0,0.78)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
    >
      <div className="flex items-start gap-4">
        <ProfilePhoto member={member} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', status.dot)} />
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {member.department ?? 'Unassigned department'}
            </p>
          </div>
          <h2 className="mt-2 truncate text-base font-semibold text-foreground">{member.fullName}</h2>
          <p className="mt-1 truncate text-sm text-muted-foreground">{member.roleTitle ?? member.type.replace('_', ' ')}</p>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge className={cn('rounded-md border text-[10px]', status.badge)}>{status.label}</Badge>
        <Badge className={cn('rounded-md border text-[10px]', typeMeta[member.type])}>{formatEnum(member.type)}</Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <MiniStat label="Projects" value={member.projects.length} />
        <MiniStat
          label="Compensation"
          value={member.compensationRate ? formatINR(member.compensationRate) : '-'}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {member.email && <ContactLink href={`mailto:${member.email}`} label="Email" icon={Mail} />}
        {whatsApp && <ContactLink href={whatsApp} label="WhatsApp" icon={MessageCircle} />}
        {member.location && (
          <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/70 px-2.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {member.location}
          </span>
        )}
      </div>

      {visibleLinks.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border/70 pt-4">
          {visibleLinks.map((link) => (
            <ContactLink key={link.label} href={link.href} label={link.label} icon={link.icon} />
          ))}
        </div>
      )}

      {member.skills.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {member.skills.slice(0, 4).map((skill) => (
            <span key={skill} className="rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground">{skill}</span>
          ))}
          {member.skills.length > 4 && (
            <span className="rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground">+{member.skills.length - 4}</span>
          )}
        </div>
      )}
    </article>
  )
}

function ProfilePhoto({ member, size = 'md' }: { member: { fullName: string; photoUrl?: string | null }; size?: 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-14 w-14 text-base' : 'h-11 w-11 text-sm'

  return (
    <div className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-950 font-semibold text-white', sizeClass)}>
      {member.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={member.photoUrl} alt={member.fullName} className="h-full w-full object-cover" />
      ) : (
        getInitials(member.fullName)
      )}
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/80 bg-muted/35 p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

function ContactLink({ href, label, icon: Icon }: { href: string; label: string; icon: typeof Mail }) {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      onClick={(event) => event.stopPropagation()}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/70 bg-white px-2.5 text-xs font-medium text-foreground transition-colors hover:border-neutral-950/25"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </a>
  )
}

function EmptyTeamState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/90 bg-white/75 px-6 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-950 text-white">
        <Users className="h-6 w-6" />
      </div>
      <p className="mt-4 text-sm font-semibold text-foreground">No team members yet</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
        Add the first profile with contact details, links, skills, and payment context.
      </p>
      <div className="mt-5 [&_[data-slot=button]]:rounded-lg">
        <AddMemberDialog />
      </div>
    </div>
  )
}

function FilteredEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/90 bg-white/75 px-6 py-16 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <UserRound className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm font-semibold text-foreground">No profiles match this view</p>
      <p className="mt-1 text-xs text-muted-foreground">Try a different search term, type, or status filter.</p>
    </div>
  )
}
