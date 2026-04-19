import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizeWorkLinkRows } from './freelancer-links.mjs'

describe('normalizeWorkLinkRows', () => {
  it('normalizes labels and bare URLs while dropping empty rows', () => {
    assert.deepEqual(
      normalizeWorkLinkRows([
        { label: ' Portfolio ', url: 'example.com/me ' },
        { label: '', url: 'https://github.com/blyft' },
        { label: '', url: '' },
      ]),
      [
        { label: 'Portfolio', url: 'https://example.com/me' },
        { label: 'Work link', url: 'https://github.com/blyft' },
      ]
    )
  })

  it('reports rows with labels but no URLs', () => {
    assert.throws(
      () => normalizeWorkLinkRows([{ label: 'GitHub', url: '' }]),
      /Add a URL for GitHub/
    )
  })
})
