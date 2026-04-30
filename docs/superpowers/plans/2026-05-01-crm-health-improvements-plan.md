# Blyft CRM — Health Improvements Execution Plan

> Execution approach: **superpowers:subagent-driven-development** (fresh subagent per task + two-stage review)
> Fallback: **superpowers:executing-plans** (inline, sequential)

## Goal
Fix all critical, high, and medium-priority issues found in the 2026-05-01 CRM audit:
unbounded queries, dead activity logging, hardcoded users, schema gaps, cron timing, and missing indexes.

## Architecture
- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, Radix UI
- **Backend**: Convex (serverless, real-time, TypeScript)
- **Auth**: NextAuth v5 + Convex JWT (`convex/auth.ts`)
- **Tests**: Node.js built-in test runner (`node --test tests/*.test.mjs`)

## Tech Stack notes
- Convex mutations use `ctx.db.patch` / `ctx.db.insert` / `ctx.db.replace`
- Convex indexes must be declared in `convex/schema.ts` then referenced in queries
- Schema changes do NOT require a migration unless existing data is incompatible
- Adding optional fields or new indexes is safe and backward-compatible
- After any `convex/schema.ts` change run `npm run convex:sync` to push schema

---

## File Map (what each phase touches)

| File | Phases |
|---|---|
| `convex/schema.ts` | 1, 2, 3 |
| `convex/crons.ts` | 1 |
| `convex/leads.ts` | 2, 4, 5 |
| `convex/projects.ts` | 3, 5 |
| `convex/clients.ts` | 5 |
| `convex/tasks.ts` | 5 |
| `convex/finance.ts` | 3 |
| `convex/reimbursements.ts` | 3 |
| `convex/automation.ts` | 4 |
| `convex/templates.ts` | 3 |
| `convex/team.ts` | 3 |
| `tests/crm-automation-source.test.mjs` | all (run after each phase) |

---

## Phase 1 — Zero-code / Config Fixes (2 tasks)

### Task 1.1 — Fix follow-up sweep cron to fire in the morning IST

**File**: `convex/crons.ts`

**Problem**: `"30 8 * * *"` (UTC) = 2:00 PM IST — follow-up nudges should arrive in the morning.

**Change**: Replace `"30 8 * * *"` with `"0 3 * * *"` (= 8:30 AM IST).

```ts
// BEFORE
crons.cron(
  "follow-up sweep",
  "30 8 * * *",
  internal.automation.runFollowUpSweep,
  {}
);

// AFTER
crons.cron(
  "follow-up sweep",
  "0 3 * * *",
  internal.automation.runFollowUpSweep,
  {}
);
```

**Verify**: Run `node --test tests/crm-automation-source.test.mjs` — all 6 tests must pass.

**Commit message**: `Fix follow-up sweep cron to fire at 8:30 AM IST instead of 2 PM IST`

---

### Task 1.2 — Run pending lead stage migration

**Command** (run in terminal, not in code):
```bash
npx convex run migrate:migrateLeadStages
```

**What it does**: Converts legacy `NEW_LEAD → LEAD_CAPTURED`, `CONTACTED → QUALIFICATION_SUBMITTED`,
`DISCOVERY → STRATEGY_CALL`, `NEGOTIATION → PROPOSAL_SENT`, `WON → PROPOSAL_ACCEPTED` in prod data.

**After migration succeeds**, remove the legacy literal values from `convex/schema.ts` `leads` table validator:

```ts
// REMOVE these 5 lines from the stage union in convex/schema.ts:
v.literal("NEW_LEAD"),
v.literal("CONTACTED"),
v.literal("DISCOVERY"),
v.literal("NEGOTIATION"),
v.literal("WON")
```

Also remove the comment block above them (lines 126–129).

**Verify**:
1. `npm run convex:sync` — no schema errors
2. `node --test tests/crm-automation-source.test.mjs` — all 6 pass

**Commit message**: `Remove legacy lead stages after migration`

---

## Phase 2 — Schema Additions (3 tasks)

All changes in this phase are **additive** (new optional fields or new indexes) — fully backward-compatible.

### Task 2.1 — Add `createdBy` field to `leadNotes`

**File**: `convex/schema.ts`

**Change**: Add `createdBy: v.optional(v.string())` to `leadNotes` table.

```ts
// BEFORE
leadNotes: defineTable({
  leadId: v.id("leads"),
  content: v.string(),
}).index("by_leadId", ["leadId"]),

// AFTER
leadNotes: defineTable({
  leadId: v.id("leads"),
  content: v.string(),
  createdBy: v.optional(v.string()),
}).index("by_leadId", ["leadId"]),
```

**File**: `convex/leads.ts` — update `addNote` mutation to accept and store `createdBy`:

```ts
// BEFORE
export const addNote = mutation({
  args: { leadId: v.id("leads"), content: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("leadNotes", { leadId: args.leadId, content: args.content });
  },
});

// AFTER
export const addNote = mutation({
  args: { leadId: v.id("leads"), content: v.string(), createdBy: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await ctx.db.insert("leadNotes", {
      leadId: args.leadId,
      content: args.content,
      createdBy: args.createdBy,
    });
  },
});
```

**File**: `src/app/(dashboard)/leads/[id]/page.tsx` — pass `createdBy` from session when calling `addNote`:

```ts
// Find the handleAddNote function and update the addNote call:
await addNote({
  leadId: id as Id<'leads'>,
  content: noteContent,
  createdBy: session?.user?.name ?? undefined,
})
```

**Verify**:
1. `npm run convex:sync` — no errors
2. `node --test tests/crm-automation-source.test.mjs` — all 6 pass

**Commit message**: `Add createdBy tracking to leadNotes`

---

### Task 2.2 — Add index to `activityLogs` for efficient time-based reads

**File**: `convex/schema.ts`

**Problem**: `activityLogs` has no index. Once it has data, `.order("desc").take(8)` scans the whole table.

**Change**: Add a `by_entity` index that supports filtering by entity type, and the default `_creationTime` ordering is sufficient for `.take()` without a custom index. However, add a compound index for future entity-specific filtering:

```ts
// BEFORE
activityLogs: defineTable({
  entity: v.string(),
  entityId: v.string(),
  action: v.string(),
  details: v.optional(v.string()),
  userId: v.optional(v.string()),
}),

// AFTER
activityLogs: defineTable({
  entity: v.string(),
  entityId: v.string(),
  action: v.string(),
  details: v.optional(v.string()),
  userId: v.optional(v.string()),
})
  .index("by_entity", ["entity"])
  .index("by_entityId", ["entityId"]),
```

**Verify**:
1. `npm run convex:sync` — no errors
2. `node --test tests/crm-automation-source.test.mjs` — all 6 pass

**Commit message**: `Add indexes to activityLogs table`

---

### Task 2.3 — Add date index to `pettyCash` and bound its list query

**File**: `convex/schema.ts`

```ts
// BEFORE
pettyCash: defineTable({
  description: v.string(),
  amount: v.number(),
  type: v.union(v.literal("IN"), v.literal("OUT")),
  date: v.number(),
  category: v.string(),
  addedBy: v.string(),
}),

// AFTER
pettyCash: defineTable({
  description: v.string(),
  amount: v.number(),
  type: v.union(v.literal("IN"), v.literal("OUT")),
  date: v.number(),
  category: v.string(),
  addedBy: v.string(),
}).index("by_date", ["date"]),
```

**File**: `convex/finance.ts` — update `listPettyCash` to use bounded take:

```ts
// BEFORE
export const listPettyCash = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("pettyCash").order("desc").collect();
    return entries.map((e) => ({ ...e, id: e._id }));
  },
});

// AFTER
export const listPettyCash = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("pettyCash").order("desc").take(200);
    return entries.map((e) => ({ ...e, id: e._id }));
  },
});
```

**Verify**:
1. `npm run convex:sync` — no errors
2. `node --test tests/crm-automation-source.test.mjs` — all 6 pass

**Commit message**: `Add date index to pettyCash and bound listPettyCash query`

---

## Phase 3 — Fix Unbounded Queries (7 tasks)

This is the most important phase. Each task targets one Convex file with `.collect()` anti-patterns.

### Task 3.1 — Fix `finance.listTransactions` (unbounded + in-memory filter)

**File**: `convex/finance.ts`

**Problem**: `listTransactions` calls `.collect()` on ALL transactions then does in-memory type/date filtering.

**Fix**: Use `.withIndex("by_type_and_date")` for type+date filtering, fall back to `by_date` for date-only, and `by_type` for type-only. Bound with `.take(500)`.

```ts
// REPLACE the entire listTransactions handler:
export const listTransactions = query({
  args: {
    type: v.optional(v.union(v.literal("INCOME"), v.literal("EXPENSE"))),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let transactions;

    if (args.type && args.dateFrom) {
      transactions = await ctx.db
        .query("transactions")
        .withIndex("by_type_and_date", (q) => {
          const base = q.eq("type", args.type!);
          return args.dateTo
            ? base.gte("date", args.dateFrom!).lte("date", args.dateTo)
            : base.gte("date", args.dateFrom!);
        })
        .order("desc")
        .take(500);
    } else if (args.type) {
      transactions = await ctx.db
        .query("transactions")
        .withIndex("by_type", (q) => q.eq("type", args.type!))
        .order("desc")
        .take(500);
    } else if (args.dateFrom) {
      transactions = await ctx.db
        .query("transactions")
        .withIndex("by_date", (q) =>
          args.dateTo
            ? q.gte("date", args.dateFrom!).lte("date", args.dateTo)
            : q.gte("date", args.dateFrom!)
        )
        .order("desc")
        .take(500);
    } else {
      transactions = await ctx.db
        .query("transactions")
        .withIndex("by_date")
        .order("desc")
        .take(500);
    }

    return await Promise.all(
      transactions.map(async (t) => {
        const client = t.clientId ? await ctx.db.get(t.clientId) : null;
        const project = t.projectId ? await ctx.db.get(t.projectId) : null;
        const bankAccount = t.bankAccountId ? await ctx.db.get(t.bankAccountId) : null;
        return {
          ...t,
          id: t._id,
          client: client ? { id: client._id, companyName: client.companyName } : null,
          project: project ? { id: project._id, name: project.name } : null,
          bankAccount: bankAccount ? { id: bankAccount._id, name: bankAccount.name } : null,
        };
      })
    );
  },
});
```

**Verify**:
1. `npm run convex:sync`
2. `node --test tests/crm-automation-source.test.mjs` — all 6 pass
3. Visually confirm the Finance page still loads and shows transactions

**Commit message**: `Fix listTransactions to use indexes instead of unbounded collect`

---

### Task 3.2 — Fix `finance.getSummary` (full collect + 6-pass in-memory filter)

**File**: `convex/finance.ts`

**Problem**: `getSummary` calls `.collect()` on ALL transactions then runs 6 separate `.filter()` passes over the full array.

**Fix**: Use `by_type_and_date` index to fetch only the date window needed, then do a single pass.

```ts
// REPLACE the entire getSummary handler body:
export const getSummary = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
    const endOfToday = Date.now();

    const [incomeTransactions, expenseTransactions] = await Promise.all([
      ctx.db
        .query("transactions")
        .withIndex("by_type_and_date", (q) =>
          q.eq("type", "INCOME").gte("date", startOfYear)
        )
        .take(2000),
      ctx.db
        .query("transactions")
        .withIndex("by_type_and_date", (q) =>
          q.eq("type", "EXPENSE").gte("date", startOfYear)
        )
        .take(2000),
    ]);

    const monthIncome = incomeTransactions
      .filter((t) => isOperatingIncome(t) && t.date >= startOfMonth)
      .reduce((s, t) => s + t.amount, 0);
    const monthNonOperatingIncome = incomeTransactions
      .filter((t) => isNonOperatingIncome(t) && t.date >= startOfMonth)
      .reduce((s, t) => s + t.amount, 0);
    const monthExpense = expenseTransactions
      .filter((t) => t.date >= startOfMonth)
      .reduce((s, t) => s + t.amount, 0);
    const ytdIncome = incomeTransactions
      .filter((t) => isOperatingIncome(t))
      .reduce((s, t) => s + t.amount, 0);
    const ytdNonOperatingIncome = incomeTransactions
      .filter((t) => isNonOperatingIncome(t))
      .reduce((s, t) => s + t.amount, 0);
    const ytdExpense = expenseTransactions.reduce((s, t) => s + t.amount, 0);

    const monthlyRevenue: { month: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = d.getTime();
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();
      const label = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
      const income = incomeTransactions
        .filter((t) => isOperatingIncome(t) && t.date >= start && t.date <= end)
        .reduce((s, t) => s + t.amount, 0);
      const expense = expenseTransactions
        .filter((t) => t.date >= start && t.date <= end)
        .reduce((s, t) => s + t.amount, 0);
      monthlyRevenue.push({ month: label, income, expense });
    }

    return { monthIncome, monthNonOperatingIncome, monthExpense, ytdIncome, ytdNonOperatingIncome, ytdExpense, monthlyRevenue };
  },
});
```

**Verify**:
1. `npm run convex:sync`
2. `node --test tests/crm-automation-source.test.mjs`
3. Finance summary cards on Finance page still display correct totals

**Commit message**: `Fix getSummary to use indexed YTD window instead of full table collect`

---

### Task 3.3 — Fix `finance.getOutstanding` (uses `.filter()` violating Convex guidelines)

**File**: `convex/finance.ts`

**Problem**: Uses `ctx.db.query("clients").filter(...)` which Convex guidelines forbid — use `withIndex` instead.

**Fix**: Use `by_status` index on clients, and `by_clientId` + `by_type_and_date` indexes on transactions:

```ts
// REPLACE getOutstanding handler:
export const getOutstanding = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

    const activeClients = await ctx.db
      .query("clients")
      .withIndex("by_status", (q) => q.eq("status", "ACTIVE"))
      .take(250);

    const retainerClients = activeClients.filter((c) => c.retainerAmount && c.retainerAmount > 0);

    return await Promise.all(
      retainerClients.map(async (c) => {
        const clientTransactions = await ctx.db
          .query("transactions")
          .withIndex("by_clientId", (q) => q.eq("clientId", c._id))
          .take(500);
        const incomeTransactions = clientTransactions.filter((t) => t.type === "INCOME");
        const receivedThisMonth = incomeTransactions
          .filter((t) => t.date >= startOfMonth)
          .reduce((s, t) => s + t.amount, 0);
        const totalReceived = incomeTransactions.reduce((s, t) => s + t.amount, 0);
        const outstanding = Math.max(0, (c.retainerAmount ?? 0) - receivedThisMonth);
        const lastPayment = [...incomeTransactions].sort((a, b) => b.date - a.date)[0];
        const daysSincePayment = lastPayment
          ? Math.floor((now - lastPayment.date) / (1000 * 60 * 60 * 24))
          : null;
        return {
          id: c._id,
          companyName: c.companyName,
          retainerAmount: c.retainerAmount ?? 0,
          receivedThisMonth,
          outstanding,
          totalReceived,
          daysSincePayment,
          lastPaymentDate: lastPayment?.date ?? null,
        };
      })
    ).then((results) => results.filter((c) => c.outstanding > 0));
  },
});
```

**Verify**:
1. `npm run convex:sync`
2. `node --test tests/crm-automation-source.test.mjs`
3. Finance > Outstanding Payments still renders correctly

**Commit message**: `Fix getOutstanding to use withIndex instead of forbidden filter()`

---

### Task 3.4 — Fix `leads.list` unbounded collect

**File**: `convex/leads.ts`

**Problem**: `list` calls `.collect()` on ALL leads. With hundreds of leads this hits read limits.

**Fix**: Change to `.take(500)` — sufficient for a real agency CRM. Pagination can be added later as a feature.

```ts
// BEFORE (line 63)
const leads = await ctx.db.query("leads").order("desc").collect();

// AFTER
const leads = await ctx.db.query("leads").order("desc").take(500);
```

**Also fix** the `remove` mutation's unbounded collects on `leadNotes` and `leadCallLogs`:

```ts
// convex/leads.ts — remove mutation
// BEFORE
const notes = await ctx.db.query("leadNotes").withIndex("by_leadId", (q) => q.eq("leadId", args.id)).collect();
const calls = await ctx.db.query("leadCallLogs").withIndex("by_leadId", (q) => q.eq("leadId", args.id)).collect();

// AFTER — these are child rows of one lead, bounded by definition
const notes = await ctx.db.query("leadNotes").withIndex("by_leadId", (q) => q.eq("leadId", args.id)).take(200);
const calls = await ctx.db.query("leadCallLogs").withIndex("by_leadId", (q) => q.eq("leadId", args.id)).take(200);
```

**Also fix** `get` query's notes and callLogs collects (same pattern, lines 79–87):

```ts
const notes = await ctx.db
  .query("leadNotes")
  .withIndex("by_leadId", (q) => q.eq("leadId", args.id))
  .order("desc")
  .take(100);
const callLogs = await ctx.db
  .query("leadCallLogs")
  .withIndex("by_leadId", (q) => q.eq("leadId", args.id))
  .order("desc")
  .take(100);
```

**Verify**:
1. `npm run convex:sync`
2. `node --test tests/crm-automation-source.test.mjs`
3. Leads list page loads, lead detail page loads

**Commit message**: `Bound leads list and child queries with take() instead of collect()`

---

### Task 3.5 — Fix `projects.list` N+1 + unbounded collect

**File**: `convex/projects.ts`

**Problem**: `list` collects ALL projects then for each project does separate `.collect()` for tasks (N+1 pattern).

**Fix**: Bound the top-level query, keep per-project fetches but with `take` instead of `collect`. The per-project task count fetch is justified since it's one `take(200)` per project — acceptable for <100 projects.

```ts
// BEFORE (line 7)
const projects = await ctx.db.query("projects").order("desc").collect();
return await Promise.all(
  projects.map(async (project) => {
    const client = await ctx.db.get(project.clientId);
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_projectId", (q) => q.eq("projectId", project._id))
      .collect();
    return { ...project, id: project._id, client: ..., taskCount: tasks.length };
  })
);

// AFTER
const projects = await ctx.db.query("projects").order("desc").take(300);
return await Promise.all(
  projects.map(async (project) => {
    const client = await ctx.db.get(project.clientId);
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_projectId", (q) => q.eq("projectId", project._id))
      .take(200);
    return {
      ...project,
      id: project._id,
      client: client
        ? { id: client._id, companyName: client.companyName }
        : { id: "", companyName: "Unknown" },
      taskCount: tasks.length,
    };
  })
);
```

**Also fix** `projects.get` child queries (lines 35, 39, 49 — milestones, ptms, tasks):

```ts
// All three: replace .collect() with .take(200)
const milestones = await ctx.db.query("milestones").withIndex("by_projectId", ...).take(100);
const ptms = await ctx.db.query("projectTeamMembers").withIndex("by_projectId", ...).take(50);
const tasks = await ctx.db.query("tasks").withIndex("by_projectId", ...).take(200);
```

**Verify**:
1. `npm run convex:sync`
2. `node --test tests/crm-automation-source.test.mjs`
3. Projects list page loads, project detail page loads

**Commit message**: `Bound projects queries with take() and fix N+1 task collect`

---

### Task 3.6 — Fix `reimbursements.list`, `templates.list`, `team.list`

**File**: `convex/reimbursements.ts` line 13:
```ts
// BEFORE
const items = await ctx.db.query("reimbursements").order("desc").collect();
// AFTER
const items = await ctx.db.query("reimbursements").order("desc").take(300);
```

**File**: `convex/templates.ts` line 12:
```ts
// BEFORE
const templates = await ctx.db.query("messageTemplates").order("desc").collect();
// AFTER
const templates = await ctx.db.query("messageTemplates").order("desc").take(200);
```
Also fix `templates.ts` line 74 and 105 `.collect()` → `.take(50)` (templateVersions per template — bounded).

**File**: `convex/team.ts` line 12:
```ts
// BEFORE
const members = await ctx.db.query("teamMembers").order("desc").collect();
// AFTER
const members = await ctx.db.query("teamMembers").order("desc").take(200);
```
Also fix `team.ts` lines 21, 50, 62 `.collect()` → `.take(200)`.
Fix `team.ts` line 181 `.collect()` → `.take(50)` (projectTeamMembers per member).
Fix `team.ts` line 185 `.collect()` → `.take(50)`.

**Verify**:
1. `npm run convex:sync`
2. `node --test tests/crm-automation-source.test.mjs`
3. Team, Templates, Reimbursements pages still load correctly

**Commit message**: `Bound reimbursements, templates, and team list queries`

---

### Task 3.7 — Fix `automation.loadDueProjectDeadlines` unbounded collect

**File**: `convex/automation.ts` line 130:

**Problem**: `const projects = await ctx.db.query("projects").collect()` loads ALL projects to then filter by deadline in memory.

**Fix**: Use `by_status_and_deadline` index to fetch only non-completed projects with upcoming deadlines:

```ts
async function loadDueProjectDeadlines(ctx: ReadCtx, now: number) {
  const dueBefore = now + 7 * DAY_MS;
  const ACTIVE_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "IN_REVIEW"] as const;

  const batches = await Promise.all(
    ACTIVE_STATUSES.map((status) =>
      ctx.db
        .query("projects")
        .withIndex("by_status_and_deadline", (q) =>
          q.eq("status", status).gte("deadline", now).lte("deadline", dueBefore)
        )
        .take(30)
    )
  );

  const dueProjects = batches
    .flat()
    .filter((p) => !p.archivedAt)
    .sort((a, b) => (a.deadline ?? 0) - (b.deadline ?? 0))
    .slice(0, 20);

  return await Promise.all(
    dueProjects.map(async (project) => {
      const client = await ctx.db.get(project.clientId);
      return formatProject(project, client);
    })
  );
}
```

Remove the now-unused import of `getDueProjectDeadlines` from `crm-automation-rules.mjs` if it's only used here.

**Verify**:
1. `npm run convex:sync`
2. `node --test tests/crm-automation-source.test.mjs` — all 6 pass
3. Check test line 19: `assert.match(automation, /dueProjectDeadlines/)` — still passes

**Commit message**: `Fix loadDueProjectDeadlines to use status+deadline index instead of full collect`

---

## Phase 4 — Wire Activity Logging (3 tasks)

### Task 4.1 — Add `logActivity` helper to Convex and wire into leads mutations

**File**: `convex/leads.ts`

Add a local helper at the top of the file (after the imports):

```ts
async function logActivity(
  ctx: MutationCtx,
  entity: string,
  entityId: string,
  action: string,
  details?: string,
  userId?: string
) {
  await ctx.db.insert("activityLogs", { entity, entityId, action, details, userId });
}
```

Wire into `create` mutation (after `ctx.db.insert("leads", ...)`):

```ts
await logActivity(ctx, "lead", leadId, "CREATE", args.name, args.ownerId);
```

Wire into `update` mutation (after `ctx.db.patch(id, patch)`):

```ts
await logActivity(ctx, "lead", id, "UPDATE", args.name ?? existing.name, existing.ownerId);
```

Wire into `remove` mutation (before deleting the lead, capture name first):

```ts
const leadToDelete = await ctx.db.get(args.id);
// ... existing delete logic ...
await logActivity(ctx, "lead", args.id, "DELETE", leadToDelete?.name);
```

Wire into `convertToClient` mutation (after patching the lead):

```ts
await logActivity(ctx, "lead", args.id, "CONVERT", `Converted to client ${clientId}`, lead.ownerId);
```

**Verify**:
1. `npm run convex:sync`
2. `node --test tests/crm-automation-source.test.mjs` — all 6 pass
3. Create a lead in the UI → Activity Log card on dashboard should show an entry

**Commit message**: `Wire activity logging into leads mutations`

---

### Task 4.2 — Wire activity logging into projects mutations

**File**: `convex/projects.ts`

Import `MutationCtx` and add the same `logActivity` helper. Wire into:

- `create` mutation: `await logActivity(ctx, "project", projectId, "CREATE", args.name);`
- `update` mutation: `await logActivity(ctx, "project", args.id, "UPDATE", existing?.name);`
- `archive` / `unarchive` mutations: `await logActivity(ctx, "project", args.id, "UPDATE", "Archived");`

**Verify**:
1. `npm run convex:sync`
2. `node --test tests/crm-automation-source.test.mjs`
3. Create a project → Activity Log on dashboard shows entry

**Commit message**: `Wire activity logging into projects mutations`

---

### Task 4.3 — Wire activity logging into clients mutations

**File**: `convex/clients.ts`

Add `logActivity` helper (same pattern as above). Wire into:

- `create` mutation: `await logActivity(ctx, "client", clientId, "CREATE", args.companyName);`
- `update` mutation: `await logActivity(ctx, "client", args.id, "UPDATE", existing?.companyName);`

**Verify**:
1. `npm run convex:sync`
2. `node --test tests/crm-automation-source.test.mjs`
3. Create/edit a client → Activity Log on dashboard shows entry with correct entity label

**Commit message**: `Wire activity logging into clients mutations`

---

## Phase 5 — Hardcoded User Fixes (2 tasks)

### Task 5.1 — Replace hardcoded `USERS` map in `leads.ts` with dynamic lookup

**File**: `convex/leads.ts`

**Problem**: `const USERS = { ritish: {...}, eshaan: {...} }` — adding team members requires a code deploy.

**Fix**: Look up the owner name from `teamMembers` table using `ownerId` as a match on `fullName` (since the current system uses string IDs not foreign keys to teamMembers). Keep the fallback for backward compat.

Replace the `USERS` constant and its usages in `list` and `get`:

```ts
// Remove the USERS constant entirely.

// In list query — replace owner mapping:
const members = await ctx.db.query("teamMembers").order("desc").take(100);
const memberMap = new Map(members.map((m) => [m._id as string, { id: m._id, name: m.fullName }]));

const leads = await ctx.db.query("leads").order("desc").take(500);
return leads.map((lead) => ({
  ...lead,
  id: lead._id,
  owner: lead.ownerId ? (memberMap.get(lead.ownerId) ?? { id: lead.ownerId, name: lead.ownerId }) : null,
}));
```

```ts
// In get query — same approach:
const members = await ctx.db.query("teamMembers").order("desc").take(100);
const memberMap = new Map(members.map((m) => [m._id as string, { id: m._id, name: m.fullName }]));
// ... rest of get handler
return {
  ...lead,
  id: lead._id,
  owner: lead.ownerId ? (memberMap.get(lead.ownerId) ?? { id: lead.ownerId, name: lead.ownerId }) : null,
  // ...
};
```

**Verify**:
1. `npm run convex:sync`
2. `node --test tests/crm-automation-source.test.mjs`
3. Lead detail page still shows owner name

**Commit message**: `Replace hardcoded USERS map with dynamic teamMembers lookup in leads`

---

### Task 5.2 — Fix hardcoded `userId: "ritish"` in project deadline notifications

**File**: `convex/automation.ts`

**Problem**: `runProjectDeadlineSweep` hardcodes `userId: "ritish"` — only one person ever gets project deadline notifications.

**Fix**: Notify `DIGEST_USER_IDS` (already defined at the top of the file as `["ritish", "eshaan"]`) instead of a single hardcoded string. This is the same approach used by `runMorningDigest` and `runEveningSummary`:

```ts
// BEFORE (in runProjectDeadlineSweep)
for (const project of dueProjectDeadlines.slice(0, 25)) {
  await upsertNotification(ctx, {
    userId: "ritish",
    // ...
    dedupeKey: `project-deadline:${day}:${project.id}`,
    createdForDay: day,
  });
}

// AFTER
for (const project of dueProjectDeadlines.slice(0, 25)) {
  for (const userId of DIGEST_USER_IDS) {
    await upsertNotification(ctx, {
      userId,
      title: "Project deadline due soon",
      message: `${project.name}${project.client ? ` for ${project.client.companyName}` : ""} is due by ${new Date(project.deadline ?? now).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}.`,
      type: "PROJECT_DEADLINE_DUE",
      link: project.link,
      dedupeKey: `project-deadline:${day}:${project.id}:${userId}`,
      createdForDay: day,
    });
  }
}
```

**Verify**:
1. `npm run convex:sync`
2. `node --test tests/crm-automation-source.test.mjs` — all 6 pass

**Commit message**: `Send project deadline notifications to all digest users, not just ritish`

---

## Final Verification (after all phases)

Run the full test suite:
```bash
node --test tests/crm-automation-source.test.mjs
```
Expected: 6 pass, 0 fail.

Add a source-level test for activity logging being wired:
```js
test("activity logging is wired into lead and client mutations", () => {
  const leads = read("convex/leads.ts");
  const clients = read("convex/clients.ts");
  const projects = read("convex/projects.ts");

  assert.match(leads, /activityLogs/);
  assert.match(clients, /activityLogs/);
  assert.match(projects, /activityLogs/);
});
```

Run `npm run lint` — no new errors.

---

## Execution Order Summary

| # | Task | Phase | Effort | Risk |
|---|---|---|---|---|
| 1 | Fix follow-up sweep cron timing | 1 | 1 line | None |
| 2 | Run lead stage migration + remove legacy literals | 1 | CLI + schema | Low |
| 3 | Add `createdBy` to leadNotes | 2 | Schema + 2 files | None |
| 4 | Add indexes to activityLogs | 2 | Schema only | None |
| 5 | Add date index + bound pettyCash | 2 | Schema + 1 query | None |
| 6 | Fix `listTransactions` | 3 | Medium | Medium |
| 7 | Fix `getSummary` | 3 | Medium | Medium |
| 8 | Fix `getOutstanding` | 3 | Medium | Medium |
| 9 | Fix `leads.list` + child queries | 3 | Small | Low |
| 10 | Fix `projects.list` N+1 | 3 | Small | Low |
| 11 | Fix `reimbursements`, `templates`, `team` | 3 | Small | None |
| 12 | Fix `loadDueProjectDeadlines` | 3 | Small | Low |
| 13 | Wire activity logging — leads | 4 | Small | None |
| 14 | Wire activity logging — projects | 4 | Small | None |
| 15 | Wire activity logging — clients | 4 | Small | None |
| 16 | Replace hardcoded USERS map | 5 | Small | Low |
| 17 | Fix hardcoded userId in deadline sweep | 5 | Small | None |

**Total: 17 tasks across 5 phases. Each task is independently deployable.**
