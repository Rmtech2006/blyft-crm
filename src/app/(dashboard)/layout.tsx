'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Bell, LogOut, Settings, User, ChevronDown, Menu } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SidebarNav } from '@/components/layout/sidebar-nav'

function getInitials(name: string | null | undefined): string {
  if (!name) return 'U'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function AppSidebar() {
  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="h-14 flex items-center px-4 border-b border-sidebar-border">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 shadow-sm">
            <span className="text-xs font-black text-white">B</span>
          </div>
          <span className="text-base tracking-tight">
            BLYFT <span className="text-blue-500">CRM</span>
          </span>
        </Link>
        <div className="hidden group-data-[collapsible=icon]:flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 shadow-sm">
          <span className="text-xs font-black text-white">B</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarNav />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <div className="text-xs text-sidebar-foreground/40 text-center py-1 group-data-[collapsible=icon]:hidden">
          BLYFT CRM v1.0
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

function TopHeader() {
  const { data: session } = useSession()
  const user = session?.user
  const router = useRouter()

  async function handleSignOut() {
    await signOut({ redirect: false })
    window.location.href = '/login'
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/95 backdrop-blur px-4">
      <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
      <Separator orientation="vertical" className="h-5" />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Notifications */}
      <Button
        variant="ghost"
        size="icon"
        className="relative h-8 w-8 text-muted-foreground hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {/* Unread indicator - can be made dynamic later */}
        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-blue-500" />
      </Button>

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger render={<button className="flex items-center gap-2 h-8 px-2 rounded-lg hover:bg-accent transition-colors outline-none" />}>
          <Avatar className="h-7 w-7">
            <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? 'User'} />
            <AvatarFallback className="text-xs bg-blue-600 text-white">
              {getInitials(user?.name)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-xs font-medium leading-none">
              {user?.name ?? 'User'}
            </span>
            <span className="text-[10px] text-muted-foreground leading-none mt-0.5">
              {(user as { role?: string })?.role?.replace('_', ' ') ?? 'Member'}
            </span>
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user?.name}</p>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/settings')}>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-500 focus:text-red-500 cursor-pointer"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen overflow-hidden">
        <TopHeader />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
