import {beforeEach, describe, expect, it, vi} from 'vitest'

/**
 * Doctrine: `BI-URL-Architecture.md` → SEARCH-1 (the site-wide setting wins
 * over any page setting, with no exception) and SEARCH-8 (hidden and nofollow
 * are independent per-page controls).
 *
 * THERE WAS NO TEST HERE UNTIL 2026-07-26, and that is why the leak survived:
 * a page with `noFollow` on and `noIndex` off returned `{index: true, ...}`,
 * and because a route's metadata REPLACES the root layout's, that page rendered
 * `index, nofollow` while the whole site was hidden. Every existing test passed
 * throughout.
 *
 * The site-hidden cases below are the ones that matter. The visible cases are
 * here so that closing the leak cannot quietly disable the per-page controls,
 * which is the obvious way to "fix" this wrongly.
 */

const fetchMock = vi.fn()
vi.mock('@/lib/sanity/client', () => ({client: {fetch: (...a: unknown[]) => fetchMock(...a)}}))

const {buildRobotsMeta} = await import('../robotsMeta')

function siteHidden(hidden: boolean) {
  // resolveHidden is fail-closed: only an explicit `false` means visible.
  fetchMock.mockResolvedValue(hidden ? true : false)
}

beforeEach(() => fetchMock.mockReset())

describe('SEARCH-1 — the site-wide setting wins over any page setting', () => {
  it('the leak: nofollow on, noindex off, site hidden — must NOT render indexable', async () => {
    siteHidden(true)
    expect(await buildRobotsMeta(false, true)).toEqual({robots: {index: false, follow: false}})
  })

  it('a page explicitly marked visible is still hidden', async () => {
    siteHidden(true)
    expect(await buildRobotsMeta(false, false)).toEqual({robots: {index: false, follow: false}})
  })

  it('a page marked hidden stays hidden', async () => {
    siteHidden(true)
    expect(await buildRobotsMeta(true, false)).toEqual({robots: {index: false, follow: false}})
  })

  it('no page setting at all is hidden', async () => {
    siteHidden(true)
    expect(await buildRobotsMeta(undefined, undefined)).toEqual({robots: {index: false, follow: false}})
  })

  it('fails closed — an unreachable dataset resolves to hidden', async () => {
    fetchMock.mockResolvedValue(undefined)
    expect(await buildRobotsMeta(false, true)).toEqual({robots: {index: false, follow: false}})
  })
})

describe('site visible — the per-page controls still work', () => {
  it('neither control set emits nothing, so the page inherits the layout', async () => {
    siteHidden(false)
    expect(await buildRobotsMeta(false, false)).toEqual({})
  })

  it('SEARCH-8: a hidden page still follows its links', async () => {
    siteHidden(false)
    expect(await buildRobotsMeta(true, false)).toEqual({robots: {index: false, follow: true}})
  })

  it('nofollow alone leaves the page indexable', async () => {
    siteHidden(false)
    expect(await buildRobotsMeta(false, true)).toEqual({robots: {index: true, follow: false}})
  })

  it('both set', async () => {
    siteHidden(false)
    expect(await buildRobotsMeta(true, true)).toEqual({robots: {index: false, follow: false}})
  })
})
