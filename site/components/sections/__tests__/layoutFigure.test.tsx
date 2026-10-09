import {describe, expect, it, vi} from 'vitest'
import {forwardRef} from 'react'
import {render} from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'

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
import {NO_SEAM, walkFrame, type SeamProps, type SiteLook} from '../sectionFrame'
import {FLOWS, flowById, type FlowRules, type Host} from '@/lib/flows'
import {effectiveFlow} from '@/lib/backgrounds'
import {MAX_CROSSINGS} from '@/lib/layouts'
import {SECTION_SPACING, TIGHT_SPACING} from '@/lib/sectionSurface'
import {LOOK} from './flowFixtures'

// ─── The figure out of a panel (the Layout theme, ADV-LO amendment 5, `[R-655]`) ──────────────────────────────────
//
// Lewin and Calesaric, measured live 2026-10-09 at 1440: the attorney stands on the panel's bottom edge and rises 125 to
// 143 px (Lewin) and 72 px (Calesaric) past its top; on a phone neither crosses. Under a layout that lets a figure out
// (Panels), a band whose words sit on a panel and whose split draws a cut-out raises it: on the panel's bottom edge,
// past its top, across the seam by the raised photograph's depth, which the band above reserves. One of the page's
// crossings; never the first band; a photograph never rises out of a panel.

const CSS = fs.readFileSync(path.resolve(__dirname, '../../../app/globals.css'), 'utf8')

type Band = {host: Host | null; appearance?: SectionAppearance | null; raisesPhoto?: boolean; cutout?: 'left' | 'right' | null; content?: boolean}
const prose = (host: Host, surface: 'dark' | 'light' | 'tint', extra: Partial<Band> = {}): Band => ({host, appearance: {surface}, content: true, ...extra})
const figure = (surface: 'dark' | 'light' | 'tint', side: 'left' | 'right' = 'right'): Band => prose('split', surface, {raisesPhoto: true, cutout: side})
const photo = (surface: 'dark' | 'light'): Band => prose('split', surface, {raisesPhoto: true})
const resolveBand = (m: Band) => ({appearance: m.appearance, empty: false, stored: !!m.appearance?.surface, host: m.host, raisesPhoto: m.raisesPhoto, cutout: m.cutout, content: m.content})
const panels = (flowId = 'alternating.balanced') => effectiveFlow(flowById(flowId)!, null, 'panels')
const walk = (bands: Band[], flow: FlowRules) => walkFrame(bands, resolveBand, {...LOOK, panelRoom: true, flow}, 'dark')
const figuresOf = (bands: Band[], flow: FlowRules) => walk(bands, flow).flatMap((o, i) => (o.seam.raiseFigure ? [i] : []))

describe('the walk: which panel lets its figure out', () => {
  it('a panel band whose split draws a cut-out raises it, and the band above reserves the crossing', () => {
    const page = [prose('narrative', 'light'), figure('dark'), prose('narrative', 'light')]
    const out = walk(page, panels())
    expect(out[1].seam.paint?.onPanel).toBeTruthy()
    expect(out[1].seam.raiseFigure).toBe(true)
    expect(out[1].seam.raisePhoto).toBeFalsy()
    expect(out.map((o) => o.seam.nextOverlap)).toEqual(['photo', 'none', 'none'])
  })

  it('whatever ground the band above shows: the figure breaks the panel, not a change of ground', () => {
    // A dark run, as Lewin's and Calesaric's are: the band above is a full dark band (panel, band, panel).
    const run = [prose('narrative', 'dark'), prose('statement', 'dark'), figure('dark')]
    const out = walk(run, panels())
    expect(out.map((o) => !!o.seam.paint?.onPanel)).toEqual([true, false, true])
    expect(out[2].seam.raiseFigure).toBe(true)
    expect(out[2].seam.seamTop).toBe(true)
    expect(out[1].seam.nextOverlap).toBe('photo')
  })

  it('never the first band (the hero above it reserves nothing), never a band without a cut-out, never a photograph', () => {
    expect(figuresOf([figure('dark'), prose('narrative', 'light')], panels())).toEqual([])
    expect(walk([figure('dark'), prose('narrative', 'light')], panels())[0].seam.paint?.onPanel).toBeTruthy()
    // A panel band whose split draws a photograph: neither the figure nor a raised photograph.
    const out = walk([prose('narrative', 'light'), photo('dark'), prose('narrative', 'light')], panels())
    expect(out[1].seam.paint?.onPanel).toBeTruthy()
    expect(out[1].seam.raiseFigure).toBeFalsy()
    expect(out[1].seam.raisePhoto).toBeFalsy()
    // A panel band of words alone.
    expect(figuresOf([prose('narrative', 'light'), prose('narrative', 'dark'), prose('narrative', 'light')], panels())).toEqual([])
  })

  it('a cut-out on a full band does not rise as a figure: only a panel lets one out', () => {
    // The second dark split in a run stays a full band (never two panels back to back), so its cut-out is a photograph to
    // the walk, which rises only at a change of ground: here none.
    const out = walk([prose('narrative', 'light'), prose('narrative', 'dark'), figure('dark')], panels())
    expect(out.map((o) => !!o.seam.paint?.onPanel)).toEqual([false, true, false])
    expect(out[2].seam.raiseFigure).toBeFalsy()
    expect(out[2].seam.raisePhoto).toBeFalsy()
  })

  it('never under a theme’s own layout, and never under Contained', () => {
    const page = [prose('narrative', 'light'), figure('dark'), prose('narrative', 'light'), figure('dark'), prose('narrative', 'light')]
    for (const f of FLOWS) {
      expect(figuresOf(page, f), f.id).toEqual([])
      expect(figuresOf(page, effectiveFlow(f, null, 'contained')), f.id).toEqual([])
    }
  })

  it('one of the page’s crossings: with the raised photographs, never more than two, nearest the middle, none touching', () => {
    // Four eligible seams: figures out of panels at 1 and 5, photographs at 3 and 7 (light splits under dark practice areas,
    // which take no panel).
    const areas: Band = {host: 'areas', appearance: {surface: 'dark'}, content: false}
    const page = [
      prose('narrative', 'light'), figure('dark'), areas, photo('light'), areas,
      figure('dark'), areas, photo('light'), prose('narrative', 'dark'),
    ]
    const out = walk(page, panels())
    expect(out.map((o) => !!o.seam.paint?.onPanel)).toEqual([false, true, false, false, false, true, false, false, true])
    const crossings = out.flatMap((o, i) => (o.seam.raiseFigure || o.seam.raisePhoto ? [i] : []))
    expect(crossings.length).toBe(MAX_CROSSINGS)
    // The middle is 4: 3 and 5 tie and are two apart, so both are kept; 1 and 7 are left for want of room under the cap.
    expect(crossings).toEqual([3, 5])
    expect(out[3].seam.raisePhoto).toBe(true)
    expect(out[5].seam.raiseFigure).toBe(true)
    expect(out.flatMap((o, i) => (o.seam.nextOverlap === 'photo' ? [i] : []))).toEqual([2, 4])
  })
})

const site = (over: Partial<SiteLook> = {}): SiteLook => ({...LOOK, flow: panels(), panelRoom: true, ...over})
const seam = (extra: Partial<SeamProps> = {}): SeamProps =>
  ({...NO_SEAM, site: site(), paint: {texture: false, onPanel: {fill: 'surface', corner: 'right'}}, ...extra})

describe('the shell and the split: the figure as drawn', () => {
  it('the panel lets it out above and below and keeps the clip sideways; every other panel keeps its clip', () => {
    const out = render(<SectionShell appearance={{surface: 'dark'}} seam={seam({raiseFigure: true})}>x</SectionShell>).container
    const panel = out.querySelector('[data-dark-panel]')!
    expect(panel.className.split(' ')).toEqual(['relative', 'mx-auto', 'max-w-7xl', 'panel-clip', 'rounded-ui', 'panel-pad'])
    const plain = render(<SectionShell appearance={{surface: 'dark'}} seam={seam()}>x</SectionShell>).container
    expect(plain.querySelector('[data-dark-panel]')!.className.split(' ')).toEqual(['relative', 'mx-auto', 'max-w-7xl', 'overflow-hidden', 'rounded-ui', 'panel-pad'])
  })

  it('the band publishes the top padding it draws, halved at a seam, so the figure cancels exactly that', () => {
    const classes = (s: Partial<SeamProps>) => render(<SectionShell appearance={{surface: 'dark'}} seam={seam(s)}>x</SectionShell>).container.querySelector('section')!.className.split(' ')
    expect(classes({raiseFigure: true})).toEqual(expect.arrayContaining(['band-pt-normal', 'pt-16', 'md:pt-24', 'lg:pt-28']))
    expect(classes({raiseFigure: true, seamTop: true})).toEqual(expect.arrayContaining(['band-pt-seam-normal', 'pt-8', 'md:pt-12', 'lg:pt-14']))
    expect(classes({raiseFigure: true, seamTop: true})).not.toContain('band-pt-normal')
    expect(classes({}).filter((c) => c.startsWith('band-pt'))).toEqual([])
  })

  it('the split’s cut-out stands on the panel’s edge and rises, from xl, whatever its own cutoutEdge', () => {
    const data = {
      _type: 'contentSection', _key: 'k', layout: 'split', heading: 'Our founder', body: [], mediaSide: 'left',
      media: {kind: 'cutout', image: {asset: {_ref: 'image-abc-600x800-png'}, alt: 'The founder'}},
    } as unknown as ContentSectionData
    const column = (s: SeamProps) => {
      const img = render(<ContentSectionBlock data={data} disclaimer="d" scale="marketing" seam={s} />).container.querySelector('img')!
      return img.closest('.stacked-cutout')!.parentElement!.className.split(' ')
    }
    const risen = column(seam({raiseFigure: true}))
    expect(risen).toEqual(expect.arrayContaining(['xl:self-end', 'xl:figure-rise']))
    for (const c of ['xl:photo-rise', 'xl:self-start', 'xl:cutout-sink']) expect(risen).not.toContain(c)
    expect(column(seam()).filter((c) => c.includes('rise'))).toEqual([])
  })

  it('the rise cancels the panel’s top padding, the band’s, its divider, and crosses by the raised photograph’s depth', () => {
    const rule = CSS.slice(CSS.indexOf('@utility figure-rise {'), CSS.indexOf('\n}\n', CSS.indexOf('@utility figure-rise {')) + 2)
    expect(rule).toContain('margin-bottom: calc(-1 * var(--band-pb, 0px));')
    expect(rule).toContain('margin-top: calc(-1 * (var(--panel-pt, 0px) + var(--band-pt, 0px) + var(--band-divider, 0px) + var(--photo-rise)));')
    // Only where the panel can let it out: an engine without `overflow: clip` keeps the clip and the figure inside it.
    expect(rule.indexOf('@supports (overflow: clip)')).toBeLessThan(rule.indexOf('margin-top'))
    const clip = CSS.slice(CSS.indexOf('@utility panel-clip {'), CSS.indexOf('\n}\n', CSS.indexOf('@utility panel-clip {')) + 2)
    expect(clip).toContain('overflow: hidden;\n  @supports (overflow: clip) { overflow-x: clip; overflow-y: visible; }')
  })

  it('the panel publishes its own top padding at every width, and the seam twins halve the band’s', () => {
    const pad = CSS.slice(CSS.indexOf('@utility panel-pad {'), CSS.indexOf('\n}\n', CSS.indexOf('@utility panel-pad {')) + 2)
    expect(pad).toContain('padding: 2.5rem 1.25rem;\n  --band-pb: 2.5rem;\n  --panel-pt: 2.5rem;')
    expect(pad).toContain('@variant md { padding: 3.5rem 3rem; --band-pb: 3.5rem; --panel-pt: 3.5rem; }')
    expect(pad).toContain('@variant lg { padding: 4.5rem; --band-pb: 4.5rem; --panel-pt: 4.5rem; }')
    // Each seam twin publishes, at each breakpoint, the rem its preset's `seamTop` classes draw.
    const rems = (classes: string) => Object.fromEntries(classes.split(' ').map((c) => [c.includes(':') ? c.split(':')[0] : '', Number(c.replace(/^[a-z]*:?pt-/, '')) / 4]))
    for (const steps of [...Object.values(SECTION_SPACING), TIGHT_SPACING]) {
      const line = CSS.split('\n').find((l) => l.startsWith(`@utility ${steps.ptSeamVar} `))!
      const vars = Object.fromEntries([...line.matchAll(/(?:@variant (\w+) \{ )?--band-pt: ([\d.]+)rem;/g)].map((m) => [m[1] ?? '', Number(m[2])]))
      expect(vars, steps.ptSeamVar).toEqual(rems(steps.seamTop))
    }
  })
})
