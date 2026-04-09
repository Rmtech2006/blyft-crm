'use client'

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from 'convex/react'
import { Command, CornerDownLeft, Search } from 'lucide-react'
import { api } from '@convex/_generated/api'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

type SearchResult = {
  id: string
  title: string
  subtitle: string
  href: string
  section: string
}

const quickLinks = [
  { label: 'Dashboard', href: '/' },
  { label: 'Clients', href: '/clients' },
  { label: 'Projects', href: '/projects' },
  { label: 'Tasks', href: '/tasks' },
  { label: 'Leads', href: '/leads' },
  { label: 'Finance', href: '/finance' },
] as const

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query.trim())
  const queriedResults = useQuery(
    api.search.global,
    deferredQuery.length >= 2 ? { query: deferredQuery } : 'skip'
  )
  const results = useMemo(() => (queriedResults ?? []) as SearchResult[], [queriedResults])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const groupedResults = useMemo(() => {
    const sections = new Map<string, SearchResult[]>()

    for (const result of results) {
      const current = sections.get(result.section) ?? []
      current.push(result)
      sections.set(result.section, current)
    }

    return Array.from(sections.entries())
  }, [results])

  function handleSelect() {
    setOpen(false)
    setQuery('')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden min-w-[240px] items-center gap-3 rounded-2xl border border-border/80 bg-card/80 px-4 py-2.5 text-left transition-colors hover:bg-accent lg:flex"
      >
        <Search className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 text-sm text-muted-foreground">
          Search clients, tasks, leads, finance...
        </span>
        <span className="flex items-center gap-1 rounded-full border border-border/80 bg-muted/60 px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <Command className="h-3 w-3" /> K
        </span>
      </button>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-card/80 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
        aria-label="Open global search"
      >
        <Search className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Global Search</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search clients, projects, tasks, leads, templates, finance..."
                className="pl-9"
              />
            </div>

            {deferredQuery.length < 2 ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Quick links
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {quickLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={handleSelect}
                      className="flex items-center justify-between rounded-2xl border border-border/80 bg-card px-4 py-3 text-left transition-colors hover:bg-accent"
                    >
                      <span className="text-sm font-medium text-foreground">{link.label}</span>
                      <CornerDownLeft className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
                <p className="text-sm font-medium text-foreground">No matching records</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try a broader search term or jump directly using the quick links.
                </p>
              </div>
            ) : (
              <div className="max-h-[420px] space-y-4 overflow-y-auto pr-1">
                {groupedResults.map(([section, items]) => (
                  <div key={section} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                        {section}
                      </p>
                      <Badge variant="outline" className="text-[10px]">
                        {items.length}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {items.map((item) => (
                        <Link
                          key={`${section}-${item.id}`}
                          href={item.href}
                          onClick={handleSelect}
                          className="flex w-full items-start justify-between gap-3 rounded-2xl border border-border/80 bg-card px-4 py-3 text-left transition-colors hover:bg-accent"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{item.title}</p>
                            {item.subtitle && (
                              <p className="mt-1 truncate text-sm text-muted-foreground">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                          <CornerDownLeft className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
