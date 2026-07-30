/**
 * NAME-3: **no route file names a page.**
 *
 * The other half of the resolver collapse, and the half that a unit test of
 * `resolvePageLabel` cannot reach. A correct resolver is worth nothing while a
 * route hardcodes the answer beside it — that was Dudley's `/staff`, whose H1
 * read `Staff` from a GROQ projection while its breadcrumb read `Our Team` from
 * three literals in `staff/page.tsx`. Same page, two strings, neither of them a
 * stored name.
 *
 * WHY IT IS A SOURCE TEST. A render assertion cannot distinguish "the label came
 * from the resolver" from "the literal happens to match the stored value today".
 * The literals for `Blog` and `Events` DID match; the ones for `Our Team` did
 * not, and the only difference was luck. What is wrong is where the string comes
 * from, so that is what this reads.
 */

import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {describe, expect, it} from 'vitest'

import {INDEX_PAGE_PRESETS} from '../pageLabel'

/** Every route that renders a breadcrumb, a page header, or an index card. */
const ROUTES = [
  'app/(site)/staff/page.tsx',
  'app/(site)/attorneys/page.tsx',
  'app/(site)/blog/page.tsx',
  'app/(site)/blog/[slug]/page.tsx',
  'app/(site)/service-area/page.tsx',
  'app/(site)/testimonials/page.tsx',
  'app/(site)/events/page.tsx',
  'app/(site)/videos/page.tsx',
  'app/(site)/[...slug]/page.tsx',
]

const STAFF_LAYOUTS = [
  'components/staff/layouts/SplitHeroLayout.tsx',
  'components/staff/layouts/ClassicSidebarLayout.tsx',
  'components/staff/layouts/PremiumHorizontalLayout.tsx',
  'components/staff/layouts/FeatureGridLayout.tsx',
]

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), 'utf8')
}

/** Source with comments stripped — a literal quoted in prose is not a write. */
function code(rel: string): string {
  return read(rel).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
}

describe('no route names a page with a superseded string', () => {
  // `Our Team` is the one NAME-4 explicitly superseded, to `Our Staff`: on a law
  // firm site "team" implies attorneys are included, and that page excludes
  // them. It survived in SEVEN places — three in the staff route and one in each
  // of the four staff detail layouts — while doctrine had said `Our Staff` for a
  // day and the GROQ projection said it too.
  const SUPERSEDED = ['Our Team']

  for (const rel of [...ROUTES, ...STAFF_LAYOUTS]) {
    it(`${rel} carries none`, () => {
      for (const literal of SUPERSEDED) {
        expect(code(rel), `${rel} still names a page "${literal}"`).not.toContain(literal)
      }
    })
  }
})

describe('no route builds a breadcrumb trail out of literals', () => {
  for (const rel of [...ROUTES, ...STAFF_LAYOUTS]) {
    it(`${rel} resolves its trail`, () => {
      // `items={[{label: 'Home', href: '/'}, {label: 'Our Team', href: '/staff/'}]}`
      // is the shape. `Home` stays a literal — it names the site root, not a page
      // with a naming field — so only a SECOND literal label is a finding.
      const trail = code(rel).match(
        /\{label: 'Home', href: '\/'\},\s*\{label: '[^']+'/g,
      )
      expect(trail, `${rel} hardcodes a breadcrumb label`).toBeNull()
    })
  }
})

describe('the index-page names live in one table', () => {
  it('no route repeats a preset as its own literal', () => {
    // Each of these sat in a GROQ projection AND in a route file before NAME-3.
    // Two copies of one string is how `Our Team` outlived its own supersession.
    for (const rel of ROUTES) {
      const source = code(rel)
      for (const [docType, preset] of Object.entries(INDEX_PAGE_PRESETS)) {
        expect(
          source.includes(`'${preset}'`),
          `${rel} hardcodes ${docType}'s name "${preset}" — read INDEX_PAGE_PRESETS`,
        ).toBe(false)
      }
    }
  })

  it('mirrors NAME-4 for the five index types it rules', () => {
    // Mirror of `_shared/page_name.py::STANDARD_PAGE_PRESETS`; change both
    // together. Pinned so a drift in either repo is visible here.
    expect(INDEX_PAGE_PRESETS.blogIndex).toBe('Blog')
    expect(INDEX_PAGE_PRESETS.attorneyIndex).toBe('Our Attorneys')
    expect(INDEX_PAGE_PRESETS.staffIndex).toBe('Our Staff')
    expect(INDEX_PAGE_PRESETS.eventIndex).toBe('Events')
    expect(INDEX_PAGE_PRESETS.videoIndex).toBe('Video Library')
  })
})

describe('no GROQ projection resolves a label from a heading', () => {
  it('nothing projects a label out of hero.heading', () => {
    // Seven projections did — `"title": coalesce(hero.heading, "Our Attorneys")`
    // and siblings — which is what made the H1 and the breadcrumb the same field
    // on an index page and let a stale heading name the whole site's navigation.
    const source = readFileSync(join(process.cwd(), 'lib/sanity/queries.ts'), 'utf8')
    const withoutComments = source.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, '')
    expect(withoutComments).not.toContain('coalesce(hero.heading')
  })
})

describe('NAME-8: clipped in CSS, never shortened at source', () => {
  it('no label surface shortens a string in code', () => {
    // "Never shorten the stored or the emitted value." Truncating in code would
    // satisfy any visual check while costing the keyword in the HTML and in the
    // BreadcrumbList schema — invisible on screen, which is why the rule earns a
    // structural assertion rather than a comment.
    //
    // MATCHED ON THE ELLIPSIS-APPEND, not on `.slice()` alone. The first draft
    // banned `.slice(0,` outright and immediately caught
    // `areas.slice(0, 3)` in the attorneys route — an ARRAY being cut to three
    // practice-area chips, which is a legitimate display decision and nothing to
    // do with a naming field. A checker that reports a defect that is not there
    // is as bad as one that misses a real one.
    const surfaces = [
      'components/ui/Breadcrumbs.tsx',
      'lib/pageLabel.ts',
      ...ROUTES,
      ...STAFF_LAYOUTS,
    ]
    const APPENDS_ELLIPSIS = /(slice|substring|substr)\([^)]*\)\s*\+\s*['"`](\.\.\.|…)/
    for (const rel of surfaces) {
      const source = code(rel)
      expect(
        APPENDS_ELLIPSIS.test(source),
        `${rel} truncates a string and appends an ellipsis — NAME-8 clips in CSS`,
      ).toBe(false)
      // The same shape written the other way round.
      expect(source, `${rel} builds a truncated label`).not.toMatch(
        /['"`](\.\.\.|…)['"`]\s*\)?\s*:\s*\w*[Ll]abel/,
      )
    }
  })

  it('the breadcrumb clips the current page in CSS and sets no title tooltip', () => {
    const source = read('components/ui/Breadcrumbs.tsx')
    // `truncate` is Tailwind's overflow-hidden + nowrap + text-ellipsis, and it
    // needs a width bound and a `min-w-0` flex parent to take effect at all.
    expect(source).toContain('truncate')
    expect(source).toMatch(/max-w-\[/)
    expect(source).toContain('min-w-0')
    // No `title=` tooltip: the visible text and the accessible name are already
    // the same complete string, so a tooltip would announce the label twice.
    expect(source).not.toMatch(/title=\{item\.label\}/)
  })
})
