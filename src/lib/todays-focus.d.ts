export type TodaysFocusCountKey =
  | 'overdueTasks'
  | 'dueLeadFollowUps'
  | 'staleProposals'
  | 'highValueLeads'
  | 'dueProjectDeadlines'

export type TodaysFocusItem = Record<string, unknown> & {
  id: string
  link: string
}

export type NormalizedTodaysFocus = {
  generatedAt: number
  counts: Record<TodaysFocusCountKey, number>
  overdueTasks: TodaysFocusItem[]
  dueLeadFollowUps: TodaysFocusItem[]
  staleProposals: TodaysFocusItem[]
  highValueLeads: TodaysFocusItem[]
  dueProjectDeadlines: TodaysFocusItem[]
}

export const EMPTY_TODAYS_FOCUS: NormalizedTodaysFocus
export function normalizeTodaysFocus(value: unknown): NormalizedTodaysFocus
