# Task Mission Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Tasks page as a premium internal mission-control workflow while preserving existing task behavior.

**Architecture:** Keep the implementation scoped to the existing client page. Add local typed helpers for task metadata, date logic, filtering, and visual status/priority styling, then compose the page from focused local components.

**Tech Stack:** Next.js App Router, React client component, Convex hooks, existing shadcn-style UI components, lucide-react icons, Tailwind CSS.

---

## File Structure

- Modify: `src/app/(dashboard)/tasks/page.tsx`
  - Owns data fetching, filters, export handlers, delete confirmation, status update mutation, and page composition.
  - Adds local helper components for the hero metrics, command strip, board lanes, task cards, list table, and empty states.
- Create: no production files.
- Test: no new automated test file; verify with ESLint, TypeScript, and Next production build.

### Task 1: Normalize Task Types And Derived State

**Files:**
- Modify: `src/app/(dashboard)/tasks/page.tsx`

- [ ] **Step 1: Add local task types and metadata maps**

Add `TaskPriority`, `TaskStatus`, and `TaskItem` types near the top of the file. Replace loose string maps with typed `statusMeta` and `priorityMeta` records.

```tsx
const statusColumns = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'] as const
type TaskStatus = typeof statusColumns[number]
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

type TaskItem = {
  id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  dueDate?: number | null
  assignee?: { name: string } | null
  project?: { name: string } | null
}
```

- [ ] **Step 2: Add helper functions**

Add `formatDate`, `isOverdue`, and `isDueSoon` helpers. Use `-` for export/table fallback text.

```tsx
function formatDate(value?: number | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return 'No due date'
  return new Date(value).toLocaleDateString('en-IN', options ?? {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
```

- [ ] **Step 3: Memoize task records and filtered results**

Use `useMemo` for `taskRecords` and `filtered` so React hook dependencies stay stable and lint stays clean.

```tsx
const taskRecords = useMemo(() => (tasks ?? []) as TaskItem[], [tasks])
const filtered = useMemo(() => {
  const query = search.trim().toLowerCase()
  return taskRecords.filter((task) => {
    const matchPriority = priorityFilter === 'ALL' || task.priority === priorityFilter
    const matchSearch =
      !query ||
      task.title.toLowerCase().includes(query) ||
      (task.assignee?.name ?? '').toLowerCase().includes(query) ||
      (task.project?.name ?? '').toLowerCase().includes(query)
    return matchPriority && matchSearch
  })
}, [priorityFilter, search, taskRecords])
```

### Task 2: Build The Mission Control Header

**Files:**
- Modify: `src/app/(dashboard)/tasks/page.tsx`

- [ ] **Step 1: Replace the plain page title**

Create a dark header section with label, title, concise internal copy, `ExportMenu`, `AddTaskDialog`, and four metric panels.

```tsx
<section className="overflow-hidden rounded-lg border border-neutral-950/15 bg-neutral-950 text-white">
  <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_auto]">
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/60">
        Operations desk
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-normal text-white sm:text-4xl">
        Task Mission Control
      </h1>
    </div>
    <div className="flex flex-col gap-3 sm:flex-row xl:justify-end">
      <ExportMenu onCsv={handleCsvExport} onPdf={handlePdfExport} />
      <AddTaskDialog />
    </div>
  </div>
</section>
```

- [ ] **Step 2: Add command summary cards**

Create reusable `HeroMetric` and `CommandCard` components. Show open, blocked, overdue, due soon, completed, and unassigned counts without adding new backend data.

### Task 3: Rebuild Board-First Workflow

**Files:**
- Modify: `src/app/(dashboard)/tasks/page.tsx`

- [ ] **Step 1: Upgrade the control bar**

Move search, priority filter, and filtered count into a single glassy control surface beneath the command strip.

- [ ] **Step 2: Replace old lane UI**

Keep `statusColumns`, but render each lane as a premium panel with a count badge and empty lane state.

- [ ] **Step 3: Replace old task cards**

Create `MissionTaskCard` with title link, priority badge, project, assignee, due date, status signals, and stable delete action.

### Task 4: Upgrade List View And Exports

**Files:**
- Modify: `src/app/(dashboard)/tasks/page.tsx`

- [ ] **Step 1: Keep list view behavior**

Keep status update selects, detail links, and delete buttons. Restyle the table card so it visually belongs to Mission Control.

- [ ] **Step 2: Clean export text**

Use `-` instead of corrupted dash artifacts in CSV and PDF fallbacks.

### Task 5: Verify And Commit

**Files:**
- Modify: `src/app/(dashboard)/tasks/page.tsx`
- Modify: `docs/superpowers/specs/2026-04-18-task-mission-control-design.md`
- Modify: `docs/superpowers/plans/2026-04-18-task-mission-control.md`

- [ ] **Step 1: Run lint**

Run:

```powershell
npm run lint -- "src/app/(dashboard)/tasks/page.tsx"
```

Expected: exits `0`.

- [ ] **Step 2: Run TypeScript**

Run:

```powershell
npx tsc --noEmit
```

Expected: exits `0`.

- [ ] **Step 3: Run production build**

Run the same production build command used for recent deploy verification with env loaded from the root `.env.local`.

Expected: Next build exits `0`.

- [ ] **Step 4: Commit and push**

Commit message:

```powershell
git commit -m "style: refresh tasks mission control"
```

Push:

```powershell
git push origin HEAD:main
```

- [ ] **Step 5: Confirm Vercel**

Check the production deployment for the commit, then fetch `/tasks` and confirm it returns `200` through the expected login gate.

## Self-Review

- Spec coverage: the plan covers mission header, command metrics, board workflow, list view, exports, and verification.
- Placeholder scan: no TBD/TODO placeholders remain.
- Type consistency: `TaskStatus`, `TaskPriority`, and `TaskItem` are defined before use.
