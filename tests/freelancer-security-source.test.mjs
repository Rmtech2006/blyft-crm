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

      assert.match(
        body,
        /requireRole\(ctx,\s*\[\s*["']SUPER_ADMIN["']\s*\]\)/,
        `${name} should require SUPER_ADMIN`
      )
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
