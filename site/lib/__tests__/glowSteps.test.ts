// @vitest-environment node
import fs from 'node:fs'
import path from 'node:path'
import {describe, expect, it} from 'vitest'
import {converter} from 'culori'
import {BACKGROUNDS, backgroundById, effectiveFlow} from '../backgrounds'
import {
  GLOW_LIGHT_CHROMA, GLOW_LIGHT_LIFT, GLOW_VEIL, glowLightOf, pairsCeiling, photoBandPairs, rampDrawnMax, resolvePalette, veilOf,
} from '../designTokens'
import {FLOWS, GLOW_POSITIONS, flowById, type FlowRules} from '../flows'
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
  it('keep `glow` as it was, the corner and the center passed by his eye ([R-647]), eight fixed positions unpassed ([R-648]), and retire PR 4’s accent wash', () => {
    const glow = BACKGROUNDS.filter((b) => b.family === 'glow')
    expect(glow.map((b) => b.id)).toEqual(['glow', 'glow.corner', 'glow.center', ...GLOW_POSITIONS.map((p) => `glow.${p}`)])
    expect(backgroundById('glow')!.name).toBe('Glow')
    expect(backgroundById('glow')!.on.glowShape).toBeUndefined()
    expect(glow.map((b) => b.passed)).toEqual([false, true, true, ...GLOW_POSITIONS.map(() => false)])
    // A fixed position is always the corner shape, never the center (§10.2: no contradictory pair).
    for (const p of GLOW_POSITIONS) expect(backgroundById(`glow.${p}`)!.on, p).toMatchObject({dark: 'glow', glowShape: 'corner', glowAt: p})
    expect(backgroundById('glow.center')!.on.glowAt).toBeUndefined()
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
  // The light's anchor as the position's classes set it (`[R-648]`): read each class's custom properties from the CSS and
  // combine them as the cascade does, the later and more specific rule winning.
  const decl = (sel: string) => {
    const m = CSS.match(new RegExp(`^${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`, 'm'))
    expect(m, sel).not.toBeNull()
    return Object.fromEntries([...m![1].matchAll(/(--glow-[a-z-]+):\s*([^;]+);/g)].map((d) => [d[1], d[2].trim()]))
  }
  const anchor = (...classes: string[]) => Object.assign({}, decl('.glow-lit'), ...classes.map((c) => decl(c)))
  const pct = (v: string) => (v.endsWith('%') ? +v.slice(0, -1) : NaN)

  it('draws every light inside its band, on a seam only where its row meets a light band, below the hero’s header', () => {
    const inside = [[], ['.glow-light-top'], ['.glow-light-bottom']]
    for (const col of ['.glow-light-left', '.glow-light-right', '.glow-light-center']) {
      for (const row of inside) {
        const a = anchor(col, ...row)
        expect(pct(a['--glow-y']) - pct(a['--glow-ry']), `${col} ${row}`).toBeGreaterThanOrEqual(0)
        expect(pct(a['--glow-y']) + pct(a['--glow-ry']), `${col} ${row}`).toBeLessThanOrEqual(100)
      }
    }
    // The rows are three places, not one squeezed line (§10.2).
    expect(new Set(inside.map((row) => anchor('.glow-light-left', ...row)['--glow-y'])).size).toBe(3)
    // On a seam: the top below the band's own divider, the bottom on its edge.
    expect(decl('.glow-light-top.glow-light-edge')['--glow-y']).toBe('var(--band-divider, 0px)')
    expect(decl('.glow-light-bottom.glow-light-edge')['--glow-y']).toBe('100%')
    for (const hero of [decl('.glow-light-hero'), decl('.glow-light-hero.glow-light-center')]) expect(pct(hero['--glow-y']) - pct(hero['--glow-ry'])).toBeGreaterThanOrEqual(20)
    // A phone keeps the side: the light narrows below md.
    expect(CSS).toContain('@media (max-width: 47.999rem) { .glow-lit { --glow-w: 80vw; } }')
    // Chromium refuses `min()` inside a radial's size and draws nothing (§9.3): plain lengths and variables only.
    expect(CSS).not.toMatch(/radial-gradient\(ellipse min\(/)
    expect(decl('.glow-lit')['--glow-light-image']).toBe('radial-gradient(ellipse var(--glow-w) var(--glow-ry) at var(--glow-x) var(--glow-y), var(--glow-stops))')
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
  it('one per run of dark sections, the row picking the band: the best for the middle, the last for the bottom, the first for the top, never a ribbon or a panel', () => {
    const litAt = (bg: string) => runsOf(effectiveFlow(ALL_DARK, bg)).flatMap((r, k) => (r?.light ? [k] : []))
    expect(litAt('glow.center').map((k) => PAGE[k].host)).toEqual(['attorneys'])
    expect(litAt('glow.left').map((k) => PAGE[k].host)).toEqual(['attorneys'])
    // The automatic corner is the bottom row: the run's last band that carries a light (the ribbon after it does not).
    expect(litAt('glow.corner').map((k) => PAGE[k].host)).toEqual(['differentiators'])
    expect(litAt('glow.bottomRight').map((k) => PAGE[k].host)).toEqual(['differentiators'])
    expect(litAt('glow.topLeft').map((k) => PAGE[k].host)).toEqual(['areas'])
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

  it('stands on its row’s seam only where the run meets a light band there, else inside; the column sets the side', () => {
    // A run whose ends carry lights, between light bands: the top row on the first band's top seam, the bottom on the last's.
    const page: Band[] = [{host: 'split'}, {host: 'attorneys'}, {host: 'narrative'}]
    const top = runsOf(effectiveFlow(ALL_DARK, 'glow.topRight'), page)
    expect(top[0]).toMatchObject({light: 'right', row: 'top', edge: true})
    const bottom = runsOf(effectiveFlow(ALL_DARK, 'glow.bottomLeft'), page)
    expect(bottom[2]).toMatchObject({light: 'left', row: 'bottom', edge: true})
    const mid = runsOf(effectiveFlow(ALL_DARK, 'glow.right'), page)
    expect(mid[1]?.light).toBe('right')
    expect(mid[1]?.row).toBeUndefined()
    expect(mid[1]?.edge).toBeUndefined()
    expect(runsOf(effectiveFlow(ALL_DARK, 'glow.top'), page)[0]?.light).toBe('center')
    // A ribbon first: the top light goes to the first band that carries one, inside it, since a dark band is above it.
    const ribboned = runsOf(effectiveFlow(ALL_DARK, 'glow.topLeft'))
    expect(ribboned[1]).toMatchObject({light: 'left', row: 'top'})
    expect(ribboned[1]?.edge).toBeUndefined()
    // A cut-out figure's band takes the figure's side whatever the column.
    const figure = runsOf(effectiveFlow(ALL_DARK, 'glow.topRight'), [{host: 'split', cutout: 'left'}, {host: 'attorneys'}])
    expect(figure[0]?.light).toBe('left')
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
      for (const bg of BACKGROUNDS.filter((b) => b.on.glowShape).map((b) => b.id)) {
        const shaped = runsOf(effectiveFlow(f, bg), PAGE, 'dark').map((r) => {
          if (!r) return r
          const {light, edge, veil, row, ...rest} = r
          void light; void edge; void veil; void row
          return rest
        })
        expect(shaped, `${f.id} ${bg}`).toEqual(plain)
      }
      // The theme's own background carries none of them.
      expect(runsOf(f, PAGE, 'dark').some((r) => r?.light || r?.veil), f.id).toBe(false)
    }
  })
})
