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
import {headerLinkOf} from '../headerLink'

// THE "VIEW ALL" LINK BESIDE A SECTION HEADING (monorepo WS-PREMIUM-PACKAGE-DESIGN §7.3, `[R-641]`; brandilaw's practice and
// results headers). Four sections take `headerLink`; the header sets the heading left and the link on its right, drawn as
// the text link. Blank, or half filled, draws the header exactly as before.

describe('the header link', () => {
  it('draws the heading left and the link beside it; absent, the header is unchanged', () => {
    const plain = render(<SectionHeader heading="How we can help" />).container.innerHTML
    const c = render(<SectionHeader heading="How we can help" link={{label: 'All practice areas', href: '/practice-areas/'}} />).container
    const wrap = c.querySelector('[data-header-link]')!
    expect(wrap.className.split(' ')).toContain('md:justify-between')
    expect(c.querySelector('.text-center')).toBeNull()
    const a = c.querySelector('a')!
    expect(a.textContent).toMatch(/^All practice areas/)
    expect(a.getAttribute('href')).toBe('/practice-areas/')
    expect(render(<SectionHeader heading="How we can help" link={null} />).container.innerHTML).toBe(plain)
  })

  it('needs both a label and a page', () => {
    expect(headerLinkOf({label: 'All results', url: '/results/'})).toEqual({label: 'All results', href: '/results/'})
    expect(headerLinkOf({label: 'All results', url: ''})).toBeNull()
    expect(headerLinkOf({url: '/results/'})).toBeNull()
    expect(headerLinkOf(null)).toBeNull()
  })

  it('reaches the practice areas, attorneys and testimonials', () => {
    const link = {label: 'View all', url: '/all/'}
    const cases = [
      render(<PracticeAreaNavBlock data={{heading: 'Areas', headerLink: link, layout: 'tile', items: [{_key: 'a', label: 'Wills', href: '/wills/'}]} as never} />).container,
      render(<AttorneySectionBlock data={{heading: 'People', headerLink: link, attorneys: [{_id: 'x', title: 'A. Lawyer', slug: 'attorneys/a'}]} as never} />).container,
      render(<TestimonialsGridSection data={{heading: 'Clients', headerLink: link, testimonials: [{_id: 't', quote: 'Kind.', name: 'A.'}]} as never} />).container,
    ]
    for (const c of cases) expect(c.querySelector('[data-header-link] a[href="/all/"]')).not.toBeNull()
  })

  // Monorepo backlog 454: "the section doesn't link to the case results page that has the cards" (Justin, 2026-10-14).
  // A link stored before its field was deleted, or a button, draws nothing; a card links to its own page only.
  it('never reaches the Featured Case Results section, which links to nothing but each card’s own page', () => {
    const c = render(<CaseResultsSection data={{heading: 'Results', headerLink: {label: 'All results', url: '/case-results/'},
      ctaButton: {title: 'See all', url: '/case-results/'},
      caseResults: [{_id: 'r', amount: '$1M', caption: 'Settlement', href: '/case-results/truck-collision'}, {_id: 's', amount: 'Dismissed'}]} as never}
      disclaimer="Past results do not guarantee future outcomes." />).container
    expect(c.querySelector('[data-header-link]')).toBeNull()
    expect([...c.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(['/case-results/truck-collision'])
  })
})
