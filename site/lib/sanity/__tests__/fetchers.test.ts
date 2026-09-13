import {describe, expect, it, vi, beforeEach} from 'vitest'

// The memoization itself is React's and is proven where it matters: the CI
// build's query ceiling in scripts/ci/build-against-stub.sh (a render that
// fetched the chrome from ten places again would cross it) and the per-page
// counts measured in the monorepo's WS-V1-PHASE8-DESIGN §0. Outside a React
// request scope `cache()` is a pass-through, so this file asserts the part
// that is ours: what each fetcher sends.

const fetchMock = vi.fn(async (query: string, params?: unknown) => {
  void query
  void params
  return {nap: {firmName: 'X'}, globalCta: null, designTokens: null, header: null}
})
vi.mock('../client', () => ({client: {fetch: (query: string, params?: unknown) => fetchMock(query, params)}}))

const {fetchCached, getCatchAllPage, getHomePage, getSiteChrome, chromeNap, chromeGlobalCta} = await import('../fetchers')
const {CATCH_ALL_PAGE_QUERY, HOME_PAGE_QUERY, SITE_CHROME_QUERY} = await import('../queries')

beforeEach(() => fetchMock.mockClear())

describe('the fetchers send the query the route expects', () => {
  it('getCatchAllPage sends the one catch-all query with the slug', async () => {
    await getCatchAllPage('estate-planning')
    expect(fetchMock).toHaveBeenCalledWith(CATCH_ALL_PAGE_QUERY, {slug: 'estate-planning'})
  })
  it('getHomePage and getSiteChrome send their composite queries with no params', async () => {
    await getHomePage()
    await getSiteChrome()
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([HOME_PAGE_QUERY, SITE_CHROME_QUERY])
  })
  it('fetchCached passes the slug as $slug and nothing when there is none', async () => {
    await fetchCached('*[_type == "x" && slug.current == $slug][0]', 'a/b')
    await fetchCached('*[_type == "y"]')
    expect(fetchMock.mock.calls[0]).toEqual(['*[_type == "x" && slug.current == $slug][0]', {slug: 'a/b'}])
    expect(fetchMock.mock.calls[1]).toEqual(['*[_type == "y"]', {}])
  })
  it('the chrome parts read off the chrome, never a query of their own', async () => {
    expect(await chromeNap()).toEqual({firmName: 'X'})
    expect(await chromeGlobalCta()).toBeNull()
    for (const call of fetchMock.mock.calls) expect(call[0]).toBe(SITE_CHROME_QUERY)
  })
})
