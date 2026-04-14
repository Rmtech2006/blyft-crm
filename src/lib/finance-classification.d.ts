export type FinanceTransaction = {
  id?: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  category?: string;
  date: number;
  _creationTime?: number;
};

export function isNonOperatingIncome(transaction: FinanceTransaction): boolean;
export function isOperatingIncome(transaction: FinanceTransaction): boolean;
export function sumOperatingIncome(transactions: FinanceTransaction[]): number;
export function sumNonOperatingIncome(transactions: FinanceTransaction[]): number;
export function sortTransactionsByDateDesc<T extends FinanceTransaction>(transactions: T[]): T[];
export function buildStatementRowsFromCurrentBalance<T extends FinanceTransaction>(
  transactions: T[],
  currentBalance: number
): Array<T & { runningBalance: number }>;
