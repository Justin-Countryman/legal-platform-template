import {describe, it, expect, vi} from 'vitest'
import {forwardRef} from 'react'
import {render} from '@testing-library/react'

// A light card inside a dark band (Phase 14 accessibility audit, E's F1 to F6). An
// operator can set a case-results, testimonials or attorney section to dark or
// image, and the cards inside stayed light surfaces while their text inherited the
// dark band's colors: body text measured 1.06:1 on a muted card and 1.16:1 on a
// white one. Each light card now declares its own light context, which the
// [data-ring-context="light"] cascade block resolves to the palette's light
// values. On a light band the twins equal the root values, so nothing moves there.

vi.mock('next/link', () => ({
  // eslint-disable-next-line react/display-name
  default: forwardRef<HTMLAnchorElement, {href: string; children: React.ReactNode}>(({href, children, ...rest}, ref) => (
    <a ref={ref} href={href} {...rest}>{children}</a>
  )),
}))

import {CaseResultsSection} from '../CaseResultsSection'
import {TestimonialCard} from '@/components/ui/TestimonialCard'
import {CardLink} from '@/components/ui/CardLink'

describe('light cards declare a light context, so a dark band cannot recolor their text', () => {
  it('case results in a dark band', () => {
    const {container} = render(
      <CaseResultsSection
        data={{heading: 'Results', caseResults: [{_id: 'r1', amount: '$1M', caseType: 'Injury', year: '2024'}], appearance: {surface: 'dark'}} as never}
        disclaimer="Past results do not guarantee future outcomes."
      />,
    )
    const band = container.querySelector('section')
    expect(band?.getAttribute('data-ring-context')).toBe('dark')
    const card = container.querySelector('li')
    expect(card?.getAttribute('data-ring-context')).toBe('light')
    expect(card?.className).toContain('bg-muted')
  })

  it('a testimonial card', () => {
    const {container} = render(<TestimonialCard t={{_id: 't', quote: 'Superb counsel.', name: 'A client'} as never} />)
    const card = container.querySelector('article')
    expect(card?.getAttribute('data-ring-context')).toBe('light')
    expect(card?.className).toContain('bg-background')
  })

  it('a whole-card link (attorney, post and city cards)', () => {
    const {container} = render(<CardLink href="/x">card</CardLink>)
    const card = container.firstChild as HTMLElement
    expect(card.getAttribute('data-ring-context')).toBe('light')
    expect(card.className).toContain('bg-background')
  })
})
