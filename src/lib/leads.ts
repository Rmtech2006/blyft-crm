// Lead pipeline stages — aligned to BLYFT Automated Client Onboarding System (PDF)
export const LEAD_STAGES = [
  'LEAD_CAPTURED',
  'QUALIFICATION_SUBMITTED',
  'STRATEGY_CALL',
  'PROPOSAL_SENT',
  'PROPOSAL_ACCEPTED',
  'NURTURE',
  'LOST',
] as const

export type LeadStage = (typeof LEAD_STAGES)[number]

export const TERMINAL_STAGES: LeadStage[] = ['PROPOSAL_ACCEPTED', 'LOST']

export const STAGE_COLORS: Record<LeadStage, string> = {
  LEAD_CAPTURED: 'bg-muted text-muted-foreground',
  QUALIFICATION_SUBMITTED: 'bg-primary/15 text-primary',
  STRATEGY_CALL: 'bg-violet-500/15 text-violet-500',
  PROPOSAL_SENT: 'bg-amber-500/15 text-amber-500',
  PROPOSAL_ACCEPTED: 'bg-emerald-500/15 text-emerald-500',
  NURTURE: 'bg-cyan-500/15 text-cyan-600',
  LOST: 'bg-destructive/15 text-destructive',
}

// Map a lead stage to the suggested email template title (must match seeded templates)
export const STAGE_TEMPLATE: Record<LeadStage, string | null> = {
  LEAD_CAPTURED: 'BLYFT Welcome Email',
  QUALIFICATION_SUBMITTED: 'BLYFT Strategy Call Booking',
  STRATEGY_CALL: 'BLYFT Proposal Sent',
  PROPOSAL_SENT: 'BLYFT Proposal Sent',
  PROPOSAL_ACCEPTED: 'BLYFT Payment & Agreement',
  NURTURE: null,
  LOST: null,
}

// Onboarding-stage email suggestions (clients table)
export const ONBOARDING_TEMPLATE: Record<string, string> = {
  needsAccess: 'BLYFT Access Request',
  kickoff: 'BLYFT Project Kickoff',
  firstDeliverables: 'BLYFT First Deliverables',
}
