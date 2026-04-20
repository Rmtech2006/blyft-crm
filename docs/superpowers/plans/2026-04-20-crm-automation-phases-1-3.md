# CRM Automation Phases 1-3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build zero-cost CRM automations for daily focus, lead follow-up, and WhatsApp-ready response helpers.

**Architecture:** Keep automation decisions in pure, testable TypeScript helpers under `src/lib`, then wire those rules into Convex internal mutations and cron jobs. Surface the results through existing Convex notifications and a dashboard focus panel, without paid APIs or external AI services.

**Tech Stack:** Next.js App Router, React 19, Convex, TypeScript, Node test runner, Vercel deployment.

---

### Task 1: Automation Rule Helpers

**Files:**
- Create: `src/lib/crm-automation-rules.mjs`
- Create: `src/lib/crm-automation-rules.d.ts`
- Create: `src/lib/crm-automation-rules.test.mjs`

- [ ] Write failing tests for overdue tasks, overdue lead follow-ups, stale proposals, duplicate lead keys, first follow-up dates, and WhatsApp message links.
- [ ] Run `node src/lib/crm-automation-rules.test.mjs` and confirm the helpers are missing.
- [ ] Implement pure helpers for Phase 1, Phase 2, and Phase 3 rules.
- [ ] Run `node src/lib/crm-automation-rules.test.mjs` and confirm all helper tests pass.

### Task 2: Convex Automation Backend

**Files:**
- Create: `convex/automation.ts`
- Create: `convex/crons.ts`
- Modify: `convex/schema.ts`
- Modify: `convex/leads.ts`

- [ ] Add schema indexes needed for efficient automation scans by lead follow-up, lead email, lead WhatsApp, task due date, and notification type.
- [ ] Add internal automation mutations that create deduped notifications for morning focus, evening summary, overdue follow-ups, stale proposals, and overdue tasks.
- [ ] Add public queries for Today’s Focus data and lead duplicate candidates.
- [ ] Update lead creation to set a first follow-up date, detect duplicates, and create a new-lead notification.
- [ ] Add Convex cron jobs for morning digest, afternoon follow-up check, and evening summary.
- [ ] Run `npx convex codegen` to refresh generated API types.

### Task 3: Dashboard Focus UI

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`
- Create: `src/components/dashboard/todays-focus.tsx`

- [ ] Add a dashboard card that shows overdue tasks, due lead follow-ups, stale proposals, and high-value leads.
- [ ] Link each focus item to the appropriate CRM page.
- [ ] Use existing UI primitives and avoid paid/external services.

### Task 4: Lead WhatsApp Helpers

**Files:**
- Modify: `src/app/(dashboard)/leads/[id]/page.tsx`
- Create: `src/components/leads/whatsapp-message-panel.tsx`

- [ ] Add copy-ready lead follow-up messages for first follow-up, proposal reminder, and stale lead revival.
- [ ] Generate safe `wa.me` links when a WhatsApp number exists.
- [ ] Keep sending manual so no paid WhatsApp API or unofficial automation is required.

### Task 5: Verification

**Files:**
- No new files expected.

- [ ] Run `node src/lib/crm-automation-rules.test.mjs`.
- [ ] Run existing Node tests.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Summarize any remaining manual setup, including Convex deploy order.
