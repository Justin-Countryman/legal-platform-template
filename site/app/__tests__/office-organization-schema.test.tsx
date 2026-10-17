import {describe, it, expect, vi, beforeEach} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'

// Monorepo backlog 517, read 2026-10-16: an office's hours name their days as schema.org DayOfWeek values (Google's
// LocalBusiness guidance lists https://schema.org/Monday; "Mo" is none), and the street address carries the suite
// (Google's PostalAddress example), not the building's name. Held at the routes, not only at the helper (ADV-517).

vi.mock('@/lib/sanity/client', () => ({client: {fetch: vi.fn()}}))
// The root layout imports its stylesheet; stubbed as root-layout-metadata.test.ts does.
vi.mock('@/app/globals.css', () => ({}))
vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('notFound') },
  permanentRedirect: () => { throw new Error('permanentRedirect') },
  redirect: () => { throw new Error('redirect') },
}))

import {client} from '@/lib/sanity/client'
import * as Q from '@/lib/sanity/queries'
import CatchAllPage from '@/app/(site)/[...slug]/page'
import {buildOrganizationSchema} from '@/app/layout'

const CHROME = {nap: {firmName: 'Example Firm', locations: []}, designTokens: null, globalCta: null}
const LOCATION = {_id: 'location-springfield', city: 'Springfield', state: 'IL', zip: '62701',
  address1: '1 Main St', address2: 'Suite 200', address3: 'Arbor Lakes Professional Center', officePhone: '2175550100',
  hours: {mondayStatus: 'Open', mondayOpen: '08:30', mondayClose: '17:00', tuesdayStatus: 'Closed'}}

beforeEach(() => vi.mocked(client.fetch).mockReset())

function jsonLd(html: string): Record<string, unknown>[] {
  return [...html.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1]))
}

describe('the office node and the firm', () => {
  it('a location page names its days as DayOfWeek values and keeps the suite in its street address', async () => {
    vi.mocked(client.fetch).mockImplementation((async (query: string) => {
      if (query === Q.SITE_CHROME_QUERY) return CHROME
      if (query === Q.CATCH_ALL_PAGE_QUERY) return {_id: 'locationPage-springfield-law-firm', _type: 'locationPage',
        title: 'Springfield Law Office', slug: 'springfield-law-firm', locationData: LOCATION}
      return null
    }) as never)
    const html = renderToStaticMarkup(await CatchAllPage({params: Promise.resolve({slug: ['springfield-law-firm']})} as never))
    const office = jsonLd(html).find((n) => n['@type'] === 'LegalService')!
    expect((office.address as Record<string, unknown>).streetAddress).toBe('1 Main St, Suite 200')
    expect(office.openingHoursSpecification).toEqual([
      {'@type': 'OpeningHoursSpecification', dayOfWeek: 'https://schema.org/Monday', opens: '08:30', closes: '17:00'},
    ])
  })

  it("the firm's Organization keeps the suite", () => {
    const node = buildOrganizationSchema({firmName: 'Example Firm', address: {address1: '1 Main St', address2: 'Suite 200',
      city: 'Springfield', state: 'IL', zip: '62701'}} as never) as Record<string, unknown>
    expect((node.address as Record<string, unknown>).streetAddress).toBe('1 Main St, Suite 200')
  })
})
