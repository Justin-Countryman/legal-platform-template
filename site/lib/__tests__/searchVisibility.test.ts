/**
 * The fail-closed site-wide search-visibility rule. `BI/rules/search-visibility.md`
 * → SEARCH-2 (only an explicit off makes a site visible) and SEARCH-4 (the launch
 * gate that reads the same rule from the other runtime).
 *
 * WHY THIS FILE EXISTS. The rule is written twice, in two languages, in two
 * repositories: `resolveHidden` here, and `sanity_site_hidden_from_search` in the
 * monorepo's `BE/Deploy-Setup-Tool/deploy_setup_tool.py`, whose docstring says in
 * terms that it must stay byte-identical in meaning to this one. Nothing compared
 * the copies. The platform's two-tools-share-through-`_shared` posture cannot
 * reach this pair — different languages, different repositories — so unifying
 * them means choosing a mechanism rather than moving a function.
 *
 * THE MECHANISM CHOSEN IS TWO LITERAL TRUTH TABLES, one on each side, stated in
 * full rather than derived. The table below is byte-for-byte the table in
 * `BE/Deploy-Setup-Tool/__tests__/test_launch_visibility.py`; a change to the
 * rule on either side fails a test on that side, so neither copy can move
 * quietly. **The two tables are edited together.** A convention that two places
 * must agree is not a mechanism; a table each is the cheapest thing that is one.
 *
 * `robotsMeta.test.ts` already asserts what a page does once the site's verdict
 * is known. This file asserts the verdict itself, which nothing named before.
 *
 * Built for `OUTSTANDING` item 141. THE KNOWN HOLE IS NOT CLOSED HERE: attaching
 * a domain through the Vercel dashboard bypasses the launch gate entirely and
 * nothing in the platform would notice. It stays open and is recorded on SEARCH-4.
 */
import {afterEach, describe, expect, it, vi} from 'vitest'
import {fetchSiteHiddenAtBuild, resolveHidden} from '../searchVisibility'

// ---------------------------------------------------------------------------
// THE TRUTH TABLE. Stated literally, and stated again in the monorepo at
// BE/Deploy-Setup-Tool/__tests__/test_launch_visibility.py. Keep the two identical.
//
//   stored `siteSettings.hideFromSearch`   ->  is the site hidden?
//   explicit false ................................  VISIBLE   <- the only one
//   explicit true .................................  hidden
//   null ..........................................  hidden
//   absent (the field is not in the response) .....  hidden
//   unset (no siteSettings document exists) .......  hidden
//   unreachable (the dataset cannot be read) ......  hidden
//
// The asymmetry is the design, not an accident: wrongly hidden is one click to
// fix, wrongly listed puts a client's test site in Google's index.
// ---------------------------------------------------------------------------

// [case name, the value the GROQ query resolved to, expected `hidden`].
// The `unreachable` row has no value to pass — it is a property of the transport,
// so it is asserted against fetchSiteHiddenAtBuild below rather than dropped.
const TRUTH_TABLE: Array<[string, unknown, boolean]> = [
  ['explicit false', false, false],
  ['explicit true', true, true],
  ['null', null, true],
  ['absent', undefined, true],
  ['unset', null, true],
]

const VISIBLE_CASES = TRUTH_TABLE.filter(([, , hidden]) => !hidden).map(([name]) => name)

const ENV = {...process.env}
afterEach(() => {
  process.env = {...ENV}
  vi.unstubAllGlobals()
})

describe('resolveHidden — the fail-closed truth table', () => {
  it.each(TRUTH_TABLE)('%s', (name, value, expected) => {
    expect(
      resolveHidden(value),
      `${name}: this rule is duplicated in Deploy-Setup's sanity_site_hidden_from_search; ` +
        `if this row changed on purpose, change it there too`,
    ).toBe(expected)
  })

  it('has exactly one visible row, which is the whole rule', () => {
    // GUARD THE GUARD. A table quietly widened to make some other case visible
    // would still pass every row-by-row assertion above.
    expect(VISIBLE_CASES).toEqual(['explicit false'])
  })

  it('does not read a truthy stand-in for an explicit false', () => {
    // The near-miss worth pinning: the rule is an identity check against `false`,
    // and a truthiness rewrite would read the string "false" and 0 as visible.
    expect(resolveHidden('false')).toBe(true)
    expect(resolveHidden(0)).toBe(true)
    expect(resolveHidden('')).toBe(true)
  })
})

describe('the unreachable row — the last line of the same table', () => {
  function stubEnv() {
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = 'proj123'
    process.env.NEXT_PUBLIC_SANITY_DATASET = 'production'
  }

  it('a dataset that cannot be reached at all resolves to hidden', async () => {
    stubEnv()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    expect(await fetchSiteHiddenAtBuild()).toBe(true)
  })

  it('a non-200 response resolves to hidden', async () => {
    stubEnv()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: false}))
    expect(await fetchSiteHiddenAtBuild()).toBe(true)
  })

  it('a missing project or dataset resolves to hidden before any request', async () => {
    delete process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
    delete process.env.NEXT_PUBLIC_SANITY_DATASET
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await fetchSiteHiddenAtBuild()).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('a reachable dataset still routes its answer through the table', async () => {
    // The transport must not have its own opinion — it resolves through
    // resolveHidden or the two copies of the rule become three.
    stubEnv()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ok: true, json: async () => ({result: false})}),
    )
    expect(await fetchSiteHiddenAtBuild()).toBe(false)

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ok: true, json: async () => ({})}),
    )
    expect(await fetchSiteHiddenAtBuild()).toBe(true)
  })
})
