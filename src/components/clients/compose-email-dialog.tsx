'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Loader2, Mail, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface Contact {
  id: string
  name: string
  email?: string
  designation?: string
  isPrimary: boolean
}

interface ComposeEmailDialogProps {
  contacts: Contact[]
  preselected?: string[]       // contact ids to pre-check
  trigger?: React.ReactNode
}

export function ComposeEmailDialog({ contacts, preselected, trigger }: ComposeEmailDialogProps) {
  const templates = useQuery(api.templates.list) ?? []

  const emailableContacts = contacts.filter((c) => c.email)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(
    new Set(preselected ?? emailableContacts.map((c) => c.id))
  )
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  function toggleContact(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function applyTemplate(content: string) {
    setBody(content)
  }

  function handleOpen(val: boolean) {
    setOpen(val)
    if (val) {
      // reset on open
      setSelected(new Set(preselected ?? emailableContacts.map((c) => c.id)))
      setSubject('')
      setBody('')
    }
  }

  async function handleSend() {
    const recipients = emailableContacts
      .filter((c) => selected.has(c.id))
      .map((c) => c.email!)

    if (!recipients.length) {
      toast.error('Select at least one recipient with an email address')
      return
    }
    if (!subject.trim()) {
      toast.error('Subject is required')
      return
    }
    if (!body.trim()) {
      toast.error('Email body is required')
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: recipients, subject, body }),
      })
      const data = await res.json() as { success?: boolean; error?: string; sent?: number }
      if (!res.ok) throw new Error(data.error ?? 'Failed to send')
      toast.success(`Email sent to ${data.sent} recipient${data.sent === 1 ? '' : 's'}`)
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  const selectedCount = emailableContacts.filter((c) => selected.has(c.id)).length

  return (
    <>
      <span onClick={() => handleOpen(true)} className="contents">
        {trigger ?? (
          <Button size="sm" variant="outline">
            <Mail className="h-4 w-4 mr-1.5" />
            Email All
          </Button>
        )}
      </span>
      <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Compose Email</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Recipients */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              To ({selectedCount} selected)
            </Label>
            {emailableContacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contacts with email addresses.</p>
            ) : (
              <div className="rounded-lg border border-border divide-y divide-border">
                {emailableContacts.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={selected.has(c.id)}
                      onCheckedChange={() => toggleContact(c.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none">{c.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.email}</p>
                    </div>
                    {c.isPrimary && (
                      <span className="text-[10px] font-medium text-muted-foreground">Primary</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Subject
            </Label>
            <Input
              placeholder="Email subject…"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Body + Template picker */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Message
              </Label>
              {templates.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger render={<button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors outline-none" />}>
                    Use template <ChevronDown className="h-3 w-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 max-h-60 overflow-y-auto">
                    {templates.map((t) => (
                      <DropdownMenuItem
                        key={t._id}
                        className="cursor-pointer"
                        onClick={() => applyTemplate(t.content)}
                      >
                        <span className="truncate">{t.title}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <Textarea
              placeholder="Write your message…"
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSend} disabled={sending || selectedCount === 0}>
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-1.5" />
                  Send to {selectedCount}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
      </Dialog>
    </>
  )
}
