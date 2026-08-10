import {describe, it, expect, vi, beforeEach} from 'vitest'

/**
 * `BI/rules/technical-seo.md` build queue 11 — the `reviewPage` gap, found
 * during item 91's build and not acted on until 2026-08-10.
 *
 * Four things were wrong with one route at once, and each belongs to a
 * different rule: a projected `seoTitle` the schema does not declare; no social
 * card, which TECH-4 requires of every page; no canonical, which TECH-2 names a
 * DEFECT on this route rather than an exemption; and no `metaDescription` field
 * on the type at all, so TECH-5 is unreachable here rather than satisfied here.
 *
 * ALL FOUR HAVE NOW LANDED. Three went on 2026-08-10; the fourth is a SCHEMA
 * change and was parked skipped that day because `sanity schema extract` threw
 * CorsOriginError against this repository's placeholder project id before
 * writing anything, so `studio/schema.json` and the generated types could not be
 * regenerated and CI fails a build whose committed copies are stale. Adding the
 * field without them would have traded one silent gap for a red gate. That
 * blocker is fixed (monorepo OUTSTANDING item 165 — extraction runs offline
 * now), the field landed, and the parked case is live.
 *
 * THE CANONICAL IS THE ONE WORTH READING TWICE. `proxy.ts` rewrites `/review-*`
 * onto `/review/[slug]` and the browser URL never changes, so the internal path
 * is the one address this page must not name — and it is the address a build
 * that reasoned from the file tree would pick.
 *
 * Red-proven against the route as it stood before the build: every case here
 * fails except the two that assert what the build deliberately did not change,
 * and those pass on both sides, which is what says so.
 */
vi.mock('@/lib/sanity/client', () => ({client: {fetch: vi.fn()}}))

import {client} from '@/lib/sanity/client'
import {REVIEW_PAGE_QUERY, NAP_TOKENS_QUERY} from '@/lib/sanity/queries'
import {SITE_HIDDEN_QUERY} from '@/lib/searchVisibility'
import {generateMetadata} from '@/app/review/[slug]/page'

const SLUG = 'review-us-maple-grove'

function mockReview({
  metaDescription,
  title = 'Review Maple Grove',
  noIndex = true,
  siteHidden = false,
}: {
  metaDescription?: string | null
  title?: string
  noIndex?: boolean
  siteHidden?: boolean
} = {}) {
  vi.mocked(client.fetch).mockImplementation((q: string) => {
    if (q === REVIEW_PAGE_QUERY)
      return Promise.resolve({
        page: {h1: 'Review Our Maple Grove Office', title, slug: SLUG, metaDescription, noIndex, noFollow: false},
      } as never)
    if (q === NAP_TOKENS_QUERY) return Promise.resolve({firmName: 'Dudley & Smith, P.A.'} as never)
    if (q === SITE_HIDDEN_QUERY) return Promise.resolve(siteHidden as never)
    return Promise.resolve(null as never)
  })
}

const meta = () => generateMetadata({params: Promise.resolve({slug: SLUG})})

beforeEach(() => vi.mocked(client.fetch).mockReset())

describe('TECH-2: the review route carries a self-referencing canonical', () => {
  it('names the PUBLIC url, which is the bare slug and not the internal path', async () => {
    mockReview()
    const result = await meta()
    expect(result.alternates).toEqual({canonical: `/${SLUG}`})
    expect(JSON.stringify(result.alternates)).not.toContain('/review/')
  })

  it('a noIndex page carries one too — the two answer different questions', async () => {
    mockReview({noIndex: true})
    const result = await meta()
    expect(result.robots).toEqual({index: false, follow: true})
    expect(result.alternates).toEqual({canonical: `/${SLUG}`})
  })
})

describe('the dead projection is gone', () => {
  it('REVIEW_PAGE_QUERY no longer projects the seoTitle this type does not declare', () => {
    expect(REVIEW_PAGE_QUERY).not.toContain('seoTitle')
  })

  // TECH-5 proper now, rather than the type's gap. Until 2026-08-10 this case
  // read "the type still has no field to read"; the field exists, and what it
  // pins is the rule — a page with no meta description emits none. The `''`
  // that `resolveTokenString` answers for an absent field must not become a
  // blank tag, which is what `|| undefined` on the route is for.
  it('and a page with no meta description still emits none', async () => {
    mockReview()
    expect((await meta()).description).toBeUndefined()
  })
})

// ─── TECH-5's half of queue line 11, UNPARKED 2026-08-10 ─────────────────────
//
// These two cases sat `.skip`ped because the fix is a SCHEMA change and
// `sanity schema extract` could not run here: it threw CorsOriginError against
// the placeholder project id before writing, so `studio/schema.json` and
// `site/types/sanity.types.ts` could not be regenerated, and CI fails a build
// whose committed copies are stale. Adding the field without them would have
// traded one silent gap for a red gate.
//
// That blocker is gone (monorepo OUTSTANDING item 165): extraction now runs
// offline against the local schema files. The field, the projection and the
// route read all landed, both artifacts were regenerated, and the `.skip` came
// off. Red-proven twice — once on 2026-08-10 with the field in place locally
// before it was reverted, and again at this build against the route as it stood
// without the projection.
describe('TECH-5: the meta description reaches this type too', () => {
  it('emits the stored value, token-resolved, and feeds the card body', async () => {
    mockReview({metaDescription: 'Tell {{firmName}} how we did.'})
    const result = await meta()
    expect(result.description).toBe('Tell Dudley & Smith, P.A. how we did.')
    expect(result.openGraph?.description).toBe('Tell Dudley & Smith, P.A. how we did.')
  })

  it('projects the field, which no mock in this file can prove on its own', () => {
    expect(REVIEW_PAGE_QUERY).toContain('metaDescription')
  })
})

describe('TECH-4: the review route emits a card like every other page', () => {
  it('falls back to the Search title label for the card title', async () => {
    mockReview()
    const result = await meta()
    expect(result.openGraph?.title).toBe('Review Maple Grove')
    expect((result.twitter as {card?: string} | null)?.card).toBe('summary_large_image')
  })

  it('generates its card image, since this type carries no upload field', async () => {
    mockReview()
    const images = (await meta()).openGraph?.images as {url: string}[]
    expect(images[0].url).toContain('/api/og?title=')
  })
})

describe('what the build deliberately did not change', () => {
  it('NAME-2 still supplies the title from the Name, not from the H1', async () => {
    mockReview()
    // `Review Maple Grove`, not the H1's `Review Our Maple Grove Office`.
    expect((await meta()).title).toEqual({absolute: 'Review Maple Grove - Dudley & Smith, P.A.'})
  })

  it('a missing page still yields empty metadata rather than a canonical to nowhere', async () => {
    vi.mocked(client.fetch).mockResolvedValue(null as never)
    expect(await meta()).toEqual({})
  })
})
