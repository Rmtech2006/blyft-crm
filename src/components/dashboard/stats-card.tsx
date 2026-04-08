import { type LucideIcon, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

type CardColor = 'default' | 'blue' | 'emerald' | 'amber' | 'violet'

const colorMap: Record<CardColor, { iconShell: string; icon: string; accent: string }> = {
  default: {
    iconShell: 'bg-primary text-primary-foreground',
    icon: 'text-primary-foreground',
    accent: 'bg-primary/12',
  },
  blue: {
    iconShell: 'bg-slate-900 text-white',
    icon: 'text-white',
    accent: 'bg-slate-900/8',
  },
  emerald: {
    iconShell: 'bg-emerald-500/12 text-emerald-700',
    icon: 'text-emerald-700',
    accent: 'bg-emerald-500/10',
  },
  amber: {
    iconShell: 'bg-amber-500/12 text-amber-700',
    icon: 'text-amber-700',
    accent: 'bg-amber-500/10',
  },
  violet: {
    iconShell: 'bg-zinc-900 text-white',
    icon: 'text-white',
    accent: 'bg-zinc-900/8',
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
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em]',
        isNeutral && 'tone-neutral',
        isPositive && 'tone-success',
        !isPositive && !isNeutral && 'tone-danger'
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
        {trend.value}%
        {trend.label ? ` ${trend.label}` : ''}
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
    <div
      className={cn(
        'surface-card relative overflow-hidden p-5',
        className
      )}
    >
      <div className={cn('absolute inset-x-0 top-0 h-1.5', c.accent)} />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="section-eyebrow">{title}</p>
            <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          </div>
          <div className="flex min-h-7 items-center gap-2.5 flex-wrap">
            {trend && <TrendBadge trend={trend} />}
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>

        {Icon && (
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]',
              c.iconShell
            )}
          >
            <Icon className={cn('h-5 w-5', c.icon)} />
          </div>
        )}
      </div>
    </div>
  )
}
