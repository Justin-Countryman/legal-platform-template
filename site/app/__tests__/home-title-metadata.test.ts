import {describe, it, expect, vi, beforeEach} from 'vitest'

// The homepage <title> contract (item 32/44 ruling, 2026-07-24): a STORED
// seoTitle carries through VERBATIM as title.absolute — no firm-name suffix,
// because a homepage seoTitle already contains the firm name and the root
// template would double it. ABSENT → no title (Next falls to the root
// title.default = bare firm name, which is the from-scratch formula's
// "lead with firm name" shape; the other shape is a marked seam in the route).
vi.mock('@/lib/sanity/client', () => ({
  client: {fetch: vi.fn()},
}))

import {client} from '@/lib/sanity/client'
import {HOME_METADATA_QUERY, NAP_TOKENS_QUERY} from '@/lib/sanity/queries'
import {generateMetadata} from '@/app/(site)/page'

function mockQueries({
  seoTitle,
  tokens,
  canonicalUrl,
}: {seoTitle: string | null; tokens?: unknown; canonicalUrl?: string | null}) {
  vi.mocked(client.fetch).mockImplementation((q: string) => {
    if (q === HOME_METADATA_QUERY) return Promise.resolve({seoTitle, canonicalUrl} as never)
    if (q === NAP_TOKENS_QUERY) return Promise.resolve((tokens ?? {firmName: 'Dudley & Smith, P.A.'}) as never)
    return Promise.resolve(null as never)
  })
}

beforeEach(() => vi.mocked(client.fetch).mockReset())

describe('homepage <title> — carry-through + absolute (item 32/44)', () => {
  it('a stored seoTitle renders VERBATIM as title.absolute (no firm-name suffix)', async () => {
    // Dudley's live value is the stale placeholder "t"; use a value that proves
    // the point — a real Screaming Frog homepage title that already carries the
    // firm name, exactly the doubling case the ruling targets.
    mockQueries({seoTitle: 'Minnesota Trial Lawyers | Dudley & Smith, P.A.'})
    const meta = await generateMetadata()
    expect(meta.title).toEqual({absolute: 'Minnesota Trial Lawyers | Dudley & Smith, P.A.'})
    // NOT a bare string — a bare string takes the root "%s - <firm>" template
    // branch and would double the firm name.
    expect(typeof meta.title).not.toBe('string')
    // NO OVERRIDE SET, which is the only thing this pin claims. See the note
    // above the skipped describe below: this assertion said `{canonical: '/'}`
    // unconditionally until 2026-08-10 and was pinning, in green, the exact
    // answer TECH-3 ruled must change. `/` stays correct for the DEFAULT after
    // the build too, because the override is absent here.
    expect(meta.alternates).toEqual({canonical: '/'})
  })

  it('an ABSENT seoTitle emits no title, so Next falls to the root default (formula seam)', async () => {
    mockQueries({seoTitle: null})
    const meta = await generateMetadata()
    expect(meta.title).toBeUndefined()
    // The default again, with no override set. Same note as above.
    expect(meta.alternates).toEqual({canonical: '/'})
  })

  it('an empty-string seoTitle is treated as absent (no dangling separator)', async () => {
    mockQueries({seoTitle: '   '})
    const meta = await generateMetadata()
    expect(meta.title).toBeUndefined()
  })

  it('resolves tokens in the stored seoTitle before carrying it through', async () => {
    mockQueries({seoTitle: 'Trusted Counsel — {{firmName}}', tokens: {firmName: 'Dudley & Smith, P.A.'}})
    const meta = await generateMetadata()
    expect(meta.title).toEqual({absolute: 'Trusted Counsel — Dudley & Smith, P.A.'})
  })
})

// ─── TECH-3's canonical override — the case, parked until the build ──────────
//
// WHY THIS IS SKIPPED AND NOT DELETED, AND WHY IT IS NOT RUNNING.
// `BI/rules/technical-seo.md` TECH-3 rules that the homepage honours
// `canonicalUrl` like every other page type. TECH-3's status is doctrine-only:
// the route hardcodes `alternates: {canonical: '/'}` on both return paths and
// `HOME_METADATA_QUERY` does not project the field, so the ruled behaviour does
// not exist yet and this case cannot pass. The build is that file's queue
// line 1, and TECH-3's detector cell names THIS file as where the case rides.
//
// RED-PROVEN 2026-08-10, running rather than reasoned, so this is not a case
// that would pass vacuously once un-skipped:
//
//   AssertionError: expected { canonical: '/' } to deeply equal
//     - "canonical": "/minnesota-trial-lawyers"
//     + "canonical": "/"
//
// It fails on the one thing the ruling changes and on nothing else. When queue
// line 1 lands — project the field, then `home?.canonicalUrl ?? '/'` in place
// of the two literals, the shape every other route already uses — delete the
// `.skip` and this goes green with no other edit.
describe.skip('homepage canonical — TECH-2 override rung (TECH-3 rules it IN)', () => {
  it('an operator canonicalUrl overrides the computed path, on both return paths', async () => {
    mockQueries({seoTitle: 'Minnesota Trial Lawyers', canonicalUrl: '/minnesota-trial-lawyers'})
    const stored = await generateMetadata()
    expect(stored.alternates).toEqual({canonical: '/minnesota-trial-lawyers'})

    mockQueries({seoTitle: null, canonicalUrl: '/minnesota-trial-lawyers'})
    const absent = await generateMetadata()
    expect(absent.alternates).toEqual({canonical: '/minnesota-trial-lawyers'})
  })
})
