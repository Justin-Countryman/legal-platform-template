/**
 * Every profile layout renders a breadcrumb, and the two families stay in step.
 *
 * `BI-PRINCIPLES.md` → CRUMB-5, ruled 2026-07-29.
 *
 * WHAT THIS IS SHAPED AGAINST. `components/attorney/layouts/` and
 * `components/staff/layouts/` hold four files each, with THE SAME FOUR NAMES,
 * driven by the same `napTokens.profileLayout` switch. The staff four carried a
 * breadcrumb; the attorney four never did. Nothing failed — there was no
 * assertion in either direction, and the asymmetry survived until someone read
 * all eight files side by side.
 *
 * So the assertion is pairwise rather than per-file: **a layout name that exists
 * in both families must carry a breadcrumb in both.** That is the shape of the
 * original defect, and it is what catches a fifth layout added to one side only.
 *
 * It is deliberately AGNOSTIC about HOW the trail is rendered — `BreadcrumbBand`
 * or a hand-written band around `<Breadcrumbs>` both satisfy it. The attorney
 * four use the component; the staff four still use the inline block and will
 * migrate in the pass that moves their band below the hero. **A test that
 * demanded one spelling today would have to be edited by that pass, which is how
 * a guard becomes something you route around.**
 */

import {readdirSync, readFileSync} from 'node:fs'
import {join} from 'node:path'
import {describe, expect, it} from 'vitest'

const FAMILIES = ['attorney', 'staff'] as const

function layoutNames(family: string): string[] {
  return readdirSync(join(process.cwd(), `components/${family}/layouts`))
    .filter((f) => f.endsWith('.tsx'))
    .sort()
}

function source(family: string, file: string): string {
  return readFileSync(join(process.cwd(), `components/${family}/layouts/${file}`), 'utf8')
}

/** Comments stripped — a rule quoted in prose is not a render. */
function code(family: string, file: string): string {
  return source(family, file).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
}

function rendersABreadcrumb(family: string, file: string): boolean {
  const src = code(family, file)
  return src.includes('<BreadcrumbBand') || src.includes('<Breadcrumbs')
}

describe('CRUMB-5: every profile layout renders a breadcrumb', () => {
  for (const family of FAMILIES) {
    for (const file of layoutNames(family)) {
      it(`${family}/${file}`, () => {
        expect(
          rendersABreadcrumb(family, file),
          `components/${family}/layouts/${file} renders no breadcrumb`,
        ).toBe(true)
      })
    }
  }
})

describe('the two layout families stay in step', () => {
  it('the same four layout names exist on both sides', () => {
    // If they diverge, the pairwise check below silently stops covering the
    // unpaired file. Asserted so that divergence is a decision, not a drift.
    expect(layoutNames('attorney')).toEqual(layoutNames('staff'))
  })

  it('a name that exists in both families carries a breadcrumb in both', () => {
    const shared = layoutNames('attorney').filter((f) => layoutNames('staff').includes(f))
    expect(shared.length, 'no shared layout names — the pairing broke').toBeGreaterThanOrEqual(4)
    for (const file of shared) {
      const attorney = rendersABreadcrumb('attorney', file)
      const staff = rendersABreadcrumb('staff', file)
      expect(
        attorney,
        `staff/${file} has a breadcrumb and attorney/${file} does not — the exact ` +
          `asymmetry CRUMB-5 was ruled for`,
      ).toBe(staff)
    }
  })
})

describe('the attorney trail reads the naming fields, not a recomposed name', () => {
  for (const file of layoutNames('attorney')) {
    it(`${file} resolves its own rung`, () => {
      const src = code('attorney', file)
      // NAME-3: every surface reads its field through the one resolver.
      // `buildFullName` still composes the H1, which is the Heading field.
      expect(src).toContain('resolvePageLabel(attorney)')
      expect(src).toContain('INDEX_PAGE_PRESETS.attorneyIndex')
      // CRUMB-4: the markup follows the visible trail, which needs the domain.
      expect(src, `${file} emits no BreadcrumbList — CRUMB-4`).toContain('domain={siteHost()}')
    })
  }
})

describe('CRUMB-1: the band sits below the hero, not above it', () => {
  /**
   * `FeatureGridLayout` (Sanity name: Mosaic) IS EXCLUDED, and the exclusion is
   * the finding rather than a convenience.
   *
   * Every other profile layout opens with a hero — photo, name, H1, contact —
   * and closes it before the biography, so "below the hero" is a real position.
   * Mosaic has no such boundary: ONE `<section>` holds the photo column and a
   * content column carrying the H1, the contact chips, an `<hr>` and the whole
   * biography, and in the staff family that section IS the entire layout. Below
   * it is below the biography, which is not a hero position, it is the bottom of
   * the page.
   *
   * So CRUMB-1 has no referent here, the same way it had none on `reviewPage`,
   * and inventing one is a layout decision rather than a breadcrumb one. Both
   * families are listed because both have the shape.
   */
  const UNPLACEABLE = ['FeatureGridLayout.tsx']

  it('the exclusion list is exactly what it claims — no silent growth', () => {
    expect(UNPLACEABLE).toEqual(['FeatureGridLayout.tsx'])
    for (const family of FAMILIES) {
      expect(layoutNames(family)).toContain('FeatureGridLayout.tsx')
    }
  })

  it('Mosaic really has no hero boundary — the reason for the exclusion holds', () => {
    // If the layout is ever split so the biography leaves the hero section, this
    // reds and the exclusion must be revisited rather than carried forward.
    for (const family of FAMILIES) {
      const src = code(family, 'FeatureGridLayout.tsx')
      const h1 = src.indexOf('<h1')
      const closeAfterH1 = src.slice(h1).search(/\n {6}<\/(section|div)>\n/)
      const heroBlock = src.slice(h1, h1 + closeAfterH1)
      expect(
        /[Bb]iography/.test(heroBlock),
        `${family}/FeatureGridLayout.tsx now separates its hero from its body — ` +
          `CRUMB-1 may be placeable there now`,
      ).toBe(true)
    }
  })

  for (const family of FAMILIES) {
    for (const file of layoutNames(family).filter((f) => !UNPLACEABLE.includes(f))) {
      it(`${family}/${file} renders its band after the H1`, () => {
        const src = code(family, file)
        const band = src.search(/<BreadcrumbBand|<Breadcrumbs/)
        const h1 = src.indexOf('<h1')
        expect(h1, `${file} has no h1`).toBeGreaterThan(-1)
        expect(
          band,
          `${family}/${file} renders its breadcrumb ABOVE the hero — CRUMB-1 puts ` +
            `it below. This was the shape all four staff layouts shipped with.`,
        ).toBeGreaterThan(h1)
      })
    }
  }
})
