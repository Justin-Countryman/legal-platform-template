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
import {CardLink} from '@/components/ui/CardLink'
import {NO_SEAM, siteLookOf, walkFrame, walkPage, type SeamProps, type SiteLook} from '../sectionFrame'
import {FLOWS, flowById, glowLightFillOk, type FlowRules, type Host} from '@/lib/flows'
import {effectiveFlow} from '@/lib/backgrounds'
import {PANEL_HOSTS} from '@/lib/layouts'
import {PALETTE_PRESETS, presetInputs} from '@/lib/palettes'
import {LOOK} from './flowFixtures'

// ─── Panels, the Layout theme's first layout beyond the baseline (ADV-LO amendment 4, `[R-655]`) ──────────────────
//
// A dark band of words keeps its ground and sets them on a raised panel in the column: the ground lifted in its own hue where
// the palette has room for the light, else the light island. Text-led dark bands only, never every dark band; the walk
// reads the band as its own dark ground; the panel takes the lit band's values; a card inside it sits on the dark ground.

const CSS = fs.readFileSync(path.resolve(__dirname, '../../../app/globals.css'), 'utf8')

type Band = {host: Host | null; appearance?: SectionAppearance | null; raisesPhoto?: boolean; cutout?: 'left' | 'right' | null}
const b = (host: Host | null, appearance?: SectionAppearance | null, extra: Partial<Band> = {}): Band => ({host, appearance, ...extra})
const resolveBand = (m: Band) => ({appearance: m.appearance, empty: false, stored: !!m.appearance?.surface, host: m.host, raisesPhoto: m.raisesPhoto, cutout: m.cutout})
const panels = (flowId: string) => effectiveFlow(flowById(flowId)!, null, 'panels')
const walk = (bands: Band[], flow: FlowRules, site: Partial<SiteLook> = {}) => walkFrame(bands, resolveBand, {...LOOK, panelRoom: true, ...site, flow}, 'dark')

const DESIGNED: Band[] = [
  b('narrative', {surface: 'dark'}), b('areas', {surface: 'dark'}), b('split', {surface: 'dark'}), b('testimonials', {surface: 'light'}),
  b('statement', {surface: 'dark'}), b('attorneys', {surface: 'dark'}), b('ribbon', {surface: 'dark'}), b('differentiators', {surface: 'dark'}),
]

describe('the walk: which bands take a panel', () => {
  it('every text-led dark band, stored or painted, and no other band', () => {
    const out = walk(DESIGNED, panels('quiet.mostlyLight'))
    expect(out.map((o) => !!o.seam.paint?.onPanel)).toEqual([true, false, true, false, true, false, false, true])
    // A painted dark ground the same way: Gradient bloom's own dark run on a canvas that stores nothing.
    const fresh = DESIGNED.map((d) => b(d.host))
    const lit = walk(fresh, panels('gradientBloom.mostlyDark'))
    lit.forEach((o) => {
      const dark = o.seam.paint?.ground === 'dark'
      expect(!!o.seam.paint?.onPanel, `${o.member.host}`).toBe(dark && PANEL_HOSTS.includes(o.member.host!))
    })
    expect(lit.some((o) => o.seam.paint?.onPanel)).toBe(true)
  })

  it('never under a theme’s own layout, and never under Contained', () => {
    for (const f of FLOWS) {
      expect(walk(DESIGNED, f).some((o) => o.seam.paint?.onPanel), f.id).toBe(false)
      expect(walk(DESIGNED, effectiveFlow(f, null, 'contained')).some((o) => o.seam.paint?.onPanel), f.id).toBe(false)
    }
  })

  it('the light in each panel’s corner turns side by side down the page, right first', () => {
    const corners = walk(DESIGNED, panels('quiet.mostlyLight')).flatMap((o) => (o.seam.paint?.onPanel ? [o.seam.paint.onPanel.corner] : []))
    expect(corners).toEqual(['right', 'left', 'right', 'left'])
  })

  it('the lifted ground where the palette has room for the light, else the light island', () => {
    expect(walk(DESIGNED, panels('quiet.mostlyLight'), {panelRoom: true})[0].seam.paint?.onPanel?.fill).toBe('surface')
    expect(walk(DESIGNED, panels('quiet.mostlyLight'), {panelRoom: false})[0].seam.paint?.onPanel?.fill).toBe('light')
    // The site look carries the room only under a layout that asks for panels, by the gate the palette emits it under.
    let rooms = 0
    for (const p of PALETTE_PRESETS) {
      const d = {...presetInputs(p), flow: 'quiet.mostlyLight'}
      expect('panelRoom' in siteLookOf(d), p.id).toBe(false)
      expect('panelRoom' in siteLookOf({...d, pageLayout: 'contained'}), p.id).toBe(false)
      const room = siteLookOf({...d, pageLayout: 'panels'}).panelRoom
      expect(room, p.id).toBe(glowLightFillOk(d))
      if (room) rooms++
    }
    expect(rooms).toBeGreaterThanOrEqual(13)
  })

  it('a stored inset stays the operator’s, and a band with a panel keeps its dark ground in the walk', () => {
    const canvas: Band[] = [b('narrative', {surface: 'dark'}), b('split', {surface: 'dark', inset: true}), b('statement', {surface: 'dark'}), b('narrative', {surface: 'dark'})]
    const out = walk(canvas, panels('quiet.mostlyLight'))
    expect(out[1].seam.paint).toBeNull()
    // Two dark bands with panels are one dark ground: the join halves its padding, as two dark bands always did.
    expect(out[3].seam.seamTop).toBe(true)
    expect(out[3].seam.previousGround).toBe('dark')
  })

  it('a panel band carries the group’s light only where no other band can', () => {
    const corner = effectiveFlow(flowById('typeOnBlack.allDark')!, 'glow.corner', 'panels')
    const lightAt = (bands: Band[]) => walkPage(bands, resolveBand, {...LOOK, panelRoom: true, glow: true, flow: corner}, 'light', null).bands.flatMap((o, k) => (o.seam.run?.light ? [k] : []))
    // A narrative (a panel) beside practice areas (no panel): the areas carry it, though a narrative ranks first unpanelled.
    expect(lightAt([b('narrative', {surface: 'dark'}), b('areas', {surface: 'dark'})])).toEqual([1])
    // A group of panel bands alone still has its light.
    expect(lightAt([b('narrative', {surface: 'dark'}), b('statement', {surface: 'dark'})]).length).toBe(1)
  })
})

const site = (over: Partial<SiteLook> = {}): SiteLook => ({...LOOK, flow: panels('quiet.mostlyLight'), panelRoom: true, ...over})
const seam = (onPanel: NonNullable<SeamProps['paint']>['onPanel'], extra: Partial<SeamProps> = {}): SeamProps =>
  ({...NO_SEAM, site: site(), paint: {texture: false, onPanel}, ...extra})

describe('the shell: the panel as drawn', () => {
  it('the band keeps its ground; the words sit on the panel in the column, its padding one gutter', () => {
    const {container} = render(<SectionShell appearance={{surface: 'dark'}} seam={seam({fill: 'surface', corner: 'right'})}>words</SectionShell>)
    const section = container.querySelector('section')!
    expect(section.className.split(' ')).toEqual(expect.arrayContaining(['bg-brand-dark', 'px-[5%]']))
    expect(section.getAttribute('data-ring-context')).toBe('dark')
    const panel = section.querySelector(':scope > [data-dark-panel]')!
    expect(panel.getAttribute('data-dark-panel')).toBe('surface')
    expect(panel.hasAttribute('data-panel-corner')).toBe(false)
    expect(panel.className.split(' ')).toEqual(['relative', 'mx-auto', 'max-w-7xl', 'overflow-hidden', 'rounded-ui', 'panel-pad'])
    expect(panel.querySelector('[data-band-content]')!.textContent).toBe('words')
    // The light on the left names itself; the right is the rule's own.
    const left = render(<SectionShell appearance={{surface: 'dark'}} seam={seam({fill: 'surface', corner: 'left'})}>x</SectionShell>).container
    expect(left.querySelector('[data-dark-panel]')!.getAttribute('data-panel-corner')).toBe('left')
  })

  it('the light island resets the cascade and hands the band’s content a light surface, so its button is a light one', () => {
    const data = {_type: 'contentSection', _key: 'k', layout: 'statement', heading: 'A line', buttons: [{_key: 'b', title: 'Call', url: '/contact/', variant: 'primary'}]} as unknown as ContentSectionData
    const light = render(<ContentSectionBlock data={data} disclaimer="d" scale="marketing" seam={seam({fill: 'light', corner: 'right'}, {paint: {ground: 'dark', texture: false, onPanel: {fill: 'light', corner: 'right'}}})} />).container
    const panel = light.querySelector('[data-dark-panel="light"]')!
    expect(panel.getAttribute('data-ring-context')).toBe('light')
    expect(panel.className.split(' ')).toContain('bg-background')
    expect(light.querySelector('[data-context]')?.getAttribute('data-context')).toBe('light')
    // On the lifted dark panel the button keeps the band's dark context.
    const dark = render(<ContentSectionBlock data={data} disclaimer="d" scale="marketing" seam={seam({fill: 'surface', corner: 'right'}, {paint: {ground: 'dark', texture: false, onPanel: {fill: 'surface', corner: 'right'}}})} />).container
    expect(dark.querySelector('[data-context]')?.getAttribute('data-context')).toBe('dark')
  })

  it('a cut-out on the band’s edge stands on the panel’s: the panel publishes its own bottom padding', () => {
    const rule = CSS.slice(CSS.indexOf('@utility panel-pad {'), CSS.indexOf('\n}\n', CSS.indexOf('@utility panel-pad {')) + 2)
    expect(rule).toContain('padding: 2.5rem 1.25rem;\n  --band-pb: 2.5rem;')
    expect(rule).toContain('@variant md { padding: 3.5rem 3rem; --band-pb: 3.5rem; }')
    expect(rule).toContain('@variant lg { padding: 4.5rem; --band-pb: 4.5rem; }')
  })

  it('keeps its gutter on a section that draws full-bleed, as an inset panel does', () => {
    const {container} = render(<SectionShell appearance={{surface: 'dark'}} gutter={false} contained={false} seam={seam({fill: 'surface', corner: 'right'})}>x</SectionShell>)
    expect(container.querySelector('section')!.className.split(' ')).toContain('px-[5%]')
  })

  it('an inset band is still the operator’s panel, whatever the paint says', () => {
    const {container} = render(<SectionShell appearance={{surface: 'dark', inset: true}} seam={seam({fill: 'surface', corner: 'right'})}>x</SectionShell>)
    expect(container.querySelector('[data-dark-panel]')).toBeNull()
    expect(container.querySelector('section > div.rounded-ui.overflow-hidden')).not.toBeNull()
  })

  it('takes the lit band’s values, the glowing card’s, its button among them', () => {
    const rule = (sel: string) => CSS.slice(CSS.indexOf(`${sel} {`), CSS.indexOf('}', CSS.indexOf(`${sel} {`)))
    const panel = rule('[data-dark-panel="surface"]')
    const card = rule('[data-card-glow="on"] main :is(.bg-brand-dark, [data-ring-context="dark"]) [data-card]')
    const tokens = (r: string) => r.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('--'))
    for (const t of tokens(card)) expect(tokens(panel), t).toContain(t)
    for (const t of ['--color-slab:              var(--color-accent-on-dark);', '--color-btn-dark:          var(--color-btn-dark-on-scrim);']) expect(panel).toContain(t)
    expect(panel).toContain('background-color: var(--color-panel-surface, var(--color-brand-dark));')
    expect(panel).toContain('box-shadow: 0 30px 60px -30px rgb(0 0 0 / 0.6);')
  })

  it('a card inside a panel sits on the dark ground, under the glowing cards and on a lit band', () => {
    const IN = '[data-card-glow="on"] main [data-dark-panel="surface"] [data-card]'
    const LIT = '.glow-lit [data-dark-panel="surface"] [data-card]:not([data-ring-context="light"]):not(:has(img))'
    expect(CSS).toContain(`${IN},\n${LIT} {\n  background-color: var(--color-brand-dark);\n}`)
    // Later than the glowing card's own rule, which it must beat at the same weight.
    expect(CSS.indexOf(IN)).toBeGreaterThan(CSS.indexOf('[data-card-glow="on"] main :is(.bg-brand-dark, [data-ring-context="dark"]) [data-card] {'))
    const {container} = render(
      <div data-card-glow="on"><main>
        <section className="bg-brand-dark glow-lit"><div data-dark-panel="surface"><CardLink href="/a/">In a panel</CardLink></div><CardLink href="/b/">On the band</CardLink></section>
      </main></div>,
    )
    const [inside, onBand] = [...container.querySelectorAll('[data-card]')]
    expect(inside.matches(IN)).toBe(true)
    expect(onBand.matches(IN)).toBe(false)
  })
})
