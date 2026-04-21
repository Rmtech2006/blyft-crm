'use client'

import { AlarmClock, BellRing, CheckCircle2, Clock3, Rocket, ServerCog } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const liveRules = [
  {
    title: 'Morning focus digest',
    schedule: '08:30 IST',
    detail: 'Builds the daily control-room summary from overdue tasks, due follow-ups, stale proposals, high-value leads, and project deadlines.',
  },
  {
    title: 'Follow-up sweep',
    schedule: '13:30 IST',
    detail: 'Creates lead follow-up and stale proposal reminders so the pipeline stays active without manual checking.',
  },
  {
    title: 'Project deadline sweep',
    schedule: '10:30 IST',
    detail: 'Flags active projects due in the next 7 days and pushes a Project deadline sweep notification into the CRM.',
  },
  {
    title: 'Evening operations summary',
    schedule: '18:30 IST',
    detail: 'Wraps the day with remaining task, follow-up, proposal, and project deadline counts.',
  },
]

const zeroCostStack = [
  'Convex cron jobs for backend reminders',
  'Vercel hosting for the CRM frontend',
  'In-app notifications instead of paid email/SMS',
  'n8n only for optional external workflows later',
]

const nextPhase = [
  'WhatsApp or email actions only after a free relay path is stable',
  'n8n cloud or a small free VPS if you do not want your laptop on',
  'Lead-source wise weekly summary once the current flows are stable',
]

export function AutomationCenter() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Rocket className="h-4 w-4" />
                Automation Center
              </CardTitle>
              <CardDescription className="mt-1 text-xs">
                Zero-cost automation layer for the CRM. Everything here works without paid AI APIs.
              </CardDescription>
            </div>
            <Badge variant="secondary">{liveRules.length} live rules</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="surface-muted p-4">
            <p className="section-eyebrow">Delivery mode</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight">In-app</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Notifications and dashboard focus queues stay available even when no one remembers to check manually.
            </p>
          </div>
          <div className="surface-muted p-4">
            <p className="section-eyebrow">Scheduler</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight">Convex</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Cron jobs run on the backend, so they do not depend on your laptop being on.
            </p>
          </div>
          <div className="surface-muted p-4">
            <p className="section-eyebrow">Escalation</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight">Notifications</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Every automation writes into the same bell panel your team already uses.
            </p>
          </div>
          <div className="surface-muted p-4">
            <p className="section-eyebrow">Optional later</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight">n8n</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Keep n8n for external app syncs once the internal CRM flows are stable and worth expanding.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <BellRing className="h-4 w-4 text-primary" />
              Active Automation Rules
            </CardTitle>
            <CardDescription className="text-xs">
              These are the live CRM automations currently running on the backend.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {liveRules.map((rule) => (
              <div key={rule.title} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{rule.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{rule.detail}</p>
                  </div>
                  <Badge variant="outline" className="gap-1.5">
                    <Clock3 className="h-3 w-3" />
                    {rule.schedule}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <ServerCog className="h-4 w-4 text-primary" />
                Zero-cost stack
              </CardTitle>
              <CardDescription className="text-xs">
                This setup keeps costs at zero while still covering the important operational reminders.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {zeroCostStack.map((item) => (
                <div key={item} className="flex gap-2 text-sm leading-6">
                  <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlarmClock className="h-4 w-4 text-primary" />
                How to use it
              </CardTitle>
              <CardDescription className="text-xs">
                Automations only stay smart when the source data stays clean.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2 text-sm leading-6">
                <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span>Keep task due dates updated so Today&apos;s Focus is trustworthy.</span>
              </div>
              <div className="flex gap-2 text-sm leading-6">
                <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span>Set follow-up dates on leads, or the reminder engine has nothing to work with.</span>
              </div>
              <div className="flex gap-2 text-sm leading-6">
                <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span>Add deadlines to every active project so Project deadline sweep catches them early.</span>
              </div>
              <div className="flex gap-2 text-sm leading-6">
                <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span>Archive finished projects instead of leaving them active, otherwise reminders stay noisy.</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Later expansion</CardTitle>
              <CardDescription className="text-xs">
                Good next moves once this internal automation layer proves stable.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {nextPhase.map((item) => (
                <div key={item} className="flex gap-2 text-sm leading-6">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
