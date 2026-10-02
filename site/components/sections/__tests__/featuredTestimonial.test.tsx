import {describe, it, expect, vi} from 'vitest'
import {render} from '@testing-library/react'

// ONE FEATURED QUOTE, FINISHED (Phase 18 session D; monorepo `[R-615]`: a firm with one or two testimonials shows the
// shortest as one featured quote). The band drew its heading smaller than every other section's (24 px against 36) and a
// quote larger than its own heading (30 px), across a 56rem column. Now the heading is the section tier every
// `SectionHeader` draws, the quote stays under it, and the quote keeps a reading measure.

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({src, alt}: {src: string; alt?: string}) => <img src={src} alt={alt ?? ''} />,
}))

import {FeaturedTestimonialSection} from '../FeaturedTestimonialSection'
import {SECTION_HEADER_H2_CLASS} from '@/components/ui/SectionHeader'

const PX: Record<string, number> = {'text-xl': 20, 'text-2xl': 24, 'text-3xl': 30, 'text-4xl': 36, 'text-5xl': 48}
const largest = (cls: string) => Math.max(...cls.split(' ').map((c) => PX[c.replace(/^(sm|md|lg|xl):/, '')] ?? 0))

describe('the featured testimonial', () => {
  const data = {heading: 'What clients say', testimonial: {quote: 'They explained every option and answered every call.', name: 'A. Client'}}

  it('draws its heading at the section tier, as every other section does', () => {
    const h2 = render(<FeaturedTestimonialSection data={data as never} />).container.querySelector('h2')!
    for (const c of SECTION_HEADER_H2_CLASS.md.split(' ').filter((x) => /text-\d?xl/.test(x))) expect(h2.className.split(' ')).toContain(c)
  })

  it('keeps the quote under its heading, at a reading measure', () => {
    const c = render(<FeaturedTestimonialSection data={data as never} />).container
    const h2 = c.querySelector('h2')!
    const quote = c.querySelector('blockquote p')!
    expect(largest(quote.className)).toBeLessThan(largest(h2.className))
    expect(c.querySelector('blockquote')!.className.split(' ')).toContain('max-w-3xl')
  })
})
