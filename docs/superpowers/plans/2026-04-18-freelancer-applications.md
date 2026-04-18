# Freelancer Applications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public freelancer application link with photo upload, multi-role/sub-skill selection, an Other skill field, and an admin approval queue on the Team page.

**Architecture:** Add freelancer applications as a separate Convex table so public submissions never appear in Team until reviewed. Create a public `/freelancer` route modeled after the existing `/capture` route, then add Team page approval actions that convert approved applications into `teamMembers`.

**Tech Stack:** Next.js App Router, React Hook Form, Zod, Convex queries/mutations/storage, existing shadcn-style UI components, Sonner toasts, TypeScript.

---

## File Structure

- Create `convex/freelancerApplications.ts`: public create mutation, admin list query, approve mutation, reject mutation, storage URL hydration.
- Modify `convex/schema.ts`: add `freelancerApplications` table and optional structured freelancer fields on `teamMembers`.
- Create `src/lib/freelancer-skills.ts`: shared role category and sub-skill presets for the public form and admin display.
- Create `src/app/freelancer/layout.tsx`: public route shell matching the capture page environment.
- Create `src/app/freelancer/page.tsx`: public freelancer application form and submitted state.
- Modify `src/lib/auth.config.ts`: make `/freelancer` public.
- Modify `src/components/team/add-member-dialog.tsx`: remove visible Photo URL field and stop sending `photoUrl`.
- Modify `src/components/team/edit-member-dialog.tsx`: remove visible Photo URL field and preserve existing photo when no upload happens.
- Modify `src/app/(dashboard)/team/page.tsx`: add Copy Freelancer Link, pending application queue, approve/reject actions, and application types.
- Modify `src/app/(dashboard)/team/[id]/page.tsx`: show structured role categories, sub-skills, Other skill, availability, and expected rate when present.

---

### Task 1: Convex Data Model And Application API

**Files:**
- Modify: `convex/schema.ts`
- Create: `convex/freelancerApplications.ts`

- [ ] **Step 1: Extend `teamMembers` and add `freelancerApplications` in `convex/schema.ts`**

Add these optional fields inside `teamMembers` after `roleTitle`:

```ts
    roleCategories: v.optional(v.array(v.string())),
    roleSkills: v.optional(v.array(v.object({
      category: v.string(),
      skills: v.array(v.string()),
    }))),
    otherSkill: v.optional(v.string()),
    availability: v.optional(v.string()),
    expectedRate: v.optional(v.string()),
```

Add this table after `teamMembers`:

```ts
  freelancerApplications: defineTable({
    fullName: v.string(),
    photoStorageId: v.optional(v.string()),
    email: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    phone: v.optional(v.string()),
    location: v.optional(v.string()),
    portfolioUrl: v.optional(v.string()),
    behanceUrl: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    roleCategories: v.array(v.string()),
    roleSkills: v.array(v.object({
      category: v.string(),
      skills: v.array(v.string()),
    })),
    otherSkill: v.optional(v.string()),
    experienceNotes: v.optional(v.string()),
    availability: v.optional(v.string()),
    expectedRate: v.optional(v.string()),
    status: v.union(v.literal("PENDING"), v.literal("APPROVED"), v.literal("REJECTED")),
    submittedAt: v.number(),
    reviewedAt: v.optional(v.number()),
    approvedTeamMemberId: v.optional(v.id("teamMembers")),
  })
    .index("by_status", ["status"])
    .index("by_submittedAt", ["submittedAt"]),
```

- [ ] **Step 2: Create `convex/freelancerApplications.ts`**

Create mutations and queries with these exact public function names: `listPending`, `create`, `approve`, and `reject`.

Validation requirements:

```ts
const roleSkillValidator = v.object({
  category: v.string(),
  skills: v.array(v.string()),
});
```

`create` args:

```ts
{
  fullName: v.string(),
  photoStorageId: v.optional(v.string()),
  email: v.optional(v.string()),
  whatsapp: v.optional(v.string()),
  phone: v.optional(v.string()),
  location: v.optional(v.string()),
  portfolioUrl: v.optional(v.string()),
  behanceUrl: v.optional(v.string()),
  linkedinUrl: v.optional(v.string()),
  roleCategories: v.array(v.string()),
  roleSkills: v.array(roleSkillValidator),
  otherSkill: v.optional(v.string()),
  experienceNotes: v.optional(v.string()),
  availability: v.optional(v.string()),
  expectedRate: v.optional(v.string()),
}
```

`create` must insert `status: "PENDING"` and `submittedAt: Date.now()`.

`listPending` must query `freelancerApplications` using `by_status` with `"PENDING"`, order descending, and return `photoUrl` from `ctx.storage.getUrl(photoStorageId)` when present.

`approve` args:

```ts
{ id: v.id("freelancerApplications") }
```

`approve` must:

```ts
const application = await ctx.db.get(args.id);
if (!application) throw new Error("Application not found");
if (application.status !== "PENDING") throw new Error("Application already reviewed");
const skills = [
  ...application.roleSkills.flatMap((group) => group.skills),
  ...(application.otherSkill ? [application.otherSkill] : []),
];
const memberId = await ctx.db.insert("teamMembers", {
  fullName: application.fullName,
  photoStorageId: application.photoStorageId,
  phone: application.phone,
  whatsapp: application.whatsapp,
  email: application.email,
  roleTitle: application.roleCategories[0],
  roleCategories: application.roleCategories,
  roleSkills: application.roleSkills,
  otherSkill: application.otherSkill,
  portfolioUrl: application.portfolioUrl,
  behanceUrl: application.behanceUrl,
  linkedinUrl: application.linkedinUrl,
  location: application.location,
  type: "FREELANCER",
  status: "ACTIVE",
  department: "Freelance",
  startDate: Date.now(),
  availability: application.availability,
  expectedRate: application.expectedRate,
  compensationMode: "PROJECT_BASED",
  skills,
  performanceNotes: application.experienceNotes,
});
await ctx.db.patch(args.id, {
  status: "APPROVED",
  reviewedAt: Date.now(),
  approvedTeamMemberId: memberId,
});
return memberId;
```

`reject` must patch `status: "REJECTED"` and `reviewedAt: Date.now()` after verifying the application is still pending.

- [ ] **Step 3: Run Convex codegen**

Run:

```bash
npx convex codegen
```

Expected: generated API types include `api.freelancerApplications.create`, `api.freelancerApplications.listPending`, `api.freelancerApplications.approve`, and `api.freelancerApplications.reject`.

- [ ] **Step 4: Commit Task 1**

Run:

```bash
git add convex/schema.ts convex/freelancerApplications.ts convex/_generated
git commit -m "feat: add freelancer application backend"
```

---

### Task 2: Shared Role And Sub-Skill Presets

**Files:**
- Create: `src/lib/freelancer-skills.ts`

- [ ] **Step 1: Create the shared presets**

Create this file:

```ts
export type FreelancerSkillGroup = {
  category: string
  skills: string[]
}

export const FREELANCER_SKILL_GROUPS: FreelancerSkillGroup[] = [
  {
    category: 'Graphic Design',
    skills: ['Social posts', 'Brand identity', 'Thumbnails', 'Posters', 'Pitch decks', 'Print design', 'Ad creatives'],
  },
  {
    category: 'Video Editing',
    skills: ['Reels / Shorts', 'YouTube long-form', 'Podcast editing', 'Ad creatives', 'Color grading', 'Sound cleanup', 'Corporate edits'],
  },
  {
    category: 'Motion Graphics',
    skills: ['Logo animation', 'Explainer videos', 'Kinetic typography', 'Lottie animation', 'Social motion posts'],
  },
  {
    category: '3D Animation',
    skills: ['Product renders', 'Product animation', '3D modeling', 'Character animation', 'Blender', 'Cinema 4D'],
  },
  {
    category: 'Web / UI Design',
    skills: ['Landing pages', 'Dashboards', 'Wireframes', 'Design systems', 'Figma prototypes', 'Responsive layouts'],
  },
  {
    category: 'Development',
    skills: ['Frontend', 'Backend', 'Next.js', 'React', 'Automation', 'API integrations'],
  },
  {
    category: 'Social Media',
    skills: ['Content calendar', 'Community management', 'Caption writing', 'Instagram growth', 'LinkedIn content'],
  },
  {
    category: 'Marketing',
    skills: ['Meta ads', 'Google ads', 'Campaign strategy', 'Landing page audit', 'Performance creatives'],
  },
  {
    category: 'Content Writing',
    skills: ['Blogs', 'Website copy', 'Scripts', 'Ad copy', 'Email copy', 'Case studies'],
  },
]
```

- [ ] **Step 2: Commit Task 2**

Run:

```bash
git add src/lib/freelancer-skills.ts
git commit -m "feat: add freelancer skill presets"
```

---

### Task 3: Public Freelancer Application Page

**Files:**
- Create: `src/app/freelancer/layout.tsx`
- Create: `src/app/freelancer/page.tsx`
- Modify: `src/lib/auth.config.ts`

- [ ] **Step 1: Add `/freelancer` to public routes**

In `src/lib/auth.config.ts`, update the public route block:

```ts
      const isPublic =
        nextUrl.pathname === '/login' ||
        nextUrl.pathname === '/capture' ||
        nextUrl.pathname === '/freelancer' ||
        nextUrl.pathname.startsWith('/api/auth') ||
        nextUrl.pathname.startsWith('/api/convex')
```

Also replace the broken comment with ASCII:

```ts
// Lightweight auth config for Edge middleware - no PrismaAdapter, no DB calls
```

- [ ] **Step 2: Add public route layout**

Create `src/app/freelancer/layout.tsx`:

```tsx
export default function FreelancerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#faf9f6,#f1efea)] px-4 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center">
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Build the freelancer form page**

Create `src/app/freelancer/page.tsx` as a client component.

Required imports:

```tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Camera, CheckCircle2, Link2, ShieldCheck, Sparkles, Upload, X } from 'lucide-react'
import { BlyftLogo } from '@/components/brand/blyft-logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FREELANCER_SKILL_GROUPS } from '@/lib/freelancer-skills'
```

Schema:

```ts
const schema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  whatsapp: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  portfolioUrl: z.string().optional(),
  behanceUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  otherSkill: z.string().optional(),
  experienceNotes: z.string().optional(),
  availability: z.string().optional(),
  expectedRate: z.string().optional(),
}).superRefine((data, ctx) => {
  if (!data.email && !data.whatsapp) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['whatsapp'], message: 'Add email or WhatsApp' })
  }
})
```

State:

```ts
const [selectedCategories, setSelectedCategories] = useState<string[]>([])
const [selectedSkills, setSelectedSkills] = useState<Record<string, string[]>>({})
const [photoFile, setPhotoFile] = useState<File | null>(null)
const [previewUrl, setPreviewUrl] = useState<string | null>(null)
const [submitted, setSubmitted] = useState(false)
const [loading, setLoading] = useState(false)
const fileRef = useRef<HTMLInputElement>(null)
const createApplication = useMutation(api.freelancerApplications.create)
const generateUploadUrl = useMutation(api.files.generateUploadUrl)
```

Submit behavior:

```ts
if (selectedCategories.length === 0) {
  setSkillError('Select at least one role category')
  return
}
let photoStorageId: string | undefined
if (photoFile) {
  const uploadUrl = await generateUploadUrl()
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': photoFile.type },
    body: photoFile,
  })
  if (!response.ok) throw new Error('Photo upload failed')
  const result = await response.json() as { storageId: string }
  photoStorageId = result.storageId
}
await createApplication({
  fullName: data.fullName.trim(),
  photoStorageId,
  email: cleanText(data.email),
  whatsapp: cleanText(data.whatsapp),
  phone: cleanText(data.phone),
  location: cleanText(data.location),
  portfolioUrl: normalizeUrl(data.portfolioUrl),
  behanceUrl: normalizeUrl(data.behanceUrl),
  linkedinUrl: normalizeUrl(data.linkedinUrl),
  roleCategories: selectedCategories,
  roleSkills: selectedCategories.map((category) => ({
    category,
    skills: selectedSkills[category] ?? [],
  })),
  otherSkill: cleanText(data.otherSkill),
  experienceNotes: cleanText(data.experienceNotes),
  availability: cleanText(data.availability),
  expectedRate: cleanText(data.expectedRate),
})
setSubmitted(true)
```

UI requirements:

- Left premium panel with BLYFT logo and practical internal copy.
- Right form card with photo upload control.
- Category checkboxes render from `FREELANCER_SKILL_GROUPS`.
- Selected categories reveal sub-skill checkboxes.
- Include an `Other skill` input under the role matrix.
- No Photo URL field anywhere on the page.
- Submitted state confirms the profile is waiting for internal review.

- [ ] **Step 4: Run quick page type check**

Run:

```bash
npx tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit Task 3**

Run:

```bash
git add src/app/freelancer src/lib/auth.config.ts
git commit -m "feat: add freelancer application page"
```

---

### Task 4: Remove Photo URL From Team Member Forms

**Files:**
- Modify: `src/components/team/add-member-dialog.tsx`
- Modify: `src/components/team/edit-member-dialog.tsx`

- [ ] **Step 1: Remove `photoUrl` from add form schema and submit**

In `add-member-dialog.tsx`, remove:

```ts
photoUrl: z.string().optional(),
```

Remove this from `createMember` payload:

```ts
photoUrl: normalizeUrl(data.photoUrl),
```

Remove the `Photo URL` label/input block from the photo section.

Remove the unused `normalizeUrl` helper only if no other fields need it. Keep it if portfolio/Behance/LinkedIn still use it.

- [ ] **Step 2: Remove `photoUrl` from edit form schema and reset values**

In `edit-member-dialog.tsx`, remove:

```ts
photoUrl: z.string().optional(),
```

Remove `photoUrl` from `defaultValues` and the `reset(...)` call.

Remove this from `updateMember` payload:

```ts
photoUrl: normalizeUrl(data.photoUrl),
```

Remove the visible `Photo URL` label/input block.

Keep preview behavior based on `member.photoUrl` so legacy URLs still display until replaced by upload.

- [ ] **Step 3: Run TypeScript**

Run:

```bash
npx tsc --noEmit
```

Expected: no references to `data.photoUrl` remain.

- [ ] **Step 4: Commit Task 4**

Run:

```bash
git add src/components/team/add-member-dialog.tsx src/components/team/edit-member-dialog.tsx
git commit -m "fix: use upload-only team photos"
```

---

### Task 5: Team Page Admin Approval Queue

**Files:**
- Modify: `src/app/(dashboard)/team/page.tsx`

- [ ] **Step 1: Add application types**

Add this type near `TeamMember`:

```ts
type FreelancerApplication = {
  id: string
  fullName: string
  photoUrl?: string | null
  email?: string | null
  whatsapp?: string | null
  phone?: string | null
  location?: string | null
  portfolioUrl?: string | null
  behanceUrl?: string | null
  linkedinUrl?: string | null
  roleCategories: string[]
  roleSkills: Array<{ category: string; skills: string[] }>
  otherSkill?: string | null
  experienceNotes?: string | null
  availability?: string | null
  expectedRate?: string | null
  submittedAt: number
}
```

Extend `TeamMember` with:

```ts
  roleCategories?: string[] | null
  roleSkills?: Array<{ category: string; skills: string[] }> | null
  otherSkill?: string | null
  availability?: string | null
  expectedRate?: string | null
```

- [ ] **Step 2: Wire queries and mutations**

Add imports:

```tsx
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { Check, Copy, XCircle } from 'lucide-react'
import { Id } from '@convex/_generated/dataModel'
```

Use:

```ts
const applicationsQuery = useQuery(api.freelancerApplications.listPending)
const approveApplication = useMutation(api.freelancerApplications.approve)
const rejectApplication = useMutation(api.freelancerApplications.reject)
const applications = useMemo(() => (applicationsQuery ?? []) as FreelancerApplication[], [applicationsQuery])
const [reviewingId, setReviewingId] = useState<string | null>(null)
```

Add handlers:

```ts
function copyFreelancerLink() {
  const url = `${window.location.origin}/freelancer`
  navigator.clipboard.writeText(url)
  toast.success('Freelancer application link copied')
}

async function handleApprove(id: string) {
  setReviewingId(id)
  try {
    await approveApplication({ id: id as Id<'freelancerApplications'> })
    toast.success('Freelancer approved')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to approve application')
  } finally {
    setReviewingId(null)
  }
}

async function handleReject(id: string) {
  setReviewingId(id)
  try {
    await rejectApplication({ id: id as Id<'freelancerApplications'> })
    toast.success('Application rejected')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to reject application')
  } finally {
    setReviewingId(null)
  }
}
```

- [ ] **Step 3: Add Copy Freelancer Link action in the hero**

Add a `Button` beside `AddMemberDialog`:

```tsx
<Button type="button" size="sm" variant="outline" onClick={copyFreelancerLink}>
  <Copy className="mr-1 h-4 w-4" />
  Freelancer Link
</Button>
```

Use existing dark hero button styling wrapper.

- [ ] **Step 4: Add pending application section**

Render this section after the hero and before summary cards when applications exist:

```tsx
{applications.length > 0 && (
  <section className="rounded-lg border border-neutral-950/10 bg-white p-5 shadow-[0_24px_80px_-62px_rgba(0,0,0,0.72)]">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Freelancer applications</p>
        <h2 className="mt-2 text-xl font-semibold text-foreground">Pending review</h2>
      </div>
      <p className="text-sm text-muted-foreground">{applications.length} waiting for approval</p>
    </div>
    <div className="mt-4 grid gap-3 xl:grid-cols-2">
      {applications.map((application) => (
        <FreelancerApplicationCard
          key={application.id}
          application={application}
          reviewing={reviewingId === application.id}
          onApprove={() => handleApprove(application.id)}
          onReject={() => handleReject(application.id)}
        />
      ))}
    </div>
  </section>
)}
```

Add `FreelancerApplicationCard` in the same file. It must show name, photo/initials, location, contact, portfolio links, role categories, role skills, Other skill, availability, expected rate, and experience notes. Approve and reject buttons must be disabled when `reviewing` is true.

- [ ] **Step 5: Include structured skill fields in search**

Add these to the `haystack` array:

```ts
...(member.roleCategories ?? []),
...((member.roleSkills ?? []).flatMap((group) => [group.category, ...group.skills])),
member.otherSkill,
member.availability,
member.expectedRate,
```

- [ ] **Step 6: Run TypeScript**

Run:

```bash
npx tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 7: Commit Task 5**

Run:

```bash
git add "src/app/(dashboard)/team/page.tsx"
git commit -m "feat: add freelancer approval queue"
```

---

### Task 6: Team Detail Structured Freelancer Fields

**Files:**
- Modify: `src/app/(dashboard)/team/[id]/page.tsx`

- [ ] **Step 1: Extend detail type**

Add these fields to `MemberDetail`:

```ts
  roleCategories?: string[] | null
  roleSkills?: Array<{ category: string; skills: string[] }> | null
  otherSkill?: string | null
  availability?: string | null
  expectedRate?: string | null
```

- [ ] **Step 2: Show freelancer fields in Profile and Compensation**

In the `Employment` rows, add:

```ts
['Categories', member.roleCategories?.join(', ')],
['Availability', member.availability],
```

In `Compensation Details`, add:

```ts
['Expected rate', member.expectedRate],
```

In the Skills card, after existing `member.skills`, render grouped sub-skills when `member.roleSkills?.length` exists:

```tsx
{member.roleSkills?.map((group) => (
  <div key={group.category} className="rounded-lg border border-border/70 bg-muted/25 p-3">
    <p className="text-xs font-semibold text-foreground">{group.category}</p>
    <div className="mt-2 flex flex-wrap gap-2">
      {group.skills.map((skill) => (
        <span key={`${group.category}-${skill}`} className="rounded-md bg-white px-2 py-1 text-xs text-muted-foreground">{skill}</span>
      ))}
    </div>
  </div>
))}
{member.otherSkill && (
  <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">Other: {member.otherSkill}</span>
)}
```

- [ ] **Step 3: Run TypeScript**

Run:

```bash
npx tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit Task 6**

Run:

```bash
git add "src/app/(dashboard)/team/[id]/page.tsx"
git commit -m "feat: show freelancer skill details"
```

---

### Task 7: Verification, Deploy, And Push

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run static checks**

Run:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Expected: lint passes, TypeScript passes, Next build completes.

- [ ] **Step 2: Deploy Convex schema/API**

Run:

```bash
npm run convex:deploy
```

Expected: Convex deploy completes with the active production deployment URL.

- [ ] **Step 3: Push to Git**

Run:

```bash
git status --short
git push origin fix/revenue-tracker-card
```

Expected: working tree clean and branch pushed.

- [ ] **Step 4: Confirm Vercel deployment**

Run the existing Vercel/GitHub status workflow used on this branch:

```bash
gh run list --branch fix/revenue-tracker-card --limit 5
```

Expected: latest deployment/checks are successful. If the project uses automatic Vercel deployment from GitHub, wait for the deployment status and verify `/freelancer` and `/team` load after auth behavior is applied.

- [ ] **Step 5: Manual product checks**

Check these behaviors:

- `/freelancer` loads without login.
- Submitting without email and WhatsApp shows validation.
- Submitting without a role category shows validation.
- A valid application saves as pending.
- The Team page shows the pending application but does not show it in the team member grid.
- Approve creates an active freelancer team member.
- Reject removes the pending application without creating a team member.
- Add/Edit member forms no longer show Photo URL.
