import {describe, expect, it} from 'vitest'
import {walkFrame, type SiteLook} from '../sectionFrame'
import {type SectionAppearance} from '../SectionShell'
import {FLOWS, flowById, type FlowRules, type Host} from '@/lib/flows'
import {effectiveFlow} from '@/lib/backgrounds'
import {layoutOf, type Layout} from '@/lib/layouts'
import {visibleGround} from '@/lib/sectionSurface'
import {LOOK} from './flowFixtures'

// ─── The raised photograph, up to two a page (the Layout theme, ADV-LO amendment 9) ───────────────────────────────
//
// The crossing is the layout's: a theme's own raises one, nearest the middle, at a change of ground, as it always did; a
// stored layout may raise up to two (Panels), never more, never two into or out of one band; Contained raises none.

type Band = {host: Host | null; appearance?: SectionAppearance | null; raisesPhoto?: boolean}
const split = (surface: 'dark' | 'light', raisesPhoto = true): Band => ({host: 'split', appearance: {surface}, raisesPhoto})
const text = (surface: 'dark' | 'light'): Band => ({host: 'narrative', appearance: {surface}})
// Every band here is a content section (a split or two-column text), as the composer writes them.
const resolveBand = (m: Band) => ({appearance: m.appearance, empty: false, stored: !!m.appearance?.surface, host: m.host, raisesPhoto: m.raisesPhoto, content: true})
const raised = (bands: Band[], flow: FlowRules, site: Partial<SiteLook> = {}) =>
  walkFrame(bands, resolveBand, {...LOOK, ...site, flow}, 'dark').flatMap((o, i) => (o.seam.raisePhoto ? [i] : []))

/** The pick as it stood before the Layout theme (Phase 16E), written out: one band, nearest the middle, a tie the earlier. */
function onePick(bands: Band[]): number[] {
  const g = bands.map((m) => visibleGround(m.appearance))
  const same = (a: string, b: string) => a === b || ((a === 'light' || a === 'tint') && (b === 'light' || b === 'tint'))
  const eligible = bands.map((_, i) => i).filter((i) => i > 0 && bands[i].raisesPhoto && !bands[i].appearance?.inset && !same(g[i], g[i - 1]))
  const mid = (bands.length - 1) / 2
  const pick = eligible.reduce<number | null>((best, i) => (best === null || Math.abs(i - mid) < Math.abs(best - mid) ? i : best), null)
  return pick === null ? [] : [pick]
}

/** Every canvas of up to seven bands drawn from four kinds: a seeded sample, so the old and new picks meet on many shapes. */
function canvases(n: number, seed: number): Band[][] {
  let s = seed >>> 0
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32
  const kinds = [() => split('dark'), () => split('light'), () => text('dark'), () => text('light')]
  return Array.from({length: n}, () => Array.from({length: 2 + Math.floor(rnd() * 6)}, () => kinds[Math.floor(rnd() * 4)]()))
}

// A page with four eligible seams: a split on each side of a change of ground, all the way down.
const ALTERNATING: Band[] = [text('dark'), split('light'), split('dark'), split('light'), split('dark'), split('light'), text('dark')]

describe('under a theme’s own layout: one, where it always was', () => {
  it('every theme that raises one picks exactly the band the Phase 16E pick did, on 400 seeded canvases', () => {
    const raisers = FLOWS.filter((f) => layoutOf(f).cross.max === 1)
    expect(raisers.map((f) => f.id).sort()).toEqual(['cutBlocks.balanced', 'cutBlocks.mostlyDark', 'gradientBloom.mostlyDark', 'wedges.balanced'])
    for (const bands of canvases(400, 20261009)) {
      for (const f of raisers) expect(raised(bands, f), `${f.id} ${JSON.stringify(bands.map((m) => [m.host, m.appearance?.surface]))}`).toEqual(onePick(bands))
    }
  })

  it('a theme that raises none raises none', () => {
    for (const f of FLOWS.filter((x) => layoutOf(x).cross.max === 0)) expect(raised(ALTERNATING, f), f.id).toEqual([])
  })
})

describe('under a stored layout', () => {
  it('Panels raises two, nearest the middle, never two into or out of one band', () => {
    const picks = raised(ALTERNATING, effectiveFlow(flowById('quiet.mostlyLight')!, null, 'panels'))
    // Middle is 3: band 3 first; 2 and 4 touch it; then 1 and 5 tie, the earlier taken.
    expect(picks).toEqual([1, 3])
    const out = walkFrame(ALTERNATING, resolveBand, {...LOOK, flow: effectiveFlow(flowById('quiet.mostlyLight')!, null, 'panels')}, 'dark')
    // The band above each makes room for it, and no other does.
    expect(out.flatMap((o, i) => (o.seam.nextOverlap === 'photo' ? [i] : []))).toEqual([0, 2])
  })

  it('never more than two, whatever a layout asks', () => {
    const greedy: Layout = {id: 'greedy', name: 'Greedy', sentence: 'Every seam it can.', rules: {dark: {sit: 'band'}, light: {sit: 'band'}, cross: {kinds: ['photo'], at: 'middle', max: 3 as 2}}}
    expect(raised(ALTERNATING, {...flowById('quiet.mostlyLight')!, layout: greedy})).toHaveLength(2)
  })

  it('Contained raises none, over a theme that raises one', () => {
    expect(raised(ALTERNATING, flowById('cutBlocks.balanced')!)).toEqual([3])
    expect(raised(ALTERNATING, effectiveFlow(flowById('cutBlocks.balanced')!, null, 'contained'))).toEqual([])
  })

  it('a photograph whose words sit on a panel never rises out of it (only a cut-out figure does, layoutFigure.test.tsx)', () => {
    // Every dark split is a panel under Panels, so only the light splits rise.
    const picks = raised(ALTERNATING, effectiveFlow(flowById('quiet.mostlyLight')!, null, 'panels'), {panelRoom: true})
    for (const i of picks) expect(ALTERNATING[i].appearance?.surface, `band ${i}`).toBe('light')
    expect(picks).toEqual([1, 3])
  })
})
