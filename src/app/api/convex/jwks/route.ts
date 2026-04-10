import { NextResponse } from 'next/server'
import { getConvexJwks } from '@/lib/convex-auth'

export async function GET() {
  try {
    return NextResponse.json(await getConvexJwks())
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load JWKS'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
