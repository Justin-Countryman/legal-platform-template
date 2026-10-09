import {describe, expect, it} from 'vitest'
import {walkFrame, walkPage, type SiteLook} from '../sectionFrame'
import {type SectionAppearance} from '../SectionShell'
import {FLOWS, flowById, type FlowRules, type Host} from '@/lib/flows'
import {effectiveFlow} from '@/lib/backgrounds'
import {MAX_CROSSINGS} from '@/lib/layouts'
import {LOOK} from './flowFixtures'

// ─── The cut-out first (the lead's rule on PR #81) ────────────────────────────────────────────────────────────────
//
// Under Panels and Panels on light, a prose-led band carrying a cut-out figure is preferred for the panel, so its figure
// can stand on one and rise out of it (the figure out of a panel, ADV-LO amendment 5), as Lewin's, Calesaric's and
// Edwards' attorneys do. Panels: in a stretch of bands that may take a panel, the alternation counts from the first
// cut-out band. Panels on light: the one dark panel goes to the first light band carrying a cut-out. Still never two
// panels in a row, still at most two crossings; a stretch with no cut-out counts from its first band, as it always did.

type Band = {host: Host | null; appearance?: SectionAppearance | null; raisesPhoto?: boolean; cutout?: 'left' | 'right' | null; content?: boolean}
const words = (host: Host, surface: 'dark' | 'light'): Band => ({host, appearance: {surface}, content: true})
const cutout = (surface: 'dark' | 'light'): Band => ({host: 'split', appearance: {surface}, content: true, raisesPhoto: true, cutout: 'right'})
const grid = (surface: 'dark' | 'light'): Band => ({host: 'areas', appearance: {surface}, content: false})
const resolveBand = (m: Band) => ({appearance: m.appearance, empty: false, stored: true, host: m.host, raisesPhoto: m.raisesPhoto, cutout: m.cutout, content: m.content})
const layout = (id: 'panels' | 'panelsOnLight', flowId = 'alternating.balanced') => effectiveFlow(flowById(flowId)!, null, id)
const walk = (bands: Band[], flow: FlowRules, site: Partial<SiteLook> = {}, close: 'dark' | 'wash' | null = 'dark') =>
  walkPage(bands, resolveBand, {...LOOK, panelRoom: true, ...site, flow}, 'dark', close).bands
const fills = (bands: Band[], flow: FlowRules, site: Partial<SiteLook> = {}, close: 'dark' | 'wash' | null = 'dark') =>
  walk(bands, flow, site, close).map((o) => o.seam.paint?.onPanel?.fill ?? null)

describe('Panels: the alternation counts from the cut-out', () => {
  it('a cut-out after a band of words takes the panel, the band of words stays full, and the figure rises', () => {
    const out = walk([words('narrative', 'light'), words('narrative', 'dark'), cutout('dark')], layout('panels'))
    expect(out.map((o) => !!o.seam.paint?.onPanel)).toEqual([false, false, true])
    expect(out[2].seam.raiseFigure).toBe('seam')
    expect(out[1].seam.nextOverlap).toBe('photo')
  })

  it('the bands an even step from the cut-out take panels, either side of it', () => {
    const on = (bands: Band[]) => walk(bands, layout('panels')).map((o) => !!o.seam.paint?.onPanel)
    expect(on([words('narrative', 'dark'), cutout('dark'), words('statement', 'dark'), words('narrative', 'dark')])).toEqual([false, true, false, true])
    expect(on([words('narrative', 'dark'), words('statement', 'dark'), cutout('dark'), words('narrative', 'dark'), words('statement', 'dark')])).toEqual([true, false, true, false, true])
    // Two cut-outs back to back: the first is preferred, never two panels in a row.
    expect(on([cutout('dark'), cutout('dark')])).toEqual([true, false])
  })

  it('each stretch counts from its own first cut-out; a stretch without one from its first band, as before', () => {
    const on = walk([
      words('narrative', 'dark'), cutout('dark'), grid('dark'),
      words('narrative', 'dark'), words('statement', 'dark'), words('narrative', 'dark'),
    ], layout('panels')).map((o) => !!o.seam.paint?.onPanel)
    expect(on).toEqual([false, true, false, true, false, true])
  })

  it('a page with no cut-out draws exactly what it drew before the rule', () => {
    const page = ['narrative', 'split', 'statement', 'differentiators', 'narrative'].map((h) => words(h as Host, 'dark'))
    expect(walk(page, layout('panels')).map((o) => !!o.seam.paint?.onPanel)).toEqual([true, false, true, false, true])
  })

  it('still at most two crossings a page, however many cut-outs take a panel', () => {
    const page = [words('narrative', 'light'), cutout('dark'), grid('dark'), cutout('dark'), grid('dark'), cutout('dark'), words('narrative', 'light')]
    const out = walk(page, layout('panels'))
    expect(out.filter((o) => o.seam.paint?.onPanel).length).toBe(3)
    expect(out.filter((o) => o.seam.raiseFigure || o.seam.raisePhoto).length).toBeLessThanOrEqual(MAX_CROSSINGS)
  })
})

describe('Panels on light: the one dark panel goes to the cut-out', () => {
  it('the first light band carrying a cut-out takes the dark panel; the bands before it the wash, never two in a row', () => {
    const page = [words('narrative', 'light'), words('statement', 'light'), cutout('light'), words('narrative', 'light')]
    expect(fills(page, layout('panelsOnLight'))).toEqual(['wash', null, 'ground', null])
    const out = walk(page, layout('panelsOnLight'))
    expect(out[2].seam.raiseFigure).toBe('seam')
  })

  it('one dark panel however many cut-outs: the first wins, a later one takes the wash at its turn', () => {
    const page = [cutout('light'), grid('light'), cutout('light')]
    expect(fills(page, layout('panelsOnLight'))).toEqual(['ground', null, 'wash'])
  })

  it('where the page wears the wash already, the cut-out still takes the dark panel and nothing takes the wash', () => {
    const page = [words('narrative', 'light'), grid('light'), cutout('light')]
    expect(fills(page, layout('panelsOnLight'), {}, 'wash')).toEqual([null, null, 'ground'])
  })

  it('a page with no cut-out draws exactly what it drew before the rule', () => {
    const page = [words('narrative', 'light'), grid('light'), words('split', 'light'), words('statement', 'light'), grid('light'), words('differentiators', 'light')]
    expect(fills(page, layout('panelsOnLight'))).toEqual(['ground', null, 'wash', null, null, 'wash'])
  })
})

describe('never anywhere else', () => {
  it('under a theme’s own layout and Contained no band takes a layout’s panel, cut-out or not', () => {
    const page = [words('narrative', 'light'), cutout('dark'), words('narrative', 'dark'), cutout('light')]
    for (const f of FLOWS) {
      for (const flow of [f, effectiveFlow(f, null, 'contained')]) {
        expect(walkFrame(page, resolveBand, {...LOOK, panelRoom: true, flow}, 'dark').some((o) => o.seam.paint?.onPanel), f.id).toBe(false)
      }
    }
  })
})
