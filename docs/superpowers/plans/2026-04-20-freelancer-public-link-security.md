# Freelancer Public Link Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public freelancer link safe to share broadly without adding paid services.

**Architecture:** Keep `/freelancer` public, keep the submit mutation public, and move all review/admin/general-file-upload capabilities behind existing Convex auth and `SUPER_ADMIN` role checks. Preserve profile photo upload with a dedicated public freelancer-photo upload helper that accepts only declared image uploads within a small size limit, then add no-cost spam and validation guards directly in the form and Convex mutation.

**Tech Stack:** Next.js App Router, React Hook Form, Zod, Convex mutations/queries, existing NextAuth-to-Convex JWT roles, Node test runner.

---

### Task 1: Regression Tests For Public-Link Security

**Files:**
- Create: `tests/freelancer-security-source.test.mjs`

- [ ] **Step 1: Write the failing test**

Create a source-level regression test that checks the critical security contracts:

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
}

describe('freelancer public-link security', () => {
  it('keeps freelancer review operations admin-only', () => {
    const source = read('convex/freelancerApplications.ts')

    for (const name of ['listPending', 'approve', 'reject']) {
      const start = source.indexOf(`export const ${name}`)
      assert.notEqual(start, -1, `${name} should exist`)
      const nextExport = source.indexOf('export const ', start + 1)
      const body = source.slice(start, nextExport === -1 ? source.length : nextExport)
      assert.match(body, /requireRole\(ctx,\s*\[\s*["']SUPER_ADMIN["']\s*\]\)/, `${name} should require SUPER_ADMIN`)
    }
  })

  it('keeps public freelancer submissions narrow and spam guarded', () => {
    const source = read('convex/freelancerApplications.ts')
    const start = source.indexOf('export const create')
    const nextExport = source.indexOf('export const ', start + 1)
    const body = source.slice(start, nextExport)

    assert.match(body, /companyWebsite:\s*v\.optional\(v\.string\(\)\)/)
    assert.match(body, /if\s*\(args\.companyWebsite\?\.trim\(\)\)/)
    assert.match(body, /photoStorageId:\s*cleanOptionalText\(args\.photoStorageId/)
    assert.match(body, /\.take\(50\)/)
  })

  it('uses a narrow freelancer photo upload helper instead of the general upload URL', () => {
    const filesSource = read('convex/files.ts')
    const freelancerPage = read('src/app/freelancer/page.tsx')

    assert.match(filesSource, /generateUploadUrl[\s\S]*requireIdentity\(ctx\)/)
    assert.match(filesSource, /generateFreelancerPhotoUploadUrl/)
    assert.match(filesSource, /image\/jpeg/)
    assert.match(filesSource, /sizeBytes/)
    assert.doesNotMatch(freelancerPage, /api\.files\.generateUploadUrl/)
    assert.match(freelancerPage, /api\.files\.generateFreelancerPhotoUploadUrl/)
    assert.match(freelancerPage, /companyWebsite/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/freelancer-security-source.test.mjs`

Expected: FAIL because the role checks, spam trap, and upload lock are not in place yet.

### Task 2: Secure Convex Freelancer And File Functions

**Files:**
- Modify: `convex/freelancerApplications.ts`
- Modify: `convex/files.ts`

- [ ] **Step 1: Add role checks**

Import `requireRole` in `convex/freelancerApplications.ts` and call `await requireRole(ctx, ["SUPER_ADMIN"])` inside `listPending`, `approve`, and `reject`.

- [ ] **Step 2: Harden public create**

Add `companyWebsite: v.optional(v.string())`, reject non-empty honeypot values, enforce text/link/category/photo ID bounds, and check the most recent 50 pending applications for duplicate email/WhatsApp within 24 hours.

- [ ] **Step 3: Lock file helpers and add narrow public photo upload**

Import `requireIdentity` in `convex/files.ts` and call it before `ctx.storage.generateUploadUrl()` and `ctx.storage.getUrl()`. Add a separate `generateFreelancerPhotoUploadUrl` mutation with `contentType`, `sizeBytes`, and `companyWebsite` args. It must reject non-empty honeypot values, non-image types, and files larger than 2 MB before returning a Convex upload URL.

### Task 3: Update Public Freelancer Form

**Files:**
- Modify: `src/app/freelancer/page.tsx`

- [ ] **Step 1: Restore controlled public photo upload**

Use `api.files.generateFreelancerPhotoUploadUrl` for the public page. Validate file type and size before requesting the upload URL, keep the image preview, and never call the general `api.files.generateUploadUrl` from the public route.

- [ ] **Step 2: Add no-cost spam trap**

Add `companyWebsite` to the form schema, render a hidden text input for it, and short-circuit bot submissions client-side while the server also rejects them.

- [ ] **Step 3: Tighten client limits**

Add max lengths to public form fields so oversized submissions are blocked before reaching Convex.

### Task 4: Verification And Release

**Files:**
- Regenerate: `convex/_generated/api.d.ts`
- Regenerate: `convex/_generated/api.js`

- [ ] **Step 1: Regenerate Convex types**

Run: `npx convex codegen`

- [ ] **Step 2: Verify tests and build**

Run:

```bash
node --test tests/freelancer-security-source.test.mjs
node --test src/lib/freelancer-links.test.mjs
npx tsc --noEmit
npm run lint
npm run build
```

- [ ] **Step 3: Commit and push**

Commit only the security files, push `main`, and confirm Vercel production is Ready.
