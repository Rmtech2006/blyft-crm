'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

type AssignedTeamMember = {
  teamMember: {
    id: string
    fullName: string
    type: string
    department?: string | null
  }
}

type ManageProjectTeamDialogProps = {
  projectId: string
  projectName: string
  assignedTeamMembers?: AssignedTeamMember[] | null
  open: boolean
  onClose: () => void
}

function formatEnum(value?: string | null) {
  return String(value ?? '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

export function ManageProjectTeamDialog({
  projectId,
  projectName,
  assignedTeamMembers,
  open,
  onClose,
}: ManageProjectTeamDialogProps) {
  const membersQuery = useQuery(api.team.list)
  const setTeamMembers = useMutation(api.projects.setTeamMembers)
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setSelectedIds((assignedTeamMembers ?? []).map((member) => member.teamMember.id))
    setQuery('')
  }, [assignedTeamMembers, open])

  const visibleMembers = useMemo(() => {
    const term = query.trim().toLowerCase()
    return (membersQuery ?? [])
      .filter((member) => member.status !== 'OFFBOARDED')
      .filter((member) => {
        if (!term) return true
        return [
          member.fullName,
          member.department,
          member.roleTitle,
          member.type,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(term)
      })
  }, [membersQuery, query])

  function toggleMember(memberId: string, checked: boolean) {
    setSelectedIds((current) =>
      checked ? [...new Set([...current, memberId])] : current.filter((id) => id !== memberId)
    )
  }

  async function handleSave() {
    setSaving(true)
    try {
      await setTeamMembers({
        projectId: projectId as Id<'projects'>,
        teamMemberIds: selectedIds as Id<'teamMembers'>[],
      })
      toast.success('Project team updated')
      onClose()
    } catch {
      toast.error('Failed to save team')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign team</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Choose who should be assigned to {projectName}.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search team members"
          />

          <div className="rounded-lg border">
            <div className="max-h-[360px] space-y-2 overflow-y-auto p-3">
              {visibleMembers.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No matching team members found.
                </p>
              ) : (
                visibleMembers.map((member) => {
                  const checked = selectedIds.includes(member.id)

                  return (
                    <label
                      key={member.id}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-3"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => toggleMember(member.id, Boolean(value))}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{member.fullName}</p>
                          <Badge variant="outline" className="text-[10px]">
                            {formatEnum(member.type)}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {member.department ?? 'No department'}{member.roleTitle ? ` · ${member.roleTitle}` : ''}
                        </p>
                      </div>
                    </label>
                  )
                })
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {selectedIds.length} team member{selectedIds.length === 1 ? '' : 's'} selected
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save team'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
