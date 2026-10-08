// @vitest-environment node
//
// The cases `scripts/ci/ramp-pixels.mjs` draws (Phase 17D session 2, `[R-553]`; monorepo WS-V1-PHASE17D2-DESIGN §2.2).
// `validateWcag` holds the gradient's ramp as drawn in a MODEL: every level of it a level of 255 lighter in every
// channel, under one luminance ceiling (the lightest a dark ground may be for every on-dark pair to hold) and no
// lighter than the ground. The pixel script holds what the headless shell, full Chromium and WebKit actually draw
// against that ceiling. It needs the engine's numbers, so this test writes them: the presets, the placeholder, the
// grounds with no level below them (a flat ramp), and the palettes of two seeded sweeps whose ramp comes nearest its
// ceiling. A change to the engine moves this file; read its diff.

import {describe, expect, it} from 'vitest'
import {existsSync} from 'node:fs'
import {resolve} from 'node:path'
import {converter} from 'culori'
import {onDarkPairs, pairsCeiling, photoBandPairs, rampDrawnMax, resolvePalette, type ColorInputs} from '../designTokens'
import {PALETTE_PRESETS, presetInputs} from '../palettes'
import {nearBlack} from './sweeps'

const toRgb = converter('rgb')
const LUM = (hex: string) => {
  const c = toRgb(hex) as unknown as {r: number; g: number; b: number}
  const f = (v: number) => { const x = Math.round(v * 255) / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b)
}

function seeded(n: number, seed: number): ColorInputs[] {
  let s = seed >>> 0
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32
  const hex = () => '#' + Math.floor(rnd() * 0x1000000).toString(16).padStart(6, '0')
  return Array.from({length: n}, () => ({darkGround: hex(), lightGround: hex(), accent: hex(), action: rnd() < 0.5 ? hex() : null}))
}

/** One ramp: its ground, its two ends, the ceiling no pixel may pass (the lower of the ground's luminance and the
 *  pairs'), and the model's own lightest drawn point, for the margin. */
function bridgeCase(label: string, inputs: ColorInputs) {
  const t = resolvePalette(inputs).tokens
  const ground = t['--color-brand-dark']
  const ceiling = Math.min(LUM(ground), pairsCeiling(onDarkPairs(t), t['--color-action'], t['--color-action-state-cue-on-dark']))
  const model = rampDrawnMax(t['--color-gradient-start'], t['--color-gradient-stop'])
  return {label, ramp: 'bridge', ground, from: t['--color-gradient-start'], to: t['--color-gradient-stop'], ceiling, model}
}

/** Gradient bloom's glow (`[R-557]`): the ground to the glow and back, under the side layer, against the photo band's
 *  ceiling, where the palette has room. */
function glowCase(label: string, inputs: ColorInputs) {
  const p = resolvePalette(inputs)
  const t = p.tokens
  const ground = t['--color-brand-dark']
  const ceiling = pairsCeiling(photoBandPairs(t), t['--color-action'], t['--color-action-state-cue-on-scrim'])
  return {label, ramp: 'glow', ground, from: ground, to: t['--color-glow'], ceiling, model: rampDrawnMax(ground, t['--color-glow']), ok: p.glowOk}
}

/** The glow's light (`[R-646]`): the light falling to transparent over the surround's veil, a lit band's solid card, and
 *  a glowing card's corner over its surface, each against the photo band's ceiling, where the palette has room. */
function lightCase(label: string, inputs: ColorInputs) {
  const p = resolvePalette(inputs, {glowShape: 'corner', cardGlow: 'on'})
  const t = p.tokens
  const ground = t['--color-brand-dark']
  const light = t['--color-glow-light'] ?? ground
  const ceiling = pairsCeiling(photoBandPairs(t), t['--color-action'], t['--color-action-state-cue-on-scrim'])
  return {label, ground, light, surface: t['--color-glow-surface'] ?? ground, card: t['--color-card-on-dark'] ?? ground, ceiling, model: rampDrawnMax(ground, light), ok: p.glowLightOk}
}

function cases() {
  const margin = (c: ReturnType<typeof bridgeCase>) => (c.ceiling + 0.05) / (c.model + 0.05)
  const swept = [
    ...seeded(5000, 20260916).map((inputs, i) => bridgeCase(`s20260916#${i}`, inputs)),
    ...nearBlack(4000, 17).map((inputs, i) => bridgeCase(`nb17#${i}`, inputs)),
  ]
  const ramps: Array<ReturnType<typeof bridgeCase> | ReturnType<typeof glowCase>> = [
    bridgeCase('placeholder', {}),
    ...PALETTE_PRESETS.map((p) => bridgeCase(p.id, presetInputs(p))),
    // A ground with no level below it draws a flat ramp, which must draw exactly.
    bridgeCase('flat-000001', {darkGround: '#000001'}),
    bridgeCase('flat-020000', {darkGround: '#020000'}),
    // The ramps nearest their ceiling, where a level drawn past the model shows first.
    ...swept.filter((c) => c.from !== c.to).sort((a, b) => margin(a) - margin(b)).slice(0, 150),
  ]
  const glowMargin = (c: ReturnType<typeof glowCase>) => (c.ceiling + 0.05) / (c.model + 0.05)
  const glowing = [
    ...seeded(5000, 20260916).map((inputs, i) => glowCase(`s20260916#${i}`, inputs)),
    ...nearBlack(4000, 17).map((inputs, i) => glowCase(`nb17#${i}`, inputs)),
  ].filter((c) => c.ok)
  ramps.push(
    ...[glowCase('placeholder', {}), ...PALETTE_PRESETS.map((p) => glowCase(p.id, presetInputs(p)))].filter((c) => c.ok),
    // The glows nearest the photo band's ceiling.
    ...glowing.sort((a, b) => glowMargin(a) - glowMargin(b)).slice(0, 100),
  )
  // A calibration strip, reported and not asserted: what each engine draws against the model on plain ramps, so a new
  // engine's drawing is read before it is trusted (`[R-550]` found WebKit on Linux a level past the model).
  const calibration = [['#000000', '#ffffff'], ['#141414', '#000000'], ['#1c2b4a', '#201a2c'], ['#0b2545', '#2f496c'], ['#111111', '#473400']]
  const lightMargin = (c: ReturnType<typeof lightCase>) => (c.ceiling + 0.05) / (c.model + 0.05)
  const lights = [
    ...[lightCase('placeholder', {}), ...PALETTE_PRESETS.map((p) => lightCase(p.id, presetInputs(p)))].filter((c) => c.ok),
    // The lights nearest the photo band's ceiling.
    ...seeded(1500, 20261007).map((inputs, i) => lightCase(`s20261007#${i}`, inputs)).filter((c) => c.ok).sort((a, b) => lightMargin(a) - lightMargin(b)).slice(0, 60),
  ]
  return {method: 'the bridge ramp for the presets, the placeholder, two flat grounds and the 150 nearest their ceiling over two seeded sweeps; the glow, from the ground to the glow and back under its side layer, for every glowing preset, the placeholder and the 100 nearest the photo band ceiling; the glow\u2019s light over its veil, a lit band\u2019s solid card and a glowing card\u2019s corner, for every lit preset, the placeholder and the 60 nearest the ceiling; a calibration strip; written by lib/__tests__/rampCases.test.ts, drawn by scripts/ci/ramp-pixels.mjs', ramps, lights, calibration}
}

// The cases live beside the script that reads them, under `scripts/ci/`, which the press prunes from a client's
// tree; there this test skips by name (`[R-175]`).
const CI = resolve(__dirname, '../../scripts/ci')

describe('scripts/ci/__snapshots__/ramp-cases.json', () => {
  it.skipIf(!existsSync(CI))('is what the engine says (skipped on a client tree: scripts/ci is pruned)', async () => {
    const c = cases()
    expect(c.ramps.length).toBeGreaterThan(150)
    for (const r of c.ramps) expect(r.model, r.label).toBeLessThanOrEqual(r.ceiling + 1e-12)
    expect(c.lights.length).toBeGreaterThan(60)
    for (const r of c.lights) expect(r.model, r.label).toBeLessThanOrEqual(r.ceiling + 1e-12)
    await expect(JSON.stringify(c) + '\n').toMatchFileSnapshot('../../scripts/ci/__snapshots__/ramp-cases.json')
  }, 180_000)
})
