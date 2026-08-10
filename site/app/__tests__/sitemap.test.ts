import {describe, it, expect, vi, beforeEach} from 'vitest'
import {parse} from 'groq-js'

/**
 * TECH-6 (`BI/rules/technical-seo.md`, ruled by Justin 2026-08-10): the XML
 * sitemap is generated, never committed, and NEVER lists a page carrying
 * `noIndex` — on any type, with no exceptions. Built as that file's queue
 * line 2, closing `OUTSTANDING.md` item 161.
 *
 * NOTHING COVERED `sitemap.ts` BEFORE THIS FILE, counted rather than assumed at
 * the topic's gate pass: TECH-6's hidden-site cell was ratified `nothing` on the
 * strength of "no test covers sitemap.ts at all". So the two behaviours that
 * WERE built — the site-wide empty sitemap, and the collection filter — are
 * pinned here alongside the ones this build adds, because they were carrying the
 * same absence.
 *
 * WHAT WAS RED-PROVEN, running rather than reasoned. Against the route as it
 * stood before this build, the nine planted-`noIndex` singleton cases and the
 * `/contact` cases fail and nothing else does — one singleton in eight
 * (`videoIndex`) filtered, and `/contact` was pushed with no document fetched at
 * all.
 */
vi.mock('@/lib/sanity/client', () => ({client: {fetch: vi.fn()}}))

import {client} from '@/lib/sanity/client'
import {SITEMAP_QUERY} from '@/lib/sanity/queries'
import sitemap from '@/app/sitemap'

const ENV = {...process.env}

/** Every singleton key the route reads, with the URL each one governs. */
const SINGLETONS: [key: string, url: string][] = [
  ['home', '/'],
  ['attorneyIndex', '/attorneys'],
  ['staffIndex', '/staff'],
  ['blogIndex', '/blog'],
  ['eventIndex', '/events'],
  ['serviceAreaIndex', '/service-area'],
  ['videoIndex', '/videos'],
  ['testimonials', '/testimonials'],
  ['contact', '/contact'],
]

const VISIBLE = {_updatedAt: '2026-08-01T00:00:00Z', noIndex: false}

function data(overrides: Record<string, unknown> = {}) {
  return {
    hideFromSearch: false,
    ...Object.fromEntries(SINGLETONS.map(([key]) => [key, {...VISIBLE}])),
    attorneys: [],
    staff: [],
    blogPosts: [],
    blogCategories: [],
    events: [],
    catchAll: [],
    ...overrides,
  }
}

function mockSitemap(overrides: Record<string, unknown> = {}) {
  vi.mocked(client.fetch).mockImplementation((q: string) =>
    Promise.resolve((q === SITEMAP_QUERY ? data(overrides) : null) as never),
  )
}

const paths = (entries: {url: string}[]) => entries.map((e) => e.url.replace(/^https?:\/\/[^/]+/, '') || '/')

beforeEach(() => {
  process.env = {...ENV, NEXT_PUBLIC_SITE_DOMAIN: 'www.example.com'}
  vi.mocked(client.fetch).mockReset()
})

describe('SITEMAP_QUERY reads the switch it is meant to obey', () => {
  // The mock below answers by query identity and supplies its own shape, so
  // every behaviour case in this file would pass a query that projects no
  // `noIndex` at all — which is EXACTLY the defect item 161 recorded, green on
  // every gate. So the query is asserted directly.
  const projections = (() => {
    const found: Record<string, Set<string>> = {}
    const tree = parse(SITEMAP_QUERY) as unknown as Record<string, unknown>
    const collect = (node: unknown, into: Set<string> | null): void => {
      if (Array.isArray(node)) return node.forEach((n) => collect(n, into))
      if (!node || typeof node !== 'object') return
      const n = node as Record<string, unknown>
      if (typeof n.name === 'string' && into) into.add(n.name)
      Object.values(n).forEach((v) => collect(v, into))
    }
    for (const attr of (tree.attributes as Record<string, unknown>[]) ?? []) {
      const name = attr.name as string
      const set = new Set<string>()
      collect(attr.value, set)
      found[name] = set
    }
    return found
  })()

  it.each(SINGLETONS.map(([key]) => key))('projects noIndex for the %s singleton', (key) => {
    expect(projections[key]).toBeDefined()
    expect(projections[key].has('noIndex')).toBe(true)
  })

  it('fetches contactPage at all, which it did not before', () => {
    expect(SITEMAP_QUERY).toContain('contactPage')
  })
})

describe('TECH-6: a singleton carrying noIndex is not listed', () => {
  it('lists every singleton URL when none is hidden', async () => {
    mockSitemap()
    const listed = paths(await sitemap())
    for (const [, url] of SINGLETONS) expect(listed).toContain(url)
  })

  it.each(SINGLETONS)('a planted noIndex on %s drops %s', async (key, url) => {
    mockSitemap({[key]: {...VISIBLE, noIndex: true}})
    const listed = paths(await sitemap())
    expect(listed).not.toContain(url)
    // And drops nothing else — the filter is per-page, not a switch.
    for (const [otherKey, otherUrl] of SINGLETONS) {
      if (otherKey !== key) expect(listed).toContain(otherUrl)
    }
  })

  it('an ABSENT singleton is not a hidden one: / and /contact still list', async () => {
    mockSitemap({home: null, contact: null})
    const listed = paths(await sitemap())
    expect(listed).toContain('/')
    expect(listed).toContain('/contact')
  })

  it('an absent index singleton still yields no entry for its route', async () => {
    mockSitemap({blogIndex: null})
    expect(paths(await sitemap())).not.toContain('/blog')
  })
})

describe('the two behaviours that were built and uncovered', () => {
  it('SEARCH-3: a hidden site serves an EMPTY sitemap', async () => {
    mockSitemap({hideFromSearch: true})
    expect(await sitemap()).toEqual([])
  })

  it('fail-closed: an unset hideFromSearch serves an empty sitemap', async () => {
    mockSitemap({hideFromSearch: undefined})
    expect(await sitemap()).toEqual([])
  })

  it('TECH-1: collection URLs emit in the no-slash form, off the stored full path', async () => {
    mockSitemap({attorneys: [{slug: 'attorneys/jane-doe', _updatedAt: '2026-08-01T00:00:00Z'}]})
    const listed = paths(await sitemap())
    expect(listed).toContain('/attorneys/jane-doe')
    expect(listed.every((p) => p === '/' || !p.endsWith('/'))).toBe(true)
  })

  it('lastModified falls back to build time when a document carries none', async () => {
    mockSitemap({contact: {_updatedAt: undefined as unknown as string, noIndex: false}})
    const entry = (await sitemap()).find((e) => e.url.endsWith('/contact'))
    expect(entry?.lastModified).toBeInstanceOf(Date)
  })
})
