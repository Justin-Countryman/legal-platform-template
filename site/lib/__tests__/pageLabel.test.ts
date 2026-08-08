/**
 * THE ONE RESOLVER. `BI-Workflow.md` NAME-3, ruled 2026-07-29.
 *
 * Two of these tests are structural rather than behavioural, and they are the
 * ones that matter. The defect NAME-3 closes was not a wrong rung — it was FOUR
 * code paths each answering "what is this page called" independently, which made
 * NAME-1 and NAME-2 unenforceable. A test that only checks this function's rungs
 * would stay green while a fifth resolver grew somewhere else.
 */

import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {describe, expect, it} from 'vitest'

import {resolvePageLabel, titleCaseSlugLeaf} from '../pageLabel'
import {attorneyName} from '@/components/sections/AttorneyCardParts'

describe('resolvePageLabel — the rungs', () => {
  it('prefers the nav label', () => {
    expect(resolvePageLabel({navLabel: 'Blaine', title: 'Blaine Law Firm'})).toBe('Blaine')
  })

  it('uses the title when there is no nav label', () => {
    expect(resolvePageLabel({title: 'Our Staff', slug: 'staff'})).toBe('Our Staff')
  })

  it('falls to the title-cased slug leaf when neither is stored', () => {
    expect(resolvePageLabel({slug: 'family-law/divorce'})).toBe('Divorce')
  })

  it('treats whitespace as absent, so a blank field does not win', () => {
    expect(resolvePageLabel({navLabel: '   ', title: 'Our Staff'})).toBe('Our Staff')
    expect(resolvePageLabel({navLabel: '', title: '  ', slug: 'staff'})).toBe('Staff')
  })

  it('returns null for a page carrying none of the three', () => {
    expect(resolvePageLabel({})).toBeNull()
    expect(resolvePageLabel(null)).toBeNull()
    expect(resolvePageLabel(undefined)).toBeNull()
  })
})

describe('resolvePageLabel — the heading is not a source', () => {
  it('ignores a heading handed to it, because the type has no such field', () => {
    // NAME-2: nothing reads Heading as a fallback for anything. The rung was
    // removed from the page-name ladder on 2026-07-20 (the Kenneth/Dudley bug —
    // an SEO heading surfacing as a nav label) and does not return.
    const withHeading = {
      slug: 'civil-litigation',
      hero: {heading: 'Minnesota Litigation Attorneys'},
      h1: 'Minnesota Litigation Attorneys',
    } as Parameters<typeof resolvePageLabel>[0]
    expect(resolvePageLabel(withHeading)).toBe('Civil Litigation')
  })

  it('names no heading field anywhere in its source', () => {
    // Structural, and deliberately so: a comment saying "do not add a heading
    // rung" does not survive a confident refactor. The absence is asserted.
    const source = readFileSync(join(process.cwd(), 'lib/pageLabel.ts'), 'utf8')
    const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
    expect(code).not.toContain('heading')
    expect(code).not.toContain('h1')
  })
})

describe('a card label is the projected label, and a heading is not one', () => {
  /**
   * The GROQ half of NAME-3 resolves the label inside the projection and hands
   * the component a finished string, so nothing downstream is meant to re-decide
   * it. `attorneyName` re-decided it: it returned `a.h1 ?? a.title` from before
   * Pass D.1 until 2026-08-07, which meant the projection could be fixed — and
   * was, in Pass D.2 — while an authored Nav Label still lost to the SEO heading
   * on every attorney card. A projection-side guard cannot see that; this is the
   * call-site side of the same rule.
   *
   * Ruled 2026-08-07 by Justin, Pass D.2b: cards use the same label chain as
   * every other card, and an h1 is not a card label. `OUTSTANDING.md` item 101
   * carries the ruling.
   */

  it('returns the projected label, and an h1 does not displace it', () => {
    // The `title` key holds NAV_LABEL_EXPR's output, so this fixture is what the
    // fixed projection emits for an attorney carrying an authored Nav Label.
    // `h1` is cast in because the type no longer admits it — which is the point.
    const withHeading = {
      _id: 'a1',
      title: 'Jane Doe',
      slug: 'jane-doe',
      h1: 'Minnesota Family Law Attorney',
    } as unknown as Parameters<typeof attorneyName>[0]
    expect(attorneyName(withHeading)).toBe('Jane Doe')
  })

  it('names no heading field anywhere in its source', () => {
    // Structural, and for the reason the resolver's own version of this test
    // gives: a comment saying "do not read the heading" does not survive a
    // confident refactor. The absence is asserted, and the type having no such
    // field is what makes the absence hold.
    const source = readFileSync(join(process.cwd(), 'components/sections/AttorneyCardParts.tsx'), 'utf8')
    const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
    expect(code).not.toContain('h1')
    // `heading` is matched as a FIELD, not as a substring, because this module
    // is a component and carries the `font-heading` type token in a className.
    // The exclusion is in the detector rather than left to a reader's judgment,
    // which is the same choice `routeLabelLiterals.test.ts` makes about the
    // three `aria-label` strings it deliberately does not count.
    expect(code).not.toMatch(/[.?]\s*heading\b|\bheading\s*[:?]/)
  })
})

describe('titleCaseSlugLeaf mirrors the Python ladder', () => {
  it('lowercases minor words except the first', () => {
    // `_shared/page_name.py::titlecase_slug`. The two repos must agree, or the
    // build writes `Guardianship and Conservatorship` and the site renders
    // `Guardianship And Conservatorship` for the same page.
    expect(titleCaseSlugLeaf('guardianship-and-conservatorship')).toBe('Guardianship and Conservatorship')
    expect(titleCaseSlugLeaf('power-of-attorney')).toBe('Power of Attorney')
    expect(titleCaseSlugLeaf('the-firm')).toBe('The Firm')
  })

  it('reads the leaf of a nested slug and tolerates a trailing slash', () => {
    expect(titleCaseSlugLeaf('blaine-family-law/child-custody')).toBe('Child Custody')
    expect(titleCaseSlugLeaf('/service-area/white-bear-lake-law-firm/')).toBe('White Bear Lake Law Firm')
  })

  it('normalises shouty and mixed-case segments', () => {
    expect(titleCaseSlugLeaf('HOA-disputes')).toBe('Hoa Disputes')
  })
})

// The other half of the collapse — "no route file names a page" — is asserted in
// `routeLabelLiterals.test.ts`, which lands with the projections and the route
// files it guards. Held back deliberately: it is RED until those change, and a
// commit that ships a red assertion teaches the next reader to ignore red.
