/**
 * **Undated content never outranks dated content.** Ruled by Justin 2026-08-12,
 * platform-wide, from the Robert Edwards dogfood.
 *
 * GROQ sorts `null` FIRST under `order(field desc)`. Measured, not assumed —
 * against the live API on 2026-08-12:
 *
 *     [{"p":"2026-01-01"},{"p":null},{"p":"2010-01-01"}] | order(p desc)
 *     → null, 2026-01-01, 2010-01-01
 *
 * So every newest-first blog surface put an undated post at the TOP: the blog
 * index, the category page, the related-posts rails and the recent-posts
 * sidebar. A post nobody had dated became the lead item on all of them, which
 * is the opposite of what "no date" should mean.
 *
 * THE FAILURE IS SILENT AND LOOKS LIKE CONTENT. Nothing errors, nothing logs,
 * `tsc` is green, and the page renders perfectly — with the wrong post first.
 * It surfaces only when somebody notices the running order is wrong, and on a
 * migrated blog nobody knows the right order by heart. That is why this is
 * pinned as a guard over the query text rather than left to review.
 *
 * The fix is a two-key sort, `order(defined(publishedAt) desc, publishedAt
 * desc)`: defined rows first, then newest-first within them. A
 * `coalesce(publishedAt, "0000-01-01")` sentinel sorts identically and was the
 * rejected alternative — it invents a date to mean "no date", and an invented
 * date is a value that can leak into a comparison somewhere else.
 *
 * WHAT THIS CANNOT CATCH, stated so it is not read as complete: a NEW ordering
 * added in another file. The guard scans this one, because that is where every
 * blog ordering lives today. A second file would need adding here.
 */

import {describe, expect, it} from 'vitest'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'

const QUERIES_PATH = join(__dirname, '..', 'sanity', 'queries.ts')
const source = readFileSync(QUERIES_PATH, 'utf8')

/**
 * Every `order(...)` clause that sorts on publishedAt, however spelled.
 *
 * The inner alternation allows ONE level of nested parens, which is not
 * decoration: the fixed form contains `defined(publishedAt)`, so a naive
 * `[^)]*` stops at that inner `)` and captures a truncated clause that can
 * never match its own fix. The first draft of this file did exactly that and
 * reported all six sites as offenders.
 */
const ORDER_CLAUSES = /order\(([^()]*(?:\([^()]*\)[^()]*)*publishedAt[^()]*(?:\([^()]*\)[^()]*)*)\)/g

describe('publishedAt ordering — undated never outranks dated', () => {
  it('has at least one ordering site, so a passing run means something', () => {
    // A guard that silently matches nothing is worse than no guard: it reports
    // green forever after somebody renames the field.
    const found = source.match(ORDER_CLAUSES) ?? []
    expect(found.length).toBeGreaterThan(0)
  })

  it('every publishedAt ordering puts defined rows first', () => {
    const offenders: string[] = []
    for (const [clause] of source.matchAll(ORDER_CLAUSES)) {
      if (!clause.includes('defined(publishedAt) desc')) offenders.push(clause)
    }
    expect(
      offenders,
      'a publishedAt ordering does not sort undated rows last. GROQ puts null ' +
        'FIRST under `desc`, so this clause makes an undated post the lead item. ' +
        'Use `order(defined(publishedAt) desc, publishedAt desc)`.',
    ).toEqual([])
  })

  it('no bare `order(publishedAt desc)` survives anywhere in the file', () => {
    // The literal form the ruling replaced. Pinned by itself because it is what
    // a copy-paste of an older query would reintroduce.
    expect(source).not.toContain('order(publishedAt desc)')
  })

  it('covers every known blog ordering surface', () => {
    // Count, not names: the surfaces are index, category, two related-post
    // rails, and two sidebar modes. If one is deleted or a seventh is added,
    // this fails and someone reads the list again rather than assuming.
    const count = [...source.matchAll(ORDER_CLAUSES)].length
    expect(count).toBe(6)
  })
})
