import {describe, it, expect} from 'vitest'
import {readFileSync} from 'node:fs'
import path from 'node:path'

import {metadata as rootMetadata} from '@/app/not-found'
import {metadata as siteMetadata} from '@/app/(site)/not-found'
import {NOT_FOUND_TITLE} from '@/lib/seoTitle'

/**
 * TECH-2's third surface: **a not-found boundary emits NO canonical, and none is
 * owed.** Ruled 2026-08-10, `BI/rules/technical-seo.md` build queue line 11 —
 * the half of that line that was a RULING rather than a build.
 *
 * TECH-2 requires a self-referencing canonical of every page that renders at a
 * URL, and both boundaries render at a URL, so the question was real and this
 * file is the answer rather than an assumption. **A canonical is a claim that
 * THIS page is the indexable address for this content, and a 404 boundary has no
 * content and no address of its own** — it renders at whatever URL was missed,
 * so a self-referencing canonical would nominate a URL that does not exist as
 * canonical, and a canonical naming anything else is the cross-page consolidation
 * TECH-2 prohibits outright. The honest signal is the status code, which TECH-11
 * already owns and the post-deploy check now asserts.
 *
 * **The mechanism makes the same answer the only reachable one, which is worth
 * separating from the reasoning above.** `generateMetadata` does not run in a
 * not-found boundary — measured 2026-07-26 with a cleared cache, after a stale
 * `.next` build said otherwise — so a boundary cannot compute a per-URL value at
 * all. A static export could only hardcode one address for every missed URL,
 * which is worse than emitting none. The ruling and the mechanism agree; the
 * ruling is what governs.
 *
 * Two kinds of assertion below, and the second exists because the first is
 * weaker than it looks. Reading the exported `metadata` object proves what the
 * boundary declares TODAY; reading the source proves nothing was added that
 * declares one by another route — `alternates` on a nested key, a spread from a
 * helper. Neither alone is the assertion.
 */

const BOUNDARIES = [
  ['app/not-found.tsx', rootMetadata],
  ['app/(site)/not-found.tsx', siteMetadata],
] as const

const SITE_ROOT = path.resolve(__dirname, '..', '..')

describe('TECH-2: a not-found boundary emits no canonical, and none is owed', () => {
  it.each(BOUNDARIES)('%s declares no alternates at all', (_file, metadata) => {
    expect(metadata.alternates).toBeUndefined()
  })

  it.each(BOUNDARIES)('%s still carries the ruled title', (_file, metadata) => {
    // The boundary is not metadata-free — it has exactly one job here, and a
    // check that only asserted an absence would go green on an empty export.
    expect(metadata.title).toBe(NOT_FOUND_TITLE)
  })

  it.each(BOUNDARIES)('%s names no canonical anywhere in its source', (file) => {
    const source = readFileSync(path.join(SITE_ROOT, file), 'utf8')
    // Comments are stripped first: this file's own reasoning, and the
    // boundaries', discuss canonicals at length, and a check that read prose as
    // code would be unfixable without deleting the explanation.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
    expect(code).not.toMatch(/canonical/i)
    expect(code).not.toMatch(/alternates/)
  })

  it.each(BOUNDARIES)('%s exports no generateMetadata, which could not run', async (file) => {
    // Not style. `generateMetadata` DOES NOT RUN in a not-found boundary — a
    // stale .next cache said it did on 2026-07-26 and that wrong measurement
    // reached doctrine before it was caught. One added here would be inert and
    // would read as coverage.
    const mod = await import(/* @vite-ignore */ '@/' + file.replace(/\.tsx$/, ''))
    expect(mod.generateMetadata).toBeUndefined()
  })
})
