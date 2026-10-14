import {describe, it, expect, vi, beforeEach} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'

// THE CASE RESULTS PAGE AND A RESULT'S OWN PAGE (monorepo backlog 454, WS-CASE-RESULTS-DESIGN-2026-10-13.md §11).
//
// Justin, 2026-10-14: "a case results index page which would just be a big list of cards and then when you click on
// each one of them um, it will go to you know case results slash the name of the case results right just like blogs",
// and a card may be "only cards with no links to a page". The bar research (§5) puts the disclaimer beside the results
// every time they show, above and below the one page that is nothing but results, and directly under a result on its
// own page; [R-702] rule 7 keeps the result out of the H1 and the title. Each route renders here against the shapes
// its query answers.

vi.mock('@/lib/sanity/client', () => ({client: {fetch: vi.fn()}}))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('notFound')
  },
}))

import {client} from '@/lib/sanity/client'
import * as Q from '@/lib/sanity/queries'
import {RESULTS_DISCLAIMER_DEFAULT} from '@/lib/legal'
import CaseResultsPage, {generateMetadata as indexMetadata} from '@/app/(site)/case-results/page'
import CaseResultPage, {generateMetadata as pageMetadata, generateStaticParams} from '@/app/(site)/case-results/[slug]/page'

const CHROME = {nap: {firmName: 'Example Firm', locations: []}, designTokens: null, globalCta: null}
const RESULTS = [
  {_id: 'r1', amount: 'Sole Custody Awarded', caseType: 'Child Custody', year: 2025, areaOfLaw: 'fam', href: '/case-results/custody-modification-dakota-county'},
  {_id: 'r2', amount: '$1.5 Million Settlement', caseType: 'Truck Accident', caption: 'A highway collision.', year: 2024, areaOfLaw: 'pi', href: null},
]
const PAGE = {
  title: 'Custody Modification, Dakota County',
  navLabel: null,
  slug: 'case-results/custody-modification-dakota-county',
  seoTitle: null,
  metaDescription: 'How a custody order was modified.',
  amount: 'Sole Custody Awarded',
  caseType: 'Child Custody',
  caption: 'The court modified the order.',
  year: 2025,
  areaOfLaw: {label: 'Family Law', slug: 'family-law'},
  practiceArea: {label: 'Child Custody', slug: 'family-law/child-custody'},
  body: [{_type: 'block', _key: 'b', style: 'normal', markDefs: [], children: [{_type: 'span', _key: 's', text: 'The facts of the case.', marks: []}]}],
  resultsDisclaimer: null,
}

function serve(answers: Record<string, unknown>) {
  vi.mocked(client.fetch).mockImplementation((async (query: string) => {
    if (query === Q.SITE_CHROME_QUERY) return CHROME
    return query in answers ? answers[query] : null
  }) as never)
}
const count = (html: string, needle: string) => html.split(needle).length - 1
const slugged = (slug: string) => ({params: Promise.resolve({slug})})

beforeEach(() => {
  vi.mocked(client.fetch).mockReset()
})

describe('/case-results, every result as a card', () => {
  it('is a 404 when no result has anything to show', async () => {
    serve({[Q.CASE_RESULT_INDEX_QUERY]: {results: []}})
    await expect(CaseResultsPage()).rejects.toThrow('notFound')
    serve({[Q.CASE_RESULT_INDEX_QUERY]: {results: [{_id: 'blank', amount: '  ', caption: ''}]}})
    await expect(CaseResultsPage()).rejects.toThrow('notFound')
  })

  it('names itself Case Results with no page document, one H1, and each card an h2 under it', async () => {
    serve({[Q.CASE_RESULT_INDEX_QUERY]: {results: RESULTS}})
    const html = renderToStaticMarkup(await CaseResultsPage())
    expect(count(html, '<h1')).toBe(1)
    expect(html).toMatch(/<h1[^>]*>Case Results<\/h1>/)
    expect(count(html, '<h2')).toBe(2)
    expect(html).toContain('Sole Custody Awarded')
    expect(html).toContain('$1.5 Million Settlement')
  })

  it('a card links only to its own page; a card without one links nowhere', async () => {
    serve({[Q.CASE_RESULT_INDEX_QUERY]: {results: RESULTS}})
    const html = renderToStaticMarkup(await CaseResultsPage())
    const list = html.slice(html.indexOf('aria-label="Case results"'), html.indexOf('</ul>', html.indexOf('aria-label="Case results"')))
    expect([...list.matchAll(/href="([^"]+)"/g)].map((m) => m[1])).toEqual(['/case-results/custody-modification-dakota-county'])
  })

  // Justin, 2026-10-14, on the grey preview: "show it once below the cards", at 14 pixels ("make it 14 then").
  it('carries the disclaimer once, directly below the list, at 14px, the site’s wording when it has one', async () => {
    serve({[Q.CASE_RESULT_INDEX_QUERY]: {results: RESULTS}})
    const html = renderToStaticMarkup(await CaseResultsPage())
    expect(count(html, 'data-testid="results-disclaimer"')).toBe(1)
    const list = html.indexOf('aria-label="Case results"')
    const disclaimer = html.indexOf('data-testid="results-disclaimer"')
    expect(disclaimer).toBeGreaterThan(list)
    expect(html.slice(disclaimer, disclaimer + 200)).toMatch(/class="[^"]*\btext-sm\b/)
    expect(count(html, RESULTS_DISCLAIMER_DEFAULT)).toBe(1)
    serve({[Q.CASE_RESULT_INDEX_QUERY]: {results: RESULTS, resultsDisclaimer: 'Our own wording.'}})
    expect(count(renderToStaticMarkup(await CaseResultsPage()), 'Our own wording.')).toBe(1)
  })

  it('reads its page document when there is one: its hero heading is the H1, its search fields the metadata', async () => {
    serve({[Q.CASE_RESULT_INDEX_QUERY]: {results: RESULTS, title: 'Results', hero: {heading: 'Our Results'}, seoTitle: 'Case Results | Example Firm', metaDescription: 'Outcomes.'}})
    const html = renderToStaticMarkup(await CaseResultsPage())
    expect(html).toContain('Our Results')
    const meta = await indexMetadata()
    expect(meta.title).toEqual({absolute: 'Case Results | Example Firm'})
    expect(meta.description).toBe('Outcomes.')
    expect(meta.alternates?.canonical).toBe('/case-results')
  })
})

describe('/case-results/<name>, a result with its own page', () => {
  it('is a 404 unless the result passes the page test, which its query carries', async () => {
    serve({})
    await expect(CaseResultPage(slugged('slip-and-fall') as never)).rejects.toThrow('notFound')
    expect(Q.CASE_RESULT_PAGE_QUERY).toContain(Q.CASE_RESULT_HAS_PAGE)
    expect(Q.CASE_RESULT_SLUGS_QUERY).toContain(Q.CASE_RESULT_HAS_PAGE)
    const call = vi.mocked(client.fetch).mock.calls.find(([q]) => q === Q.CASE_RESULT_PAGE_QUERY)
    expect(call?.[1]).toEqual({slug: 'case-results/slip-and-fall'})
  })

  it('takes its headline as the H1, shows the result with the disclaimer directly under it, then the write-up', async () => {
    serve({[Q.CASE_RESULT_PAGE_QUERY]: PAGE})
    const html = renderToStaticMarkup(await CaseResultPage(slugged('custody-modification-dakota-county') as never))
    expect(count(html, '<h1')).toBe(1)
    expect(html).toMatch(/<h1[^>]*>Custody Modification, Dakota County<\/h1>/)
    const result = html.indexOf('Sole Custody Awarded')
    const disclaimer = html.indexOf('data-testid="results-disclaimer"')
    const body = html.indexOf('The facts of the case.')
    expect(result).toBeGreaterThan(html.indexOf('<h1'))
    expect(disclaimer).toBeGreaterThan(result)
    expect(body).toBeGreaterThan(disclaimer)
    expect(count(html, 'data-testid="results-disclaimer"')).toBe(1)
    expect(html).toContain(RESULTS_DISCLAIMER_DEFAULT)
    // Its practice area (else its area of law) is a link away.
    expect(html).toContain('href="/family-law/child-custody"')
  })

  it('ends its breadcrumb at Case Results (CRUMB-2: a headline names it), and emits no review or rating markup', async () => {
    serve({[Q.CASE_RESULT_PAGE_QUERY]: PAGE})
    const html = renderToStaticMarkup(await CaseResultPage(slugged('custody-modification-dakota-county') as never))
    const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]))
    expect(ld.map((x) => x['@type'])).toEqual(['BreadcrumbList'])
    const names = ld[0].itemListElement.map((i: {name: string}) => i.name)
    expect(names).toEqual(['Home', 'Case Results'])
    expect(html).not.toMatch(/Review|AggregateRating/)
  })

  it('takes its title from the SEO Title, else its name; never from the Result', async () => {
    serve({[Q.CASE_RESULT_PAGE_QUERY]: PAGE})
    const meta = await pageMetadata(slugged('custody-modification-dakota-county') as never)
    expect(JSON.stringify(meta.title)).toContain('Custody Modification, Dakota County')
    expect(JSON.stringify(meta.title)).not.toContain('Sole Custody Awarded')
    expect(meta.alternates?.canonical).toBe('/case-results/custody-modification-dakota-county')
    serve({[Q.CASE_RESULT_PAGE_QUERY]: {...PAGE, seoTitle: 'Custody Case in Dakota County'}})
    expect((await pageMetadata(slugged('custody-modification-dakota-county') as never)).title).toEqual({absolute: 'Custody Case in Dakota County'})
  })

  it('builds a page for each slug the query lists, as its one route segment', async () => {
    serve({[Q.CASE_RESULT_SLUGS_QUERY]: ['case-results/custody-modification-dakota-county', 'blog/not-mine']})
    expect(await generateStaticParams()).toEqual([{slug: 'custody-modification-dakota-county'}])
  })
})
