import {describe, expect, it} from 'vitest'
import {applyLayout, walkFrame, walkPage, type Paint, type SiteLook} from '../sectionFrame'
import {type SectionAppearance} from '../SectionShell'
import {FLOWS, flowById, type FlowRules, type Host} from '@/lib/flows'
import {effectiveFlow} from '@/lib/backgrounds'
import {layoutById, type Layout, type LayoutRules} from '@/lib/layouts'
import {LOOK} from './flowFixtures'

// ─── The precedence pass (the Layout theme; monorepo WS-V1-LAYOUT-OPTIONS-DESIGN, ADV-LO amendment 1) ──────────────
//
// A stored page layout applies to every band's visible ground, the one the theme's ground pass painted or the band's own
// stored surface, after the ground pass and before adoption; a stored `inset` or `overlapPrevious` stays the operator's
// override. With no layout stored the ground pass is what it was, byte for byte (held here per theme, and by the
// reproduction, frame and parity goldens, unregenerated).

type Band = {host: Host | null; appearance?: SectionAppearance | null; raisesPhoto?: boolean}
const b = (host: Host | null, appearance?: SectionAppearance | null, extra: Partial<Band> = {}): Band => ({host, appearance, ...extra})
const resolveBand = (m: Band) => ({appearance: m.appearance, empty: false, stored: !!m.appearance?.surface, host: m.host, raisesPhoto: m.raisesPhoto})
const walk = (bands: Band[], flow: FlowRules, site: Partial<SiteLook> = {}) => walkFrame(bands, resolveBand, {...LOOK, ...site, flow}, 'dark')
const under = (flowId: string, layoutId: string | null) => effectiveFlow(flowById(flowId)!, null, layoutId)
/** A synthetic layout for the words no roster layout uses yet, so each word's clause is held. */
const synthetic = (rules: Partial<LayoutRules>): Layout => ({
  id: 'test', name: 'Test', sentence: 'A layout for the test.',
  rules: {dark: {sit: 'band'}, light: {sit: 'band'}, cross: {kinds: [], at: 'middle', max: 0}, ...rules},
})

/** A designed page: every band stores its surface, as the design file writes it (7 of 7 on the fake client). */
const DESIGNED: Band[] = [
  b('narrative', {surface: 'dark'}), b('areas', {surface: 'light'}), b('split', {surface: 'dark'}, {raisesPhoto: true}),
  b('testimonials', {surface: 'light'}), b('statement', {surface: 'dark'}), b('attorneys', {surface: 'tint'}),
]
const FRESH: Band[] = [b('narrative'), b('caseResults'), b('areas'), b('split', null, {raisesPhoto: true}), b('attorneys'), b('testimonials'), b('statement')]

describe('no layout stored: the walk the theme had', () => {
  it('every theme, on a fresh and a designed canvas: the same seams under effectiveFlow with no layout as under the theme', () => {
    for (const f of FLOWS) {
      for (const canvas of [FRESH, DESIGNED]) {
        expect(walk(canvas, effectiveFlow(f, null, undefined)).map((o) => o.seam), f.id).toEqual(walk(canvas, f).map((o) => o.seam))
      }
    }
  })
})

describe('Contained replaces the theme’s own layout whole', () => {
  it('Floating panels balanced: its floated dark bands become full dark bands, the same bands dark', () => {
    const own = walk(FRESH, flowById('floatingPanels.balanced')!).map((o) => o.seam.paint)
    const contained = walk(FRESH, under('floatingPanels.balanced', 'contained')).map((o) => o.seam.paint)
    expect(own.some((p) => p?.inset)).toBe(true)
    expect(contained.some((p) => p?.inset)).toBe(false)
    // Which bands are dark is the Flow theme's: the rhythm does not move.
    expect(contained.map((p) => p?.ground)).toEqual(own.map((p) => p?.ground))
  })

  it('Floating panels mostly dark: its light panels on the dark ground become full light bands', () => {
    const own = walk(FRESH, flowById('floatingPanels.mostlyDark')!).map((o) => o.seam.paint)
    const contained = walk(FRESH, under('floatingPanels.mostlyDark', 'contained')).map((o) => o.seam.paint)
    expect(own.filter((p) => p?.onGround === 'dark').length).toBeGreaterThan(0)
    expect(contained.filter((p) => p?.inset || p?.onGround)).toEqual([])
    expect(contained.map((p) => p?.ground)).toEqual(own.map((p) => p?.ground))
  })

  it('nothing crosses: a theme’s own raised photograph goes (Cut blocks, Gradient bloom, Wedges)', () => {
    for (const id of ['cutBlocks.balanced', 'cutBlocks.mostlyDark', 'gradientBloom.mostlyDark', 'wedges.balanced']) {
      const own = walk(DESIGNED, flowById(id)!)
      expect(own.filter((o) => o.seam.raisePhoto), id).toHaveLength(1)
      const contained = walk(DESIGNED, under(id, 'contained'))
      expect(contained.filter((o) => o.seam.raisePhoto), id).toEqual([])
      expect(contained.filter((o) => o.seam.nextOverlap !== 'none'), id).toEqual([])
    }
  })
})

describe('the precedence: a stored layout reaches every visible ground, stored or painted', () => {
  const floatsDark = synthetic({dark: {sit: 'floating'}})
  const floatsLight = synthetic({light: {sit: 'floating'}})
  const panelsLight = synthetic({light: {sit: 'panel'}})

  it('a stored dark surface takes the layout’s word (the ground pass never touches it)', () => {
    // Under the theme's own Floating panels balanced, a stored dark band is a full band: the theme reaches only what it fills.
    expect(walk(DESIGNED, flowById('floatingPanels.balanced')!)[0].seam.paint?.inset).toBeFalsy()
    const out = walk(DESIGNED, {...flowById('quiet.mostlyLight')!, layout: floatsDark})
    expect(out.map((o) => !!o.seam.paint?.inset)).toEqual([true, false, true, false, true, false])
    // The stored surface still names the panel's ground: the paint carries no ground of its own.
    expect(out[0].seam.paint?.ground).toBeUndefined()
  })

  it('a painted ground takes it the same way', () => {
    const own = walk(FRESH, flowById('alternating.balanced')!)
    const out = walk(FRESH, {...flowById('alternating.balanced')!, layout: floatsDark})
    own.forEach((o, i) => expect(!!out[i].seam.paint?.inset, `band ${i}`).toBe(o.seam.paint?.ground === 'dark'))
  })

  it('light words on light, tint and wash grounds, stored or painted', () => {
    const out = walk(DESIGNED, {...flowById('quiet.mostlyLight')!, layout: floatsLight})
    expect(out.map((o) => o.seam.paint?.onGround ?? null)).toEqual([null, 'dark', null, 'dark', null, 'dark'])
    // Inside a strong run only: the areas band between two stored dark bands, not the last band.
    const inRun = walk(DESIGNED, {...flowById('quiet.mostlyLight')!, layout: panelsLight})
    expect(inRun.map((o) => !!o.seam.paint?.inset)).toEqual([false, true, false, true, false, false])
    // And it adopts the run, as `[R-501]` always had it.
    expect(inRun[1].seam.insetGround).toBe('dark')
  })

  it('a stored inset and a stored overlap stay the operator’s override', () => {
    const canvas: Band[] = [b('narrative', {surface: 'dark'}), b('areas', {surface: 'light', inset: true, overlapPrevious: 'large'}), b('split', {surface: 'dark'})]
    for (const layout of [layoutById('contained')!, floatsLight, floatsDark]) {
      const out = walk(canvas, {...flowById('quiet.mostlyLight')!, layout})
      expect(out[1].seam.paint, layout.id).toBeNull()
      // Its overlap is still drawn: the band above makes room for it.
      expect(out[0].seam.nextOverlap, layout.id).toBe('large')
    }
  })

  it('a band that becomes a panel carries nothing of the Background theme’s', () => {
    const textured: (Paint | null)[] = [{ground: 'dark', texture: 'strong', photoFade: {index: 0, at: 0, length: 1}}, {ground: 'light', texture: 'quiet'}]
    const survivors = [{appearance: null, host: 'narrative' as Host}, {appearance: null, host: 'split' as Host}]
    expect(applyLayout(survivors, textured, floatsDark.rules)[0]).toEqual({ground: 'dark', texture: false, inset: true})
    expect(applyLayout(survivors, textured, floatsLight.rules)[1]).toEqual({ground: 'light', texture: false, inset: true, onGround: 'dark'})
    // A band the layout leaves as it is keeps everything.
    expect(applyLayout(survivors, textured, layoutById('contained')!.rules)).toEqual(textured)
  })

  it('the walk adopts after the layout: a stored inset between two bands the layout floats sees the light page', () => {
    const canvas: Band[] = [b('narrative', {surface: 'dark'}), b('areas', {inset: true}), b('split', {surface: 'dark'})]
    const own = walkPage(canvas, resolveBand, {...LOOK, flow: flowById('quiet.mostlyLight')!}, 'dark', null).bands
    expect(own[1].seam.insetGround).toBe('dark')
    const floated = walkPage(canvas, resolveBand, {...LOOK, flow: {...flowById('quiet.mostlyLight')!, layout: floatsDark}}, 'dark', null).bands
    expect(floated[1].seam.insetGround).toBeNull()
  })
})
