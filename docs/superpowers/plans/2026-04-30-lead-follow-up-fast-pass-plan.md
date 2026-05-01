# Feature name

Lead Follow-Up Fast Pass

# Pointer

Inline execution using `superpowers:executing-plans`

# Goal

Reduce friction on the lead detail page by adding one-click follow-up actions, while improving backend lead update logic so duplicate metadata and follow-up scheduling stay consistent.

# Architecture

- Keep the UX scoped to the lead detail page
- Add a dedicated Convex mutation for quick follow-up scheduling
- Centralize duplicate-key and duplicate-link recomputation in shared helper logic within `convex/leads.ts`
- Extend source-level tests first, then implement the minimal code required to pass

# Tech Stack

- Next.js app router frontend
- Convex queries and mutations
- Source-level Node tests in `tests/`

# File structure first

- `docs/superpowers/plans/2026-04-30-lead-follow-up-fast-pass-plan.md`
  - execution plan for this pass
- `tests/crm-automation-source.test.mjs`
  - source checks for quick follow-up mutation and lead detail quick-action UI
- `convex/leads.ts`
  - shared duplicate refresh helper and quick follow-up mutation
- `src/app/(dashboard)/leads/[id]/page.tsx`
  - quick follow-up action card and mutation wiring

# Tasks

1. Read the current lead detail page and `convex/leads.ts` again immediately before editing to confirm exact insertion points.
2. Add a failing source-level test in `tests/crm-automation-source.test.mjs` asserting `convex/leads.ts` exports a quick follow-up mutation.
3. Add a failing source-level test in `tests/crm-automation-source.test.mjs` asserting the lead detail page renders a `Follow-up actions` block with `Followed up today`, `Tomorrow`, `In 3 days`, and `Next week`.
4. Add a failing source-level test in `tests/crm-automation-source.test.mjs` asserting `convex/leads.ts` refreshes `duplicateOfLeadId` and avoids self-linking during duplicate recomputation.
5. Run the targeted test file and verify it fails for the new assertions.
6. In `convex/leads.ts`, extract shared helper logic that computes normalized duplicate keys and resolves duplicate lead candidates while excluding the current lead id when needed.
7. Update the existing `update` mutation in `convex/leads.ts` to recompute `emailKey`, `whatsappKey`, and `duplicateOfLeadId` whenever email or WhatsApp changes.
8. Add a dedicated `setFollowUpDate` mutation in `convex/leads.ts` that accepts a lead id and follow-up timestamp and patches the record.
9. In `src/app/(dashboard)/leads/[id]/page.tsx`, wire a `useMutation(api.leads.setFollowUpDate)` hook.
10. In `src/app/(dashboard)/leads/[id]/page.tsx`, add a compact `Follow-up actions` card near the WhatsApp helper area.
11. Implement the four quick actions in the lead detail page so each computes the target timestamp client-side and calls the new mutation.
12. Add success and failure toasts for each quick follow-up action without routing through the full edit dialog.
13. Re-run the targeted test file and verify it passes.
14. Run the broader CRM source tests and verify they still pass.
15. Run lint with a working local `PATH` that includes Homebrew’s Node binaries and verify it passes.
16. Review the diff for scope discipline and make sure no unrelated files were changed.

# Self-review

- Every approved requirement maps to at least one task
- No placeholders or vague “handle appropriately” steps remain
- Tests are explicitly written and verified in red/green order
- The plan stays intentionally small and does not expand into list-page actions or automation-center controls
