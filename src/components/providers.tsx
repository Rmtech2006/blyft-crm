'use client'

import { useMemo } from 'react'
import { SessionProvider, useSession } from 'next-auth/react'
import { ConvexProviderWithAuth, ConvexReactClient } from 'convex/react'

function useNextAuthToken() {
  const { status } = useSession()

  return useMemo(() => ({
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    fetchAccessToken: async () => {
      if (status !== 'authenticated') return null

      const response = await fetch('/api/convex/token', {
        credentials: 'include',
        cache: 'no-store',
      })

      if (!response.ok) return null

      const data = (await response.json()) as { token?: string }
      return data.token ?? null
    },
  }), [status])
}

function getConvexUrl() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!convexUrl) {
    throw new Error('Missing NEXT_PUBLIC_CONVEX_URL')
  }
  return convexUrl
}

function ConvexSessionBridge({ children }: { children: React.ReactNode }) {
  const convex = useMemo(
    () => new ConvexReactClient(getConvexUrl()),
    []
  )
  const auth = useNextAuthToken()

  return (
    <ConvexProviderWithAuth client={convex} useAuth={() => auth}>
      {children}
    </ConvexProviderWithAuth>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ConvexSessionBridge>{children}</ConvexSessionBridge>
    </SessionProvider>
  )
}
