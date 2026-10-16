import {describe, expect, it} from 'vitest'
import {render} from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import postcss from 'postcss'
import {wcagContrast as contrast} from 'culori'
import {TileFill, TileGlow} from '../silo/parts'
import {siloHover} from '@/lib/siloHover'
import {resolvePalette, tileComposite, validateWcag, TILE_FILL_MAX, TILE_GLOW_MAX, type ColorInputs} from '@/lib/designTokens'
import {PALETTE_PRESETS, presetInputs} from '@/lib/palettes'

// THE PRACTICE TILE'S FILL AND HOVER GLOW (monorepo backlog 381; 372 for the grounds this does not reach). A tile with no
// photograph draws its fill (the band's text color, 5% at its top corner fading to nothing) and, hovered under the Glow
// preset, the action color at 30% at that corner to 10% at the far one, under its label (foreground) and blurb (muted).
// No pair held that composite: over the plain dark band Teal & Mint's blurb measured 3.99:1 (Phase 17E), and over the
// light grounds six presets fell to 3.97 to 4.43; over 5,015 swept palettes the glow at 30% failed on about 70% of light
// grounds and 45% of dark ones, and the fill alone on 648 saturated bands. The engine now solves both per palette and per
// ground (light, dark, saturated): the highest whole percent at or under today's at which the tile's words keep 4.5:1 over
// every ground of that kind, the alpha rounded up a level as a browser may draw it; the drawn glow reads it, and
// validateWcag holds the composite, so `colorGuarantee.test.ts` sweeps it. Where today's values hold, nothing changes.

const CSS = fs.readFileSync(path.resolve(__dirname, '../../../app/globals.css'), 'utf8')
const preset = (id: string) => presetInputs(PALETTE_PRESETS.find((p) => p.id === id)!)
const classes = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

function seeded(n: number, seed: number): ColorInputs[] {
  let s = seed >>> 0
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32
  const hex = () => '#' + Math.floor(rnd() * 0x1000000).toString(16).padStart(6, '0')
  return Array.from({length: n}, () => ({darkGround: hex(), lightGround: hex(), accent: hex(), action: rnd() < 0.5 ? hex() : null}))
}

describe('backlog 381: the tile’s fill and glow are drawn at the engine’s values', () => {
  it('the fill and the glow read the cascade-aware percent, the glow’s far corner a third of its peak', () => {
    const fill = render(<TileFill />).container.firstElementChild!
    const glow = render(<TileGlow fx={siloHover(['glow'])} />).container.firstElementChild!
    expect(classes(fill)).toContain('tile-fill')
    expect(classes(glow)).toContain('tile-glow')
    expect(classes(glow)).toContain('group-hover:opacity-100')
    for (const el of [fill, glow]) expect(classes(el).some((c) => /^(from|to)-/.test(c)), 'no fixed stop left').toBe(false)
    const utility = (name: string) => {
      let body = ''
      postcss.parse(CSS).walkAtRules('utility', (at) => { if (at.params === name) at.walkDecls('background-image', (d) => { body = d.value }) })
      return body.replace(/\s+/g, ' ')
    }
    expect(utility('tile-fill')).toBe('linear-gradient(to bottom right in oklab, color-mix(in oklab, var(--color-foreground) var(--tile-fill), transparent), transparent)')
    expect(utility('tile-glow')).toBe('linear-gradient(to bottom right in oklab, color-mix(in oklab, --theme(--color-cue) var(--tile-glow), transparent), color-mix(in oklab, --theme(--color-cue) calc(var(--tile-glow) / 3), transparent))')
  })

  it('each cascade block points the two at its own ground’s values', () => {
    const block = (selector: string) => {
      const at = CSS.indexOf(`${selector} {`)
      expect(at, selector).toBeGreaterThan(-1)
      return CSS.slice(CSS.indexOf('{', at) + 1, CSS.indexOf('}', at))
    }
    for (const [selector, ground] of [['.bg-brand-dark,\n[data-ring-context="dark"]', 'dark'], ['[data-ring-context="light"]', 'light'], ['[data-ring-context="saturated"]', 'saturated']]) {
      expect(block(selector)).toMatch(new RegExp(`--tile-fill:\\s+var\\(--tile-fill-on-${ground}\\);`))
      expect(block(selector)).toMatch(new RegExp(`--tile-glow:\\s+var\\(--tile-glow-on-${ground}\\);`))
    }
  })

  it('the engine emits them, the page’s own at :root as the light ground’s', () => {
    const t = resolvePalette(preset('navy-brass')).tokens
    for (const ground of ['light', 'dark', 'saturated']) {
      expect(t[`--tile-fill-on-${ground}`]).toMatch(/^\d+%$/)
      expect(t[`--tile-glow-on-${ground}`]).toMatch(/^\d+%$/)
    }
    expect(t['--tile-fill']).toBe(t['--tile-fill-on-light'])
    expect(t['--tile-glow']).toBe(t['--tile-glow-on-light'])
  })
})

describe('backlog 381: the tile’s words hold under its fill and glow', () => {
  it('Teal & Mint on its dark band: the glow’s peak drops under 30%, and the blurb holds where it measured 3.99:1', () => {
    const t = resolvePalette(preset('teal-mint')).tokens
    const peak = parseInt(t['--tile-glow-on-dark'])
    expect(peak).toBeLessThan(TILE_GLOW_MAX)
    const drawn = tileComposite(t['--color-brand-dark'], t['--color-foreground-on-dark'], parseInt(t['--tile-fill-on-dark']), t['--color-action'], peak)
    expect(contrast(t['--color-foreground-muted-on-dark'], drawn)).toBeGreaterThanOrEqual(4.5)
    // Today's 30% is what failed.
    const today = tileComposite(t['--color-brand-dark'], t['--color-foreground-on-dark'], TILE_FILL_MAX, t['--color-action'], TILE_GLOW_MAX)
    expect(contrast(t['--color-foreground-muted-on-dark'], today)).toBeLessThan(4.5)
  })

  it('validateWcag holds the label and the blurb under the fill and the glow on every ground a plain band paints', () => {
    const pairs = validateWcag(resolvePalette(preset('navy-brass'))).filter((r) => r.pair.includes('practice tile')).map((r) => r.pair)
    for (const ground of ['background', 'hero-tint', 'muted', 'wash', 'section-texture', 'brand-dark', 'section-texture-dark', 'accent-fill']) {
      expect(pairs.some((p) => p.endsWith(`over ${ground}`)), ground).toBe(true)
    }
    for (const r of validateWcag(resolvePalette(preset('navy-brass'))).filter((x) => x.pair.includes('practice tile'))) expect(r.blocking, r.pair).toBe(true)
  })

  it('where today’s values hold, nothing changes: every preset keeps its fill, and its glow wherever 30% held', () => {
    for (const p of PALETTE_PRESETS) {
      const t = resolvePalette(presetInputs(p)).tokens
      expect(t['--tile-fill-on-light'], p.id).toBe(`${TILE_FILL_MAX}%`)
      expect(t['--tile-fill-on-dark'], p.id).toBe(`${TILE_FILL_MAX}%`)
    }
    // Measured on the presets before the solve: dark held 30% on all but Teal & Mint.
    const darkHeld = PALETTE_PRESETS.filter((p) => resolvePalette(presetInputs(p)).tokens['--tile-glow-on-dark'] === `${TILE_GLOW_MAX}%`).map((p) => p.id)
    expect(darkHeld).toHaveLength(14)
    expect(darkHeld).not.toContain('teal-mint')
  })

  it('every preset and 500 seeded palettes: every tile pair passes at the emitted values', () => {
    const failures: string[] = []
    for (const inputs of [...PALETTE_PRESETS.map(presetInputs), ...seeded(500, 381)]) {
      for (const r of validateWcag(resolvePalette(inputs))) {
        if (r.pair.includes('practice tile') && !r.passes) failures.push(`${JSON.stringify(inputs)} ${r.pair} = ${r.ratio}`)
      }
    }
    expect(failures.length, failures.slice(0, 10).join('\n')).toBe(0)
  })
})
