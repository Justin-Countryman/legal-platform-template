import {describe, expect, it, vi} from 'vitest'
import {forwardRef} from 'react'
import {render} from '@testing-library/react'

vi.mock('next/link', () => ({
  // eslint-disable-next-line react/display-name
  default: forwardRef<HTMLAnchorElement, {href: string; children: React.ReactNode; className?: string}>(
    ({href, children, ...rest}, ref) => <a ref={ref} href={href} {...rest}>{children}</a>,
  ),
}))
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({src, alt, className}: {src: string; alt?: string; className?: string}) => <img src={src} alt={alt ?? ''} className={className} />,
}))

import {SectionShell, type SectionAppearance} from '../SectionShell'
import {ContentSectionBlock, type ContentSectionData} from '../ContentSectionBlock'
import {NO_SEAM, siteLookOf, walkPage, type Paint, type SeamProps, type SiteLook} from '../sectionFrame'
import {FLOWS, flowById, type FlowRules, type Host} from '@/lib/flows'
import {effectiveFlow} from '@/lib/backgrounds'
import {MAX_CROSSINGS, PANEL_HOSTS} from '@/lib/layouts'
import {PALETTE_PRESETS, presetInputs} from '@/lib/palettes'
import {LOOK} from './flowFixtures'

// ─── Panels on light, the light-led layout (the fast path's P4; ADV-LO, `[R-655]`) ────────────────────────────────
//
// BDG, Edwards and Garza (read live 2026-10-03, again 2026-10-09): a mostly light page with one dark panel among its light
// bands, the light bands' words on the page's soft second ground, photographs crossing seams, the hero's photograph to the
// edge. Here: a prose-led light band keeps its ground and sets its words on a panel, never two in a row; the first such
// band on the page takes the dark ground itself, the only one; the rest take the wash, on the page ground only and only
// where the page wears no wash of its own. Dark bands stay full. Up to two crossings, a figure out of a panel among them.
// No new color: the dark ground and the wash are grounds every pair is already solved on.

type Band = {host: Host | null; appearance?: SectionAppearance | null; raisesPhoto?: boolean; cutout?: 'left' | 'right' | null; content?: boolean}
const CONTENT_HOSTS: readonly Host[] = ['narrative', 'split', 'differentiators', 'statement', 'ribbon', 'statRow']
const b = (host: Host, surface?: 'light' | 'dark' | 'tint' | null, extra: Partial<Band> = {}): Band =>
  ({host, appearance: surface ? {surface} : null, content: CONTENT_HOSTS.includes(host), ...extra})
const resolveBand = (m: Band) => ({appearance: m.appearance, empty: false, stored: !!m.appearance?.surface, host: m.host, raisesPhoto: m.raisesPhoto, cutout: m.cutout, content: m.content})
const light = (flowId = 'editorial.mostlyLight') => effectiveFlow(flowById(flowId)!, null, 'panelsOnLight')
const walk = (bands: Band[], flow: FlowRules, site: Partial<SiteLook> = {}, close: 'dark' | 'wash' | null = 'dark') =>
  walkPage(bands, resolveBand, {...LOOK, ...site, flow}, 'dark', close).bands
const fills = (bands: Band[], flow: FlowRules, site: Partial<SiteLook> = {}, close: 'dark' | 'wash' | null = 'dark') =>
  walk(bands, flow, site, close).map((o) => o.seam.paint?.onPanel?.fill ?? null)

// A designed light page, every band storing its surface, as a design file writes it.
const PAGE: Band[] = [
  b('ribbon', 'dark'), b('narrative', 'light'), b('areas', 'light'), b('split', 'light'), b('statement', 'light'),
  b('attorneys', 'tint'), b('differentiators', 'light'), b('testimonials', 'light'), b('narrative', 'dark'),
]

describe('the walk: which light bands take a panel', () => {
  it('the first prose-led light band takes the dark ground, the only one; the rest the wash, never two in a row', () => {
    expect(fills(PAGE, light())).toEqual([null, 'ground', null, 'wash', null, null, 'wash', null, null])
    // Painted grounds the same way: the theme's own light bands on a canvas that stores nothing.
    const fresh = fills(PAGE.map((m) => b(m.host as Host)), light())
    expect(fresh.filter((f) => f === 'ground')).toHaveLength(1)
    fresh.forEach((f, k) => { if (k > 0 && f) expect(fresh[k - 1], `band ${k}`).toBeNull() })
  })

  it('never a card grid, never a dark band, never a band that is not a content section', () => {
    const out = walk(PAGE, light())
    out.forEach((o, k) => {
      if (!o.seam.paint?.onPanel) return
      const m = PAGE[k]
      expect(m.content && PANEL_HOSTS.includes(m.host!), `band ${k}`).toBe(true)
      expect(m.appearance?.surface, `band ${k}`).not.toBe('dark')
    })
    expect(fills([b('narrative', 'light', {content: false}), b('statement', 'light')], light())).toEqual([null, 'ground'])
  })

  it('one dark panel a page however many light runs it has, and the wash only on the page ground', () => {
    const runs = [b('statement', 'light'), b('ribbon', 'dark'), b('narrative', 'light'), b('ribbon', 'dark'), b('split', 'tint'), b('split', 'light')]
    expect(fills(runs, light())).toEqual(['ground', null, 'wash', null, null, 'wash'])
  })

  it('no wash panel where the page wears the wash already: the theme’s wash bands, a wash close, a wash hero; the dark one stays', () => {
    // Soft wash paints its own light bands wash in turn: no wash panel, the dark panel still drawn.
    const soft = fills(PAGE.map((m) => b(m.host as Host)), light('softWash.mostlyLight'))
    expect(soft.filter((f) => f === 'wash')).toEqual([])
    expect(soft.filter((f) => f === 'ground')).toHaveLength(1)
    expect(fills(PAGE, light(), {}, 'wash')).toEqual([null, 'ground', null, null, null, null, null, null, null])
    expect(fills(PAGE, light(), {heroPaint: 'wash'})).toEqual([null, 'ground', null, null, null, null, null, null, null])
  })

  it('dark bands stay full, an operator’s inset stays his, and the band keeps its light ground in the walk', () => {
    const out = walk([b('narrative', 'light'), b('split', 'light'), b('split', 'light', {appearance: {surface: 'light', inset: true}}), b('statement', 'light')], light())
    expect(out.map((o) => o.seam.paint?.onPanel?.fill ?? null)).toEqual(['ground', null, null, 'wash'])
    expect(out[2].seam.paint).toBeNull()
    // Two light bands, one with a panel: one light ground, the join halved as it always was.
    expect(out[1].seam.seamTop).toBe(true)
    expect(out[1].seam.previousGround).toBe('light')
  })

  it('a band whose words sit on a light-led panel carries nothing of the Background theme’s', () => {
    const textured = effectiveFlow(flowById('quiet.mostlyLight')!, 'pattern.light', 'panelsOnLight')
    const out = walk(PAGE.map((m) => b(m.host as Host)), textured, {patternTexture: 'grid'})
    for (const o of out) if (o.seam.paint?.onPanel) expect((o.seam.paint as Paint).texture, `${o.member.host}`).toBe(false)
  })

  it('never under a theme’s own layout, Contained or Panels', () => {
    for (const f of FLOWS) {
      for (const flow of [f, effectiveFlow(f, null, 'contained'), effectiveFlow(f, null, 'panels')]) {
        expect(walk(PAGE, flow).some((o) => o.seam.paint?.onPanel?.fill === 'ground' || o.seam.paint?.onPanel?.fill === 'wash'), f.id).toBe(false)
      }
    }
  })
})

describe('the crossings: up to two, a figure out of a panel among them', () => {
  it('raises up to two photographs at a change of ground, nearest the middle', () => {
    const page = [b('statement', 'light'), b('split', 'dark', {raisesPhoto: true}), b('narrative', 'light'), b('split', 'dark', {raisesPhoto: true}), b('narrative', 'light'), b('split', 'dark', {raisesPhoto: true}), b('narrative', 'light')]
    const out = walk(page, light())
    expect(out.flatMap((o, k) => (o.seam.raisePhoto ? [k] : []))).toEqual([1, 3])
    expect(out.filter((o) => o.seam.raisePhoto || o.seam.raiseFigure).length).toBeLessThanOrEqual(MAX_CROSSINGS)
  })

  it('the dark panel’s cut-out figure rises out of it, the band above reserving it; under the hero, inside its own band', () => {
    const page = [b('ribbon', 'dark'), b('split', 'light', {raisesPhoto: true, cutout: 'left'}), b('areas', 'light')]
    const out = walk(page, light())
    expect(out[1].seam.paint?.onPanel?.fill).toBe('ground')
    expect(out[1].seam.raiseFigure).toBe('seam')
    expect(out[0].seam.nextOverlap).toBe('photo')
    // The first band under the hero: the panel, the figure rising inside its own band.
    const first = walk(page.slice(1), light())
    expect(first[0].seam.paint?.onPanel?.fill).toBe('ground')
    expect(first[0].seam.raiseFigure).toBe('band')
  })
})

const site = (over: Partial<SiteLook> = {}): SiteLook => ({...LOOK, flow: light(), ...over})
const seam = (fill: 'ground' | 'wash', extra: Partial<SeamProps> = {}): SeamProps =>
  ({...NO_SEAM, site: site(), paint: {texture: false, onPanel: {fill, corner: 'right'}}, ...extra})

describe('the shell: the two panels as drawn', () => {
  const data = {_type: 'contentSection', _key: 'k', layout: 'statement', heading: 'A line', buttons: [{_key: 'b', title: 'Call', url: '/contact/', variant: 'primary'}]} as unknown as ContentSectionData

  it('the dark panel is the dark ground itself, its own dark context, on the band’s light ground; its button a dark one', () => {
    const {container} = render(<ContentSectionBlock data={data} disclaimer="d" scale="marketing" seam={seam('ground')} />)
    const section = container.querySelector('section')!
    expect(section.className.split(' ')).toContain('bg-background')
    expect(section.hasAttribute('data-ring-context')).toBe(false)
    const panel = section.querySelector(':scope > [data-dark-panel]')!
    expect(panel.getAttribute('data-dark-panel')).toBe('ground')
    expect(panel.getAttribute('data-ring-context')).toBe('dark')
    expect(panel.className.split(' ')).toEqual(['relative', 'mx-auto', 'max-w-7xl', 'overflow-hidden', 'rounded-ui', 'panel-pad', 'bg-brand-dark'])
    expect(container.querySelector('[data-context]')?.getAttribute('data-context')).toBe('dark')
  })

  it('the wash panel is the wash on the band’s light ground, the light values unchanged; its button a light one', () => {
    const {container} = render(<ContentSectionBlock data={data} disclaimer="d" scale="marketing" seam={seam('wash')} />)
    const section = container.querySelector('section')!
    const panel = section.querySelector(':scope > [data-wash-panel]')!
    expect(panel.hasAttribute('data-dark-panel')).toBe(false)
    expect(panel.hasAttribute('data-ring-context')).toBe(false)
    expect(panel.className.split(' ')).toEqual(['relative', 'mx-auto', 'max-w-7xl', 'overflow-hidden', 'rounded-ui', 'panel-pad', 'bg-wash'])
    expect(container.querySelector('[data-context]')?.getAttribute('data-context')).toBe('light')
  })

  it('a figure out of either lets it out above, as a Panels panel does', () => {
    const out = render(<SectionShell appearance={{surface: 'light'}} seam={seam('ground', {raiseFigure: 'seam'})}>x</SectionShell>).container
    expect(out.querySelector('[data-dark-panel="ground"]')!.className.split(' ')).toContain('panel-clip')
  })
})

describe('no new color', () => {
  it('the layout asks the palette for nothing: the site look carries no panel room and the panels draw two solved grounds', () => {
    for (const p of PALETTE_PRESETS) {
      const d = {...presetInputs(p), flow: 'editorial.mostlyLight'}
      expect('panelRoom' in siteLookOf({...d, pageLayout: 'panelsOnLight'}), p.id).toBe(false)
    }
  })
})
