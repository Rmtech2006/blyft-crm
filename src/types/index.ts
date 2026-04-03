// Re-export all Prisma-generated types
export type {
  User,
  Account,
  Session,
  VerificationToken,
  BankAccount,
  Transaction,
  PettyCash,
  Client,
  ClientContact,
  ClientNote,
  Project,
  Milestone,
  ProjectTeamMember,
  Task,
  Subtask,
  TaskComment,
  Lead,
  LeadNote,
  LeadCallLog,
  TeamMember,
  OffboardingChecklist,
  Reimbursement,
  MessageTemplate,
  TemplateVersion,
  Invoice,
  InvoiceLineItem,
  ActivityLog,
  Notification,
} from '@/generated/prisma'

export {
  Role,
  TransactionType,
  PaymentMode,
  ClientStatus,
  ProjectType,
  ProjectStatus,
  TaskStatus,
  TaskPriority,
  RecurringType,
  LeadSource,
  LeadStage,
  TeamMemberType,
  TeamMemberStatus,
  CompensationMode,
  ReimbursementCategory,
  ReimbursementStatus,
  TemplateCategory,
  InvoiceStatus,
} from '@/generated/prisma'

// ─── Session User ─────────────────────────────────────────────────────────────

export interface SessionUser {
  id: string
  name: string | null
  email: string
  role: 'SUPER_ADMIN' | 'TEAM_MEMBER' | 'CLIENT'
  image: string | null
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number | string
}
