# CRM Final Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the remaining automation-related CRM work and make previously shipped automations visible and trustworthy in the UI.

**Architecture:** Extend the existing pure helper rules in `src/lib`, wire the new deadline rule into `convex/automation.ts` and cron jobs, then surface the results through `Today's Focus`, notification rendering, and a new Settings automation surface.

**Tech Stack:** Next.js App Router, React, Convex, TypeScript, Node source tests, existing UI primitives.

---

### Task 1: Red Tests

**Files:**
- Modify: `src/lib/crm-automation-rules.test.mjs`
- Modify: `tests/crm-automation-source.test.mjs`
- Modify: `tests/crm-non-automation-ui-source.test.mjs`

- [ ] Add failing tests for due project deadline detection and final-pass automation visibility.
- [ ] Run the focused tests and confirm they fail first.

### Task 2: Automation Helper And Backend

**Files:**
- Modify: `src/lib/crm-automation-rules.mjs`
- Modify: `convex/automation.ts`
- Modify: `convex/crons.ts`

- [ ] Add a pure helper for due-soon project deadlines.
- [ ] Include due project deadlines in `getTodaysFocus`.
- [ ] Add a project deadline notification sweep mutation and cron entry.

### Task 3: UI Surfacing

**Files:**
- Modify: `src/components/dashboard/todays-focus.tsx`
- Modify: `src/components/layout/notification-panel.tsx`
- Create: `src/components/settings/automation-center.tsx`
- Modify: `src/app/(dashboard)/settings/page.tsx`

- [ ] Add a focus lane for project deadlines.
- [ ] Map automation notification types to meaningful icons and colors.
- [ ] Add a Settings automation tab/module with rule summary and zero-cost operating guidance.

### Task 4: Verification And Ship

**Files:**
- Check modified files

- [ ] Run helper tests, source tests, lint, Convex codegen, and production build.
- [ ] Commit, merge, push, deploy Convex, verify Vercel production, and smoke-check live routes.
