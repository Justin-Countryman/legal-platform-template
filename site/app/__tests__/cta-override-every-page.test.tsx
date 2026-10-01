import {describe, it, expect, vi, beforeEach} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'

// EVERY PAGE'S CLOSE KEEPS THE SITE CLOSE'S FIELDS ITS OVERRIDE LEAVES EMPTY.
//
// Phase 18 session 1's ledger (2026-09-30): GROQ answers an unset override field as null, and each page merged
// `{...global, ...override}`, so an override holding only a heading drew the close with no line and no button.
// Each route renders here with its override exactly as GROQ answers it for a heading-only override; the site
// close's line and button must still be on the page. `lib/__tests__/ctaOverride.test.ts` holds the merge itself.

vi.mock('@/lib/sanity/client', () => ({
  client: {fetch: vi.fn()},
}))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('notFound')
  },
  permanentRedirect: () => {
    throw new Error('permanentRedirect')
  },
  redirect: () => {
    throw new Error('redirect')
  },
}))

import {client} from '@/lib/sanity/client'
import * as Q from '@/lib/sanity/queries'
import {ROUTES, type Route} from './fixtures/closeRoutes'

const SITE_LINE = 'No obligation, and the call is confidential.'
const SITE_BUTTON = 'Speak With an Attorney'
const PAGE_HEADING = 'Your plan starts with one meeting'

/** A heading-only override, as GROQ's CTA_OVERRIDE_FRAGMENT answers it. */
const HEADING_ONLY = {tagline: null, heading: PAGE_HEADING, description: null, buttons: null}

const CHROME = {
  nap: {firmName: 'Example Firm', locations: []},
  designTokens: null,
  globalCta: {
    layout: 'centered',
    tagline: 'Free consultation',
    heading: 'Talk to someone today',
    description: SITE_LINE,
    buttons: [{title: SITE_BUTTON, url: '/contact/', variant: 'primary'}],
    formEmbed: null,
  },
}

function serve(route: Route) {
  vi.mocked(client.fetch).mockImplementation((async (query: string) => {
    if (query === Q.SITE_CHROME_QUERY) return CHROME
    if (query === route.query) return {...route.doc, [route.key]: HEADING_ONLY}
    if (query === Q.RELATED_POSTS_QUERY) return {byCategory: [], recent: []}
    return []
  }) as never)
}

beforeEach(() => {
  vi.mocked(client.fetch).mockReset()
})

describe('every page keeps the site close for what its override leaves empty', () => {
  it.each(ROUTES.map((r) => [r.name, r] as const))('%s', async (_name, route) => {
    serve(route)
    const html = renderToStaticMarkup(await route.render())
    expect(html).toContain(PAGE_HEADING)
    expect(html).toContain(SITE_LINE)
    expect(html).toContain(SITE_BUTTON)
  })
})
