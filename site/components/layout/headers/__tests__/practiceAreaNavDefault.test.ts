/**
 * The Practice Areas dropdown decides its own display mode when nothing set one.
 *
 * DRAFT ITEM B of the platform's dogfood #2, ruled 2026-08-26. The build recipe
 * hardcoded `displayMode: "flat"` into every new site. `flat` renders only
 * top-level areas, so a firm whose nineteen practice areas all sit under one
 * Area of Law shipped a primary-navigation dropdown holding ONE item, on a site
 * handed to a client. Nothing on the site was broken; the composed navigation
 * matched what the recipe asked for, and no stage asked whether it was usable.
 *
 * The recipe now writes nothing and this decides, because the practice-area
 * tree is assembled at RENDER time by grouping a flat GROQ array on `parentRef`
 * — so a build-time value is frozen the moment an editor re-parents anything in
 * Studio, and the page is the only place that can see the tree it is about to
 * draw.
 *
 * An explicit value still wins outright, in both directions. That is the same
 * shape as the staffIndex ruling: the default yields to the data, the flag
 * decides when it is set.
 */
import {describe, expect, it} from 'vitest'
import {defaultDisplayMode, flattenChildren} from '../shared'

const parent = (label: string, children: string[] = []) => ({
  label,
  href: `/${label}/`,
  children: children.map((c) => ({label: c, href: `/${label}/${c}/`})),
})

describe('defaultDisplayMode', () => {
  it('goes hierarchy for the shape that shipped one item out of nineteen', () => {
    const children = [parent('personal-injury', Array.from({length: 18}, (_, i) => `area-${i}`))]
    expect(defaultDisplayMode(children)).toBe('hierarchy')
  })

  it('stays flat at two top-level areas, because that is a preference and not a defect', () => {
    const children = [parent('injury', ['a', 'b']), parent('family', ['c'])]
    expect(defaultDisplayMode(children)).toBe('flat')
  })

  it('stays flat for a firm with one area and nothing nested under it', () => {
    expect(defaultDisplayMode([parent('injury')])).toBe('flat')
  })

  it('stays flat for an empty menu rather than guessing', () => {
    expect(defaultDisplayMode([])).toBe('flat')
  })

  it('goes hierarchy for one parent with a single child, which is still a one-item dropdown', () => {
    expect(defaultDisplayMode([parent('injury', ['car-accidents'])])).toBe('hierarchy')
  })
})

describe('flattenChildren wiring', () => {
  const degenerate = {
    _type: 'navItemPracticeAreas',
    label: 'Practice Areas',
    children: [parent('personal-injury', Array.from({length: 18}, (_, i) => `area-${i}`))],
  }

  it('renders all nineteen when nothing set a display mode', () => {
    expect(flattenChildren(degenerate as never)).toHaveLength(19)
  })

  it('still renders one when an operator explicitly chose flat', () => {
    expect(flattenChildren({...degenerate, displayMode: 'flat'} as never)).toHaveLength(1)
  })

  it('still renders all nineteen when an operator explicitly chose hierarchy', () => {
    expect(flattenChildren({...degenerate, displayMode: 'hierarchy'} as never)).toHaveLength(19)
  })

  it('leaves a healthy multi-area firm on its top level when nothing set a mode', () => {
    const healthy = {
      _type: 'navItemPracticeAreas',
      label: 'Practice Areas',
      children: [parent('injury', ['a', 'b']), parent('family', ['c'])],
    }
    expect(flattenChildren(healthy as never)).toHaveLength(2)
  })
})
