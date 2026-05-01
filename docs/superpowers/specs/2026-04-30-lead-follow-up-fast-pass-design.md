# Lead Follow-Up Fast Pass Design

## Context

The CRM already exposes manual lead follow-up helpers and phase-1 backend automations, but the current experience is weaker than it appears:

- the lead detail page offers WhatsApp helper text but no quick follow-up state changes
- follow-up scheduling depends on manual edits instead of one-tap actions
- duplicate lead metadata is only partially maintained when lead contact fields change
- the automation center is still informational, so the fastest user-facing value is improving the existing lead workflow instead of adding new automation systems

## Approved Scope

This pass stays intentionally small.

- Add quick follow-up actions on the lead detail page only
- Improve backend lead update behavior so follow-up scheduling is consistent
- Recompute duplicate metadata more safely when email or WhatsApp changes
- Do not expand the leads list page in this pass
- Do not build new automation-center controls in this pass

## User Problem

Users can open a lead and see messaging suggestions, but after contacting the lead they still need to manually open edit flows and pick a new follow-up date. That creates friction and increases the chance that follow-up dates stay stale, which then weakens Today’s Focus and reminder notifications.

## Goals

- Reduce the number of clicks required after a manual follow-up
- Make next follow-up scheduling fast and obvious from the lead detail page
- Keep duplicate lead metadata synchronized when key contact fields change
- Improve data quality for existing reminder and dashboard automation flows

## Non-Goals

- No new external WhatsApp or email automation
- No workflow builder or rule editor
- No bulk actions on the leads list page
- No new notification types beyond the current automation system

## Proposed UX

### Placement

Add a compact `Follow-up actions` card near the existing WhatsApp helper area on the lead detail page.

### Actions

Expose four quick actions:

- `Followed up today`
- `Tomorrow`
- `In 3 days`
- `Next week`

### Behavior

- Each action updates the lead’s `followUpDate` immediately
- `Followed up today` behaves like a confirmation action and schedules the next follow-up using the same default cadence as a fresh lead follow-up unless a clearer existing helper suggests otherwise
- The lead detail screen should show success feedback after the update
- The page should not force the user into the full edit dialog for these common actions

## Backend Design

### Lead follow-up scheduling helper

Create or extract a small backend helper in `convex/leads.ts` so all follow-up quick actions use the same patching path and future list-page actions can reuse it cleanly.

Responsibilities:

- accept a lead id and target follow-up timestamp
- patch the lead with the new `followUpDate`
- avoid duplicating update logic in multiple UI handlers

### Duplicate metadata refresh

When lead contact fields change:

- recompute normalized `emailKey`
- recompute normalized `whatsappKey`
- re-evaluate `duplicateOfLeadId`
- avoid linking a lead to itself when recalculating duplicates

This keeps duplicate detection more trustworthy without introducing merge workflows in this pass.

## Files Expected To Change

- `docs/superpowers/specs/2026-04-30-lead-follow-up-fast-pass-design.md`
  - approved design document for this pass
- `convex/leads.ts`
  - follow-up mutation/helper improvements and safer duplicate recomputation
- `src/app/(dashboard)/leads/[id]/page.tsx`
  - new quick follow-up action UI and mutation wiring
- `tests/...`
  - add or extend source-level tests to cover the new quick follow-up behavior and duplicate refresh logic

## Success Criteria

- A user can open a lead and set the next follow-up with one click from the detail page
- Existing reminder/focus flows receive cleaner follow-up dates without any extra user steps
- Updating lead email or WhatsApp refreshes duplicate metadata consistently
- Existing tests still pass and new tests cover the added workflow

## Risks

- If quick actions use client-side date math inconsistently, reminders may shift unexpectedly
- If duplicate recalculation is too aggressive, one lead could incorrectly link to another
- If the mutation contract is too narrow, we may need to touch it again when list-level quick actions are added later

## Recommended Implementation Order

1. Add a failing test for the new lead detail follow-up action wiring
2. Add a failing test for safer duplicate metadata recomputation
3. Implement backend follow-up and duplicate refresh improvements
4. Implement lead detail quick actions
5. Run targeted tests and lint

## Spec Self-Review

- Scope matches the approved fast pass
- No placeholders or TODO markers remain
- Design keeps the change focused on existing lead workflows
- Implementation path supports later reuse on the leads list without requiring it now
