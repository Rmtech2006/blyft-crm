# Finance Client And Project Filters Design

## Summary

Add `Client` and `Project` filters to the Finance transactions view so users can narrow transaction history, summaries, and exports to the tagged business context already captured on each transaction.

## Problem

The Finance page currently supports filtering only by transaction type and date range. Transactions already store optional `clientId` and `projectId`, and the add/edit transaction flow already lets users tag both fields, but there is no way to use those links to isolate finance activity for a specific client or project.

This makes it harder to:

- review all finance activity for one client
- inspect project-linked revenue or expenses
- export filtered reports for a specific client or project
- validate that transaction tagging is being used correctly

## Goals

- Add `Client` and `Project` filters to the Finance transactions tab.
- Allow filters to combine with existing `Type`, `Date From`, and `Date To` filters.
- Ensure the transaction table, summary cards, CSV export, and PDF export all reflect the same filtered dataset.
- Keep the UI lightweight and consistent with the existing dashboard controls.

## Non-Goals

- Changing how transactions are created or edited
- Adding dependent dropdown logic that limits projects based on selected client
- Redesigning Finance tabs or adding saved filter presets
- Creating client- or project-specific finance pages outside the Finance screen

## Current State

### Backend

`convex/finance.ts` exposes `listTransactions` with optional:

- `type`
- `dateFrom`
- `dateTo`

The query hydrates each transaction with:

- `client`
- `project`
- `bankAccount`

### Frontend

`src/app/(dashboard)/finance/page.tsx`:

- stores filter state for type and date range
- calls `api.finance.listTransactions`
- derives summary values from the returned transactions
- exports CSV and PDF from the filtered transaction list

## Proposed Solution

### Filter Model

Extend `api.finance.listTransactions` to accept:

- `clientId?: Id<"clients">`
- `projectId?: Id<"projects">`

The Finance page will keep local state for:

- `selectedClientId`
- `selectedProjectId`

The query arguments sent to Convex will include those values only when a specific filter is selected.

### UI Changes

On the `Transactions` tab filter row, add:

- `Client` select with `All clients` default
- `Project` select with `All projects` default

The options will come from:

- `api.clients.list`
- `api.projects.list`

The existing `Clear` button will reset:

- type
- date from
- date to
- client
- project

### Backend Filtering Behavior

`listTransactions` should return only rows that match all provided filters.

Expected behavior:

- no filters: current default transaction list behavior
- client only: all transactions linked to that client
- project only: all transactions linked to that project
- client + project: only transactions matching both
- date/type + client/project: intersection of all provided filters

To keep this change small and safe, the backend can:

- reuse the current indexed fetch path for type/date when possible
- apply optional client/project narrowing after the initial indexed fetch

This is acceptable because the current page already caps the transaction window to recent records and the feature is meant to improve a human-operated dashboard view rather than serve unlimited pagination.

## UX Details

- Filters should appear in the same control row as the existing type/date filters.
- Select labels should be obvious from the selected values even when no explicit field label is rendered.
- The current transaction rows should surface both client and project context when available so users can confirm why a record appears in the filtered result.
- Empty state remains `No transactions found`.

## Export And Summary Behavior

The following should always use the fully filtered transaction list:

- Finance summary cards
- CSV export
- PDF export
- filtered transaction count shown in the PDF summary

This preserves a single mental model: “what I see is what I export.”

## Testing Strategy

Follow source-level TDD already used in this repo for CRM/Finance UI wiring.

Add or extend source tests to assert:

- `convex/finance.ts` accepts optional `clientId` and `projectId` in `listTransactions`
- `src/app/(dashboard)/finance/page.tsx` fetches clients and projects for filter options
- the Finance page stores client/project filter state
- the Finance page passes `clientId` and `projectId` into `api.finance.listTransactions`
- the clear action resets client/project filters along with existing filters

Then verify behavior with:

- targeted source tests
- lint
- typecheck
- production build

## Risks

- If filtering is done only on the client, exports and summaries could drift from backend query expectations later.
- If project/client filters are added but row rendering does not clearly show both tags, users may not trust the results.
- If optional ids are passed inconsistently as empty strings instead of `undefined`, Convex validation will fail.

## Implementation Outline

1. Add failing source tests for Finance filter wiring.
2. Extend `api.finance.listTransactions` args with optional `clientId` and `projectId`.
3. Update backend filtering logic to honor the new args.
4. Add client/project filter state and selects to the Finance page.
5. Pass the selected filters into the transactions query.
6. Reset the new filters in the existing clear action.
7. Optionally improve row subtext to show both linked client and project when present.
8. Run verification commands and confirm the resulting UX.
