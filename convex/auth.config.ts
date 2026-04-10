import type { AuthConfig } from "convex/server";

const issuer =
  process.env.CONVEX_AUTH_ISSUER ??
  process.env.NEXTAUTH_URL ??
  "http://localhost:3000";

const jwksUrl = new URL("/api/convex/jwks", `${issuer}/`).toString();

const authConfig = {
  providers: [
    {
      type: "customJwt",
      issuer,
      jwks: jwksUrl,
      algorithm: "RS256",
      applicationID: process.env.CONVEX_AUTH_AUDIENCE ?? "convex",
    },
  ],
} satisfies AuthConfig;

export default authConfig
