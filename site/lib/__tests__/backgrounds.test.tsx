import {describe, expect, it} from 'vitest'
import {render} from '@testing-library/react'
import {SectionShell} from '@/components/sections/SectionShell'
import {NO_SEAM} from '@/components/sections/sectionFrame'
import {HeroBand} from '@/components/layout/homeHero/shared'
import {fadeOnLight, resolvePalette, validateWcag, FADE_LIGHT_OPACITY} from '../designTokens'
import {
  BACKGROUNDS, BACKGROUND_CONTRACT, BACKGROUND_FAMILIES, GROUND_TYPES, SUGGESTED_WITH, backgroundById, describeOn, effectiveFlow, siteFlowOf,
  type Cell, type GroundType,
} from '../backgrounds'
import {
  DARK_ONS, FAMILIES, FLOWS, LIGHT_EVERY, LIGHT_ONS, NEEDS, ON_CLOSES, TEXTURE_STRENGTHS, closeOf, drawsHeroPhoto, flowById, impliedNeeds, unmetNeeds,
  type FlowRules,
} from '../flows'
import {assignGrounds, closeFrame, closeGround, walkPage, type FlowInputs, type SiteLook} from '@/components/sections/sectionFrame'
import type {SectionAppearance} from '@/components/sections/SectionShell'
import type {SetPhoto} from '../heroGround'
import {PALETTE_PRESETS, presetInputs} from '../palettes'

// ─── The Background theme (monorepo WS-V1-BACKGROUND-THEME-DESIGN) ────────────
//
// The roster, the one place a theme and a background meet, and THE CONTRACT: every option says what it draws on each of
// the six kinds of ground, or names its fallback, and each cell is rendered through the walk here. His continuity rule
// (2026-10-03): every layer answers its question for every section.

type Band = {host: FlowInputs['host']; surface?: SectionAppearance['surface']; inset?: boolean; content?: boolean; cardPhotos?: boolean}
const resolve = (b: Band) => ({
  appearance: b.surface || b.inset ? {surface: b.surface ?? null, inset: b.inset ?? null} : null,
  empty: false, stored: !!b.surface, host: b.host, content: b.content ?? b.host === 'ribbon', cardPhotos: b.cardPhotos,
})
const photo = (n: number): SetPhoto => ({image: {asset: {_ref: `image-set${n}-2400x1600-jpg`}}, assetId: `image-set${n}-2400x1600-jpg`, key: `image-set${n}-2400x1600-jpg`, width: 2400, height: 1600})
const HERO_PHOTO = {src: 'https://cdn.example/hero.jpg', width: 2400, height: 1600, hotspot: null, assetId: 'image-hero-2400x1600-jpg'}
const NAVY = presetInputs(PALETTE_PRESETS.find((p) => p.id === 'navy-brass')!)
const look = (flow: FlowRules, over: Partial<SiteLook> = {}): SiteLook => ({
  imageFrame: null, cardHover: null, attorneyCardStyle: null, flow, patternTexture: 'diagonalHatch', saturated: true, glow: true, ghost: null,
  heroPhoto: HERO_PHOTO, photoSet: [photo(1), photo(2), photo(3)], closeShown: true, ...over,
})
const under = (flowId: string, backgroundId: string) => effectiveFlow(flowById(flowId)!, backgroundId)

describe('the roster', () => {
  it('generates one background per family per step, with unique ids, every word from the closed vocabulary', () => {
    // The premium package (monorepo `[R-641]`) added the glow's corner, center and accent steps.
    expect(BACKGROUNDS.map((b) => b.id)).toEqual(['plain', 'pattern.touch', 'pattern.light', 'pattern.dark', 'pattern.all', 'gradient', 'glow', 'glow.corner', 'glow.center', 'glow.accent', 'fade', 'span', 'windows'])
    expect(new Set(BACKGROUNDS.map((b) => b.id)).size).toBe(BACKGROUNDS.length)
    for (const b of BACKGROUNDS) {
      expect(b.id, b.id).toMatch(/^[a-z][A-Za-z]{0,23}(\.[a-z][A-Za-z]{0,11})?$/)
      expect(DARK_ONS).toContain(b.on.dark)
      expect(LIGHT_ONS).toContain(b.on.light)
      expect(TEXTURE_STRENGTHS).toContain(b.on.darkTexture)
      expect(TEXTURE_STRENGTHS).toContain(b.on.lightTexture)
      expect(LIGHT_EVERY).toContain(b.on.lightEvery)
      expect(ON_CLOSES).toContain(b.on.close)
      expect(b.sentence.length, b.id).toBeGreaterThan(20)
      for (const need of impliedNeeds({on: b.on, ghost: 'none'})) expect(NEEDS).toContain(need)
    }
    expect(BACKGROUND_FAMILIES.map((f) => f.id)).toEqual(Object.keys(BACKGROUND_CONTRACT))
  })

  it('none has passed his eye: a pass moves only with a verdict ([R-517])', () => {
    expect(BACKGROUNDS.filter((b) => b.passed)).toEqual([])
  })

  it('no background draws the ghosted initials ([R-497]): that is a theme’s word, off on every theme', () => {
    for (const f of FLOWS) for (const b of BACKGROUNDS) expect(effectiveFlow(f, b.id).ghost).toBe('none')
  })

  it('each of his background verdicts has its pair: a roster family and a roster background', () => {
    expect(SUGGESTED_WITH).toEqual({quiet: 'pattern.touch', typeOnBlack: 'fade', editorial: 'pattern.light', photoScrims: 'span', softWash: 'fade', gradientBloom: 'glow'})
    for (const [family, id] of Object.entries(SUGGESTED_WITH)) {
      expect(FAMILIES.some((f) => f.id === family), family).toBe(true)
      expect(backgroundById(id), id).not.toBeNull()
    }
  })
})

describe('the one place a theme and a background meet', () => {
  it('absent, unknown or empty renders the theme’s own, the same object: propagation changes nothing', () => {
    for (const f of FLOWS) {
      expect(effectiveFlow(f, undefined)).toBe(f)
      expect(effectiveFlow(f, null)).toBe(f)
      expect(effectiveFlow(f, 'no-such-background')).toBe(f)
      expect(siteFlowOf({flow: f.id})).toBe(f)
    }
  })

  it('a stored background replaces the theme’s own whole, under any theme, and moves nothing that is the theme’s', () => {
    for (const f of FLOWS) {
      for (const b of BACKGROUNDS) {
        const e = effectiveFlow(f, b.id)
        expect(e.on).toBe(b.on)
        expect({...e, on: null, needs: null}, `${f.id} under ${b.id}`).toEqual({...f, on: null, needs: null})
        expect(siteFlowOf({flow: f.id, background: b.id})).toEqual(e)
      }
    }
  })

  it('the needs are the theme’s own and what the background in force implies, never a subtraction', () => {
    expect(under('cutBlocks.balanced', 'plain').needs).toEqual([])
    expect(under('quiet.mostlyLight', 'pattern.touch').needs).toEqual(['texture'])
    expect(under('typeOnBlack.allDark', 'fade').needs).toEqual(['darkHero', 'heroPhoto', 'photoSet'])
    expect(under('ribbonRhythm.mostlyLight', 'glow').needs).toEqual(['ribbons', 'glow'])
    expect(under('photoScrims.mostlyDark', 'plain').needs).toEqual([])
    // Every roster theme's needs are its own and its own background's.
    for (const f of FLOWS) expect(f.needs, f.id).toEqual([...f.ownNeeds, ...impliedNeeds(f)])
    const none = {hosts: [], photos: 0, texture: false, initials: false}
    expect(unmetNeeds(under('quiet.mostlyLight', 'fade'), {...none, heroPhoto: true})).toEqual(['photoSet'])
    expect(unmetNeeds(under('quiet.mostlyLight', 'fade'), {...none, heroPhoto: true, photoSet: true})).toEqual([])
  })

  it('a background that draws photographs is approved as a theme that draws them is', () => {
    expect(BACKGROUNDS.filter((b) => drawsHeroPhoto(b)).map((b) => b.id)).toEqual(['fade', 'span', 'windows'])
    expect(drawsHeroPhoto(under('photoScrims.mostlyDark', 'plain'))).toBe(false)
    expect(drawsHeroPhoto(under('quiet.mostlyLight', 'span'))).toBe(true)
  })

  it('a theme’s own background is named in words for the row', () => {
    expect(describeOn(flowById('quiet.mostlyLight')!.on)).toBe('nothing on the sections')
    expect(describeOn(flowById('cutBlocks.balanced')!.on)).toBe('the pattern on dark sections')
    expect(describeOn(flowById('editorial.mostlyLight')!.on)).toBe('the pattern on light sections')
    expect(describeOn(flowById('photoScrims.mostlyDark')!.on)).toBe('photographs behind the dark sections, a photograph behind the closing section')
    expect(describeOn(flowById('gradientBloom.mostlyDark')!.on)).toBe('a glow down the dark sections')
  })
})

// ─── The contract, cell by cell ───────────────────────────────────────────────
//
// One canvas per kind of ground, under a theme that lays that ground down, with everything a background can need on
// hand (a texture, room to glow, an approved hero photograph and a set). What the walk then gives the band, the hero or
// the close is read back as a device, and must be the cell the table names.

type Seen = Cell extends infer C ? (C extends {draws: infer D} ? D : never) | 'plain' : never

/** A page of text-led bands that a theme darkens whole: the dark ground, and with a ribbon first the accent fill. */
const DARK_PAGE: Band[] = [{host: 'narrative'}, {host: 'split'}, {host: 'statement'}, {host: 'testimonials'}]
const WASH_PAGE: Band[] = [{host: 'narrative'}, {host: 'badges'}, {host: 'statement'}, {host: 'badges'}]
const LIGHT_PAGE: Band[] = [{host: 'narrative'}, {host: 'split'}, {host: 'statement'}, {host: 'differentiators'}, {host: 'narrative'}]

function seenOnBands(flow: FlowRules, bands: Band[], ground: 'light' | 'wash' | 'dark' | 'saturated', hero: 'dark' | 'light' = 'dark'): Seen[] {
  const site = look(flow)
  const walked = walkPage(bands, resolve, site, hero, null)
  const out: Seen[] = []
  for (const {seam} of walked.bands) {
    const p = seam.paint
    const g = p?.ground === 'image' ? 'dark' : p?.ground
    if (g !== ground) continue
    if (p?.photoFade) out.push(ground === 'dark' ? 'softPhoto' : 'ghost')
    else if (p?.photo || p?.window) out.push('photo')
    else if (p?.texture) out.push('texture')
    else if (seam.fade === 'glow' && ground === 'dark') out.push('glow')
    else if (seam.fade === 'gradient' && ground === 'dark') out.push('ramp')
    else out.push('plain')
  }
  return out
}

const ALL_DARK = 'typeOnBlack.allDark'
const LIGHT = 'alternating.balanced'
const WASHES = 'softWash.mostlyLight'
const RIBBONS = 'ribbonRhythm.mostlyLight'

function cell(family: string, ground: GroundType): Seen[] {
  const id = BACKGROUND_FAMILIES.find((f) => f.id === family)!.steps.map((s) => (s.step ? `${family}.${s.step}` : family))
  // Every step of the family is read; a family answers a ground when any of its steps draws there.
  return id.flatMap((bg): Seen[] => {
    if (ground === 'dark') return seenOnBands(under(ALL_DARK, bg), DARK_PAGE, 'dark')
    if (ground === 'light') return seenOnBands(under(LIGHT, bg), LIGHT_PAGE, 'light').concat(seenOnBands(under(WASHES, bg), LIGHT_PAGE, 'light', 'light'))
    // Text-led bands where the wash falls (it is counted from the foot), since a ghost goes behind text-led bands.
    if (ground === 'wash') return seenOnBands(under(WASHES, bg), WASH_PAGE, 'wash', 'light')
    if (ground === 'saturated') return seenOnBands(under(RIBBONS, bg), [{host: 'ribbon'}, {host: 'split'}, {host: 'ribbon'}], 'saturated')
    if (ground === 'hero') {
      const flow = under('gradientBloom.mostlyDark', bg)
      const walked = walkPage(DARK_PAGE, resolve, look(flow), 'dark', 'dark')
      if (walked.hero.run && walked.hero.fade === 'glow') return ['glow']
      if (walked.hero.run && walked.hero.fade === 'gradient') return ['ramp']
      return [flow.on.hero ? 'texture' : 'plain']
    }
    // The close, under a theme with a light footer, so a photograph or a lit close may stand: below a dark run, and
    // below a light page (a dark close that draws nothing of its own melts into a dark run and takes another ground).
    return ([['gradientBloom.mostlyDark', DARK_PAGE, 'dark'], ['quiet.mostlyLight', LIGHT_PAGE, 'light']] as const).map(([theme, page, above]): Seen => {
      const flow = under(theme, bg)
      const site = look(flow)
      const close = closeOf(flow, {footer: 'light', above, heroPhoto: true, colors: NAVY})
      const walked = walkPage(page, resolve, {...site, close}, 'dark', closeGround(close, true))
      const frame = closeFrame(close, {...site, close}, walked.close)
      if (close === 'photo') return 'photo'
      if (frame.seam?.fade === 'glow') return 'glow'
      if (frame.seam?.fade === 'gradient') return 'ramp'
      return frame.seam?.paint?.texture ? 'texture' : 'plain'
    })
  })
}

describe('the contract: every background on every kind of ground, or its named fallback', () => {
  it('names a cell for every family and ground, a fallback always with its reason', () => {
    for (const f of BACKGROUND_FAMILIES) {
      for (const g of GROUND_TYPES) {
        const c = BACKGROUND_CONTRACT[f.id][g]
        expect(c, `${f.id} on ${g}`).toBeDefined()
        if ('fallback' in c) expect(c.why.length, `${f.id} on ${g}`).toBeGreaterThan(3)
      }
    }
  })

  it.each(BACKGROUND_FAMILIES.flatMap((f) => GROUND_TYPES.map((g) => [f.id, g] as const)))('%s on %s is what the walk draws', (family, ground) => {
    const c = BACKGROUND_CONTRACT[family][ground]
    const seen = new Set(cell(family, ground))
    if ('draws' in c) expect([...seen], `${family} on ${ground}`).toContain(c.draws)
    else expect([...seen], `${family} on ${ground}`).toEqual(['plain'])
  })

  it('nothing is ever drawn inside a panel, a theme’s or an operator’s', () => {
    for (const b of BACKGROUNDS) {
      for (const id of ['floatingPanels.balanced', 'floatingPanels.mostlyDark']) {
        const flow = under(id, b.id)
        const page: Band[] = [...DARK_PAGE, {host: 'ribbon'}, {host: 'split', inset: true}]
        for (const p of assignGrounds(page.map(resolve), flow, look(flow))) {
          if (p?.inset) expect(p, `${id} under ${b.id}`).toMatchObject({texture: false})
          if (p?.inset) expect(p!.photoFade ?? p!.photo ?? p!.window, `${id} under ${b.id}`).toBeUndefined()
        }
      }
    }
  })
})

describe('the devices', () => {
  it('a touch of pattern keeps one light section in three, the second and the fifth, two at most; a page with one keeps it', () => {
    const flow = under('quiet.mostlyLight', 'pattern.touch')
    const textured = (n: number) => assignGrounds(Array.from({length: n}, () => resolve({host: 'split'})), flow, look(flow)).map((p) => !!p?.texture)
    expect(textured(1)).toEqual([true])
    expect(textured(3)).toEqual([false, true, false])
    expect(textured(6)).toEqual([false, true, false, false, true, false])
    expect(textured(12).filter(Boolean)).toHaveLength(2)
    const every = under('quiet.mostlyLight', 'pattern.light')
    expect(assignGrounds(Array.from({length: 6}, () => resolve({host: 'split'})), every, look(every)).every((p) => p?.texture === 'quiet')).toBe(true)
  })

  it('faint photographs run behind every stretch of dark bands in turn, three bands a photograph, repeating the set', () => {
    const flow = under(ALL_DARK, 'fade')
    const bands = Array.from({length: 8}, () => resolve({host: 'narrative'}))
    const paints = assignGrounds(bands, flow, look(flow, {photoSet: [photo(1), photo(2)]}), {hero: 'dark'})
    expect(paints.map((p) => p?.ground)).toEqual(Array(8).fill('dark'))
    // The close takes the first photograph, so the bands start on the second and come round again.
    expect(paints.map((p) => p?.photoFade && `${p.photoFade.index}:${p.photoFade.at}/${p.photoFade.length}`)).toEqual(['1:0/3', '1:1/3', '1:2/3', '0:0/3', '0:1/3', '0:2/3', '1:0/2', '1:1/2'])
  })

  it('never beside a photograph that keeps its hard edge, never a textured band or a band whose cards carry photographs, and only with the set', () => {
    const flow = under(ALL_DARK, 'fade')
    const page: Band[] = [{host: 'narrative'}, {host: 'split', surface: 'image'}, {host: 'statement'}, {host: 'areas', cardPhotos: true}, {host: 'narrative'}]
    const bands = page.map(resolve)
    const paints = assignGrounds(bands, flow, look(flow), {hero: 'image'})
    expect(paints.map((p) => !!p?.photoFade)).toEqual([false, false, false, false, true])
    expect(assignGrounds(bands, flow, look(flow, {photoSet: []}), {hero: 'dark'}).some((p) => p?.photoFade)).toBe(false)
    expect(assignGrounds(bands, flow, look(flow, {heroPhoto: null}), {hero: 'dark'}).some((p) => p?.photoFade)).toBe(false)
  })

  it('a ghost goes into every second text-led light or wash band, right then left, alone on its band', () => {
    const flow = under(WASHES, 'fade')
    const paints = assignGrounds(LIGHT_PAGE.map(resolve), flow, look(flow), {hero: 'light'})
    expect(paints.map((p) => p?.photoFade?.side ?? null)).toEqual(['right', null, 'left', null, 'right'])
    for (const p of paints) if (p?.photoFade) expect(p.photoFade).toMatchObject({at: 0, length: 1})
    expect(paints.map((p) => p?.ground)).toEqual(['light', 'wash', 'light', 'wash', 'light'])
  })

  it('Photographs is Photo scrims’ own mechanism under any theme; Hero photograph draws windows though a set is stored', () => {
    const bands = DARK_PAGE.map(resolve)
    const own = flowById('photoScrims.mostlyDark')!
    const span = under('cutBlocks.mostlyDark', 'span')
    expect(span.on).toEqual(own.on)
    expect(assignGrounds(bands, span, look(span), {hero: 'dark'}).some((p) => p?.photo)).toBe(true)
    const windows = under('cutBlocks.mostlyDark', 'windows')
    const painted = assignGrounds(bands, windows, look(windows), {hero: 'dark'})
    expect(painted.some((p) => p?.photo)).toBe(false)
    expect(painted.filter((p) => p?.window).length).toBeGreaterThan(0)
  })

  it('the gradient’s ends join its runs; the bridge’s ramp, which names none, is numbered as it was', () => {
    const flow = under(ALL_DARK, 'gradient')
    const walked = walkPage(DARK_PAGE, resolve, look(flow), 'dark', 'dark')
    expect(walked.hero).toMatchObject({fade: 'gradient', run: {index: 0, length: 6}})
    expect(walked.close.run).toMatchObject({index: 5, length: 6})
    const bridge = {...flow, on: {...flow.on, ends: false}}
    const asWas = walkPage(DARK_PAGE, resolve, look(bridge), 'dark', 'dark')
    expect(asWas.hero.run).toBeUndefined()
    expect(asWas.close.run).toBeUndefined()
    expect(asWas.bands.map((b) => b.seam.run)).toEqual(DARK_PAGE.map((_, i) => ({index: i, length: 4})))
  })

  it('what the theme keeps, a background cannot move: beside a dark footer the close stays the theme’s ground', () => {
    for (const bg of ['span', 'windows', 'fade', 'glow']) {
      const flow = under('cutBlocks.mostlyDark', bg)
      expect(flow.chrome.footer).toBe('dark')
      expect(closeOf(flow, {footer: 'dark', above: 'dark', heroPhoto: true, colors: NAVY}), bg).not.toBe('photo')
      expect(closeOf(flow, {footer: 'dark', above: 'dark', heroPhoto: true, colors: NAVY}), bg).not.toBe('dark')
    }
    expect(closeOf(under('quiet.mostlyLight', 'span'), {footer: 'light', above: 'light', heroPhoto: true, colors: NAVY})).toBe('photo')
  })
})

// ─── As drawn ─────────────────────────────────────────────────────────────────

describe('a faint photograph, as the shell draws it', () => {
  const site = look(under(ALL_DARK, 'fade'))
  const draw = (paint: NonNullable<typeof NO_SEAM.paint>, appearance: SectionAppearance | null = null) =>
    render(<SectionShell appearance={appearance} seam={{...NO_SEAM, site, paint}}>x</SectionShell>).container.querySelector('section')!

  it('a dark band alone keeps its dark ground, takes the photo band’s colors and draws the photograph with its scrim inside soft edges', () => {
    const band = draw({ground: 'dark', texture: false, photoFade: {index: 0, at: 0, length: 1}})
    expect(band.className.split(' ')).toContain('bg-brand-dark')
    expect(band.getAttribute('data-scrim')).toBe('true')
    const layer = band.querySelector('[data-photo-fade="dark"]')!
    expect(layer.className.split(' ')).toContain('photo-fade-run')
    expect(layer.querySelector('img')).not.toBeNull()
    // The scrim fades with the photograph: it is inside the masked layer, not beside it.
    expect(layer.querySelector('.bg-scrim\\/80')).not.toBeNull()
    expect(band.querySelectorAll('.bg-scrim\\/80')).toHaveLength(1)
  })

  it('a band inside a longer run paints no ground and draws nothing: the canvas draws the run once', () => {
    const band = draw({ground: 'dark', texture: false, photoFade: {index: 0, at: 1, length: 3}})
    expect(band.className.split(' ')).not.toContain('bg-brand-dark')
    expect(band.getAttribute('data-scrim')).toBe('true')
    expect(band.getAttribute('data-ring-context')).toBe('dark')
    expect(band.querySelector('[data-photo-fade]')).toBeNull()
  })

  it('a light or wash band takes the ghost’s tiers and draws the photograph under its content, with no scrim, from its side', () => {
    for (const ground of ['light', 'wash'] as const) {
      const band = draw({ground, texture: false, photoFade: {index: 1, at: 0, length: 1, side: 'left'}})
      expect(band.getAttribute('data-fade')).toBe('light')
      expect(band.getAttribute('data-scrim')).toBeNull()
      expect(band.className.split(' ')).toContain('isolate')
      const ghost = band.querySelector('[data-photo-ghost]')!
      expect(ghost.className.split(' ')).toEqual(expect.arrayContaining(['photo-ghost', 'photo-ghost-from-left', '-z-10']))
      expect(band.querySelector('.bg-scrim\\/80')).toBeNull()
    }
  })

  it('never inside a panel, on the tint or muted, or without its photograph', () => {
    expect(draw({ground: 'light', texture: false, inset: true, photoFade: {index: 0, at: 0, length: 1}}).querySelector('[data-photo-ghost]')).toBeNull()
    expect(draw({ground: 'tint', texture: false, photoFade: {index: 0, at: 0, length: 1}}).getAttribute('data-fade')).toBeNull()
    expect(draw({ground: 'light', texture: false, photoFade: {index: 9, at: 0, length: 1}}).getAttribute('data-fade')).toBeNull()
  })

  it('no layer a background draws carries a motion class: how anything moves is the Motion theme’s', () => {
    const html = [
      draw({ground: 'dark', texture: false, photoFade: {index: 0, at: 0, length: 1}}),
      draw({ground: 'light', texture: false, photoFade: {index: 0, at: 0, length: 1}}),
      draw({ground: 'dark', texture: 'strong'}),
    ].map((el) => el.outerHTML).join('')
    expect(html).not.toMatch(/animate-|transition|duration-|bg-fixed|parallax/)
  })
})

describe('the pattern behind the hero', () => {
  const surface = (isDark: boolean, lightGround: 'tint' | 'wash' = 'tint') => ({isDark, hasImage: false, lightGround}) as unknown as Parameters<typeof HeroBand>[0]['surface']
  const band = (props: Partial<Parameters<typeof HeroBand>[0]>) => render(<HeroBand surface={surface(true)} fullViewport={false} {...props}>x</HeroBand>).container.querySelector('section')!

  it('a dark hero draws the texture in the on-dark ink; a light hero paints the page ground under the light texture, a pair already held', () => {
    const dark = band({texture: 'quiet'})
    expect(dark.querySelector('[data-section-texture="quiet"]')!.className.split(' ')).toContain('section-texture-on-dark')
    const light = band({surface: surface(false), texture: 'strong'})
    expect(light.className.split(' ')).toContain('bg-background')
    expect(light.className.split(' ')).not.toContain('bg-hero-tint')
    expect(light.querySelector('[data-section-texture="strong"]')!.className.split(' ')).toEqual(expect.arrayContaining(['section-texture-strong', 'section-texture-on-light']))
  })

  it('never on the wash, over a photograph or a backdrop of its own, and a hero with no pattern is as it was', () => {
    expect(band({surface: surface(false, 'wash'), texture: 'quiet'}).querySelector('[data-section-texture]')).toBeNull()
    expect(band({texture: 'quiet', backdropNode: <div />}).querySelector('[data-section-texture]')).toBeNull()
    const plain = band({surface: surface(false)})
    expect(plain.querySelector('[data-section-texture]')).toBeNull()
    expect(plain.className.split(' ')).toContain('bg-hero-tint')
  })

  it('the gradient’s first run draws the ramp in a dark hero, with no glow colors', () => {
    const ramp = band({glow: {index: 0, length: 4, kind: 'gradient'}})
    expect(ramp.className.split(' ')).toEqual(expect.arrayContaining(['band-gradient', 'grad-i-0', 'grad-n-4']))
    expect(ramp.getAttribute('data-glow')).toBeNull()
    const glow = band({glow: {index: 0, length: 3, peak: 1, kind: 'glow'}})
    expect(glow.className.split(' ')).toContain('band-glow')
    expect(glow.getAttribute('data-glow')).toBe('true')
  })
})

describe('the ghost’s colors (WCAG F83: against the darkest thing behind the text)', () => {
  it('on every preset the ghost draws at its target, every pair a ghosted band draws holds on its floor, and the accent keeps its hue', () => {
    for (const preset of PALETTE_PRESETS) {
      const palette = resolvePalette(presetInputs(preset))
      const fade = fadeOnLight(palette.tokens)
      expect(fade.opacity, preset.id).toBe(FADE_LIGHT_OPACITY)
      expect(palette.tokens['--fade-opacity-on-light']).toBe(String(FADE_LIGHT_OPACITY))
      const floor = validateWcag(palette).filter((r) => r.pair.includes('the ghost floor'))
      expect(floor.length, preset.id).toBe(24)
      expect(floor.filter((r) => !r.passes).map((r) => r.pair), preset.id).toEqual([])
    }
  })

  it('a palette whose strong inks would not hold at the target draws a fainter ghost, never an unreadable band', () => {
    // A mid-grey "dark" ground the engine accepts only by stepping: whatever it resolves to, the solve holds.
    for (const inputs of [{darkGround: '#5a5a5a', lightGround: '#d9d2c3', accent: '#8a6d1f'}, {darkGround: '#3d2b56', lightGround: '#efe6d8', accent: '#c26a2a'}]) {
      const palette = resolvePalette(inputs)
      expect(validateWcag(palette).filter((r) => r.pair.includes('the ghost floor') && !r.passes).map((r) => r.pair)).toEqual([])
      expect(fadeOnLight(palette.tokens).opacity).toBeLessThanOrEqual(FADE_LIGHT_OPACITY)
    }
  })
})
