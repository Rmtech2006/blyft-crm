const NON_OPERATING_INCOME_CATEGORIES = new Set([
  "bank interest",
  "non-operating income",
  "non operating income",
]);

function normalizeCategory(category) {
  return String(category ?? "").trim().toLowerCase();
}

export function isNonOperatingIncome(transaction) {
  return (
    transaction?.type === "INCOME" &&
    NON_OPERATING_INCOME_CATEGORIES.has(normalizeCategory(transaction.category))
  );
}

export function isOperatingIncome(transaction) {
  return transaction?.type === "INCOME" && !isNonOperatingIncome(transaction);
}

export function sumOperatingIncome(transactions) {
  return transactions
    .filter(isOperatingIncome)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
}

export function sumNonOperatingIncome(transactions) {
  return transactions
    .filter(isNonOperatingIncome)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
}

function creationTimeOf(transaction) {
  return typeof transaction?._creationTime === "number" ? transaction._creationTime : 0;
}

export function sortTransactionsByDateDesc(transactions) {
  return [...transactions].sort((a, b) => {
    if (b.date !== a.date) return b.date - a.date;
    return creationTimeOf(b) - creationTimeOf(a);
  });
}

export function buildStatementRowsFromCurrentBalance(transactions, currentBalance) {
  const sortedDesc = sortTransactionsByDateDesc(transactions);
  let balance = currentBalance;

  return sortedDesc.map((transaction) => {
    const row = {
      ...transaction,
      runningBalance: balance,
    };
    const delta = transaction.type === "INCOME" ? transaction.amount : -transaction.amount;
    balance -= delta;
    return row;
  });
}
