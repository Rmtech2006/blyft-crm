import { mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { MutationCtx } from "./_generated/server";

const SNAPSHOT_DATE = new Date("2026-04-14").getTime();

const clientRows = [
  { companyName: "Dinesh Cote", revenue: 950, cost: 0, paymentStatus: "RECEIVED" },
  { companyName: "TYRE GRAPHIC", revenue: 250, cost: 0, paymentStatus: "RECEIVED" },
  { companyName: "BG AGOL", revenue: 52000, cost: 28000, paymentStatus: "RECEIVED" },
  { companyName: "POCKET FUN", revenue: 23990, cost: 14000, paymentStatus: "RECEIVED" },
  { companyName: "RainierSoft Global", revenue: 38000, cost: 2000, paymentStatus: "RECEIVED" },
  { companyName: "Ruply", revenue: 18500, cost: 0, paymentStatus: "PENDING" },
];

function marginFrom(row: (typeof clientRows)[number]) {
  if (row.revenue <= 0) return undefined;
  return Math.round(((row.revenue - row.cost) / row.revenue) * 100);
}

async function findClientByName(ctx: MutationCtx, companyName: string) {
  const clients = await ctx.db.query("clients").order("desc").take(500);
  return clients.find((client) => client.companyName.toLowerCase() === companyName.toLowerCase()) ?? null;
}

async function findTransaction(
  ctx: MutationCtx,
  description: string,
  amount: number
) {
  const transactions = await ctx.db.query("transactions").order("desc").take(1000);
  return transactions.find(
    (transaction) =>
      transaction.description === description &&
      transaction.amount === amount &&
      transaction.date === SNAPSHOT_DATE
  ) ?? null;
}

export const importCurrentFinanceData = mutation({
  args: {},
  handler: async (ctx) => {
    let createdClients = 0;
    let updatedClients = 0;
    let createdTransactions = 0;

    const accounts = await ctx.db.query("bankAccounts").take(100);
    let operationsAccount = accounts.find((account) => account.name === "BLYFT Operations") ?? null;

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
      const existingClient = await findClientByName(ctx, row.companyName);
      const clientPatch = {
        industry: "Client Services",
        status: "ACTIVE" as const,
        retainerAmount: row.revenue,
        paymentTerms: row.paymentStatus === "RECEIVED" ? "Received" : "Pending",
        startDate: SNAPSHOT_DATE,
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
          companyName: row.companyName,
          ...clientPatch,
        });
        createdClients += 1;
      }

      if (row.paymentStatus === "RECEIVED" && row.revenue > 0) {
        const description = `${row.companyName} - Received revenue`;
        const existingIncome = await findTransaction(ctx, description, row.revenue);
        if (!existingIncome) {
          await ctx.db.insert("transactions", {
            type: "INCOME",
            amount: row.revenue,
            category: "Client Revenue",
            description,
            date: SNAPSHOT_DATE,
            paymentMode: "BANK_TRANSFER",
            bankAccountId: operationsAccount._id,
            clientId,
            gstTagged: false,
          });
          createdTransactions += 1;
        }
      }

      if (row.cost > 0) {
        const description = `${row.companyName} - Delivery cost`;
        const existingExpense = await findTransaction(ctx, description, row.cost);
        if (!existingExpense) {
          await ctx.db.insert("transactions", {
            type: "EXPENSE",
            amount: row.cost,
            category: "Client Delivery Cost",
            description,
            date: SNAPSHOT_DATE,
            paymentMode: "BANK_TRANSFER",
            bankAccountId: operationsAccount._id,
            clientId,
            gstTagged: false,
          });
          createdTransactions += 1;
        }
      }
    }

    const bankInterestDescription = "Bank Interest - Non-operating income";
    const existingInterest = await findTransaction(ctx, bankInterestDescription, 153);
    if (!existingInterest) {
      await ctx.db.insert("transactions", {
        type: "INCOME",
        amount: 153,
        category: "Non-Operating Income",
        description: bankInterestDescription,
        date: SNAPSHOT_DATE,
        paymentMode: "BANK_TRANSFER",
        bankAccountId: operationsAccount._id,
        gstTagged: false,
      });
      createdTransactions += 1;
    }

    await ctx.db.insert("activityLogs", {
      entity: "FINANCE",
      entityId: "finance-snapshot-2026-04-14",
      action: "IMPORT",
      details: "Imported April 14 finance snapshot; bank interest recorded as non-operating income.",
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
