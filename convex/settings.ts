import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db.query("userSettings").withIndex("by_userId", (q) => q.eq("userId", userId)).first();
  },
});

export const upsert = mutation({
  args: {
    userId: v.string(),
    displayName: v.optional(v.string()),
    notifOverdueTasks: v.optional(v.boolean()),
    notifNewLeads: v.optional(v.boolean()),
    notifPaymentDue: v.optional(v.boolean()),
    notifReimbursements: v.optional(v.boolean()),
    notifProjectUpdates: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, ...rest } = args;
    const existing = await ctx.db.query("userSettings").withIndex("by_userId", (q) => q.eq("userId", userId)).first();
    if (existing) {
      await ctx.db.patch(existing._id, rest);
    } else {
      await ctx.db.insert("userSettings", {
        userId,
        displayName: rest.displayName,
        notifOverdueTasks: rest.notifOverdueTasks ?? true,
        notifNewLeads: rest.notifNewLeads ?? true,
        notifPaymentDue: rest.notifPaymentDue ?? true,
        notifReimbursements: rest.notifReimbursements ?? true,
        notifProjectUpdates: rest.notifProjectUpdates ?? false,
      });
    }
  },
});
