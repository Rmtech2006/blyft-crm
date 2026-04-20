# CRM Operations Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the remaining non-automation CRM polish: safer project lifecycle controls, faster project list actions, richer filtering, and expanded in-app guidance.

**Architecture:** Extend the existing projects Convex module with soft archive/restore mutations and an optional `archivedAt` field. Keep UI changes inside the existing projects and settings pages, reusing `EditProjectDialog`, shadcn primitives, and source tests.

**Tech Stack:** Next.js App Router, React, Convex, TypeScript, node:test source assertions, ESLint.

---

### Task 1: Source Tests

**Files:**
- Modify: `tests/crm-non-automation-ui-source.test.mjs`

- [ ] Add assertions for project archive/restore mutations, archived schema field, project list lifecycle filters, card edit/archive/delete actions, detail page destructive controls, and expanded CRM guide routines.
- [ ] Run `node tests\crm-non-automation-ui-source.test.mjs`.
- [ ] Confirm the new test fails before implementation.

### Task 2: Project Lifecycle Backend

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/projects.ts`

- [ ] Add `archivedAt: v.optional(v.number())` to the `projects` table.
- [ ] Add `archive` and `restore` project mutations.
- [ ] Include `archivedAt` in project list/get payloads through the existing spread behavior.

### Task 3: Project List Actions And Filters

**Files:**
- Modify: `src/app/(dashboard)/projects/page.tsx`

- [ ] Import `EditProjectDialog`, project lifecycle mutations, destructive dialog primitives, and action icons.
- [ ] Add lifecycle and deadline filters.
- [ ] Default list to active projects while allowing archived/all views.
- [ ] Add grid and board card action buttons for open, edit, archive/restore, and delete.
- [ ] Add a compact project health strip for overdue, due soon, archived, and missing deadline counts.

### Task 4: Project Detail Controls

**Files:**
- Modify: `src/app/(dashboard)/projects/[id]/page.tsx`

- [ ] Add archive, restore, and delete buttons beside edit.
- [ ] Use existing project mutations and navigate back to `/projects` after hard delete.
- [ ] Keep the existing Drive and milestone flows unchanged.

### Task 5: CRM Guide Expansion

**Files:**
- Modify: `src/components/settings/crm-guide.tsx`

- [ ] Add routine cards for daily start, daily close, weekly cleanup, project hygiene, finance hygiene, and automation readiness.
- [ ] Keep the existing searchable module guide.

### Task 6: Verification And Ship

**Files:**
- Check all modified files.

- [ ] Run `node tests\crm-non-automation-ui-source.test.mjs`.
- [ ] Run `node tests\crm-automation-source.test.mjs`.
- [ ] Run `npx convex codegen`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Commit, merge to main, push, deploy Convex, inspect Vercel production, and smoke-check live routes.
