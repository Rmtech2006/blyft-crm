export const DASHBOARD_SECTION_OPTIONS = [
  {
    id: 'heroOverview',
    label: 'Executive overview',
    description: 'Show the hero summary and revenue pulse at the top of the dashboard.',
  },
  {
    id: 'metricStrip',
    label: 'KPI strip',
    description: 'Show the four compact KPI cards for clients, projects, leads, and revenue.',
  },
  {
    id: 'revenueTracker',
    label: 'Revenue tracker',
    description: 'Show the six-month revenue trend chart.',
  },
  {
    id: 'quickActions',
    label: 'Quick actions',
    description: 'Show the pinned shortcut cards for common CRM actions.',
  },
  {
    id: 'salesBoard',
    label: 'Sales target board',
    description: 'Show the department and team-member target progress board.',
  },
  {
    id: 'attentionQueue',
    label: 'Attention queue',
    description: 'Show overdue work, approvals, and pipeline pressure blocks.',
  },
  {
    id: 'activityLog',
    label: 'Activity log',
    description: 'Show recent workspace activity in the dashboard timeline.',
  },
  {
    id: 'decisionQueue',
    label: 'Decision queue',
    description: 'Show reimbursement approvals and overdue task review cards.',
  },
] as const

export type DashboardSectionId = (typeof DASHBOARD_SECTION_OPTIONS)[number]['id']

export const DASHBOARD_QUICK_ACTION_OPTIONS = [
  {
    id: 'add-lead',
    label: 'Add lead',
    description: 'Capture a new opportunity and move it into the pipeline.',
    href: '/leads',
  },
  {
    id: 'add-client',
    label: 'Add client',
    description: 'Onboard a new account and start tracking delivery.',
    href: '/clients',
  },
  {
    id: 'create-task',
    label: 'Create task',
    description: 'Assign work fast and keep the delivery board current.',
    href: '/tasks',
  },
  {
    id: 'record-expense',
    label: 'Record expense',
    description: 'Keep operating cashflow accurate in one place.',
    href: '/finance',
  },
] as const

export type DashboardQuickActionId = (typeof DASHBOARD_QUICK_ACTION_OPTIONS)[number]['id']

export const DEFAULT_DASHBOARD_SECTIONS = DASHBOARD_SECTION_OPTIONS.map(
  (section) => section.id
) as DashboardSectionId[]

export const DEFAULT_DASHBOARD_QUICK_ACTIONS = DASHBOARD_QUICK_ACTION_OPTIONS.map(
  (action) => action.id
) as DashboardQuickActionId[]

export function normalizeDashboardSectionIds(value: unknown): DashboardSectionId[] {
  if (!Array.isArray(value)) return DEFAULT_DASHBOARD_SECTIONS

  const validIds = new Set<DashboardSectionId>(DEFAULT_DASHBOARD_SECTIONS)
  const ids = value.filter(
    (item): item is DashboardSectionId =>
      typeof item === 'string' && validIds.has(item as DashboardSectionId)
  )

  return ids.length > 0 ? ids : DEFAULT_DASHBOARD_SECTIONS
}

export function normalizeDashboardQuickActionIds(value: unknown): DashboardQuickActionId[] {
  if (!Array.isArray(value)) return DEFAULT_DASHBOARD_QUICK_ACTIONS

  const validIds = new Set<DashboardQuickActionId>(DEFAULT_DASHBOARD_QUICK_ACTIONS)
  const ids = value.filter(
    (item): item is DashboardQuickActionId =>
      typeof item === 'string' && validIds.has(item as DashboardQuickActionId)
  )

  return ids.length > 0 ? ids : DEFAULT_DASHBOARD_QUICK_ACTIONS
}
