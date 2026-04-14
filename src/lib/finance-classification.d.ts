export type FinanceTransaction = {
  type: "INCOME" | "EXPENSE";
  amount: number;
  category?: string;
};

export function isNonOperatingIncome(transaction: FinanceTransaction): boolean;
export function isOperatingIncome(transaction: FinanceTransaction): boolean;
export function sumOperatingIncome(transactions: FinanceTransaction[]): number;
export function sumNonOperatingIncome(transactions: FinanceTransaction[]): number;
