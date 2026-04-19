# Freelancer Opportunity Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the public freelancer link into a BLYFT opportunity page with expanded technical categories, multiple labeled links, approval-only CRM save behavior, and guarded Team profile delete/archive.

**Architecture:** Keep the existing Convex-backed application flow. Add `workLinks` and `bestFitWorkType` to freelancer applications and Team members, normalize link rows through a small shared helper, expand skill presets, then render the richer data on the public form, approval queue, and Team detail surfaces. Reuse the existing `team.remove` mutation as a guarded delete/archive endpoint so current callers get safer behavior.

**Tech Stack:** Next.js App Router, React client components, Convex schema/mutations, Zod, react-hook-form, shadcn-style UI primitives, Node `node:test` for helper coverage.

---

### Task 1: Link Normalization Helper

**Files:**
- Create: `src/lib/freelancer-links.mjs`
- Create: `src/lib/freelancer-links.d.ts`
- Create: `src/lib/freelancer-links.test.mjs`

- [ ] **Step 1: Write the failing helper test**

Create `src/lib/freelancer-links.test.mjs`:

```js
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizeWorkLinkRows } from './freelancer-links.mjs'

describe('normalizeWorkLinkRows', () => {
  it('normalizes labels and bare URLs while dropping empty rows', () => {
    assert.deepEqual(
      normalizeWorkLinkRows([
        { label: ' Portfolio ', url: 'example.com/me ' },
        { label: '', url: 'https://github.com/blyft' },
        { label: '', url: '' },
      ]),
      [
        { label: 'Portfolio', url: 'https://example.com/me' },
        { label: 'Work link', url: 'https://github.com/blyft' },
      ]
    )
  })

  it('reports rows with labels but no URLs', () => {
    assert.throws(
      () => normalizeWorkLinkRows([{ label: 'GitHub', url: '' }]),
      /Add a URL for GitHub/
    )
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test src/lib/freelancer-links.test.mjs`

Expected: FAIL because `src/lib/freelancer-links.mjs` does not exist yet.

- [ ] **Step 3: Add the helper**

Create `src/lib/freelancer-links.mjs`:

```js
export function normalizeUrl(value) {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export function normalizeWorkLinkRows(rows) {
  return rows
    .map((row) => {
      const label = row.label?.trim() || ''
      const url = normalizeUrl(row.url)

      if (!label && !url) return null
      if (label && !url) throw new Error(`Add a URL for ${label}`)

      return {
        label: label || 'Work link',
        url,
      }
    })
    .filter(Boolean)
}
```

- [ ] **Step 4: Run the helper test**

Run: `node --test src/lib/freelancer-links.test.mjs`

Expected: PASS.

### Task 2: Backend Schema And Mutations

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/freelancerApplications.ts`
- Modify: `convex/team.ts`

- [ ] **Step 1: Add structured fields to schema**

Add `workLinks` and `bestFitWorkType` to both `teamMembers` and `freelancerApplications`:

```ts
workLinks: v.optional(v.array(v.object({
  label: v.string(),
  url: v.string(),
}))),
bestFitWorkType: v.optional(v.string()),
```

- [ ] **Step 2: Add backend validators and cleaners**

In `convex/freelancerApplications.ts`, add:

```ts
const workLinkValidator = v.object({
  label: v.string(),
  url: v.string(),
});

function cleanWorkLinks(links?: Array<{ label: string; url: string }>) {
  return (links ?? [])
    .map((link) => ({
      label: link.label.trim() || "Work link",
      url: link.url.trim(),
    }))
    .filter((link) => link.url);
}
```

- [ ] **Step 3: Store and approve richer application data**

Update `create.args` to accept `workLinks` and `bestFitWorkType`, store cleaned values, and update `approve` to copy them into `teamMembers`.

- [ ] **Step 4: Make Team create/update/read support new fields**

Update `convex/team.ts` create/update args and inserts/patches to accept `workLinks` and `bestFitWorkType`. The `list` and `get` queries already spread member fields, so no query rewrite is needed.

- [ ] **Step 5: Guard profile removal**

Change `team.remove` so it checks `projectTeamMembers` and `reimbursements`. If no linked records exist, delete the member. If linked records exist, patch `status: "OFFBOARDED"` and leave historical references intact.

Expected behavior:

```ts
if (ptms.length === 0 && reimbursements.length === 0) {
  await ctx.db.delete(args.id)
  return { mode: "deleted" as const }
}

await ctx.db.patch(args.id, { status: "OFFBOARDED" })
return { mode: "offboarded" as const }
```

### Task 3: Public Freelancer Page

**Files:**
- Modify: `src/lib/freelancer-skills.ts`
- Modify: `src/app/freelancer/page.tsx`

- [ ] **Step 1: Expand skill presets**

Replace the old `Development` bucket with the full category list from the spec: Website Development, App Development, Full-Stack Development, Custom SaaS Development, AI Automations, API Integrations, No-Code / Low-Code Automations, UI / Web Design, plus the existing creative/marketing categories.

- [ ] **Step 2: Remove public `BLYFT CRM` text**

Update visible copy in `src/app/freelancer/page.tsx` so public text uses `BLYFT`, `BLYFT team`, `our team`, or `our clients`, and never `BLYFT CRM`.

- [ ] **Step 3: Add opportunity-led content**

Update the left-side public panel with copy around working on client projects, earning, learning, and growing with BLYFT. Keep the page concise and avoid turning it into a full microsite.

- [ ] **Step 4: Add work link state and inputs**

Add a work links state:

```ts
type WorkLinkRow = { label: string; url: string }
const [workLinks, setWorkLinks] = useState<WorkLinkRow[]>([
  { label: 'Portfolio', url: '' },
  { label: 'LinkedIn', url: '' },
])
const [linkError, setLinkError] = useState<string | null>(null)
```

Render rows with label input, URL input, remove button, and an `Add link` button.

- [ ] **Step 5: Submit normalized work links**

Use `normalizeWorkLinkRows(workLinks)` before calling `createApplication`. Send `workLinks` plus `bestFitWorkType`, and keep filling legacy `portfolioUrl`, `behanceUrl`, and `linkedinUrl` from matching labels where possible.

### Task 4: Team Review, Detail, And Delete UI

**Files:**
- Modify: `src/app/(dashboard)/team/page.tsx`
- Modify: `src/app/(dashboard)/team/[id]/page.tsx`
- Modify: `src/components/team/add-member-dialog.tsx`
- Modify: `src/components/team/edit-member-dialog.tsx`

- [ ] **Step 1: Show all submitted links in approval cards**

Extend `FreelancerApplication` and `TeamMember` types with:

```ts
workLinks?: Array<{ label: string; url: string }> | null
bestFitWorkType?: string | null
```

Render `workLinks` first and fall back to legacy single-link fields.

- [ ] **Step 2: Show best-fit work type**

Add `bestFitWorkType` to the mini stats on pending application cards and Team profile detail.

- [ ] **Step 3: Show all profile links on detail pages**

Update the Profile Links card on `[id]/page.tsx` to render `workLinks` and fall back to legacy Portfolio/Behance/LinkedIn rows.

- [ ] **Step 4: Add delete profile action**

Add a confirmation-backed delete button to the Team detail page. Call `api.team.remove`. Show `Profile deleted` when the mutation returns `{ mode: "deleted" }`, route back to `/team`, and show `Profile offboarded to preserve history` when it returns `{ mode: "offboarded" }`.

- [ ] **Step 5: Preserve links in manual add/edit**

Keep the existing manual add/edit forms functional. If a user fills Portfolio/Behance/LinkedIn, send matching `workLinks` rows alongside the legacy fields.

### Task 5: Verification

**Files:**
- Generated: `convex/_generated/**`

- [ ] **Step 1: Run helper tests**

Run: `node --test src/lib/freelancer-links.test.mjs`

Expected: PASS.

- [ ] **Step 2: Regenerate Convex types**

Run: `npx convex codegen`

Expected: generated API/types include the updated schema and mutation args.

- [ ] **Step 3: Run lint**

Run: `npm run lint`

Expected: no new lint errors.

- [ ] **Step 4: Run build**

Run: `npm run build`

Expected: production build exits 0.

- [ ] **Step 5: Manual/source checks**

Run: `rg -n "BLYFT CRM" src/app/freelancer`

Expected: no matches.

Run: `rg -n "workLinks|bestFitWorkType|Add link|Delete profile" src convex`

Expected: matches in public form, backend, Team review/detail, and delete UI.
