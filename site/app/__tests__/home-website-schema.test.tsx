import {describe, it, expect, vi, beforeEach} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'

// THE HOMEPAGE, AND ONLY THE HOMEPAGE, CARRIES ONE WebSite NODE NAMING THE FIRM
// (monorepo [R-702] rule 3, ENTITY-7). Google reads the site name from the home
// page; the rendered route is what is asserted, not the builder alone. The body
// is drawn by HomeBody, stubbed here: what is under test is the route's own markup.

vi.mock('@/lib/sanity/client', () => ({
  client: {fetch: vi.fn()},
}))
vi.mock('@/components/layout/HomeBody', () => ({HomeBody: () => null}))

import {client} from '@/lib/sanity/client'
import {HOME_PAGE_QUERY, SITE_CHROME_QUERY} from '@/lib/sanity/queries'
import HomePage from '@/app/(site)/page'

function ldNodes(html: string) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((m) => JSON.parse(m[1]))
}

function mockChrome(nap: unknown) {
  vi.mocked(client.fetch).mockImplementation(async (q: unknown) => {
    if (q === HOME_PAGE_QUERY) return {page: null, heroDesign: null, metadata: null} as never
    if (q === SITE_CHROME_QUERY) return {nap} as never
    return null as never
  })
}

beforeEach(() => vi.mocked(client.fetch).mockReset())

describe('the homepage WebSite node', () => {
  it('renders exactly one WebSite node, named for the firm', async () => {
    mockChrome({firmName: 'Marlow & Finch, PLLC', firmNameShort: 'Marlow & Finch'})
    const nodes = ldNodes(renderToStaticMarkup(await HomePage()))
    const sites = nodes.filter((n) => n['@type'] === 'WebSite')
    expect(sites).toHaveLength(1)
    expect(sites[0].name).toBe('Marlow & Finch')
    expect(sites[0].alternateName).toBe('Marlow & Finch, PLLC')
  })

  it('renders none while the dataset has no firm name', async () => {
    mockChrome(null)
    const nodes = ldNodes(renderToStaticMarkup(await HomePage()))
    expect(nodes.filter((n) => n['@type'] === 'WebSite')).toHaveLength(0)
  })
})
