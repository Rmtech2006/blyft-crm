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
import { ArrowLeft, Globe, Phone, Mail } from 'lucide-react'
import { toast } from 'sonner'

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  PROSPECT: 'bg-purple-100 text-purple-700',
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const client = useQuery(api.clients.get, { id: id as Id<'clients'> })
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{client.companyName}</h1>
            <Badge className={`border-0 ${statusColors[client.status] ?? ''}`}>{client.status}</Badge>
          </div>
          {client.industry && <p className="text-sm text-muted-foreground">{client.industry}</p>}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
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
                  ['Retainer', client.retainerAmount ? formatINR(client.retainerAmount) + '/mo' : null],
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

        <TabsContent value="contacts" className="space-y-4">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(client.contacts ?? []).map((c) => (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{c.name}</p>
                      {c.designation && <p className="text-xs text-muted-foreground">{c.designation}</p>}
                    </div>
                    {c.isPrimary && <Badge className="text-xs">Primary</Badge>}
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
              <Card key={p.id} className="cursor-pointer hover:border-blue-300" onClick={() => router.push(`/projects/${p.id}`)}>
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
                  <span className={`font-semibold text-sm ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
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
