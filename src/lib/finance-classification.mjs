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
