import assert from "node:assert/strict";
import test from "node:test";

import {
  buildStatementRowsFromCurrentBalance,
  getTransactionEditBankAdjustments,
  isOperatingIncome,
  sortTransactionsByDateDesc,
  sumOperatingIncome,
  sumNonOperatingIncome,
} from "../src/lib/finance-classification.mjs";

test("bank interest is excluded from operating income", () => {
  const transactions = [
    { type: "INCOME", amount: 950, category: "Client Revenue" },
    { type: "INCOME", amount: 153, category: "Bank Interest" },
    { type: "INCOME", amount: 2000, category: "Non-Operating Income" },
    { type: "EXPENSE", amount: 500, category: "Cost of Sales" },
  ];

  assert.equal(isOperatingIncome(transactions[0]), true);
  assert.equal(isOperatingIncome(transactions[1]), false);
  assert.equal(isOperatingIncome(transactions[2]), false);
  assert.equal(sumOperatingIncome(transactions), 950);
  assert.equal(sumNonOperatingIncome(transactions), 2153);
});

test("transactions sort by transaction date newest first", () => {
  const transactions = [
    { id: "old", type: "EXPENSE", amount: 200, category: "Cost", date: new Date("2025-02-09").getTime() },
    { id: "new", type: "INCOME", amount: 153, category: "Bank Interest", date: new Date("2026-04-03").getTime() },
    { id: "middle", type: "INCOME", amount: 38000, category: "Client Revenue", date: new Date("2026-02-19").getTime() },
  ];

  assert.deepEqual(sortTransactionsByDateDesc(transactions).map((transaction) => transaction.id), [
    "new",
    "middle",
    "old",
  ]);
});

test("bank statement rows set off from the current bank balance", () => {
  const transactions = [
    { id: "income", type: "INCOME", amount: 1000, category: "Client Revenue", date: new Date("2026-04-01").getTime() },
    { id: "expense", type: "EXPENSE", amount: 200, category: "Cost", date: new Date("2026-04-03").getTime() },
  ];

  const rows = buildStatementRowsFromCurrentBalance(transactions, 58967);

  assert.deepEqual(rows.map((row) => row.id), ["expense", "income"]);
  assert.equal(rows[0].runningBalance, 58967);
  assert.equal(rows[1].runningBalance, 59167);
});

test("transaction edits reverse old bank movement and apply new bank movement", () => {
  const adjustments = getTransactionEditBankAdjustments(
    { type: "INCOME", amount: 1000, bankAccountId: "old-account" },
    { type: "EXPENSE", amount: 400, bankAccountId: "new-account" },
  );

  assert.deepEqual(adjustments, [
    { bankAccountId: "old-account", delta: -1000 },
    { bankAccountId: "new-account", delta: -400 },
  ]);
});
