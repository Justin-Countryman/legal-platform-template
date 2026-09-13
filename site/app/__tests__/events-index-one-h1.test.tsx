import {describe, it, expect, vi, beforeEach} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'

// THE EVENTS INDEX SERVES ONE H1.
//
// Monorepo `OUTSTANDING.md` item 280, found by the Verify stage's first run on
// Yanowitz (2026-09-11): the page carried the hero heading AND a second `<h1>`
// over the upcoming list, so `H1 count` held on `/events` ([R-182]). The
// assertion is on the rendered markup, not the source: what has to stay true
// is that a visitor's page has exactly one `<h1>`, whichever element renders it.

vi.mock('@/lib/sanity/client', () => ({
  client: {fetch: vi.fn()},
}))

import {client} from '@/lib/sanity/client'
import {EVENT_INDEX_PAGE_QUERY, EVENT_INDEX_QUERY, SITE_CHROME_QUERY} from '@/lib/sanity/queries'
import EventsIndexPage from '@/app/(site)/events/page'

const inAYear = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString()
const aYearAgo = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString()

beforeEach(() => {
  vi.mocked(client.fetch).mockReset()
  vi.mocked(client.fetch).mockImplementation(async (query: unknown) => {
    if (query === EVENT_INDEX_PAGE_QUERY) {
      return {_type: 'eventIndex', pageName: 'Events', hero: {heading: 'Events'}} as never
    }
    if (query === EVENT_INDEX_QUERY) {
      return [
        {slug: 'events/estate-planning-101', title: 'Estate Planning 101', eventDate: inAYear},
        {slug: 'events/probate-basics', title: 'Probate Basics', eventDate: aYearAgo},
      ] as never
    }
    // NAP tokens and the global CTA ride the site chrome since 2026-09-13.
    if (query === SITE_CHROME_QUERY) return {nap: {firmName: 'Example Firm'}, globalCta: null} as never
    return null as never
  })
})

describe('the events index (item 280)', () => {
  it('renders exactly one <h1>, the hero heading, with an upcoming and a past section', async () => {
    const html = renderToStaticMarkup(await EventsIndexPage())
    const h1s = html.match(/<h1\b/g) ?? []
    expect(h1s).toHaveLength(1)
    expect(html).toContain('Upcoming Events')
    expect(html).toContain('Past Events')
    // The list headings are section headings, one level under the page's H1.
    expect(html).toMatch(/<h2[^>]*>Upcoming Events<\/h2>/)
  })
})
