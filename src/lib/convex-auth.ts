import { exportJWK, importPKCS8, importSPKI, SignJWT, type JWK } from 'jose'
import type { AppRole } from '@/lib/roles'

const CONVEX_AUDIENCE = process.env.CONVEX_AUTH_AUDIENCE ?? 'convex'
const CONVEX_ISSUER = process.env.CONVEX_AUTH_ISSUER ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
const CONVEX_JWKS_PATH = '/api/convex/jwks'
const CONVEX_KEY_ID = process.env.CONVEX_AUTH_KID ?? 'blyft-convex-auth'

type ConvexJwtUser = {
  id: string
  email?: string | null
  name?: string | null
  role: AppRole
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export function getConvexAuthIssuer() {
  return CONVEX_ISSUER
}

export function getConvexAuthAudience() {
  return CONVEX_AUDIENCE
}

export function getConvexJwksUrl() {
  return new URL(CONVEX_JWKS_PATH, `${CONVEX_ISSUER}/`).toString()
}

async function getPrivateKey() {
  return importPKCS8(requireEnv('CONVEX_AUTH_PRIVATE_KEY'), 'RS256')
}

async function getPublicKey() {
  return importSPKI(requireEnv('CONVEX_AUTH_PUBLIC_KEY'), 'RS256')
}

export async function signConvexAccessToken(user: ConvexJwtUser) {
  const privateKey = await getPrivateKey()

  return new SignJWT({
    email: user.email ?? undefined,
    name: user.name ?? undefined,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'RS256', kid: CONVEX_KEY_ID, typ: 'JWT' })
    .setIssuer(CONVEX_ISSUER)
    .setAudience(CONVEX_AUDIENCE)
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(privateKey)
}

export async function getConvexJwks(): Promise<{ keys: JWK[] }> {
  const publicKey = await getPublicKey()
  const jwk = await exportJWK(publicKey)

  return {
    keys: [
      {
        ...jwk,
        alg: 'RS256',
        kid: CONVEX_KEY_ID,
        use: 'sig',
      },
    ],
  }
}
