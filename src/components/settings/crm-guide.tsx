'use client'

import { BookOpen, CheckCircle2, CircleHelp, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const guideSections = [
  {
    title: 'Dashboard',
    purpose: 'Daily control room for revenue, pipeline, tasks, focus items, and quick actions.',
    steps: ['Start here every morning.', 'Review Today’s Focus first.', 'Use quick actions for common CRM updates.'],
  },
  {
    title: 'Leads',
    purpose: 'Track prospects from first inquiry to proposal accepted or lost.',
    steps: ['Add every inquiry as a lead.', 'Keep stage and follow-up date updated.', 'Use WhatsApp templates from the lead detail page.'],
  },
  {
    title: 'Clients',
    purpose: 'Store active client records, contacts, onboarding status, notes, and payment context.',
    steps: ['Convert won leads into clients.', 'Keep contacts and onboarding checklist current.', 'Review client notes before calls.'],
  },
  {
    title: 'Projects',
    purpose: 'Manage delivery work linked to a client, budget, deadline, milestones, tasks, and Drive folder.',
    steps: ['Create projects after client onboarding.', 'Update status as work moves.', 'Use Edit Project when scope, budget, deadline, or Drive link changes.'],
  },
  {
    title: 'Tasks',
    purpose: 'Assign day-to-day work with priority, due dates, status, subtasks, and comments.',
    steps: ['Create tasks with clear owners.', 'Move blocked work to Blocked.', 'Close done work the same day.'],
  },
  {
    title: 'Finance',
    purpose: 'Record income, expenses, bank movement, petty cash, outstanding payments, and monthly snapshot.',
    steps: ['Record transactions when money moves.', 'Link income to clients or projects when possible.', 'Review outstanding payments weekly.'],
  },
  {
    title: 'Reimbursements',
    purpose: 'Collect team expense claims and track approval, rejection, paid, and payout states.',
    steps: ['Ask team to submit claims with receipt details.', 'Approve or reject quickly.', 'Mark paid once settled.'],
  },
  {
    title: 'Team',
    purpose: 'Maintain internal, intern, freelancer, and part-time team records with skills and payout details.',
    steps: ['Keep skills and availability current.', 'Use team profiles while assigning work.', 'Review contract and payout fields before payments.'],
  },
  {
    title: 'Templates',
    purpose: 'Reusable messages for leads, clients, proposals, finance, and internal communication.',
    steps: ['Create standard replies once.', 'Use variables where useful.', 'Update templates when your sales wording improves.'],
  },
  {
    title: 'Settings',
    purpose: 'Control profile, notification preferences, dashboard layout, targets, and this guide.',
    steps: ['Set your display name.', 'Choose alerts you care about.', 'Pin only the dashboard blocks you use daily.'],
  },
  {
    title: 'Automations',
    purpose: 'Internal reminders and focus queues that reduce manual checking without paid AI or API tools.',
    steps: ['Use Today’s Focus as the automation output.', 'Keep dates and statuses accurate.', 'We will expand automation rules after current UI work.'],
  },
]

export function CrmGuide() {
  const [search, setSearch] = useState('')

  const filteredSections = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return guideSections

    return guideSections.filter((section) =>
      [section.title, section.purpose, ...section.steps]
        .join(' ')
        .toLowerCase()
        .includes(term)
    )
  }, [search])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <BookOpen className="h-4 w-4" />
                CRM Guide
              </CardTitle>
              <CardDescription className="mt-1 text-xs">
                Quick operating notes for every major BLYFT CRM area.
              </CardDescription>
            </div>
            <Badge variant="secondary">{guideSections.length} modules</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search CRM guide"
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {filteredSections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <CircleHelp className="h-4 w-4 text-primary" />
                {section.title}
              </CardTitle>
              <CardDescription className="text-xs leading-5">{section.purpose}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {section.steps.map((step) => (
                  <div key={step} className="flex gap-2 text-sm leading-6">
                    <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSections.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No guide section matches that search.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
