import {__unstable__loadDesignSystem} from '@tailwindcss/node'
import fs from 'node:fs'
import path from 'node:path'
import {beforeAll, describe, expect, it} from 'vitest'
import {render} from '@testing-library/react'

import {findUnknown, readPlainCssClasses} from '../../../scripts/check-unknown-utility-classes.mjs'
import {COUNT_GRID_CLASSES, columnsFor, countGridClasses, countGridPlan, AREA_CARD_TIERS, AREA_ROW_TIERS, AREA_SIDEWAYS_TIERS, CASE_RESULT_TIERS, NARROW_FEW, NARROW_ONE_ROW, itemTiers, type GridTier} from '../countGrid'
import {SiloTileLayout as SiloTile, SiloInline, SiloSpotlight, SiloFeature, SiloSplit, type SiloLayoutProps} from '../silo/SiloLayouts'
import {ContentSectionBlock} from '../ContentSectionBlock'
import {CaseResultsSection} from '../CaseResultsSection'

// THE OTHER GRIDS FOLLOW THEIR COUNT TOO (Phase 18 session D; monorepo WS-HOMEPAGE-LAYOUT-CHOICE-DESIGN.md §11.2 item 1).
//
// Session B made the attorney and testimonial cards follow their count (`cardGrid.ts`). The grids the build writes
// beside them did not: the practice areas drew three across and the rows two across whatever their count, so four,
// five, seven or eight areas left a short row packed left; a content section's items drew two across, so the
// firm-data path's three differentiators always left one alone; case results three across. On the study's rated law
// sites a short last row is close to absent (3 of 49 pages). This plan is what the browser draws at each width.

const SITE_ROOT = path.resolve(__dirname, '../../..')
let designSystem: {candidatesToCss: (names: string[]) => (string | null)[]}
let plainCss: Set<string>
beforeAll(async () => {
  designSystem = await __unstable__loadDesignSystem(fs.readFileSync(path.join(SITE_ROOT, 'app/globals.css'), 'utf8'), {base: SITE_ROOT})
  plainCss = readPlainCssClasses(SITE_ROOT)
})

/** Where the classes place each item at a tier: the start of each item, row by row, in a grid of twice the columns. */
function placed(count: number, tiers: readonly GridTier[], at: number): number[][] {
  const {list, items} = countGridClasses(count, tiers)
  const upTo = tiers.slice(0, at + 1).map((t) => t.prefix)
  const lastOf = (tokens: string[], re: (p: string) => RegExp) => {
    let v: string | undefined
    for (const p of upTo) for (const c of tokens) { const m = re(p).exec(c); if (m) v = m[1] }
    return v
  }
  const esc = (p: string) => p.replace('@', '\\@')
  const grid = Number(lastOf(list.split(' '), (p) => new RegExp(`^${esc(p)}:grid-cols-(\\d+)$`)) ?? 1)
  const rows: number[][] = []
  let row: number[] = []
  let cursor = 1
  items.forEach((cls) => {
    const tokens = cls.split(' ')
    const span = Number(lastOf(tokens, (p) => new RegExp(`^${esc(p)}:col-span-(\\d+)$`)) ?? 1)
    const start = lastOf(tokens, (p) => new RegExp(`^${esc(p)}:col-start-(\\d+|auto)$`))
    const fixed = start && start !== 'auto' ? Number(start) : undefined
    if (fixed !== undefined ? fixed < cursor : cursor + span - 1 > grid) {
      rows.push(row)
      row = []
      cursor = 1
    }
    const begin = fixed ?? cursor
    row.push(begin)
    cursor = begin + span
  })
  rows.push(row)
  return rows
}

describe('the plan: columns by count, at every tier', () => {
  it('puts every item on one row up to the widest, and four areas four across where the band is wide', () => {
    for (let n = 1; n <= 4; n++) expect(countGridPlan(n, AREA_CARD_TIERS).at(-1)).toEqual({prefix: '@6xl', columns: n, lastRow: n})
    expect(countGridPlan(4, AREA_CARD_TIERS).map((t) => t.columns)).toEqual([2, 2, 4])
  })

  it('never leaves one item alone on the last row where a column count the tier may choose avoids it', () => {
    for (const tiers of [AREA_CARD_TIERS, AREA_ROW_TIERS, CASE_RESULT_TIERS, itemTiers(5)]) {
      for (let n = 2; n <= 24; n++) {
        for (const {prefix, columns, lastRow} of countGridPlan(n, tiers)) {
          const widest = tiers.find((t) => t.prefix === prefix)!.widest
          if (n > columns && lastRow === 1) {
            const choices = [widest, widest - 1].filter((c) => c >= 2)
            expect(choices.every((c) => n % c === 1), `n=${n} ${prefix} chose ${columns}`).toBe(true)
          }
        }
      }
    }
  })

  it('a section of three items in a column sets them one per row', () => {
    expect(countGridPlan(3, itemTiers(3)).map((t) => t.columns)).toEqual([1])
    expect(countGridPlan(4, itemTiers(4)).map((t) => t.columns)).toEqual([2])
  })

  it('columnsFor: divides the count where it can, else leaves a pair or more', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => columnsFor(n, 4))).toEqual([1, 2, 3, 4, 3, 3, 4, 4, 3, 4])
    expect([4, 5, 7].map((n) => columnsFor(n, 3))).toEqual([2, 3, 3])
  })
})

describe('the classes: what the plan draws', () => {
  it('centres every short last row, at every tier, and fills every other row from the left', () => {
    for (const tiers of [AREA_CARD_TIERS, AREA_ROW_TIERS, CASE_RESULT_TIERS, itemTiers(5), itemTiers(3)]) {
      for (let n = 1; n <= 16; n++) {
        countGridPlan(n, tiers).forEach(({prefix, columns, lastRow}, at) => {
          const rows = placed(n, tiers, at)
          const grid = columns * 2
          expect(rows.map((r) => r.length), `n=${n} ${prefix}`).toEqual([...Array(rows.length - 1).fill(columns), lastRow])
          for (const r of rows.slice(0, -1)) expect(r[0], `n=${n} ${prefix}`).toBe(1)
          const last = rows.at(-1)!
          expect(last[0] - 1, `n=${n} ${prefix}: the last row is off centre`).toBe(grid - (last.at(-1)! + 1))
        })
      }
    }
  })

  it('every class the plan can write resolves through Tailwind, and is written out whole for its scanner', () => {
    expect(findUnknown([...COUNT_GRID_CLASSES], designSystem, plainCss)).toEqual([])
    for (const tiers of [AREA_CARD_TIERS, AREA_SIDEWAYS_TIERS, AREA_ROW_TIERS, CASE_RESULT_TIERS, itemTiers(3), itemTiers(5)]) {
      for (let n = 1; n <= 24; n++) {
        for (const narrow of [{}, NARROW_FEW, NARROW_ONE_ROW]) {
          const {list, items} = countGridClasses(n, tiers, narrow)
          for (const c of [...list.split(' '), ...items.flatMap((i) => i.split(' '))].filter(Boolean)) expect(COUNT_GRID_CLASSES, c).toContain(c)
        }
      }
    }
  })
})

const area = (i: number) => ({_key: `a${i}`, title: `Area ${i}`, href: `/area-${i}/`, description: 'A short description.'})
const props = (n: number): SiloLayoutProps => ({items: Array.from({length: n}, (_, i) => area(i + 1)), ariaLabel: 'Practice areas', hoverEffects: [], showArrow: true, iconPosition: 'none'}) as unknown as SiloLayoutProps

describe('the sections draw the plan', () => {
  it('every upright area layout draws its count: four areas four across where the band is wide, two by two narrower', () => {
    for (const Layout of [SiloTile, SiloSpotlight, SiloFeature]) {
      const ul = render(<Layout {...props(4)} />).container.querySelector('ul')!
      expect(ul.className.split(' ')).toEqual(expect.arrayContaining(['@4xl:grid-cols-4', '@6xl:grid-cols-8']))
      expect(ul.className.split(' ')).not.toContain('@4xl:grid-cols-3')
    }
  })

  it('one or two areas or results keep the width they had, never one card across the band', () => {
    for (const Layout of [SiloTile, SiloSpotlight, SiloFeature, SiloSplit]) {
      expect(render(<Layout {...props(1)} />).container.querySelector('ul')!.className.split(' ')).toContain('max-w-sm')
      expect(render(<Layout {...props(2)} />).container.querySelector('ul')!.className.split(' ')).toContain('max-w-3xl')
    }
    expect(render(<SiloInline {...props(1)} />).container.querySelector('ul')!.className.split(' ')).toContain('max-w-xl')
    const one = [{_id: 'r1', amount: '$100,000', caseType: 'Injury'}]
    expect(render(<CaseResultsSection disclaimer="Results vary." data={{heading: 'Results', caseResults: one} as never} />).container.querySelector('ul')!.className.split(' ')).toContain('max-w-sm')
  })

  it('split area cards lie sideways, so they go at most three across, as session B’s sideways cards', () => {
    const ul = render(<SiloSplit {...props(4)} />).container.querySelector('ul')!
    expect(ul.className.split(' ')).not.toContain('@6xl:grid-cols-8')
    expect(ul.className.split(' ')).toContain('@6xl:grid-cols-4')
  })

  it('five area rows centre the fifth', () => {
    const lis = [...render(<SiloInline {...props(5)} />).container.querySelectorAll('ul > li')].map((li) => li.className.split(' '))
    expect(lis[4]).toContain('@xl:col-start-2')
  })

  it('three items in a section are one per row, and four two by two', () => {
    const three = render(<ContentSectionBlock disclaimer="" scale="marketing" data={{layout: 'twoColumnText', heading: 'H', items: [1, 2, 3].map((i) => ({_key: `i${i}`, title: `T${i}`}))} as never} />).container
    expect(three.querySelector('ul')!.className.split(' ')).not.toContain('sm:grid-cols-4')
    const four = render(<ContentSectionBlock disclaimer="" scale="marketing" data={{layout: 'twoColumnText', heading: 'H', items: [1, 2, 3, 4].map((i) => ({_key: `i${i}`, title: `T${i}`}))} as never} />).container
    expect(four.querySelector('ul')!.className.split(' ')).toContain('sm:grid-cols-4')
  })

  it('four case results draw two by two, not three and one alone', () => {
    const results = [1, 2, 3, 4].map((i) => ({_id: `r${i}`, amount: `$${i}00,000`, caseType: 'Injury'}))
    const ul = render(<CaseResultsSection disclaimer="Results vary." data={{heading: 'Results', caseResults: results} as never} />).container.querySelector('ul')!
    expect(ul.className.split(' ')).not.toContain('lg:grid-cols-3')
  })
})
