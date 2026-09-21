import {type SiteLook} from '@/components/sections/sectionFrame'
import {describe, expect, it, vi} from 'vitest'
import {forwardRef} from 'react'
import {render} from '@testing-library/react'

// ─── The seam walk, end to end through both dispatchers ──────────────────────
//
// Phase 13 (WS-V1-PHASE13-DESIGN §7 amendments 1, 2, 3, 10). What is pinned:
//
//   - two same-ground neighbours get ONE padding at the join;
//   - a different ground gets both, as before;
//   - a `compact` band opts out;
//   - a ribbon with NO stored spacing opts out too, which is the case the
//     record's own predicate got wrong and the case the composer writes;
//   - an INVISIBLE band leaves no wrapper AND does not become the previous
//     band (item 312);
//   - the first SURVIVING band gets no ScrollReveal, which is the live
//     first-block motion bug an empty section at index 0 caused;
//   - a divider is placed by the rule (Phase 16C, `[R-481]`): a rise under the hero, a
//     cut into every dark or saturated section, never into a photo band, and the band
//     below gains the space the shape takes;
//   - an inset band seams against another inset band whatever their surfaces.

vi.mock('next/link', () => ({
  // eslint-disable-next-line react/display-name
  default: forwardRef<HTMLAnchorElement, {href: string; children: React.ReactNode; className?: string}>(
    ({href, children, ...rest}, ref) => <a ref={ref} href={href} {...rest}>{children}</a>,
  ),
}))
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({src, alt, className}: {src: string; alt?: string; className?: string}) => <img src={src} alt={alt ?? ''} className={className} />,
}))
// ScrollReveal renders a bare <div> in its `unset` phase, so in jsdom it is
// indistinguishable from the plain wrapper the first band gets. Marked here so
// the first-block motion rule can actually be asserted rather than inferred.
vi.mock('@/components/ui/ScrollReveal', () => ({
  ScrollReveal: ({children}: {children: React.ReactNode}) => <div data-scroll-reveal="">{children}</div>,
}))

import {HomepageCanvas, type HomepageBlock} from '@/components/layout/HomepageCanvas'
import {PageSections, type PageSectionData} from '../PageSections'
import {walkFrame, NO_SEAM} from '../sectionFrame'
import {SECTION_SPACING} from '@/lib/sectionSurface'

const tokens = {firmName: 'Acme Law', firmNameShort: 'Acme', primaryPhone: null, primaryTollFree: null}

// A minimal content-section member: a statement needs only a heading.
function band(key: string, appearance?: Record<string, unknown>, extra?: Record<string, unknown>): HomepageBlock {
  return {
    _type: 'contentSectionInline',
    _key: key,
    layout: 'statement',
    heading: `Band ${key}`,
    appearance,
    ...extra,
  } as unknown as HomepageBlock
}

/** An empty band: a badges section with no badges renders null INSIDE itself,
 *  which is the case `renderBlock` could never see. */
function emptyBadges(key: string): HomepageBlock {
  return {_type: 'badgesSectionInline', _key: key, heading: 'Awards', badges: []} as unknown as HomepageBlock
}

const canvas = (blocks: HomepageBlock[]) =>
  render(<HomepageCanvas blocks={blocks} napTokens={tokens} resultsDisclaimer="Past results do not guarantee a future outcome." />)

const sectionsOf = (container: HTMLElement) => Array.from(container.querySelectorAll('section'))
const SEAM = SECTION_SPACING.normal.seamTop.split(/\s+/)[0] // 'pt-8'
const FULL = SECTION_SPACING.normal.top.split(/\s+/)[0] // 'pt-16'

describe('two neighbours', () => {
  it('on the same ground, the second takes the halved top padding', () => {
    const {container} = canvas([band('a', {surface: 'light'}), band('b', {surface: 'light'})])
    const [first, second] = sectionsOf(container)
    expect(first.className).toContain(FULL)
    expect(second.className).toContain(SEAM)
    expect(second.className).not.toContain(FULL)
  })

  it('on different grounds, both keep their full padding', () => {
    const {container} = canvas([band('a', {surface: 'light'}), band('b', {surface: 'dark'})])
    for (const el of sectionsOf(container)) expect(el.className).toContain(FULL)
  })

  it('muted seams only with muted: a stored accent beside tint or light keeps its full padding', () => {
    // Phase 14. Phase 13 treated accent (bg-muted) and tint (bg-hero-tint) as one
    // ground and halved the padding between two different colors.
    const {container} = canvas([band('a', {surface: 'accent'}), band('b', {surface: 'muted'})])
    expect(sectionsOf(container)[1].className).toContain(SEAM)
    const {container: c2} = canvas([band('a', {surface: 'accent'}), band('b', {surface: 'tint'})])
    expect(sectionsOf(c2)[1].className).toContain(FULL)
    const {container: c3} = canvas([band('a', {surface: 'accent'}), band('b', {surface: 'light'})])
    expect(sectionsOf(c3)[1].className).toContain(FULL)
  })

  it('a compact band opts out of the seam', () => {
    const {container} = canvas([band('a', {surface: 'light'}), band('b', {surface: 'light', spacing: 'compact'})])
    const second = sectionsOf(container)[1]
    expect(second.className).toContain(SECTION_SPACING.compact.seamTop.split(/\s+/)[0])
  })

  it('a ribbon with NO stored spacing renders compact and seams on the compact scale', () => {
    // The record's predicate read the stored `undefined` and would have applied
    // the normal seam to a band the component renders compact. This is the shape
    // `compose_canvas` writes: no surface, no spacing (item 308).
    const ribbon = {_type: 'contentSectionInline', _key: 'r', layout: 'ribbon', heading: 'A ribbon'} as unknown as HomepageBlock
    const {container} = canvas([band('a'), ribbon])
    const second = sectionsOf(container)[1]
    // Compact's own presets, not normal's. `lg:pb-28` and `lg:pt-14` exist only
    // on the normal preset, so their absence is the proof; compact's bottom is
    // `pb-12 md:pb-16`, which is why a bare `pb-16` check would be wrong.
    expect(second.className).toContain('pb-12 md:pb-16')
    expect(second.className).not.toContain('lg:pb-28')
    expect(second.className).toContain('pt-6 md:pt-8')
    expect(second.className).not.toContain('lg:pt-14')
  })
})

describe('an invisible band (item 312)', () => {
  it('leaves no wrapper on the homepage', () => {
    const {container} = canvas([band('a'), emptyBadges('x'), band('b')])
    expect(sectionsOf(container)).toHaveLength(2)
    // No empty div between them. Every direct child holds a section.
    const kids = Array.from(container.children)
    expect(kids).toHaveLength(2)
    for (const kid of kids) expect(kid.querySelector('section')).not.toBeNull()
  })

  it('does not become the previous band: its neighbours still seam to each other', () => {
    const {container} = canvas([band('a', {surface: 'dark'}), emptyBadges('x'), band('b', {surface: 'dark'})])
    // Without the walk, band b would compare against the badges section's ground
    // (pattern -> page) and take a full padding.
    expect(sectionsOf(container)[1].className).toContain(SEAM)
  })

  it('two empties in a row are both skipped', () => {
    const {container} = canvas([band('a'), emptyBadges('x'), emptyBadges('y'), band('b')])
    expect(sectionsOf(container)).toHaveLength(2)
    expect(Array.from(container.children)).toHaveLength(2)
  })
})

describe('the first-block motion rule', () => {
  it('never wraps the first band when the list is clean', () => {
    const {container} = canvas([band('a'), band('b'), band('c')])
    expect(container.children[0].hasAttribute('data-scroll-reveal')).toBe(false)
    expect(container.children[1].hasAttribute('data-scroll-reveal')).toBe(true)
    expect(container.children[2].hasAttribute('data-scroll-reveal')).toBe(true)
  })

  it('THE LIVE BUG: an empty section at index 0 no longer hands the first VISIBLE band a reveal', () => {
    // `i === 0` tested the stored index and the empty member was nulled
    // afterwards, so the first band a visitor actually saw animated in, against
    // the rule HomepageCanvas's own header calls load-bearing. Reachable today
    // with the two types `renderBlock` could already see.
    const {container} = canvas([emptyBadges('x'), band('a'), band('b')])
    expect(sectionsOf(container)).toHaveLength(2)
    expect(container.children[0].hasAttribute('data-scroll-reveal')).toBe(false)
    expect(container.children[0].querySelector('section')).not.toBeNull()
    expect(container.children[1].hasAttribute('data-scroll-reveal')).toBe(true)
  })

  it('holds with several empties before the first visible band', () => {
    const {container} = canvas([emptyBadges('x'), emptyBadges('y'), band('a')])
    expect(container.children).toHaveLength(1)
    expect(container.children[0].hasAttribute('data-scroll-reveal')).toBe(false)
  })
})

describe('the divider, placed by the rule ([R-481], Phase 16C)', () => {
  // The site look a shaped theme carries. `sectionJoin` is the shape; everything else
  // here is what the walk needs to answer the rule.
  const shaped = {imageFrame: null, sectionJoin: 'angled', patternDark: false, cardHover: null, attorneyCardStyle: null}
  const straight = {...shaped, sectionJoin: 'straight'}
  const withHero = (blocks: HomepageBlock[], site = shaped, hero: 'light' | 'tint' | 'dark' | 'image' | null = 'dark') =>
    render(<HomepageCanvas blocks={blocks} site={site} hero={hero} napTokens={tokens} resultsDisclaimer="Past results do not guarantee a future outcome." />)

  it('rises into the hero when the grounds differ, painted in the first band’s own ground', () => {
    const {container} = withHero([band('a', {surface: 'light'}), band('b', {surface: 'light'})])
    const [first, second] = sectionsOf(container)
    expect(first.className).toContain('divider-rise')
    expect(first.className).toContain('before:bg-background')
    // Only the first band meets the hero.
    expect(second.className).not.toContain('divider-rise')
  })

  it('draws nothing under the hero when the ground is the same, and tint counts as light', () => {
    expect(sectionsOf(withHero([band('a', {surface: 'dark'})]).container)[0].className).not.toContain('divider-')
    expect(sectionsOf(withHero([band('a', {surface: 'tint'})], shaped, 'light').container)[0].className).not.toContain('divider-')
  })

  it('cuts wherever the page enters a dark or saturated section, in the ground above', () => {
    const {container} = withHero([band('a', {surface: 'light'}), band('b', {surface: 'dark'}), band('c', {surface: 'light'})])
    const [, second, third] = sectionsOf(container)
    expect(second.className).toContain('divider-cut')
    expect(second.className).toContain('before:bg-background')
    // Leaving a dark section is not an entry.
    expect(third.className).not.toContain('divider-')
  })

  it('counts a Pattern band on the dark ground as dark, and one on the light ground as light', () => {
    const dark = withHero([band('a', {surface: 'light'}), band('b', {surface: 'pattern'})], {...shaped, patternDark: true})
    expect(sectionsOf(dark.container)[1].className).toContain('divider-cut')
    const light = withHero([band('a', {surface: 'light'}), band('b', {surface: 'pattern'})])
    expect(sectionsOf(light.container)[1].className).not.toContain('divider-')
  })

  it('never cuts into a photo band, and never out of one', () => {
    const into = withHero([band('a', {surface: 'light'}), band('b', {surface: 'image'})])
    expect(sectionsOf(into.container)[1].className).not.toContain('divider-')
    const outOf = withHero([band('a', {surface: 'image'}), band('b', {surface: 'dark'})])
    expect(sectionsOf(outOf.container)[1].className).not.toContain('divider-')
  })

  it('gives the band its space back: the content clears the divider’s deepest point', () => {
    const {container} = withHero([band('a', {surface: 'light'}), band('b', {surface: 'dark'})])
    const inner = sectionsOf(container)[1].querySelector('div')
    expect(inner?.className).toContain('mt-divider')
    // A band with no divider keeps its own padding and nothing else.
    const plain = sectionsOf(container)[0].querySelector('div')
    expect(plain?.className).not.toContain('mt-divider')
  })

  it('draws nothing at all when the site’s divider is straight', () => {
    const {container} = withHero([band('a', {surface: 'light'}), band('b', {surface: 'dark'})], straight)
    for (const section of sectionsOf(container)) expect(section.className).not.toContain('divider-')
  })

  it('an inset first band takes none: the wedge would cross the panel', () => {
    const {container} = withHero([band('a', {surface: 'dark', inset: true}), band('b', {surface: 'light'})])
    expect(sectionsOf(container)[0].className).not.toContain('divider-')
  })

  it('alternates the mirror on every second divider, and only for the alternating shape', () => {
    const blocks = [band('a', {surface: 'light'}), band('b', {surface: 'dark'}), band('c', {surface: 'light'}), band('d', {surface: 'dark'})]
    const alt = withHero(blocks, {...shaped, sectionJoin: 'angledAlternating'})
    // Three dividers here, not four: band c LEAVES the dark section, which is not an entry.
    const drawn = sectionsOf(alt.container).map((s) => s.className.includes('divider-cut') || s.className.includes('divider-rise'))
    expect(drawn).toEqual([true, true, false, true])
    const flips = sectionsOf(alt.container).map((s) => s.className.includes('divider-flip'))
    expect(flips).toEqual([false, true, false, false])
    const plain = withHero(blocks)
    expect(sectionsOf(plain.container).some((s) => s.className.includes('divider-flip'))).toBe(false)
  })

  it('an interior page draws none, whatever the site picked', () => {
    const sections = [
      {_type: 'contentSection', _key: 'a', layout: 'statement', heading: 'One', appearance: {surface: 'light'}},
      {_type: 'contentSection', _key: 'b', layout: 'statement', heading: 'Two', appearance: {surface: 'dark'}},
    ] as unknown as PageSectionData[]
    const {container} = render(<PageSections sections={sections} site={shaped} napTokens={tokens} />)
    for (const section of sectionsOf(container)) expect(section.className).not.toContain('divider-')
  })

  it('a stored edgeBottom is ignored: placement is a rule, not a section’s ask', () => {
    const {container} = withHero([band('a', {surface: 'light', edgeBottom: 'angled'}), band('b', {surface: 'light'})], straight)
    expect(sectionsOf(container)[1].className).not.toContain('divider-')
    expect(sectionsOf(container)[1].className).not.toContain('before:bg-')
  })
})

describe('inset and overlap', () => {
  it('two inset bands seam to each other whatever their own surfaces are', () => {
    const {container} = canvas([band('a', {surface: 'dark', inset: true}), band('b', {surface: 'light', inset: true})])
    expect(sectionsOf(container)[1].className).toContain(SEAM)
  })

  it('an inset band paints no background on its own box', () => {
    const {container} = canvas([band('a', {surface: 'dark', inset: true})])
    const el = sectionsOf(container)[0]
    expect(el.className).not.toContain('bg-brand-dark')
    expect(el.querySelector('.rounded-ui')).not.toBeNull()
  })

  // Phase 16A ([R-475], Justin: "Approve B"): overlap is an inset panel rising into
  // the band above. A full-width band only hid the bottom of the band above, text
  // included, so it no longer overlaps at all.
  it('a full-width band never overlaps, whatever it stores', () => {
    const {container} = canvas([band('a', {surface: 'dark'}), band('b', {overlapPrevious: 'large'})])
    const [first, second] = sectionsOf(container)
    expect(second.className.split(' ')).not.toContain('md:-mt-24')
    expect(second.className.split(' ')).not.toContain('md:pt-0')
    expect(first.className.split(' ')).toEqual(expect.arrayContaining(SECTION_SPACING.normal.bottom.split(' ')))
  })

  it('an inset panel overlaps: no top padding from md, so the negative margin IS the overlap', () => {
    const {container} = canvas([band('a', {surface: 'dark'}), band('b', {inset: true, overlapPrevious: 'large'})])
    const classes = sectionsOf(container)[1].className.split(' ')
    expect(classes).toEqual(expect.arrayContaining(['md:-mt-24', 'md:z-10', 'md:pt-0']))
    expect(classes).not.toContain(SEAM)
  })

  it('it keeps its phone padding, where nothing overlaps', () => {
    const {container} = canvas([band('a', {surface: 'dark'}), band('b', {inset: true, overlapPrevious: 'large'})])
    expect(sectionsOf(container)[1].className.split(' ')).toContain(SECTION_SPACING.normal.top.split(' ')[0])
  })

  it('the band above grows its bottom by the overlap, so the panel never covers its content', () => {
    for (const size of ['small', 'large'] as const) {
      const {container} = canvas([band('a', {surface: 'dark'}), band('b', {inset: true, overlapPrevious: size})])
      const above = sectionsOf(container)[0].className.split(' ')
      expect(above, size).toEqual(expect.arrayContaining(SECTION_SPACING.normal.bottomBeforeOverlap[size].split(' ')))
    }
  })
})

describe('the raised photo, placed by the rule (Phase 16E, `[R-499]`)', () => {
  const raising = {imageFrame: null, sectionJoin: 'straight', patternDark: false, cardHover: null, attorneyCardStyle: null, overlap: 'photo'}
  const off = {...raising, overlap: null}
  // A split content band whose media renders. `mediaSide` is irrelevant to the rule.
  const photoBand = (key: string, appearance?: Record<string, unknown>) =>
    band(key, appearance, {layout: 'split', media: {kind: 'photo', image: {asset: {_ref: 'image-abc-800x600-jpg'}, alt: ''}}})
  const videoBand = (key: string, appearance?: Record<string, unknown>) =>
    band(key, appearance, {layout: 'split', media: {kind: 'video', video: {youTubeUrl: 'https://youtu.be/x'}}})
  const homepage = (blocks: HomepageBlock[], site: SiteLook | Record<string, unknown> = raising) =>
    render(<HomepageCanvas blocks={blocks} site={site as SiteLook} hero="dark" napTokens={tokens} resultsDisclaimer="Past results do not guarantee a future outcome." />)
  const risenIn = (container: HTMLElement) =>
    sectionsOf(container).findIndex((s) => s.querySelector('[class*="photo-rise"]'))

  it('raises the photo when the band above shows a different ground', () => {
    const {container} = homepage([band('a', {surface: 'light'}), photoBand('b', {surface: 'dark'})])
    expect(risenIn(container)).toBe(1)
    // The band above grows its bottom by the rise, which is what keeps its text clear.
    expect(sectionsOf(container)[0].className).toContain(SECTION_SPACING.normal.bottomBeforeOverlap.photo.split(/\s+/)[1])
  })

  it('draws nothing when the site has not asked for it', () => {
    expect(risenIn(homepage([band('a', {surface: 'light'}), photoBand('b', {surface: 'dark'})], off).container)).toBe(-1)
  })

  it('never raises the first band: there is nothing above it', () => {
    expect(risenIn(homepage([photoBand('a', {surface: 'light'})]).container)).toBe(-1)
  })

  it('needs a change of visible ground, with light and tint counted as one', () => {
    expect(risenIn(homepage([band('a', {surface: 'light'}), photoBand('b', {surface: 'light'})]).container)).toBe(-1)
    expect(risenIn(homepage([band('a', {surface: 'tint'}), photoBand('b', {surface: 'light'})]).container)).toBe(-1)
    expect(risenIn(homepage([band('a', {surface: 'muted'}), photoBand('b', {surface: 'light'})]).container)).toBe(1)
  })

  it('needs media that renders as a picture: a video is never raised', () => {
    expect(risenIn(homepage([band('a', {surface: 'light'}), videoBand('b', {surface: 'dark'})]).container)).toBe(-1)
    expect(risenIn(homepage([band('a', {surface: 'light'}), band('b', {surface: 'dark'}, {layout: 'split'})]).container)).toBe(-1)
  })

  it('never raises one inside an inset panel, whose own clipping cuts it flat', () => {
    expect(risenIn(homepage([band('a', {surface: 'dark'}), photoBand('b', {surface: 'tint', inset: true})]).container)).toBe(-1)
  })

  it('raises ONE a page, nearest the middle of the list and never the first', () => {
    // Three eligible bands. Live, the first ground-change band holds 1 of 35 rising
    // overlaps and the median normalised position is 0.50 (ADV-16E-B).
    const {container} = homepage([
      band('a', {surface: 'light'}), photoBand('b', {surface: 'dark'}),
      band('c', {surface: 'light'}), photoBand('d', {surface: 'dark'}),
      band('e', {surface: 'light'}), photoBand('f', {surface: 'dark'}), band('g', {surface: 'light'}),
    ])
    expect(sectionsOf(container).filter((s) => s.querySelector('[class*="photo-rise"]'))).toHaveLength(1)
    expect(risenIn(container)).toBe(3)
  })

  it('an interior page never raises one, whatever the site picked', () => {
    const sections: PageSectionData[] = [
      {_type: 'contentSection', _id: 'x', layout: 'statement', heading: 'One', appearance: {surface: 'light'}},
      {_type: 'contentSection', _id: 'y', layout: 'split', heading: 'Two', appearance: {surface: 'dark'},
       media: {kind: 'photo', image: {asset: {_ref: 'image-abc-800x600-jpg'}, alt: ''}}},
    ] as unknown as PageSectionData[]
    const {container} = render(<PageSections sections={sections} site={raising as SiteLook} napTokens={tokens} />)
    expect(container.querySelector('[class*="photo-rise"]')).toBeNull()
  })
})

describe('PageSections', () => {
  const page = (sections: PageSectionData[]) =>
    render(<PageSections sections={sections} napTokens={tokens} resultsDisclaimer="Past results do not guarantee a future outcome." />)

  const cta = (layout: string, extra?: Record<string, unknown>): PageSectionData =>
    ({_type: 'ctaSection', layout, heading: `CTA ${layout}`, ...extra}) as unknown as PageSectionData

  it('seams two same-ground sections', () => {
    const {container} = page([cta('centered'), cta('textOnly')])
    // Both are the accent ground.
    expect(sectionsOf(container)[1].className).toContain(SECTION_SPACING.normal.seamTop.split(/\s+/)[0])
  })

  it('skips an empty section and seams its neighbours to each other', () => {
    const empty = {_type: 'badgesSection', heading: 'Awards', badges: []} as unknown as PageSectionData
    const {container} = page([cta('textOnly'), empty, cta('textOnly')])
    expect(sectionsOf(container)).toHaveLength(2)
    expect(sectionsOf(container)[1].className).toContain(SECTION_SPACING.normal.seamTop.split(/\s+/)[0])
  })
})

describe('walkFrame, directly', () => {
  it('gives the first survivor NO_SEAM and reports the original index', () => {
    const out = walkFrame([{n: 0}, {n: 1}, {n: 2}], (m) => ({appearance: {surface: 'light'}, empty: m.n === 0}))
    expect(out).toHaveLength(2)
    expect(out[0].index).toBe(1)
    expect(out[0].seam).toEqual(NO_SEAM)
    expect(out[1].seam.seamTop).toBe(true)
  })

  it('an all-empty list yields nothing', () => {
    expect(walkFrame([{}, {}], () => ({appearance: undefined, empty: true}))).toEqual([])
  })

  it('an absent appearance reads as the light ground, so absent bands seam', () => {
    const out = walkFrame([{}, {}], () => ({appearance: undefined, empty: false}))
    expect(out[1].seam.seamTop).toBe(true)
    expect(out[1].seam.previousGround).toBe('light')
  })
})

describe('the ghost, placed once per page (Phase 16D, `[R-492]`, `[R-495]`)', () => {
  const ghosted: SiteLook = {
    imageFrame: null, sectionJoin: 'straight', patternDark: false,
    cardHover: null, attorneyCardStyle: null, ghost: {text: 'SO'},
  }
  const noGhost = {...ghosted, ghost: null}
  const page = (blocks: HomepageBlock[], site = ghosted) =>
    render(<HomepageCanvas blocks={blocks} site={site} hero="dark" napTokens={tokens} resultsDisclaimer="Past results do not guarantee a future outcome." />)
  const layers = (c: HTMLElement) => Array.from(c.querySelectorAll('[data-decor-layer]'))

  it('draws nothing when the site has not turned it on', () => {
    expect(layers(page([band('a', {surface: 'dark'})], noGhost).container)).toHaveLength(0)
  })

  it('draws on exactly one band, however many are eligible', () => {
    const {container} = page([
      band('a', {surface: 'dark'}), band('b', {surface: 'dark'}),
      band('c', {surface: 'light'}), band('d', {surface: 'dark'}),
    ])
    expect(layers(container)).toHaveLength(1)
  })

  it('prefers a dark band over an earlier light one', () => {
    const {container} = page([band('a', {surface: 'light'}), band('b', {surface: 'dark'})])
    const sections = sectionsOf(container)
    expect(sections[0].querySelector('[data-decor-layer]')).toBeNull()
    expect(sections[1].querySelector('[data-decor-layer]')).not.toBeNull()
  })

  it('falls back to the first eligible band when no band is dark', () => {
    const {container} = page([band('a', {surface: 'light'}), band('b', {surface: 'tint'})])
    expect(sectionsOf(container)[0].querySelector('[data-decor-layer]')).not.toBeNull()
  })

  it('never draws on a saturated or an image band: neither blend is swept', () => {
    for (const surface of ['saturated', 'image'] as const) {
      expect(layers(page([band('a', {surface})]).container)).toHaveLength(0)
    }
  })

  it('never draws on a Pattern band, which already carries a decorative layer', () => {
    expect(layers(page([band('a', {surface: 'pattern'})]).container)).toHaveLength(0)
    // …and it takes the next band instead rather than giving up on the page.
    const {container} = page([band('a', {surface: 'pattern'}), band('b', {surface: 'dark'})])
    expect(sectionsOf(container)[1].querySelector('[data-decor-layer]')).not.toBeNull()
  })

  it('never draws on an inset panel, which is a card and not a ground', () => {
    expect(layers(page([band('a', {surface: 'dark', inset: true})]).container)).toHaveLength(0)
  })

  it('carries the initials and is hidden from assistive technology', () => {
    const [layer] = layers(page([band('a', {surface: 'dark'})]).container)
    expect(layer.getAttribute('aria-hidden')).toBe('true')
    expect(layer.textContent).toBe('SO')
  })

  it('takes the band’s own ink: the texture’s on-dark ink on dark, brand-dark on light', () => {
    const [onDark] = layers(page([band('a', {surface: 'dark'})]).container)
    expect(onDark.className).toContain('section-texture-dark')
    const [onLight] = layers(page([band('a', {surface: 'light'})]).container)
    expect(onLight.className).toContain('text-brand-dark')
    expect(onLight.className).toContain('opacity-4')
  })

  it('gives its band the stacking context its -z-10 needs', () => {
    const [section] = sectionsOf(page([band('a', {surface: 'dark'})]).container)
    expect(section.className.split(' ')).toContain('isolate')
  })
})
