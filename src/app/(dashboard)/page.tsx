'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useConvexAuth, useQuery } from 'convex/react'
import { formatDistanceToNow } from 'date-fns'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckSquare,
  FolderKanban,
  PlusCircle,
  Receipt,
  Target,
  TrendingUp,
  UserPlus,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react'
import { api } from '@convex/_generated/api'
import { DashboardPageHeader } from '@/components/dashboard/page-header'
import { DashboardPartialModeAlert } from '@/components/dashboard/partial-mode-alert'
import { StatsCard } from '@/components/dashboard/stats-card'
import { EmptyDashboardState } from '@/components/dashboard/empty-dashboard-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DASHBOARD_QUICK_ACTION_OPTIONS,
  DashboardQuickActionId,
  normalizeDashboardQuickActionIds,
  normalizeDashboardSectionIds,
} from '@/lib/dashboard-preferences'
import { normalizeDashboardStats } from '@/lib/dashboard-stats'
import { exportCsv, printReport } from '@/lib/export'
import { cn } from '@/lib/utils'
import { protectedQueryArgs } from '@/lib/convex-query-args.mjs'

const quickActionIcons: Record<DashboardQuickActionId, typeof UserPlus> = {
  'add-lead': UserPlus,
  'add-client': PlusCircle,
  'create-task': CheckSquare,
  'record-expense': Receipt,
}

const quickActions = DASHBOARD_QUICK_ACTION_OPTIONS.map((action) => ({
  ...action,
  icon: quickActionIcons[action.id],
}))

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount)
}

function formatCompactCurrency(amount: number): string {
  if (amount >= 100000) return `Rs ${(amount / 100000).toFixed(1)}L`
  if (amount >= 1000) return `Rs ${(amount / 1000).toFixed(1)}K`
  return `Rs ${amount.toLocaleString('en-IN')}`
}

function formatMonthLabel(monthKey: string): string {
  return new Date(`${monthKey}-01T00:00:00`).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })
}

function getActionColor(action: string): string {
  const map: Record<string, string> = {
    CREATE: 'bg-emerald-500',
    UPDATE: 'bg-slate-900',
    DELETE: 'bg-destructive',
    LOGIN: 'bg-amber-500',
  }

  return map[action.toUpperCase()] ?? 'bg-muted-foreground'
}

function getPerformanceTone(value: number): {
  chip: string
  bar: string
  label: string
} {
  if (value >= 100) {
    return {
      chip: 'tone-success',
      bar: 'bg-emerald-500',
      label: 'On track',
    }
  }

  if (value >= 75) {
    return {
      chip: 'tone-warning',
      bar: 'bg-amber-500',
      label: 'Watch closely',
    }
  }

  return {
    chip: 'tone-danger',
    bar: 'bg-destructive',
    label: 'Off track',
  }
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[430px] rounded-[36px]" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[170px] rounded-[28px]" />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
        <Skeleton className="h-[320px] rounded-[32px]" />
        <Skeleton className="h-[320px] rounded-[32px]" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const { isAuthenticated } = useConvexAuth()
  const savedSettings = useQuery(api.settings.get, protectedQueryArgs(Boolean(session?.user) && isAuthenticated, {}))
  const rawStats = useQuery(api.dashboard.getStats)
  const { data: stats, isPartial } = useMemo(() => normalizeDashboardStats(rawStats), [rawStats])
  const visibleSections = useMemo(
    () => new Set(normalizeDashboardSectionIds(savedSettings?.dashboardSections)),
    [savedSettings?.dashboardSections]
  )
  const pinnedQuickActions = useMemo(() => {
    const allowedIds = new Set(
      normalizeDashboardQuickActionIds(savedSettings?.dashboardQuickActions)
    )

    return quickActions.filter((action) => allowedIds.has(action.id))
  }, [savedSettings?.dashboardQuickActions])

  const greeting = (() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  })()

  if (!rawStats) return <DashboardSkeleton />

  const monthlyAverage =
    stats.monthlyRevenueTrend.length > 0
      ? Math.round(
          stats.monthlyRevenueTrend.reduce((sum, item) => sum + item.income, 0) /
            stats.monthlyRevenueTrend.length
        )
      : 0

  const revenueBaseline = Math.max(monthlyAverage, 1)
  const targetProgressSource = stats.salesTarget?.progress ?? Math.round((stats.monthlyRevenue / revenueBaseline) * 100)
  const hasTargetTrend = stats.monthlyRevenueTrend.some((month) => month.target > 0)

  const firstName = session?.user?.name?.split(' ')[0] ?? 'there'
  const hasLeftRailCards =
    visibleSections.has('revenueTracker') ||
    visibleSections.has('attentionQueue') ||
    visibleSections.has('activityLog')
  const hasRightRailCards =
    visibleSections.has('quickActions') ||
    visibleSections.has('salesBoard') ||
    visibleSections.has('decisionQueue')

  function handleCsvExport() {
    exportCsv(`dashboard-report-${stats.currentMonthKey}.csv`, [
      { label: 'Active clients', value: stats.totalClients },
      { label: 'Active projects', value: stats.activeProjects },
      { label: 'Open leads', value: stats.openLeads },
      { label: 'Monthly revenue', value: stats.monthlyRevenue },
      { label: 'Overdue tasks', value: stats.overdueCount },
      { label: 'Pending reimbursements', value: stats.pendingReimbursements },
      {
        label: 'Overall sales target',
        value: stats.salesTarget?.targetAmount ?? 0,
      },
      {
        label: 'Overall target progress (%)',
        value: stats.salesTarget?.progress ?? targetProgressSource,
      },
    ], [
      { header: 'Metric', value: (row) => row.label },
      { header: 'Value', value: (row) => row.value },
    ])
  }

  function handlePdfExport() {
    printReport({
      title: 'BLYFT CRM Dashboard Report',
      subtitle: `Generated for ${formatMonthLabel(stats.currentMonthKey)} on ${new Date().toLocaleDateString('en-IN')}`,
      sections: [
        {
          title: 'Executive metrics',
          columns: ['Metric', 'Value'],
          rows: [
            ['Active clients', stats.totalClients],
            ['Active projects', stats.activeProjects],
            ['Open leads', stats.openLeads],
            ['Monthly revenue', formatCurrency(stats.monthlyRevenue)],
            ['Overdue tasks', stats.overdueCount],
            ['Pending reimbursements', stats.pendingReimbursements],
          ],
        },
        {
          title: 'Revenue trend',
          columns: ['Month', 'Income', 'Target'],
          rows: stats.monthlyRevenueTrend.map((point) => [
            point.month,
            formatCurrency(point.income),
            point.target > 0 ? formatCurrency(point.target) : '—',
          ]),
        },
        {
          title: 'Target board',
          columns: ['Scope', 'Target', 'Actual', 'Progress'],
          rows:
            stats.salesTargets.length > 0
              ? stats.salesTargets.map((target) => [
                  target.label,
                  formatCurrency(target.targetAmount),
                  formatCurrency(target.actualAmount),
                  `${target.progress}%`,
                ])
              : [['No department or member targets configured', '', '', '']],
        },
      ],
    })
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader onCsv={handleCsvExport} onPdf={handlePdfExport} />

      {isPartial && <DashboardPartialModeAlert />}

      {visibleSections.size === 0 && <EmptyDashboardState />}

      {visibleSections.has('heroOverview') && (
        <section className="surface-card hero-noise relative overflow-hidden bg-primary px-6 py-8 text-primary-foreground sm:px-8 sm:py-9 lg:px-10 lg:py-10">
          <div className="absolute inset-0 opacity-45">
            <div className="absolute -left-12 top-16 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute left-1/3 top-10 h-40 w-40 rounded-full bg-white/7 blur-3xl" />
            <div className="absolute right-0 top-0 h-60 w-60 rounded-full bg-white/8 blur-3xl" />
          </div>

          <div className="relative flex flex-col gap-8 lg:gap-10">
            <div className="max-w-5xl space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-primary-foreground/55 sm:text-xs">
                Executive overview
              </p>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-[5rem] lg:leading-[1.06]">
                {greeting}, {firstName}. Your agency control room is live.
              </h1>
              <p className="max-w-4xl text-base leading-8 text-primary-foreground/68 sm:text-[1.1rem]">
                Monitor clients, pipeline, delivery, reimbursements, and revenue from a single operating view.
              </p>
              <Badge className="w-fit rounded-full border border-white/16 bg-white/8 px-5 py-2 text-sm uppercase tracking-[0.28em] text-primary-foreground shadow-none">
                BLYFT workspace
              </Badge>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {[
                {
                  label: 'Live clients',
                  value: stats.totalClients,
                  note: 'Accounts actively retained',
                },
                {
                  label: 'Delivery load',
                  value: stats.activeProjects,
                  note: 'Projects in motion or review',
                },
                {
                  label: 'Open pipeline',
                  value: stats.openLeads,
                  note: 'Leads that still need closing',
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[32px] border border-white/12 bg-white/[0.055] px-6 py-6 backdrop-blur-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.32em] text-primary-foreground/55">
                    {item.label}
                  </p>
                  <p className="mt-7 text-5xl font-semibold tracking-tight">{item.value}</p>
                  <p className="mt-5 max-w-[18rem] text-base leading-8 text-primary-foreground/66">
                    {item.note}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {visibleSections.has('metricStrip') && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Active clients"
          value={stats.totalClients}
          subtitle="Currently retained accounts"
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="Active projects"
          value={stats.activeProjects}
          subtitle="Delivery in progress or review"
          icon={FolderKanban}
          color="violet"
        />
        <StatsCard
          title="Open leads"
          value={stats.openLeads}
          subtitle="Pipeline opportunities still alive"
          icon={TrendingUp}
          color="emerald"
        />
        <StatsCard
          title="Monthly revenue"
          value={formatCompactCurrency(stats.monthlyRevenue)}
          subtitle="Income recorded this month"
          icon={Wallet}
          color="amber"
        />
        </div>
      )}

      {(hasLeftRailCards || hasRightRailCards) && (
        <section
          className={cn(
            'grid items-start gap-6',
            hasLeftRailCards && hasRightRailCards
              ? 'xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]'
              : 'grid-cols-1'
          )}
        >
        {hasLeftRailCards && (
          <div className="space-y-6">
      {visibleSections.has('revenueTracker') && (
        <Card className="surface-card self-start">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="section-eyebrow">Revenue tracker</p>
                <CardTitle className="mt-2">Rolling 6-month income</CardTitle>
              </div>
              <Badge variant="outline" className="shadow-none">
                {hasTargetTrend ? 'Target + actual' : 'Actual only'}
              </Badge>
            </div>
            <CardDescription>
              Keep a quick read on monthly performance and historical target coverage.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {stats.monthlyRevenueTrend.every((month) => month.income === 0) ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
                <TrendingUp className="mb-3 h-10 w-10 text-muted-foreground/35" />
                <p className="text-sm font-medium text-foreground">No income recorded yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Revenue activity will start appearing here as transactions are added.
                </p>
              </div>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.monthlyRevenueTrend}
                      margin={{ top: 6, right: 6, left: -24, bottom: 0 }}
                    >
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                      tickFormatter={(value) => formatCompactCurrency(value)}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(15, 23, 42, 0.05)' }}
                      formatter={(value, name) => {
                        const numericValue = typeof value === 'number' ? value : Number(value ?? 0)
                        return [
                          formatCurrency(numericValue),
                          name === 'target' ? 'Target' : 'Income',
                        ]
                      }}
                      contentStyle={{
                        borderRadius: 18,
                        border: '1px solid var(--border)',
                        background: 'var(--card)',
                        boxShadow: '0 24px 60px -42px rgba(15, 23, 42, 0.35)',
                      }}
                    />
                    {hasTargetTrend && (
                      <Bar dataKey="target" radius={[12, 12, 0, 0]} fill="rgba(15, 23, 42, 0.22)" maxBarSize={42} />
                    )}
                    <Bar dataKey="income" radius={[12, 12, 0, 0]} fill="var(--foreground)" maxBarSize={42} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {visibleSections.has('attentionQueue') && (
        <Card className="surface-card">
          <CardHeader className="pb-3">
            <p className="section-eyebrow">Attention queue</p>
            <CardTitle className="mt-2">What needs you next</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {[
              {
                label: 'Overdue tasks',
                value: stats.overdueCount,
                tone: stats.overdueCount > 0 ? 'tone-danger' : 'tone-neutral',
                helper: stats.overdueCount > 0 ? 'Delivery risk is building' : 'No overdue work',
              },
              {
                label: 'Pending reimbursements',
                value: stats.pendingReimbursements,
                tone: stats.pendingReimbursements > 0 ? 'tone-warning' : 'tone-neutral',
                helper:
                  stats.pendingReimbursements > 0
                    ? 'Approvals waiting for finance review'
                    : 'Approval queue is clear',
              },
              {
                label: 'Live pipeline',
                value: activePipeline,
                tone: activePipeline > 0 ? 'tone-success' : 'tone-neutral',
                helper:
                  activePipeline > 0
                    ? 'Opportunities and delivery are active'
                    : 'Pipeline is currently quiet',
              },
            ].map((item) => (
              <div
                key={item.label}
                className="surface-muted flex items-start justify-between gap-4 p-4"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.helper}</p>
                </div>
                <span className={cn('rounded-full px-3 py-1 text-sm font-semibold', item.tone)}>
                  {item.value}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {visibleSections.has('activityLog') && (
        <Card className="surface-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-eyebrow">Activity log</p>
                <CardTitle className="mt-2">Recent workspace activity</CardTitle>
              </div>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription>
              See the latest movement across your agency in one timeline.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {stats.recentActivity.length === 0 ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
                <Activity className="mb-3 h-10 w-10 text-muted-foreground/35" />
                <p className="text-sm font-medium text-foreground">No activity recorded yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Activity will appear here as your team starts using the CRM.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentActivity.map((log) => (
                  <div
                    key={log.id}
                    className="surface-muted flex items-start gap-4 p-4 transition-colors hover:bg-accent"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-card">
                      <span className={cn('h-2.5 w-2.5 rounded-full', getActionColor(log.action))} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-6 text-foreground">
                        <span className="font-medium">
                          {(log.user as { name?: string } | null)?.name ?? 'System'}
                        </span>{' '}
                        <span className="text-muted-foreground">
                          {log.action.toLowerCase()}d a {log.entity.toLowerCase()}
                        </span>
                      </p>
                      {log.details && (
                        <p className="mt-1 text-sm text-muted-foreground">{log.details}</p>
                      )}
                    </div>

                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
          </div>
        )}

      {hasRightRailCards && (
        <div className="space-y-6">
          {visibleSections.has('quickActions') && (
          <Card className="surface-card">
            <CardHeader className="pb-3">
              <p className="section-eyebrow">Quick actions</p>
              <CardTitle className="mt-2">Move the business forward</CardTitle>
              <CardDescription>
                Jump straight into the tasks your team uses most.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {pinnedQuickActions.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-border/80 bg-muted/35 px-4 py-5 text-center">
                  <p className="text-sm font-medium text-foreground">No quick actions pinned</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pick your preferred shortcuts in Settings to show them here.
                  </p>
                </div>
              ) : (
                pinnedQuickActions.map((action) => {
                  const Icon = action.icon

                  return (
                    <Link key={action.href} href={action.href}>
                      <div className="group flex items-center gap-3 rounded-[22px] border border-border/80 bg-card/70 px-4 py-4 transition-all hover:border-foreground/12 hover:bg-accent">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{action.label}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                      </div>
                    </Link>
                  )
                })
              )}
            </CardContent>
          </Card>
          )}

          {visibleSections.has('salesBoard') && (
          <Card className="surface-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-eyebrow">Sales target board</p>
                  <CardTitle className="mt-2">Department and owner progress</CardTitle>
                </div>
                <Target className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardDescription>
                Track manual team and department target entries for the current month.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {stats.salesTargets.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-border/80 bg-muted/35 px-4 py-5 text-center">
                  <p className="text-sm font-medium text-foreground">No department or member targets yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add department or team targets from Settings to see them here.
                  </p>
                  <Button variant="outline" className="mt-4" render={<Link href="/settings" />}>
                    Manage targets
                  </Button>
                </div>
              ) : (
                stats.salesTargets.map((target) => {
                  const tone = getPerformanceTone(target.progress)
                  const Icon = target.scopeType === 'DEPARTMENT' ? Building2 : UserRound

                  return (
                    <div key={target.id} className="surface-muted p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-card">
                              <Icon className="h-4 w-4 text-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{target.label}</p>
                              <p className="text-xs text-muted-foreground">
                                {target.scopeType === 'DEPARTMENT' ? 'Department target' : 'Member target'}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                            <div>
                              <span className="block text-[11px] uppercase tracking-[0.2em]">Target</span>
                              <span className="mt-1 block font-medium text-foreground">
                                {formatCurrency(target.targetAmount)}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[11px] uppercase tracking-[0.2em]">Actual</span>
                              <span className="mt-1 block font-medium text-foreground">
                                {formatCurrency(target.actualAmount)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <Badge className={cn('border-0 shadow-none', tone.chip)}>
                          {target.progress}%
                        </Badge>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn('h-full rounded-full transition-all', tone.bar)}
                          style={{ width: `${Math.max(8, Math.min(target.progress, 100))}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
          )}

      {visibleSections.has('decisionQueue') && (
        <Card className="surface-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-eyebrow">Decision queue</p>
                <CardTitle className="mt-2">Review and approvals</CardTitle>
              </div>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription>
              Use this block as your fast review lane before switching sections.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="surface-muted p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-700">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Reimbursement approvals</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {stats.pendingReimbursements > 0
                        ? 'Finance review is waiting on you.'
                        : 'No approvals waiting right now.'}
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-semibold tracking-tight">
                  {stats.pendingReimbursements}
                </span>
              </div>

              {stats.pendingReimbursements > 0 && (
                <Button className="mt-4 w-full" render={<Link href="/reimbursements" />}>
                  Review reimbursements
                </Button>
              )}
            </div>

            <div className="surface-muted p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Overdue tasks</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {stats.overdueCount > 0
                        ? 'Delivery follow-up is at risk on active work.'
                        : 'No overdue task alerts right now.'}
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-semibold tracking-tight">{stats.overdueCount}</span>
              </div>

              {stats.overdueCount > 0 && (
                <Button variant="outline" className="mt-4 w-full" render={<Link href="/tasks" />}>
                  Open task board
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
        </div>
      )}
        </section>
      )}
    </div>
  )
}
