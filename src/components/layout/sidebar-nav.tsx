'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CheckSquare,
  FolderKanban,
  LayoutDashboard,
  MessageSquare,
  Receipt,
  Settings,
  TrendingUp,
  Users,
  UsersRound,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const navSections = [
  {
    label: 'Overview',
    items: [{ title: 'Dashboard', href: '/', icon: LayoutDashboard }],
  },
  {
    label: 'Delivery',
    items: [
      { title: 'Clients', href: '/clients', icon: Users },
      { title: 'Projects', href: '/projects', icon: FolderKanban },
      { title: 'Tasks', href: '/tasks', icon: CheckSquare },
      { title: 'Leads', href: '/leads', icon: TrendingUp },
    ],
  },
  {
    label: 'Operations',
    items: [
      { title: 'Finance', href: '/finance', icon: Wallet },
      { title: 'Team', href: '/team', icon: UsersRound },
      { title: 'Reimbursements', href: '/reimbursements', icon: Receipt },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { title: 'Templates', href: '/templates', icon: MessageSquare },
      { title: 'Settings', href: '/settings', icon: Settings },
    ],
  },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <div className="space-y-4">
      {navSections.map((section) => (
        <SidebarGroup key={section.label} className="p-0">
          <SidebarGroupLabel className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-sidebar-foreground/38 group-data-[collapsible=icon]:hidden">
            {section.label}
          </SidebarGroupLabel>

          <SidebarMenu className="gap-1.5">
            {section.items.map((item) => {
              const Icon = item.icon
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname === item.href || pathname.startsWith(item.href + '/')

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={isActive}
                    tooltip={item.title}
                    className={cn(
                      'relative h-11 rounded-2xl px-3 text-sm transition-all',
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_22px_45px_-28px_rgba(255,255,255,0.3)]'
                        : 'text-sidebar-foreground/68 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors',
                        isActive
                          ? 'bg-sidebar-primary-foreground/10'
                          : 'bg-sidebar-accent/80 text-sidebar-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                    </span>

                    <span className="font-medium">{item.title}</span>

                    <span
                      className={cn(
                        'ml-auto h-2 w-2 rounded-full transition-opacity group-data-[collapsible=icon]:hidden',
                        isActive ? 'bg-sidebar-primary-foreground opacity-100' : 'opacity-0'
                      )}
                    />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </div>
  )
}
