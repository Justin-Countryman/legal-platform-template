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
import {NO_SEAM, edgeOf, followSite, interiorLook, siteLookOf, walkFrame, type SiteLook} from '../sectionFrame'
import {sectionSurface, visibleGround} from '@/lib/sectionSurface'
import {resolveHovers} from '@/lib/siloHover'

// The site's look (Phase 16B, [R-468], [R-479]): the settings a theme writes reach
// every section through the walk's per-band object, and a section with a value of
// its own keeps it. Rendered, not read from source.

const LOOK: SiteLook = {imageFrame: null, sectionJoin: 'straight', patternDark: false, cardHover: null, attorneyCardStyle: null}
const look = (over: Partial<SiteLook>): SiteLook => ({...LOOK, ...over})

describe('the site look from Design Settings', () => {
  it('reads each setting, and a dark ground only when a texture is set', () => {
    expect(siteLookOf({imageFrame: 'slab', sectionJoin: 'angled', cardHover: 'lift', attorneyCardStyle: 'minimal'})).toEqual(
      {imageFrame: 'slab', sectionJoin: 'angled', patternDark: false, cardHover: 'lift', attorneyCardStyle: 'minimal'},
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
    expect(interiorLook(l)).toEqual({...l, sectionJoin: 'straight', patternDark: false})
  })
})

describe('the site join ([R-479]: a section asks, the theme decides the shape)', () => {
  it('a section that asks takes the theme shape; one that asks nothing stays straight; its own edge is its own', () => {
    expect(edgeOf('site', look({sectionJoin: 'angled'}))).toBe('angled')
    expect(edgeOf('site', look({sectionJoin: 'straight'}))).toBe('flat')
    expect(edgeOf('site', null)).toBe('flat')
    expect(edgeOf(undefined, look({sectionJoin: 'angled'}))).toBeNull()
    expect(edgeOf('angled', look({sectionJoin: 'straight'}))).toBe('angled')
    expect(edgeOf('flat', look({sectionJoin: 'angled'}))).toBe('flat')
  })

  it('the band below paints the wedge only where the band above asked and the theme angles', () => {
    const members = [{appearance: {surface: 'light' as const, edgeBottom: 'site' as const}}, {appearance: {surface: 'dark' as const}}]
    const walk = (site: SiteLook) => walkFrame(members, (m) => ({appearance: m.appearance, empty: false}), site)
    expect(walk(look({sectionJoin: 'angled'}))[1].seam.previousEdge).toBe('angled')
    expect(walk(look({sectionJoin: 'straight'}))[1].seam.previousEdge).toBe('flat')
  })

  it('every band carries the site look', () => {
    const l = look({imageFrame: 'framed'})
    const out = walkFrame([{}, {}], () => ({appearance: {}, empty: false}), l)
    expect(out.map((o) => o.seam.site)).toEqual([l, l])
  })

  it('a homepage section offers "the site’s edge" and the canvas draws it', () => {
    const blocks = [
      {_type: 'contentSectionInline', _key: 'a', layout: 'statement', heading: 'One', appearance: {edgeBottom: 'site'}},
      {_type: 'contentSectionInline', _key: 'b', layout: 'statement', heading: 'Two', appearance: {surface: 'dark'}},
    ] as HomepageBlock[]
    const angled = render(<HomepageCanvas blocks={blocks} site={look({sectionJoin: 'angled'})} />).container
    expect(angled.querySelectorAll('section')[1].className.split(' ')).toContain('before:bg-background')
    const straight = render(<HomepageCanvas blocks={blocks} site={look({sectionJoin: 'straight'})} />).container
    expect(straight.querySelectorAll('section')[1].className).not.toContain('before:bg-background')
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
