'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import {
  Users,
  FolderKanban,
  TrendingUp,
  Wallet,
  PlusCircle,
  UserPlus,
  CheckSquare,
  Receipt,
  ArrowRight,
  Activity,
} from 'lucide-react'
import { StatsCard } from '@/components/dashboard/stats-card'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'

const quickActions = [
  { label: 'Add Lead', href: '/leads', icon: UserPlus, description: 'Track a new prospect' },
  { label: 'Add Client', href: '/clients', icon: PlusCircle, description: 'Onboard a new client' },
  { label: 'Create Task', href: '/tasks', icon: CheckSquare, description: 'Add a task or to-do' },
  { label: 'Record Expense', href: '/finance', icon: Receipt, description: 'Log income or expense' },
]

function formatCurrency(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
  return `₹${amount.toLocaleString('en-IN')}`
}

function getActionColor(action: string): string {
  const map: Record<string, string> = {
    CREATE: 'bg-emerald-500',
    UPDATE: 'bg-blue-500',
    DELETE: 'bg-red-500',
    LOGIN: 'bg-purple-500',
  }
  return map[action.toUpperCase()] ?? 'bg-slate-400'
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const stats = useQuery(api.dashboard.getStats)

  const greeting = (() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  })()

  if (!stats) return <div className="p-8 text-center text-muted-foreground">Loading…</div>

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {greeting},{' '}
          <span className="text-blue-500">
            {session?.user?.name?.split(' ')[0] ?? 'there'}
          </span>{' '}
          👋
        </h1>
        <p className="text-muted-foreground text-sm">
          Here&apos;s what&apos;s happening at BLYFT today.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Active Clients" value={stats.totalClients} subtitle="Currently active retainers" icon={Users} iconClassName="bg-blue-500/10" />
        <StatsCard title="Active Projects" value={stats.activeProjects} subtitle="In progress or review" icon={FolderKanban} iconClassName="bg-violet-500/10" />
        <StatsCard title="Open Leads" value={stats.openLeads} subtitle="Leads in pipeline" icon={TrendingUp} iconClassName="bg-amber-500/10" />
        <StatsCard title="Monthly Revenue" value={formatCurrency(stats.monthlyRevenue)} subtitle="Income this month" icon={Wallet} iconClassName="bg-emerald-500/10" />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.href} href={action.href}>
                <Card className="group cursor-pointer border-border hover:border-blue-500/50 hover:shadow-md transition-all duration-200">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                      <Icon className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground group-hover:text-blue-500 transition-colors leading-none">{action.label}</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{action.description}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
              <CardDescription className="text-xs">Latest actions across the workspace</CardDescription>
            </div>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats.recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Activity className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No activity recorded yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Activity will appear here as you use the CRM</p>
              </div>
            ) : (
              <div className="space-y-1">
                {stats.recentActivity.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/50 transition-colors">
                    <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${getActionColor(log.action)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-tight">
                        <span className="font-medium">{(log.user as { name?: string } | null)?.name ?? 'System'}</span>{' '}
                        <span className="text-muted-foreground">{log.action.toLowerCase()}d a {log.entity.toLowerCase()}</span>
                      </p>
                      {log.details && <p className="text-xs text-muted-foreground truncate mt-0.5">{log.details}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground/60 shrink-0 mt-0.5">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Pending Approvals</CardTitle>
              <CardDescription className="text-xs">Items awaiting your review</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-foreground">Reimbursements</span>
                </div>
                <Badge
                  variant={stats.pendingReimbursements > 0 ? 'default' : 'secondary'}
                  className={stats.pendingReimbursements > 0 ? 'bg-amber-500/15 text-amber-600 hover:bg-amber-500/20 border-0' : ''}
                >
                  {stats.pendingReimbursements}
                </Badge>
              </div>
              {stats.pendingReimbursements > 0 && (
                <Button size="sm" variant="outline" className="w-full text-xs h-8" render={<Link href="/reimbursements" />}>
                  Review now
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Navigate</CardTitle>
              <CardDescription className="text-xs">Jump to any module</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {[
                  { label: 'Finance', href: '/finance' },
                  { label: 'Clients', href: '/clients' },
                  { label: 'Projects', href: '/projects' },
                  { label: 'Tasks', href: '/tasks' },
                  { label: 'Leads', href: '/leads' },
                  { label: 'Team', href: '/team' },
                  { label: 'Templates', href: '/templates' },
                ].map((item) => (
                  <Link key={item.href} href={item.href} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors group">
                    <span>{item.label}</span>
                    <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
