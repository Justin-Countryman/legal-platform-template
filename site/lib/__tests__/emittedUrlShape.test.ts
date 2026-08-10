/**
 * Every URL this platform emits carries no trailing slash.
 *
 * Doctrine: `BI/rules/technical-seo.md` → TECH-1, ruled 2026-08-10. This file is
 * the detector for TECH-1's `JSON-LD self URLs and breadcrumb links` surface,
 * built 2026-08-10 as build-queue line 3. The other three TECH-1 surfaces are
 * detected elsewhere and this file asserts nothing about them: the canonical
 * tag and the sitemap by `BE/Post-Deploy-Check/post_deploy_check.py`, the
 * redirect map by `redirects.test.ts`, and the served 308 by nothing.
 *
 * WHY THIS IS A SOURCE-READING TEST RATHER THAN AN OUTPUT ASSERTION, and the
 * reason is not the one `schemaEntitySources.test.ts` gives. TECH-1 is ruled
 * FORWARD-LOOKING: Dudley is not retrofitted, and a reader who finds slashed
 * JSON-LD on the built Dudley site is looking at the pre-ruling state rather
 * than a defect. A served-output check pointed at a client would therefore go
 * red on a tree the ruling exempts. The template source is the thing the ruling
 * actually binds, so the template source is what this reads.
 *
 * THE ROOT IS THE ONE EXEMPTION AND IT IS NOT THIS FILE'S INVENTION. `/` has no
 * shorter shape; `redirects.ts::normalize` returns it unchanged, `same_path` and
 * `_normal_path` in the post-deploy check both fold to it, and
 * `check_canonical_shape` exempts `path == "/"` explicitly. The firm node's
 * `@id` is `<origin>/#firm` in five files and in the post-deploy check's own
 * `firm_id`, so the root form is load-bearing for ENTITY-6's identifier link.
 *
 * WHAT IS DELIBERATELY NOT CHECKED. Internal `<Link href>` navigation — the
 * sidebar, the footers, the profile cards, the design-studio sample nav — is
 * outside TECH-1's Cases table and outside build-queue line 3's scope. Those
 * hrefs are a routing question, not an emitted-URL question, and two of them
 * are compared against `usePathname()` in their own slashed form.
 *
 * BOTH CHECKERS ARE FALSIFIABLE AGAINST THE REAL PRE-FIX SHAPE. The `PRE_FIX_*`
 * constants below are the source as it actually stood before 2026-08-10, quoted
 * rather than paraphrased, and each checker is asserted RED against them.
 */

import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {describe, expect, it} from 'vitest'

/** Files that build a JSON-LD node carrying a self URL or an `@id`. */
const JSON_LD_FILES = [
  'app/layout.tsx',
  'app/(site)/[...slug]/page.tsx',
  'app/(site)/attorneys/[slug]/page.tsx',
  'app/(site)/blog/[slug]/page.tsx',
  'app/(site)/events/[slug]/page.tsx',
] as const

/**
 * Files that write a `{label, href}` literal the breadcrumb trail or the
 * `BreadcrumbList` markup emits, plus the two profile routes whose `DEFAULT_CTA`
 * is the same shape of literal. `BreadcrumbList.item` is `href` joined to the
 * host inside `Breadcrumbs.tsx`, so checking `href` checks both halves.
 */
const LABELLED_HREF_FILES = [
  'components/ui/Breadcrumbs.tsx',
  'app/(site)/blog/page.tsx',
  'app/(site)/blog/[slug]/page.tsx',
  'app/(site)/blog/category/[slug]/page.tsx',
  'app/(site)/events/page.tsx',
  'app/(site)/events/[slug]/page.tsx',
  'app/(site)/attorneys/page.tsx',
  'app/(site)/attorneys/[slug]/page.tsx',
  'app/(site)/staff/page.tsx',
  'app/(site)/staff/[slug]/page.tsx',
  'app/(site)/contact/page.tsx',
  'app/(site)/testimonials/page.tsx',
  'app/(site)/videos/page.tsx',
  'app/(site)/service-area/page.tsx',
] as const

/** A template literal with its interpolations blanked, so shape survives. */
function shape(literal: string): string {
  return literal.replace(/\$\{[^}]*\}/g, 'X')
}

/** `https://X/` and `https://X/#frag` are the root and carry no trailing slash. */
function isRoot(url: string): boolean {
  return /^https:\/\/X\/$/.test(url)
}

/**
 * Every absolute self URL in `source` whose path ends in a trailing slash.
 * A `#fragment` is stripped first: `.../riverton-law-firm/#office` is the same
 * defect as `.../riverton-law-firm/`, and it was one of them.
 */
export function slashedSelfUrls(source: string): string[] {
  const found: string[] = []
  for (const match of source.matchAll(/`(https:\/\/[^`]*)`/g)) {
    const withFragment = shape(match[1])
    const url = withFragment.split('#')[0]
    if (isRoot(url)) continue
    if (url.endsWith('/')) found.push(withFragment)
  }
  return found
}

/**
 * Every `href` on a line that also carries a `label`, whose value ends in a
 * trailing slash. Line-oriented because every such literal in the checked files
 * is written on one line; a multi-line one would be missed, which is why the
 * shape test below pins that they are all one-liners.
 */
export function slashedLabelledHrefs(source: string): string[] {
  const found: string[] = []
  for (const line of source.split('\n')) {
    if (!line.includes('label') || !line.includes('href:')) continue
    for (const match of line.matchAll(/href:\s*(?:'([^']*)'|`([^`]*)`)/g)) {
      const value = shape(match[1] ?? match[2] ?? '')
      if (value === '/') continue
      if (value.endsWith('/')) found.push(value)
    }
  }
  return found
}

function read(relative: string): string {
  return readFileSync(join(process.cwd(), relative), 'utf8')
}

// ─── The pre-fix source, quoted ───────────────────────────────────────────────

/** `app/(site)/[...slug]/page.tsx` lines 77 and 79, as they stood on 2026-08-09. */
const PRE_FIX_OFFICE_NODE = [
  "    '@type': 'LegalService',",
  "    '@id': `https://${domain}/${page.slug}/#office`,",
  '    name: officeName,',
  '    url: `https://${domain}/${page.slug}/`,',
].join('\n')

/** `components/ui/Breadcrumbs.tsx` line 92, as it stood on 2026-08-09. */
const PRE_FIX_BREADCRUMB_PUSH =
  '    if (label) items.push({label, href: `/${page.slug}/`})'

/** `app/(site)/attorneys/[slug]/page.tsx` line 44, as it stood on 2026-08-09. */
const PRE_FIX_DEFAULT_CTA =
  "const DEFAULT_CTA: ProfileCta = {label: 'Contact Us', href: '/contact/'}"

// ─── The checkers detect the defect they were built for ───────────────────────

describe('the checkers are falsifiable', () => {
  it('reds on the office node as it actually stood', () => {
    expect(slashedSelfUrls(PRE_FIX_OFFICE_NODE)).toEqual([
      'https://X/X/#office',
      'https://X/X/',
    ])
  })

  it('reds on the breadcrumb push as it actually stood', () => {
    expect(slashedLabelledHrefs(PRE_FIX_BREADCRUMB_PUSH)).toEqual(['/X/'])
  })

  it('reds on the default profile CTA as it actually stood', () => {
    expect(slashedLabelledHrefs(PRE_FIX_DEFAULT_CTA)).toEqual(['/contact/'])
  })

  it('passes the root and the firm identifier, which carry no trailing slash', () => {
    const roots = [
      '  const url = `${siteOrigin()}/`',
      '  parentOrganization: {"@id": `https://${domain}/#firm`},',
      "  const items = [{label: 'Home', href: '/'}]",
    ].join('\n')
    expect(slashedSelfUrls(roots)).toEqual([])
    expect(slashedLabelledHrefs(roots)).toEqual([])
  })
})

// ─── The live source conforms ─────────────────────────────────────────────────

describe('TECH-1 — no emitted URL carries a trailing slash', () => {
  it.each(JSON_LD_FILES)('%s emits no slashed self URL', (file) => {
    expect(slashedSelfUrls(read(file))).toEqual([])
  })

  it.each(LABELLED_HREF_FILES)('%s emits no slashed labelled href', (file) => {
    expect(slashedLabelledHrefs(read(file))).toEqual([])
  })

  it('every labelled href in the checked files is written on one line', () => {
    // The line-oriented checker above cannot see a literal split across lines,
    // so a split one would read as green. This pins the shape the checker needs
    // rather than leaving the reader to assume it.
    for (const file of LABELLED_HREF_FILES) {
      for (const line of read(file).split('\n')) {
        if (!/\blabel(?::|,|\s*})/.test(line)) continue
        if (line.includes('href')) continue
        // A `label` with no `href` on the same line is only allowed where the
        // object carries no href at all — the type declarations and the
        // destructured `{label, href}` parameter lists.
        expect(line).not.toMatch(/\{\s*label\s*:[^}]*$/)
      }
    }
  })
})
