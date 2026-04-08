'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Wallet,
  Users,
  FolderKanban,
  CheckSquare,
  TrendingUp,
  UsersRound,
  Receipt,
  MessageSquare,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar'

const navSections = [
  {
    label: null,
    items: [
      { title: 'Dashboard', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Work',
    items: [
      { title: 'Clients', href: '/clients', icon: Users },
      { title: 'Projects', href: '/projects', icon: FolderKanban },
      { title: 'Tasks', href: '/tasks', icon: CheckSquare },
      { title: 'Leads', href: '/leads', icon: TrendingUp },
    ],
  },
  {
    label: 'Business',
    items: [
      { title: 'Finance', href: '/finance', icon: Wallet },
      { title: 'Team', href: '/team', icon: UsersRound },
      { title: 'Reimbursements', href: '/reimbursements', icon: Receipt },
    ],
  },
  {
    label: 'Tools',
    items: [
      { title: 'Templates', href: '/templates', icon: MessageSquare },
      { title: 'Settings', href: '/settings', icon: Settings },
    ],
  },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <div className="space-y-1">
      {navSections.map((section, si) => (
        <SidebarGroup key={si} className="p-0">
          {section.label && (
            <SidebarGroupLabel className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/35 group-data-[collapsible=icon]:hidden">
              {section.label}
            </SidebarGroupLabel>
          )}
          <SidebarMenu>
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
                      'relative transition-all rounded-md h-9 text-sm',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-primary font-semibold before:absolute before:left-0 before:inset-y-1.5 before:w-0.5 before:rounded-full before:bg-sidebar-primary'
                        : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60'
                    )}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/50')} />
                    <span>{item.title}</span>
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
