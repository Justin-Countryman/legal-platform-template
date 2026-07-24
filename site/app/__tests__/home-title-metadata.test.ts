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

function mockQueries({seoTitle, tokens}: {seoTitle: string | null; tokens?: unknown}) {
  vi.mocked(client.fetch).mockImplementation((q: string) => {
    if (q === HOME_METADATA_QUERY) return Promise.resolve({seoTitle} as never)
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
    expect(meta.alternates).toEqual({canonical: '/'})
  })

  it('an ABSENT seoTitle emits no title, so Next falls to the root default (formula seam)', async () => {
    mockQueries({seoTitle: null})
    const meta = await generateMetadata()
    expect(meta.title).toBeUndefined()
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
