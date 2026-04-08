import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
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
    <div className={cn('flex flex-col gap-2 py-2 border-b border-border last:border-0', className)}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </p>
        {Icon && (
          <div className={cn('flex h-7 w-7 items-center justify-center rounded-md bg-muted', iconClassName)}>
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        )}
      </div>
      <p className="text-3xl font-bold tracking-tight text-foreground leading-none">
        {value}
      </p>
      <div className="flex items-center gap-2 flex-wrap min-h-[18px]">
        {trend && <TrendBadge trend={trend} />}
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  )
}
