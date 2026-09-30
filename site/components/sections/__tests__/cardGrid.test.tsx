import {describe, it, expect} from 'vitest'
import {render} from '@testing-library/react'

import {cardGridPlan, cardGridClasses, type CardTier} from '../cardGrid'
import {AttorneySectionBlock} from '../AttorneySectionBlock'
import {TestimonialsGridSection} from '../TestimonialsGridSection'

// A CARD GRID'S COLUMNS FOLLOW ITS COUNT: NO CARD IS LEFT ALONE ON A ROW WHERE A CHOICE AVOIDS IT.
//
// Phase 18 session 1's ledger (2026-09-30 F) and Justin's review of a throwaway: the attorney and testimonial
// grids were two, then three across whatever the count, so four attorneys or four reviews always left one card
// alone on the last row. The plan here is what the browser draws at each width; `cardGrid.ts` maps it to classes,
// and the render at 1440 and 390 was measured on a served build (the session's record).

const TIERS: CardTier[] = ['base', 'sm', 'lg']

describe('the plan: columns by count', () => {
  it('puts four upright cards four across, and four sideways cards or quotes two by two', () => {
    expect(cardGridPlan(4, 4).tiers.lg.columns).toBe(4)
    expect(cardGridPlan(4, 3).tiers.lg.columns).toBe(2)
  })

  it('sets every card of a short list on one row at the widest width', () => {
    for (const widest of [3, 4] as const) {
      for (let n = 1; n <= widest; n++) expect(cardGridPlan(n, widest).tiers.lg).toEqual({columns: n, lastRow: n})
    }
  })

  it('never leaves a card alone on the last row where a column count it may choose avoids it', () => {
    for (const widest of [3, 4] as const) {
      for (let n = 1; n <= 24; n++) {
        const {columns, lastRow} = cardGridPlan(n, widest).tiers.lg
        // The counts a section may choose: four or three across for upright cards; three for sideways cards and
        // quotes, or two by two for exactly four (a column of quotes five rows tall is not a fix).
        const choices = widest === 4 ? [4, 3] : n === 4 ? [3, 2] : [3]
        if (n > columns && lastRow === 1) expect(choices.every((c) => n % c === 1), `n=${n} widest=${widest} chose ${columns}`).toBe(true)
      }
    }
  })

  it('stacks one card per row on a phone', () => {
    for (let n = 1; n <= 12; n++) expect(cardGridPlan(n, 4).tiers.base).toEqual({columns: 1, lastRow: 1})
  })
})

/** Where the classes place each card at a tier, in shown columns: the start of each card, row by row. The grid has
 *  twice the columns it shows, so a card starting at grid line 2 starts half a column in. */
function placed(count: number, widest: 3 | 4, tier: CardTier): number[][] {
  const {list, items} = cardGridClasses(count, widest)
  const doubled = (t: CardTier) => {
    const m = list.split(' ').filter((c) => (t === 'base' ? !c.includes(':') : c.startsWith(`${t}:`))).map((c) => /grid-cols-(\d)/.exec(c)?.[1]).find(Boolean)
    return m ? Number(m) : undefined
  }
  const grid = (tier === 'lg' ? doubled('lg') : undefined) ?? (tier !== 'base' ? doubled('sm') : undefined) ?? doubled('base') ?? 1
  const span = tier === 'base' || grid === 1 ? grid : 2
  const rows: number[][] = []
  let row: number[] = []
  let cursor = 1
  items.forEach((cls) => {
    const tokens = cls.split(' ')
    const startOf = (t: string) => tokens.map((c) => new RegExp(`^${t}:col-start-(\\d|auto)$`).exec(c)?.[1]).find(Boolean)
    const start = (tier === 'lg' ? startOf('lg') ?? startOf('sm') : tier === 'sm' ? startOf('sm') : undefined)
    const at = start && start !== 'auto' ? Number(start) : undefined
    if (at !== undefined ? at < cursor : cursor + span - 1 > grid) {
      rows.push(row)
      row = []
      cursor = 1
    }
    const begin = at ?? cursor
    row.push(begin)
    cursor = begin + span
  })
  rows.push(row)
  return rows
}

describe('the classes: what the plan draws', () => {
  it('centers every short last row, at every width, and fills every other row from the left', () => {
    for (const widest of [3, 4] as const) {
      for (let n = 1; n <= 16; n++) {
        for (const tier of TIERS) {
          const rows = placed(n, widest, tier)
          const {columns, lastRow} = cardGridPlan(n, widest).tiers[tier]
          const grid = tier === 'base' ? 1 : columns === 1 ? 1 : columns * 2
          const span = grid === 1 ? 1 : 2
          expect(rows.map((r) => r.length), `n=${n} widest=${widest} ${tier}`).toEqual([...Array(rows.length - 1).fill(columns), lastRow])
          for (const r of rows.slice(0, -1)) expect(r[0]).toBe(1)
          const last = rows.at(-1)!
          const left = last[0] - 1
          const right = grid - (last.at(-1)! + span - 1)
          expect(left, `n=${n} widest=${widest} ${tier}: the last row is off center`).toBe(right)
        }
      }
    }
  })
})

const person = (i: number) => ({_id: `a${i}`, title: `Attorney ${i}`, jobTitle: 'Partner', slug: `attorneys/a-${i}`})
const quote = (i: number) => ({_id: `t${i}`, quote: `Quote ${i}.`, name: `Client ${i}`})

describe('the sections draw the plan', () => {
  it('draws four upright attorney cards four across, and four Classic cards two by two', () => {
    const upright = render(<AttorneySectionBlock data={{attorneys: [1, 2, 3, 4].map(person), cardStyle: 'portrait'} as never} />).container
    const classes = upright.querySelector('ul')!.className.split(' ')
    expect(classes).toContain('lg:grid-cols-8')
    expect(classes).not.toContain('lg:grid-cols-3')
    const classic = render(<AttorneySectionBlock data={{attorneys: [1, 2, 3, 4].map(person)} as never} />).container
    expect(classic.querySelector('ul')!.className.split(' ')).not.toContain('lg:grid-cols-3')
    expect(classic.querySelector('ul')!.className.split(' ')).not.toContain('lg:grid-cols-8')
  })

  it('draws four reviews two by two, with no card moved', () => {
    const c = render(<TestimonialsGridSection data={{testimonials: [1, 2, 3, 4].map(quote)} as never} />).container
    const classes = c.querySelector('ul')!.className.split(' ')
    expect(classes).toContain('sm:grid-cols-4')
    expect(classes).not.toContain('lg:grid-cols-6')
    expect([...c.querySelectorAll('li')].every((li) => li.className === 'sm:col-span-2')).toBe(true)
  })

  it('centers the last two of five reviews on a desktop, and the fifth on a tablet', () => {
    const c = render(<TestimonialsGridSection data={{testimonials: [1, 2, 3, 4, 5].map(quote)} as never} />).container
    const items = [...c.querySelectorAll('ul > li')].map((li) => li.className.split(' '))
    expect(items[3]).toContain('lg:col-start-2')
    expect(items[4]).toEqual(expect.arrayContaining(['sm:col-start-2', 'lg:col-start-auto']))
  })
})
