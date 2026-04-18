# Freelancer Applications Design

## Purpose

BLYFT CRM needs a public freelancer application link, similar to the existing lead capture link. Freelancers should be able to submit their profile from outside the CRM, but those submissions must not become team members until an admin reviews and approves them.

## Goals

- Add a public freelancer application page at `/freelancer`.
- Let freelancers submit contact details, portfolio links, photo upload, role categories, sub-skills, and an Other skill field.
- Store submissions in a pending application queue.
- Add an admin approval area on the Team page.
- Approving an application creates a real Team member with type `FREELANCER`.
- Rejecting an application keeps it out of the Team list.
- Remove photo URL fields from freelancer-facing and team member forms; use photo upload in the UI.

## Non-Goals

- No full hiring pipeline with interview stages.
- No Settings-based role management yet.
- No automatic approval.
- No authentication on the public application page.

## Public Freelancer Page

The public route `/freelancer` will use the same pattern as `/capture`: a public page outside the dashboard shell, available to anyone with the link.

The form will collect:

- Photo upload
- Full name
- Email
- WhatsApp
- Phone
- Location
- Portfolio URL
- Behance URL
- LinkedIn URL
- Role categories
- Sub-skills under selected categories
- Other skill
- Experience notes
- Availability
- Expected rate or project fee

The form will not expose a photo URL input. If a freelancer wants a profile photo, they upload it directly.

## Role And Skill Matrix

Freelancers can select multiple role categories. Selecting a role reveals its related sub-skills.

Initial role categories:

- Graphic Design
- Video Editing
- Motion Graphics
- 3D Animation
- Web / UI Design
- Development
- Social Media
- Marketing
- Content Writing

Example sub-skills:

- Video Editing: Reels / Shorts, YouTube long-form, podcast editing, ad creatives, color grading, sound cleanup, corporate edits
- Graphic Design: social posts, brand identity, thumbnails, posters, pitch decks, print design, ad creatives
- Motion Graphics: logo animation, explainer videos, kinetic typography, Lottie animation, social motion posts
- 3D Animation: product renders, product animation, 3D modeling, character animation, Blender, Cinema 4D

`Other skill` is a free text field for skills that do not fit the preset list.

## Data Model

Add a new freelancer application table that stores submissions separately from active team members.

Application fields:

- `fullName`
- `photoStorageId`
- `email`
- `whatsapp`
- `phone`
- `location`
- `portfolioUrl`
- `behanceUrl`
- `linkedinUrl`
- `roleCategories`
- `roleSkills`
- `otherSkill`
- `experienceNotes`
- `availability`
- `expectedRate`
- `status`: `PENDING`, `APPROVED`, or `REJECTED`
- `submittedAt`
- `reviewedAt`
- `approvedTeamMemberId`

Existing backend support for legacy `photoUrl` can remain for old data, but the visible forms should use upload only.

## Admin Team Flow

The Team page will add:

- `Copy Freelancer Link` action that copies `${origin}/freelancer`
- Pending freelancer applications section
- Application cards with profile, contact, role, skill, and link details
- Approve action
- Reject action

Approve behavior:

- Create a Team member from the application.
- Use `type: FREELANCER`.
- Use `status: ACTIVE`.
- Carry over photo, contact details, social links, role categories, sub-skills, Other skill, availability, and expected rate where supported.
- Mark the application as `APPROVED`.

Reject behavior:

- Mark the application as `REJECTED`.
- Do not create a Team member.

## UI Direction

The public form should feel consistent with the CRM: premium, calm, internal, and direct. Copy should be practical, not promotional.

The Team page application queue should fit the existing Profile OS direction: clean cards, clear approval actions, compact skill summaries, and no marketing language.

## Error Handling

- Required public fields: full name, email or WhatsApp, at least one role category.
- Photo upload failure should show a clear retry message without losing entered form fields.
- Approve should fail gracefully if the application was already reviewed.
- Public form submission should show a success state after saving.

## Verification

- Convex codegen after schema/API changes.
- TypeScript check.
- Lint check.
- Production build.
- Manual browser check for `/freelancer` and `/team`.
- Confirm pending applications do not appear in Team members before approval.
- Confirm approval creates a Team member and removes the application from the pending queue.
