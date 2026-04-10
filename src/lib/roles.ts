export const APP_ROLES = ['SUPER_ADMIN', 'TEAM_MEMBER', 'CLIENT'] as const

export type AppRole = (typeof APP_ROLES)[number]
