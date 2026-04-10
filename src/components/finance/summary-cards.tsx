import { Landmark, TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function FinanceSummaryCards({
  income,
  expense,
  net,
  totalBankBalance,
  formatINR,
}: {
  income: number
  expense: number
  net: number
  totalBankBalance: number
  formatINR: (amount: number) => string
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-green-500" /> Total Income
          </CardTitle>
        </CardHeader>
        <CardContent><p className="text-2xl font-bold text-emerald-500">{formatINR(income)}</p></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <TrendingDown className="h-4 w-4 text-red-500" /> Total Expenses
          </CardTitle>
        </CardHeader>
        <CardContent><p className="text-2xl font-bold text-destructive">{formatINR(expense)}</p></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-primary" /> Net Profit
          </CardTitle>
        </CardHeader>
        <CardContent><p className={`text-2xl font-bold ${net >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>{formatINR(net)}</p></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Landmark className="h-4 w-4 text-purple-500" /> Total Bank Balance
          </CardTitle>
        </CardHeader>
        <CardContent><p className={`text-2xl font-bold ${totalBankBalance >= 0 ? 'text-purple-600' : 'text-destructive'}`}>{formatINR(totalBankBalance)}</p></CardContent>
      </Card>
    </div>
  )
}
