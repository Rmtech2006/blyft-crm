import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { authConfig } from '@/lib/auth.config'

const ADMIN_USERS = [
  { id: 'ritish', name: 'Ritish', email: 'ritish@blyftit.com', password: 'Ritish@2826', role: 'SUPER_ADMIN' as const },
  { id: 'eshaan', name: 'Eshaan', email: 'eshaan@blyftit.com', password: 'Eshaan@2026', role: 'SUPER_ADMIN' as const },
]

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = ADMIN_USERS.find(
          (u) =>
            u.email === credentials.email &&
            u.password === credentials.password
        )

        if (!user) return null

        return { id: user.id, name: user.name, email: user.email, role: user.role }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = ((user as { role?: string }).role ?? 'SUPER_ADMIN') as 'SUPER_ADMIN'
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as 'SUPER_ADMIN'
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
})
