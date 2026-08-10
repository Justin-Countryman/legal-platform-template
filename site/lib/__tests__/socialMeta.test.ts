import {describe, expect, it} from 'vitest'
import {readFileSync} from 'node:fs'
import path from 'node:path'
import {buildSocialMeta} from '../socialMeta'
import {resolveTitle} from '../seoTitle'

/**
 * The share card, which nothing asserted until now.
 *
 * `OUTSTANDING.md` item 91 (which item 134 merged into) recorded that
 * `buildSocialMeta` had ten call sites and no test at all — a repository search
 * for `og:title` or `openGraph` across both test trees returned nothing on
 * 2026-08-02. That absence is why NAME-1's two social-share detector cells read
 * `nothing`. This file is those cells.
 *
 * WHAT IT COVERS: the override ladder, the fallbacks, the `twitter:card` value,
 * and the about-page label fix. WHAT IT DOES NOT: whether the rendered HTML
 * carries these tags. That is Next's metadata serialiser, not this code, and
 * the honest check for it is a deployed page — see
 * `BI/runbooks/site-qa.md` § Share cards.
 */

const TOKENS = {firmName: 'Dudley & Smith, P.A.', 'office.city': 'Saint Paul'}

describe('buildSocialMeta — the fallbacks (NAME-1)', () => {
  it('uses the Search title label and the meta description when nothing overrides', () => {
    const meta = buildSocialMeta('Appeals', 'We handle appeals.')
    expect(meta.openGraph?.title).toBe('Appeals')
    expect(meta.openGraph?.description).toBe('We handle appeals.')
    expect(meta.twitter?.title).toBe('Appeals')
    expect(meta.twitter?.description).toBe('We handle appeals.')
  })

  it('treats an absent overrides argument as the pre-item-91 behaviour', () => {
    const withArg = buildSocialMeta('Appeals', 'Body', null, {})
    const withoutArg = buildSocialMeta('Appeals', 'Body', null)
    expect(withArg.openGraph?.title).toBe(withoutArg.openGraph?.title)
    expect(withArg.openGraph?.description).toBe(withoutArg.openGraph?.description)
  })

  it('falls back rather than emitting an empty card title', () => {
    const meta = buildSocialMeta('Appeals', 'Body', null, {ogTitle: '   '})
    expect(meta.openGraph?.title).toBe('Appeals')
  })
})

describe('buildSocialMeta — the overrides (item 91)', () => {
  it('an ogTitle wins over the Search title label', () => {
    const meta = buildSocialMeta('Appeals', 'Body', null, {
      ogTitle: 'Lost your appeal? You may still have options.',
    })
    expect(meta.openGraph?.title).toBe('Lost your appeal? You may still have options.')
    expect(meta.twitter?.title).toBe('Lost your appeal? You may still have options.')
  })

  it('an ogDescription wins over the meta description', () => {
    const meta = buildSocialMeta('Appeals', 'Body', null, {
      ogDescription: 'A different sentence for the feed.',
    })
    expect(meta.openGraph?.description).toBe('A different sentence for the feed.')
    expect(meta.twitter?.description).toBe('A different sentence for the feed.')
  })

  it('each override is independent of the other', () => {
    const meta = buildSocialMeta('Appeals', 'Body', null, {ogTitle: 'Card title'})
    expect(meta.openGraph?.title).toBe('Card title')
    expect(meta.openGraph?.description).toBe('Body')
  })

  it('resolves NAP tokens in an override, like every other authored string', () => {
    const meta = buildSocialMeta('Appeals', 'Body', null, {
      ogTitle: 'Appeals in {{office.city}}',
      tokens: TOKENS,
    })
    expect(meta.openGraph?.title).toBe('Appeals in Saint Paul')
  })

  it('an unknown token resolves to nothing rather than leaking the shortcode', () => {
    const meta = buildSocialMeta('Appeals', 'Body', null, {
      ogTitle: 'Call {{primaryTollFree}}',
      tokens: TOKENS,
    })
    expect(meta.openGraph?.title).not.toContain('{{')
  })
})

describe('buildSocialMeta — twitter:card', () => {
  // Next types `twitter` as a union whose other members have no `card`, so the
  // read is narrowed here rather than asserted through an optional chain that
  // would silently be `undefined` on the wrong member.
  const cardOf = (meta: ReturnType<typeof buildSocialMeta>) =>
    (meta.twitter as {card?: string} | null | undefined)?.card

  it('is summary_large_image, always', () => {
    // Emitted unconditionally. A missing card type makes X render the small
    // summary card, which crops a 1200x630 image to a square thumbnail.
    expect(cardOf(buildSocialMeta('t', 'd'))).toBe('summary_large_image')
    expect(cardOf(buildSocialMeta('t', 'd', null, {ogTitle: 'x'})))
      .toBe('summary_large_image')
  })

  it('carries an image on both the openGraph and the twitter slice', () => {
    const meta = buildSocialMeta('Appeals', 'Body')
    expect(meta.openGraph?.images).toHaveLength(1)
    expect(meta.twitter?.images).toHaveLength(1)
  })
})

describe('the about page label (item 91, the divergence it recorded)', () => {
  const ABOUT = 'About Dudley & Smith, P.A. - Saint Paul Law Firm'

  it('the complete-title path labels the card with the FULL title', () => {
    // It returned the bare page name until 2026-08-09, so /about emitted an
    // og:title of "About" against that title tag. This is the regression pin.
    const {title, label} = resolveTitle(null, 'About', null, 'Dudley & Smith, P.A.', ABOUT)
    expect(title?.absolute).toBe(ABOUT)
    expect(label).toBe(ABOUT)
    expect(label).not.toBe('About')
  })

  it('the card built from it says the whole thing', () => {
    const {label} = resolveTitle(null, 'About', null, 'Dudley & Smith, P.A.', ABOUT)
    expect(buildSocialMeta(label, 'Body').openGraph?.title).toBe(ABOUT)
  })

  it('the two ORDINARY paths are unchanged, which is what keeps this narrow', () => {
    // The old reasoning's real concern — passing the whole title everywhere
    // would change every card on the site — still holds and is still honoured.
    const cell = resolveTitle('Appeals - Dudley & Smith, P.A.', 'Appeals', null, 'Dudley & Smith, P.A.')
    expect(cell.label).toBe('Appeals - Dudley & Smith, P.A.')

    const formula = resolveTitle(null, 'Appeals', null, 'Dudley & Smith, P.A.')
    expect(formula.title?.absolute).toBe('Appeals - Dudley & Smith, P.A.')
    expect(formula.label).toBe('Appeals')
  })

  it('an ogTitle still overrides the about page, like any other page', () => {
    const {label} = resolveTitle(null, 'About', null, 'Dudley & Smith, P.A.', ABOUT)
    const meta = buildSocialMeta(label, 'Body', null, {ogTitle: 'Meet the firm'})
    expect(meta.openGraph?.title).toBe('Meet the firm')
  })
})

describe('every page query projects the override fields', () => {
  /**
   * The gap this closes is the one item 91's design opens: the fields exist on
   * 22 document types, but a card only sees them if the page's own GROQ asks
   * for them. A new page type whose query copies an older one would ship with
   * the override silently inert — the operator fills the field in, saves, and
   * the card does not change.
   *
   * A text scan on the shared query module, deliberately. The alternative is
   * parsing 57 queries with groq-js to inspect their projections, which is more
   * machinery than the claim needs.
   *
   * THE SIGNATURE IS `seoTitle,` FOLLOWED BY `metaDescription,`, not
   * `metaDescription,` alone, and getting that wrong is what the first draft
   * did. Two queries — BLOG_POSTS_QUERY and BLOG_CATEGORY_POSTS_QUERY — project
   * `metaDescription` as a CARD BLURB rather than as page metadata, and they
   * must NOT gain the override fields: those cards are not share cards and have
   * no `og:` anything. Only a query that also asks for `seoTitle` is producing
   * a page's metadata.
   */
  const source = readFileSync(
    path.join(__dirname, '..', 'sanity', 'queries.ts'), 'utf8')
  const lines = source.split('\n')
  const pageMetadataProjections = lines
    .map((line, i) => ({line, i}))
    .filter(({line, i}) =>
      line === '    seoTitle,' && lines[i + 1] === '    metaDescription,')

  it('pairs every page-metadata projection with ogTitle and ogDescription', () => {
    const missing = pageMetadataProjections
      .filter(({i}) => lines[i + 2].trim() !== 'ogTitle,'
                    || lines[i + 3].trim() !== 'ogDescription,')
      .map(({i}) => i + 1)
    expect(missing).toEqual([])
  })

  it('is actually looking at something', () => {
    // Guard the guard: a scan that matches nothing reports success.
    expect(pageMetadataProjections.length).toBeGreaterThanOrEqual(16)
  })

  it('leaves the two card-blurb queries alone', () => {
    // Named rather than merely excluded, so a future reader knows the omission
    // is a decision. A blog card is not a share card.
    for (const query of ['BLOG_POSTS_QUERY', 'BLOG_CATEGORY_POSTS_QUERY']) {
      const start = source.indexOf(`export const ${query} =`)
      expect(start).toBeGreaterThan(-1)
      const body = source.slice(start, source.indexOf('export const', start + 10))
      expect(body).toContain('metaDescription,')
      expect(body).not.toContain('ogTitle,')
    }
  })
})
