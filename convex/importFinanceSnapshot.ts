import { mutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { MutationCtx } from "./_generated/server";

function dateFromParts(year: number, month: number, day: number) {
  return new Date(year, month - 1, day).getTime();
}

const clientRows = [
  {
    companyName: "Dinesh Cafe",
    aliases: ["Dinesh Cote"],
    revenue: 950,
    cost: 0,
    paymentStatus: "RECEIVED",
    date: dateFromParts(2025, 3, 1),
  },
  {
    companyName: "TYRE GRAPHIC",
    aliases: [],
    revenue: 250,
    cost: 0,
    paymentStatus: "RECEIVED",
    date: dateFromParts(2025, 6, 1),
  },
  {
    companyName: "BGA GOLF",
    aliases: ["BG AGOL"],
    revenue: 52000,
    cost: 28000,
    paymentStatus: "RECEIVED",
    date: dateFromParts(2025, 12, 26),
  },
  {
    companyName: "POCKET FUND",
    aliases: ["POCKET FUN"],
    revenue: 23999,
    previousRevenue: 23990,
    cost: 14000,
    paymentStatus: "RECEIVED",
    date: dateFromParts(2025, 11, 2),
  },
  {
    companyName: "RainierSoft Global",
    aliases: [],
    revenue: 38000,
    cost: 2000,
    paymentStatus: "RECEIVED",
    date: dateFromParts(2026, 2, 19),
  },
  {
    companyName: "Ruply",
    aliases: [],
    revenue: 18500,
    cost: 0,
    paymentStatus: "PENDING",
    date: dateFromParts(2026, 3, 15),
  },
];

const expenseRows = [
  { date: dateFromParts(2025, 2, 5), amount: 6800, type: "Fixed Cost [FC]", notes: "Website" },
  { date: dateFromParts(2025, 2, 9), amount: 200, type: "Fixed Cost [FC]", notes: "Payment Gateway" },
  { date: dateFromParts(2025, 3, 2), amount: 450, type: "Miscellaneous", notes: "Polo" },
  { date: dateFromParts(2025, 3, 2), amount: 400, type: "Miscellaneous", notes: "Polo" },
  { date: dateFromParts(2025, 4, 3), amount: 1445, type: "Miscellaneous", notes: "3 domains" },
  { date: dateFromParts(2025, 4, 3), amount: 500, type: "Miscellaneous", notes: "Business Card" },
  { date: dateFromParts(2026, 4, 8), amount: 2000, type: "Fixed Cost [FC]", notes: "Fixed cost" },
  { date: dateFromParts(2026, 3, 2), amount: 590, type: "Miscellaneous", notes: "Miscellaneous" },
];

function marginFrom(row: (typeof clientRows)[number]) {
  if (row.revenue <= 0) return undefined;
  return Math.round(((row.revenue - row.cost) / row.revenue) * 100);
}

async function findClientByNames(ctx: MutationCtx, names: string[]) {
  const clients = await ctx.db.query("clients").order("desc").take(500);
  const normalizedNames = new Set(names.map((name) => name.toLowerCase()));
  return clients.find((client) => normalizedNames.has(client.companyName.toLowerCase())) ?? null;
}

async function findSnapshotTransaction(
  ctx: MutationCtx,
  descriptions: string[],
  amounts: number[],
  type: "INCOME" | "EXPENSE"
) {
  const transactions = await ctx.db.query("transactions").order("desc").take(1000);
  const descriptionSet = new Set(descriptions);
  const amountSet = new Set(amounts);
  return transactions.find(
    (transaction) =>
      transaction.type === type &&
      descriptionSet.has(transaction.description) &&
      amountSet.has(transaction.amount)
  ) ?? null;
}

async function upsertSnapshotTransaction(
  ctx: MutationCtx,
  args: {
    type: "INCOME" | "EXPENSE";
    amount: number;
    previousAmounts?: number[];
    category: string;
    description: string;
    previousDescriptions?: string[];
    date: number;
    bankAccountId: Id<"bankAccounts">;
    clientId?: Id<"clients">;
  }
) {
  const existing = await findSnapshotTransaction(
    ctx,
    [args.description, ...(args.previousDescriptions ?? [])],
    [args.amount, ...(args.previousAmounts ?? [])],
    args.type
  );

  if (existing) {
    await ctx.db.patch(existing._id, {
      amount: args.amount,
      category: args.category,
      description: args.description,
      date: args.date,
      bankAccountId: args.bankAccountId,
      clientId: args.clientId,
      gstTagged: false,
    });
    return { created: false };
  }

  await ctx.db.insert("transactions", {
    type: args.type,
    amount: args.amount,
    category: args.category,
    description: args.description,
    date: args.date,
    paymentMode: "BANK_TRANSFER",
    bankAccountId: args.bankAccountId,
    clientId: args.clientId,
    gstTagged: false,
  });

  return { created: true };
}

export const importCurrentFinanceData = mutation({
  args: {},
  handler: async (ctx) => {
    let createdClients = 0;
    let updatedClients = 0;
    let createdTransactions = 0;

    const accounts = await ctx.db.query("bankAccounts").take(100);
    let operationsAccount: Doc<"bankAccounts"> | null =
      accounts.find((account) => account.name === "BLYFT Operations") ?? null;

    if (!operationsAccount) {
      const accountId = await ctx.db.insert("bankAccounts", {
        name: "BLYFT Operations",
        bankName: "Operating Bank",
        accountNumber: "",
        balance: 58967,
        lastUpdated: Date.now(),
        isActive: true,
      });
      operationsAccount = await ctx.db.get(accountId);
    } else {
      await ctx.db.patch(operationsAccount._id, {
        balance: 58967,
        lastUpdated: Date.now(),
        isActive: true,
      });
    }

    if (!operationsAccount) {
      throw new Error("Unable to create or update BLYFT Operations bank account");
    }

    for (const row of clientRows) {
      const existingClient = await findClientByNames(ctx, [row.companyName, ...row.aliases]);
      const clientPatch = {
        companyName: row.companyName,
        industry: "Client Services",
        status: "ACTIVE" as const,
        retainerAmount: row.revenue,
        paymentTerms: row.paymentStatus === "RECEIVED" ? "Received" : "Pending",
        startDate: row.date,
        healthScore: marginFrom(row),
        invoicePaid: row.paymentStatus === "RECEIVED",
      };

      let clientId: Id<"clients">;
      if (existingClient) {
        await ctx.db.patch(existingClient._id, clientPatch);
        clientId = existingClient._id;
        updatedClients += 1;
      } else {
        clientId = await ctx.db.insert("clients", {
          ...clientPatch,
        });
        createdClients += 1;
      }

      if (row.paymentStatus === "RECEIVED" && row.revenue > 0) {
        const description = `${row.companyName} - Received revenue`;
        const result = await upsertSnapshotTransaction(ctx, {
          type: "INCOME",
          amount: row.revenue,
          previousAmounts: "previousRevenue" in row ? [row.previousRevenue as number] : undefined,
          category: "Client Revenue",
          description,
          previousDescriptions: row.aliases.map((alias) => `${alias} - Received revenue`),
          date: row.date,
          bankAccountId: operationsAccount._id,
          clientId,
        });
        if (result.created) {
          createdTransactions += 1;
        }
      }

      if (row.cost > 0) {
        const description = `${row.companyName} - Delivery cost`;
        const result = await upsertSnapshotTransaction(ctx, {
          type: "EXPENSE",
          amount: row.cost,
          category: "Client Delivery Cost",
          description,
          previousDescriptions: row.aliases.map((alias) => `${alias} - Delivery cost`),
          date: row.date,
          bankAccountId: operationsAccount._id,
          clientId,
        });
        if (result.created) {
          createdTransactions += 1;
        }
      }
    }

    for (const expense of expenseRows) {
      const description = `${expense.notes} - ${expense.type}`;
      const result = await upsertSnapshotTransaction(ctx, {
        type: "EXPENSE",
        amount: expense.amount,
        category: expense.type,
        description,
        date: expense.date,
        bankAccountId: operationsAccount._id,
      });
      if (result.created) {
        createdTransactions += 1;
      }
    }

    const bankInterestDescription = "Bank Interest - Non-operating income";
    const bankInterestResult = await upsertSnapshotTransaction(ctx, {
      type: "INCOME",
      amount: 153,
      category: "Non-Operating Income",
      description: bankInterestDescription,
      date: dateFromParts(2026, 4, 3),
      bankAccountId: operationsAccount._id,
    });
    if (bankInterestResult.created) {
      createdTransactions += 1;
    }

    await ctx.db.insert("activityLogs", {
      entity: "FINANCE",
      entityId: "finance-snapshot-master-spreadsheet",
      action: "IMPORT",
      details: "Imported master spreadsheet finance data with source dates; bank interest recorded as non-operating income.",
      userId: "Admin",
    });

    return {
      success: true,
      createdClients,
      updatedClients,
      createdTransactions,
      bankBalance: 58967,
      pendingReceivables: 18500,
      nonOperatingIncome: 153,
    };
  },
});
