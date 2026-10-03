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
import {HomepageCta} from '@/components/layout/HomepageCta'
import {PageSections, type PageSectionData} from '../PageSections'
import {assignGrounds, canvasFacts, closeFrame, closeGround, walkFrame, walkPage, siteLookOf, NO_SEAM, type SiteLook} from '../sectionFrame'
import {SectionShell, type SectionAppearance} from '../SectionShell'
import {DARK_PAINTS, FLOWS, HOSTS, LIGHT_PAINTS, STEP_HOSTS, chromeSchemes, closeOf, flowById, unmetNeeds, type FlowRules, type Host} from '@/lib/flows'
import {PALETTE_PRESETS, presetInputs} from '@/lib/palettes'
import {type VisibleGround} from '@/lib/sectionSurface'
import {ghostSource} from '@/lib/brandMark'
import {LOOK, themed} from './flowFixtures'
import type {HeroPhoto, SetPhoto} from '@/lib/heroGround'

/** Quiet with the room it never takes, for the case that nothing sets `spacing` by default. */
const QUIET_ROOM = themed({})
import {RECORD_CANVASES, stubCanvas} from './stubCanvases'
import planted from './fixtures/fixture-shaped-canvas.json'
import migrated from '@/components/layout/__tests__/fixtures/migrated-canvas.json'

const NAVY_BRASS = presetInputs(PALETTE_PRESETS.find((p) => p.id === 'navy-brass')!)

type Band = {host: Host | null; appearance?: SectionAppearance | null; photo?: boolean; content?: boolean; cutout?: 'left' | 'right' | null}
const b = (host: Host | null, appearance?: SectionAppearance | null, extra: Partial<Band> = {}): Band => ({host, appearance, ...extra})
const resolveBand = (m: Band) => ({appearance: m.appearance, empty: false, stored: !!m.appearance?.surface, host: m.host, photo: m.photo, content: m.content, cutout: m.cutout})
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

  it('Alternating ships balanced only: dark-led pages are runs, not alternation ([R-523])', () => {
    // Session 5 measured the ceiling: no rule that forbids three dark in a row gets past 7 of 13
    // on the fixture's shape, where the mostly-dark budget is 9. Runs reach it (Cut blocks).
    expect(flowById('alternating.mostlyDark')).toBeNull()
    const thirteen = ['areas', 'areas', 'differentiators', 'attorneys', 'split', 'narrative', 'statement', 'ribbon', 'statRow', 'statement', 'statement', 'split', 'split'] as Host[]
    const bands = thirteen.map((h, i) => (i === 0 ? b(h, {surface: 'light'}) : i === 5 ? b(h, {inset: true}) : b(h)))
    const runs = grounds(bands, flowById('cutBlocks.mostlyDark')!, {patternTexture: 'diagonalHatch'})
    expect(runs.filter((g) => g === 'dark').length).toBeGreaterThanOrEqual(8)
  })
})

describe('Quiet\u2019s ribbons on the accent (the roster eye of 2026-10-03, [R-631])', () => {
  const quiet = flowById('quiet.mostlyLight')!
  const page = [b('ribbon', null, {content: true}), b('split'), b('narrative'), b('ribbon', null, {content: true}), b('split')]

  it('under Quiet a ribbon takes the saturated ground and the band after it is light; every other band is light', () => {
    expect(grounds(page, quiet, {saturated: true})).toEqual(['saturated', 'light', 'light', 'saturated', 'light'])
    // No other host goes dark under Quiet, however the canvas is shaped.
    const six = ['differentiators', 'caseResults', 'areas', 'narrative', 'attorneys', 'badges'] as Host[]
    expect(grounds(six.map((h) => b(h)), quiet, {saturated: true})).toEqual(Array(6).fill('light'))
  })

  it('where the palette refuses the fill the ribbon is a band of the dark ground, as under Ribbon rhythm; a stored ribbon stands', () => {
    expect(grounds(page, quiet, {saturated: false})).toEqual(['dark', 'light', 'light', 'dark', 'light'])
    expect(grounds([b('ribbon', {surface: 'light'}), b('split')], quiet, {saturated: true})).toEqual(['light', 'light'])
  })

  it('two ribbons together take one fill, and the opening ribbon under the dark hero takes it', () => {
    expect(grounds([b('ribbon', null, {content: true}), b('ribbon', null, {content: true}), b('split')], quiet, {saturated: true})).toEqual(['saturated', 'light', 'light'])
  })

  it('the band renders the fill: the accent ground with its own text color, and the close stays the dark ground', () => {
    const blocks = [
      {_type: 'contentSectionInline', _key: 'r', layout: 'ribbon', heading: 'Call us today'},
      {_type: 'contentSectionInline', _key: 's', layout: 'statement', heading: 'A statement'},
    ] as unknown as HomepageBlock[]
    const sections = [...render(<HomepageCanvas blocks={blocks} site={{...LOOK, flow: quiet, saturated: true}} hero="dark" close="dark" />).container.querySelectorAll('section')]
    expect(sections[0].className.split(' ')).toContain('bg-accent-fill')
    expect(sections[0].getAttribute('data-ring-context')).toBe('saturated')
    expect(sections[1].className.split(' ')).toContain('bg-background')
    expect(closeOf(quiet, {footer: 'light', above: 'light', heroPhoto: false, colors: NAVY_BRASS})).toBe('dark')
  })
})

describe('the words of session 5: the room, the accent line, the needs read from the pass', () => {
  it('spacious goes on the bands the theme fills; a stored surface keeps its own room', () => {
    const flow = themed({dark: {budget: 'third', hosts: ['ribbon'], rhythm: 'pairs'}, spacing: 'spacious'})
    const paints = assignGrounds([b('ribbon'), b('split'), b('split', {surface: 'tint'})].map(resolveBand), flow)
    expect(paints.map((p) => p?.spacing ?? null)).toEqual(['spacious', 'spacious', null])
    expect(assignGrounds([b('split')].map(resolveBand), QUIET_ROOM)[0]?.spacing).toBeUndefined()
  })

  it('the shell puts the room below a stored spacing and a section’s own: a ribbon stays compact', () => {
    const flow = themed({spacing: 'spacious'})
    const blocks = [
      {_type: 'contentSectionInline', _key: 's', layout: 'statement', heading: 'Spacious'},
      {_type: 'contentSectionInline', _key: 'r', layout: 'ribbon', heading: 'Compact'},
      {_type: 'contentSectionInline', _key: 'n', layout: 'statement', heading: 'Stored', appearance: {spacing: 'normal'}},
    ] as unknown as HomepageBlock[]
    const sections = [...render(<HomepageCanvas blocks={blocks} site={{...LOOK, flow}} hero="dark" />).container.querySelectorAll('section')]
    const cls = (i: number) => sections[i].className.split(' ')
    expect(cls(0)).toEqual(expect.arrayContaining(['pt-24', 'md:pt-32', 'lg:pt-40']))
    expect(cls(1)).toEqual(expect.arrayContaining(['pb-12', 'md:pb-16']))
    expect(cls(1)).not.toContain('lg:pb-40')
    expect(cls(2)).toEqual(expect.arrayContaining(['pb-16', 'md:pb-24', 'lg:pb-28']))
  })

  it('the accent line: every join after the first carries the hairline and its accent ink; the border ink carries the hairline alone', () => {
    const blocks = ['a', 'b', 'c'].map((k) => ({_type: 'contentSectionInline', _key: k, layout: 'statement', heading: k})) as unknown as HomepageBlock[]
    const classes = (flow: FlowRules) => [...render(<HomepageCanvas blocks={blocks} site={{...LOOK, flow}} hero="dark" />).container.querySelectorAll('section')].map((s) => s.className.split(' '))
    const accent = classes(themed({divider: {hairline: 'everyBand', hairlineInk: 'accent'}}))
    expect(accent.map((c) => c.includes('hairline-top') && c.includes('hairline-accent'))).toEqual([false, true, true])
    const border = classes(themed({divider: {hairline: 'everyBand', hairlineInk: 'border'}}))
    expect(border.map((c) => c.includes('hairline-top'))).toEqual([false, true, true])
    expect(border.flat()).not.toContain('hairline-accent')
  })

  it('ribbons are counted as the pass fills them: two apart count, two adjacent or a stored one do not', () => {
    const rr = flowById('ribbonRhythm.mostlyLight')!
    const facts = (bands: Band[]) => canvasFacts(bands.map(resolveBand), {...LOOK, flow: rr, saturated: true})
    expect(facts([b('ribbon', null, {content: true}), b('split'), b('ribbon', null, {content: true})]).ribbonsFilled).toBe(2)
    expect(unmetNeeds(rr, facts([b('ribbon', null, {content: true}), b('split'), b('ribbon', null, {content: true})]))).toEqual([])
    expect(facts([b('ribbon', null, {content: true}), b('ribbon', null, {content: true}), b('split')]).ribbonsFilled).toBe(1)
    expect(facts([b('ribbon', {surface: 'light'}), b('split'), b('ribbon', null, {content: true})]).ribbonsFilled).toBe(1)
    // A palette the fill refuses: the ribbons fall to the dark ground and are still the theme's strips.
    expect(canvasFacts([b('ribbon', null, {content: true}), b('split'), b('ribbon', null, {content: true})].map(resolveBand), {...LOOK, flow: rr, saturated: false}).ribbonsFilled).toBe(2)
    // Facts are read under the theme asked about, not the site's own.
    expect(canvasFacts([b('ribbon'), b('split'), b('ribbon')].map(resolveBand), LOOK, null, rr).ribbonsFilled).toBe(2)
  })

  it('the hero reaches the facts, so a theme that wants a dark hero can say so', () => {
    const tob = flowById('typeOnBlack.allDark')!
    const survivors = [b('split')].map(resolveBand)
    expect(unmetNeeds(tob, canvasFacts(survivors, LOOK, 'dark'))).toEqual([])
    expect(unmetNeeds(tob, canvasFacts(survivors, LOOK, 'image'))).toEqual([])
    expect(unmetNeeds(tob, canvasFacts(survivors, LOOK, 'tint'))).toEqual(['darkHero'])
    expect(unmetNeeds(tob, canvasFacts(survivors, LOOK))).toEqual(['darkHero'])
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
    expect(with_.map((o) => o.seam.paint)).toEqual([{ground: 'dark', texture: 'quiet'}, {texture: 'quiet'}, null])
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

  it('washes alternates the light ground and the wash, counted up from the foot of each light stretch (Phase 17D, [R-551])', () => {
    // The band before a dark or stored band, or before the close, is light, so a wash close never
    // meets a wash band, whatever the count (ADV-17D-B, -C).
    const flow = themed({dark: {budget: 'third', hosts: ['ribbon'], rhythm: 'pairs'}, light: {paint: 'washes'}})
    const bands = [b('split'), b('split'), b('ribbon'), b('split'), b('split', {surface: 'light'}), b('split'), b('split')]
    expect(grounds(bands, flow)).toEqual(['wash', 'light', 'dark', 'light', 'light', 'wash', 'light'])
    for (const n of [4, 5, 6]) expect(grounds(Array.from({length: n}, () => b('split')), flow).at(-1), `${n} bands`).toBe('light')
  })

  it('the ghost never draws on a wash, whose blend with its ink the sweep does not cover', () => {
    const flow = themed({light: {paint: 'washes'}, ghost: 'once'})
    const out = walkFrame([b('split'), b('split')], resolveBand, {...LOOK, flow, ghost: {text: 'AB'}}, 'dark')
    expect(out.map((o) => o.seam.paint?.ground)).toEqual(['wash', 'light'])
    expect(out.map((o) => !!o.seam.ghost)).toEqual([false, true])
  })

  it('a wash close is painted as the theme paints a band, through the frame the homepage renders (ADV-17D-2)', () => {
    const sw = flowById('softWash.mostlyLight')!
    // Its own close, as it stands beside a stored dark footer (`closeOf`; beside its light footer it closes dark).
    const frame = closeFrame(closeOf(sw, {footer: 'dark', above: 'light', heroPhoto: false, colors: {}}), {...LOOK, flow: sw})
    expect(frame).toMatchObject({surface: 'light', seam: {paint: {ground: 'wash', texture: false}}})
    const {container} = render(<HomepageCta data={{heading: 'Talk to us'}} surface={frame.surface} seam={frame.seam} />)
    expect(container.querySelector('section')!.className.split(' ')).toContain('bg-wash')
    // Every other close is its surface alone; a photo close without a photograph has no window.
    expect(closeFrame('dark', LOOK)).toEqual({surface: 'dark'})
    expect(closeFrame('photo', {...LOOK, heroPhoto: null})).toEqual({surface: 'image', seam: undefined})
  })

  it('an operator\u2019s own inset panel keeps its gutter on a full-bleed band too: a live fix, found here (ADV-17D-2)', () => {
    // A scrolling badges band stored as an inset drew its panel to the viewport's edges at the pin.
    const {container} = render(<SectionShell gutter={false} contained={false} appearance={{inset: true, surface: 'dark'}}>band</SectionShell>)
    expect(container.querySelector('section')!.className.split(' ')).toContain('px-[5%]')
  })

  it('a light pattern textures the light bands the theme assigns, gated on the texture', () => {
    const flow = themed({light: {paint: 'pattern'}})
    const out = walkFrame([b('split'), b('split', {surface: 'tint'})], resolveBand, {...LOOK, flow, patternTexture: 'pinstripe'}, 'dark')
    expect(out.map((o) => o.seam.paint)).toEqual([{ground: 'light', texture: 'quiet'}, null])
    const none = walkFrame([b('split')], resolveBand, {...LOOK, flow}, 'dark')
    expect(none[0].seam.paint).toEqual({ground: 'light', texture: false})
  })

  // Phase 17C session 3 (`[R-538]`): the strength word. `alternate` counts the bands the paint
  // textures in page order, a stored dark band it treats included; a stored Pattern band is not the
  // pass's and stays quiet; `strong` is strong everywhere; the light paint counts its own bands.
  it('alternate gives the bands a paint textures quiet, strong, quiet down the page', () => {
    const flow = themed({dark: {budget: 'all', hosts: ['split', 'ribbon'], rhythm: 'runs', paint: 'pattern', texture: 'alternate'}})
    const bands = [b('split'), b('split'), b('split', {surface: 'dark'}), b('split', {surface: 'pattern'}), b('ribbon')]
    const out = walkFrame(bands, resolveBand, {...LOOK, flow, patternTexture: 'grid'}, 'dark')
    expect(out.map((o) => o.seam.paint?.texture ?? null)).toEqual(['quiet', 'strong', 'quiet', null, 'strong'])
    const strong = themed({dark: {budget: 'all', hosts: ['split'], rhythm: 'runs', paint: 'pattern', texture: 'strong'}})
    expect(walkFrame([b('split'), b('split')], resolveBand, {...LOOK, flow: strong, patternTexture: 'grid'}, 'dark').map((o) => o.seam.paint?.texture)).toEqual(['strong', 'strong'])
  })

  it('a light pattern alternates its own bands, apart from the dark ones', () => {
    const flow = themed({dark: {budget: 'all', hosts: ['ribbon'], rhythm: 'runs', paint: 'pattern', texture: 'alternate'}, light: {paint: 'pattern', texture: 'alternate'}})
    const out = walkFrame([b('split'), b('ribbon'), b('split'), b('ribbon'), b('split')], resolveBand, {...LOOK, flow, patternTexture: 'dots'}, 'dark')
    expect(out.map((o) => [o.seam.paint?.ground, o.seam.paint?.texture])).toEqual([
      ['light', 'quiet'], ['dark', 'quiet'], ['light', 'strong'], ['dark', 'strong'], ['light', 'quiet'],
    ])
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

describe('a divider at every change (Phase 17D, Wedges)', () => {
  it('cuts into and out of every strong ground, folding tint and the muted step with light', () => {
    const flow = themed({divider: {shape: 'steep', at: 'everyChange'}})
    const bands = [b('split', {surface: 'light'}), b('split', {surface: 'dark'}), b('split', {surface: 'muted'}), b('split', {surface: 'light'}), b('split', {surface: 'tint'}), b('split', {surface: 'dark'}), b('split', {surface: 'light'})]
    const out = walkFrame(bands, resolveBand, {...LOOK, flow}, 'dark')
    // light to dark: cut; dark to muted: cut; muted to light and light to tint: none; tint to dark and dark to light: cut.
    expect(out.map((o) => o.seam.divider?.mode ?? null)).toEqual(['rise', 'cut', 'cut', null, null, 'cut', 'cut'])
    expect(out[2].seam.divider).toMatchObject({from: 'dark'})
  })

  it('never cuts into an inset panel, whose panel would paint over the wedge (ADV-17D-2)', () => {
    // The panel takes no divider room (`SectionShell`), so a steep wedge ran 145 px into a panel that
    // starts 112 px down at 1440 and was sliced flat. `intoDark` never cut into an inset (its ground is
    // light, or the adopted ground of both neighbours); `everyChange` did, as the rise never has.
    const flow = themed({divider: {shape: 'steep', at: 'everyChange'}})
    // A dark band, the operator's panel (not bracketed, so on the light ground), then dark again.
    const out = walkFrame([b('split', {surface: 'dark'}), b('split', {inset: true, surface: 'light'}), b('split', {surface: 'light'}), b('split', {surface: 'dark'})], resolveBand, {...LOOK, flow}, 'dark')
    expect(out[1].seam.insetGround).toBeNull()
    expect(out[1].seam.divider ?? null).toBeNull()
    // Bands that are not panels still cut at the change.
    expect(out[3].seam.divider).toMatchObject({mode: 'cut', from: 'light'})
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

  it('Type on black draws no line inside its dark run (the roster eye of 2026-10-03, [R-631]); a stored light band inside it gets its two', () => {
    // Justin: "mostly dark theme is so you do not see all the bands but we have gold lines which breaks everything up
    // anyways"; "get rid of the lines". The family's hairline is `atChange`: on an all-dark page under a dark hero no
    // band carries it, and a stored light band is marked at both of its changes. The ribbons' own accent lines
    // (`[R-576]`) are the ribbon's, not the seam's, and stay: a ribbon between two dark bands lines both edges.
    const tob = flowById('typeOnBlack.allDark')!
    const dark = walkPage([b('ribbon'), b('narrative'), b('split'), b('attorneys'), b('ribbon')], resolveBand, {...LOOK, flow: tob}, 'dark', 'dark')
    expect(dark.bands.map((o) => o.seam.paint?.ground)).toEqual(Array(5).fill('dark'))
    expect(dark.bands.map((o) => !!o.seam.hairline)).toEqual(Array(5).fill(false))
    expect(dark.bands.map((o) => o.seam.ribbonEdges ?? null)).toEqual([{top: true, bottom: true}, null, null, null, {top: true, bottom: true}])
    const stored = walkPage([b('ribbon'), b('narrative', {surface: 'light'}), b('split')], resolveBand, {...LOOK, flow: tob}, 'dark', 'dark')
    expect(stored.bands.map((o) => !!o.seam.hairline)).toEqual([false, true, true])
    // Rendered: no hairline class on the dark page; the accent ink where a line draws.
    const blocks = ['a', 'b', 'c'].map((k) => ({_type: 'contentSectionInline', _key: k, layout: 'statement', heading: k})) as unknown as HomepageBlock[]
    const classes = [...render(<HomepageCanvas blocks={blocks} site={{...LOOK, flow: tob}} hero="dark" close="dark" />).container.querySelectorAll('section')].map((s) => s.className.split(' '))
    expect(classes.flat()).not.toContain('hairline-top')
    const lit = [...render(<HomepageCanvas blocks={[blocks[0], {...blocks[1], appearance: {surface: 'light'}} as HomepageBlock, blocks[2]]} site={{...LOOK, flow: tob}} hero="dark" close="dark" />).container.querySelectorAll('section')].map((s) => s.className.split(' '))
    expect(lit.map((c) => c.includes('hairline-top') && c.includes('hairline-accent'))).toEqual([false, true, true])
  })

  it('the hairline at a change of ground marks the joins where the ground changes and no other', () => {
    const flow = themed({divider: {hairline: 'atChange'}})
    const out = walkFrame([b('split', {surface: 'light'}), b('split', {surface: 'dark'}), b('split', {surface: 'dark'}), b('split', {surface: 'tint'}), b('split', {surface: 'light'})], resolveBand, {...LOOK, flow}, 'dark')
    // light to dark: yes; dark to dark: no; dark to tint: yes; tint to light: a wash, no.
    expect(out.map((o) => !!o.seam.hairline)).toEqual([false, true, false, true, false])
  })
})

// ─── Floating panels (Phase 17D, record WS-V1-PHASE17D-DESIGN §2.2) ─────────────
//
// Two paint values, one case each in the switches that exist: a dark band the pass fills is a panel on
// the page's light ground; a light band it leaves is a panel on the dark ground wherever it sits, which
// the walk reads as that ground. Paints exclude each other, so a floating panel cannot also fade, wash
// or carry a photograph window.
describe('floating panels', () => {
  const lightPage = themed({dark: {budget: 'third', hosts: ['ribbon', 'split'], rhythm: 'alternate', paint: 'floating'}})
  const darkPage = themed({dark: {budget: 'threeQuarters', hosts: ['ribbon', 'narrative'], rhythm: 'runs'}, light: {paint: 'floating'}})

  it('a dark band the pass fills floats as a panel on the light page, which the walk reads as light', () => {
    const out = walkFrame([b('ribbon'), b('differentiators'), b('split'), b('differentiators'), b('split'), b('differentiators')], resolveBand, {...LOOK, flow: lightPage}, 'dark')
    expect(out.map((o) => o.seam.paint)).toEqual([
      {ground: 'dark', texture: false, inset: true}, {ground: 'light', texture: false}, {ground: 'dark', texture: false, inset: true},
      {ground: 'light', texture: false}, {ground: 'light', texture: false}, {ground: 'light', texture: false},
    ])
    // The page's ground is whole: every join is light to light, so every join after the first seams.
    expect(out.slice(1).every((o) => o.seam.seamTop)).toBe(true)
    expect(out.every((o) => o.seam.insetGround === null)).toBe(true)
  })

  it('a light band the pass leaves floats on the dark ground, first and last included', () => {
    const out = walkFrame([b('differentiators'), b('ribbon'), b('differentiators'), b('narrative'), b('differentiators')], resolveBand, {...LOOK, flow: darkPage}, 'dark')
    expect(out.map((o) => o.seam.paint?.ground)).toEqual(['light', 'dark', 'light', 'dark', 'light'])
    expect(out.map((o) => o.seam.insetGround)).toEqual(['dark', null, 'dark', null, 'dark'])
    expect(out.filter((_, i) => i % 2 === 0).every((o) => o.seam.paint?.inset && o.seam.paint.onGround === 'dark')).toBe(true)
    // One dark ground down the page: every join seams.
    expect(out.slice(1).every((o) => o.seam.seamTop)).toBe(true)
  })

  it('a stored inset beside a floating light panel is bracketed by the dark it sees (ADV-17D-B: it read light)', () => {
    const out = walkFrame([b('ribbon'), b('differentiators'), b('split', {inset: true, surface: 'light'}), b('narrative'), b('areas')], resolveBand, {...LOOK, flow: darkPage}, 'dark')
    expect(out[1].seam.insetGround).toBe('dark')
    expect(out[2].seam.paint).toBeNull()
    expect(out[2].seam.insetGround).toBe('dark')
    expect(out[3].seam.previousGround).toBe('dark')
  })

  it('a stored surface stands and a stored inset is never assigned', () => {
    const out = walkFrame([b('ribbon', {surface: 'tint'}), b('split', {inset: true, surface: 'dark'}), b('differentiators')], resolveBand, {...LOOK, flow: darkPage}, 'dark')
    expect(out[0].seam.paint).toBeNull()
    expect(out[1].seam.paint).toBeNull()
    expect(out[2].seam.paint).toEqual({ground: 'light', texture: false, inset: true, onGround: 'dark'})
  })

  it('under alternate a floating dark band never sits beside a dark band, stored or filled (ADV-17D-C)', () => {
    const bands = [b('split', {surface: 'dark'}), b('ribbon'), b('split', {surface: 'dark'}), b('ribbon'), b('split'), b('ribbon'), b('split')]
    const out = walkFrame(bands, resolveBand, {...LOOK, flow: lightPage}, 'dark')
    const darkAt = out.map((o) => (o.seam.paint ? o.seam.paint.ground === 'dark' : o.member.appearance?.surface === 'dark'))
    for (let i = 0; i < out.length; i++) {
      if (out[i].seam.paint?.inset && out[i].seam.paint?.ground === 'dark') expect(!!darkAt[i - 1] || !!darkAt[i + 1], `band ${i}`).toBe(false)
    }
    expect(out[1].seam.paint?.ground).not.toBe('dark')
  })

  it('a panel keeps its gutter where its section draws full-bleed, as a scrolling badges band does', () => {
    const {container} = render(<SectionShell gutter={false} contained={false} seam={{...NO_SEAM, site: LOOK, paint: {ground: 'light', texture: false, inset: true, onGround: 'dark'}, insetGround: 'dark'}}>band</SectionShell>)
    expect(container.querySelector('section')!.className.split(' ')).toEqual(expect.arrayContaining(['px-[5%]', 'bg-brand-dark']))
    const band = render(<SectionShell gutter={false} contained={false}>band</SectionShell>)
    expect(band.container.querySelector('section')!.className.split(' ')).not.toContain('px-[5%]')
  })
})

describe('Gradient bloom (Phase 17D session 2, [R-557])', () => {
  const gb = flowById('gradientBloom.mostlyDark')!
  const statement = (key: string, appearance?: SectionAppearance) =>
    ({_type: 'contentSectionInline', _key: key, layout: 'statement', heading: `Heading ${key}`, ...(appearance ? {appearance} : {})}) as unknown as HomepageBlock
  const sections = (blocks: HomepageBlock[], site: Partial<SiteLook>, close: VisibleGround | null = null) =>
    [...render(<HomepageCanvas blocks={blocks} site={{...LOOK, flow: gb, glow: true, ...site}} hero="dark" close={close} />).container.querySelectorAll('section')]
  const cls = (el: Element) => el.className.split(' ')

  it('lights the dark bands it fills and an operator\u2019s stored dark band alike, and takes the photo band\u2019s colors there', () => {
    const [filled, stored, light] = sections([statement('a'), statement('b', {surface: 'dark'}), statement('c', {surface: 'light'})], {})
    for (const el of [filled, stored]) {
      expect(cls(el)).toEqual(expect.arrayContaining(['bg-brand-dark', 'band-glow']))
      expect(el.getAttribute('data-glow')).toBe('true')
      expect(el.getAttribute('data-scrim')).toBeNull()
    }
    expect(cls(light)).not.toContain('band-glow')
    expect(light.getAttribute('data-glow')).toBeNull()
  })

  it('never lights a saturated or an image band, and draws the plain ground where the palette has no room', () => {
    const [sat] = sections([statement('s', {surface: 'saturated'})], {saturated: true})
    expect(cls(sat)).not.toContain('band-glow')
    const plain = sections([statement('a'), statement('b')], {glow: false})
    for (const el of plain) { expect(cls(el)).not.toContain('band-glow'); expect(el.getAttribute('data-glow')).toBeNull() }
    expect(unmetNeeds(gb, canvasFacts([], {...LOOK, flow: gb, glow: false}))).toEqual(['glow'])
  })

  it('lights an adopted inset\u2019s gutter and leaves its light panel its own colors', () => {
    const [, inset] = sections([statement('a', {surface: 'dark'}), statement('p', {inset: true}), statement('c', {surface: 'dark'})], {})
    expect(cls(inset)).toEqual(expect.arrayContaining(['bg-brand-dark', 'band-glow']))
    expect(inset.getAttribute('data-glow')).toBeNull()
  })

  it('peaks on the band carrying a cutout figure, lit from the figure\u2019s side; else on the run\u2019s middle band, lit from the right', () => {
    const run = (bands: Band[]) => walkPage(bands, resolveBand, {...LOOK, flow: themed({dark: {budget: 'all', hosts: ['split'], rhythm: 'runs', paint: 'glow'}}), glow: true}, 'dark').bands.map((o) => o.seam.run)
    expect(run([b('split'), b('split'), b('split'), b('split')]).map((r) => [r?.peak, r?.side])).toEqual(Array(4).fill([2, 'right']))
    expect(run([b('split'), b('split'), b('split', null, {cutout: 'left'}), b('split')]).map((r) => [r?.peak, r?.side])).toEqual(Array(4).fill([2, 'left']))
    expect(run([b('split', null, {cutout: 'right'}), b('split')]).map((r) => [r?.peak, r?.side])).toEqual(Array(2).fill([0, 'right']))
    // No other theme's run carries a peak or a side.
    const other = walkPage([b('split'), b('split')], resolveBand, {...LOOK, flow: themed({dark: {budget: 'all', hosts: ['split'], rhythm: 'runs', paint: 'pattern'}}), glow: true}, 'dark').bands
    expect(other.map((o) => o.seam.run)).toEqual([{index: 0, length: 2}, {index: 1, length: 2}])
  })

  it('draws the peak and the side on the band', () => {
    const blocks = [statement('a', {surface: 'dark'}), {_type: 'contentSectionInline', _key: 'f', layout: 'split', heading: 'With a figure', appearance: {surface: 'dark'}, mediaSide: 'left', media: {kind: 'cutout', image: {asset: {_ref: 'image-fxfigure-900x1200-png'}, alt: 'The attorney'}}} as unknown as HomepageBlock]
    const els = sections(blocks, {})
    expect(els.map((el) => cls(el).filter((c) => c.startsWith('grad-p-') || c === 'glow-from-left'))).toEqual([['grad-p-1', 'glow-from-left'], ['grad-p-1', 'glow-from-left']])
  })

  it('runs on into a dark close, which glows as the run\u2019s last band and puts its buttons in the dark context', () => {
    const page = walkPage([b('split'), b('split')], resolveBand, {...LOOK, flow: themed({dark: {budget: 'all', hosts: ['split'], rhythm: 'runs', paint: 'glow'}}), glow: true}, 'dark', 'dark')
    expect(page.bands.map((o) => o.seam.run)).toEqual([{index: 0, length: 3, peak: 1, side: 'right'}, {index: 1, length: 3, peak: 1, side: 'right'}])
    expect(page.close).toEqual({run: {index: 2, length: 3, peak: 1, side: 'right'}, fade: 'glow'})
    const frame = closeFrame('dark', {...LOOK, flow: gb, glow: true}, page.close)
    const {container} = render(<HomepageCta data={{heading: 'Talk to us', buttons: [{title: 'Call', url: '/contact/', variant: 'secondary'}]}} surface={frame.surface} seam={frame.seam} />)
    const close = container.querySelector('section')!
    expect(cls(close)).toEqual(expect.arrayContaining(['bg-brand-dark', 'band-glow', 'grad-i-2', 'grad-n-3', 'grad-p-1']))
    expect(close.getAttribute('data-glow')).toBe('true')
    expect(close.querySelector('a')!.className.split(' ')).toEqual(expect.arrayContaining(['border-current', 'text-foreground']))
    // After a light band the close is a run of its own, glowing in its middle; under any other theme it joins nothing.
    expect(walkPage([b('split', {surface: 'light'})], resolveBand, {...LOOK, flow: gb, glow: true}, 'dark', 'dark').close.run).toEqual({index: 0, length: 1, peak: 0, side: 'right'})
    expect(walkPage([b('split'), b('split')], resolveBand, {...LOOK, flow: flowById('cutBlocks.mostlyDark')!}, 'dark', 'dark').close).toEqual({fade: null})
  })

  it('under every theme, a last inset between a dark band and a dark close sits on the dark ground ([R-501], found here)', () => {
    const bands = [b('split', {surface: 'dark'}), b('split', {inset: true})]
    for (const flow of [flowById('quiet.mostlyLight')!, flowById('cutBlocks.mostlyDark')!, gb]) {
      expect(walkPage(bands, resolveBand, {...LOOK, flow, glow: true}, 'dark', 'dark').bands[1].seam.insetGround, flow.id).toBe('dark')
      expect(walkPage(bands, resolveBand, {...LOOK, flow, glow: true}, 'dark', 'muted').bands[1].seam.insetGround, flow.id).toBeNull()
      expect(walkPage(bands, resolveBand, {...LOOK, flow, glow: true}, 'dark', null).bands[1].seam.insetGround, flow.id).toBeNull()
    }
  })

  it('never reaches an interior page', () => {
    const {container} = render(<PageSections sections={[{_type: 'contentSection', _id: 'x', layout: 'statement', heading: 'Hi', appearance: {surface: 'dark'}} as unknown as PageSectionData]} site={{...LOOK, flow: gb, glow: true}} />)
    const el = container.querySelector('section')!
    expect(cls(el)).not.toContain('band-glow')
    expect(el.getAttribute('data-glow')).toBeNull()
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
  type Canvas = [string, HomepageBlock[], VisibleGround, HeroPhoto | null, SetPhoto[]]
  const canvases: Canvas[] = [
    ...(ciPresent ? [['stub', STUB!.blocks, STUB!.hero, STUB!.heroPhoto, STUB!.photoSet] as Canvas] : []),
    ['migrated', migrated as unknown as HomepageBlock[], 'dark', null, []],
    ['planted', planted as unknown as HomepageBlock[], 'dark', null, []],
    // Phase 17B session 6: the photo canvases carry the hero's photograph, as approved; since Phase 17E the set canvases
    // their set too.
    ...(ciPresent ? RECORDS.map(([name, c]) => [name, c!.blocks, c!.hero, c!.heroPhoto, c!.photoSet] as Canvas) : []),
  ]
  const themes: FlowRules[] = [...FLOWS, siteLookOf({sectionJoin: 'angled', dividerCarry: ['cards'], patternTexture: 'diagonalHatch', patternGround: 'dark', sectionOverlap: 'photo', brandGhost: 'none'}).flow!]

  it.skipIf(!ciPresent)('records every theme’s decisions on every canvas (skipped on a client tree: the stub datasets are pruned by the press)', async () => {
    const golden: Record<string, unknown> = {}
    for (const [name, blocks, hero, heroPhoto, photoSet] of canvases) {
      for (const flow of themes) {
        // Phase 17D session 2: a palette with room to glow (`glow`, as `saturated` passes its gate), and the walk with the
        // close's ground below the last band, as the homepage walks it (`walkPage`).
        const site: SiteLook = {...LOOK, flow, patternTexture: 'diagonalHatch', saturated: true, glow: true, ghost: ghostSource(FIRM, flow.ghost === 'once'), heroPhoto, ...(photoSet.length ? {photoSet} : {})}
        const survivors = blocks.map(frameOf).filter((r) => !r.empty)
        // Phase 18 session B: the close as `HomeBody` resolves it, beside the theme's footer and the band above it, on a
        // palette whose fill passes its gate (as `saturated` does here).
        const close = closeOf(flow, {
          footer: chromeSchemes(flow, null, null, {onLight: true, onDark: true}).footer,
          above: walkPage(blocks, frameOf, site, hero, null).last ?? hero,
          heroPhoto: !!heroPhoto,
          colors: NAVY_BRASS,
        })
        const page = walkPage(blocks, frameOf, {...site, close}, hero, closeGround(close, true))
        const out = page.bands
        golden[`${name} / ${flow.id}`] = {
          unmetNeeds: unmetNeeds(flow, canvasFacts(survivors, site, hero)),
          // Phase 17B session 4 (`[R-518]`): the header and footer the theme gives when Header
          // Settings and Footer Settings store none, with both logos uploaded. Site-wide, so
          // the same on every canvas; recorded per canvas so the golden reads as the page.
          chrome: chromeSchemes(flow, null, null, {onLight: true, onDark: true}),
          bands: out.map(({member, seam}) => ({
            key: member._key,
            host: hostOf(member),
            ground: seam.paint?.ground ?? `stored:${member.appearance?.surface ?? 'light'}`,
            // Phase 17C session 3: the strength the pass gave the band, or false.
            texture: seam.paint?.texture ?? false,
            inset: !!(member.appearance?.inset || seam.paint?.inset),
            adopted: seam.insetGround ?? null,
            seam: seam.seamTop,
            divider: seam.divider ?? null,
            hairline: !!seam.hairline,
            ghost: !!seam.ghost,
            raisePhoto: !!seam.raisePhoto,
            run: seam.run ?? null,
            // Phase 17B session 5: the theme's room, recorded only where it moved a band.
            ...(seam.paint?.spacing ? {spacing: seam.paint.spacing} : {}),
            // Phase 17B session 6: the window of the hero's photograph, where a band shows one.
            ...(seam.paint?.window ? {window: seam.paint.window} : {}),
            // Phase 17E: the photograph of the theme's set, where a band shows one, and its place in the run.
            ...(seam.paint?.photo ? {photo: {...seam.paint.photo, id: photoSet[seam.paint.photo.index]?.assetId}} : {}),
            // Phase 17D session 2: what the band draws over a dark ground, where the theme draws anything.
            ...(seam.fade ? {fade: seam.fade} : {}),
            // Phase 17E (`[R-576]`): a ribbon's accent line on each edge it shares with its neighbor's ground.
            ...(seam.ribbonEdges ? {ribbonEdges: seam.ribbonEdges} : {}),
          })),
          // Phase 17D session 2: the close's place in the run, where the theme lights it.
          ...(page.close.run ? {close: page.close} : {}),
          // Phase 17E: the close's photograph of the theme's set, where the theme draws one.
          // Phase 18 session B: the close's ground as resolved beside the footer.
          closeGround: close,
          ...(photoSet.length && close === 'photo' ? {closePhoto: photoSet[0].assetId} : {}),
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
    const swept = new Set(['light', 'tint', 'dark', 'saturated', 'image', 'wash'])
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
    // Since Phase 17D `washes` paints the wash (`[R-551]`), which `validateWcag` holds as a light ground;
    // no paint assigns the tint any more, though an operator may store it.
    expect([...seen].sort()).toEqual(['dark', 'image', 'light', 'saturated', 'wash'])
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
