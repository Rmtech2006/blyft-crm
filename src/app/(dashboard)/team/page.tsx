'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AddMemberDialog } from '@/components/team/add-member-dialog'
import { Users, Search } from 'lucide-react'
import { formatEnum } from '@/lib/utils'

const typeColors: Record<string, string> = {
  INTERN: 'bg-primary/15 text-primary',
  FREELANCER: 'bg-violet-500/15 text-violet-500',
  PART_TIME: 'bg-amber-500/15 text-amber-500',
  FULL_TIME: 'bg-emerald-500/15 text-emerald-500',
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/15 text-emerald-500',
  ON_LEAVE: 'bg-amber-500/15 text-amber-500',
  OFFBOARDED: 'bg-muted text-muted-foreground',
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function TeamSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3"><Skeleton className="h-6 w-6 rounded" /><div><Skeleton className="h-3 w-16 mb-1" /><Skeleton className="h-6 w-8" /></div></CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}><CardContent className="p-5 flex items-start gap-3"><Skeleton className="h-10 w-10 rounded-full shrink-0" /><div className="flex-1"><Skeleton className="h-4 w-32 mb-1" /><Skeleton className="h-3 w-20" /></div></CardContent></Card>
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

  const members = useQuery(api.team.list)

  if (members === undefined) return <TeamSkeleton />

  const filtered = members.filter((m) => {
    const matchType = typeFilter === 'ALL' || m.type === typeFilter
    const matchStatus = statusFilter === 'ALL' || m.status === statusFilter
    const matchSearch = !search ||
      m.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (m.department ?? '').toLowerCase().includes(search.toLowerCase())
    return matchType && matchStatus && matchSearch
  })

  const active = members.filter((m) => m.status === 'ACTIVE').length
  const onLeave = members.filter((m) => m.status === 'ON_LEAVE').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Team</h1>
        <AddMemberDialog />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: members.length },
          { label: 'Active', value: active },
          { label: 'On Leave', value: onLeave },
          { label: 'Offboarded', value: members.filter(m => m.status === 'OFFBOARDED').length },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-6 w-6 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search members or department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? 'ALL')}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {['INTERN', 'FREELANCER', 'PART_TIME', 'FULL_TIME'].map((t) => (
              <SelectItem key={t} value={t}>{formatEnum(t)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'ALL')}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            {['ACTIVE', 'ON_LEAVE', 'OFFBOARDED'].map((s) => (
              <SelectItem key={s} value={s}>{formatEnum(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl">
          <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No team members yet</p>
          <p className="text-xs text-muted-foreground/60 mb-4">Add your first team member to get started</p>
          <AddMemberDialog />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl">
          <Users className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No members match your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((member) => (
            <Card
              key={member.id}
              className="cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
              onClick={() => router.push(`/team/${member.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">
                    {getInitials(member.fullName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{member.fullName}</p>
                    {member.department && <p className="text-xs text-muted-foreground">{member.department}</p>}
                  </div>
                  <Badge className={`text-xs border-0 shrink-0 ${statusColors[member.status]}`}>
                    {formatEnum(member.status)}
                  </Badge>
                </div>

                <div className="mb-2">
                  <Badge className={`text-xs border-0 ${typeColors[member.type]}`}>
                    {formatEnum(member.type)}
                  </Badge>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  {member.compensationRate && (
                    <div className="flex justify-between">
                      <span>Compensation</span>
                      <span className="font-medium text-foreground">
                        ₹{member.compensationRate.toLocaleString('en-IN')} / {member.compensationMode ? formatEnum(member.compensationMode).toLowerCase() : ''}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Projects</span>
                    <span>{member.projects.length}</span>
                  </div>
                </div>

                {member.skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {member.skills.slice(0, 3).map((skill) => (
                      <span key={skill} className="px-1.5 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">{skill}</span>
                    ))}
                    {member.skills.length > 3 && (
                      <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">+{member.skills.length - 3}</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
