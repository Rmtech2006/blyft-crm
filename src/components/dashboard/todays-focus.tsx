'use client'

import Link from 'next/link'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { AlertCircle, ArrowRight, CalendarClock, Clock, Flame, MessageSquareText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEnum } from '@/lib/utils'

function formatDate(value?: number) {
  if (!value) return 'No date'
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  })
}

function FocusSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-lg" />
        ))}
      </CardContent>
    </Card>
  )
}

export function TodaysFocus() {
  const focus = useQuery(api.automation.getTodaysFocus, {})

  if (focus === undefined) return <FocusSkeleton />

  const lanes = [
    {
      title: 'Overdue tasks',
      count: focus.counts.overdueTasks,
      icon: AlertCircle,
      tone: 'text-destructive',
      empty: 'No overdue tasks',
      items: focus.overdueTasks.map((task) => ({
        id: task.id,
        title: task.title,
        meta: `${formatEnum(task.priority)} · ${formatDate(task.dueDate)}`,
        link: task.link,
      })),
    },
    {
      title: 'Lead follow-ups',
      count: focus.counts.dueLeadFollowUps,
      icon: Clock,
      tone: 'text-amber-600',
      empty: 'No lead follow-ups due',
      items: focus.dueLeadFollowUps.map((lead) => ({
        id: lead.id,
        title: lead.name,
        meta: `${formatEnum(lead.stage)} · ${formatDate(lead.followUpDate)}`,
        link: lead.link,
      })),
    },
    {
      title: 'Proposal nudges',
      count: focus.counts.staleProposals,
      icon: MessageSquareText,
      tone: 'text-primary',
      empty: 'No stale proposals',
      items: focus.staleProposals.map((lead) => ({
        id: lead.id,
        title: lead.name,
        meta: lead.company ?? formatEnum(lead.stage),
        link: lead.link,
      })),
    },
    {
      title: 'High-value leads',
      count: focus.counts.highValueLeads,
      icon: Flame,
      tone: 'text-emerald-600',
      empty: 'No high-value leads waiting',
      items: focus.highValueLeads.map((lead) => ({
        id: lead.id,
        title: lead.name,
        meta: lead.estimatedValue ? `Rs ${lead.estimatedValue.toLocaleString('en-IN')}` : formatEnum(lead.stage),
        link: lead.link,
        })),
      },
    {
      title: 'Project deadlines',
      count: focus.counts.dueProjectDeadlines,
      icon: CalendarClock,
      tone: 'text-sky-600',
      empty: 'No project deadlines due soon',
      items: focus.dueProjectDeadlines.map((project) => ({
        id: project.id,
        title: project.name,
        meta: `${project.client?.companyName ?? 'No client'} · ${formatDate(project.deadline)}`,
        link: project.link,
      })),
    },
  ]

  const total = Object.values(focus.counts).reduce((sum, count) => sum + count, 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">Today&apos;s Focus</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {total > 0 ? 'Handle these first, then breathe.' : 'Your urgent queue is clear.'}
          </p>
        </div>
        <Badge variant={total > 0 ? 'destructive' : 'secondary'}>{total} active</Badge>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {lanes.map((lane) => {
          const Icon = lane.icon

          return (
            <div key={lane.title} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${lane.tone}`} />
                  <p className="text-sm font-medium">{lane.title}</p>
                </div>
                <Badge variant="outline">{lane.count}</Badge>
              </div>

              <div className="mt-3 space-y-2">
                {lane.items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{lane.empty}</p>
                ) : (
                  lane.items.slice(0, 3).map((item) => (
                    <Link
                      key={item.id}
                      href={item.link}
                      className="group flex items-center justify-between gap-3 rounded-md bg-muted/45 px-2 py-2 text-sm transition-colors hover:bg-muted"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{item.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{item.meta}</span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  ))
                )}
              </div>

              {lane.items.length > 3 && (
                <Link
                  href={
                    lane.title === 'Overdue tasks'
                      ? '/tasks'
                      : lane.title === 'Project deadlines'
                        ? '/projects'
                        : '/leads'
                  }
                  className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'mt-2 h-8 w-full' })}
                >
                  View all
                </Link>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
