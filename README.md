BLYFT CRM is a Next.js and Convex workspace for managing leads, clients, projects, tasks, finance, templates, reimbursements, and team operations in one internal dashboard.

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Configure auth and backend access in your environment:

```bash
BLYFT_AUTH_USERS_JSON='[{"id":"owner","name":"Owner","email":"owner@blyftit.com","password":"replace-me","role":"SUPER_ADMIN"}]'
NEXTAUTH_SECRET='replace-me'
NEXTAUTH_URL='http://localhost:3000'
NEXT_PUBLIC_CONVEX_URL='https://<your-convex-deployment>.convex.cloud'
```

3. Start the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000).

## Convex Sync

This CRM depends on Convex for live queries and mutations. If the frontend is deployed before the Convex backend is synced, newer dashboard screens can be ahead of the live query shape.

Use these commands when shipping backend changes:

```bash
npm run convex:sync
```

That pushes the latest local Convex functions to the currently configured deployment.

Production uses the Convex deployment at `https://tacit-goose-673.convex.cloud`.
Before shipping frontend code that changes Convex functions or schema, push the
backend first:

```bash
npm run convex:deploy
```

Recommended order for releases:

1. Deploy Convex production with `npm run convex:deploy`.
2. Run `npm run lint`.
3. Run `npm run build`.
4. Verify login, dashboard, settings, notifications, finance, and tasks locally.
5. Deploy the Next.js app to Vercel.
