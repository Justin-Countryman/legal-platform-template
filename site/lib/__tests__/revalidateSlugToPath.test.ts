/**
 * The revalidation webhook's slug → path mapping.
 *
 * **The homepage is the one document whose slug is not its path**, and the
 * consequence is a FALSE SUCCESS rather than a failure. `homePage.slug.current`
 * is `home`, so the handler called `revalidatePath('/home/')` — a route that
 * does not exist — and returned HTTP 200 with `revalidated: true`. Sanity's
 * delivery log recorded it as a success. An operator editing the homepage got a
 * green webhook and a stale page, with nothing anywhere reporting a problem.
 *
 * Found 2026-08-13 on a live client, from the delivery log:
 *
 *     {"revalidated":true,"path":"/home/","now":1786673951037}
 *
 * WHY IT SURVIVED. Every other type is a straight mapping — `about` → `/about/`,
 * `blog` → `/blog/`, `personal-injury` → `/personal-injury/` — so the rule
 * looked right everywhere it was checked, and the one exception is the page most
 * likely to be edited during design tuning.
 *
 * The mapping is keyed on `_type`, not on the slug string: a practice area
 * legitimately slugged `home` is a different page and must keep `/home/`. That
 * case is pinned below, because keying on the string is the obvious shortcut and
 * would be wrong.
 */

import {describe, expect, it} from 'vitest'
import {slugToPath} from '@/app/api/revalidate/route'

describe('revalidate slug → path', () => {
  it('maps the homepage to / and not to /home/', () => {
    expect(slugToPath({_type: 'homePage', slug: 'home'})).toBe('/')
  })

  it('maps the homepage to / even if its slug is renamed', () => {
    // The route is fixed; the slug is editorial. Keying on _type means a
    // renamed slug cannot break revalidation.
    expect(slugToPath({_type: 'homePage', slug: 'front-page'})).toBe('/')
    expect(slugToPath({_type: 'homePage'})).toBe('/')
  })

  it('leaves every other type as a straight slug mapping', () => {
    for (const [type, slug, want] of [
      ['aboutPage', 'about', '/about/'],
      ['contactPage', 'contact', '/contact/'],
      ['blogIndex', 'blog', '/blog/'],
      ['practiceArea', 'personal-injury', '/personal-injury/'],
      ['blogPost', 'blog/anatomy-of-a-car-crash', '/blog/anatomy-of-a-car-crash/'],
    ] as const) {
      expect(slugToPath({_type: type, slug}), `${type} → ${want}`).toBe(want)
    }
  })

  it('does NOT key on the slug string — a non-homepage slugged "home" keeps /home/', () => {
    expect(slugToPath({_type: 'generalPage', slug: 'home'})).toBe('/home/')
  })

  it('returns null with no slug, so the caller falls back to layout-scope', () => {
    // This is the branch every settings singleton takes: no slug, so the handler
    // revalidates '/' at layout scope. It is the path that WORKS today, and the
    // reason adding the singletons to the webhook filter is sufficient for them.
    expect(slugToPath({_type: 'siteSettings'})).toBeNull()
    expect(slugToPath({})).toBeNull()
  })
})
