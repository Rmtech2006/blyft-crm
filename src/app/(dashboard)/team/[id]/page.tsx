'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft } from 'lucide-react'

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

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function TeamMemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const member = useQuery(api.team.get, { id: id as Id<'teamMembers'> })

  if (!member) return <div className="p-8 text-center text-muted-foreground">Loading…</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
            {getInitials(member.fullName)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{member.fullName}</h1>
              <Badge className={`border-0 ${typeColors[member.type] ?? ''}`}>{member.type.replace('_', ' ')}</Badge>
              <Badge className={`border-0 ${statusColors[member.status] ?? ''}`}>{member.status.replace('_', ' ')}</Badge>
            </div>
            {member.department && <p className="text-sm text-muted-foreground">{member.department}</p>}
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="projects">Projects ({member.projects?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="compensation">Compensation</TabsTrigger>
          <TabsTrigger value="reimbursements">Reimbursements ({member.reimbursements?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Personal Info</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  ['Full Name', member.fullName],
                  ['Phone', member.phone],
                  ['Email', member.email],
                  ['College', member.college],
                  ['Location', member.location],
                  ['Emergency Contact', member.emergencyContact],
                ].map(([label, value]) => value && (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Employment</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  ['Type', member.type?.replace('_', ' ')],
                  ['Status', member.status?.replace('_', ' ')],
                  ['Department', member.department],
                  ['Reporting To', member.reportingTo],
                  ['Start Date', member.startDate ? new Date(member.startDate).toLocaleDateString('en-IN') : null],
                  ['Contract Status', member.contractStatus],
                ].map(([label, value]) => value && (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
                {member.skills?.length > 0 && (
                  <div>
                    <p className="text-muted-foreground mb-1">Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {member.skills.map((s: string) => (
                        <span key={s} className="px-2 py-0.5 bg-muted rounded text-xs">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects">
          <div className="space-y-3">
            {(member.projects ?? []).length === 0 && <p className="text-center py-8 text-muted-foreground">No projects assigned</p>}
            {(member.projects ?? []).map((ptm: { project: { id: string; name: string; status: string; type: string } }) => (
              <Card key={ptm.project.id} className="cursor-pointer hover:border-blue-300" onClick={() => router.push(`/projects/${ptm.project.id}`)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{ptm.project.name}</p>
                    <p className="text-xs text-muted-foreground">{ptm.project.type.replace('_', ' ')}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{ptm.project.status.replace('_', ' ')}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="compensation">
          <Card>
            <CardHeader><CardTitle className="text-sm">Compensation Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                ['Mode', member.compensationMode?.replace('_', ' ')],
                ['Rate', member.compensationRate ? formatINR(member.compensationRate) : null],
                ['Payment Mode', member.paymentMode],
                ['UPI ID', member.upiId],
              ].map(([label, value]) => value && (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reimbursements">
          <div className="space-y-3">
            {(member.reimbursements ?? []).length === 0 && <p className="text-center py-8 text-muted-foreground">No reimbursements</p>}
            {(member.reimbursements ?? []).map((r: { id: string; category: string; amount: number; description: string; date: number; status: string }) => (
              <Card key={r.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{r.description}</p>
                    <p className="text-xs text-muted-foreground">{r.category.replace('_', ' ')} · {new Date(r.date).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatINR(r.amount)}</p>
                    <Badge variant="outline" className="text-xs">{r.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
