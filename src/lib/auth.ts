import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { authConfig } from '@/lib/auth.config'
import { APP_ROLES, type AppRole } from '@/lib/roles'

type AuthUserRecord = {
  id: string
  name: string
  email: string
  password: string
  role: AppRole
}

function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && APP_ROLES.includes(value as AppRole)
}

function getConfiguredUsers(): AuthUserRecord[] {
  const raw = process.env.BLYFT_AUTH_USERS_JSON
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.flatMap((entry): AuthUserRecord[] => {
      if (!entry || typeof entry !== 'object') return []

      const candidate = entry as Partial<AuthUserRecord>
      if (
        typeof candidate.id !== 'string' ||
        typeof candidate.name !== 'string' ||
        typeof candidate.email !== 'string' ||
        typeof candidate.password !== 'string' ||
        !isAppRole(candidate.role)
      ) {
        return []
      }

      return [
        {
          id: candidate.id,
          name: candidate.name,
          email: candidate.email.toLowerCase(),
          password: candidate.password,
          role: candidate.role,
        },
      ]
    })
  } catch {
    return []
  }
}

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
        const email = typeof credentials?.email === 'string' ? credentials.email.toLowerCase() : ''
        const password = typeof credentials?.password === 'string' ? credentials.password : ''

        if (!email || !password) return null

        const user = getConfiguredUsers().find(
          (u) =>
            u.email === email &&
            u.password === password
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
        token.role = ((user as { role?: AppRole }).role ?? 'TEAM_MEMBER') as AppRole
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = (token.role as AppRole | undefined) ?? 'TEAM_MEMBER'
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
})
