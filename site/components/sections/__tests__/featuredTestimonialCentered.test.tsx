import {describe, expect, it} from 'vitest'
import {render} from '@testing-library/react'
import {FeaturedTestimonialSection} from '../FeaturedTestimonialSection'

// A CENTERED TESTIMONIAL UNDER A QUOTE MARK (monorepo WS-PREMIUM-PACKAGE-DESIGN §7.3, `[R-641]`; the mark by `[R-642]`, for
// this layout only, `[R-496]` standing everywhere else). Three of the five premium references set one testimonial large
// and centered; the platform drew it left-aligned beside a rule. Blank draws exactly as before.

const data = (layout?: string) => ({heading: 'What clients say', layout, testimonial: {quote: 'They answered every call.', name: 'A. Client'}}) as never

describe('the featured testimonial, centered', () => {
  it('centers the quote under one quote mark, with no rule', () => {
    const c = render(<FeaturedTestimonialSection data={data('centered')} />).container
    const mark = c.querySelectorAll('svg[aria-hidden="true"].text-decor')
    expect(mark).toHaveLength(1)
    const quote = c.querySelector('blockquote')!.className.split(' ')
    expect(quote).toContain('text-center')
    expect(quote).not.toContain('border-l-4')
    expect(c.querySelector('blockquote p')!.className.split(' ')).toContain('quote-centered')
    // The mark comes before the quote, never behind it.
    expect(mark[0].compareDocumentPosition(c.querySelector('blockquote')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('blank keeps the left-aligned quote beside its rule, and no mark', () => {
    const c = render(<FeaturedTestimonialSection data={data()} />).container
    expect(c.querySelector('svg.text-decor')).toBeNull()
    expect(c.querySelector('blockquote')!.className).toBe('max-w-3xl border-l-4 border-decor pl-8 text-left')
  })
})
