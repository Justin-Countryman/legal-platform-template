import {describe, expect, it} from 'vitest'
import {differenceCiede2000} from 'culori'
import {CLOSE_APART_DE, FLOWS, bridgeOf, chromeSchemes, closeOf, flowById, saturatedFillOk, type Close, type FlowRules} from '../flows'
import {resolvePalette, type ColorInputs} from '../designTokens'
import {PALETTE_PRESETS, presetInputs} from '../palettes'
import type {VisibleGround} from '../sectionSurface'

// THE CLOSE NEVER TAKES THE FOOTER'S COLOR (`[R-597]`, `[R-603]`; monorepo WS-V1-PHASE18-TEMPLATE-FIXES-DESIGN §9).
//
// Justin, of a throwaway at Quiet: "The CTA section is usually the same as the footer which looks weird", then, of the
// same page in black, white and grey: "again the final CTA should alwasy be a different color than the footer. Needs to
// be a rule". At `c71cb00`, 10 of the 13 passed steps closed dark over a dark footer (0 apart), Editorial's close sat
// 1.0 from its light footer and Soft wash's 6.5. The measure is what the visitor sees: the colors the two bands draw on
// the resolved palette, never the stored hexes, and at least ΔE2000 20 apart (the gate the platform already uses for a
// fill to read as its own color). A photograph close draws the scrim (the dark ground, capped at L 0.20) at 80% over a
// grey window, which measures 0.7 to 18.4 from a dark footer on every preset: never apart from one, always from a light.

const deltaE = differenceCiede2000()

/** What a close draws, as a color; null for a photograph, which is measured by its footer alone. */
function drawn(close: Close, t: Record<string, string>): string | null {
  switch (close) {
    case 'dark': return t['--color-brand-dark']
    case 'muted': return t['--color-muted']
    case 'wash': return t['--color-wash']
    case 'saturated': return t['--color-accent']
    case 'photo': return null
  }
}
const footerDrawn = (footer: 'light' | 'dark', t: Record<string, string>) => (footer === 'dark' ? t['--color-brand-dark'] : t['--color-hero-tint'])

function apart(close: Close, footer: 'light' | 'dark', t: Record<string, string>): boolean {
  const c = drawn(close, t)
  if (c === null) return footer === 'light'
  return deltaE(c, footerDrawn(footer, t)) >= CLOSE_APART_DE
}

function seeded(n: number, seed: number): ColorInputs[] {
  let s = seed >>> 0
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32
  const hex = () => '#' + Math.floor(rnd() * 0x1000000).toString(16).padStart(6, '0')
  return Array.from({length: n}, () => ({darkGround: hex(), lightGround: hex(), accent: hex(), action: rnd() < 0.5 ? hex() : null}))
}

const PALETTES: Array<[string, ColorInputs]> = [
  ...PALETTE_PRESETS.map((p) => [p.id, presetInputs(p)] as [string, ColorInputs]),
  ['placeholder', {}],
  ...seeded(1000, 20260930).map((p, i) => [`seed#${i}`, p] as [string, ColorInputs]),
]
const ROSTER: FlowRules[] = [...FLOWS, bridgeOf({sectionJoin: 'angled'})]
const ABOVE: Array<VisibleGround | null> = [null, 'light', 'dark', 'saturated', 'image', 'wash', 'muted']
const STORED: Array<string | undefined> = [undefined, 'light', 'dark', 'bogus']

describe('the close stands apart from the footer, on every theme and every palette', () => {
  it('holds for every step, every preset, the placeholder and 1,000 seeded palettes, with and without a hero photograph, and the footer as the theme has it or as stored', () => {
    const bad: string[] = []
    for (const [name, colors] of PALETTES) {
      const t = resolvePalette(colors).tokens
      for (const flow of ROSTER) {
        for (const stored of STORED) {
          const footer = chromeSchemes(flow, null, {footerScheme: stored}, null).footer
          for (const heroPhoto of [false, true]) {
            for (const above of ABOVE) {
              const close = closeOf(flow, {footer, above, heroPhoto, colors})
              if (!apart(close, footer, t)) bad.push(`${name} ${flow.id} footer=${footer}(${stored}) photo=${heroPhoto} above=${above}: ${close}`)
            }
          }
        }
      }
    }
    expect(bad.length, `${bad.length} closes meet the footer. First:\n${bad.slice(0, 12).join('\n')}`).toBe(0)
  }, 120_000)

  it('never draws the fill a palette refuses, nor a photograph the site has not approved', () => {
    for (const [name, colors] of PALETTES.slice(0, 200)) {
      for (const flow of ROSTER) {
        for (const footer of ['light', 'dark'] as const) {
          for (const above of ABOVE) {
            const close = closeOf(flow, {footer, above, heroPhoto: false, colors})
            expect(close, `${name} ${flow.id}`).not.toBe('photo')
            if (!saturatedFillOk(colors)) expect(close, `${name} ${flow.id}`).not.toBe('saturated')
          }
        }
      }
    }
  })
})

describe('each family ends as its table says (CC’s values, shown to Justin before they ship)', () => {
  const navyBrass = presetInputs(PALETTE_PRESETS.find((p) => p.id === 'navy-brass')!)
  const end = (id: string, above: VisibleGround | null, opts: {stored?: string; heroPhoto?: boolean; colors?: ColorInputs} = {}) => {
    const flow = flowById(id)!
    const footer = chromeSchemes(flow, null, {footerScheme: opts.stored}, null).footer
    return {footer, close: closeOf(flow, {footer, above, heroPhoto: !!opts.heroPhoto, colors: opts.colors ?? navyBrass})}
  }

  it('Quiet and Ribbon rhythm keep their dark close and end on a light footer; a stored dark footer gives Quiet the accent', () => {
    expect(end('quiet.mostlyLight', 'light')).toEqual({footer: 'light', close: 'dark'})
    expect(end('ribbonRhythm.mostlyLight', 'saturated')).toEqual({footer: 'light', close: 'dark'})
    expect(end('quiet.mostlyLight', 'light', {stored: 'dark'})).toEqual({footer: 'dark', close: 'saturated'})
    // The black and white wireframe has no accent: the light step, apart from the dark footer.
    expect(end('quiet.mostlyLight', 'light', {stored: 'dark', colors: {}})).toEqual({footer: 'dark', close: 'muted'})
  })

  it('the balanced and darker families keep the dark footer: the light step under a dark band, the accent under a light one', () => {
    for (const id of ['alternating.balanced', 'cutBlocks.balanced', 'cutBlocks.mostlyDark', 'wedges.balanced', 'floatingPanels.balanced', 'floatingPanels.mostlyDark']) {
      expect(end(id, 'dark'), id).toEqual({footer: 'dark', close: 'muted'})
      expect(end(id, 'light'), id).toEqual({footer: 'dark', close: 'saturated'})
    }
  })

  it('Type on black closes on the accent', () => {
    expect(end('typeOnBlack.allDark', 'dark')).toEqual({footer: 'dark', close: 'saturated'})
  })

  it('Gradient bloom closes dark over its light footer, lit as the run\u2019s last band (the roster eye of 2026-10-03, [R-631])', () => {
    // Its glow carries through to the close, so a dark close under a dark last band stands: it does not melt into the
    // run, its glow peaks in its own middle. Under a stored dark footer the ruling holds and the close takes the accent;
    // on a palette with no room to glow the close is held off the run above as any other theme's.
    expect(end('gradientBloom.mostlyDark', 'dark')).toEqual({footer: 'light', close: 'dark'})
    expect(end('gradientBloom.mostlyDark', 'dark', {stored: 'dark'})).toEqual({footer: 'dark', close: 'saturated'})
    // Burgundy & Gold is one of the six presets whose dark ground has no room to glow (`glowFillOk`).
    expect(end('gradientBloom.mostlyDark', 'dark', {colors: presetInputs(PALETTE_PRESETS.find((p) => p.id === 'burgundy-gold')!)}).close).not.toBe('dark')
  })

  it('Editorial and Soft wash close dark over their light footer', () => {
    expect(end('editorial.mostlyLight', 'light')).toEqual({footer: 'light', close: 'dark'})
    expect(end('softWash.mostlyLight', 'light')).toEqual({footer: 'light', close: 'dark'})
    // Under a stored dark footer Soft wash's own close stands, its wash 6.5 from the light band above it.
    expect(end('softWash.mostlyLight', 'light', {stored: 'dark'})).toEqual({footer: 'dark', close: 'wash'})
  })

  it('Photo scrims keeps its photograph close, over a light footer; without the photograph it closes dark', () => {
    expect(end('photoScrims.mostlyDark', 'dark', {heroPhoto: true})).toEqual({footer: 'light', close: 'photo'})
    expect(end('photoScrims.mostlyDark', 'dark')).toEqual({footer: 'light', close: 'dark'})
  })
})
