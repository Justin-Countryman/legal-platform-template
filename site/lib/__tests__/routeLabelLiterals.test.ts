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

import {readdirSync, readFileSync} from 'node:fs'
import {join, relative} from 'node:path'
import {describe, expect, it} from 'vitest'

import {INDEX_PAGE_PRESETS} from '../pageLabel'

/**
 * Every route under `(site)`, DISCOVERED rather than listed.
 *
 * THE HAND-WRITTEN LIST WAS THE SECOND GAP IN THIS GUARD, and the worse one. It
 * named nine routes and omitted `contact`, `blog/category/[slug]` and
 * `events/[slug]` — the exact three that still built trails from literals. So
 * widening the match pattern alone would have changed nothing: those files were
 * never read. **A roster maintained by hand goes stale in the direction of
 * whatever its author had just finished looking at.**
 *
 * `design-studio` and `design-preview` are excluded: they are catalogs rendering
 * components against fixtures, so a quoted label there is sample data.
 */
function discoverRoutes(): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, {withFileTypes: true})) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name.startsWith('design-')) continue
        walk(full)
      } else if (entry.name === 'page.tsx') {
        out.push(relative(process.cwd(), full))
      }
    }
  }
  walk(join(process.cwd(), 'app/(site)'))
  return out.sort()
}

const ROUTES = discoverRoutes()

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

describe('the route roster is discovered, not listed', () => {
  it('finds every (site) route, including the three a hand-list omitted', () => {
    expect(ROUTES.length, 'discovery returned nothing').toBeGreaterThanOrEqual(12)
    for (const rel of [
      'app/(site)/contact/page.tsx',
      'app/(site)/blog/category/[slug]/page.tsx',
      'app/(site)/events/[slug]/page.tsx',
    ]) {
      expect(ROUTES, `${rel} is not being checked`).toContain(rel)
    }
  })
})

describe('no route builds a breadcrumb trail out of literals', () => {
  // WIDENED 2026-07-29. It matched only `{label: 'Home', ...}, {label: '<lit>'`
  // — a TWO-item trail — so three routes building THREE-item trails with a
  // literal in the middle passed it. Written for the shape it had just fixed;
  // it covered the instance rather than the class. `Home` stays allowed: it
  // names the site root, not a page with naming fields.
  for (const rel of [...ROUTES, ...STAFF_LAYOUTS]) {
    it(`${rel} resolves every rung`, () => {
      for (const trail of code(rel).match(/items=\{\[[\s\S]*?\]\}/g) ?? []) {
        const literals = (trail.match(/\{label: '([^']+)'/g) ?? [])
          .map((m) => m.slice("{label: '".length, -1))
          .filter((l) => l !== 'Home')
        expect(
          literals,
          `${rel} hardcodes ${JSON.stringify(literals)} in a breadcrumb trail — ` +
            `resolve it through resolvePageLabel, or read INDEX_PAGE_PRESETS when ` +
            `the label belongs to a page this route cannot fetch`,
        ).toEqual([])
      }
    })
  }
})

describe('CRUMB-4: a visible trail is always accompanied by markup', () => {
  it('every breadcrumb call site passes a domain', () => {
    // The component emits BreadcrumbList only when given one, so a call site
    // without a domain renders a trail no crawler ever sees. Ten of thirteen
    // were in that state until 2026-07-29.
    for (const rel of ROUTES) {
      for (const call of code(rel).match(/<Breadcrumbs\b[\s\S]*?\/>|<BreadcrumbBand\b[\s\S]*?\/>/g) ?? []) {
        expect(
          call.includes('domain='),
          `${rel} renders a breadcrumb with no domain — CRUMB-4: markup follows ` +
            `the visible breadcrumb, and the component emits none without it`,
        ).toBe(true)
      }
    }
  })

  it('no trail carries a placeholder href', () => {
    // `href: '#'` was inert while no domain was passed; with one it becomes
    // `https://<host>#` as a ListItem URL.
    for (const rel of [...ROUTES, ...STAFF_LAYOUTS]) {
      expect(code(rel), `${rel} carries a placeholder href`).not.toContain("href: '#'")
    }
  })
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
