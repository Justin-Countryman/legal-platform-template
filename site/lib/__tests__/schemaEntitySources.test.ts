/**
 * A firm-level or office-level schema entity never reads a page's fields.
 *
 * Doctrine: `BI/BI-PRINCIPLES.md` → ENTITY-1 and ENTITY-4, ruled 2026-07-29.
 *
 * WHY THIS IS A SOURCE-READING TEST RATHER THAN AN OUTPUT ASSERTION. The defect
 * it guards was invisible in output: the office entity read `description` from
 * `page.metaDescription`, and every Dudley meta description is blank, so nothing
 * rendered and it survived a whole pass of review. A test that checked emitted
 * JSON would have been green on it. What is wrong is the SOURCE the property
 * reads, so that is what this reads.
 *
 * IT IS FALSIFIABLE AGAINST THE REAL PRE-FIX SHAPE. `PRE_FIX_BUILDER` below is
 * the builder as it actually stood before 2026-07-29, quoted rather than
 * paraphrased. The checker is asserted RED against it and green against the
 * live source, so a checker that stopped checking cannot pass quietly.
 *
 * THE SLUG IS NOT A PAGE FIELD FOR THIS PURPOSE. An office node's `@id` and
 * `url` are built from `page.slug`, because a node's identifier and location ARE
 * the page it sits on, and ENTITY-4 requires both. `BI-URL-Architecture.md`
 * SLUG-1 rules the slug is not a naming field. What is forbidden is a page's
 * NAMING and CONTENT fields reaching a firm or office entity.
 */

import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {describe, expect, it} from 'vitest'

const ROUTE = join(process.cwd(), 'app/(site)/[...slug]/page.tsx')
const LAYOUT = join(process.cwd(), 'app/layout.tsx')

/** A page's naming and content fields. The slug is deliberately absent. */
const PAGE_FIELDS = ['title', 'metaDescription', 'h1', 'seoTitle'] as const

/** Entity types that represent the firm or one of its offices. */
const FIRM_LEVEL = ['Organization', 'LegalService', 'LocalBusiness'] as const

/**
 * Every `page.<field>` / `p.<field>` read inside a firm-level entity literal.
 * Returns `"LegalService.description <- page.metaDescription"` style findings.
 */
export function pageFieldReadsInFirmEntities(source: string): string[] {
  const findings: string[] = []
  for (const type of FIRM_LEVEL) {
    const marker = `'@type': '${type}'`
    let from = 0
    for (;;) {
      const at = source.indexOf(marker, from)
      if (at === -1) break
      from = at + marker.length
      // The object literal this @type belongs to, up to the next line that
      // closes at two-space or four-space indentation.
      const rest = source.slice(at)
      const close = rest.search(/\n {2,6}\}/)
      const body = close === -1 ? rest.slice(0, 900) : rest.slice(0, close)
      for (const field of PAGE_FIELDS) {
        const re = new RegExp(`(\\w+):[^,\\n]*\\b(?:page|p)\\.${field}\\b`)
        const m = re.exec(body)
        if (m) findings.push(`${type}.${m[1]} <- page.${field}`)
      }
    }
  }
  return findings
}

/**
 * How many office nodes a location page emits. ENTITY-4 allows exactly one.
 *
 * The window is bounded at the `isLocation` block's own close, not by a
 * character count. A fixed window ran past it into the FAQPage schema on the
 * first run and reported two — a counter that over-reaches reports a defect that
 * is not there, which is as bad as missing one.
 */
export function officeNodeCount(source: string): number {
  const gate = source.indexOf('{isLocation && (')
  if (gate === -1) return 0
  const rest = source.slice(gate)
  const close = rest.indexOf('\n      )}')
  const block = close === -1 ? rest : rest.slice(0, close)
  return (block.match(/JSON\.stringify\(build\w+Schema\(/g) ?? []).length
}

// The builder as it actually stood before 2026-07-29, quoted from the commit it
// was removed in. This is the fixture that makes the checker falsifiable.
const PRE_FIX_BUILDER = `
function buildLocalBusinessSchema(page, tokens, domain) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: resolveTokenString(page.title ?? '', tokens) || tokens?.firmName || '',
    description: resolveTokenString(page.metaDescription ?? '', tokens) || undefined,
    url: \`https://\${domain}/\${page.slug}/\`,
  }
}
`

/**
 * ENTITY-6. A nested entity that IS the firm must POINT at `#firm`, not declare
 * the firm again.
 *
 * What counts as redeclaring: carrying a `url`, an `address`, a `logo`, a
 * `contactPoint` or a `sameAs` — any property the firm node already owns. A
 * name-only nested object is a label, not a redeclaration, and is allowed.
 *
 * **AN `@id` NO LONGER EXCUSES CARRYING IDENTITY (corrected 2026-07-31), and
 * this checker is why the defect survived a whole pass in green.** It used to
 * `continue` the moment a body contained `'@id'`, on the reasoning that a node
 * with an identifier points. `parentOrganization` on the office node carried
 * `@id` AND `@type` AND `name` AND `url`, so it was skipped before any property
 * was examined. The rule says `@id` and nothing else; the checker encoded
 * doctrine's closing note, which had called that same object the pattern to
 * copy. A node carrying the firm's URL is a second assertion about the firm
 * whether or not it also carries an identifier.
 */
const NESTED_FIRM_KEYS = ['worksFor', 'publisher', 'organizer', 'provider', 'parentOrganization'] as const
const IDENTITY_PROPS = ['url', 'address', 'logo', 'contactPoint', 'sameAs'] as const

export function nestedFirmRedeclarations(source: string): string[] {
  const findings: string[] = []
  for (const key of NESTED_FIRM_KEYS) {
    const marker = `${key}: {`
    let from = 0
    for (;;) {
      const at = source.indexOf(marker, from)
      if (at === -1) break
      from = at + marker.length
      const rest = source.slice(at)
      const close = rest.indexOf('},')
      const body = close === -1 ? rest.slice(0, 400) : rest.slice(0, close)
      const carried = IDENTITY_PROPS.filter((prop) => new RegExp(`\\b${prop}:`).test(body))
      if (carried.length > 0) findings.push(`${key} redeclares the firm (carries ${carried.join(', ')})`)
    }
  }
  return findings
}

// The blog publisher exactly as it stood before 2026-07-29, quoted.
const PRE_FIX_PUBLISHER = [
  "    publisher: {",
  "      '@type': 'Organization',",
  "      name: tokens?.firmName ?? '',",
  "      url: `https://${siteHost()}/`,",
  "    },",
].join('\n')

// A name-only nested object, which ENTITY-6 explicitly allows.
const NAME_ONLY = [
  "    publisher: {",
  "      '@type': 'Organization',",
  "      name: tokens?.firmName ?? '',",
  "    },",
].join('\n')

// The office node's `parentOrganization` exactly as it stood until 2026-07-31,
// quoted. It carried an `@id` AND the firm's `url`, and the checker skipped it
// on the `@id` alone — so this shape passed for two days while doctrine's
// closing note recommended it. It is the reason the `@id` short-circuit is gone.
const PRE_FIX_PARENT_ORGANIZATION = [
  "    parentOrganization: {",
  "      '@type': 'LegalService',",
  "      '@id': `https://${domain}/#firm`,",
  "      name: tokens?.firmName ?? '',",
  "      url: `https://${domain}/`,",
  "    },",
].join('\n')

// What ENTITY-6 actually asks for: the identifier and nothing else.
const POINTS_ONLY = "    parentOrganization: {'@id': `https://${domain}/#firm`},"

describe('ENTITY-6: nested firm references point, they do not redeclare', () => {
  it('goes RED on the real pre-fix blog publisher', () => {
    expect(nestedFirmRedeclarations(PRE_FIX_PUBLISHER)).toEqual([
      'publisher redeclares the firm (carries url)',
    ])
  })

  it('goes RED on a node that carries an @id AND the firm url', () => {
    // An identifier makes a node linkable, not singular. This is the case the
    // checker used to wave through.
    expect(nestedFirmRedeclarations(PRE_FIX_PARENT_ORGANIZATION)).toEqual([
      'parentOrganization redeclares the firm (carries url)',
    ])
  })

  it('accepts the identifier alone', () => {
    expect(nestedFirmRedeclarations(POINTS_ONLY)).toEqual([])
  })

  it('allows a name-only nested object, which is a label not a redeclaration', () => {
    expect(nestedFirmRedeclarations(NAME_ONLY)).toEqual([])
  })

  it('holds in every route that nests a firm reference', () => {
    for (const rel of [
      'app/(site)/attorneys/[slug]/page.tsx',
      'app/(site)/blog/[slug]/page.tsx',
      'app/(site)/events/[slug]/page.tsx',
      'app/(site)/[...slug]/page.tsx',
    ]) {
      expect(nestedFirmRedeclarations(readFileSync(join(process.cwd(), rel), 'utf8'))).toEqual([])
    }
  })

  it('the firm node the references point at is emitted sitewide', () => {
    expect(readFileSync(LAYOUT, 'utf8')).toContain('#firm')
  })
})

describe('the checker is falsifiable', () => {
  it('goes RED on the real pre-fix builder', () => {
    const findings = pageFieldReadsInFirmEntities(PRE_FIX_BUILDER)
    expect(findings).toContain('LocalBusiness.name <- page.title')
    expect(findings).toContain('LocalBusiness.description <- page.metaDescription')
  })

  it('does not flag the slug, which ENTITY-4 requires', () => {
    expect(pageFieldReadsInFirmEntities(PRE_FIX_BUILDER).join(' ')).not.toContain('slug')
  })

  it('counts two office nodes in the pre-fix emit shape', () => {
    const preFixEmit = [
      '{isLocation && (',
      '        <>',
      '          <script dangerouslySetInnerHTML={{__html: JSON.stringify(buildOfficeLegalServiceSchema(page, tokens, siteHost()))}} />',
      '          <script dangerouslySetInnerHTML={{__html: JSON.stringify(buildLocalBusinessSchema(page, tokens, siteHost()))}} />',
      '        </>',
      '      )}',
    ].join('\n')
    expect(officeNodeCount(preFixEmit)).toBe(2)
  })
})

describe('ENTITY-1: no firm or office entity reads a page field', () => {
  it('holds in the catch-all route', () => {
    expect(pageFieldReadsInFirmEntities(readFileSync(ROUTE, 'utf8'))).toEqual([])
  })

  it('holds in the root layout', () => {
    expect(pageFieldReadsInFirmEntities(readFileSync(LAYOUT, 'utf8'))).toEqual([])
  })
})

describe('ENTITY-4: an office is one node', () => {
  it('a location page emits exactly one office node', () => {
    expect(officeNodeCount(readFileSync(ROUTE, 'utf8'))).toBe(1)
  })

  it('no LocalBusiness entity is emitted anywhere in the route', () => {
    // LegalService is a SUBTYPE of LocalBusiness. Emitting both for one office
    // says two businesses share an address, which is the defect ENTITY-4 closes.
    expect(readFileSync(ROUTE, 'utf8')).not.toContain("'@type': 'LocalBusiness'")
  })

  it('the firm and the office carry distinct identifiers', () => {
    expect(readFileSync(ROUTE, 'utf8')).toContain('#office')
    expect(readFileSync(LAYOUT, 'utf8')).toContain('#firm')
  })
})
