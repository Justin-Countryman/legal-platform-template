import {describe, it, expect} from 'vitest'
import {existsSync, readdirSync} from 'node:fs'
import {resolve} from 'node:path'

/**
 * TECH-6, TECH-7 and TECH-8 (`BI/rules/technical-seo.md`), built as that file's
 * queue line 9. `robots.txt`, the XML sitemap and the favicon are GENERATED and
 * never committed, and each rule carries the prohibition in its own words: do
 * not commit a `robots.txt` or a `sitemap.xml` into `site/public/`, and do not
 * commit an `app/favicon.ico`.
 *
 * WHY A SOURCE-SIDE CHECK, AND WHY IT IS NOT REDUNDANT WITH A SERVED ONE. Item
 * 139 records the limit this closes: nothing read off a deployed page
 * distinguishes a generated file from a committed one. Both serve 200 with
 * plausible content, so the post-launch verification build (queue line 4) can
 * say the artifact is served and cannot say where it came from. A committed file
 * SHADOWS its generator silently — Next serves `public/` ahead of the route, and
 * the route stops running with nothing said. This check reaches that half and
 * only that half.
 *
 * IT IS A FILESYSTEM QUESTION ON PURPOSE. A shadow is a file that EXISTS at the
 * shadowing path when the site is built, tracked or not — an untracked
 * `public/robots.txt` on a build machine shadows exactly as a committed one
 * does, and the deploy tools copy trees rather than git indexes.
 */

const SITE = resolve(__dirname, '../..')

/** Each generator, and the path whose existence would silence it. */
const SHADOWS: [generator: string, shadowPath: string][] = [
  ['app/robots.ts', 'public/robots.txt'],
  ['app/sitemap.ts', 'public/sitemap.xml'],
  ['app/sitemap.ts', 'public/sitemap-0.xml'],
  ['app/layout.tsx icons', 'app/favicon.ico'],
  ['app/layout.tsx icons', 'app/icon.png'],
  ['app/layout.tsx icons', 'app/apple-icon.png'],
]

describe('no committed file shadows a generated one', () => {
  it.each(SHADOWS)('%s is not shadowed by %s', (_generator, shadowPath) => {
    expect(existsSync(resolve(SITE, shadowPath))).toBe(false)
  })

  // The generators themselves. A shadow check that passes because the thing it
  // protects was deleted is worse than no check: it would go green on the exact
  // failure it exists to catch, one layer up.
  it.each(['app/robots.ts', 'app/sitemap.ts'])('the %s generator still exists', (generator) => {
    expect(existsSync(resolve(SITE, generator))).toBe(true)
  })

  // FAILS CLOSED on the directory rather than on a roster. The three names above
  // are the ones doctrine prohibits by name; Next also resolves `favicon`,
  // `icon` and `apple-icon` with several extensions, and `public/` serves
  // anything at the root. A new metadata-file convention lands here rather than
  // in a list nobody remembered to widen.
  it('public/ holds no root-level file at all, only the fonts directory', () => {
    const entries = readdirSync(resolve(SITE, 'public'), {withFileTypes: true})
    expect(entries.filter((e) => !e.isDirectory()).map((e) => e.name)).toEqual([])
    expect(entries.map((e) => e.name).sort()).toEqual(['fonts'])
  })

  it('app/ holds no favicon, icon or apple-icon file under any extension', () => {
    const stems = readdirSync(resolve(SITE, 'app'))
      .filter((name) => /^(favicon|icon|apple-icon)\./i.test(name))
    expect(stems).toEqual([])
  })
})
