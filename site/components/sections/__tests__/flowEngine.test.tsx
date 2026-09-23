import {describe, expect, it, vi} from 'vitest'
import {forwardRef} from 'react'
import {render} from '@testing-library/react'

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
import {DARK_PAINTS, FLOWS, HOSTS, LIGHT_PAINTS, STEP_HOSTS, flowById, unmetNeeds, type FlowRules, type Host} from '@/lib/flows'
import {type VisibleGround} from '@/lib/sectionSurface'
import {ghostSource} from '@/lib/brandMark'
import {LOOK, themed} from './flowFixtures'
import {RECORD_CANVASES, stubCanvas} from './stubCanvases'
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

  it('an inset the rhythm would bracket adopts, so pairs and alternate see it as dark (ADV-17B-2 F1)', () => {
    // Read the VISIBLE ground, adoption included, not the pass's paint: the walk's adoption
    // pass paints an inset bracketed by two dark bands on the dark ground ([R-501]).
    const visible = (bands: Band[], flow: FlowRules) =>
      walkFrame(bands, resolveBand, {...LOOK, flow}, 'dark').map((o) =>
        o.seam.insetGround ?? (o.member.appearance?.inset ? 'light' : o.seam.paint?.ground ?? o.member.appearance?.surface ?? 'light'))
    const pairs = themed({dark: {budget: 'all', hosts: ['ribbon'], rhythm: 'pairs'}})
    // candidate | stored inset | stored dark: taking the candidate would make three.
    expect(visible([b('ribbon'), b('split', {inset: true, surface: 'light'}), b('ribbon', {surface: 'dark'})], pairs)).toEqual(['light', 'light', 'dark'])
    const alternate = themed({dark: {budget: 'all', hosts: ['ribbon'], rhythm: 'alternate'}})
    // stored dark | stored inset | candidate: the inset would adopt, so the candidate stays light.
    expect(visible([b('ribbon', {surface: 'dark'}), b('split', {inset: true, surface: 'tint'}), b('ribbon')], alternate)).toEqual(['dark', 'light', 'light'])
    // candidate | inset | candidate: the second candidate would bracket the inset.
    expect(visible([b('ribbon'), b('split', {inset: true}), b('ribbon')], alternate)).toEqual(['dark', 'light', 'light'])
    // And under pairs the two candidates around an inset are a run of three, so one is refused.
    expect(visible([b('ribbon'), b('split', {inset: true}), b('ribbon')], pairs)).toEqual(['dark', 'light', 'light'])
    // A promoted inset counts against the budget: budget 2, one candidate taken, the
    // inset beside a stored dark band adopts and spends the second.
    const budget = themed({dark: {budget: 'third', hosts: ['ribbon'], rhythm: 'pairs'}})
    const out = visible([b('ribbon', {surface: 'dark'}), b('split', {inset: true}), b('ribbon'), b('split'), b('split'), b('ribbon')], budget)
    expect(out.filter((g) => g === 'dark')).toHaveLength(2)
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
    const flow = themed({dark: {budget: 'threeQuarters', hosts: STEP_HOSTS.mostlyDark, rhythm: 'runs'}})
    const bands = [b('differentiators'), b('caseResults'), b('areas'), b('narrative'), b('attorneys'), b('badges'), b('split'), b('statement')]
    // Budget 8 - 2 = 6; the ribbon-less list ranks narrative, areas, statement, attorneys,
    // caseResults, split, badges; runs gather around each.
    const out = grounds(bands, flow)
    expect(out.filter((g) => g === 'dark')).toHaveLength(6)
    expect(out[0]).toBe('light')
  })

  it('Alternating at mostly dark keeps its pairs, so it still alternates on the composer’s six roles (ADV-17B-2 F12)', () => {
    const flow = flowById('alternating.mostlyDark')!
    expect(flow.dark.rhythm).toBe('pairs')
    const out = grounds(six.map((h) => b(h)), flow)
    // No run of three, and the budget (6 - 2 = 4) is a ceiling the pairs need not reach.
    expect(out.join(' ')).not.toContain('dark dark dark')
    expect(out.filter((g) => g === 'dark').length).toBeLessThanOrEqual(4)
    expect(out.filter((g) => g === 'dark').length).toBeGreaterThanOrEqual(3)
  })
})

describe('precedence: the operator’s band stands', () => {
  it('a stored surface is never repainted, whatever the theme wants', () => {
    const flow = themed({dark: {budget: 'all', hosts: ['ribbon'], rhythm: 'runs'}})
    const out = walkFrame([b('ribbon', {surface: 'tint'}), b('ribbon', {surface: 'light'}), b('ribbon', {surface: 'dark'})], resolveBand, {...LOOK, flow}, 'dark')
    expect(out.map((o) => o.seam.paint?.ground ?? null)).toEqual([null, null, null])
    expect(out.map((o) => o.seam.previousGround)).toEqual([null, 'tint', 'light'])
  })

  it('a stored inset band is never assigned a surface; the rhythm sees it as the band it would adopt', () => {
    const flow = themed({dark: {budget: 'all', hosts: ['ribbon'], rhythm: 'alternate'}})
    const out = walkFrame([b('ribbon'), b('ribbon', {inset: true}), b('ribbon')], resolveBand, {...LOOK, flow}, 'dark')
    expect(out[1].seam.paint).toBeNull()
    // Darkening both neighbours would bracket the panel and `[R-501]` would paint it dark:
    // three in a row under a rhythm that forbids two, so the second candidate stays light.
    expect(out.map((o) => o.seam.paint?.ground ?? null)).toEqual(['dark', null, 'light'])
    expect(out[1].seam.insetGround).toBeNull()
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
// the record's §2.4 table is derived from it, never by hand. Since Phase 17B session
// 3 the canvases include the three record-composed ones under `scripts/ci/` (an
// adversarial mostly-dark page, a planning-family mostly-light page, a multi-practice
// balanced page), read with their references resolved as the homepage query resolves
// them (`stubCanvases.ts`), so the golden's rows are the served page's bands.
describe('the decision golden', () => {
  const FIRM = 'Example Law Firm'
  // The stub datasets, or null on a client tree: the press prunes `scripts/ci`, so
  // the golden (which holds their rows) runs on the template checkout and is skipped,
  // by name, on a propagated client (`[R-175]`).
  const STUB = stubCanvas('fixture.ndjson')
  const RECORDS = RECORD_CANVASES.map((f) => [f.replace(/^record-|\.ndjson$/g, ''), stubCanvas(f)] as const)
  const ciPresent = STUB !== null && RECORDS.every(([, c]) => c !== null)
  const canvases: Array<[string, HomepageBlock[], VisibleGround]> = [
    ...(ciPresent ? [['stub', STUB!.blocks, STUB!.hero] as [string, HomepageBlock[], VisibleGround]] : []),
    ['migrated', migrated as unknown as HomepageBlock[], 'dark'],
    ['planted', planted as unknown as HomepageBlock[], 'dark'],
    ...(ciPresent ? RECORDS.map(([name, c]) => [name, c!.blocks, c!.hero] as [string, HomepageBlock[], VisibleGround]) : []),
  ]
  const themes: FlowRules[] = [...FLOWS, siteLookOf({sectionJoin: 'angled', dividerCarry: ['cards'], patternTexture: 'diagonalHatch', patternGround: 'dark', sectionOverlap: 'photo', brandGhost: 'none'}).flow!]

  it.skipIf(!ciPresent)('records every theme’s decisions on every canvas (skipped on a client tree: the stub datasets are pruned by the press)', async () => {
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

  it('every ground the engine can assign is one the color guarantee sweeps (record §2.13)', () => {
    // The design adds no ground: light, tint, dark, saturated and image are the swept set
    // (`validateWcag`'s light tiers, the dark ground and its blends, accent-fg on the fill,
    // the scrim carve-out). `pattern` is never a paint value (texture is a flag) and `muted`
    // is the close's own, so the dial cannot produce a pair `colorGuarantee.test.ts` misses.
    // Held over the VOCABULARY, not the shipped themes (ADV-17B-2 F4): every dark paint by
    // every light paint, on a list that offers a photo, a content section, a texture and a
    // palette that passes the saturated gate, so every paint's ground is reached.
    const swept = new Set(['light', 'tint', 'dark', 'saturated', 'image'])
    const seen = new Set<string>()
    const list: Band[] = [b('ribbon', null, {photo: true, content: true}), b('split'), b('split', null, {content: true}), b('ribbon'), b('split'), b('ribbon')]
    for (const paint of DARK_PAINTS) {
      for (const light of LIGHT_PAINTS) {
        const flow = themed({dark: {budget: 'third', hosts: ['ribbon'], rhythm: 'pairs', paint}, light: {paint: light}})
        for (const p of assignGrounds(list.map(resolveBand), flow, {patternTexture: 'diagonalHatch', saturated: true})) {
          if (p?.ground) seen.add(p.ground)
        }
      }
    }
    for (const g of seen) expect(swept.has(g), g).toBe(true)
    expect([...seen].sort()).toEqual(['dark', 'image', 'light', 'saturated', 'tint'])
  })

  it('every theme renders every homepage member type, no throw, and no <img> where a photo paint fell back', () => {
    const t = {_id: 't', quote: 'Superb counsel.', name: 'A client'}
    const everyType = [
      ...(planted as unknown as HomepageBlock[]).slice(0, 5),
      {_type: 'testimonialsGridInline', _key: 'tg', heading: 'Clients', testimonials: [t]},
      {_type: 'featuredTestimonialInline', _key: 'ft', heading: 'A client', testimonial: t},
      {_type: 'videoSectionInline', _key: 'v', heading: 'Videos', videos: [{_id: 'v1', title: 'Intro', youTubeUrl: 'https://www.youtube.com/watch?v=abc123xyz00', description: 'A video.', videoType: 'educational'}]},
      {_type: 'caseResultsSectionInline', _key: 'cr', heading: 'Results', caseResults: [{_id: 'r', amount: '$1M'}]},
      {_type: 'badgesSectionInline', _key: 'bd', heading: 'Awards', badges: [{src: 'https://cdn.example.com/a.png', alt: 'A', width: 120, height: 60}]},
      {_type: 'reviewsSectionInline', _key: 'rv', heading: 'Reviews', reviewsEmbed: '<div>embed</div>'},
    ] as unknown as HomepageBlock[]
    const photoTheme = themed({dark: {budget: 'all', hosts: [...HOSTS], rhythm: 'runs', paint: 'photo'}})
    for (const flow of [...themes, photoTheme]) {
      const site: SiteLook = {...LOOK, flow, patternTexture: 'diagonalHatch', saturated: true, ghost: {text: 'EL'}}
      const {container} = render(<HomepageCanvas blocks={everyType} site={site} hero="dark" napTokens={{firmName: 'Example Law Firm', firmNameShort: 'Example', primaryPhone: null, primaryTollFree: null}} resultsDisclaimer="Past results do not guarantee a future outcome." />)
      expect(container.querySelectorAll('section').length, flow.id).toBeGreaterThanOrEqual(9)
    }
    // No member carries a background photo, so the photo paint fell back to the dark ground on
    // every band and drew no photo of its own: the same images as under Quiet (a feature photo
    // and the badges' logos), and no scrim anywhere.
    const under = (flow: FlowRules) => render(<HomepageCanvas blocks={everyType} site={{...LOOK, flow}} hero="dark" />).container
    expect(under(photoTheme).querySelectorAll('section img').length).toBe(under(flowById('quiet.mostlyLight')!).querySelectorAll('section img').length)
    expect(under(photoTheme).querySelector('[data-scrim]')).toBeNull()
  })

  it('a stored Pattern band under a dark texture ground rendered dark at a164ce0 and renders light under the bridge (amendment 5, ADV-17B-2 F2a)', () => {
    // The one stored shape the bridge does not reproduce; no live client stores one.
    const site = siteLookOf({sectionJoin: 'angled', patternTexture: 'diagonalHatch', patternGround: 'dark'})
    const {container} = render(<HomepageCanvas blocks={[{_type: 'contentSectionInline', _key: 'p', layout: 'statement', heading: 'Hi', appearance: {surface: 'pattern'}} as unknown as HomepageBlock]} site={site} hero="dark" />)
    const band = container.querySelector('section')!
    expect(band.className.split(' ')).toContain('bg-background')
    expect(band.getAttribute('data-ring-context')).toBeNull()
    expect(band.querySelector('[data-section-texture]')).not.toBeNull()
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
