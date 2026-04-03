import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listTransactions = query({
  args: {
    type: v.optional(v.union(v.literal("INCOME"), v.literal("EXPENSE"))),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let transactions = await ctx.db.query("transactions").order("desc").collect();
    if (args.type) {
      transactions = transactions.filter((t) => t.type === args.type);
    }
    if (args.dateFrom) {
      transactions = transactions.filter((t) => t.date >= args.dateFrom!);
    }
    if (args.dateTo) {
      transactions = transactions.filter((t) => t.date <= args.dateTo!);
    }
    return await Promise.all(
      transactions.map(async (t) => {
        const client = t.clientId ? await ctx.db.get(t.clientId) : null;
        const project = t.projectId ? await ctx.db.get(t.projectId) : null;
        const bankAccount = t.bankAccountId ? await ctx.db.get(t.bankAccountId) : null;
        return {
          ...t,
          id: t._id,
          client: client ? { id: client._id, companyName: client.companyName } : null,
          project: project ? { id: project._id, name: project.name } : null,
          bankAccount: bankAccount ? { id: bankAccount._id, name: bankAccount.name } : null,
        };
      })
    );
  },
});

export const createTransaction = mutation({
  args: {
    type: v.union(v.literal("INCOME"), v.literal("EXPENSE")),
    amount: v.number(),
    category: v.string(),
    description: v.string(),
    date: v.number(),
    paymentMode: v.union(
      v.literal("CASH"), v.literal("UPI"), v.literal("BANK_TRANSFER"),
      v.literal("CHEQUE"), v.literal("CARD"), v.literal("OTHER")
    ),
    bankAccountId: v.optional(v.id("bankAccounts")),
    clientId: v.optional(v.id("clients")),
    projectId: v.optional(v.id("projects")),
    gstTagged: v.optional(v.boolean()),
    gstAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("transactions", {
      type: args.type,
      amount: args.amount,
      category: args.category,
      description: args.description,
      date: args.date,
      paymentMode: args.paymentMode,
      bankAccountId: args.bankAccountId,
      clientId: args.clientId,
      projectId: args.projectId,
      gstTagged: args.gstTagged ?? false,
      gstAmount: args.gstAmount,
    });
    if (args.bankAccountId) {
      const account = await ctx.db.get(args.bankAccountId);
      if (account) {
        const delta = args.type === "INCOME" ? args.amount : -args.amount;
        await ctx.db.patch(args.bankAccountId, {
          balance: account.balance + delta,
          lastUpdated: Date.now(),
        });
      }
    }
    return id;
  },
});

export const removeTransaction = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.id);
    if (!transaction) return;
    if (transaction.bankAccountId) {
      const account = await ctx.db.get(transaction.bankAccountId);
      if (account) {
        const reversal = transaction.type === "INCOME" ? -transaction.amount : transaction.amount;
        await ctx.db.patch(transaction.bankAccountId, {
          balance: account.balance + reversal,
          lastUpdated: Date.now(),
        });
      }
    }
    await ctx.db.delete(args.id);
  },
});

export const listBankAccounts = query({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.db.query("bankAccounts").collect();
    const activeAccounts = accounts.filter((a) => a.isActive);
    return await Promise.all(
      activeAccounts.map(async (account) => {
        const transactions = await ctx.db
          .query("transactions")
          .withIndex("by_bankAccountId", (q) => q.eq("bankAccountId", account._id))
          .collect();
        return {
          ...account,
          id: account._id,
          transactions: transactions.map((t) => ({ ...t, id: t._id })),
        };
      })
    );
  },
});

export const createBankAccount = mutation({
  args: {
    name: v.string(),
    bankName: v.string(),
    accountNumber: v.optional(v.string()),
    balance: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("bankAccounts", {
      name: args.name,
      bankName: args.bankName,
      accountNumber: args.accountNumber ?? "",
      balance: args.balance ?? 0,
      lastUpdated: Date.now(),
      isActive: true,
    });
  },
});

export const updateBankAccountBalance = mutation({
  args: { id: v.id("bankAccounts"), balance: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { balance: args.balance, lastUpdated: Date.now() });
  },
});

export const removeBankAccount = mutation({
  args: { id: v.id("bankAccounts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isActive: false });
  },
});
