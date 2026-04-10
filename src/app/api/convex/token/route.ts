import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { signConvexAccessToken } from '@/lib/convex-auth'
import { APP_ROLES, type AppRole } from '@/lib/roles'

function resolveRole(value: unknown): AppRole {
  return typeof value === 'string' && APP_ROLES.includes(value as AppRole)
    ? (value as AppRole)
    : 'TEAM_MEMBER'
}

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const token = await signConvexAccessToken({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: resolveRole(session.user.role),
    })

    return NextResponse.json({ token })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create token'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
