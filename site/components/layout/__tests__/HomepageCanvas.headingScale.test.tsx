import {describe, it, expect, vi} from 'vitest'
import {render} from '@testing-library/react'

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: vi.fn(({src, alt, className}) => <img src={src} alt={alt ?? ''} className={className} />),
}))
vi.mock('@/components/ui/ScrollReveal', () => ({
  ScrollReveal: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
}))

import {HomepageCanvas, type HomepageBlock} from '../HomepageCanvas'
import {PracticeAreaNavBlock} from '@/components/sections/PracticeAreaNavBlock'
import {SECTION_HEADER_H2_CLASS} from '@/components/ui/SectionHeader'

// ONE HEADING SIZE ON THE HOMEPAGE (monorepo `[R-641]`, WS-PREMIUM-PACKAGE-DESIGN §7.2 amendment 3). The content
// section and the close drew the marketing scale while every other homepage section drew SectionHeader's fixed
// interior tier: 36 px beside 56 px on one page at the `md` scale. Every section the canvas renders now draws the
// marketing tier under the section heading's ceiling; an interior page keeps the fixed tiers.

const badge = {src: 'https://cdn.example.com/b.png', alt: 'Badge', width: 400, height: 400}
const badges = (layout: string, key: string): HomepageBlock =>
  ({_type: 'badgesSectionInline', _key: key, heading: `Badges ${layout}`, layout, badges: [badge, badge]}) as never

const BLOCKS: HomepageBlock[] = [
  {_type: 'practiceAreaNavInline', _key: 'p', heading: 'Areas of law', layout: 'tile', items: [{_key: 'i', label: 'Wills', href: '/wills/'}]} as never,
  {_type: 'attorneySectionInline', _key: 'a', heading: 'Our attorneys', attorneys: [{_id: 'x', title: 'A. Lawyer', slug: 'attorneys/a'}]} as never,
  badges('centeredGrid', 'b1'), badges('inline', 'b2'), badges('split', 'b3'), badges('scrolling', 'b4'),
  {_type: 'testimonialsGridInline', _key: 't', heading: 'Clients say', testimonials: [{_id: 't1', quote: 'Clear and kind.', name: 'A.'}]} as never,
  {_type: 'featuredTestimonialInline', _key: 'f', heading: 'One client', testimonial: {quote: 'They answered every call.', name: 'B.'}} as never,
  {_type: 'videoSectionInline', _key: 'v', heading: 'Watch', videos: [{_key: 'v1', title: 'Intro', youTubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'}]} as never,
  {_type: 'caseResultsSectionInline', _key: 'c', heading: 'Results', caseResults: [{_id: 'r', amount: '$1M', caption: 'Settlement'}]} as never,
  {_type: 'reviewsSectionInline', _key: 'r', heading: 'Reviews', reviewsEmbed: '<div>widget</div>'} as never,
  {_type: 'contentSectionInline', _key: 'k', heading: 'Why us', layout: 'twoColumnText', body: [{_type: 'block', _key: 'b', children: [{_type: 'span', _key: 's', text: 'Because.'}]}]} as never,
]

const classes = (el: Element) => el.className.split(' ')

describe('every homepage section draws one heading tier', () => {
  it('each section heading on the canvas wears the marketing tier and no fixed size', () => {
    const {container} = render(<HomepageCanvas blocks={BLOCKS} />)
    const headings = [...container.querySelectorAll('h2')]
    // Every block above draws its heading: 12 bands, the four badge layouts among them.
    expect(headings.map((h) => h.textContent)).toEqual([
      'Areas of law', 'Our attorneys', 'Badges centeredGrid', 'Badges inline', 'Badges split', 'Badges scrolling',
      'Clients say', 'One client', 'Watch', 'Results', 'Reviews', 'Why us',
    ])
    for (const h of headings) {
      expect(classes(h), h.textContent!).toContain('marketing-h2')
      expect(classes(h), h.textContent!).toContain('section-heading')
      expect(classes(h).filter((c) => /^(?:md:|lg:)?text-\dxl$/.test(c)), h.textContent!).toEqual([])
    }
  })

  it('the same section on an interior page keeps the fixed interior tier', () => {
    const data = {heading: 'Areas of law', layout: 'tile', items: [{_key: 'i', label: 'Wills', href: '/wills/'}]}
    const h2 = render(<PracticeAreaNavBlock data={data as never} />).container.querySelector('h2')!
    expect(classes(h2)).not.toContain('marketing-h2')
    for (const c of SECTION_HEADER_H2_CLASS.md.split(' ')) expect(classes(h2)).toContain(c)
  })
})
