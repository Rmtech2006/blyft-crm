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

// ── Financial Snapshot ────────────────────────────────────────────────────────

export const getSnapshot = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
    const transactions = await ctx.db.query("transactions").collect();

    const monthIncome = transactions.filter((t) => t.type === "INCOME" && t.date >= startOfMonth).reduce((s, t) => s + t.amount, 0);
    const monthExpense = transactions.filter((t) => t.type === "EXPENSE" && t.date >= startOfMonth).reduce((s, t) => s + t.amount, 0);
    const ytdIncome = transactions.filter((t) => t.type === "INCOME" && t.date >= startOfYear).reduce((s, t) => s + t.amount, 0);
    const ytdExpense = transactions.filter((t) => t.type === "EXPENSE" && t.date >= startOfYear).reduce((s, t) => s + t.amount, 0);

    // Monthly revenue for last 6 months
    const monthlyRevenue: { month: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = d.getTime();
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();
      const label = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
      const income = transactions.filter((t) => t.type === "INCOME" && t.date >= start && t.date <= end).reduce((s, t) => s + t.amount, 0);
      const expense = transactions.filter((t) => t.type === "EXPENSE" && t.date >= start && t.date <= end).reduce((s, t) => s + t.amount, 0);
      monthlyRevenue.push({ month: label, income, expense });
    }

    return { monthIncome, monthExpense, ytdIncome, ytdExpense, monthlyRevenue };
  },
});

// ── Outstanding Payments ──────────────────────────────────────────────────────

export const getOutstanding = query({
  args: {},
  handler: async (ctx) => {
    const clients = await ctx.db.query("clients").filter((q) => q.eq(q.field("status"), "ACTIVE")).collect();
    const transactions = await ctx.db.query("transactions").filter((q) => q.eq(q.field("type"), "INCOME")).collect();
    const now = Date.now();
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

    return clients
      .filter((c) => c.retainerAmount && c.retainerAmount > 0)
      .map((c) => {
        const clientTransactions = transactions.filter((t) => t.clientId === c._id);
        const receivedThisMonth = clientTransactions.filter((t) => t.date >= startOfMonth).reduce((s, t) => s + t.amount, 0);
        const totalReceived = clientTransactions.reduce((s, t) => s + t.amount, 0);
        const outstanding = Math.max(0, (c.retainerAmount ?? 0) - receivedThisMonth);
        const lastPayment = clientTransactions.sort((a, b) => b.date - a.date)[0];
        const daysSincePayment = lastPayment ? Math.floor((now - lastPayment.date) / (1000 * 60 * 60 * 24)) : null;
        return {
          id: c._id,
          companyName: c.companyName,
          retainerAmount: c.retainerAmount ?? 0,
          receivedThisMonth,
          outstanding,
          totalReceived,
          daysSincePayment,
          lastPaymentDate: lastPayment?.date ?? null,
        };
      })
      .filter((c) => c.outstanding > 0);
  },
});

// ── Petty Cash ────────────────────────────────────────────────────────────────

export const listPettyCash = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("pettyCash").order("desc").collect();
    return entries.map((e) => ({ ...e, id: e._id }));
  },
});

export const addPettyCash = mutation({
  args: {
    description: v.string(),
    amount: v.number(),
    type: v.union(v.literal("IN"), v.literal("OUT")),
    date: v.number(),
    category: v.string(),
    addedBy: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("pettyCash", args);
  },
});

export const removePettyCash = mutation({
  args: { id: v.id("pettyCash") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
