## Dashboard Hero Refresh Design

### Goal
Replace the top-of-dashboard `Today's Focus` block with the darker executive overview hero shown in the approved mockup.

### Scope
- Remove the `TodaysFocus` component from the dashboard page.
- Keep the existing live Convex-backed dashboard stats.
- Render a single top hero block with:
  - `EXECUTIVE OVERVIEW` eyebrow
  - dynamic greeting using the signed-in user's first name
  - supporting copy about the agency control room
  - `BLYFT WORKSPACE` pill
  - three stat cards for live clients, delivery load, and open pipeline
- Leave the rest of the dashboard sections intact.

### Data
- `Live clients` -> `stats.totalClients`
- `Delivery load` -> `stats.activeProjects`
- `Open pipeline` -> `stats.openLeads`

### Safety
- Reuse the existing `heroOverview` dashboard preference instead of adding new settings.
- Update the existing source-level dashboard test to prove the hero is mounted and `TodaysFocus` is no longer rendered from the page.

### Verification
- `node --test tests/crm-automation-source.test.mjs`
- `npm run lint`
