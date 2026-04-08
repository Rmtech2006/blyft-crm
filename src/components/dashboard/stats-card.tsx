import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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
        isPositive && 'bg-emerald-500/12 text-emerald-500 dark:bg-emerald-500/15 dark:text-emerald-400',
        !isPositive && !isNeutral && 'bg-destructive/12 text-destructive dark:bg-destructive/15'
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
    <Card className={cn('relative overflow-hidden border-border/60', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              {title}
            </p>
            <p className="text-2xl font-bold tracking-tight text-foreground">
              {value}
            </p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {trend && <TrendBadge trend={trend} />}
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
          {Icon && (
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10',
                iconClassName
              )}
            >
              <Icon className="h-4 w-4 text-primary" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
