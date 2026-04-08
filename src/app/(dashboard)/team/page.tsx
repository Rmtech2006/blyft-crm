'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AddMemberDialog } from '@/components/team/add-member-dialog'
import { Users } from 'lucide-react'

const typeColors: Record<string, string> = {
  INTERN: 'bg-blue-100 text-blue-700',
  FREELANCER: 'bg-purple-100 text-purple-700',
  PART_TIME: 'bg-yellow-100 text-yellow-700',
  FULL_TIME: 'bg-green-100 text-green-700',
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  ON_LEAVE: 'bg-yellow-100 text-yellow-700',
  OFFBOARDED: 'bg-gray-100 text-gray-600',
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function TeamPage() {
  const router = useRouter()
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  const members = useQuery(api.team.list) ?? []

  const filtered = members.filter((m) => {
    const matchType = typeFilter === 'ALL' || m.type === typeFilter
    const matchStatus = statusFilter === 'ALL' || m.status === statusFilter
    const matchSearch = !search || m.fullName.toLowerCase().includes(search.toLowerCase()) || (m.department ?? '').toLowerCase().includes(search.toLowerCase())
    return matchType && matchStatus && matchSearch
  })

  const active = members.filter((m) => m.status === 'ACTIVE').length
  const onLeave = members.filter((m) => m.status === 'ON_LEAVE').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Team</h1>
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
              <Users className="h-6 w-6 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <Input placeholder="Search members…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? 'ALL')}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {['INTERN', 'FREELANCER', 'PART_TIME', 'FULL_TIME'].map((t) => (
              <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'ALL')}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            {['ACTIVE', 'ON_LEAVE', 'OFFBOARDED'].map((s) => (
              <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No team members found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((member) => (
            <Card
              key={member.id}
              className="cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
              onClick={() => router.push(`/team/${member.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {getInitials(member.fullName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{member.fullName}</p>
                    {member.department && <p className="text-xs text-muted-foreground">{member.department}</p>}
                  </div>
                  <Badge className={`text-xs border-0 shrink-0 ${statusColors[member.status]}`}>{member.status.replace('_', ' ')}</Badge>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <Badge className={`text-xs border-0 ${typeColors[member.type]}`}>{member.type.replace('_', ' ')}</Badge>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  {member.compensationRate && (
                    <div className="flex justify-between">
                      <span>Compensation</span>
                      <span className="font-medium text-foreground">
                        ₹{member.compensationRate.toLocaleString('en-IN')} / {member.compensationMode?.replace('_', ' ').toLowerCase()}
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
