# CRM Operations Polish Design

## Scope

This batch finishes the non-automation CRM polish that can ship quickly without new paid services or external API keys.

## Approved Direction

Use the existing Convex and Next.js patterns. Keep project deletion available, but add soft archive/restore so delivery history can be hidden without destroying records. Add direct edit/archive/delete actions from project cards and detail pages, richer project filters, a project activity/health strip, and a more useful CRM guide for daily and weekly operations.

## Features

- Projects can be archived and restored through Convex mutations.
- Project list defaults to active projects, with filters for active, archived, all, overdue, due soon, and missing deadline.
- Grid and board cards expose quick edit/open/archive/delete actions without forcing the user to open the detail page first.
- Project detail exposes archive, restore, and delete actions near the existing edit control.
- Settings guide adds daily routine, weekly routine, project cleanup, and safe automation preparation guidance.

## Data Flow

`projects.archivedAt` is optional. Active project views treat records with no `archivedAt` as active. Archive/restore mutations patch only `archivedAt`; hard delete continues to use the existing cascading `projects.remove` mutation.

## Testing

Use source-level tests to guard the UI wiring and Convex API surface, then run existing CRM source tests, lint, Convex codegen, and production build before deploy.
