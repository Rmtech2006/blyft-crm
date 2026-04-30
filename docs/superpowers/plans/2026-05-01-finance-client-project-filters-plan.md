# Feature: Finance Client And Project Filters

Pointer: superpowers:executing-plans

## Goal

Add client and project filters to the Finance transactions tab so users can narrow transaction results, summary calculations, and exports using the existing transaction tags.

## Architecture

Extend the existing `convex/finance.ts` `listTransactions` query with optional `clientId` and `projectId` arguments, then update the Finance page to fetch client/project filter options, hold the selected filters in local state, pass them into the query, reset them with the existing clear action, and show both linked entities in transaction row context.

## Tech Stack

- Next.js app router
- React client components
- Convex queries and mutations
- Source-level Node tests
- TypeScript

## Files

- Modify: `tests/crm-non-automation-ui-source.test.mjs`
  Add source assertions for finance filter wiring and clear behavior.
- Modify: `convex/finance.ts`
  Add optional `clientId` and `projectId` args to `listTransactions` and narrow results accordingly.
- Modify: `src/app/(dashboard)/finance/page.tsx`
  Add client/project filter state, option queries, query args, clear behavior, and row context rendering.

## Tasks

1. Read the current finance source test block and finance page/query again to confirm exact insertion points before editing.
2. Add a failing source test in `tests/crm-non-automation-ui-source.test.mjs` that asserts the Finance page fetches clients/projects and passes `clientId` and `projectId` into `api.finance.listTransactions`.
3. Run `node --test tests/crm-non-automation-ui-source.test.mjs` and verify the new test fails for the expected missing filter wiring.
4. Update `convex/finance.ts` so `listTransactions` accepts optional `clientId` and `projectId` validators.
5. Update `convex/finance.ts` filtering logic so the returned transaction set is narrowed to the requested client/project ids after the indexed fetch path runs.
6. Update `src/app/(dashboard)/finance/page.tsx` to load clients and projects for filter options with `api.clients.list` and `api.projects.list`.
7. Add `selectedClientId` and `selectedProjectId` state in the Finance page and include them in the `api.finance.listTransactions` query args only when set.
8. Add `Client` and `Project` selects to the transactions filter row with `All clients` and `All projects` default options.
9. Update the existing clear action so it resets type, date from, date to, client, and project filters together.
10. Update the transaction row secondary text so linked client and linked project are both visible when present.
11. Run `node --test tests/crm-non-automation-ui-source.test.mjs` and verify the source test passes.
12. Run `npm run lint` and verify it exits successfully.
13. Run `npx tsc --noEmit` and verify it exits successfully.
14. Run `npm run build` and verify the production build succeeds.

## Self-Review

- Spec coverage: every approved requirement maps to a task above, including filter inputs, backend query args, clear behavior, export/summary consistency through shared filtered data, and visible row context.
- Placeholder scan: no placeholders, vague references, or skipped verification steps remain.
- Type consistency: `clientId` uses `Id<"clients">`, `projectId` uses `Id<"projects">`, and both names match the existing transaction schema and query payload.
