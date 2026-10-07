import {describe, expect, it, vi} from 'vitest'
import {forwardRef} from 'react'
import {render} from '@testing-library/react'

vi.mock('next/link', () => ({
  // eslint-disable-next-line react/display-name
  default: forwardRef<HTMLAnchorElement, {href: string; children: React.ReactNode}>(({href, children, ...rest}, ref) => <a ref={ref} href={href} {...rest}>{children}</a>),
}))
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({src, alt}: {src: string; alt: string}) => <img src={src} alt={alt} />,
}))

import {SectionHeader} from '@/components/ui/SectionHeader'
import {PracticeAreaNavBlock} from '../PracticeAreaNavBlock'
import {AttorneySectionBlock} from '../AttorneySectionBlock'
import {TestimonialsGridSection} from '../TestimonialsGridSection'
import {CaseResultsSection} from '../CaseResultsSection'
import {FeaturedTestimonialSection} from '../FeaturedTestimonialSection'
import {heroHeadingText} from '@/components/layout/homeHero/shared'

// EMPHASIS BEYOND THE CONTENT SECTION (monorepo WS-PREMIUM-PACKAGE-DESIGN §7.2 amendment 12, `[R-641]`): nguyenandmaliklaw
// emphasises its hero, practice, testimonial and attorney headings; only the content section's heading took emphasis. The
// hero and the five section headers now take `headingEmphasis`, drawn as the content section draws it, and draw exactly
// as before without it.

const em = (c: HTMLElement) => c.querySelector('h2 em.heading-emphasis, h1 em.heading-emphasis')?.textContent ?? null

describe('heading emphasis on section headers and the hero', () => {
  it('SectionHeader draws the phrase in the emphasis style, and its markup is unchanged without one', () => {
    const plain = render(<SectionHeader heading="How we can help" />).container.innerHTML
    expect(render(<SectionHeader heading="How we can help" emphasis="help" />).container.querySelector('em.heading-emphasis')!.textContent).toBe('help')
    expect(render(<SectionHeader heading="How we can help" emphasis="absent" />).container.innerHTML).toBe(plain)
  })

  it('reaches the five sections', () => {
    const cases = [
      render(<PracticeAreaNavBlock data={{heading: 'How we can help', headingEmphasis: 'help', layout: 'tile', items: [{_key: 'a', label: 'Wills', href: '/wills/'}]} as never} />).container,
      render(<AttorneySectionBlock data={{heading: 'Meet our attorneys', headingEmphasis: 'attorneys', attorneys: [{_id: 'x', title: 'A. Lawyer', slug: 'attorneys/a'}]} as never} />).container,
      render(<TestimonialsGridSection data={{heading: 'What clients say', headingEmphasis: 'clients', testimonials: [{_id: 't', quote: 'Kind and clear.', name: 'A.'}]} as never} />).container,
      render(<CaseResultsSection data={{heading: 'Recent results', headingEmphasis: 'results', caseResults: [{_id: 'r', amount: '$1M', caption: 'Settlement'}]} as never} disclaimer="Past results do not guarantee future outcomes." />).container,
      render(<FeaturedTestimonialSection data={{heading: 'One client', headingEmphasis: 'client', testimonial: {quote: 'They answered every call.', name: 'B.'}} as never} />).container,
    ]
    expect(cases.map(em)).toEqual(['help', 'attorneys', 'clients', 'results', 'client'])
  })

  it('the hero headline takes its emphasis, and stays a plain string without one', () => {
    expect(heroHeadingText({heading: 'Serious counsel'})).toBe('Serious counsel')
    const {container} = render(<h1 className="text-heading">{heroHeadingText({heading: 'Serious counsel for families', headingEmphasis: 'families'})}</h1>)
    expect(em(container)).toBe('families')
  })
})
