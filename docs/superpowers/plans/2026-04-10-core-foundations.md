# Core Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Secure identity flow, remove unsafe Convex access patterns, decompose the largest dashboard pages, and harden the build path without changing product behavior.

**Architecture:** Keep the existing Next.js App Router and Convex stack, but move identity derivation to authenticated server-side sources, introduce bounded/indexed Convex access paths, and split oversized route files into feature-local presentation modules. Preserve the current UI and data model unless a change is required to make the current behavior safe or buildable.

**Tech Stack:** Next.js 16 App Router, NextAuth v5 beta, Convex, React 19, TypeScript, Tailwind CSS

---

### Task 1: Baseline Safeguards And Identity Contract

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `src/components/providers.tsx`
- Modify: `src/types/next-auth.d.ts`
- Create: `convex/auth.config.ts`
- Modify: `package.json`

- [ ] Define the authenticated identity contract for NextAuth and Convex.
- [ ] Replace hardcoded credential records with environment-backed credentials.
- [ ] Add Convex auth configuration and client auth token wiring.
- [ ] Verify the app still renders unauthenticated login and authenticated dashboard flows.

### Task 2: Server-Derived Authorization In Convex

**Files:**
- Modify: `convex/settings.ts`
- Modify: `convex/notifications.ts`
- Modify: `convex/salesTargets.ts`
- Modify: `convex/tasks.ts`
- Modify: `convex/schema.ts`
- Modify: `src/app/(dashboard)/settings/page.tsx`
- Modify: `src/components/layout/notification-panel.tsx`
- Modify: `src/app/(dashboard)/tasks/[id]/page.tsx`

- [ ] Remove caller-supplied identity arguments where they are currently used for authorization.
- [ ] Add helper(s) for authenticated identity lookup in Convex.
- [ ] Update client calls to rely on session-backed identity instead of passing free-form user IDs.
- [ ] Regenerate Convex types if schema or function signatures change.

### Task 3: Query Scaling And Index Hygiene

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/dashboard.ts`
- Modify: `convex/search.ts`
- Modify: `convex/clients.ts`
- Modify: `convex/tasks.ts`
- Modify: `convex/notifications.ts`
- Modify: `convex/salesTargets.ts`

- [ ] Replace avoidable `.collect()` + in-memory filtering patterns with indexed or bounded access.
- [ ] Add any missing indexes needed by notifications and summary queries.
- [ ] Reduce obvious N+1 and whole-table scans in dashboard/search paths.
- [ ] Keep returned payloads compatible with the current UI.

### Task 4: Route Decomposition Without UX Change

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`
- Modify: `src/app/(dashboard)/settings/page.tsx`
- Modify: `src/app/(dashboard)/finance/page.tsx`
- Create: `src/components/dashboard/*`
- Create: `src/components/settings/*`
- Create: `src/components/finance/*`

- [ ] Extract feature-local sections, dialogs, and helpers from the three oversized route files.
- [ ] Remove duplicated finance page logic while preserving existing behavior.
- [ ] Keep page entry files focused on data wiring and top-level layout.
- [ ] Avoid visual or workflow changes outside the approved scope.

### Task 5: Build And Release Hardening

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `README.md`
- Modify: any build config only if required by the verified fix

- [ ] Make the build resilient in restricted environments by removing the current external font fetch dependency.
- [ ] Add concise project-specific setup and release guidance to the README.
- [ ] Run lint, type/build verification, and capture any remaining blockers precisely.
