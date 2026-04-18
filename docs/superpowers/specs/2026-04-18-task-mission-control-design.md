# Task Mission Control Design

## Goal

Refresh the Tasks page into a premium internal operations cockpit that makes urgent work, blocked work, ownership, and delivery status easier to read at a glance.

## Scope

Only `src/app/(dashboard)/tasks/page.tsx` changes. The dashboard home page, Projects page, Clients page, sidebar, Convex schema, mutations, and shared components stay untouched unless a compile error exposes a direct dependency.

## Experience

The page becomes "Task Mission Control." The first screen prioritizes operating clarity over a plain board:

- A dark executive header with internal task metrics, export, and add-task actions.
- A command strip that highlights open work, blocked work, overdue tasks, and due-soon tasks.
- A stronger search and priority filter bar.
- Board-first workflow with the existing lanes: Todo, In Progress, In Review, Done, Blocked.
- A matching list view for dense management and status changes.

## Behavior To Preserve

- Add tasks with `AddTaskDialog`.
- Export CSV/PDF through `ExportMenu`.
- Delete tasks with confirmation.
- Update task status from list view using `api.tasks.updateStatus`.
- Link every task to `/tasks/[id]`.
- Filter by priority and search title, assignee, and project.

## Visual Direction

Use a restrained premium CRM style: deep neutral header, white glass panels, crisp cards, clear priority accents, and 8px-or-less rounded corners. Avoid emojis, promotional copy, decorative blobs, and loud one-color palettes.

## Data Rules

Compute derived groups locally from `api.tasks.list`:

- Open tasks: every task not marked `DONE`.
- Blocked tasks: status `BLOCKED`.
- Completed tasks: status `DONE`.
- Overdue tasks: due date before today and status not `DONE`.
- Due soon tasks: due date from today through the next seven days and status not `DONE`.
- Unassigned tasks: no assignee.

Use ASCII fallbacks (`-`) in exports and tables instead of corrupted dash artifacts.

## Accessibility And Stability

Cards remain keyboard-friendly through links/buttons. Layouts should be responsive with stable card heights, no text overflow, and no content shift when hover actions appear.

## Verification

Run page lint, TypeScript, and a production Next build before pushing. Confirm the deployed `/tasks` route returns a successful response or the expected login gate.
