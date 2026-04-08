import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

type CardColor = 'default' | 'blue' | 'emerald' | 'amber' | 'violet'

const colorMap: Record<CardColor, { bg: string; icon: string; value: string }> = {
  default: {
    bg: 'bg-muted',
    icon: 'text-muted-foreground',
    value: 'text-foreground',
  },
  blue: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/15',
    icon: 'text-blue-600 dark:text-blue-400',
    value: 'text-blue-700 dark:text-blue-300',
  },
  emerald: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    icon: 'text-emerald-600 dark:text-emerald-400',
    value: 'text-emerald-700 dark:text-emerald-300',
  },
  amber: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    icon: 'text-amber-600 dark:text-amber-400',
    value: 'text-amber-700 dark:text-amber-300',
  },
  violet: {
    bg: 'bg-violet-500/10 dark:bg-violet-500/15',
    icon: 'text-violet-600 dark:text-violet-400',
    value: 'text-violet-700 dark:text-violet-300',
  },
}

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
  color?: CardColor
  className?: string
}

function TrendBadge({ trend }: { trend: StatsTrendProps }) {
  const isPositive = trend.value > 0
  const isNeutral = trend.value === 0

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        isNeutral && 'bg-muted text-muted-foreground',
        isPositive && 'bg-emerald-500/12 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
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
  color = 'default',
  className,
}: StatsCardProps) {
  const c = colorMap[color]

  return (
    <div className={cn('flex flex-col gap-3 p-4 rounded-xl border border-border bg-card hover:shadow-sm transition-shadow', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground leading-tight">
          {title}
        </p>
        {Icon && (
          <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', c.bg)}>
            <Icon className={cn('h-4 w-4', c.icon)} />
          </div>
        )}
      </div>
      <p className={cn('text-3xl font-bold tracking-tight leading-none', color === 'default' ? 'text-foreground' : c.value)}>
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
