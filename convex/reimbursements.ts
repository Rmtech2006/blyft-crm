import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserId } from "./auth";

const USERS: Record<string, { id: string; name: string }> = {
  ritish: { id: "ritish", name: "Ritish" },
  eshaan: { id: "eshaan", name: "Eshaan" },
};

export const list = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("reimbursements").order("desc").take(300);
    return await Promise.all(
      items.map(async (item) => {
        const teamMember = item.teamMemberId ? await ctx.db.get(item.teamMemberId) : null;
        const receiptUrl = item.receiptStorageId
          ? await ctx.storage.getUrl(item.receiptStorageId)
          : item.receiptUrl;
        return {
          ...item,
          id: item._id,
          receiptUrl: receiptUrl ?? undefined,
          submittedBy: USERS[item.submittedById] ?? { id: item.submittedById, name: item.submittedById },
          teamMember: teamMember
            ? {
                id: teamMember._id,
                fullName: teamMember.fullName,
                upiId: teamMember.upiId,
                bankDetails: teamMember.bankDetails,
                paymentMode: teamMember.paymentMode,
              }
            : null,
        };
      })
    );
  },
});

export const create = mutation({
  args: {
    category: v.union(
      v.literal("TRAVEL"), v.literal("FOOD_ENTERTAINMENT"), v.literal("TOOLS_SOFTWARE"),
      v.literal("OFFICE_SUPPLIES"), v.literal("AD_SPEND"), v.literal("MISCELLANEOUS")
    ),
    amount: v.number(),
    description: v.string(),
    date: v.number(),
    receiptUrl: v.optional(v.string()),
    receiptStorageId: v.optional(v.string()),
    teamMemberId: v.optional(v.id("teamMembers")),
  },
  handler: async (ctx, args) => {
    const submittedById = await getCurrentUserId(ctx);

    return await ctx.db.insert("reimbursements", {
      category: args.category,
      amount: args.amount,
      description: args.description,
      date: args.date,
      receiptUrl: args.receiptUrl,
      receiptStorageId: args.receiptStorageId,
      status: "PENDING",
      submittedById,
      teamMemberId: args.teamMemberId,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("reimbursements"),
    category: v.union(
      v.literal("TRAVEL"), v.literal("FOOD_ENTERTAINMENT"), v.literal("TOOLS_SOFTWARE"),
      v.literal("OFFICE_SUPPLIES"), v.literal("AD_SPEND"), v.literal("MISCELLANEOUS")
    ),
    amount: v.number(),
    description: v.string(),
    date: v.number(),
    receiptUrl: v.optional(v.string()),
    receiptStorageId: v.optional(v.string()),
    teamMemberId: v.optional(v.id("teamMembers")),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("reimbursements"),
    status: v.union(
      v.literal("PENDING"), v.literal("APPROVED"), v.literal("REJECTED"), v.literal("PAID")
    ),
    rejectionNote: v.optional(v.string()),
    approverId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { status: args.status };
    if (args.status === "APPROVED") patch.approvedAt = Date.now();
    if (args.status === "PAID") patch.paidAt = Date.now();
    if (args.rejectionNote) patch.rejectionNote = args.rejectionNote;
    if (args.approverId) patch.approverId = args.approverId;
    await ctx.db.patch(args.id, patch);
  },
});
