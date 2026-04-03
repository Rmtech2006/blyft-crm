import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatsTrendProps {
  value: number
  label?: string
}

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  trend?: StatsTrendProps
  className?: string
  iconClassName?: string
}

function TrendBadge({ trend }: { trend: StatsTrendProps }) {
  const isPositive = trend.value > 0
  const isNeutral = trend.value === 0

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        isNeutral && 'bg-muted text-muted-foreground',
        isPositive && 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
        !isPositive && !isNeutral && 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
      )}
    >
      {isNeutral ? (
        <Minus className="h-3 w-3" />
      ) : isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      <span>
        {isPositive && '+'}
        {trend.value}%{trend.label ? ` ${trend.label}` : ''}
      </span>
    </div>
  )
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
  iconClassName,
}: StatsCardProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10',
              iconClassName
            )}
          >
            <Icon className="h-4 w-4 text-primary" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight text-foreground">
          {value}
        </div>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {trend && <TrendBadge trend={trend} />}
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
