'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  ChevronLeft,
  ChevronDown,
  LogOut,
  Settings,
  User,
  X,
} from 'lucide-react'
import { GlobalSearch } from '@/components/layout/global-search'
import { NotificationBell } from '@/components/layout/notification-panel'
import { SidebarNav } from '@/components/layout/sidebar-nav'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { BlyftLogo } from '@/components/brand/blyft-logo'
import { PrivacyModeProvider } from '@/contexts/privacy-mode-context'

const routeLabels: Array<{ href: string; label: string }> = [
  { href: '/reimbursements', label: 'Reimbursements' },
  { href: '/projects', label: 'Projects' },
  { href: '/clients', label: 'Clients' },
  { href: '/finance', label: 'Finance' },
  { href: '/settings', label: 'Settings' },
  { href: '/templates', label: 'Templates' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/team', label: 'Team' },
  { href: '/leads', label: 'Leads' },
  { href: '/', label: 'Dashboard' },
]

function getInitials(name: string | null | undefined): string {
  if (!name) return 'U'

  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getPageLabel(pathname: string): string {
  return routeLabels.find((route) =>
    route.href === '/'
      ? pathname === '/'
      : pathname === route.href || pathname.startsWith(route.href + '/')
  )?.label ?? 'Workspace'
}

function AppSidebar() {
  const { isMobile, toggleSidebar } = useSidebar()

  return (
    <Sidebar collapsible="icon" className="border-r border-white/10 bg-primary">
      <div className="hero-noise relative flex size-full flex-col overflow-hidden bg-primary text-sidebar-foreground">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute -left-16 top-24 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-white/8 blur-3xl" />
        </div>

        <SidebarHeader className="relative z-10 border-b border-white/10 px-4 py-4">
          <div className="flex items-start justify-between gap-2 group-data-[collapsible=icon]:justify-center">
            <Link href="/" className="group flex min-w-0 items-center gap-3 group-data-[collapsible=icon]:justify-center">
              <div className="flex items-center gap-3 group-data-[collapsible=icon]:hidden">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-sidebar-foreground/40">
                    Agency OS
                  </p>
                  <div className="mt-1">
                    <BlyftLogo size="sm" variant="white" priority className="opacity-95" />
                  </div>
                </div>
              </div>

              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-[20px] bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_22px_38px_-24px_rgba(255,255,255,0.4)] group-data-[collapsible=icon]:flex">
                <span className="text-sm font-black tracking-[0.18em]">B</span>
              </div>
            </Link>

            <button
              type="button"
              onClick={toggleSidebar}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sidebar-foreground/72 transition-colors hover:bg-white/[0.08] hover:text-sidebar-foreground group-data-[collapsible=icon]:hidden"
              aria-label={isMobile ? 'Close sidebar' : 'Collapse sidebar'}
              title={isMobile ? 'Close sidebar' : 'Collapse sidebar'}
            >
              {isMobile ? <X className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </SidebarHeader>

        <SidebarContent className="relative z-10 px-3 py-4">
          <div className="mb-4 surface-muted border-white/5 bg-white/[0.04] p-3 text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-sidebar-foreground/38">
              Command Center
            </p>
            <p className="mt-2 text-sm leading-relaxed text-sidebar-foreground/78">
              Keep sales, delivery, finance, and support aligned in one executive workspace.
            </p>
          </div>

          <SidebarNav />
        </SidebarContent>

        <SidebarFooter className="relative z-10 border-t border-white/10 p-3">
          <div className="surface-muted border-white/5 bg-white/[0.04] p-3 group-data-[collapsible=icon]:hidden">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-sidebar-foreground/38">
              System
            </p>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-sidebar-foreground/75">
              <span>Live sync</span>
              <span className="rounded-full bg-emerald-500/12 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Online
              </span>
            </div>
          </div>
        </SidebarFooter>
      </div>
    </Sidebar>
  )
}

function TopHeader() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const user = session?.user
  const pageLabel = getPageLabel(pathname)
  const todayLabel = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(new Date())

  async function handleSignOut() {
    await signOut({ redirect: false })
    window.location.href = '/login'
  }

  return (
    <header className="sticky top-0 z-20 px-4 pt-4 sm:px-6">
      <div className="surface-card flex min-h-[76px] items-center gap-3 px-4 py-3 sm:px-5">
        <SidebarTrigger className="rounded-xl border border-border/70 bg-card/80 text-muted-foreground hover:bg-accent hover:text-foreground" />
        <Separator orientation="vertical" className="hidden h-7 opacity-60 sm:block" />

        <div className="hidden min-w-0 sm:block">
          <p className="section-eyebrow">Workspace</p>
          <p className="truncate text-sm font-medium text-foreground">{pageLabel}</p>
        </div>

        <GlobalSearch />

        <div className="hidden items-center gap-2 rounded-full border border-border/80 bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground lg:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Convex sync active
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden text-right md:block">
            <p className="section-eyebrow">Today</p>
            <p className="text-sm font-medium text-foreground">{todayLabel}</p>
          </div>

          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="flex items-center gap-2 rounded-2xl border border-border/80 bg-card/80 px-2.5 py-2 outline-none transition-colors hover:bg-accent" />
              }
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? 'User'} />
                <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>

              <div className="hidden min-w-0 text-left sm:block">
                <p className="truncate text-sm font-medium text-foreground">
                  {user?.name ?? 'User'}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {(user as { role?: string })?.role?.replace('_', ' ') ?? 'Member'}
                </p>
              </div>

              <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="truncate text-xs leading-none text-muted-foreground">
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
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PrivacyModeProvider>
      <SidebarProvider defaultOpen={true}>
        <AppSidebar />
        <SidebarInset className="min-h-screen overflow-hidden bg-transparent">
          <div className="app-shell min-h-screen">
            <TopHeader />
            <main className="flex-1 overflow-auto px-4 pb-8 pt-6 sm:px-6">
              <div className="mx-auto w-full max-w-[1480px]">{children}</div>
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </PrivacyModeProvider>
  )
}
