/**
 * TITLE-9 AT ITS CALL SITE, not at its formula.
 *
 * Doctrine: `BI-Content.md` TITLE-9.
 *
 * WHY THIS EXISTS, and it is the whole point of the file. `serviceAreaPageName`
 * was already covered by `lib/__tests__/seoTitleFormulas.test.ts`, and every one
 * of those cases hands it a bare city (`'Woodbury'`). The catch-all route handed
 * it `page.title` instead. That was the same string until 2026-07-28, when the
 * service area ruling made the stored Name `{city} Law Firm` rather than the
 * bare city — and the formula appends `Law Firm` itself, so the composed title
 * became `Blaine Law Firm Law Firm`.
 *
 * **A FORMULA TEST CANNOT SEE THIS.** It asserts what the function does with the
 * argument the test chooses, and the defect was in which argument the route
 * chooses. So this drives `generateMetadata` and reads the title off the result.
 *
 * THE FIXTURE IS THE REAL STORED SHAPE, read live from `5gmxring/production` on
 * 2026-07-31 rather than composed here: `title` is `Blaine Law Firm`, the slug
 * carries the ruled `-law-firm` suffix, and `seoTitle` is what varies between
 * the two cases below. A fixture invented to match the code would have encoded
 * the same belief the code did.
 */

import {describe, it, expect, vi, beforeEach} from 'vitest'

vi.mock('@/lib/sanity/client', () => ({
  client: {fetch: vi.fn()},
}))

import {client} from '@/lib/sanity/client'
import {
  PRACTICE_AREA_QUERY,
  LOCATION_PAGE_QUERY,
  CONTENT_PAGE_QUERY,
  NAP_TOKENS_QUERY,
} from '@/lib/sanity/queries'
import {generateMetadata} from '@/app/(site)/[...slug]/page'

const FIRM = 'Dudley & Smith, P.A.'

/** Dudley's real service area document, minus the SEO Title cell. */
const BLAINE = {
  _type: 'serviceAreaPage',
  title: 'Blaine Law Firm',
  slug: 'service-area/blaine-law-firm',
  seoTitle: null,
  metaDescription: null,
  canonicalUrl: null,
  noIndex: false,
  noFollow: false,
  parentPage: null,
  areasOfLaw: [] as string[],
}

function driveFetch(page: Record<string, unknown>) {
  vi.mocked(client.fetch).mockImplementation((async (query: string) => {
    if (query === PRACTICE_AREA_QUERY) return page
    if (query === LOCATION_PAGE_QUERY) return null
    if (query === CONTENT_PAGE_QUERY) return null
    if (query === NAP_TOKENS_QUERY) return {firmName: FIRM, locations: []}
    return null
  }) as never)
}

async function titleFor(page: Record<string, unknown>): Promise<string | undefined> {
  driveFetch(page)
  const meta = await generateMetadata({
    params: Promise.resolve({slug: ['service-area', 'blaine-law-firm']}),
  })
  const t = meta.title as {absolute?: string} | undefined
  return t?.absolute
}

beforeEach(() => {
  vi.mocked(client.fetch).mockReset()
})

describe('TITLE-9: the route passes the CITY to the formula', () => {
  it('composes the city once, on a page with no SEO Title cell', async () => {
    // The reachable case. Before the fix this returned
    // `Blaine Law Firm Law Firm - Dudley & Smith, P.A.`
    expect(await titleFor(BLAINE)).toBe('Blaine Law Firm - Dudley & Smith, P.A.')
  })

  it('composes the city and the phrase once, for a lone phrased area', async () => {
    expect(await titleFor({...BLAINE, areasOfLaw: ['Family Law']}))
      .toBe('Blaine Family Law Attorney - Dudley & Smith, P.A.')
  })

  it('never repeats the page Name inside the composed title', async () => {
    // The defect stated as a property rather than as one string, so a future
    // change of shape cannot reintroduce it under a different wording.
    const title = (await titleFor(BLAINE)) ?? ''
    expect(title.match(/Law Firm/g) ?? []).toHaveLength(1)
  })

  it('falls back to the stored Name when the slug carries no ruled suffix', async () => {
    // `cityFromServiceAreaSlug` returns '' rather than guessing, the formula
    // returns '' in turn, and the route's fallback chain lands on `page.title`.
    // A plain title, never a doubled one.
    expect(await titleFor({...BLAINE, slug: 'service-area/blaine'}))
      .toBe('Blaine Law Firm - Dudley & Smith, P.A.')
  })

  it('a stored SEO Title cell still wins, which is why Dudley never rendered the defect', async () => {
    // TITLE-1. All nine Dudley rows carry a cell, so the formula above is not
    // reached on that client and no rendered title was ever wrong. This pins the
    // reason the defect was latent, so a future reader does not read the fix as
    // evidence the site was broken.
    expect(await titleFor({...BLAINE, seoTitle: 'Blaine Attorneys | Dudley & Smith'}))
      .toBe('Blaine Attorneys | Dudley & Smith')
  })
})
