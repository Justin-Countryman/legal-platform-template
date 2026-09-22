// @vitest-environment node
//
// THE GRADIENT ON A DARK BAND (Phase 16F, `[R-502]`). A dark section's ground fades from
// `--color-brand-dark` into a deeper stop carrying the accent's hue. Two things are worth
// a test rather than a comment, and both were found by measuring rather than reasoning:
//
//   1. THE DEPTH IS PERCEPTUAL, NOT THE TEXTURE'S. The first derivation bound the stop to
//      the CIE L* step the light texture moves on the same palette. It produced a fade
//      measured at DeltaE2000 1.7 to 4.2 end to end, with the hue moving under 3 degrees
//      on 13 of 16 palettes -- a shade, not a second hue. A texture is a 4%-opacity
//      hairline; a ground fading across a whole band is not the same size of move.
//   2. THE AA LOOP MUST TEST THE RAMP. `textureOnDark`'s loop tests one blended color
//      because a texture IS one color. A gradient is every color between two, and WCAG
//      F83 measures text against the lowest-contrast part of what is behind it. With the
//      loop testing only the stop, 3 of 7,052 swept palettes failed AA at an INTERIOR
//      point while both endpoints passed.
//
// The colorGuarantee sweep covers "any input"; this file covers the shape.

import {describe, expect, it} from 'vitest'
import {converter, differenceCiede2000, formatHex, wcagContrast} from 'culori'
import fieldMap from '../../../studio/field-map.json'
import {GRADIENT_DEPTH_DE, resolvePalette, validateWcag} from '../designTokens'
import {SECTION_GRADIENTS, fadesDark, readGradient} from '../gradients'
import {PALETTE_PRESETS, presetInputs} from '../palettes'

const de = differenceCiede2000()
const toOklab = converter('oklab')
const contrast = (a: string, b: string) => (wcagContrast(a, b) as number | undefined) ?? 1

/** The ramp `linear-gradient(in oklab, a, b)` actually paints, at `t`. */
function rampAt(a0: string, b0: string, t: number): string {
  type Lab = {l: number; a: number; b: number}
  const a = toOklab(a0) as unknown as Lab
  const b = toOklab(b0) as unknown as Lab
  return formatHex({mode: 'oklab', l: a.l + (b.l - a.l) * t, a: a.a + (b.a - a.a) * t, b: a.b + (b.b - a.b) * t})
}

const CONTEXTS = [
  {id: '(placeholder)', inputs: {}},
  ...PALETTE_PRESETS.map((p) => ({id: p.id, inputs: presetInputs(p)})),
]

describe('the gradient library', () => {
  it('offers exactly the values the Studio offers', () => {
    const row = fieldMap.types.designSettings.fields.find((f) => f.path === 'sectionGradient')
    expect(row, 'sectionGradient is missing from the field map').toBeDefined()
    expect(row!.options!.list).toEqual([...SECTION_GRADIENTS])
  })

  it('reads a stored value the way the site reads it, and anything unknown as none', () => {
    expect(readGradient('deep')).toBe('deep')
    for (const v of ['none', '', 'DEEP', 'photo', null, undefined, 0, [], {}, true]) {
      expect(readGradient(v), String(v)).toBe('none')
    }
    expect(fadesDark('deep')).toBe(true)
    expect(fadesDark('none')).toBe(false)
    expect(fadesDark(undefined)).toBe(false)
  })
})

describe('the stop, on every shipped palette', () => {
  it.each(CONTEXTS)('$id holds AA at both ends AND everywhere between', ({inputs}) => {
    const {tokens} = resolvePalette(inputs)
    const dark = tokens['--color-brand-dark']
    const stop = tokens['--color-gradient-stop']
    const tiers = [
      tokens['--color-foreground-on-dark'], tokens['--color-foreground-muted-on-dark'],
      tokens['--color-foreground-subtle-on-dark'], tokens['--color-accent-on-dark'],
      tokens['--color-action-text-on-dark'],
    ]
    // 101 points, in the space the declaration names. The interior is sampled because
    // the minimum is NOT always an endpoint: WCAG relative luminance is not monotone
    // along a path that also moves hue.
    for (let i = 0; i <= 100; i++) {
      const at = rampAt(dark, stop, i / 100)
      for (const fg of tiers) expect(contrast(fg, at), `${fg} at t=${i / 100}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it.each(CONTEXTS)('$id fades no further than the depth asks', ({inputs}) => {
    const {tokens} = resolvePalette(inputs)
    // The depth is a CEILING, not a promise: a near-black ground has nowhere to go and
    // comes up short, which is correct and is why this is an upper bound.
    expect(de(tokens['--color-brand-dark'], tokens['--color-gradient-stop']))
      .toBeLessThanOrEqual(GRADIENT_DEPTH_DE + 0.5)
  })

  it('is deep enough to read as a second hue on a palette that has room', () => {
    // navy-orange is the fixture's own palette. The first derivation gave it dE 2.9,
    // which is inside the just-noticeable band for adjacent patches.
    const {tokens} = resolvePalette(presetInputs(PALETTE_PRESETS.find((p) => p.id === 'navy-orange')!))
    expect(de(tokens['--color-brand-dark'], tokens['--color-gradient-stop'])).toBeGreaterThan(8)
  })

  it('never goes lighter than the ground it fades from', () => {
    // An ink at a FIXED near-black lightness goes lighter than a near-black ground and
    // LOWERS contrast; deriving the ink from the ground is what prevents it.
    for (const {id, inputs} of CONTEXTS) {
      const {tokens} = resolvePalette(inputs)
      const tiers = [
        tokens['--color-foreground-on-dark'], tokens['--color-foreground-muted-on-dark'],
        tokens['--color-foreground-subtle-on-dark'], tokens['--color-accent-on-dark'],
        tokens['--color-action-text-on-dark'],
      ]
      const bare = Math.min(...tiers.map((c) => contrast(c, tokens['--color-brand-dark'])))
      const onStop = Math.min(...tiers.map((c) => contrast(c, tokens['--color-gradient-stop'])))
      expect(onStop, `${id}: the stop must not read worse than the bare ground`).toBeGreaterThanOrEqual(bare - 0.01)
    }
  })

  it('is a blocking pair in validateWcag, so colorGuarantee sweeps it for any input', () => {
    const pairs = validateWcag(resolvePalette({})).filter((r) => r.pair.includes('gradient'))
    expect(pairs.length).toBeGreaterThanOrEqual(10)
    expect(pairs.every((p) => p.blocking)).toBe(true)
    expect(pairs.some((p) => p.pair.includes('ramp')), 'the ramp itself must be swept, not only the stop').toBe(true)
  })
})
