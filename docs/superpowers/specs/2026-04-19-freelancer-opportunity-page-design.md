# Freelancer Opportunity Page Design

## Purpose

The existing public freelancer link should become a stronger opportunity page for people who want to work with BLYFT clients, earn through projects, learn through real delivery work, and grow with the team. The page must still collect structured application details, but it should no longer feel like only an internal intake form.

## Goals

- Reframe `/freelancer` as a public opportunity page with a clear application form.
- Avoid using the words `BLYFT CRM` anywhere on the public page.
- Keep every public submission approval-only.
- Automatically create a saved Team profile only after admin approval.
- Add technical freelancer categories for development, apps, websites, AI automation, full-stack, and custom SaaS work.
- Let applicants add multiple work/profile links with labels.
- Show all submitted links and technical skills in the admin review card.
- Preserve all submitted link data when an application is approved.
- Add a delete/archive action for existing Team profiles.

## Non-Goals

- No public account creation for freelancers.
- No applicant login or edit-after-submit flow.
- No full recruiting pipeline with interview stages.
- No automatic approval.
- No public listing of approved freelancers.

## Public Page Direction

The `/freelancer` page will open as a public-facing opportunity page. The copy should speak to freelancers directly: work on client projects, earn with us, learn from live work, and grow through the BLYFT network.

The page should use the BLYFT logo, but it must not show `BLYFT CRM` text. Public copy can say `BLYFT`, `BLYFT team`, `our team`, or `our clients`, but should avoid exposing internal product/admin terminology.

The page still needs to be direct and useful. It should avoid becoming a large marketing site. The main experience is:

- understand the opportunity
- see the type of talent BLYFT is looking for
- submit a profile for review

Suggested public copy themes:

- Work with BLYFT clients on real projects.
- Earn through project-based or ongoing collaboration.
- Learn by working across brands, launches, campaigns, products, and automations.
- Grow with a team that can match the right talent to the right client need.

The success state should also avoid internal CRM language. It should confirm that the profile was received and will be reviewed by the team before anyone contacts the applicant.

## Application Form

The form keeps the current core fields:

- Profile photo upload
- Full name
- Email
- WhatsApp
- Phone
- Location
- Role categories
- Sub-skills
- Other skill
- Experience notes
- Availability
- Expected rate or project fee

Email or WhatsApp remains required. At least one role category remains required.

Add one optional field:

- Best-fit work type

Examples for best-fit work type:

- Project-based work
- Monthly retainer
- Urgent tasks
- Ongoing support
- Collaboration with internal team
- Maintenance and improvements

## Work Categories

The skill presets should be expanded so technical freelancers are clearly supported.

Initial categories:

- Website Development
- App Development
- Full-Stack Development
- Custom SaaS Development
- AI Automations
- API Integrations
- No-Code / Low-Code Automations
- UI / Web Design
- Graphic Design
- Video Editing
- Motion Graphics
- 3D Animation
- Social Media
- Marketing
- Content Writing

Suggested sub-skills:

- Website Development: landing pages, business websites, e-commerce, CMS websites, Webflow, WordPress, Next.js
- App Development: iOS apps, Android apps, React Native, Flutter, PWA, app maintenance
- Full-Stack Development: frontend, backend, databases, authentication, dashboards, admin panels, deployment
- Custom SaaS Development: MVP builds, subscriptions, multi-tenant apps, billing, dashboards, user management, internal tools
- AI Automations: AI chatbots, lead automation, workflow automation, document automation, AI agents, prompt systems
- API Integrations: payment integrations, CRM integrations, WhatsApp integrations, third-party APIs, webhooks, data sync
- No-Code / Low-Code Automations: Zapier, Make, Airtable, Notion systems, Google Sheets automation, workflow builders
- UI / Web Design: landing pages, dashboards, wireframes, design systems, Figma prototypes, responsive layouts
- Graphic Design: social posts, brand identity, thumbnails, posters, pitch decks, print design, ad creatives
- Video Editing: reels/shorts, YouTube long-form, podcast editing, ad creatives, color grading, sound cleanup, corporate edits
- Motion Graphics: logo animation, explainer videos, kinetic typography, Lottie animation, social motion posts
- 3D Animation: product renders, product animation, 3D modeling, character animation, Blender, Cinema 4D
- Social Media: content calendar, community management, caption writing, Instagram growth, LinkedIn content
- Marketing: Meta ads, Google ads, campaign strategy, landing page audit, performance creatives
- Content Writing: blogs, website copy, scripts, ad copy, email copy, case studies

## Multiple Work Links

Applicants often have more than one portfolio or proof-of-work link. The form should include an `Add link` option so they can add as many links as they need.

Each link should store:

- Label
- URL

Examples of labels:

- Portfolio
- Behance
- LinkedIn
- GitHub
- Live website
- App Store
- Play Store
- SaaS demo
- Figma file
- Case study
- Other

The UI can keep the existing dedicated Behance and LinkedIn fields only if that reduces implementation churn, but the canonical data should support a list of labeled links. If dedicated legacy fields remain, they should be mirrored into the labeled link list for review and approved profiles.

URL values should continue to be normalized by adding `https://` when the applicant enters a bare domain.

## Data Model

Add structured fields to both `freelancerApplications` and `teamMembers`:

- `workLinks`: array of objects with `label` and `url`
- `bestFitWorkType`: optional string

Existing fields can remain for backward compatibility:

- `portfolioUrl`
- `behanceUrl`
- `linkedinUrl`

Approval should copy `workLinks` and `bestFitWorkType` from the application into the created Team profile. Existing single-link fields should still be copied until all current UI surfaces are migrated.

## Admin Review Flow

Every submitted application must stay in the pending approval queue. Public submission never creates an active Team profile directly.

The pending application card should show:

- applicant name and photo
- submitted date
- contact details
- location
- all selected categories
- selected sub-skills
- other skill
- all submitted labeled links
- availability
- expected rate or project fee
- best-fit work type
- experience notes

Approve behavior:

- Verify the application is still pending.
- Create a Team profile with `type: FREELANCER` and `status: ACTIVE`.
- Copy profile photo, contact details, categories, skills, other skill, links, availability, expected rate, best-fit work type, and notes.
- Mark the application as approved.
- Store the created Team member id on the application.

Reject behavior:

- Verify the application is still pending.
- Mark the application as rejected.
- Do not create a Team profile.

## Existing Profile Delete / Archive

Team profiles should have a visible delete/archive action.

If a profile has no linked projects, reimbursements, or other historical records, the action can permanently delete the profile after a confirmation prompt.

If a profile has linked records, the action should preserve history by offboarding/archiving the profile instead of deleting it. The user-facing action can still be called `Delete profile`, but the confirmation text must explain that profiles with history are safely offboarded so past project and payment references remain intact.

The existing `OFFBOARDED` status can be used for archive behavior unless a future design adds a separate archived state.

## UI Notes

- The public page should feel premium and clear, but not like a full marketing microsite.
- Avoid the phrase `BLYFT CRM` on the public page.
- Avoid cards inside cards when updating the public page layout.
- Keep the application form easy to scan on mobile.
- The `Add link` control should be simple: add row, label input, URL input, remove row.
- Existing admin pages can keep their internal CRM language where appropriate.

## Error Handling

- Public submission requires full name, email or WhatsApp, and at least one role category.
- Link rows with no label and no URL should be ignored.
- Link rows with a URL and no label should default to `Work link`.
- Link rows with a label and no URL should show a validation message.
- Photo upload failure should show a retry message without clearing form state.
- Approval should fail gracefully if the application was already reviewed.
- Delete/archive should require confirmation.
- Permanent delete should be blocked when linked records exist.

## Verification

- Run Convex codegen after schema/API changes.
- Run TypeScript checks.
- Run lint checks if available.
- Run production build.
- Manually verify `/freelancer` loads without login.
- Confirm public page does not contain the phrase `BLYFT CRM`.
- Submit an application with multiple links.
- Confirm submitted application appears only in the pending approval queue.
- Confirm approval creates a Team profile with all submitted links and best-fit work type.
- Confirm rejection does not create a Team profile.
- Confirm a profile with linked records is offboarded instead of permanently deleted.
- Confirm a profile without linked records can be permanently deleted after confirmation.
