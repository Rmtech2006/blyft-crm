# Team Profile OS And Payout Desk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a richer Team profile system with photo/contact/social fields and refresh Reimbursements into a premium payout desk.

**Architecture:** Extend the Convex team member document with optional profile fields, resolve photo storage URLs in team queries, and keep UI behavior in existing client components/pages. Add an edit member dialog for existing records while preserving reimbursement mutations and upload flow.

**Tech Stack:** Next.js App Router, React client components, Convex queries/mutations/storage, react-hook-form, zod, existing UI primitives, lucide-react, Tailwind CSS.

---

## File Structure

- Modify: `convex/schema.ts`
  - Add optional profile/photo/social fields to `teamMembers`.
- Modify: `convex/team.ts`
  - Accept profile fields in create/update and resolve `photoUrl` from storage.
- Modify: `src/components/team/add-member-dialog.tsx`
  - Add photo upload and new profile/contact/social inputs.
- Create: `src/components/team/edit-member-dialog.tsx`
  - Edit existing profile/contact/social/employment fields.
- Modify: `src/app/(dashboard)/team/page.tsx`
  - Replace plain cards with Team Profile OS UI.
- Modify: `src/app/(dashboard)/team/[id]/page.tsx`
  - Replace detail UI with a richer profile page and edit action.
- Modify: `src/app/(dashboard)/reimbursements/page.tsx`
  - Replace plain reimbursement table with Payout Desk UI.

## Tasks

### Task 1: Team Data Model

- [ ] Add `photoStorageId`, `photoUrl`, `whatsapp`, `roleTitle`, `portfolioUrl`, `behanceUrl`, and `linkedinUrl` as optional strings on `teamMembers`.
- [ ] Add the same fields to `team.create` and `team.update` mutation args.
- [ ] Resolve uploaded photo URLs in `team.list` and `team.get` using `ctx.storage.getUrl`.

### Task 2: Team Forms

- [ ] Update Add Member dialog with image upload through `api.files.generateUploadUrl`.
- [ ] Add fields for role/title, WhatsApp, portfolio, Behance, LinkedIn.
- [ ] Create Edit Member dialog using `api.team.update` and the same field set.
- [ ] Keep existing compensation, skills, college, location, and date fields.

### Task 3: Team UI

- [ ] Redesign Team list with dark header, summary cards, upgraded filters, rich profile cards, contact shortcuts, social links, and skills.
- [ ] Make search include new profile fields.
- [ ] Redesign Team detail with profile header, contact panel, profile links, employment, skills, projects, compensation, and reimbursements.

### Task 4: Reimbursements UI

- [ ] Redesign page header and summary cards.
- [ ] Restyle tabs and table into payout desk layout.
- [ ] Preserve approve, reject, pay, receipt, CSV export, and submit flows.
- [ ] Clean corrupted text artifacts and use `-` fallbacks.

### Task 5: Verification And Deploy

- [ ] Run `npx convex codegen` if generated API/data model types need refreshing.
- [ ] Run lint for changed TSX files.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run production `next build --webpack`.
- [ ] Commit with `feat: upgrade team and reimbursement workspace`.
- [ ] Push to `origin/main`.
- [ ] Confirm GitHub/Vercel deployment success and live `/team` and `/reimbursements` responses.

## Self-Review

- Spec coverage: the plan covers schema, mutations, add/edit forms, Team list/detail UI, Reimbursements UI, and deployment verification.
- Placeholder scan: no TBD/TODO placeholders remain.
- Type consistency: profile field names match across schema, mutations, forms, and UI.
