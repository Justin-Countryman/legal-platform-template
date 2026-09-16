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
//   - an angled edge is painted by the NEXT band and cancels its seam;
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
    // ground and halved the padding between two different colours.
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

describe('the angled edge', () => {
  it('is painted by the NEXT band, in the previous band’s ground colour', () => {
    const {container} = canvas([band('a', {surface: 'dark', edgeBottom: 'angled'}), band('b', {surface: 'light'})])
    const [first, second] = sectionsOf(container)
    // The band that CHOSE the edge paints nothing itself.
    expect(first.className).not.toContain('before:bg-')
    // The band below paints it, in the band above's colour.
    expect(second.className).toContain('before:bg-brand-dark')
    expect(second.className).toContain('md:before:bottom-full')
  })

  it('cancels the seam it would otherwise have, because the wedge fills the join', () => {
    const {container} = canvas([band('a', {surface: 'light', edgeBottom: 'angled'}), band('b', {surface: 'light'})])
    expect(sectionsOf(container)[1].className).toContain(FULL)
  })

  it('paints nothing over a pattern or image ground, and so cancels no seam', () => {
    for (const surface of ['pattern', 'image'] as const) {
      const {container} = canvas([band('a', {surface, edgeBottom: 'angled'}), band('b', {surface})])
      const second = sectionsOf(container)[1]
      expect(second.className, surface).not.toContain('before:bg-')
      // Same ground, no edge painted, so the seam still applies.
      expect(second.className, surface).toContain(SEAM)
    }
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

  it('an overlapping band drops its top padding, so the negative margin IS the overlap', () => {
    const {container} = canvas([band('a'), band('b', {overlapPrevious: 'large'})])
    const second = sectionsOf(container)[1]
    expect(second.className).toContain('pt-0')
    expect(second.className).toContain('md:-mt-24')
    expect(second.className).toContain('md:z-10')
    expect(second.className).not.toContain(SEAM)
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
