import {describe, it, expect, vi} from 'vitest'
import {forwardRef} from 'react'
import {render} from '@testing-library/react'

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
vi.mock('@/components/ui/ScrollReveal', () => ({
  ScrollReveal: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
}))

import {HomepageCanvas, type HomepageBlock} from '@/components/layout/HomepageCanvas'
import {PageSections, type PageSectionData} from '../PageSections'
import {SectionShell} from '../SectionShell'
import {NO_SEAM, followSite, interiorLook, siteLookOf, walkFrame, type SiteLook} from '../sectionFrame'
import {sectionSurface, visibleGround} from '@/lib/sectionSurface'
import {resolveHovers} from '@/lib/siloHover'

// The site's look (Phase 16B, [R-468], [R-479]): the settings a theme writes reach
// every section through the walk's per-band object, and a section with a value of
// its own keeps it. Rendered, not read from source.

const LOOK: SiteLook = {imageFrame: null, sectionJoin: 'straight', patternDark: false, cardHover: null, attorneyCardStyle: null, ghost: null}
const look = (over: Partial<SiteLook>): SiteLook => ({...LOOK, ...over})

describe('the site look from Design Settings', () => {
  it('reads each setting, and a dark ground only when a texture is set', () => {
    expect(siteLookOf({imageFrame: 'slab', sectionJoin: 'angled', cardHover: 'lift', attorneyCardStyle: 'minimal'})).toEqual(
      {imageFrame: 'slab', sectionJoin: 'angled', patternDark: false, cardHover: 'lift', attorneyCardStyle: 'minimal', ghost: null},
    )
    expect(siteLookOf({patternGround: 'dark'}).patternDark).toBe(false)
    expect(siteLookOf({patternGround: 'dark', patternTexture: 'scallop'}).patternDark).toBe(true)
    expect(siteLookOf(null)).toEqual(LOOK)
  })

  it('a section value wins; absent and inherit follow the site', () => {
    expect(followSite('portrait', 'minimal')).toBe('portrait')
    expect(followSite(undefined, 'minimal')).toBe('minimal')
    expect(followSite('inherit', 'minimal')).toBe('minimal')
    expect(followSite(null, null)).toBeNull()
  })

  it('interior pages keep the cards and frames but never a join or a textured ground', () => {
    const l = look({sectionJoin: 'angled', patternDark: true, imageFrame: 'framed', attorneyCardStyle: 'avatar'})
    expect(interiorLook(l)).toEqual({...l, sectionJoin: 'straight', patternDark: false, ghost: null})
  })
})

describe('the site look carries the divider and its pieces (Phase 16C)', () => {
  it('reads the site’s divider shape, whatever it is', () => {
    expect(siteLookOf({sectionJoin: 'peak'}).sectionJoin).toBe('peak')
    expect(siteLookOf({sectionJoin: 'straight'}).sectionJoin).toBe('straight')
    expect(siteLookOf({}).sectionJoin).toBe('straight')
    expect(siteLookOf(null).sectionJoin).toBe('straight')
  })

  it('every band carries the site look', () => {
    const l = look({imageFrame: 'framed'})
    const out = walkFrame([{}, {}], () => ({appearance: {}, empty: false}), l)
    expect(out.map((o) => o.seam.site)).toEqual([l, l])
  })

  it('an interior page keeps the frames and loses the divider and the texture', () => {
    const l = look({imageFrame: 'framed', sectionJoin: 'peak', patternDark: true})
    expect(interiorLook(l)).toEqual({...l, sectionJoin: 'straight', patternDark: false, ghost: null})
  })
})

describe('the texture on a dark section ([R-479])', () => {
  it('a Pattern band sits on the dark ground when the site says so', () => {
    expect(sectionSurface('pattern', true)).toMatchObject({surfaceClass: 'bg-brand-dark', ringContext: 'dark', buttonContext: 'dark', textured: true})
    expect(sectionSurface('pattern')).toMatchObject({surfaceClass: 'bg-background', textured: true})
    expect(visibleGround({surface: 'pattern'}, true)).toBe('dark')
    expect(visibleGround({surface: 'pattern'})).toBe('light')
  })

  it('draws the texture with the derived dark ink under the edge, and the light one at the tested ceiling', () => {
    const dark = render(<SectionShell appearance={{surface: 'pattern'}} seam={{...NO_SEAM, site: look({patternDark: true})}}>x</SectionShell>).container
    const band = dark.querySelector('section')!
    const layer = dark.querySelector('[data-section-texture]')!
    expect(band.getAttribute('data-ring-context')).toBe('dark')
    expect(band.className.split(' ')).toEqual(expect.arrayContaining(['bg-brand-dark', 'isolate']))
    expect(layer.className.split(' ')).toEqual(expect.arrayContaining(['section-texture', 'section-texture-dark', '-z-10']))
    expect(layer.className.split(' ')).not.toContain('opacity-4')
    const light = render(<SectionShell appearance={{surface: 'pattern'}}>x</SectionShell>).container
    expect(light.querySelector('[data-section-texture]')!.className.split(' ')).toEqual(expect.arrayContaining(['text-brand-dark', 'opacity-4', '-z-10']))
  })
})

describe('per-section looks follow the theme ([R-468] continuity)', () => {
  const attorneys = [{_id: 'x', title: 'Jane Roe', slug: 'attorneys/jane'}]
  const band = (cardStyle?: string) => [{_type: 'attorneySectionInline', _key: 'a', heading: 'Our people', layout: 'grid', attorneys, ...(cardStyle ? {cardStyle} : {})}] as HomepageBlock[]

  it('an attorney section with no style takes the site style; its own style stays', () => {
    const avatar = render(<HomepageCanvas blocks={band()} site={look({attorneyCardStyle: 'avatar'})} />).container
    expect(avatar.querySelector('.rounded-full')).not.toBeNull()
    const inherit = render(<HomepageCanvas blocks={band('inherit')} site={look({attorneyCardStyle: 'avatar'})} />).container
    expect(inherit.querySelector('.rounded-full')).not.toBeNull()
    const own = render(<HomepageCanvas blocks={band('portrait')} site={look({attorneyCardStyle: 'avatar'})} />).container
    expect(own.querySelector('.rounded-full')).toBeNull()
  })

  it('the photo frame marker is on square attorney photos and never on the round one', () => {
    const portrait = render(<HomepageCanvas blocks={band('portrait')} />).container
    expect(portrait.querySelector('[data-attorney-photo]')).not.toBeNull()
    const avatar = render(<HomepageCanvas blocks={band('avatar')} />).container
    expect(avatar.querySelector('[data-attorney-photo]')).toBeNull()
  })

  it('interior attorney sections follow the site style too', () => {
    const s = {_type: 'attorneySection', _id: 's', heading: 'Our people', layout: 'grid', attorneys} as unknown as PageSectionData
    const avatar = render(<PageSections sections={[s]} site={look({attorneyCardStyle: 'avatar'})} />).container
    expect(avatar.querySelector('.rounded-full')).not.toBeNull()
  })

  it('a practice-area section with no hover of its own takes the site hover where its layout can show it', () => {
    expect(resolveHovers([], 'spotlight', 'lift')).toEqual(['lift'])
    expect(resolveHovers(undefined, 'feature', 'accentUnderline')).toEqual(['accentUnderline'])
    // A zoom acts on the photo: the layouts that may carry none keep their own.
    expect(resolveHovers([], 'inline', 'imageZoom')).toEqual(['accentBorder'])
    expect(resolveHovers([], 'tile', 'imageZoom')).toEqual(['glow'])
    expect(resolveHovers([], 'inline', 'glow')).toEqual(['glow'])
    expect(resolveHovers([], 'spotlight', 'none')).toEqual([])
    expect(resolveHovers(['grayscale'], 'spotlight', 'lift')).toEqual(['grayscale'])
    expect(resolveHovers(['none'], 'spotlight', 'lift')).toEqual([])
    expect(resolveHovers([], 'spotlight', null)).toEqual(['imageZoom'])
  })
})

describe('every section heading carries the theme heading signature', () => {
  const t = {_id: 't', quote: 'Superb counsel.', name: 'A client'}
  const answer = [{_type: 'block', _key: 'b', style: 'normal', markDefs: [], children: [{_type: 'span', _key: 's', text: 'An answer.', marks: []}]}]
  const videos = [{_id: 'v1', title: 'Intro', youTubeUrl: 'https://www.youtube.com/watch?v=abc123xyz00', description: 'A video.', videoType: 'educational'}]
  const badges = [{src: 'https://cdn.example.com/a.png', alt: 'Super Lawyers', width: 120, height: 60}]
  const interior = [
    {_type: 'testimonialsGrid', _id: '1', heading: 'Clients', testimonials: [t]},
    {_type: 'featuredTestimonial', _id: '2', heading: 'A client', testimonial: t},
    {_type: 'ctaSection', _id: '3', heading: 'Speak with us', layout: 'textOnly'},
    {_type: 'faqSection', _id: '4', heading: 'FAQs', questions: [{question: 'Q?', answer}]},
    {_type: 'badgesSection', _id: '5', heading: 'Awards', badges},
    {_type: 'attorneySection', _id: '6', heading: 'Our people', layout: 'grid', attorneys: [{_id: 'x', title: 'Jane Roe', slug: 'attorneys/jane'}]},
    {_type: 'reviewsSection', _id: '7', heading: 'Reviews', reviewsEmbed: '<div>embed</div>'},
    {_type: 'videoSection', _id: '8', heading: 'Videos', videos},
    {_type: 'practiceAreaNav', _id: '9', heading: 'How we help', layout: 'feature', items: [{_key: 'a', label: 'Family Law', href: '/family-law/'}]},
    {_type: 'caseResultsSection', _id: '10', heading: 'Results', caseResults: [{_id: 'r', amount: '$1M'}]},
    {_type: 'contentSection', _id: '11', layout: 'statement', heading: 'About the firm'},
  ] as unknown as PageSectionData[]

  it('renders one heading per section type, each with section-heading', () => {
    const {container} = render(<PageSections sections={interior} />)
    const h2s = [...container.querySelectorAll('h2')]
    // One per type: a section added to PageSections without a case here, or one that
    // renders its own <h2> without the class, turns this red.
    expect(h2s.length).toBeGreaterThanOrEqual(interior.length)
    expect(h2s.filter((h) => !h.className.split(' ').includes('section-heading')).map((h) => h.textContent)).toEqual([])
  })
})

describe('every card root takes the carried corner (Phase 16C, [R-483])', () => {
  // ADV-P16C-A censused the card roots: fifteen or more across thirteen files, not the
  // seven the design listed, and a test that renders section types only misses the blog
  // index, events, the video library, the sidebar and the footer's locations. The piece
  // is drawn by one CSS rule on `[data-card]`, so the marker IS the coverage.
  const t = {_id: 't', quote: 'Superb counsel.', name: 'A client'}
  const cardSections = [
    {_type: 'testimonialsGrid', _id: '1', heading: 'Clients', testimonials: [t, {...t, _id: 't2'}]},
    {_type: 'caseResultsSection', _id: '2', heading: 'Results', caseResults: [{_id: 'r', amount: '$1M'}]},
    {
      _type: 'practiceAreaNav', _id: '3', heading: 'How we help', layout: 'spotlight',
      items: [{_key: 'a', label: 'Family Law', href: '/family-law/'}, {_key: 'b', label: 'Probate', href: '/probate/'}],
    },
    {
      _type: 'attorneySection', _id: '4', heading: 'Our people', layout: 'grid',
      attorneys: [{_id: 'x', title: 'Jane Roe', slug: 'attorneys/jane'}],
    },
  ] as unknown as PageSectionData[]

  it('marks every card the sections render, and no list row', () => {
    const {container} = render(<PageSections sections={cardSections} />)
    const cards = [...container.querySelectorAll('[data-card]')]
    expect(cards.length).toBeGreaterThanOrEqual(5)
    // Every marked element wears the card chrome: the marker cannot drift onto a row.
    for (const card of cards) {
      expect(card.className, card.textContent?.slice(0, 40)).toContain('rounded-ui')
    }
  })

  it('a full-width list row is not a card, even beside the carousel cards the same layout renders', () => {
    const rows = [{
      _type: 'practiceAreaNav', _id: '9', heading: 'How we help', layout: 'inline',
      items: [{_key: 'a', label: 'Family Law', href: '/family-law/'}, {_key: 'b', label: 'Probate', href: '/probate/'}],
    }] as unknown as PageSectionData[]
    const {container} = render(<PageSections sections={rows} />)
    // The inline layout draws rows on desktop and a carousel of cards on phones: the
    // cards are marked and the rows are not, which is the distinction the piece needs.
    const rowEls = [...container.querySelectorAll('a')].filter((el) => el.className.includes('items-center') && el.className.includes('p-5'))
    expect(rowEls.length).toBeGreaterThan(0)
    for (const row of rowEls) expect(row.hasAttribute('data-card'), row.className).toBe(false)
    expect(container.querySelectorAll('[data-card]').length).toBeGreaterThan(0)
  })

  it('a feature photo says which frame it has, so only a plain or slab photo is cut', () => {
    const withPhoto = [{
      _type: 'contentSection', _id: '1', layout: 'split', heading: 'About',
      media: {kind: 'image', image: {asset: {_ref: 'image-abc-800x600-jpg'}, alt: 'The firm'}},
    }] as unknown as PageSectionData[]
    const plain = render(<PageSections sections={withPhoto} />).container
    expect(plain.querySelector('[data-feature-photo="plain"]')).not.toBeNull()
    const framed = render(<PageSections sections={withPhoto} site={look({imageFrame: 'framed'})} />).container
    expect(framed.querySelector('[data-feature-photo]')).toBeNull()
    const slab = render(<PageSections sections={withPhoto} site={look({imageFrame: 'slab'})} />).container
    expect(slab.querySelector('[data-feature-photo="slab"]')).not.toBeNull()
  })
})

describe('the drawn elements (Phase 16D)', () => {
  it('an interior page never draws the ghost, and keeps the ornaments', () => {
    // The ghost is a homepage device, as the divider and the texture are (`[R-472]`);
    // the drop cap and the quote mark are the UI system's one decision each and do
    // carry to interior pages, which is why they are not on `SiteLook` at all but on
    // the layout wrapper.
    const l = look({ghost: {text: 'SO'}})
    expect(interiorLook(l)?.ghost).toBeNull()
  })

  it('a content section says whether its first paragraph may take a drop cap', () => {
    const prose = (text: string, layout = 'split') => [{
      _type: 'contentSection', _id: '1', layout, heading: 'About',
      body: [{_type: 'block', _key: 'b', children: [{_type: 'span', _key: 's', text}]}],
    }] as unknown as PageSectionData[]
    expect(render(<PageSections sections={prose('Most families do not.')} />).container
      .querySelector('[data-prose="cap"]')).not.toBeNull()
    // A leading quotation mark would be drawn at 52px beside the letter.
    expect(render(<PageSections sections={prose('“Most families do not.')} />).container
      .querySelector('[data-prose]')).toBeNull()
    // A centred layout floats the cap away from its text.
    expect(render(<PageSections sections={prose('Most families do not.', 'statement')} />).container
      .querySelector('[data-prose]')).toBeNull()
  })

  it('every place a quote is set is marked, so one rule draws the ornament', () => {
    const withQuote = [{
      _type: 'contentSection', _id: '1', layout: 'split', heading: 'About',
      body: [{_type: 'block', _key: 'b', children: [{_type: 'span', _key: 's', text: 'Wills and trusts.'}]}],
      pullQuote: {text: 'Every plan should make sense.', attribution: 'The partners'},
    }] as unknown as PageSectionData[]
    expect(render(<PageSections sections={withQuote} />).container.querySelector('[data-quote]')).not.toBeNull()
  })
})
