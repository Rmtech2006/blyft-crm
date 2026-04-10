import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function normalizeDepartment(department?: string) {
  const value = department?.trim();
  return value ? value : undefined;
}

export const listForMonth = query({
  args: { monthKey: v.string() },
  handler: async (ctx, args) => {
    const targets = await ctx.db
      .query("salesTargets")
      .withIndex("by_monthKey", (q) => q.eq("monthKey", args.monthKey))
      .take(50);

    const memberIds = [...new Set(targets.flatMap((target) => (target.teamMemberId ? [target.teamMemberId] : [])))];
    const members = await Promise.all(memberIds.map((memberId) => ctx.db.get(memberId)));
    const memberNameMap = new Map(
      members.filter(Boolean).map((member) => [member!._id, member!.fullName])
    );

    const scopeOrder = { OVERALL: 0, DEPARTMENT: 1, MEMBER: 2 } as const;

    return targets
      .map((target) => {
        const actualAmount = target.scopeType === "OVERALL" ? undefined : target.actualAmount ?? 0;
        const label =
          target.scopeType === "OVERALL"
            ? "Overall business"
            : target.scopeType === "DEPARTMENT"
              ? target.department ?? "Department"
              : memberNameMap.get(target.teamMemberId!) ?? "Team member";

        return {
          id: target._id,
          monthKey: target.monthKey,
          scopeType: target.scopeType,
          label,
          department: target.department,
          teamMemberId: target.teamMemberId,
          targetAmount: target.targetAmount,
          actualAmount,
          notes: target.notes,
          updatedAt: target.updatedAt,
          progress:
            actualAmount !== undefined && target.targetAmount > 0
              ? Math.round((actualAmount / target.targetAmount) * 100)
              : null,
        };
      })
      .sort((a, b) => {
        const scopeDiff = scopeOrder[a.scopeType] - scopeOrder[b.scopeType];
        if (scopeDiff !== 0) return scopeDiff;
        return a.label.localeCompare(b.label);
      });
  },
});

export const upsert = mutation({
  args: {
    id: v.optional(v.id("salesTargets")),
    monthKey: v.string(),
    scopeType: v.union(
      v.literal("OVERALL"),
      v.literal("DEPARTMENT"),
      v.literal("MEMBER")
    ),
    targetAmount: v.number(),
    actualAmount: v.optional(v.number()),
    department: v.optional(v.string()),
    teamMemberId: v.optional(v.id("teamMembers")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const department = normalizeDepartment(args.department);
    const notes = args.notes?.trim() || undefined;
    const actualAmount = args.scopeType === "OVERALL" ? undefined : args.actualAmount;
    const payload = {
      monthKey: args.monthKey,
      scopeType: args.scopeType,
      targetAmount: args.targetAmount,
      actualAmount,
      department,
      teamMemberId: args.scopeType === "MEMBER" ? args.teamMemberId : undefined,
      notes,
      updatedAt: Date.now(),
    };

    const possibleMatches = await ctx.db
      .query("salesTargets")
      .withIndex("by_scopeType_and_monthKey", (q) =>
        q.eq("scopeType", args.scopeType).eq("monthKey", args.monthKey)
      )
      .take(50);

    const duplicate = possibleMatches.find((target) => {
      if (args.scopeType === "OVERALL") return true;
      if (args.scopeType === "DEPARTMENT") return target.department === department;
      return target.teamMemberId === args.teamMemberId;
    });

    if (args.id) {
      if (duplicate && duplicate._id !== args.id) {
        throw new Error("A target already exists for this scope and month.");
      }
      await ctx.db.patch(args.id, payload);
      return args.id;
    }

    if (duplicate) {
      await ctx.db.patch(duplicate._id, payload);
      return duplicate._id;
    }

    return await ctx.db.insert("salesTargets", payload);
  },
});

export const remove = mutation({
  args: { id: v.id("salesTargets") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});
