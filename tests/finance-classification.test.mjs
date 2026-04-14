import assert from "node:assert/strict";
import test from "node:test";

import {
  isOperatingIncome,
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
