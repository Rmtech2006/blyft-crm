'use client'

import { ExternalLink, MessageCircle, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { buildLeadWhatsappMessages, type AutomationLead } from '@/lib/crm-automation-rules.mjs'

type WhatsappMessagePanelProps = {
  lead: AutomationLead
}

export function WhatsappMessagePanel({ lead }: WhatsappMessagePanelProps) {
  const messages = buildLeadWhatsappMessages(lead)
  const hasWhatsapp = Boolean(lead.whatsapp)

  return (
    <Card className="mb-4 border-emerald-500/25 bg-emerald-500/5">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <MessageCircle className="mt-0.5 h-4 w-4 text-emerald-600" />
            <div>
              <p className="text-sm font-medium">WhatsApp follow-up</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Ready-to-send messages for manual follow-up.
              </p>
            </div>
          </div>
          <Badge variant={hasWhatsapp ? 'secondary' : 'outline'}>
            {hasWhatsapp ? 'Link ready' : 'Add WhatsApp number'}
          </Badge>
        </div>

        <div className="grid gap-2 lg:grid-cols-3">
          {messages.map((message) => (
            <div key={message.kind} className="rounded-lg border bg-background p-3">
              <p className="text-xs font-semibold">{message.label}</p>
              <p className="mt-2 min-h-20 text-xs leading-5 text-muted-foreground">{message.text}</p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 flex-1"
                  onClick={() => {
                    navigator.clipboard.writeText(message.text)
                    toast.success('Message copied')
                  }}
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copy
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 flex-1"
                  disabled={!message.url}
                  onClick={() => {
                    if (!message.url) return
                    window.open(message.url, '_blank', 'noopener,noreferrer')
                  }}
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Open chat
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
