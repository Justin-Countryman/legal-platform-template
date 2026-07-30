/**
 * No profile layout renders a breadcrumb, and the two families stay in step.
 *
 * `BI-PRINCIPLES.md` → CRUMB-7, ruled by the operator 2026-05-08 and restored to
 * doctrine 2026-07-29.
 *
 * THIS FILE ASSERTED THE OPPOSITE FOR ONE DAY, and that is why it is worth
 * having. The absence of a breadcrumb on the attorney layouts was recorded as a
 * violation by a survey that never asked whether the absence was chosen. It had
 * been chosen — `OUTSTANDING.md`'s Workstream 9.3 Done entry, 2026-05-08:
 * *"Attorney layouts have NO breadcrumbs by design; out of scope."* The ruling
 * lived only in a changelog, so nothing pointed at it from doctrine and nothing
 * in the tree defended it. **A rule with no assertion behind it is a rule waiting
 * to be reversed by the next person who reads the code instead of the corpus.**
 *
 * Two facts from the previous version are deliberately KEPT rather than deleted
 * with the rest, because each is load-bearing for CRUMB-7 rather than for the
 * rule it replaced:
 *
 *   1. **The families must agree.** A layout name present in both must behave the
 *      same in both. That was the shape of the original defect and it is still
 *      the shape of the next one — a fifth layout added to one family only, or a
 *      breadcrumb re-added to one side.
 *   2. **Mosaic has no hero boundary.** This is CRUMB-7's load-bearing evidence:
 *      the band has no compliant position because there is nowhere below a hero
 *      to put it. If that layout is ever split so the biography leaves the hero
 *      section, the evidence weakens and the rule deserves re-examination.
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

/** Comments stripped — a rule quoted in prose is not a render. */
function code(family: string, file: string): string {
  return readFileSync(join(process.cwd(), `components/${family}/layouts/${file}`), 'utf8')
    .replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
}

function rendersABreadcrumb(family: string, file: string): boolean {
  const src = code(family, file)
  return src.includes('<BreadcrumbBand') || src.includes('<Breadcrumbs')
}

describe('CRUMB-7: no profile layout renders a breadcrumb', () => {
  for (const family of FAMILIES) {
    for (const file of layoutNames(family)) {
      it(`${family}/${file}`, () => {
        expect(
          rendersABreadcrumb(family, file),
          `components/${family}/layouts/${file} renders a breadcrumb. CRUMB-7: the ` +
            `shared profile layouts admit no compliant position for the band — ` +
            `above the hero is forbidden by CRUMB-1, and Mosaic has no hero to be ` +
            `below. Ruled 2026-05-08, restored to doctrine 2026-07-29.`,
        ).toBe(false)
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

  it('a name in both families behaves the same in both', () => {
    const shared = layoutNames('attorney').filter((f) => layoutNames('staff').includes(f))
    expect(shared.length, 'no shared layout names — the pairing broke').toBeGreaterThanOrEqual(4)
    for (const file of shared) {
      expect(
        rendersABreadcrumb('attorney', file),
        `attorney/${file} and staff/${file} disagree about the breadcrumb. Either ` +
          `both or neither — an asymmetry here is what produced two reversals.`,
      ).toBe(rendersABreadcrumb('staff', file))
    }
  })
})

describe("CRUMB-7's evidence still holds", () => {
  it('Mosaic still has no hero boundary', () => {
    // The H1, the contact chips, an <hr> and the whole biography share one
    // section, so there is no "below the hero" to place a band in. If a refactor
    // ever separates them, this reds — and CRUMB-7's central argument should be
    // re-read rather than the test relaxed.
    for (const family of FAMILIES) {
      const src = code(family, 'FeatureGridLayout.tsx')
      const h1 = src.indexOf('<h1')
      expect(h1, 'FeatureGridLayout has no h1').toBeGreaterThan(-1)
      const closeAfterH1 = src.slice(h1).search(/\n {6}<\/(section|div)>\n/)
      const heroBlock = src.slice(h1, h1 + closeAfterH1)
      expect(
        /[Bb]iography/.test(heroBlock),
        `${family}/FeatureGridLayout.tsx now separates its hero from its body. ` +
          `CRUMB-7's evidence has changed; re-read the rule.`,
      ).toBe(true)
    }
  })
})
