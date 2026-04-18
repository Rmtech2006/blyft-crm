# Team Profile OS And Payout Desk Design

## Goal

Upgrade Team into a richer people directory with profile photos, contact options, and profile links, while refreshing Reimbursements into a premium finance payout desk.

## Scope

Touch the Team list page, Team detail page, add/edit member flows, Convex team schema/mutations, and Reimbursements page UI. Preserve existing reimbursement submission, receipt upload, approve, reject, pay, and export behavior.

## Team Profile OS

Team should feel like an internal profile system:

- Premium dark page header with active team, availability, departments, and linked profiles.
- Rich member cards with profile photo or initials, role/title, department, employment type, status, contact buttons, social/profile links, project count, pay summary, and skills.
- Search should include name, role/title, department, skills, email, WhatsApp, and profile links.
- Detail page should have a profile header, contact panel, links panel, employment panel, skills, compensation, assigned projects, and reimbursements.
- Existing members without photos use initials.

## New Team Fields

Add optional fields to `teamMembers`:

- `photoStorageId`
- `photoUrl`
- `whatsapp`
- `roleTitle`
- `portfolioUrl`
- `behanceUrl`
- `linkedinUrl`

Use existing Convex file storage for uploaded photos. Store the returned storage id and resolve a signed URL from queries.

## Team Forms

The add member dialog should support:

- Photo upload
- Full name, role/title, type, department, status default
- Phone, WhatsApp, email
- Portfolio, Behance, LinkedIn
- Existing college, location, start date, compensation mode/rate, and skills

Add an edit member dialog so existing profiles can be updated.

## Reimbursements Payout Desk

Reimbursements should feel like a finance operating desk:

- Premium dark header with pending payout value and action buttons.
- Summary cards for pending, approved, paid, rejected, and payout exposure.
- Status tabs styled as a compact control board.
- Cleaner table with member, category, amount, receipt, status, and actions.
- Pay dialog should clearly show UPI/bank/preferred payment mode.
- Remove corrupted text artifacts and use ASCII-safe fallbacks.

## Verification

Run Convex codegen if schema/API typing requires it, then lint changed TSX files, run TypeScript, run production build, push to `main`, and confirm Vercel deployment status plus live route response.
