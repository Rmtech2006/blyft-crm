export function normalizeUrl(value) {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export function normalizeWorkLinkRows(rows) {
  return rows
    .map((row) => {
      const label = row.label?.trim() || ''
      const url = normalizeUrl(row.url)

      if (!label && !url) return null
      if (label && !url) throw new Error(`Add a URL for ${label}`)

      return {
        label: label || 'Work link',
        url,
      }
    })
    .filter(Boolean)
}
