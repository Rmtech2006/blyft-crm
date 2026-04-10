'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, CheckCheck, Trash2, ExternalLink, Info, AlertCircle, CheckCircle, DollarSign } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const typeConfig: Record<string, { icon: React.ElementType; color: string }> = {
  info: { icon: Info, color: 'text-primary' },
  warning: { icon: AlertCircle, color: 'text-amber-500' },
  success: { icon: CheckCircle, color: 'text-emerald-500' },
  payment: { icon: DollarSign, color: 'text-amber-500' },
  task: { icon: CheckCheck, color: 'text-violet-500' },
}

export function NotificationPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  useSession()
  const notifications = useQuery(api.notifications.list, {})
  const markRead = useMutation(api.notifications.markRead)
  const markAllRead = useMutation(api.notifications.markAllRead)
  const remove = useMutation(api.notifications.remove)

  const unread = (notifications ?? []).filter((n) => !n.read).length

  async function handleMarkAll() {
    await markAllRead({})
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-base font-semibold">Notifications</SheetTitle>
            {unread > 0 && (
              <Badge className="h-5 px-1.5 text-xs bg-primary text-primary-foreground">{unread}</Badge>
            )}
          </div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={handleMarkAll}>
              <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark all read
            </Button>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {!notifications || notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-16 text-center px-6">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Bell className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground/60">Notifications about tasks, leads, and payments will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => {
                const config = typeConfig[n.type] ?? typeConfig.info
                const Icon = config.icon
                return (
                  <div
                    key={n.id}
                    className={cn(
                      'flex items-start gap-3 px-5 py-4 transition-colors hover:bg-muted/40 group',
                      !n.read && 'bg-primary/[0.03]'
                    )}
                  >
                    <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted', !n.read && 'bg-primary/10')}>
                      <Icon className={cn('h-4 w-4', !n.read ? config.color : 'text-muted-foreground')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('text-sm leading-tight', !n.read ? 'font-semibold text-foreground' : 'font-medium text-foreground/80')}>
                          {n.title}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          {!n.read && (
                            <button
                              onClick={() => markRead({ id: n.id as Id<'notifications'> })}
                              className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
                              title="Mark read"
                            >
                              <CheckCheck className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            onClick={() => remove({ id: n.id as Id<'notifications'> })}
                            className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{n.message}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[11px] text-muted-foreground/60">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </span>
                        {n.link && (
                          <Link
                            href={n.link}
                            onClick={() => { markRead({ id: n.id as Id<'notifications'> }); onOpenChange(false); }}
                            className="text-[11px] text-primary flex items-center gap-0.5 hover:underline"
                          >
                            View <ExternalLink className="h-2.5 w-2.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                    {!n.read && <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  useSession()
  const unread = useQuery(api.notifications.unreadCount, {}) ?? 0

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
        aria-label="Notifications"
        onClick={() => setOpen(true)}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
        )}
      </Button>
      <NotificationPanel open={open} onOpenChange={setOpen} />
    </>
  )
}
