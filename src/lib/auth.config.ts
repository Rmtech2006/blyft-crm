import type { NextAuthConfig } from 'next-auth'

// Lightweight auth config for Edge middleware — no PrismaAdapter, no DB calls
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isPublic =
        nextUrl.pathname === '/login' ||
        nextUrl.pathname === '/capture' ||
        nextUrl.pathname.startsWith('/api/auth') ||
        nextUrl.pathname.startsWith('/api/convex')

      if (isPublic) return true
      if (isLoggedIn) return true

      return false
    },
  },
}
