// @vitest-environment node
//
// The cases `scripts/ci/texture-pixels.mjs` renders (Phase 17C session 3, `[R-538]`, `[R-546]`; monorepo
// WS-V1-PHASE17C3-DESIGN §2.3). `validateWcag` holds every text tier to 4.5:1 on the texture's blend
// as modelled; the pixel script holds what a browser actually draws against that model. It needs the
// engine's own numbers, so this test writes them: every texture tile at every strength with the scale
// it renders at, and the palettes where a level of 255 matters (the presets, a palette the model
// itself once failed, and the near-threshold palettes of two seeded sweeps), each with its light and
// dark texture blends and the text tiers that sit on them. A change to a tile, a render scale or the
// engine moves this file; read its diff.

import {describe, expect, it} from 'vitest'
import {existsSync} from 'node:fs'
import {resolve} from 'node:path'
import {converter, formatHex, wcagContrast} from 'culori'
import {resolvePalette, SECTION_TEXTURE_MAP, SECTION_TEXTURE_OPACITY, type ColorInputs} from '../designTokens'
import {PALETTE_PRESETS, presetInputs} from '../palettes'
import {nearBlack} from './sweeps'

const toRgb = converter('rgb')
const toLab = converter('lab')
const blend = (g0: string, k0: string, a: number) => {
  const g = toRgb(g0) as unknown as {r: number; g: number; b: number}
  const k = toRgb(k0) as unknown as {r: number; g: number; b: number}
  const m = (x: number, y: number) => x * (1 - a) + y * a
  return formatHex({mode: 'rgb', r: m(g.r, k.r), g: m(g.g, k.g), b: m(g.b, k.b)})
}
const contrast = (a: string, b: string) => (wcagContrast(a, b) as number | undefined) ?? 1
const lightness = (hex: string) => (toLab(hex) as unknown as {l: number}).l

function seeded(n: number, seed: number): ColorInputs[] {
  let s = seed >>> 0
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32
  const hex = () => '#' + Math.floor(rnd() * 0x1000000).toString(16).padStart(6, '0')
  return Array.from({length: n}, () => ({darkGround: hex(), lightGround: hex(), accent: hex(), action: rnd() < 0.5 ? hex() : null}))
}

const LIGHT_TIERS = ['--color-foreground', '--color-foreground-muted', '--color-foreground-subtle', '--color-accent-text', '--color-action-text', '--color-action-text-hover']
const DARK_TIERS = ['--color-foreground-on-dark', '--color-foreground-muted-on-dark', '--color-foreground-subtle-on-dark', '--color-accent-on-dark', '--color-action-text-on-dark']

function caseOf(label: string, inputs: ColorInputs) {
  const t = resolvePalette(inputs).tokens as Record<string, string>
  const dark = {
    ground: t['--color-brand-dark'],
    ink: t['--color-texture-ink-on-dark'],
    opacity: Number(t['--section-texture-opacity-on-dark']),
    // The opacity a lighter ink never renders above (WebKit's whole alpha steps; `resolvePalette`).
    cushion: Number(t['--section-texture-opacity-on-dark-cushion']),
    tiers: DARK_TIERS.map((k) => t[k]),
  }
  const light = {
    ground: t['--color-background'], ink: t['--color-brand-dark'], opacity: SECTION_TEXTURE_OPACITY,
    // The opacity the light layer never renders above (`lightTextureCap`; WebKit on Linux, PR #52's CI).
    cap: Number(t['--section-texture-opacity-on-light-cap']),
    tiers: LIGHT_TIERS.map((k) => t[k]),
  }
  return {
    label,
    light,
    // A black ink moves away from light text; only a lighter ink can draw toward it.
    dark: {...dark, lighterInk: lightness(dark.ink) > lightness(dark.ground)},
    lightMin: Math.min(...light.tiers.map((c) => contrast(c, blend(light.ground, light.ink, light.opacity)))),
    darkMin: Math.min(...dark.tiers.map((c) => contrast(c, blend(dark.ground, dark.ink, dark.opacity)))),
  }
}

/** Near the threshold: some tier within 0.1 of 4.5:1 on the light blend, or on a lighter-ink dark blend. */
const near = (k: ReturnType<typeof caseOf>) => k.lightMin < 4.6 || (k.dark.lighterInk && k.darkMin < 4.6)

function cases() {
  const palettes = [
    ...PALETTE_PRESETS.map((p) => caseOf(p.id, presetInputs(p))),
    // ADV-17C3-B's palette, which the model itself once failed on the light texture blend.
    caseOf('hole', {darkGround: '#0d0924', lightGround: '#fc58fa', accent: '#ed56ce', action: '#a157a1'}),
    caseOf('black-c8102e', {darkGround: '#000000', accent: '#c8102e'}),
    // ADV-17C3-PRB's WebKit case: WebKit drew #06131d over a model of #06121d.
    caseOf('black-crimson-000d18', {...presetInputs(PALETTE_PRESETS.find((p) => p.id === 'black-crimson')!), darkGround: '#000d18'}),
    ...([[20260916, 5000], [7, 20000]] as const).flatMap(([seed, n]) =>
      seeded(n, seed).map((inputs, i) => caseOf(`s${seed}#${i}`, inputs)).filter(near)),
    // The 200 near-black palettes nearest the threshold (a lighter ink's blend, or the light one).
    ...nearBlack(4000, 17).map((inputs, i) => caseOf(`nb17#${i}`, inputs)).filter(near)
      .sort((a, b) => Math.min(a.lightMin, a.dark.lighterInk ? a.darkMin : 99) - Math.min(b.lightMin, b.dark.lighterInk ? b.darkMin : 99)).slice(0, 200),
  ].map(({label, light, dark}) => ({label, light, dark}))
  // Every tile at both strengths, with its render scale: the light layer always renders under the sweep;
  // a dark layer only where its ink is lighter than the ground, which is the only dark case rendered.
  const tiles = [
    ...Object.entries(SECTION_TEXTURE_MAP).flatMap(([family, t]) => (['quiet', 'strong'] as const).map((strength) => ({
      family, strength, image: strength === 'strong' ? t.strong : t.image, size: t.size, render: {light: t.render, dark: t.render},
    }))),
    // The ghost: one solid mark in the texture's ink, at 0.9 of the swept opacity (`decor-ghost-on-*`).
    {family: 'ghost', strength: 'solid', image: 'linear-gradient(currentColor,currentColor)', size: 'auto', render: {light: 0.9, dark: 0.9}},
  ]
  return {method: 'every tile at every strength with its render scale, over the presets and the near-threshold palettes; written by lib/__tests__/textureCases.test.ts, rendered by scripts/ci/texture-pixels.mjs', tiles, palettes}
}

// The cases live beside the script that reads them, under `scripts/ci/`, which the press prunes from a
// client's tree; there this test skips by name (`[R-175]`).
const CI = resolve(__dirname, '../../scripts/ci')

describe('scripts/ci/__snapshots__/texture-cases.json', () => {
  it.skipIf(!existsSync(CI))('is what the engine says (skipped on a client tree: scripts/ci is pruned)', async () => {
    const c = cases()
    expect(c.palettes.length).toBeGreaterThan(100)
    await expect(JSON.stringify(c) + '\n').toMatchFileSnapshot('../../scripts/ci/__snapshots__/texture-cases.json')
  }, 180_000)
})
