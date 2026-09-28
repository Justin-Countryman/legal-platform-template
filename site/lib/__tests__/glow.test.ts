// @vitest-environment node
//
// GRADIENT BLOOM'S GLOW (Phase 17D session 2, `[R-557]`; monorepo WS-V1-PHASE17D2-DESIGN §2.3). A dark run glows
// LIGHTER than its ground, as every studied dark-ground gradient does: in the accent's own hue on a near-neutral ground,
// in the ground's own hue on a colored one; lightness first; held to the photo band's pairs as drawn; only where it
// lifts. The color guarantee sweeps the glow for any input (`validateWcag`); this file holds its shape on the palettes an
// operator picks from.

import {describe, expect, it} from 'vitest'
import {converter, differenceCiede2000} from 'culori'
import {GLOW_DE, GLOW_LIFT, GLOW_MIN_DE, GLOW_MIN_LIFT, pairsCeiling, photoBandPairs, rampDrawnMax, resolvePalette, validateWcag} from '../designTokens'
import {PALETTE_PRESETS, presetInputs} from '../palettes'

const toOklch = converter('oklch')
const de = differenceCiede2000()
const hueGap = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d }

const CONTEXTS = [{id: '(placeholder)', inputs: {}}, ...PALETTE_PRESETS.map((p) => ({id: p.id, inputs: presetInputs(p)}))]

describe('the glow on every palette an operator picks from', () => {
  it('glows on nine presets and the placeholder, and not on the six whose dark ground is already as light as white text allows', () => {
    const glowing = CONTEXTS.filter(({inputs}) => resolvePalette(inputs).glowOk).map((c) => c.id)
    expect(glowing).toEqual(['(placeholder)', 'black-gold', 'navy-brass', 'navy-ice', 'navy-orange', 'navy-brick', 'ink-lavender', 'black-crimson', 'charcoal-coral', 'navy-rose'])
  })

  it.each(CONTEXTS)('$id: the accent’s hue on a near-neutral ground, the ground’s own on a colored one', ({inputs}) => {
    const p = resolvePalette(inputs)
    if (!p.glowOk) return
    const g = toOklch(p.tokens['--color-brand-dark'])!
    const w = toOklch(p.tokens['--color-glow'])!
    const a = toOklch(p.tokens['--color-accent'])!
    if ((g.c ?? 0) < 0.03) {
      if ((a.c ?? 0) >= 0.02) expect(hueGap(w.h!, a.h!)).toBeLessThan(15)
      else expect(w.c ?? 0).toBeLessThan(0.01)
    } else expect(hueGap(w.h!, g.h!)).toBeLessThan(15)
  })

  it.each(CONTEXTS)('$id: a lift, not a shift, and no louder than the strength cap', ({inputs}) => {
    const p = resolvePalette(inputs)
    const g = p.tokens['--color-brand-dark']
    const w = p.tokens['--color-glow']
    if (!p.glowOk) { expect(w).toBe(g); return }
    const lift = (toOklch(w)?.l ?? 0) - (toOklch(g)?.l ?? 0)
    expect(lift).toBeGreaterThanOrEqual(GLOW_MIN_LIFT)
    // The solve reaches GLOW_LIFT in OKLCH; the hex it rounds to may read a few thousandths over.
    expect(lift).toBeLessThanOrEqual(GLOW_LIFT + 0.005)
    expect(de(g, w)).toBeGreaterThanOrEqual(GLOW_MIN_DE)
    expect(de(g, w)).toBeLessThanOrEqual(GLOW_DE + 1e-6)
  })

  it.each(CONTEXTS)('$id: every level of the glow, drawn a level lighter, holds every pair a glowing band draws', ({inputs}) => {
    const p = resolvePalette(inputs)
    const t = p.tokens
    const ceiling = pairsCeiling(photoBandPairs(t), t['--color-action'], t['--color-action-state-cue-on-scrim'])
    expect(rampDrawnMax(t['--color-brand-dark'], t['--color-glow'])).toBeLessThanOrEqual(ceiling + 1e-12)
    expect(validateWcag(p).filter((r) => r.pair.includes('glow') && !r.passes)).toEqual([])
  })

  it('takes the ground’s hue on navy whatever the accent: a red accent leaves it as a grey one does', () => {
    const navy = {darkGround: '#1c2b4a', lightGround: '#ffffff'}
    expect(resolvePalette({...navy, accent: '#c8102e'}).tokens['--color-glow']).toBe(resolvePalette({...navy, accent: '#777777'}).tokens['--color-glow'])
  })

  it('is no glow where the lift is only a change of hue (a ground already near its lightest)', () => {
    // Teal & Mint: the first draft's solve moved it to #294d3e at the ground's own lightness, a hue shift (ADV-17D2-A, -B, -C).
    const p = resolvePalette(presetInputs(PALETTE_PRESETS.find((x) => x.id === 'teal-mint')!))
    expect(p.glowOk).toBe(false)
    expect(p.tokens['--color-glow']).toBe(p.tokens['--color-brand-dark'])
  })
})
