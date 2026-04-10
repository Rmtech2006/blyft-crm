function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export type DashboardTrendPoint = {
  month: string
  income: number
  target: number
}

export type DashboardSalesTarget = {
  id: string
  monthKey: string
  label: string
  targetAmount: number
  actualAmount: number
  progress: number
} | null

export type DashboardScopedTarget = {
  id: string
  scopeType: 'DEPARTMENT' | 'MEMBER'
  label: string
  targetAmount: number
  actualAmount: number
  progress: number
}

export type DashboardActivity = {
  id: string
  action: string
  entity: string
  details?: string
  createdAt: number
  user: { name?: string } | null
}

export type DashboardStats = {
  currentMonthKey: string
  totalClients: number
  activeProjects: number
  openLeads: number
  monthlyRevenue: number
  overdueCount: number
  pendingReimbursements: number
  monthlyRevenueTrend: DashboardTrendPoint[]
  salesTarget: DashboardSalesTarget
  salesTargets: DashboardScopedTarget[]
  recentActivity: DashboardActivity[]
}

export type DashboardStatsCompat = {
  data: DashboardStats
  isPartial: boolean
}

export const EMPTY_DASHBOARD_STATS: DashboardStats = {
  currentMonthKey: getMonthKey(new Date()),
  totalClients: 0,
  activeProjects: 0,
  openLeads: 0,
  monthlyRevenue: 0,
  overdueCount: 0,
  pendingReimbursements: 0,
  monthlyRevenueTrend: [],
  salesTarget: null,
  salesTargets: [],
  recentActivity: [],
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

export function normalizeDashboardStats(value: unknown): DashboardStatsCompat {
  const source = asObject(value)

  if (!source) {
    return { data: EMPTY_DASHBOARD_STATS, isPartial: false }
  }

  const monthlyRevenueTrend = Array.isArray(source.monthlyRevenueTrend)
    ? source.monthlyRevenueTrend
        .map((entry) => {
          const item = asObject(entry)
          if (!item) return null

          return {
            month: asString(item.month, 'N/A'),
            income: asNumber(item.income),
            target: asNumber(item.target),
          }
        })
        .filter((entry): entry is DashboardTrendPoint => Boolean(entry))
    : []

  const salesTargetSource = asObject(source.salesTarget)
  const salesTarget = salesTargetSource
    ? {
        id: asString(salesTargetSource.id, 'overall-target'),
        monthKey: asString(salesTargetSource.monthKey, EMPTY_DASHBOARD_STATS.currentMonthKey),
        label: asString(salesTargetSource.label, 'Overall business'),
        targetAmount: asNumber(salesTargetSource.targetAmount),
        actualAmount: asNumber(salesTargetSource.actualAmount),
        progress: asNumber(salesTargetSource.progress),
      }
    : null

  const salesTargets = Array.isArray(source.salesTargets)
    ? source.salesTargets
        .map((entry) => {
          const item = asObject(entry)
          if (!item) return null

          const scopeType = item.scopeType === 'DEPARTMENT' ? 'DEPARTMENT' : item.scopeType === 'MEMBER' ? 'MEMBER' : null
          if (!scopeType) return null

          return {
            id: asString(item.id, `${scopeType.toLowerCase()}-target`),
            scopeType,
            label: asString(item.label, scopeType === 'DEPARTMENT' ? 'Department' : 'Team member'),
            targetAmount: asNumber(item.targetAmount),
            actualAmount: asNumber(item.actualAmount),
            progress: asNumber(item.progress),
          }
        })
        .filter((entry): entry is DashboardScopedTarget => Boolean(entry))
    : []

  const recentActivity = Array.isArray(source.recentActivity)
    ? source.recentActivity.flatMap((entry): DashboardActivity[] => {
        const item = asObject(entry)
        if (!item) return []

        const user = asObject(item.user)

        return [{
          id: asString(item.id, `${asString(item.entity, 'entity')}-${asNumber(item.createdAt, Date.now())}`),
          action: asString(item.action, 'UPDATE'),
          entity: asString(item.entity, 'ITEM'),
          details: typeof item.details === 'string' ? item.details : undefined,
          createdAt: asNumber(item.createdAt, Date.now()),
          user: user ? { name: typeof user.name === 'string' ? user.name : undefined } : null,
        }]
      })
    : []

  const isPartial =
    !Array.isArray(source.monthlyRevenueTrend) ||
    !Array.isArray(source.salesTargets) ||
    typeof source.overdueCount !== 'number' ||
    !('salesTarget' in source)

  return {
    data: {
      currentMonthKey: asString(source.currentMonthKey, EMPTY_DASHBOARD_STATS.currentMonthKey),
      totalClients: asNumber(source.totalClients),
      activeProjects: asNumber(source.activeProjects),
      openLeads: asNumber(source.openLeads),
      monthlyRevenue: asNumber(source.monthlyRevenue),
      overdueCount: asNumber(source.overdueCount),
      pendingReimbursements: asNumber(source.pendingReimbursements),
      monthlyRevenueTrend,
      salesTarget,
      salesTargets,
      recentActivity,
    },
    isPartial,
  }
}
