import {describe, it, expect} from 'vitest'
import {converter, differenceCiede2000} from 'culori'
import {COLOR_DEFAULTS, TINT_DE, heroTintOf, mutedOf, resolvePalette, validateWcag} from '../designTokens'
import {PALETTE_PRESETS, presetInputs} from '../palettes'

// The tint step (Phase 18 session D, monorepo WS-DESIGN-ENGINE-GAPS-DESIGN.md §16.3 row 6, §19).
//
// The tint is the second light ground: the light hero, a band stored `tint`, the light footer, a light interior page's
// header. Drawn at L −0.015 it stood ΔE2000 1.0 from the page on every preset, which nobody sees, so a page that used it
// still read as one light ground. On the study's rated law sites a page that carries two light grounds at L* 85 or lighter
// sets the second a median ΔE2000 2.7 from the first (quartiles 1.9 and 4.4, `light-grounds.txt`; the study counts two apart at 1.5). So the tint
// stands TINT_DE from its ground on every palette, at the ground's own hue, and never past the muted step, so no text
// tier moves on any palette: CC's value under `[R-503]`.

const de = differenceCiede2000()
const toOklch = converter('oklch')
const oklch = (hex: string) => toOklch(hex) as {l: number; c: number; h?: number}
const READS_APART = 1.5

const grounds = [
  COLOR_DEFAULTS.lightGround, '#fafafa', '#f7f7f7', '#f5eedc', '#faf6ee', '#fdfbf7', '#f4f6f8', '#eef2f5', '#f8f4f0', '#e9e9e9',
]

describe('the tint reads apart from the page', () => {
  it('stands TINT_DE from the light ground on the placeholder and every preset', () => {
    for (const inputs of [{}, ...PALETTE_PRESETS.map((p) => presetInputs(p))]) {
      const t = resolvePalette(inputs).tokens
      const d = de(t['--color-background'], t['--color-hero-tint'])
      expect(d, `${t['--color-background']} -> ${t['--color-hero-tint']}`).toBeGreaterThanOrEqual(READS_APART)
      expect(d).toBeGreaterThanOrEqual(TINT_DE - 0.05)
      expect(d).toBeLessThan(TINT_DE + 0.3)
    }
  })

  it('stands TINT_DE from any light ground an operator might type, on its own hue', () => {
    for (const g of grounds) {
      const tint = heroTintOf(g)
      expect(de(g, tint), `${g} -> ${tint}`).toBeGreaterThanOrEqual(TINT_DE - 0.05)
      expect(de(g, tint), `${g} -> ${tint}`).toBeLessThan(TINT_DE + 0.3)
      expect(oklch(tint).l, g).toBeLessThan(oklch(g).l)
      // Never darker than the muted step, the darkest light ground the text tiers are solved against.
      expect(oklch(tint).l, g).toBeGreaterThanOrEqual(oklch(mutedOf(g)).l - 1e-6)
      // A cream ground's tint stays cream: its hue within a few degrees (hex rounding moves a faint hue), never grey.
      const c = oklch(g).c
      if (c >= 0.01) {
        expect(Math.abs((((oklch(tint).h ?? 0) - (oklch(g).h ?? 0)) + 540) % 360 - 180), g).toBeLessThan(10)
        expect(oklch(tint).c, g).toBeGreaterThan(0.005)
      }
    }
  })

  it('every pair a light hero or a tint band draws still meets AA on every preset', () => {
    for (const inputs of [{}, ...PALETTE_PRESETS.map((p) => presetInputs(p))]) {
      const failing = validateWcag(resolvePalette(inputs)).filter((r) => r.pair.includes('hero-tint') && !r.passes)
      expect(failing.map((r) => r.pair)).toEqual([])
    }
  })
})
