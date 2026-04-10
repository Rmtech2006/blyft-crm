import type { AppRole } from '@/lib/roles'

// ─── Session User ─────────────────────────────────────────────────────────────

export interface SessionUser {
  id: string
  name: string | null
  email: string
  role: AppRole
  image: string | null
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number | string
}
