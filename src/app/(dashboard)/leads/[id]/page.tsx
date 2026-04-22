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
import { EditLeadDialog } from '@/components/leads/edit-lead-dialog'
import { WhatsappMessagePanel } from '@/components/leads/whatsapp-message-panel'
import { ArrowLeft, Mail, MessageCircle, Pencil, Trash2, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { LEAD_STAGES, STAGE_COLORS, STAGE_TEMPLATE, type LeadStage } from '@/lib/leads'
import { formatEnum } from '@/lib/utils'
import { toWhatsappLink } from '@/lib/crm-automation-rules.mjs'
import { EditTextDialog } from '@/components/shared/edit-text-dialog'

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

const stageOrder = LEAD_STAGES
const stageColors: Record<string, string> = STAGE_COLORS

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const lead = useQuery(api.leads.get, { id: id as Id<'leads'> })
  const templates = useQuery(api.templates.list)
  const updateLead = useMutation(api.leads.update)
  const addNote = useMutation(api.leads.addNote)
  const updateNote = useMutation(api.leads.updateNote)
  const removeNote = useMutation(api.leads.removeNote)
  const addCallLog = useMutation(api.leads.addCallLog)
  const updateCallLog = useMutation(api.leads.updateCallLog)
  const removeCallLog = useMutation(api.leads.removeCallLog)
  const convertToClient = useMutation(api.leads.convertToClient)

  const [noteContent, setNoteContent] = useState('')
  const [callForm, setCallForm] = useState({ summary: '', callDate: '' })
  const [addingNote, setAddingNote] = useState(false)
  const [addingCall, setAddingCall] = useState(false)
  const [converting, setConverting] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

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

  async function handleConvertToClient() {
    if (!confirm('Convert this lead to a client? A new client record will be created.')) return
    setConverting(true)
    try {
      const clientId = await convertToClient({ id: id as Id<'leads'> })
      toast.success('Client created!')
      router.push(`/clients/${clientId}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to convert')
    } finally {
      setConverting(false)
    }
  }

  async function handleRemoveNote(noteId: string) {
    if (!confirm('Delete this note?')) return
    try {
      await removeNote({ id: noteId as Id<'leadNotes'> })
      toast.success('Note deleted')
    } catch {
      toast.error('Failed to delete note')
    }
  }

  async function handleRemoveCallLog(callLogId: string) {
    if (!confirm('Delete this call log?')) return
    try {
      await removeCallLog({ id: callLogId as Id<'leadCallLogs'> })
      toast.success('Call log deleted')
    } catch {
      toast.error('Failed to delete call log')
    }
  }

  const alreadyConverted = !!lead.convertedClientId
  const primaryWhatsappLink = toWhatsappLink(
    lead.whatsapp,
    `Hi ${lead.contactName || lead.name}, following up from BLYFT regarding ${formatEnum(lead.stage).toLowerCase()}.`
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{lead.name}</h1>
            {lead.company && <span className="text-muted-foreground text-sm">· {lead.company}</span>}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <Badge className={`border-0 ${stageColors[lead.stage] ?? ''}`}>{formatEnum(lead.stage)}</Badge>
            {lead.estimatedValue && <span className="text-sm font-semibold text-emerald-500">{formatINR(lead.estimatedValue)}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-1.5" /> Edit
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={!primaryWhatsappLink}
            onClick={() => {
              if (!primaryWhatsappLink) {
                toast.error('Add a WhatsApp number to use this action')
                return
              }

              window.open(primaryWhatsappLink, '_blank', 'noopener,noreferrer')
            }}
          >
            <MessageCircle className="h-4 w-4 mr-1.5" /> Open WhatsApp
          </Button>

          {!alreadyConverted && lead.stage !== 'LOST' && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={converting}
              onClick={handleConvertToClient}
            >
              <UserCheck className="h-4 w-4 mr-1.5" />
              {converting ? 'Converting…' : 'Convert to Client'}
            </Button>
          )}

          {alreadyConverted && (
            <Button size="sm" variant="outline" onClick={() => router.push(`/clients/${lead.convertedClientId}`)}>
              <UserCheck className="h-4 w-4 mr-1.5" /> View Client
            </Button>
          )}

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Move stage</p>
            <Select value={lead.stage} onValueChange={(v) => v && updateStage(v)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {stageOrder.map((s) => <SelectItem key={s} value={s}>{formatEnum(s)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="notes">Notes ({lead.notes?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="calls">Call Logs ({lead.callLogs?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          {(() => {
            const suggestedTitle = STAGE_TEMPLATE[lead.stage as LeadStage]
            const suggested = suggestedTitle && templates ? templates.find((t) => t.title === suggestedTitle) : null
            return suggested ? (
              <Card className="mb-4 border-primary/30 bg-primary/5">
                <CardContent className="p-4 flex items-start gap-3">
                  <Mail className="h-4 w-4 mt-0.5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Suggested email · {suggested.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Recommended for stage <span className="font-medium">{formatEnum(lead.stage)}</span>
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(suggested.content)
                      toast.success('Template copied to clipboard')
                    }}
                  >
                    Copy template
                  </Button>
                </CardContent>
              </Card>
            ) : null
          })()}
          <WhatsappMessagePanel lead={lead} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Lead Info</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {([
                  ['Industry', lead.industry],
                  ['Source', lead.source ? formatEnum(lead.source) : null],
                  ['Stage', formatEnum(lead.stage)],
                  ['Service Type', lead.serviceType],
                  ['Estimated Value', lead.estimatedValue ? formatINR(lead.estimatedValue) : null],
                  ['Goals', lead.goals],
                  ['Budget', lead.budget],
                  ['Services Required', lead.servicesRequired],
                  ['Timeline', lead.timeline],
                  ['Qualification Submitted', lead.qualificationSubmittedAt ? new Date(lead.qualificationSubmittedAt).toLocaleDateString('en-IN') : null],
                ] as [string, string | null | undefined][]).map(([label, value]) => value && (
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
                {([
                  ['Contact Name', lead.contactName],
                  ['WhatsApp', lead.whatsapp],
                  ['Email', lead.email],
                  ['Follow-up Date', lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString('en-IN') : null],
                  ['Owner', lead.owner?.name],
                ] as [string, string | null | undefined][]).map(([label, value]) => value && (
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
                  <div className="mt-3 flex justify-end gap-1">
                    <EditTextDialog
                      title="Edit Note"
                      label="Note"
                      value={n.content}
                      successMessage="Note updated"
                      onSave={async (value) => {
                        await updateNote({ id: n.id as Id<'leadNotes'>, content: value })
                      }}
                      trigger={
                        <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Edit note">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      }
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveNote(n.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
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
                  <div className="mt-3 flex justify-end gap-1">
                    <EditTextDialog
                      title="Edit Call Log"
                      label="Call summary"
                      value={c.summary}
                      successMessage="Call log updated"
                      onSave={async (value) => {
                        await updateCallLog({
                          id: c.id as Id<'leadCallLogs'>,
                          summary: value,
                          callDate: c.callDate,
                        })
                      }}
                      trigger={
                        <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Edit call log">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      }
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveCallLog(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(c.callDate).toLocaleDateString('en-IN')}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <EditLeadDialog lead={lead} open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  )
}
