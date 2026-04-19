export type WorkLinkInput = {
  label?: string
  url?: string
}

export type NormalizedWorkLink = {
  label: string
  url: string
}

export function normalizeUrl(value?: string): string | undefined

export function normalizeWorkLinkRows(rows: WorkLinkInput[]): NormalizedWorkLink[]
