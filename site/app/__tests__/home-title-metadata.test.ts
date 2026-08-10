import {describe, it, expect, vi, beforeEach} from 'vitest'
import {parse} from 'groq-js'

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
import {SITE_HIDDEN_QUERY} from '@/lib/searchVisibility'
import {SITEWIDE_OG_IMAGE_URL} from '@/lib/socialMeta'
import {generateMetadata} from '@/app/(site)/page'

/**
 * `siteHidden` defaults to FALSE — a VISIBLE site — because the per-page
 * `noIndex`/`noFollow` rungs TECH-3 rules in are only reachable there: SEARCH-1
 * makes the site-wide switch win, so a hidden site returns the same
 * `{index: false, follow: false}` whatever the page says. The site-wide read is
 * fail-closed on an unmocked value (`lib/searchVisibility.ts`), so leaving it
 * out of this mock would silently hide every case here.
 */
function mockQueries({
  seoTitle,
  tokens,
  canonicalUrl,
  metaDescription,
  noIndex,
  noFollow,
  ogTitle,
  ogDescription,
  ogImage,
  siteHidden = false,
}: {
  seoTitle: string | null
  tokens?: unknown
  canonicalUrl?: string | null
  metaDescription?: string | null
  noIndex?: boolean | null
  noFollow?: boolean | null
  ogTitle?: string | null
  ogDescription?: string | null
  ogImage?: unknown
  siteHidden?: boolean
}) {
  vi.mocked(client.fetch).mockImplementation((q: string) => {
    if (q === HOME_METADATA_QUERY)
      return Promise.resolve({
        seoTitle,
        canonicalUrl,
        metaDescription,
        noIndex,
        noFollow,
        ogTitle,
        ogDescription,
        ogImage,
      } as never)
    if (q === NAP_TOKENS_QUERY) return Promise.resolve((tokens ?? {firmName: 'Dudley & Smith, P.A.'}) as never)
    if (q === SITE_HIDDEN_QUERY) return Promise.resolve(siteHidden as never)
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

// ─── The projection itself, which no mock in this file can reach ─────────────
//
// EVERY case below mocks `client.fetch` by query IDENTITY and answers with a
// literal object, so all of them pass whatever `HOME_METADATA_QUERY` actually
// asks Sanity for. That is `BI-SESSION-PROTOCOL` §4's "a mock encodes its
// author's belief about the system", and it is the EXACT defect item 160
// recorded: the four fields were declared, unprojected, and every gate green.
// So the query is asserted directly, against the parser Sanity ships.
describe('HOME_METADATA_QUERY projects what TECH-3 rules the homepage obeys', () => {
  const attributes = (() => {
    const found = new Set<string>()
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) return node.forEach(walk)
      if (!node || typeof node !== 'object') return
      const n = node as Record<string, unknown>
      if (n.type === 'AccessAttribute' && typeof n.name === 'string') found.add(n.name)
      if (n.type === 'ObjectAttribute' && typeof n.name === 'string') found.add(n.name)
      Object.values(n).forEach(walk)
    }
    walk(parse(HOME_METADATA_QUERY))
    return found
  })()

  it.each([
    'metaDescription',
    'noIndex',
    'noFollow',
    'canonicalUrl',
    'ogTitle',
    'ogDescription',
    'ogImageOverride',
    'seoTitle',
  ])('projects %s', (field) => {
    expect(attributes.has(field)).toBe(true)
  })
})

// ─── TECH-3: the homepage is a page like the others ──────────────────────────
//
// `BI/rules/technical-seo.md` TECH-3, ruled by Justin 2026-08-10 and built as
// that file's queue line 1, closing `OUTSTANDING.md` item 160. The homepage
// obeys `metaDescription`, `noIndex`, `noFollow` and `canonicalUrl` like every
// other page type, and emits its own social card.
//
// THE CANONICAL CASE BELOW WAS WRITTEN AND PARKED SKIPPED ON 2026-08-10,
// red-proven against the hardcoded literal rather than reasoned about:
//
//   AssertionError: expected { canonical: '/' } to deeply equal
//     - "canonical": "/minnesota-trial-lawyers"
//     + "canonical": "/"
//
// It is live from this build, unchanged except for the `.skip`. The cases
// around it were added with the build and each was red-proven the same way,
// against the route as it stood before it.
describe('homepage canonical — TECH-2 override rung (TECH-3 rules it IN)', () => {
  it('an operator canonicalUrl overrides the computed path, on both return paths', async () => {
    mockQueries({seoTitle: 'Minnesota Trial Lawyers', canonicalUrl: '/minnesota-trial-lawyers'})
    const stored = await generateMetadata()
    expect(stored.alternates).toEqual({canonical: '/minnesota-trial-lawyers'})

    mockQueries({seoTitle: null, canonicalUrl: '/minnesota-trial-lawyers'})
    const absent = await generateMetadata()
    expect(absent.alternates).toEqual({canonical: '/minnesota-trial-lawyers'})
  })
})

describe('homepage meta description — TECH-5, no formula and no fallback', () => {
  it('emits the stored value, token-resolved', async () => {
    mockQueries({
      seoTitle: 'Minnesota Trial Lawyers',
      metaDescription: 'Trial lawyers at {{firmName}}.',
      tokens: {firmName: 'Dudley & Smith, P.A.'},
    })
    const meta = await generateMetadata()
    expect(meta.description).toBe('Trial lawyers at Dudley & Smith, P.A..')
  })

  it('emits NO description key when the field is absent — the ruled outcome, not a degradation', async () => {
    mockQueries({seoTitle: 'Minnesota Trial Lawyers'})
    const meta = await generateMetadata()
    expect(meta.description).toBeUndefined()
  })
})

describe('homepage robots — TECH-3 routes the two per-page rungs through the shared helper', () => {
  it('noIndex hides the page and still follows its links', async () => {
    mockQueries({seoTitle: 'Minnesota Trial Lawyers', noIndex: true})
    const meta = await generateMetadata()
    expect(meta.robots).toEqual({index: false, follow: true})
  })

  it('noFollow is independent of noIndex', async () => {
    mockQueries({seoTitle: 'Minnesota Trial Lawyers', noFollow: true})
    const meta = await generateMetadata()
    expect(meta.robots).toEqual({index: true, follow: false})
  })

  it('neither set on a visible site emits no robots key, so the root layout stands', async () => {
    mockQueries({seoTitle: 'Minnesota Trial Lawyers'})
    const meta = await generateMetadata()
    expect(meta.robots).toBeUndefined()
  })

  it('SEARCH-1: a hidden SITE wins over an unset page rung', async () => {
    mockQueries({seoTitle: 'Minnesota Trial Lawyers', siteHidden: true})
    const meta = await generateMetadata()
    expect(meta.robots).toEqual({index: false, follow: false})
  })
})

describe('homepage social card — TECH-3 rules it IN, TECH-4 supplies the ladder', () => {
  it('emits its own og:title and og:description rather than inheriting an untitled card', async () => {
    mockQueries({
      seoTitle: 'Minnesota Trial Lawyers | Dudley & Smith, P.A.',
      metaDescription: 'Trial lawyers since 1953.',
    })
    const meta = await generateMetadata()
    // The ruling's own words: the fallback ladder produces the same strings the
    // title tag already carries.
    expect(meta.openGraph?.title).toBe('Minnesota Trial Lawyers | Dudley & Smith, P.A.')
    expect(meta.openGraph?.description).toBe('Trial lawyers since 1953.')
    expect(meta.twitter?.title).toBe('Minnesota Trial Lawyers | Dudley & Smith, P.A.')
  })

  it('the overrides win over the Search title and the meta description', async () => {
    mockQueries({
      seoTitle: 'Minnesota Trial Lawyers',
      metaDescription: 'Trial lawyers since 1953.',
      ogTitle: 'Talk to a trial lawyer today',
      ogDescription: 'Free consultation with {{firmName}}.',
      tokens: {firmName: 'Dudley & Smith, P.A.'},
    })
    const meta = await generateMetadata()
    expect(meta.openGraph?.title).toBe('Talk to a trial lawyer today')
    // Token-bearing like every other authored string, which is the half of the
    // ladder a plain override case does not reach.
    expect(meta.openGraph?.description).toBe('Free consultation with Dudley & Smith, P.A..')
  })

  // THE RULED CARVE-OUT, and the one thing the shared builder does not do on its
  // own: with no upload it generates a TITLED `/api/og?title=…`, and TECH-3 rules
  // this image byte-identical to the root layout's untitled card. This case is
  // what stops a later simplification to a bare `...buildSocialMeta(...)` from
  // changing the picture every homepage shares.
  it('with NO upload the card image stays the root layout untitled /api/og', async () => {
    mockQueries({seoTitle: 'Minnesota Trial Lawyers'})
    const meta = await generateMetadata()
    expect(meta.openGraph?.images).toEqual([
      {url: SITEWIDE_OG_IMAGE_URL, width: 1200, height: 630, alt: 'Dudley & Smith, P.A.'},
    ])
    expect(meta.twitter?.images).toEqual([SITEWIDE_OG_IMAGE_URL])
    expect(JSON.stringify(meta.openGraph?.images)).not.toContain('title=')
  })

  it('an uploaded ogImageOverride still wins, at 1200x630', async () => {
    mockQueries({
      seoTitle: 'Minnesota Trial Lawyers',
      ogImage: {asset: {_ref: 'image-abc123-1200x630-png'}, alt: 'Firm building'},
    })
    const meta = await generateMetadata()
    const images = meta.openGraph?.images as {url: string; alt: string}[]
    expect(images[0].url).toContain('abc123-1200x630')
    expect(images[0].url).not.toContain('/api/og')
    expect(images[0].alt).toBe('Firm building')
  })
})
