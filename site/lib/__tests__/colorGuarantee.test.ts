// @vitest-environment node
//
// THE COLOR GUARANTEE. Justin, 2026-09-16: "we need to ensure the colors are
// 100% a11y", and when accessibility conflicts with "nothing changes", it wins.
// So "every blocking color pair meets WCAG 2.2 AA for ANY hex an operator types
// into ANY role" is a tested claim rather than a promise, and a failure prints the
// exact input that reproduces it.
//
// The pair list is validateWcag's blocking set, which is the token-level half of
// the 95 rendered pairs the Phase 14 accessibility audit enumerated
// (WS-V1-PHASE14-DESIGN §7 amendments 19 to 24). The component-level half (a light
// card inside a dark band, and so on) is held by component tests, because no
// color input can move it.
//
// Two generators, both deterministic, so a red run reproduces anywhere:
//   - an OKLCH grid (L by 0.05, C by 0.07, hue by 30 degrees, gamut-mapped), swept
//     one role at a time with the other roles at the placeholder default and at two
//     presets that stress the rules (a cream ground; the most chromatic accent);
//   - 5,000 seeded palettes with all four roles random at once.
// The prototype also ran a 636,056-hex lattice per role offline with no failure;
// that is too slow for CI and is recorded in the design record, not repeated here.

import {describe, expect, it} from 'vitest'
import {converter, clampChroma, formatHex} from 'culori'
import {lightTextureCap, parseHexInput, resolvePalette, SECTION_TEXTURE_OPACITY, validateWcag, type ColorInputs} from '../designTokens'
import {PALETTE_PRESETS, presetInputs} from '../palettes'
import before from './fixtures/color-tokens-before-phase14.json'
import {nearBlack} from './sweeps'

const toOklch = converter('oklch')
const lightness = (hex: string) => (toOklch(hex)?.l as number | undefined) ?? 0

const ROLES = ['darkGround', 'lightGround', 'accent', 'action'] as const
const preset = (id: string) => presetInputs(PALETTE_PRESETS.find((p) => p.id === id)!)
const CONTEXTS: Record<string, ColorInputs> = {
  placeholder: {},
  'navy-brass': preset('navy-brass'),
  'black-crimson': preset('black-crimson'),
}

function grid(): string[] {
  const seen = new Set<string>()
  for (let li = 0; li <= 20; li++) {
    for (let ci = 0; ci <= 5; ci++) {
      for (let h = 0; h < 360; h += 30) {
        seen.add(formatHex(clampChroma({mode: 'oklch', l: li * 0.05, c: ci * 0.07, h}, 'oklch')))
      }
    }
  }
  return [...seen]
}

function seeded(n: number, seed: number): ColorInputs[] {
  let s = seed >>> 0
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32
  const hex = () => '#' + Math.floor(rnd() * 0x1000000).toString(16).padStart(6, '0')
  return Array.from({length: n}, () => ({darkGround: hex(), lightGround: hex(), accent: hex(), action: rnd() < 0.5 ? hex() : null}))
}

function failures(label: string, inputs: ColorInputs): string[] {
  return validateWcag(resolvePalette(inputs))
    .filter((r) => r.blocking && !r.passes)
    .map((r) => `${label} ${JSON.stringify(inputs)}: ${r.pair} = ${r.ratio} < ${r.min}`)
}

function expectNone(found: string[]) {
  expect(found.length, `${found.length} failing pairs. First:\n${found.slice(0, 20).join('\n')}`).toBe(0)
}

describe('color guarantee: every blocking pair passes for any operator input', () => {
  it('each role alone over the OKLCH grid, at the placeholder and two stress presets', () => {
    const found: string[] = []
    for (const [context, base] of Object.entries(CONTEXTS)) {
      for (const role of ROLES) {
        for (const hex of grid()) found.push(...failures(`${context}/${role}`, {...base, [role]: hex}))
      }
    }
    expectNone(found)
  }, 60_000)

  it('all four roles at once, 5,000 seeded palettes', () => {
    expectNone(seeded(5000, 20260916).flatMap((inputs, i) => failures(`sample#${i}`, inputs)))
  }, 60_000)

  it('the placeholder default, the migrated fixture and every preset', () => {
    const named: Record<string, ColorInputs> = {placeholder: {}, editedAccent: {accent: '#a12a2f'}}
    for (const p of PALETTE_PRESETS) named[p.id] = presetInputs(p)
    expectNone(Object.entries(named).flatMap(([name, inputs]) => failures(name, inputs)))
  })

  // Phase 17C session 3: a palette the light-tier solve once left at 4.48:1 on the texture's blend,
  // because the texture was checked but not solved against (ADV-17C3-B). The solve takes the texture's
  // blend as a ground of its own now; every other palette resolves exactly as before (record §8).
  it('the texture blend is a ground the light tiers are solved against, not only checked on', () => {
    expectNone(failures('texture-hole', {darkGround: '#0d0924', lightGround: '#fc58fa', accent: '#ed56ce', action: '#a157a1'}))
    // Near-black grounds with saturated accents: 35 of 24,066 failed on the texture's blend before the
    // solve took it as a ground (ADV-17C3-PRB), and the uniform sweeps above never generate them.
    expectNone(nearBlack(5000, 17).flatMap((inputs, i) => failures(`near-black#${i}`, inputs)))
  }, 60_000)

  it('the light texture never renders above the step a rounding-up, truncating engine draws within the swept blend', () => {
    // WebKit on Linux (PR #52's CI) rounds a layer's opacity up to a whole 1/255 step and truncates the blend;
    // under that model, at the cap's step, the drawn light texture is no further from the ground than the
    // blend the text tiers are solved against. The presets take step 9 of 255, 0.4 of a step under it.
    const channels = (hex: string) => { const c = converter('rgb')(hex) as unknown as {r: number; g: number; b: number}; return [c.r, c.g, c.b].map((v) => Math.round(v * 255)) }
    const decode = (v: number) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }
    const lum = (c: number[]) => 0.2126 * decode(c[0]) + 0.7152 * decode(c[1]) + 0.0722 * decode(c[2])
    const within = (inputs: ColorInputs) => {
      const t = resolvePalette(inputs).tokens
      const g = channels(t['--color-background']), k = channels(t['--color-brand-dark'])
      const cap = Number(t['--section-texture-opacity-on-light-cap'])
      const opacity = Math.min(SECTION_TEXTURE_OPACITY * 0.9, cap)
      const step = Math.ceil(opacity * 255 - 1e-9)
      const drawn = g.map((v, i) => Math.floor(v + ((k[i] - v) * step) / 255))
      const model = g.map((v, i) => v * (1 - SECTION_TEXTURE_OPACITY) + k[i] * SECTION_TEXTURE_OPACITY)
      return Math.abs(lum(drawn) - lum(g)) <= Math.abs(lum(model) - lum(g)) + 1e-12
    }
    for (const p of PALETTE_PRESETS) {
      expect(within(presetInputs(p)), p.id).toBe(true)
      expect(Number(resolvePalette(presetInputs(p)).tokens['--section-texture-opacity-on-light-cap']), p.id).toBeGreaterThan(0.03)
    }
    expect(nearBlack(2000, 17).filter((inputs) => !within(inputs))).toEqual([])
    expect(lightTextureCap('#ffffff', '#13294b')).toBe(0.03373)
  })

  it('the render margin reaches a dark band only where its ink is lighter than the ground', () => {
    // Every preset solves a black ink, which only raises contrast, so its dark bands render as solved.
    for (const p of PALETTE_PRESETS) expect(resolvePalette(presetInputs(p)).tokens['--section-texture-dark-margin'], p.id).toBe('0')
    // A black ground can go no darker, so its ink is the on-dark text color, lighter than the ground.
    expect(resolvePalette({darkGround: '#000000', accent: '#c8102e'}).tokens['--section-texture-dark-margin']).toBe('1')
  })

  it('accent-text keeps the accent: it reaches its ratio by stepping, never by falling back to brand-dark', () => {
    const fellBack = grid().filter((hex) => {
      const t = resolvePalette({accent: hex}).tokens
      return t['--color-accent-text'] === t['--color-brand-dark'] && t['--color-accent'] !== t['--color-brand-dark']
    })
    expect(fellBack).toEqual([])
  }, 60_000)

  it('the light text hierarchy survives: subtle stays at least 0.05 L above muted on every accepted light ground', () => {
    const collapsed = grid().flatMap((hex) => {
      const t = resolvePalette({lightGround: hex}).tokens
      const gap = lightness(t['--color-foreground-subtle']) - lightness(t['--color-foreground-muted'])
      return gap < 0.049 ? [`${hex}: subtle ${t['--color-foreground-subtle']} muted ${t['--color-foreground-muted']} gap ${gap.toFixed(3)}`] : []
    })
    expect(collapsed).toEqual([])
  }, 60_000)

  it('an input that is not #rrggbb is absent, so a mistyped hex never reaches the page', () => {
    const base = resolvePalette({}).tokens
    for (const bad of ['', '   ', '#12345', 'navy', ' #141414', null, undefined]) {
      expect(parseHexInput(bad)).toBeNull()
      expect(resolvePalette({darkGround: bad, lightGround: bad, accent: bad, action: bad}).tokens).toEqual(base)
    }
  })
})

// ─── What moved, against the engine this phase replaced ──────────────────────
// fixtures/color-tokens-before-phase14.json is the old engine's output, captured
// as this PR's first commit. Every token an existing site renders is compared, not
// sampled. A token may move only where a pair it belongs to failed WCAG 2.2 AA
// under the old engine, and the moved set is named, so a change to the rules that
// moves anything else is a red test, not a silent restyle.

const EMITTED_AND_KEPT = (tokens: Record<string, string>) =>
  Object.keys(tokens).filter((k) => !k.startsWith('--role-'))

function moved(name: 'placeholder' | 'editedAccent' | 'absent', inputs: ColorInputs) {
  const old = before[name] as Record<string, string>
  const now = resolvePalette(inputs).tokens
  return EMITTED_AND_KEPT(old)
    .filter((k) => now[k] !== old[k])
    .map((k) => `${k} ${old[k]} -> ${now[k]}`)
    .sort()
}

// Stars are one fixed gold on every site since Phase 16A (`[R-474]`, Justin
// 2026-09-18), so the fill and its derived outlines move on every palette: the
// outline is the gold darkened at its own hue until the shape holds 3:1.
const STARS_TO_GOLD = [
  '--color-star-fill',
  '--color-star-outline',
  '--color-star-outline-on-dark',
]

describe('what existing sites see', () => {
  it('every built client (the placeholder state): the two tokens that failed WCAG move, and the stars turn gold', () => {
    // #8f8f8f measured 3.23:1 on white and 2.97:1 on muted; #666666 on #141414
    // measured 3.21:1. Both are text, so both need 4.5:1.
    expect(moved('placeholder', {})).toEqual([
      '--color-action-text-on-dark #666666 -> #838383',
      '--color-foreground-subtle #8f8f8f -> #707070',
      '--color-star-fill #666666 -> #f5b301',
      '--color-star-outline #666666 -> #c08000',
      '--color-star-outline-on-dark #666666 -> #f5b301',
    ])
  })

  it('the fixture after its migration: the pink muted surface goes, plus the same two fixes and the gold stars', () => {
    expect(moved('editedAccent', {accent: '#a12a2f'})).toEqual([
      '--color-action-text-on-dark #a12a2f -> #d15756',
      '--color-foreground-subtle #8f8f8f -> #707070',
      '--color-muted #ffece9 -> #f5f5f5',
      '--color-star-fill #a12a2f -> #f5b301',
      '--color-star-outline #a12a2f -> #c08000',
      '--color-star-outline-on-dark #ffbbb6 -> #f5b301',
    ])
  })

  it('a dataset with no color fields at all now renders like every built client, in greys', () => {
    // Only the CI stub and the seed-bootstrap scratch dataset are in this state.
    // Its moves take it to the placeholder render, and every value stays achromatic.
    const now = resolvePalette({}).tokens
    for (const line of moved('absent', {})) {
      const token = line.split(' ')[0]
      const value = now[token]
      if (!value.startsWith('#') || STARS_TO_GOLD.includes(token)) continue
      expect((toOklch(value)?.c as number | undefined) ?? 0, `${line} should stay grey`).toBeLessThan(0.002)
    }
  })

  it('no --role-* token is emitted any more', () => {
    // Every --role-* token was a mirror of a --color-* token; no stylesheet or
    // component referenced one (grep at c5b9a2b). The resolved palette object is
    // the internal layer now.
    expect(Object.keys(resolvePalette({}).tokens).some((k) => k.startsWith('--role-'))).toBe(false)
  })
})
