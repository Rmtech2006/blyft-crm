'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { User, Bell, Shield, Save } from 'lucide-react'

function getInitials(name: string | null | undefined) {
  if (!name) return 'U'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

type NotifPrefs = {
  notifOverdueTasks: boolean
  notifNewLeads: boolean
  notifPaymentDue: boolean
  notifReimbursements: boolean
  notifProjectUpdates: boolean
}

const notifLabels: { key: keyof NotifPrefs; label: string; description: string }[] = [
  { key: 'notifOverdueTasks', label: 'Overdue Tasks', description: 'Alert when tasks pass their due date' },
  { key: 'notifNewLeads', label: 'New Leads', description: 'Notify when a new lead is added to the pipeline' },
  { key: 'notifPaymentDue', label: 'Payment Due', description: 'Remind about outstanding client payments' },
  { key: 'notifReimbursements', label: 'Reimbursements', description: 'Alerts for new or updated reimbursement requests' },
  { key: 'notifProjectUpdates', label: 'Project Updates', description: 'Notify when project status changes' },
]

export default function SettingsPage() {
  const { data: session } = useSession()
  const user = session?.user
  const userId = (user as { id?: string })?.id ?? user?.email ?? ''

  const savedSettings = useQuery(api.settings.get, userId ? { userId } : 'skip')
  const upsertSettings = useMutation(api.settings.upsert)

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
    }
  }, [savedSettings])

  async function saveProfile() {
    if (!userId) return
    setSavingProfile(true)
    try {
      await upsertSettings({ userId, displayName: displayName.trim() || undefined })
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
      await upsertSettings({ userId, ...notifPrefs })
      toast.success('Notification preferences saved')
    } catch {
      toast.error('Failed to save preferences')
    } finally {
      setSavingNotifs(false)
    }
  }

  const effectiveName = displayName || user?.name || 'User'

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="h-3.5 w-3.5" /> Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" /> Security
          </TabsTrigger>
        </TabsList>

        {/* ── Profile Tab ── */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Profile Information</CardTitle>
              <CardDescription className="text-xs">Your account details from the sign-in provider</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar row */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                  <AvatarImage src={user?.image ?? undefined} alt={effectiveName} />
                  <AvatarFallback className="text-lg bg-primary/10 text-primary font-bold">
                    {getInitials(effectiveName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-base">{effectiveName}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <Badge variant="secondary" className="mt-1.5 text-xs">
                    {(user as { role?: string })?.role?.replace('_', ' ') ?? 'Member'}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Editable display name */}
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  placeholder={user?.name ?? 'Your name'}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="max-w-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Overrides the name shown in the CRM. Leave blank to use your account name.
                </p>
              </div>

              {/* Read-only fields */}
              <div className="space-y-2">
                <div className="grid grid-cols-[140px_1fr] items-center gap-2 py-2 border-b text-sm">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{user?.email ?? '—'}</span>
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-2 py-2 border-b text-sm">
                  <span className="text-muted-foreground">Sign-in method</span>
                  <span className="font-medium capitalize">Google / OAuth</span>
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-2 py-2 text-sm">
                  <span className="text-muted-foreground">User ID</span>
                  <span className="font-mono text-xs text-muted-foreground truncate">{userId || '—'}</span>
                </div>
              </div>

              <Button onClick={saveProfile} disabled={savingProfile} className="gap-1.5">
                <Save className="h-3.5 w-3.5" />
                {savingProfile ? 'Saving…' : 'Save Profile'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Notifications Tab ── */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Notification Preferences</CardTitle>
              <CardDescription className="text-xs">Choose which in-app alerts you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {notifLabels.map(({ key, label, description }, i) => (
                <div key={key}>
                  {i > 0 && <Separator className="my-3" />}
                  <div className="flex items-start justify-between gap-4 py-1">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                    <Switch
                      checked={notifPrefs[key]}
                      onCheckedChange={(checked) =>
                        setNotifPrefs((p) => ({ ...p, [key]: checked }))
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

        {/* ── Security Tab ── */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Security</CardTitle>
              <CardDescription className="text-xs">Account security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
                <p className="text-sm font-medium">Authentication Method</p>
                <p className="text-xs text-muted-foreground">
                  You are signed in via Google OAuth. Password management is handled by your Google account.
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
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
