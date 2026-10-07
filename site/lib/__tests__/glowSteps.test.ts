// @vitest-environment node
import fs from 'node:fs'
import path from 'node:path'
import {describe, expect, it} from 'vitest'
import {wcagContrast} from 'culori'
import {BACKGROUNDS, backgroundById} from '../backgrounds'
import {photoBandPairs, resolvePalette} from '../designTokens'
import {PALETTE_PRESETS, presetInputs} from '../palettes'

// THE GLOW'S SHAPES AND TINT (monorepo WS-PREMIUM-PACKAGE-DESIGN §7.2 amendment 16, `[R-641]`; nguyenandmaliklaw's gold
// corner glows, lovellfirm's centered one). Three new steps of the Background theme's Glow family, each unpassed until
// his eye; the stored `glow` keeps reading as before, under its old name.

const CSS = fs.readFileSync(path.resolve(__dirname, '../../app/globals.css'), 'utf8')

describe('the glow steps', () => {
  it('keep `glow` as it was and add the corner, the center and the accent, unpassed', () => {
    const glow = BACKGROUNDS.filter((b) => b.family === 'glow')
    expect(glow.map((b) => b.id)).toEqual(['glow', 'glow.corner', 'glow.center', 'glow.accent'])
    expect(backgroundById('glow')!.name).toBe('Glow')
    expect(backgroundById('glow')!.on.glowShape).toBeUndefined()
    expect(glow.every((b) => b.passed === false)).toBe(true)
    expect(backgroundById('glow.corner')!.on).toMatchObject({dark: 'glow', glowShape: 'corner'})
    expect(backgroundById('glow.accent')!.on).toMatchObject({dark: 'glow', glowTint: 'accent'})
  })

  it('the accent glow is solved under the glow band’s pairs, only where the glow holds', () => {
    let drawn = 0
    for (const p of PALETTE_PRESETS) {
      expect(resolvePalette(presetInputs(p)).tokens['--color-glow-accent'], p.id).toBeUndefined()
      const r = resolvePalette(presetInputs(p), {glowTint: 'accent'})
      if (!r.glowOk) continue
      drawn++
      for (const [fg, min] of photoBandPairs(r.tokens)) expect(wcagContrast(fg, r.tokens['--color-glow-accent']) as number, `${p.id}`).toBeGreaterThanOrEqual(min)
    }
    expect(drawn).toBeGreaterThan(0)
  })

  it('the shapes draw one radial per band in the solved color, and stand down under forced colors, print and more contrast', () => {
    expect(CSS).toMatch(/\.band-glow\.glow-corner \{\s*background-image: radial-gradient\(ellipse 55% 70% at 100% 100%, var\(--glow-color, var\(--color-glow\)\)/)
    expect(CSS).toMatch(/\.band-glow\.glow-center \{\s*background-image: radial-gradient\(/)
    expect(CSS).toContain('[data-glow-tint="accent"] { --glow-color: var(--color-glow-accent); }')
    for (const media of ['forced-colors: active', 'print', 'prefers-contrast: more']) {
      expect(CSS, media).toContain(`.band-glow, .band-glow:is(.glow-corner, .glow-center), .band-glow.glow-corner.glow-from-left { background-image: none; }`)
    }
  })
})
