import {describe, expect, it, vi} from 'vitest'
import {forwardRef} from 'react'
import {render} from '@testing-library/react'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'

// ─── The ground pass (Phase 17B, record §2.3, §5) ─────────────────────────────
//
// The theme fills every band that stores no surface, from its budget, its ranked
// hosts and its rhythm, then paints it; a stored surface is never repainted, a stored
// inset never assigned, an absent one always filled. Tests here drive the walk on
// planted lists of survivors and read its decisions; the shell's half (the assigned
// ground reaching the band) is in `siteLook.test.tsx`; the reproduction under the
// bridge is `flowReproduction.test.tsx`.

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
vi.mock('@/components/ui/ScrollReveal', () => ({
  ScrollReveal: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
}))

import {HomepageCanvas, frameOf, type HomepageBlock} from '@/components/layout/HomepageCanvas'
import {PageSections, type PageSectionData} from '../PageSections'
import {assignGrounds, canvasFacts, walkFrame, siteLookOf, type SiteLook} from '../sectionFrame'
import {type SectionAppearance} from '../SectionShell'
import {FLOWS, flowById, unmetNeeds, type FlowRules, type Host} from '@/lib/flows'
import {ghostSource} from '@/lib/brandMark'
import {LOOK, themed} from './flowFixtures'
import planted from './fixtures/fixture-shaped-canvas.json'
import migrated from '@/components/layout/__tests__/fixtures/migrated-canvas.json'

type Band = {host: Host | null; appearance?: SectionAppearance | null; photo?: boolean; content?: boolean}
const b = (host: Host | null, appearance?: SectionAppearance | null, extra: Partial<Band> = {}): Band => ({host, appearance, ...extra})
const resolveBand = (m: Band) => ({appearance: m.appearance, empty: false, stored: !!m.appearance?.surface, host: m.host, photo: m.photo, content: m.content})
const grounds = (bands: Band[], flow: FlowRules, site: Partial<SiteLook> = {}) =>
  walkFrame(bands, resolveBand, {...LOOK, ...site, flow}, 'dark').map((o) => o.seam.paint?.ground ?? (o.seam.paint?.inset ? 'panel' : o.member.appearance?.surface ?? 'stored?'))

describe('the budget and the rhythm', () => {
  const six = ['differentiators', 'caseResults', 'areas', 'narrative', 'attorneys', 'badges'] as Host[]
  const fresh = six.map((h) => b(h))

  it('bookends darkens nothing mid-page, whatever the hosts', () => {
    expect(grounds(fresh, flowById('quiet.mostlyLight')!)).toEqual(['light', 'light', 'light', 'light', 'light', 'light'])
  })

  it('a third of the survivors at balanced, the best hosts first, never three in a row (pairs)', () => {
    // A fresh build under Alternating at balanced: record §2.7. Budget ceil(6/3) = 2: case
    // results (rank 4) and attorneys (rank 3) are the two best hosts present.
    expect(grounds(fresh, flowById('alternating.balanced')!)).toEqual(['light', 'dark', 'light', 'light', 'dark', 'light'])
  })

  it('pairs allows a run of two and refuses a third', () => {
    const flow = themed({dark: {budget: 'all', hosts: ['ribbon'], rhythm: 'pairs'}})
    const ribbons = Array.from({length: 5}, () => b('ribbon'))
    // Candidates in position order: 0, 1 taken; 2 would make three; 3, 4 taken.
    expect(grounds(ribbons, flow)).toEqual(['dark', 'dark', 'light', 'dark', 'dark'])
  })

  it('alternate never puts two dark bands together', () => {
    const flow = themed({dark: {budget: 'all', hosts: ['ribbon'], rhythm: 'alternate'}})
    expect(grounds(Array.from({length: 5}, () => b('ribbon')), flow)).toEqual(['dark', 'light', 'dark', 'light', 'dark'])
  })

  it('runs gathers the dark bands around the best host before taking the next', () => {
    const flow = themed({dark: {budget: 'third', hosts: ['ribbon', 'split'], rhythm: 'runs'}})
    // Nine bands, budget 3: the ribbon at 4 is taken, then its neighbours below (5) and
    // above (3), not the split at 0.
    const bands = [b('split'), b('narrative'), b('narrative'), b('split'), b('ribbon'), b('split'), b('narrative'), b('narrative'), b('narrative')]
    expect(grounds(bands, flow)).toEqual(['light', 'light', 'light', 'dark', 'dark', 'dark', 'light', 'light', 'light'])
  })

  it('the hero seam is exempt: a band directly under a dark hero may go dark under every rhythm', () => {
    for (const rhythm of ['alternate', 'pairs', 'runs'] as const) {
      const flow = themed({dark: {budget: 'third', hosts: ['ribbon'], rhythm}})
      expect(grounds([b('ribbon'), b('narrative'), b('narrative')], flow)[0], rhythm).toBe('dark')
    }
  })

  it('counts stored dark bands against the budget, so the page’s darkness matches the step', () => {
    const flow = themed({dark: {budget: 'third', hosts: ['ribbon', 'split'], rhythm: 'pairs'}})
    // Six bands, budget 2, two stored dark: nothing left to fill.
    const bands = [b('split'), b('ribbon', {surface: 'dark'}), b('split'), b('ribbon', {surface: 'dark'}), b('split'), b('ribbon')]
    expect(grounds(bands, flow)).toEqual(['light', 'dark', 'light', 'dark', 'light', 'light'])
  })

  it('a host the theme does not name stays light however much budget remains', () => {
    const flow = themed({dark: {budget: 'all', hosts: ['ribbon'], rhythm: 'runs'}})
    expect(grounds([b('statement'), b('badges'), b('areas')], flow)).toEqual(['light', 'light', 'light'])
  })

  it('three quarters at mostly dark, in runs, leaves the weakest hosts light', () => {
    const flow = flowById('alternating.mostlyDark')!
    const bands = [b('differentiators'), b('caseResults'), b('areas'), b('narrative'), b('attorneys'), b('badges'), b('split'), b('statement')]
    // Budget 8 - 2 = 6; the ribbon-less list ranks narrative, areas, statement, attorneys,
    // caseResults, split, badges; runs gather around each.
    const out = grounds(bands, flow)
    expect(out.filter((g) => g === 'dark')).toHaveLength(6)
    expect(out[0]).toBe('light')
  })
})

describe('precedence: the operator’s band stands', () => {
  it('a stored surface is never repainted, whatever the theme wants', () => {
    const flow = themed({dark: {budget: 'all', hosts: ['ribbon'], rhythm: 'runs'}})
    const out = walkFrame([b('ribbon', {surface: 'tint'}), b('ribbon', {surface: 'light'}), b('ribbon', {surface: 'dark'})], resolveBand, {...LOOK, flow}, 'dark')
    expect(out.map((o) => o.seam.paint?.ground ?? null)).toEqual([null, null, null])
    expect(out.map((o) => o.seam.previousGround)).toEqual([null, 'tint', 'light'])
  })

  it('a stored inset band is never assigned a surface and counts as light to the rhythm', () => {
    const flow = themed({dark: {budget: 'all', hosts: ['ribbon'], rhythm: 'alternate'}})
    const out = grounds([b('ribbon'), b('ribbon', {inset: true}), b('ribbon')], flow)
    // The panel between two candidates is light, so both neighbours may go dark.
    expect(out).toEqual(['dark', 'stored?', 'dark'])
  })

  it('an absent surface is always filled: light where the theme darkens nothing', () => {
    const out = walkFrame([b('ribbon'), b('split')], resolveBand, LOOK, 'dark')
    expect(out.map((o) => o.seam.paint)).toEqual([{ground: 'light', texture: false}, {ground: 'light', texture: false}])
  })

  it('`stored` is read from the raw member, not from a resolver that answers light for an absent surface', () => {
    const flow = themed({dark: {budget: 'all', hosts: ['badges'], rhythm: 'runs'}})
    const badges = {_type: 'badgesSectionInline', _key: 'hp-badgesBlock', heading: 'Awards', badges: [{src: 'https://cdn.example.com/a.png', alt: 'A', width: 120, height: 60}]} as unknown as HomepageBlock
    const frame = frameOf(badges)
    expect(frame.appearance?.surface).toBe('light')
    expect(frame.stored).toBe(false)
    expect(frame.host).toBe('badges')
    const {container} = render(<HomepageCanvas blocks={[badges]} site={{...LOOK, flow}} hero="dark" />)
    expect(container.querySelector('section')!.className.split(' ')).toContain('bg-brand-dark')
  })

  it('an interior list is untouched by the theme', () => {
    const sections = [
      {_type: 'contentSection', _key: 'a', layout: 'ribbon', heading: 'One'},
      {_type: 'contentSection', _key: 'b', layout: 'ribbon', heading: 'Two'},
    ] as unknown as PageSectionData[]
    const flow = themed({dark: {budget: 'all', hosts: ['ribbon'], rhythm: 'runs'}, divider: {shape: 'peak', at: 'intoDark', hairline: 'everyBand'}})
    const {container} = render(<PageSections sections={sections} site={{...LOOK, flow}} />)
    for (const s of container.querySelectorAll('section')) {
      expect(s.className.split(' ')).not.toContain('bg-brand-dark')
      expect(s.className).not.toContain('divider-')
      expect(s.className).not.toContain('hairline-top')
    }
  })
})

describe('each paint, gated by its data', () => {
  const dark = (paint: FlowRules['dark']['paint']) => themed({dark: {budget: 'all', hosts: ['split', 'ribbon'], rhythm: 'runs', paint}})

  it('photo paints a band’s own background photo, else the dark ground', () => {
    const out = walkFrame([b('split', null, {photo: true}), b('split')], resolveBand, {...LOOK, flow: dark('photo')}, 'dark')
    expect(out.map((o) => o.seam.paint?.ground)).toEqual(['image', 'dark'])
  })

  it('pattern textures the dark bands only where the style set names a texture', () => {
    const with_ = walkFrame([b('split'), b('split', {surface: 'dark'}), b('split', {surface: 'pattern'})], resolveBand, {...LOOK, flow: dark('pattern'), patternTexture: 'scallop'}, 'dark')
    expect(with_.map((o) => o.seam.paint)).toEqual([{ground: 'dark', texture: true}, {texture: true}, null])
    const without = walkFrame([b('split'), b('split', {surface: 'dark'})], resolveBand, {...LOOK, flow: dark('pattern')}, 'dark')
    expect(without.map((o) => o.seam.paint)).toEqual([{ground: 'dark', texture: false}, null])
  })

  it('saturated fills a content section where the palette passes the gate, else the dark ground', () => {
    const bands = [b('split', null, {content: true}), b('ribbon', null, {content: false})]
    expect(walkFrame(bands, resolveBand, {...LOOK, flow: dark('saturated'), saturated: true}, 'dark').map((o) => o.seam.paint?.ground)).toEqual(['saturated', 'dark'])
    expect(walkFrame(bands, resolveBand, {...LOOK, flow: dark('saturated'), saturated: false}, 'dark').map((o) => o.seam.paint?.ground)).toEqual(['dark', 'dark'])
  })

  it('gradient and gradientPerBand paint the dark ground and let the shell fade it', () => {
    for (const paint of ['gradient', 'gradientPerBand'] as const) {
      const out = walkFrame([b('split')], resolveBand, {...LOOK, flow: dark(paint)}, 'dark')
      expect(out[0].seam.paint?.ground, paint).toBe('dark')
    }
    const {container} = render(<HomepageCanvas blocks={[{_type: 'contentSectionInline', _key: 'x', layout: 'statement', heading: 'Hi'} as unknown as HomepageBlock]} site={{...LOOK, flow: themed({dark: {budget: 'all', hosts: ['statement'], rhythm: 'runs', paint: 'gradient'}})}} hero="dark" />)
    expect(container.querySelector('section')!.className.split(' ')).toEqual(expect.arrayContaining(['bg-brand-dark', 'band-gradient', 'grad-i-0', 'grad-n-1']))
  })

  it('washes alternates light and tint along the light stretches, and restarts after a dark or stored band', () => {
    const flow = themed({dark: {budget: 'third', hosts: ['ribbon'], rhythm: 'pairs'}, light: {paint: 'washes'}})
    const bands = [b('split'), b('split'), b('ribbon'), b('split'), b('split', {surface: 'light'}), b('split'), b('split')]
    expect(grounds(bands, flow)).toEqual(['light', 'tint', 'dark', 'light', 'light', 'light', 'tint'])
  })

  it('a light pattern textures the light bands the theme assigns, gated on the texture', () => {
    const flow = themed({light: {paint: 'pattern'}})
    const out = walkFrame([b('split'), b('split', {surface: 'tint'})], resolveBand, {...LOOK, flow, patternTexture: 'pinstripe'}, 'dark')
    expect(out.map((o) => o.seam.paint)).toEqual([{ground: 'light', texture: true}, null])
    const none = walkFrame([b('split')], resolveBand, {...LOOK, flow}, 'dark')
    expect(none[0].seam.paint).toEqual({ground: 'light', texture: false})
  })

  it('panel fills an absent inset on a light band inside a dark run, so the panel sits on the run ([R-501])', () => {
    const flow = themed({dark: {budget: 'all', hosts: ['ribbon'], rhythm: 'runs'}, light: {paint: 'panel'}})
    const out = walkFrame([b('ribbon'), b('split'), b('ribbon'), b('split'), b('split')], resolveBand, {...LOOK, flow}, 'dark')
    expect(out[1].seam.paint).toEqual({ground: 'light', texture: false, inset: true})
    expect(out[1].seam.insetGround).toBe('dark')
    // A light band with only one dark neighbour, or a band that stores its own inset, is not filled.
    expect(out[3].seam.paint).toEqual({ground: 'light', texture: false})
    const own = walkFrame([b('ribbon'), b('split', {inset: true, surface: 'light'}), b('ribbon')], resolveBand, {...LOOK, flow}, 'dark')
    expect(own[1].seam.paint).toBeNull()
    expect(own[1].seam.insetGround).toBe('dark')
  })
})

describe('the all-dark page', () => {
  it('seams every join, cuts nowhere, and with gradientPerBand numbers every band as a run of one with a hairline at each', () => {
    const flow = themed({dark: {budget: 'all', hosts: ['split'], rhythm: 'runs', paint: 'gradientPerBand'}, divider: {shape: 'peak', at: 'intoDark', hairline: 'everyBand'}})
    const out = walkFrame(Array.from({length: 13}, () => b('split')), resolveBand, {...LOOK, flow}, 'dark')
    expect(out.every((o) => o.seam.paint?.ground === 'dark')).toBe(true)
    expect(out.slice(1).every((o) => o.seam.seamTop)).toBe(true)
    expect(out.every((o) => !o.seam.divider)).toBe(true)
    expect(out.every((o) => o.seam.run?.index === 0 && o.seam.run.length === 1)).toBe(true)
    expect(out.map((o) => !!o.seam.hairline)).toEqual([false, ...Array(12).fill(true)])
  })

  it('the hairline at a change of ground marks the joins where the ground changes and no other', () => {
    const flow = themed({divider: {hairline: 'atChange'}})
    const out = walkFrame([b('split', {surface: 'light'}), b('split', {surface: 'dark'}), b('split', {surface: 'dark'}), b('split', {surface: 'tint'}), b('split', {surface: 'light'})], resolveBand, {...LOOK, flow}, 'dark')
    // light to dark: yes; dark to dark: no; dark to tint: yes; tint to light: a wash, no.
    expect(out.map((o) => !!o.seam.hairline)).toEqual([false, true, false, true, false])
  })
})

// ─── The decision golden ──────────────────────────────────────────────────────
//
// Every theme on every fixture canvas: what the engine decides per band, and what
// the theme lacks on that canvas. Regenerated only on purpose and read in review;
// the record's §2.4 table is derived from it, never by hand.
describe('the decision golden', () => {
  const FIRM = 'Example Law Firm'
  function stubCanvas(): HomepageBlock[] {
    const lines = readFileSync(resolve(__dirname, '../../../scripts/ci/fixture.ndjson'), 'utf8').split('\n').filter(Boolean)
    return lines.map((l) => JSON.parse(l)).find((d) => d._type === 'homePage').canvas
  }
  const canvases: Array<[string, HomepageBlock[], 'dark' | 'light']> = [
    ['stub', stubCanvas(), 'light'],
    ['migrated', migrated as unknown as HomepageBlock[], 'dark'],
    ['planted', planted as unknown as HomepageBlock[], 'dark'],
  ]
  const themes: FlowRules[] = [...FLOWS, siteLookOf({sectionJoin: 'angled', dividerCarry: ['cards'], patternTexture: 'diagonalHatch', patternGround: 'dark', sectionOverlap: 'photo', brandGhost: 'none'}).flow!]

  it('records every theme’s decisions on every canvas', async () => {
    const golden: Record<string, unknown> = {}
    for (const [name, blocks, hero] of canvases) {
      for (const flow of themes) {
        const site: SiteLook = {...LOOK, flow, patternTexture: 'diagonalHatch', saturated: true, ghost: ghostSource(FIRM, flow.ghost === 'once')}
        const survivors = blocks.map(frameOf).filter((r) => !r.empty)
        const out = walkFrame(blocks, frameOf, site, hero)
        golden[`${name} / ${flow.id}`] = {
          unmetNeeds: unmetNeeds(flow, canvasFacts(survivors, site)),
          bands: out.map(({member, seam}) => ({
            key: member._key,
            host: hostOf(member),
            ground: seam.paint?.ground ?? `stored:${member.appearance?.surface ?? 'light'}`,
            texture: !!seam.paint?.texture,
            inset: !!(member.appearance?.inset || seam.paint?.inset),
            adopted: seam.insetGround ?? null,
            seam: seam.seamTop,
            divider: seam.divider ?? null,
            hairline: !!seam.hairline,
            ghost: !!seam.ghost,
            raisePhoto: !!seam.raisePhoto,
            run: seam.run ?? null,
          })),
        }
      }
    }
    await expect(JSON.stringify(golden, null, 2) + '\n').toMatchFileSnapshot('./__snapshots__/flow-decisions.json')
  })

  it('the pass fills exactly the bands that store no surface and are not inset', () => {
    for (const [, blocks] of canvases) {
      const survivors = blocks.map(frameOf).filter((r) => !r.empty)
      for (const flow of themes) {
        const paints = assignGrounds(survivors, flow, {patternTexture: 'diagonalHatch', saturated: true})
        survivors.forEach((r, i) => {
          const fixed = r.stored || !!r.appearance?.inset
          if (fixed) expect(paints[i]?.ground, `${flow.id} repainted a stored band`).toBeUndefined()
          else expect(paints[i]?.ground, `${flow.id} left a band unfilled`).toBeDefined()
        })
      }
    }
  })
})

function hostOf(member: HomepageBlock): Host | null {
  return frameOf(member).host ?? null
}
