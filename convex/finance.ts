import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getTransactionEditBankAdjustments } from "../src/lib/finance-classification.mjs";

const NON_OPERATING_INCOME_CATEGORIES = new Set([
  "bank interest",
  "non-operating income",
  "non operating income",
]);

function isOperatingIncome(transaction: { type: "INCOME" | "EXPENSE"; category: string }) {
  return (
    transaction.type === "INCOME" &&
    !NON_OPERATING_INCOME_CATEGORIES.has(transaction.category.trim().toLowerCase())
  );
}

function isNonOperatingIncome(transaction: { type: "INCOME" | "EXPENSE"; category: string }) {
  return (
    transaction.type === "INCOME" &&
    NON_OPERATING_INCOME_CATEGORIES.has(transaction.category.trim().toLowerCase())
  );
}

export const listTransactions = query({
  args: {
    type: v.optional(v.union(v.literal("INCOME"), v.literal("EXPENSE"))),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    clientId: v.optional(v.id("clients")),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    let transactions;

    if (args.type && args.dateFrom) {
      transactions = await ctx.db
        .query("transactions")
        .withIndex("by_type_and_date", (q) => {
          const base = q.eq("type", args.type!);
          return args.dateTo
            ? base.gte("date", args.dateFrom!).lte("date", args.dateTo)
            : base.gte("date", args.dateFrom!);
        })
        .order("desc")
        .take(500);
    } else if (args.type) {
      transactions = await ctx.db
        .query("transactions")
        .withIndex("by_type", (q) => q.eq("type", args.type!))
        .order("desc")
        .take(500);
    } else if (args.dateFrom) {
      transactions = await ctx.db
        .query("transactions")
        .withIndex("by_date", (q) =>
          args.dateTo
            ? q.gte("date", args.dateFrom!).lte("date", args.dateTo)
            : q.gte("date", args.dateFrom!)
        )
        .order("desc")
        .take(500);
    } else {
      transactions = await ctx.db
        .query("transactions")
        .withIndex("by_date")
        .order("desc")
        .take(500);
    }

    if (args.clientId) {
      transactions = transactions.filter((transaction) => transaction.clientId === args.clientId);
    }

    if (args.projectId) {
      transactions = transactions.filter((transaction) => transaction.projectId === args.projectId);
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
    notes: v.optional(v.string()),
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
      notes: args.notes,
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

export const updateTransaction = mutation({
  args: {
    id: v.id("transactions"),
    type: v.union(v.literal("INCOME"), v.literal("EXPENSE")),
    amount: v.number(),
    category: v.string(),
    description: v.string(),
    notes: v.optional(v.string()),
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
    const transaction = await ctx.db.get(args.id);
    if (!transaction) return;

    const nextTransaction = {
      type: args.type,
      amount: args.amount,
      bankAccountId: args.bankAccountId,
    };
    const adjustments = getTransactionEditBankAdjustments(transaction, nextTransaction);

    for (const adjustment of adjustments) {
      const bankAccountId = adjustment.bankAccountId as Id<"bankAccounts">;
      const account = await ctx.db.get(bankAccountId);
      if (account) {
        await ctx.db.patch(bankAccountId, {
          balance: account.balance + adjustment.delta,
          lastUpdated: Date.now(),
        });
      }
    }

    await ctx.db.patch(args.id, {
      type: args.type,
      amount: args.amount,
      category: args.category,
      description: args.description,
      notes: args.notes,
      date: args.date,
      paymentMode: args.paymentMode,
      bankAccountId: args.bankAccountId,
      clientId: args.clientId,
      projectId: args.projectId,
      gstTagged: args.gstTagged ?? false,
      gstAmount: args.gstAmount,
    });
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
    const accounts = await ctx.db.query("bankAccounts").take(50);
    const activeAccounts = accounts.filter((a) => a.isActive);
    return await Promise.all(
      activeAccounts.map(async (account) => {
        const transactions = await ctx.db
          .query("transactions")
          .withIndex("by_bankAccountId", (q) => q.eq("bankAccountId", account._id))
          .order("desc")
          .take(200);
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

export const updateBankAccount = mutation({
  args: {
    id: v.id("bankAccounts"),
    name: v.string(),
    bankName: v.string(),
    accountNumber: v.optional(v.string()),
    balance: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      name: args.name,
      bankName: args.bankName,
      accountNumber: args.accountNumber ?? "",
      balance: args.balance,
      lastUpdated: Date.now(),
    });
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

    const [incomeTransactions, expenseTransactions] = await Promise.all([
      ctx.db
        .query("transactions")
        .withIndex("by_type_and_date", (q) => q.eq("type", "INCOME").gte("date", startOfYear))
        .take(2000),
      ctx.db
        .query("transactions")
        .withIndex("by_type_and_date", (q) => q.eq("type", "EXPENSE").gte("date", startOfYear))
        .take(2000),
    ]);

    const monthIncome = incomeTransactions
      .filter((t) => isOperatingIncome(t) && t.date >= startOfMonth)
      .reduce((s, t) => s + t.amount, 0);
    const monthNonOperatingIncome = incomeTransactions
      .filter((t) => isNonOperatingIncome(t) && t.date >= startOfMonth)
      .reduce((s, t) => s + t.amount, 0);
    const monthExpense = expenseTransactions
      .filter((t) => t.date >= startOfMonth)
      .reduce((s, t) => s + t.amount, 0);
    const ytdIncome = incomeTransactions
      .filter((t) => isOperatingIncome(t))
      .reduce((s, t) => s + t.amount, 0);
    const ytdNonOperatingIncome = incomeTransactions
      .filter((t) => isNonOperatingIncome(t))
      .reduce((s, t) => s + t.amount, 0);
    const ytdExpense = expenseTransactions.reduce((s, t) => s + t.amount, 0);

    const monthlyRevenue: { month: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = d.getTime();
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();
      const label = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
      const income = incomeTransactions
        .filter((t) => isOperatingIncome(t) && t.date >= start && t.date <= end)
        .reduce((s, t) => s + t.amount, 0);
      const expense = expenseTransactions
        .filter((t) => t.date >= start && t.date <= end)
        .reduce((s, t) => s + t.amount, 0);
      monthlyRevenue.push({ month: label, income, expense });
    }

    return { monthIncome, monthNonOperatingIncome, monthExpense, ytdIncome, ytdNonOperatingIncome, ytdExpense, monthlyRevenue };
  },
});

// ── Outstanding Payments ──────────────────────────────────────────────────────

export const getOutstanding = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

    const activeClients = await ctx.db
      .query("clients")
      .withIndex("by_status", (q) => q.eq("status", "ACTIVE"))
      .take(250);

    const retainerClients = activeClients.filter((c) => c.retainerAmount && c.retainerAmount > 0);

    const results = await Promise.all(
      retainerClients.map(async (c) => {
        const clientTransactions = await ctx.db
          .query("transactions")
          .withIndex("by_clientId", (q) => q.eq("clientId", c._id))
          .take(500);
        const incomeOnly = clientTransactions.filter((t) => t.type === "INCOME");
        const receivedThisMonth = incomeOnly
          .filter((t) => t.date >= startOfMonth)
          .reduce((s, t) => s + t.amount, 0);
        const totalReceived = incomeOnly.reduce((s, t) => s + t.amount, 0);
        const outstanding = Math.max(0, (c.retainerAmount ?? 0) - receivedThisMonth);
        const lastPayment = [...incomeOnly].sort((a, b) => b.date - a.date)[0];
        const daysSincePayment = lastPayment
          ? Math.floor((now - lastPayment.date) / (1000 * 60 * 60 * 24))
          : null;
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
    );

    return results.filter((c) => c.outstanding > 0);
  },
});

// ── Petty Cash ────────────────────────────────────────────────────────────────

export const listPettyCash = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("pettyCash").order("desc").take(200);
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

export const updatePettyCash = mutation({
  args: {
    id: v.id("pettyCash"),
    description: v.string(),
    amount: v.number(),
    type: v.union(v.literal("IN"), v.literal("OUT")),
    date: v.number(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      description: args.description,
      amount: args.amount,
      type: args.type,
      date: args.date,
      category: args.category,
    });
  },
});

export const removePettyCash = mutation({
  args: { id: v.id("pettyCash") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
