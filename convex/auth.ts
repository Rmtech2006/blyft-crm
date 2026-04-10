import type { UserIdentity } from "convex/server";
import { type QueryCtx, type MutationCtx } from "./_generated/server";

type AuthenticatedCtx = QueryCtx | MutationCtx;

export async function requireIdentity(ctx: AuthenticatedCtx): Promise<UserIdentity> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized");
  }

  return identity;
}

export async function getCurrentUserId(ctx: AuthenticatedCtx): Promise<string> {
  const identity = await requireIdentity(ctx);
  return identity.subject;
}

export async function requireRole(
  ctx: AuthenticatedCtx,
  allowedRoles: string[],
): Promise<UserIdentity> {
  const identity = await requireIdentity(ctx);
  const role = typeof identity.role === "string" ? identity.role : "TEAM_MEMBER";

  if (!allowedRoles.includes(role)) {
    throw new Error("Forbidden");
  }

  return identity;
}
