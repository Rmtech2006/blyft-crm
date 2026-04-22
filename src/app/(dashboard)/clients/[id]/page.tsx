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
import { ArrowLeft, Phone, Mail, CheckCircle2, Circle, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { ComposeEmailDialog } from '@/components/clients/compose-email-dialog'
import { EditClientDialog } from '@/components/clients/edit-client-dialog'
import { EditClientContactDialog } from '@/components/clients/edit-client-contact-dialog'
import { ONBOARDING_TEMPLATE } from '@/lib/leads'

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/15 text-emerald-500',
  PAUSED: 'bg-amber-500/15 text-amber-500',
  COMPLETED: 'bg-primary/15 text-primary',
  PROSPECT: 'bg-violet-500/15 text-violet-500',
  ONBOARDING: 'bg-cyan-500/15 text-cyan-600',
}

const ONBOARDING_STEPS = [
  { key: 'contractSigned', label: 'Contract signed' },
  { key: 'invoicePaid', label: 'Initial payment received' },
  { key: 'onboardingFormSubmitted', label: 'Onboarding form submitted' },
  { key: 'accessGranted', label: 'Access granted (hosting / social / ads)' },
  { key: 'kickoffDone', label: 'Internal kickoff complete' },
  { key: 'firstDeliverableSent', label: 'First deliverables sent' },
] as const

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const client = useQuery(api.clients.get, { id: id as Id<'clients'> })
  const templates = useQuery(api.templates.list)
  const updateClient = useMutation(api.clients.update)
  const removeClient = useMutation(api.clients.remove)
  const addNote = useMutation(api.clients.addNote)
  const addContact = useMutation(api.clients.addContact)
  const [noteContent, setNoteContent] = useState('')
  const [contactForm, setContactForm] = useState({ name: '', email: '', whatsapp: '', designation: '' })
  const [addingNote, setAddingNote] = useState(false)
  const [addingContact, setAddingContact] = useState(false)

  if (!client) return <div className="p-8 text-center text-muted-foreground">Loading…</div>

  async function handleAddNote() {
    if (!noteContent.trim()) return
    setAddingNote(true)
    try {
      await addNote({ clientId: id as Id<'clients'>, content: noteContent, createdBy: 'Admin' })
      toast.success('Note added')
      setNoteContent('')
    } catch {
      toast.error('Failed to add note')
    } finally {
      setAddingNote(false)
    }
  }

  async function handleAddContact() {
    if (!contactForm.name.trim()) return
    setAddingContact(true)
    try {
      await addContact({ clientId: id as Id<'clients'>, ...contactForm })
      toast.success('Contact added')
      setContactForm({ name: '', email: '', whatsapp: '', designation: '' })
    } catch {
      toast.error('Failed to add contact')
    } finally {
      setAddingContact(false)
    }
  }

  async function handleDeleteClient() {
    if (!client) return
    if (!confirm(`Delete ${client.companyName}? This will remove the client, contacts, and notes.`)) return
    try {
      await removeClient({ id: id as Id<'clients'> })
      toast.success('Client deleted')
      router.push('/clients')
    } catch {
      toast.error('Failed to delete client')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{client.companyName}</h1>
            <Badge className={`border-0 ${statusColors[client.status] ?? ''}`}>{client.status}</Badge>
          </div>
          {client.industry && <p className="text-sm text-muted-foreground">{client.industry}</p>}
        </div>
        <div className="flex items-center gap-2">
          <EditClientDialog client={client} />
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={handleDeleteClient}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {client.status === 'ONBOARDING' && <TabsTrigger value="onboarding">Onboarding</TabsTrigger>}
          <TabsTrigger value="contacts">Contacts ({client.contacts?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="projects">Projects ({client.projects?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({client.notes?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="transactions">Transactions ({client.transactions?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Business Details</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  ['Company', client.companyName],
                  ['Industry', client.industry],
                  ['GST Number', client.gstNumber],
                  ['Website', client.website],
                  ['Address', client.address],
                ].map(([label, value]) => value && (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Contract & Billing</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  ['Status', client.status],
                  ['Payment Terms', client.paymentTerms],
                  ['Start Date', client.startDate ? new Date(client.startDate).toLocaleDateString('en-IN') : null],
                  ['Health Score', client.healthScore ? `${client.healthScore}/10` : null],
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

        <TabsContent value="onboarding" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Client Onboarding Checklist</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {ONBOARDING_STEPS.map((step) => {
                const done = !!(client as Record<string, unknown>)[step.key]
                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={async () => {
                      try {
                        await updateClient({ id: id as Id<'clients'>, [step.key]: !done })
                        toast.success(done ? 'Marked incomplete' : 'Marked complete')
                      } catch {
                        toast.error('Failed to update')
                      }
                    }}
                    className="flex items-center gap-3 w-full text-left p-2 rounded hover:bg-muted/50 transition"
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={`text-sm ${done ? 'line-through text-muted-foreground' : ''}`}>{step.label}</span>
                  </button>
                )
              })}
              <p className="text-xs text-muted-foreground pt-2 border-t">
                Client auto-promotes to ACTIVE once all steps are complete.
              </p>
            </CardContent>
          </Card>

          {templates && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Suggested onboarding emails</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(ONBOARDING_TEMPLATE).map(([key, title]) => {
                  const tpl = templates.find((t) => t.title === title)
                  if (!tpl) return null
                  return (
                    <div key={key} className="flex items-center justify-between gap-3 p-2 rounded border">
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm truncate">{tpl.title}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(tpl.content)
                          toast.success('Template copied')
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          {/* Add Contact */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Add Contact</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Name *" value={contactForm.name} onChange={(e) => setContactForm(f => ({ ...f, name: e.target.value }))} />
                <Input placeholder="Designation" value={contactForm.designation} onChange={(e) => setContactForm(f => ({ ...f, designation: e.target.value }))} />
                <Input placeholder="Email" value={contactForm.email} onChange={(e) => setContactForm(f => ({ ...f, email: e.target.value }))} />
                <Input placeholder="WhatsApp" value={contactForm.whatsapp} onChange={(e) => setContactForm(f => ({ ...f, whatsapp: e.target.value }))} />
              </div>
              <Button size="sm" onClick={handleAddContact} disabled={addingContact}>Add Contact</Button>
            </CardContent>
          </Card>

          {/* Contact list header with Email All */}
          {(client.contacts ?? []).length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {client.contacts?.length} contact{client.contacts?.length !== 1 ? 's' : ''}
              </p>
              <ComposeEmailDialog contacts={client.contacts ?? []} />
            </div>
          )}

          {/* Contact cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(client.contacts ?? []).map((c) => (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{c.name}</p>
                      {c.designation && <p className="text-xs text-muted-foreground">{c.designation}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {c.isPrimary && <Badge className="text-xs border-0">Primary</Badge>}
                      <EditClientContactDialog
                        contact={c}
                        trigger={
                          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={`Edit ${c.name}`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        }
                      />
                      {c.email && (
                        <ComposeEmailDialog
                          contacts={client.contacts ?? []}
                          preselected={[c.id]}
                          trigger={
                            <Button size="icon" variant="ghost" className="h-7 w-7">
                              <Mail className="h-3.5 w-3.5" />
                            </Button>
                          }
                        />
                      )}
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    {c.email && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{c.email}</div>}
                    {c.whatsapp && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{c.whatsapp}</div>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="projects">
          <div className="space-y-3">
            {(client.projects ?? []).length === 0 && <p className="text-center py-8 text-muted-foreground">No projects yet</p>}
            {(client.projects ?? []).map((p) => (
              <Card key={p.id} className="cursor-pointer hover:border-primary/40" onClick={() => router.push(`/projects/${p.id}`)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.type.replace('_', ' ')}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{p.status.replace('_', ' ')}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Add Note</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea placeholder="Write a note…" rows={3} value={noteContent} onChange={(e) => setNoteContent(e.target.value)} />
              <Button size="sm" onClick={handleAddNote} disabled={addingNote}>Add Note</Button>
            </CardContent>
          </Card>
          <div className="space-y-3">
            {(client.notes ?? []).map((n) => (
              <Card key={n.id}>
                <CardContent className="p-4">
                  <p className="text-sm whitespace-pre-wrap">{n.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">{n.createdBy} · {new Date(n.createdAt).toLocaleDateString('en-IN')}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="transactions">
          <div className="space-y-2">
            {(client.transactions ?? []).length === 0 && <p className="text-center py-8 text-muted-foreground">No transactions</p>}
            {(client.transactions ?? []).map((t) => (
              <Card key={t.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{t.description}</p>
                    <p className="text-xs text-muted-foreground">{t.category} · {new Date(t.date).toLocaleDateString('en-IN')}</p>
                  </div>
                  <span className={`font-semibold text-sm ${t.type === 'INCOME' ? 'text-emerald-500' : 'text-destructive'}`}>
                    {t.type === 'INCOME' ? '+' : '-'}{formatINR(t.amount)}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
