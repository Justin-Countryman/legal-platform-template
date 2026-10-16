import {describe, it, expect, vi} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'

// The testimonials page's grid follows the count, as the homepage section's does (Phase 18 session B, item 2): four
// reviews go two by two, never three and one alone.

vi.mock('@/lib/sanity/client', () => ({client: {fetch: vi.fn()}}))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('notFound')
  },
}))

import {client} from '@/lib/sanity/client'
import {SITE_CHROME_QUERY, TESTIMONIALS_PAGE_QUERY} from '@/lib/sanity/queries'
import TestimonialsPage from '@/app/(site)/testimonials/page'

describe('the testimonials page', () => {
  it('draws four reviews two by two', async () => {
    const quotes = [1, 2, 3, 4].map((i) => ({_id: `t${i}`, quote: `Quote ${i}.`, name: `Client ${i}`}))
    vi.mocked(client.fetch).mockImplementation((async (query: string) => {
      if (query === TESTIMONIALS_PAGE_QUERY) return {_id: 'testimonialsPage', hero: {heading: 'Reviews'}, testimonials: quotes}
      if (query === SITE_CHROME_QUERY) return {nap: {firmName: 'Example Firm'}, globalCta: null}
      return null
    }) as never)
    const html = renderToStaticMarkup(await TestimonialsPage())
    const list = /<ul role="list" class="([^"]*)" aria-label="Client testimonials"/.exec(html)?.[1].split(' ') ?? []
    expect(list).toContain('sm:grid-cols-4')
    expect(list).not.toContain('lg:grid-cols-3')
  })

  // Monorepo backlog 409: a firm with no testimonial got a page reading "No testimonials added yet." Like
  // /case-results with no result, the address is a 404 then, and sitemap.xml lists it by the same test.
  it('is a 404 when there is no testimonial to list', async () => {
    const answer = (page: unknown) =>
      vi.mocked(client.fetch).mockImplementation((async (query: string) => {
        if (query === TESTIMONIALS_PAGE_QUERY) return page
        if (query === SITE_CHROME_QUERY) return {nap: {firmName: 'Example Firm'}, globalCta: null}
        return null
      }) as never)
    answer(null)
    await expect(TestimonialsPage()).rejects.toThrow('notFound')
    answer({_id: 'testimonialsPage', testimonials: []})
    await expect(TestimonialsPage()).rejects.toThrow('notFound')
    answer({_id: 'testimonialsPage', testimonials: [null]})
    await expect(TestimonialsPage()).rejects.toThrow('notFound')
  })
})
