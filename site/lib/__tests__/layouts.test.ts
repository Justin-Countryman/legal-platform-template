import {describe, expect, it} from 'vitest'
import {FAMILIES, FLOWS, bridgeOf, flowById} from '../flows'
import {effectiveFlow, siteFlowOf} from '../backgrounds'
import {
  CROSS_KINDS, LAYOUTS, LAYOUT_DARK_SITS, LAYOUT_LIGHT_SITS, LAYOUT_SUGGESTED_WITH, MAX_CROSSINGS, PANEL_HOSTS,
  asksForPanels, layoutById, layoutOf, layoutRulesOf,
} from '../layouts'
import {PHOTO_HOSTS} from '@/components/sections/sectionFrame'

// The Layout theme (monorepo WS-V1-LAYOUT-OPTIONS-DESIGN, ADV-LO taken whole; `[R-655]`): the roster, and the overlay that
// reads each theme's own layout out of the words it already carries, so an absent `pageLayout` renders it byte for byte.

// Today's values, written out by hand from the families as they shipped (`lib/flows.ts`), so a change to a theme's own
// layout is a red test here, not a silent move: Floating panels floats its dark bands at balanced and its light ones at
// mostly dark; Cut blocks at both steps, Gradient bloom and Wedges raise one photograph; everything else is a full band.
const OWN: Record<string, {dark: string; light: string; raises: boolean}> = {
  'quiet.mostlyLight': {dark: 'band', light: 'band', raises: false},
  'alternating.balanced': {dark: 'band', light: 'band', raises: false},
  'cutBlocks.balanced': {dark: 'band', light: 'band', raises: true},
  'cutBlocks.mostlyDark': {dark: 'band', light: 'band', raises: true},
  'typeOnBlack.allDark': {dark: 'band', light: 'band', raises: false},
  'editorial.mostlyLight': {dark: 'band', light: 'band', raises: false},
  'ribbonRhythm.mostlyLight': {dark: 'band', light: 'band', raises: false},
  'photoScrims.mostlyDark': {dark: 'band', light: 'band', raises: false},
  'floatingPanels.balanced': {dark: 'floating', light: 'band', raises: false},
  'floatingPanels.mostlyDark': {dark: 'band', light: 'floating', raises: false},
  'softWash.mostlyLight': {dark: 'band', light: 'band', raises: false},
  'softWash.balanced': {dark: 'band', light: 'band', raises: false},
  'gradientBloom.mostlyDark': {dark: 'band', light: 'band', raises: true},
  'wedges.balanced': {dark: 'band', light: 'band', raises: true},
}

describe('the roster', () => {
  it('lists only the layouts that are built (ADV-LO amendment 3): Contained and Panels', () => {
    expect(LAYOUTS.map((l) => l.id)).toEqual(['contained', 'panels'])
    for (const l of LAYOUTS) {
      expect(l.name, l.id).toBeTruthy()
      expect(l.sentence.length, l.id).toBeGreaterThan(40)
      expect(LAYOUT_DARK_SITS, l.id).toContain(l.rules.dark.sit)
      expect(LAYOUT_LIGHT_SITS, l.id).toContain(l.rules.light.sit)
      for (const k of l.rules.cross.kinds) expect(CROSS_KINDS, l.id).toContain(k)
      // Crossings capped at two a page (amendment 9).
      expect(l.rules.cross.max, l.id).toBeLessThanOrEqual(MAX_CROSSINGS)
      // A layout that names a crossing kind allows at least one, and one that allows none names none.
      expect(l.rules.cross.kinds.length > 0, l.id).toBe(l.rules.cross.max > 0)
    }
  })

  it('Contained: every band full width and nothing crossing; Panels: dark text bands on a panel, up to two crossings', () => {
    expect(layoutById('contained')!.rules).toEqual({dark: {sit: 'band'}, light: {sit: 'band'}, cross: {kinds: [], at: 'middle', max: 0}})
    expect(layoutById('panels')!.rules).toEqual({dark: {sit: 'onPanel'}, light: {sit: 'band'}, cross: {kinds: ['photo', 'figure'], at: 'middle', max: 2}})
  })

  it('an unknown or absent id is no layout', () => {
    for (const id of [undefined, null, '', 'floating', 'edgeToEdge', 'overlap', 42]) expect(layoutById(id)).toBeNull()
  })

  it('the panel takes the prose-led bands, never a card grid: the text-led ones less the testimonials', () => {
    expect(PANEL_HOSTS).toEqual(['narrative', 'split', 'differentiators', 'statement'])
    expect(PHOTO_HOSTS.filter((h) => !PANEL_HOSTS.includes(h))).toEqual(['testimonials'])
    for (const host of ['ribbon', 'statRow', 'areas', 'attorneys', 'caseResults', 'testimonials', 'reviews', 'badges', 'video'] as const) expect(PANEL_HOSTS).not.toContain(host)
  })

  it('each suggestion pairs a shipped family with a built layout, never a default', () => {
    for (const [family, id] of Object.entries(LAYOUT_SUGGESTED_WITH)) {
      expect(FAMILIES.some((f) => f.id === family), family).toBe(true)
      expect(layoutById(id), `${family} -> ${id}`).not.toBeNull()
    }
  })
})

describe('the overlay: each theme’s own layout, read out of the words it carries (ADV-LO amendment 2)', () => {
  it('every one of the fourteen steps, equal to its own sit and overlap as they shipped', () => {
    expect(FLOWS.map((f) => f.id).sort()).toEqual(Object.keys(OWN).sort())
    for (const f of FLOWS) {
      const own = OWN[f.id]
      expect(layoutOf(f), f.id).toEqual({
        dark: {sit: own.dark}, light: {sit: own.light},
        cross: own.raises ? {kinds: ['photo'], at: 'middle', max: 1} : {kinds: [], at: 'middle', max: 0},
      })
      // The words stay where they were: no step carries a stored layout, and the theme's own is what renders.
      expect('layout' in f, f.id).toBe(false)
      expect(layoutRulesOf(f), f.id).toEqual(layoutOf(f))
    }
  })

  it('the compat bridge raises its photograph exactly where the retired field said so', () => {
    expect(layoutOf(bridgeOf({sectionOverlap: 'photo'})).cross.max).toBe(1)
    expect(layoutOf(bridgeOf({sectionOverlap: 'none'})).cross.max).toBe(0)
    expect(layoutOf(bridgeOf({})).dark.sit).toBe('band')
  })
})

describe('effectiveFlow, the one place the layers meet', () => {
  it('no stored layout and no background: the theme itself, the same object', () => {
    for (const f of FLOWS) {
      expect(effectiveFlow(f, undefined, undefined)).toBe(f)
      expect(effectiveFlow(f, null, null)).toBe(f)
      expect(effectiveFlow(f, null, 'no-such-layout')).toBe(f)
      expect(siteFlowOf({flow: f.id})).toBe(f)
      expect(siteFlowOf({flow: f.id, pageLayout: 'nope'})).toBe(f)
    }
  })

  it('a stored layout replaces the theme’s own whole, beside any background, and moves nothing else', () => {
    const f = flowById('floatingPanels.balanced')!
    const e = effectiveFlow(f, undefined, 'contained')
    expect(e.layout?.id).toBe('contained')
    expect(layoutRulesOf(e)).toEqual(layoutById('contained')!.rules)
    // The theme's own words are untouched: the overlay reads past them.
    const {layout, ...rest} = e
    void layout
    expect(rest).toEqual(f)
    const both = effectiveFlow(f, 'glow.corner', 'panels')
    expect(both.layout?.id).toBe('panels')
    expect(both.on.glowShape).toBe('corner')
    expect(both.needs).toEqual(effectiveFlow(f, 'glow.corner').needs)
    expect(siteFlowOf({flow: f.id, background: 'glow.corner', pageLayout: 'panels'})).toEqual(both)
  })

  it('asks the palette for the panel’s surface only under a layout that sets dark bands on panels', () => {
    for (const f of FLOWS) {
      expect(asksForPanels(f), f.id).toBe(false)
      expect(asksForPanels(effectiveFlow(f, null, 'contained')), f.id).toBe(false)
      expect(asksForPanels(effectiveFlow(f, null, 'panels')), f.id).toBe(true)
    }
    expect(asksForPanels(null)).toBe(false)
  })
})
