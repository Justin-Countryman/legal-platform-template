// @vitest-environment node
import fs from 'node:fs'
import path from 'node:path'
import {describe, expect, it} from 'vitest'
import {converter} from 'culori'
import {BACKGROUNDS, backgroundById, effectiveFlow} from '../backgrounds'
import {
  GLOW_LIGHT_CHROMA, GLOW_LIGHT_LIFT, GLOW_VEIL, glowLightOf, pairsCeiling, photoBandPairs, rampDrawnMax, resolvePalette, veilOf,
} from '../designTokens'
import {FLOWS, flowById, type FlowRules} from '../flows'
import {PALETTE_PRESETS, presetInputs} from '../palettes'
import {GLOW_LIGHTS_PER_PAGE, walkPage, type FlowInputs, type SiteLook} from '@/components/sections/sectionFrame'
import type {SectionAppearance} from '@/components/sections/SectionShell'

// THE GLOW AS A LIGHT (monorepo WS-PREMIUM-PACKAGE-DESIGN §9, `[R-646]`). PR 4's glow steps mixed a dull color under caps
// and stretched it across whole sections or cut it at every seam; he rejected them on sight. Redone from the live
// references (Nguyen & Malik, Lewin), the Figma kit and the practice of Linear, Vercel and Stripe, then challenged by
// three agents: a light in the accent's hue at the references' saturation, solved under every pair at its brightest
// point, one per group of dark sections and at most three a page, over a deeper surround.

const CSS = fs.readFileSync(path.resolve(__dirname, '../../app/globals.css'), 'utf8')
const toOklch = converter('oklch')
const lch = (hex: string) => toOklch(hex) as unknown as {l: number; c?: number; h?: number}

describe('the glow steps', () => {
  it('keep `glow` as it was, add the corner and the center, unpassed, and retire PR 4’s accent wash', () => {
    const glow = BACKGROUNDS.filter((b) => b.family === 'glow')
    expect(glow.map((b) => b.id)).toEqual(['glow', 'glow.corner', 'glow.center'])
    expect(backgroundById('glow')!.name).toBe('Glow')
    expect(backgroundById('glow')!.on.glowShape).toBeUndefined()
    expect(glow.every((b) => b.passed === false)).toBe(true)
    expect(backgroundById('glow.corner')!.on).toMatchObject({dark: 'glow', glowShape: 'corner'})
    expect(backgroundById('glow.center')!.on).toMatchObject({dark: 'glow', glowShape: 'center'})
    expect(backgroundById('glow.accent')).toBeNull()
    expect(CSS).not.toContain('glow-tint')
    expect(CSS).not.toContain('--color-glow-accent')
  })
})

describe('the light’s color', () => {
  const lit = PALETTE_PRESETS.filter((p) => resolvePalette(presetInputs(p), {glowShape: 'corner'}).glowLightOk)

  it('is emitted only under a positioned glow, and only where the palette has room', () => {
    for (const p of PALETTE_PRESETS) {
      expect(resolvePalette(presetInputs(p)).tokens['--color-glow-light'], p.id).toBeUndefined()
      const r = resolvePalette(presetInputs(p), {glowShape: 'center'})
      expect(!!r.tokens['--color-glow-light'], p.id).toBe(r.glowLightOk)
    }
    // Teal and mint, green and coral: no color holds above the ground, so the steps are withheld there.
    expect(PALETTE_PRESETS.filter((p) => !lit.includes(p)).map((p) => p.id).sort()).toEqual(['green-coral', 'teal-mint'])
  })

  it('keeps the accent’s hue at the references’ saturation, inside the gamut’s edge', () => {
    for (const p of lit) {
      const t = resolvePalette(presetInputs(p), {glowShape: 'corner'}).tokens
      const light = lch(t['--color-glow-light'])
      const accent = lch(t['--color-accent'])
      expect(light.c ?? 0, p.id).toBeLessThanOrEqual(GLOW_LIGHT_CHROMA + 0.005)
      if ((accent.c ?? 0) >= 0.02) {
        const d = Math.abs(((light.h ?? 0) - (accent.h ?? 0) + 540) % 360 - 180)
        expect(d, `${p.id} hue`).toBeLessThan(6)
      }
    }
  })

  it('holds every pair the band draws at its brightest point, as drawn, and lifts clearly over the veiled ground', () => {
    for (const p of lit) {
      const t = resolvePalette(presetInputs(p), {glowShape: 'corner'}).tokens
      const ground = t['--color-brand-dark']
      const light = t['--color-glow-light']
      const ceiling = pairsCeiling(photoBandPairs(t), t['--color-action'], t['--color-action-state-cue-on-scrim'])
      expect(rampDrawnMax(ground, light), p.id).toBeLessThanOrEqual(ceiling + 1e-12)
      expect(lch(light).l - lch(veilOf(ground)).l, p.id).toBeGreaterThanOrEqual(GLOW_LIGHT_LIFT)
      // A lit band's solid card lies between the dark ground and the light, so its pairs are the light's.
      expect(rampDrawnMax(ground, t['--color-glow-surface']), p.id).toBeLessThanOrEqual(ceiling + 1e-12)
    }
  })

  it('navy and brass: the color he approved, a deep gold', () => {
    const t = resolvePalette(presetInputs(PALETTE_PRESETS.find((p) => p.id === 'navy-brass')!), {glowShape: 'corner'}).tokens
    expect(glowLightOf(t['--color-brand-dark'], t['--color-accent'], t).light).toBe('#573d12')
  })
})

describe('the shapes', () => {
  const rules = [...CSS.matchAll(/^(\.glow-light-[^{]+)\{ --glow-light-image: radial-gradient\(ellipse (\d+)px (\d+)% at (\d+)% (\d+)%/gm)]
    .map((m) => ({sel: m[1].trim(), ry: +m[3], y: +m[5]}))

  it('draws every light inside its band, on the seam only where the band below is light, below the hero’s header', () => {
    expect(rules.length).toBe(8)
    for (const r of rules) {
      if (r.sel.includes('glow-light-edge')) { expect(r.y, r.sel).toBe(100); continue }
      const floor = r.sel.includes('glow-light-hero') ? 20 : 0
      expect(r.y - r.ry, r.sel).toBeGreaterThanOrEqual(floor)
      expect(r.y + r.ry, r.sel).toBeLessThanOrEqual(100)
    }
    // Chromium refuses `min()` inside a radial's size and draws nothing (§9.3).
    expect(CSS).not.toMatch(/radial-gradient\(ellipse min\(/)
  })

  it('draws the veil at the engine’s strength, and stands every layer down under forced colors, print and more contrast', () => {
    expect(CSS).toContain(`.glow-veil-flat   { --glow-veil-image: linear-gradient(rgb(0 0 0 / ${GLOW_VEIL}), rgb(0 0 0 / ${GLOW_VEIL})); }`)
    for (const media of ['forced-colors: active', 'print', 'prefers-contrast: more']) {
      expect(CSS, media).toContain(`@media (${media}) { .band-glow, .band-glow:is(.glow-corner, .glow-center) { background-image: none; }`.replace('@media (print)', '@media print'))
    }
  })
})

// ─── Where the lights go ──────────────────────────────────────────────────────

type Band = {host: FlowInputs['host']; inset?: boolean; cutout?: 'left' | 'right'}
const resolve = (b: Band) => ({
  appearance: b.inset ? {surface: null, inset: true} as unknown as SectionAppearance : null,
  empty: false, stored: false, host: b.host, content: b.host === 'ribbon', cutout: b.cutout ?? null,
})
const look = (flow: FlowRules): SiteLook => ({
  imageFrame: null, cardHover: null, attorneyCardStyle: null, flow, patternTexture: 'diagonalHatch', saturated: true, glow: true, ghost: null,
})
// Every band dark under Type on black at all dark: one run, numbered in stretches of three for the glow.
const ALL_DARK = flowById('typeOnBlack.allDark')!
const PAGE: Band[] = [
  {host: 'ribbon'}, {host: 'areas'}, {host: 'narrative'}, {host: 'statement'}, {host: 'attorneys'}, {host: 'testimonials'},
  {host: 'statRow'}, {host: 'badges'}, {host: 'split'}, {host: 'differentiators'}, {host: 'ribbon'},
]
const runsOf = (flow: FlowRules, page: Band[] = PAGE, hero: 'dark' | 'light' = 'light') => walkPage(page, resolve, look(flow), hero, null).bands.map(({seam}) => seam.run)

describe('the lights', () => {
  it('one per run of dark sections, on the band that best carries it, never a ribbon or a panel', () => {
    const runs = runsOf(effectiveFlow(ALL_DARK, 'glow.corner'))
    const lit = runs.flatMap((r, k) => (r?.light ? [k] : []))
    expect(lit.length).toBe(1)
    expect(PAGE[lit[0]].host).toBe('attorneys')
    const panel = runsOf(effectiveFlow(ALL_DARK, 'glow.corner'), [{host: 'narrative'}, {host: 'attorneys', inset: true}, {host: 'split'}])
    expect(panel[1]?.light).toBeUndefined()
  })

  it('at most three a page, the strongest kept, from the figure’s side else alternating, or centered', () => {
    const light = (i: number): Band[] => [{host: 'ribbon', inset: true}, {host: i % 2 ? 'split' : 'attorneys'}, {host: 'narrative'}]
    // Light panels between them break the page into five runs (an inset band is not part of a run's ground).
    const page = [0, 1, 2, 3, 4].flatMap(light)
    const runs = runsOf(effectiveFlow(ALL_DARK, 'glow.corner'), page)
    const lit = runs.flatMap((r) => (r?.light ? [r.light] : []))
    expect(lit.length).toBeLessThanOrEqual(GLOW_LIGHTS_PER_PAGE)
    const center = runsOf(effectiveFlow(ALL_DARK, 'glow.center'), page).flatMap((r) => (r?.light ? [r.light] : []))
    expect(center.every((s) => s === 'center')).toBe(true)
    const figure = runsOf(effectiveFlow(ALL_DARK, 'glow.corner'), [{host: 'narrative'}, {host: 'split', cutout: 'left'}, {host: 'attorneys'}])
    expect(figure[1]?.light).toBe('left')
  })

  it('veils every band of a lit run, flat inside, fading at its two ends, none on a run of one', () => {
    const runs = runsOf(effectiveFlow(ALL_DARK, 'glow.corner'))
    expect(runs[0]?.veil).toBe('top')
    expect(runs.slice(1, -1).every((r) => r?.veil === 'flat')).toBe(true)
    expect(runs[runs.length - 1]?.veil).toBe('bottom')
    const one = runsOf(effectiveFlow(ALL_DARK, 'glow.corner'), [{host: 'attorneys'}])
    expect(one[0]?.veil).toBeUndefined()
  })

  it('moves nothing under any other background: every theme’s runs under a shape are the plain glow’s but for the light’s keys', () => {
    for (const f of FLOWS) {
      const plain = runsOf(effectiveFlow(f, 'glow'), PAGE, 'dark')
      for (const bg of ['glow.corner', 'glow.center']) {
        const shaped = runsOf(effectiveFlow(f, bg), PAGE, 'dark').map((r) => {
          if (!r) return r
          const {light, edge, veil, ...rest} = r
          void light; void edge; void veil
          return rest
        })
        expect(shaped, `${f.id} ${bg}`).toEqual(plain)
      }
      // The theme's own background carries none of them.
      expect(runsOf(f, PAGE, 'dark').some((r) => r?.light || r?.veil), f.id).toBe(false)
    }
  })
})
