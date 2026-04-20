'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import {
  Bell,
  BookOpen,
  Building2,
  LayoutDashboard,
  PencilLine,
  Save,
  Shield,
  Target,
  Trash2,
  User,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { SettingsPageHeader } from '@/components/settings/page-header'
import { CrmGuide } from '@/components/settings/crm-guide'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  DASHBOARD_QUICK_ACTION_OPTIONS,
  DASHBOARD_SECTION_OPTIONS,
  DEFAULT_DASHBOARD_QUICK_ACTIONS,
  DEFAULT_DASHBOARD_SECTIONS,
  DashboardQuickActionId,
  DashboardSectionId,
  normalizeDashboardQuickActionIds,
  normalizeDashboardSectionIds,
} from '@/lib/dashboard-preferences'
import { protectedQueryArgs } from '@/lib/convex-query-args.mjs'

function getInitials(name: string | null | undefined) {
  if (!name) return 'U'
  return name.split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2)
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(monthKey: string) {
  return new Date(`${monthKey}-01T00:00:00`).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

type NotifPrefs = {
  notifOverdueTasks: boolean
  notifNewLeads: boolean
  notifPaymentDue: boolean
  notifReimbursements: boolean
  notifProjectUpdates: boolean
}

type SalesTargetScope = 'OVERALL' | 'DEPARTMENT' | 'MEMBER'

const notifLabels: { key: keyof NotifPrefs; label: string; description: string }[] = [
  { key: 'notifOverdueTasks', label: 'Overdue Tasks', description: 'Alert when tasks pass their due date' },
  { key: 'notifNewLeads', label: 'New Leads', description: 'Notify when a new lead is added to the pipeline' },
  { key: 'notifPaymentDue', label: 'Payment Due', description: 'Remind about outstanding client payments' },
  { key: 'notifReimbursements', label: 'Reimbursements', description: 'Alerts for new or updated reimbursement requests' },
  { key: 'notifProjectUpdates', label: 'Project Updates', description: 'Notify when project status changes' },
]

const scopeMeta: Record<SalesTargetScope, { label: string; helper: string; icon: typeof Target }> = {
  OVERALL: {
    label: 'Overall business',
    helper: 'Use live finance revenue as the actual value on the dashboard.',
    icon: Target,
  },
  DEPARTMENT: {
    label: 'Department',
    helper: 'Track department-level target and actual progress manually.',
    icon: Building2,
  },
  MEMBER: {
    label: 'Team member',
    helper: 'Track target ownership for an individual seller or owner.',
    icon: UserRound,
  },
}

type SalesTargetRecord = {
  id: string
  monthKey: string
  scopeType: SalesTargetScope
  label: string
  department?: string
  teamMemberId?: string
  targetAmount: number
  actualAmount?: number | null
  notes?: string
  updatedAt: number
  progress: number | null
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const { isAuthenticated } = useConvexAuth()
  const user = session?.user
  const userId = (user as { id?: string })?.id ?? user?.email ?? ''

  const savedSettings = useQuery(api.settings.get, protectedQueryArgs(Boolean(userId) && isAuthenticated, {}))
  const teamMembersQuery = useQuery(api.team.list)
  const teamMembers = useMemo(() => teamMembersQuery ?? [], [teamMembersQuery])
  const [activeTab, setActiveTab] = useState('profile')
  const [selectedMonth, setSelectedMonth] = useState(getMonthKey(new Date()))
  const salesTargetsQuery = useQuery(
    api.salesTargets.listForMonth,
    activeTab === 'sales-targets' ? { monthKey: selectedMonth } : 'skip'
  )
  const salesTargets = useMemo(
    () => ((salesTargetsQuery ?? []) as SalesTargetRecord[]),
    [salesTargetsQuery]
  )

  const upsertSettings = useMutation(api.settings.upsert)
  const upsertSalesTarget = useMutation(api.salesTargets.upsert)
  const removeSalesTarget = useMutation(api.salesTargets.remove)

  const [displayName, setDisplayName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    notifOverdueTasks: true,
    notifNewLeads: true,
    notifPaymentDue: true,
    notifReimbursements: true,
    notifProjectUpdates: false,
  })
  const [savingNotifs, setSavingNotifs] = useState(false)
  const [dashboardSections, setDashboardSections] = useState<DashboardSectionId[]>(
    DEFAULT_DASHBOARD_SECTIONS
  )
  const [dashboardQuickActions, setDashboardQuickActions] = useState<DashboardQuickActionId[]>(
    DEFAULT_DASHBOARD_QUICK_ACTIONS
  )
  const [savingDashboard, setSavingDashboard] = useState(false)

  const [editingTargetId, setEditingTargetId] = useState<string | null>(null)
  const [scopeType, setScopeType] = useState<SalesTargetScope>('OVERALL')
  const [department, setDepartment] = useState('')
  const [teamMemberId, setTeamMemberId] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [actualAmount, setActualAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [savingTarget, setSavingTarget] = useState(false)
  const [deletingTargetId, setDeletingTargetId] = useState<string | null>(null)

  const departments = useMemo(
    () =>
      [...new Set(teamMembers.map((member) => member.department).filter(Boolean))]
        .map((value) => value as string)
        .sort((a, b) => a.localeCompare(b)),
    [teamMembers]
  )

  useEffect(() => {
    if (savedSettings) {
      if (savedSettings.displayName) setDisplayName(savedSettings.displayName)
      setNotifPrefs({
        notifOverdueTasks: savedSettings.notifOverdueTasks,
        notifNewLeads: savedSettings.notifNewLeads,
        notifPaymentDue: savedSettings.notifPaymentDue,
        notifReimbursements: savedSettings.notifReimbursements,
        notifProjectUpdates: savedSettings.notifProjectUpdates,
      })
      setDashboardSections(normalizeDashboardSectionIds(savedSettings.dashboardSections))
      setDashboardQuickActions(
        normalizeDashboardQuickActionIds(savedSettings.dashboardQuickActions)
      )
    }
  }, [savedSettings])

  function toggleDashboardSection(sectionId: DashboardSectionId, enabled: boolean) {
    setDashboardSections((current) => {
      if (enabled) {
        return current.includes(sectionId) ? current : [...current, sectionId]
      }

      return current.filter((id) => id !== sectionId)
    })
  }

  function toggleDashboardQuickAction(actionId: DashboardQuickActionId, enabled: boolean) {
    setDashboardQuickActions((current) => {
      if (enabled) {
        return current.includes(actionId) ? current : [...current, actionId]
      }

      return current.filter((id) => id !== actionId)
    })
  }

  function resetTargetForm(nextScope: SalesTargetScope = 'OVERALL') {
    setEditingTargetId(null)
    setScopeType(nextScope)
    setDepartment('')
    setTeamMemberId('')
    setTargetAmount('')
    setActualAmount('')
    setNotes('')
  }

  function startEditingTarget(target: SalesTargetRecord) {
    setEditingTargetId(target.id)
    setScopeType(target.scopeType)
    setDepartment(target.department ?? '')
    setTeamMemberId(target.teamMemberId ?? '')
    setTargetAmount(String(target.targetAmount))
    setActualAmount(target.actualAmount !== undefined && target.actualAmount !== null ? String(target.actualAmount) : '')
    setNotes(target.notes ?? '')
  }

  async function saveProfile() {
    if (!userId) return
    setSavingProfile(true)
    try {
      await upsertSettings({ displayName: displayName.trim() || undefined })
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to save profile')
    } finally {
      setSavingProfile(false)
    }
  }

  async function saveNotifications() {
    if (!userId) return
    setSavingNotifs(true)
    try {
      await upsertSettings({ ...notifPrefs })
      toast.success('Notification preferences saved')
    } catch {
      toast.error('Failed to save preferences')
    } finally {
      setSavingNotifs(false)
    }
  }

  async function saveDashboardPreferences() {
    if (!userId) return
    setSavingDashboard(true)
    try {
      await upsertSettings({
        dashboardSections,
        dashboardQuickActions,
      })
      toast.success('Dashboard preferences saved')
    } catch {
      toast.error('Failed to save dashboard preferences')
    } finally {
      setSavingDashboard(false)
    }
  }

  async function saveSalesTarget() {
    const parsedTarget = Number(targetAmount)
    const parsedActual = actualAmount ? Number(actualAmount) : undefined

    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      toast.error('Enter a valid target amount')
      return
    }

    if (scopeType === 'DEPARTMENT' && !department) {
      toast.error('Select a department')
      return
    }

    if (scopeType === 'MEMBER' && !teamMemberId) {
      toast.error('Select a team member')
      return
    }

    if (parsedActual !== undefined && (!Number.isFinite(parsedActual) || parsedActual < 0)) {
      toast.error('Enter a valid actual amount')
      return
    }

    setSavingTarget(true)
    try {
      await upsertSalesTarget({
        id: editingTargetId ? (editingTargetId as Id<'salesTargets'>) : undefined,
        monthKey: selectedMonth,
        scopeType,
        targetAmount: parsedTarget,
        actualAmount: scopeType === 'OVERALL' ? undefined : parsedActual,
        department: scopeType === 'DEPARTMENT' ? department : undefined,
        teamMemberId: scopeType === 'MEMBER' ? (teamMemberId as Id<'teamMembers'>) : undefined,
        notes: notes.trim() || undefined,
      })
      toast.success(editingTargetId ? 'Sales target updated' : 'Sales target saved')
      resetTargetForm(scopeType)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save target')
    } finally {
      setSavingTarget(false)
    }
  }

  async function deleteSalesTarget(targetId: string) {
    setDeletingTargetId(targetId)
    try {
      await removeSalesTarget({ id: targetId as Id<'salesTargets'> })
      toast.success('Sales target removed')
      if (editingTargetId === targetId) resetTargetForm(scopeType)
    } catch {
      toast.error('Failed to remove target')
    } finally {
      setDeletingTargetId(null)
    }
  }

  const effectiveName = displayName || user?.name || 'User'
  const configuredTargets = salesTargets.length
  const totalTargetValue = salesTargets.reduce((sum, target) => sum + target.targetAmount, 0)
  const totalActualValue = salesTargets.reduce((sum, target) => sum + (target.actualAmount ?? 0), 0)
  const currentScopeMeta = scopeMeta[scopeType]
  const salesTargetsLoading = activeTab === 'sales-targets' && salesTargetsQuery === undefined
  const visibleSectionCount = dashboardSections.length
  const pinnedActionCount = dashboardQuickActions.length

  return (
    <div className="max-w-5xl space-y-6">
      <SettingsPageHeader />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="h-3.5 w-3.5" /> Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-1.5">
            <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="sales-targets" className="gap-1.5">
            <Target className="h-3.5 w-3.5" /> Sales Targets
          </TabsTrigger>
          <TabsTrigger value="crm-guide" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> CRM Guide
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" /> Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Profile Information</CardTitle>
              <CardDescription className="text-xs">Your account details from the sign-in provider</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                  <AvatarImage src={user?.image ?? undefined} alt={effectiveName} />
                  <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                    {getInitials(effectiveName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-base font-semibold">{effectiveName}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <Badge variant="secondary" className="mt-1.5 text-xs">
                    {(user as { role?: string })?.role?.replace('_', ' ') ?? 'Member'}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  placeholder={user?.name ?? 'Your name'}
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="max-w-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Overrides the name shown in the CRM. Leave blank to use your account name.
                </p>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-[140px_1fr] items-center gap-2 border-b py-2 text-sm">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{user?.email ?? '—'}</span>
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-2 border-b py-2 text-sm">
                  <span className="text-muted-foreground">Sign-in method</span>
                  <span className="font-medium capitalize">Google / OAuth</span>
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-2 py-2 text-sm">
                  <span className="text-muted-foreground">User ID</span>
                  <span className="truncate font-mono text-xs text-muted-foreground">{userId || '—'}</span>
                </div>
              </div>

              <Button onClick={saveProfile} disabled={savingProfile} className="gap-1.5">
                <Save className="h-3.5 w-3.5" />
                {savingProfile ? 'Saving…' : 'Save Profile'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Notification Preferences</CardTitle>
              <CardDescription className="text-xs">Choose which in-app alerts you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {notifLabels.map(({ key, label, description }, index) => (
                <div key={key}>
                  {index > 0 && <Separator className="my-3" />}
                  <div className="flex items-start justify-between gap-4 py-1">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                    <Switch
                      checked={notifPrefs[key]}
                      onCheckedChange={(checked) =>
                        setNotifPrefs((current) => ({ ...current, [key]: checked }))
                      }
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Button onClick={saveNotifications} disabled={savingNotifs} className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            {savingNotifs ? 'Saving…' : 'Save Preferences'}
          </Button>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Dashboard Layout</CardTitle>
              <CardDescription className="text-xs">
                Personalize which dashboard blocks you see and which shortcuts stay pinned for you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="surface-muted p-4">
                  <p className="section-eyebrow">Visible blocks</p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight">{visibleSectionCount}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Hide less important widgets and keep your daily control room focused.
                  </p>
                </div>
                <div className="surface-muted p-4">
                  <p className="section-eyebrow">Pinned shortcuts</p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight">{pinnedActionCount}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Control which quick actions stay visible on your personal dashboard.
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                {DASHBOARD_SECTION_OPTIONS.map((section, index) => (
                  <div key={section.id}>
                    {index > 0 && <Separator className="my-3" />}
                    <div className="flex items-start justify-between gap-4 py-1">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{section.label}</p>
                        <p className="text-xs text-muted-foreground">{section.description}</p>
                      </div>
                      <Switch
                        checked={dashboardSections.includes(section.id)}
                        onCheckedChange={(checked) => toggleDashboardSection(section.id, checked)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-1">
                {DASHBOARD_QUICK_ACTION_OPTIONS.map((action, index) => (
                  <div key={action.id}>
                    {index > 0 && <Separator className="my-3" />}
                    <div className="flex items-start justify-between gap-4 py-1">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{action.label}</p>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                      <Switch
                        checked={dashboardQuickActions.includes(action.id)}
                        onCheckedChange={(checked) => toggleDashboardQuickAction(action.id, checked)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={saveDashboardPreferences}
                  disabled={savingDashboard}
                  className="gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  {savingDashboard ? 'Saving...' : 'Save Dashboard'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDashboardSections(DEFAULT_DASHBOARD_SECTIONS)
                    setDashboardQuickActions(DEFAULT_DASHBOARD_QUICK_ACTIONS)
                  }}
                >
                  Reset defaults
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales-targets" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-sm">Monthly Sales Target Manager</CardTitle>
                    <CardDescription className="mt-1 text-xs">
                      Configure overall, department, and team-member targets for {formatMonthLabel(selectedMonth)}.
                    </CardDescription>
                  </div>

                  <div className="w-full max-w-[220px] space-y-1.5">
                    <Label htmlFor="targetMonth">Month</Label>
                    <Input
                      id="targetMonth"
                      type="month"
                      value={selectedMonth}
                      onChange={(event) => {
                        setSelectedMonth(event.target.value)
                        resetTargetForm(scopeType)
                      }}
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="surface-muted p-4">
                    <p className="section-eyebrow">Configured targets</p>
                    <p className="mt-3 text-2xl font-semibold tracking-tight">
                      {salesTargetsLoading ? '...' : configuredTargets}
                    </p>
                  </div>
                  <div className="surface-muted p-4">
                    <p className="section-eyebrow">Target value</p>
                    <p className="mt-3 text-2xl font-semibold tracking-tight">
                      {salesTargetsLoading ? 'Loading...' : formatCurrency(totalTargetValue)}
                    </p>
                  </div>
                  <div className="surface-muted p-4">
                    <p className="section-eyebrow">Manual actuals</p>
                    <p className="mt-3 text-2xl font-semibold tracking-tight">
                      {salesTargetsLoading ? 'Loading...' : formatCurrency(totalActualValue)}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Target scope</Label>
                      <Select
                        value={scopeType}
                        onValueChange={(value) => {
                          const nextScope = value as SalesTargetScope
                          setScopeType(nextScope)
                          setDepartment('')
                          setTeamMemberId('')
                          setActualAmount('')
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(scopeMeta).map(([value, meta]) => (
                            <SelectItem key={value} value={value}>
                              {meta.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">{currentScopeMeta.helper}</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Target amount</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Enter target amount"
                        value={targetAmount}
                        onChange={(event) => setTargetAmount(event.target.value)}
                      />
                    </div>
                  </div>

                  {scopeType === 'DEPARTMENT' && (
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Select value={department} onValueChange={(value) => setDepartment(value ?? '')}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {scopeType === 'MEMBER' && (
                    <div className="space-y-2">
                      <Label>Team member</Label>
                      <Select value={teamMemberId} onValueChange={(value) => setTeamMemberId(value ?? '')}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                        <SelectContent>
                          {teamMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {scopeType !== 'OVERALL' && (
                    <div className="space-y-2">
                      <Label>Actual amount</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Enter actual amount"
                        value={actualAmount}
                        onChange={(event) => setActualAmount(event.target.value)}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      placeholder="Optional notes for this target"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button onClick={saveSalesTarget} disabled={savingTarget} className="gap-1.5">
                      <Save className="h-3.5 w-3.5" />
                      {savingTarget ? 'Saving…' : editingTargetId ? 'Update Target' : 'Save Target'}
                    </Button>

                    {editingTargetId && (
                      <Button variant="outline" onClick={() => resetTargetForm(scopeType)}>
                        Cancel edit
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Configured Targets</CardTitle>
                <CardDescription className="text-xs">
                  Overall targets drive live dashboard progress from finance revenue. Department and member actuals are tracked manually for now.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                {salesTargetsLoading ? (
                  <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-border bg-muted/30 px-6 text-center">
                    <Target className="mb-3 h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-foreground">Loading target data</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Pulling the latest monthly target configuration from Convex.
                    </p>
                  </div>
                ) : salesTargets.length === 0 ? (
                  <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-border bg-muted/30 px-6 text-center">
                    <Target className="mb-3 h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-foreground">No targets configured yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Add your first monthly target to turn on dashboard progress tracking.
                    </p>
                  </div>
                ) : (
                  salesTargets.map((target) => {
                    const ScopeIcon = scopeMeta[target.scopeType].icon
                    const performanceTone =
                      target.progress === null
                        ? 'tone-neutral'
                        : target.progress >= 100
                          ? 'tone-success'
                          : target.progress >= 75
                            ? 'tone-warning'
                            : 'tone-danger'

                    return (
                      <div key={target.id} className="surface-muted p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-card">
                                <ScopeIcon className="h-4 w-4 text-foreground" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">{target.label}</p>
                                <p className="text-xs text-muted-foreground">{scopeMeta[target.scopeType].label}</p>
                              </div>
                            </div>

                            <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                              <div>
                                <span className="block text-[11px] uppercase tracking-[0.2em]">Target</span>
                                <span className="mt-1 block font-medium text-foreground">
                                  {formatCurrency(target.targetAmount)}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[11px] uppercase tracking-[0.2em]">Actual</span>
                                <span className="mt-1 block font-medium text-foreground">
                                  {target.actualAmount !== undefined && target.actualAmount !== null
                                    ? formatCurrency(target.actualAmount)
                                    : 'Auto from revenue'}
                                </span>
                              </div>
                            </div>

                            {target.notes && (
                              <p className="mt-3 text-sm leading-6 text-muted-foreground">{target.notes}</p>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-medium ${performanceTone}`}>
                              {target.progress === null ? 'Auto actual' : `${target.progress}%`}
                            </span>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={() => startEditingTarget(target)}
                              >
                                <PencilLine className="h-3.5 w-3.5" />
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => deleteSalesTarget(target.id)}
                                disabled={deletingTargetId === target.id}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="crm-guide" className="space-y-4">
          <CrmGuide />
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Security</CardTitle>
              <CardDescription className="text-xs">Account security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1 rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium">Authentication Method</p>
                <p className="text-xs text-muted-foreground">
                  You are signed in via Google OAuth. Password management is handled by your Google account.
                </p>
              </div>
              <div className="space-y-1 rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium">Session</p>
                <p className="text-xs text-muted-foreground">
                  Sessions are managed securely via NextAuth. You will be automatically signed out after an extended period of inactivity.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
