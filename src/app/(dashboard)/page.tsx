'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery } from 'convex/react'
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
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
        <Skeleton className="h-[320px] rounded-[32px]" />
        <Skeleton className="h-[320px] rounded-[32px]" />
      </div>

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
  const savedSettings = useQuery(api.settings.get, session?.user ? {} : 'skip')
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
  const revenuePace = Math.round((stats.monthlyRevenue / revenueBaseline) * 100)
  const hasSalesTarget = Boolean(stats.salesTarget)
  const targetProgressSource = stats.salesTarget?.progress ?? revenuePace
  const revenueProgress = Math.max(8, Math.min(targetProgressSource, 100))
  const revenueTone = getPerformanceTone(targetProgressSource)
  const targetDelta = stats.salesTarget
    ? stats.salesTarget.actualAmount - stats.salesTarget.targetAmount
    : 0
  const hasTargetTrend = stats.monthlyRevenueTrend.some((month) => month.target > 0)

  const activePipeline = stats.openLeads + stats.activeProjects
  const opsLoad = activePipeline + stats.pendingReimbursements + stats.overdueCount
  const firstName = session?.user?.name?.split(' ')[0] ?? 'there'
  const hasMiddleCards =
    visibleSections.has('quickActions') ||
    visibleSections.has('salesBoard') ||
    visibleSections.has('attentionQueue')
  const hasBottomCards =
    visibleSections.has('activityLog') || visibleSections.has('decisionQueue')

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
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
        <div className="surface-card hero-noise relative overflow-hidden bg-primary px-6 py-7 text-primary-foreground sm:px-8 sm:py-8">
          <div className="absolute inset-0 opacity-40">
            <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-white/8 blur-3xl" />
          </div>

          <div className="relative flex h-full flex-col gap-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-primary-foreground/55">
                  Executive overview
                </p>
                <div className="space-y-2">
                  <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-[2.6rem]">
                    {greeting}, {firstName}. Your agency control room is live.
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-primary-foreground/70 sm:text-base">
                    Monitor clients, pipeline, delivery, reimbursements, and revenue from a single operating view.
                  </p>
                </div>
              </div>

              <Badge className="border border-white/15 bg-white/10 text-primary-foreground shadow-none">
                BLYFT workspace
              </Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
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
                  className="rounded-[24px] border border-white/12 bg-white/6 px-4 py-4 backdrop-blur-sm"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-primary-foreground/55">
                    {item.label}
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight">{item.value}</p>
                  <p className="mt-2 text-sm text-primary-foreground/65">{item.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Card className="surface-card border-border/70 bg-card/96">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-eyebrow">Revenue pulse</p>
                <CardTitle className="mt-2 text-2xl">This month</CardTitle>
              </div>
              <Badge className={cn('border-0 shadow-none', revenueTone.chip)}>
                {revenueTone.label}
              </Badge>
            </div>
            <CardDescription>
              {hasSalesTarget
                ? 'Compare actual revenue against the configured monthly target.'
                : 'Compare current income with your rolling six-month baseline until a target is configured.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-2">
              <p className="text-4xl font-semibold tracking-tight text-foreground">
                {formatCurrency(stats.monthlyRevenue)}
              </p>
              <p className="text-sm text-muted-foreground">
                {hasSalesTarget
                  ? `Target ${formatCurrency(stats.salesTarget!.targetAmount)} for ${formatMonthLabel(stats.salesTarget!.monthKey)}`
                  : `Baseline ${formatCurrency(monthlyAverage)} over the last 6 months`}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-muted-foreground">
                <span>{hasSalesTarget ? 'Target attainment' : 'Revenue attainment'}</span>
                <span>{targetProgressSource}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full transition-all', revenueTone.bar)}
                  style={{ width: `${revenueProgress}%` }}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="surface-muted p-4">
                <p className="section-eyebrow">{hasSalesTarget ? (targetDelta >= 0 ? 'Ahead of target' : 'Remaining to target') : 'Baseline variance'}</p>
                <p className="mt-3 text-2xl font-semibold tracking-tight">
                  {hasSalesTarget ? formatCurrency(Math.abs(targetDelta)) : `${revenuePace}%`}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {hasSalesTarget
                    ? targetDelta >= 0
                      ? 'Revenue has moved past the configured monthly goal.'
                      : 'This is what remains to hit the overall monthly target.'
                    : 'Use Settings to switch from baseline mode to target tracking.'}
                </p>
              </div>

              <div className="surface-muted p-4">
                <p className="section-eyebrow">Ops pressure</p>
                <p className="mt-3 text-2xl font-semibold tracking-tight">{opsLoad}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Combined active work, approvals, and overdue follow-up.
                </p>
              </div>
            </div>

            {!hasSalesTarget && (
              <div className="flex items-center justify-between gap-4 rounded-[22px] border border-dashed border-border/80 bg-muted/35 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Monthly sales target not configured</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add an overall target in Settings to unlock PRD-aligned progress tracking.
                  </p>
                </div>
                <Button variant="outline" className="shrink-0" render={<Link href="/settings" />}>
                  Configure
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
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

      {(visibleSections.has('revenueTracker') || hasMiddleCards) && (
        <section
          className={cn(
            'grid gap-6',
            visibleSections.has('revenueTracker') && hasMiddleCards
              ? 'xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]'
              : 'grid-cols-1'
          )}
        >
      {visibleSections.has('revenueTracker') && (
        <Card className="surface-card">
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

      {hasMiddleCards && (
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
        </div>
      )}
        </section>
      )}

      {hasBottomCards && (
        <section
          className={cn(
            'grid gap-6',
            visibleSections.has('activityLog') && visibleSections.has('decisionQueue')
              ? 'xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]'
              : 'grid-cols-1'
          )}
        >
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
        </section>
      )}
    </div>
  )
}
