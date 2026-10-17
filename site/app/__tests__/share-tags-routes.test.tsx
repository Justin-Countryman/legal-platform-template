import {describe, it, expect, vi, beforeEach} from 'vitest'

// Monorepo backlog 517: a route that builds its own share card replaced the root layout's whole `openGraph`, so pages
// sent no og:type (and no og:site_name or og:locale), and nothing set og:url. Each route now hands its canonical to the
// card, so og:url is the canonical address and og:type is set.

vi.mock('@/lib/sanity/client', () => ({client: {fetch: vi.fn()}}))
vi.mock('next/navigation', () => ({notFound: () => { throw new Error('notFound') }}))

import {client} from '@/lib/sanity/client'
import * as Q from '@/lib/sanity/queries'
import {generateMetadata as testimonials} from '@/app/(site)/testimonials/page'
import {generateMetadata as caseResults} from '@/app/(site)/case-results/page'
import {generateMetadata as blogPost} from '@/app/(site)/blog/[slug]/page'

const CHROME = {nap: {firmName: 'Example Firm', locations: []}, designTokens: null, globalCta: null}

function serve(answers: Record<string, unknown>) {
  vi.mocked(client.fetch).mockImplementation((async (query: string) => {
    if (query === Q.SITE_CHROME_QUERY) return CHROME
    return query in answers ? answers[query] : null
  }) as never)
}

beforeEach(() => vi.mocked(client.fetch).mockReset())

describe('every page sends og:type and its canonical as og:url', () => {
  it('the testimonials page', async () => {
    serve({[Q.TESTIMONIALS_PAGE_QUERY]: {title: 'Testimonials', testimonials: [{_id: 't1', quote: 'Kind.'}]}})
    const md = await testimonials()
    const og = md.openGraph as Record<string, unknown>
    expect([og.type, og.url]).toEqual(['website', '/testimonials'])
    expect(og.url).toBe(md.alternates?.canonical)
  })

  it('the case results page, with its own canonical override', async () => {
    serve({[Q.CASE_RESULT_INDEX_QUERY]: {title: 'Results', canonicalUrl: 'https://www.example.test/case-results',
      results: [{_id: 'r1', amount: 'Dismissed'}]}})
    const md = await caseResults()
    expect((md.openGraph as Record<string, unknown>).url).toBe('https://www.example.test/case-results')
  })

  it('a blog post is an article', async () => {
    serve({[Q.BLOG_POST_PAGE_QUERY]: {h1: 'A Post', slug: 'blog/a-post', publishedAt: '2026-01-02'}})
    const md = await blogPost({params: Promise.resolve({slug: 'a-post'})})
    const og = md.openGraph as Record<string, unknown>
    expect([og.type, og.url]).toEqual(['article', '/blog/a-post'])
  })
})
