export type FinanceTransaction = {
  id?: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  category?: string;
  date: number;
  _creationTime?: number;
  bankAccountId?: string;
  notes?: string;
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
export function getTransactionEditBankAdjustments(
  previousTransaction: Pick<FinanceTransaction, "type" | "amount" | "bankAccountId">,
  nextTransaction: Pick<FinanceTransaction, "type" | "amount" | "bankAccountId">
): Array<{ bankAccountId: string; delta: number }>;
