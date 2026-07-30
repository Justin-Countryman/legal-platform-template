/**
 * The blog post breadcrumb: what it ends with, and where it sits.
 *
 * `BI-PRINCIPLES.md` → CRUMB-2 and CRUMB-1, ruled 2026-07-29.
 *
 * WHY THIS FILE EXISTS AT ALL. A post rung was added to this trail on 2026-07-29
 * and removed the same day, and **removing it turned nothing red** — all 1783
 * tests stayed green. The rung had no coverage of any kind: no unit test, no
 * source assertion, nothing. So the trail's shape has been decided three times
 * in two days by whoever last edited the route, and nothing has ever held it.
 * That is the gap this closes, and it is worth more than either ruling.
 *
 * WHY IT READS SOURCE. The trail is assembled inline in a server component that
 * fetches from Sanity, so there is no exported function to call and no render to
 * assert against without a live dataset. The alternative — extracting a helper —
 * is a refactor this pass was told not to make. What can be checked is the shape
 * of the array literal, which is where all three decisions were made.
 */

import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {describe, expect, it} from 'vitest'

const ROUTE = 'app/(site)/blog/[slug]/page.tsx'

function source(): string {
  return readFileSync(join(process.cwd(), ROUTE), 'utf8')
}

/** The `breadcrumbItems = [...]` literal, comments stripped. */
function trailLiteral(src: string): string {
  const at = src.indexOf('const breadcrumbItems = [')
  expect(at, 'breadcrumbItems array not found — it was renamed or restructured').toBeGreaterThan(-1)
  const rest = src.slice(at)
  const end = rest.indexOf('\n  ]')
  return rest.slice(0, end).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
}

describe('CRUMB-2: the trail ends at the parent, not at the post', () => {
  it('carries a Home rung and a Blog rung', () => {
    const trail = trailLiteral(source())
    expect(trail).toContain("{label: 'Home', href: '/'}")
    expect(trail).toContain('INDEX_PAGE_PRESETS.blogIndex')
  })

  it('carries the category rung, resolved rather than read raw', () => {
    const trail = trailLiteral(source())
    expect(trail).toContain('post.category')
    // Through the one resolver, so a category with a nav label is honoured.
    // Reading `category.title` directly is the shape NAME-3 removed.
    expect(trail).toContain('resolvePageLabel(post.category)')
    expect(trail).not.toContain('post.category.title')
  })

  it('does NOT carry a rung for the post itself', () => {
    // The exception in CRUMB-2, and the assertion that would have caught the
    // rung being added. `post.slug` as an href, or the post's own resolved
    // label as a final item, are the two shapes it took.
    const trail = trailLiteral(source())
    expect(trail, 'a post rung is back — CRUMB-2 omits it').not.toContain('post.slug')
    expect(trail, 'a post rung is back — CRUMB-2 omits it').not.toMatch(
      /resolvePageLabel\(post\)|postLabel/,
    )
  })

  it('ends at the category rung — no item follows it', () => {
    // Order matters: the category is the LAST item. A rung added after it is what
    // this catches even if it is spelled some third way — counting `{label:`
    // occurrences rather than pattern-matching the rung's contents, because the
    // first draft of this assertion tried to strip the category's own href and
    // its leftovers read as a fourth item.
    const trail = trailLiteral(source())
    const items = trail.match(/\{label:/g) ?? []
    expect(items.length, 'expected exactly three: Home, Blog, category').toBe(3)
  })
})
describe('CRUMB-1: the breadcrumb sits in its own strip below the hero', () => {
  const BAND = 'bg-muted border-b border-border px-[5%] py-3'

  it('renders the trail in the shared band, not on the hero background', () => {
    expect(source()).toContain(BAND)
  })

  it('the band sits AFTER the hero header closes', () => {
    const src = source()
    const heroClose = src.indexOf('</header>')
    const band = src.indexOf(BAND)
    expect(heroClose, '<header> not found — the hero was restructured').toBeGreaterThan(-1)
    expect(band, 'the breadcrumb band is missing').toBeGreaterThan(-1)
    expect(band, 'the breadcrumb band is inside or above the hero').toBeGreaterThan(heroClose)
  })

  it('no Breadcrumbs call remains inside the hero header', () => {
    // The two render branches (featured image / no image) each carried one.
    // Both had to move, and a half-migration is exactly what this catches.
    const src = source()
    const hero = src.slice(src.indexOf('<header'), src.indexOf('</header>'))
    expect(hero, 'a Breadcrumbs call is still inside the hero').not.toContain('<Breadcrumbs')
  })

  it('the trail is rendered exactly once', () => {
    // It used to appear twice, once per render branch. Moving it below the hero
    // collapses that to one call site; two would mean two trails on one page.
    const calls = source().match(/<Breadcrumbs\b/g) ?? []
    expect(calls.length).toBe(1)
  })
})
