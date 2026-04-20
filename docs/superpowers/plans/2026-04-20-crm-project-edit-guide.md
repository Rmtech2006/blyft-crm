# CRM Project Edit And Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add project editing and an in-app CRM guide while deferring the remaining automation work.

**Architecture:** Reuse the existing `api.projects.update` mutation and project form patterns for a focused `EditProjectDialog`. Add a static Settings guide component so the team can learn the current CRM modules without introducing backend state or paid services.

**Tech Stack:** Next.js App Router, React Hook Form, Zod, Convex, TypeScript, Node source tests.

---

### Task 1: Project Edit UI

**Files:**
- Create: `src/components/projects/edit-project-dialog.tsx`
- Modify: `src/app/(dashboard)/projects/[id]/page.tsx`
- Test: `tests/crm-non-automation-ui-source.test.mjs`

- [ ] Write a failing source test that expects `EditProjectDialog` to exist, call `api.projects.update`, and be mounted on the project detail page.
- [ ] Implement `EditProjectDialog` with name, client, type, status, description, budget, start date, deadline, and Drive folder fields.
- [ ] Add an `Edit` button on the project detail header.

### Task 2: Settings CRM Guide

**Files:**
- Create: `src/components/settings/crm-guide.tsx`
- Modify: `src/app/(dashboard)/settings/page.tsx`
- Test: `tests/crm-non-automation-ui-source.test.mjs`

- [ ] Extend the failing source test to expect a `CRM Guide` Settings tab and guide component.
- [ ] Build guide sections for Dashboard, Leads, Clients, Projects, Tasks, Finance, Reimbursements, Team, Templates, Settings, and Automations.
- [ ] Add the guide tab to Settings after Sales Targets and before Security.

### Task 3: Verification And Deployment

**Files:**
- No new product files expected.

- [ ] Run `node tests/crm-non-automation-ui-source.test.mjs`.
- [ ] Run existing source tests.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Merge, push, and deploy Vercel production if verification passes.
