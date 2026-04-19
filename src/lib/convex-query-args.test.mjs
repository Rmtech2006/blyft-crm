import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { protectedQueryArgs } from './convex-query-args.mjs'

describe('protectedQueryArgs', () => {
  it('skips protected queries until Convex auth is ready', () => {
    assert.equal(protectedQueryArgs(false, {}), 'skip')
  })

  it('passes query args through once Convex auth is ready', () => {
    const args = { monthKey: '2026-04' }
    assert.equal(protectedQueryArgs(true, args), args)
  })
})
