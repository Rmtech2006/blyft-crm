'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

const stageOrder = ['NEW_LEAD', 'CONTACTED', 'DISCOVERY', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST']
const stageColors: Record<string, string> = {
  NEW_LEAD: 'bg-gray-100 text-gray-600',
  CONTACTED: 'bg-blue-100 text-blue-700',
  DISCOVERY: 'bg-purple-100 text-purple-700',
  PROPOSAL_SENT: 'bg-yellow-100 text-yellow-700',
  NEGOTIATION: 'bg-orange-100 text-orange-700',
  WON: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
}

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const lead = useQuery(api.leads.get, { id: id as Id<'leads'> })
  const updateLead = useMutation(api.leads.update)
  const addNote = useMutation(api.leads.addNote)
  const addCallLog = useMutation(api.leads.addCallLog)
  const [noteContent, setNoteContent] = useState('')
  const [callForm, setCallForm] = useState({ summary: '', callDate: '' })
  const [addingNote, setAddingNote] = useState(false)
  const [addingCall, setAddingCall] = useState(false)

  if (!lead) return <div className="p-8 text-center text-muted-foreground">Loading…</div>

  async function updateStage(stage: string) {
    try {
      await updateLead({ id: id as Id<'leads'>, stage: stage as Parameters<typeof updateLead>[0]['stage'] })
      toast.success('Stage updated')
    } catch {
      toast.error('Failed to update stage')
    }
  }

  async function handleAddNote() {
    if (!noteContent.trim()) return
    setAddingNote(true)
    try {
      await addNote({ leadId: id as Id<'leads'>, content: noteContent })
      toast.success('Note added')
      setNoteContent('')
    } catch {
      toast.error('Failed to add note')
    } finally {
      setAddingNote(false)
    }
  }

  async function handleAddCallLog() {
    if (!callForm.summary || !callForm.callDate) return
    setAddingCall(true)
    try {
      await addCallLog({
        leadId: id as Id<'leads'>,
        summary: callForm.summary,
        callDate: new Date(callForm.callDate).getTime(),
      })
      toast.success('Call logged')
      setCallForm({ summary: '', callDate: '' })
    } catch {
      toast.error('Failed to log call')
    } finally {
      setAddingCall(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{lead.name}</h1>
            {lead.company && <span className="text-muted-foreground text-sm">· {lead.company}</span>}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <Badge className={`border-0 ${stageColors[lead.stage] ?? ''}`}>{lead.stage.replace('_', ' ')}</Badge>
            {lead.estimatedValue && <span className="text-sm font-semibold text-green-600">{formatINR(lead.estimatedValue)}</span>}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Move stage</p>
          <Select value={lead.stage} onValueChange={updateStage}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {stageOrder.map((s) => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="notes">Notes ({lead.notes?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="calls">Call Logs ({lead.callLogs?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Lead Info</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  ['Industry', lead.industry],
                  ['Source', lead.source?.replace('_', ' ')],
                  ['Stage', lead.stage?.replace('_', ' ')],
                  ['Service Type', lead.serviceType],
                  ['Estimated Value', lead.estimatedValue ? formatINR(lead.estimatedValue) : null],
                ].map(([label, value]) => value && (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Contact</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  ['Contact Name', lead.contactName],
                  ['WhatsApp', lead.whatsapp],
                  ['Email', lead.email],
                  ['Follow-up Date', lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString('en-IN') : null],
                  ['Owner', lead.owner?.name],
                ].map(([label, value]) => value && (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Add Note</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea rows={3} placeholder="Note content…" value={noteContent} onChange={(e) => setNoteContent(e.target.value)} />
              <Button size="sm" onClick={handleAddNote} disabled={addingNote}>Save Note</Button>
            </CardContent>
          </Card>
          <div className="space-y-3">
            {(lead.notes ?? []).map((n) => (
              <Card key={n.id}>
                <CardContent className="p-4">
                  <p className="text-sm whitespace-pre-wrap">{n.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(n.createdAt).toLocaleDateString('en-IN')}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="calls" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Log Call</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea rows={3} placeholder="Call summary…" value={callForm.summary} onChange={(e) => setCallForm(f => ({ ...f, summary: e.target.value }))} />
              <Input type="date" className="w-40" value={callForm.callDate} onChange={(e) => setCallForm(f => ({ ...f, callDate: e.target.value }))} />
              <Button size="sm" onClick={handleAddCallLog} disabled={addingCall}>Log Call</Button>
            </CardContent>
          </Card>
          <div className="space-y-3">
            {(lead.callLogs ?? []).map((c) => (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <p className="text-sm whitespace-pre-wrap">{c.summary}</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(c.callDate).toLocaleDateString('en-IN')}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
