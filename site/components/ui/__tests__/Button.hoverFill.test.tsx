// @vitest-environment node
//
// THE HOVER FILL UNDER A BUTTON'S LABEL. The sweep and fill-center hovers (`buttonAnimation`, three offered style sets)
// paint a `::before` under the label. It painted the action's hover fill under every primary and the action under every
// secondary, whatever the button's context, so a light primary on a dark band, and both buttons on the accent fill,
// showed their label on a fill nobody paired it with: 1.30 to 1.60:1 on four presets for the dark primary, 1.22 to
// 2.57:1 on all fifteen for the saturated primary (monorepo backlog 435; WS-PREMIUM-PACKAGE-DESIGN §7.1 finding 3, the
// challenge ADV-PP-A). The guarantee test measures token pairs and could not see it: the pair is made by a stylesheet
// rule and a class string together.
//
// So this file reads the three artifacts that make the pair: the rendered button (its context, variant and the
// label's hover color), the stylesheet (the fill the animation paints for that button, and how the context's cascade
// block resolves each token) and the engine's tokens for every preset and a seeded sample, and holds the label on the
// fill at 4.5:1.

import fs from 'node:fs'
import path from 'node:path'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it} from 'vitest'
import {wcagContrast} from 'culori'
import {Button} from '../Button'
import {resolvePalette, type ColorInputs} from '@/lib/designTokens'
import {PALETTE_PRESETS, presetInputs} from '@/lib/palettes'

const CSS = fs.readFileSync(path.resolve(__dirname, '../../../app/globals.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')

/** Every custom-property declaration inside the rules whose selector text satisfies `match`, in source order. */
function declarations(match: (selector: string) => boolean): Map<string, string> {
  const out = new Map<string, string>()
  const rule = /([^{}]+)\{([^{}]*)\}/g
  for (let m = rule.exec(CSS); m; m = rule.exec(CSS)) {
    const selector = m[1].trim()
    if (!match(selector)) continue
    for (const d of m[2].split(';')) {
      const kv = /^\s*(--[a-z0-9-]+|background)\s*:\s*(.+?)\s*$/.exec(d)
      if (kv) out.set(kv[1], kv[2])
    }
  }
  return out
}

/** The aliases `@theme` declares (`--color-accent-fill: var(--color-accent-on-light)`). */
const THEME = (() => {
  const out = new Map<string, string>()
  for (const m of CSS.matchAll(/@theme(?:\s+inline)?\s*\{([^}]*)\}/g)) {
    for (const d of m[1].split(';')) {
      const kv = /^\s*(--color-[a-z0-9-]+)\s*:\s*(var\(--[a-z0-9-]+\))\s*$/.exec(d)
      if (kv) out.set(kv[1], kv[2])
    }
  }
  return out
})()

const BLOCKS = {
  light: new Map<string, string>(),
  dark: declarations((s) => s === '.bg-brand-dark,\n[data-ring-context="dark"]' || s.replace(/\s+/g, ' ') === '.bg-brand-dark, [data-ring-context="dark"]'),
  saturated: declarations((s) => s === '[data-ring-context="saturated"]'),
} as const
type Context = keyof typeof BLOCKS

/** A token's hex: the button's own declarations first, then the context's block, then `@theme`, then the engine. */
function hexOf(name: string, own: Map<string, string>, context: Context, tokens: Record<string, string>, depth = 0): string {
  expect(depth, `${name} resolves in a loop`).toBeLessThan(12)
  const value = own.get(name) ?? BLOCKS[context].get(name) ?? (tokens[name] ? null : THEME.get(name))
  if (value) {
    const ref = /^var\((--[a-z0-9-]+)(?:,\s*(.+))?\)$/.exec(value)
    expect(ref, `${name}: ${value} is not a token reference`).not.toBeNull()
    return hexOf(ref![1], own, context, tokens, depth + 1)
  }
  const hex = tokens[name]
  expect(hex, `${name} is not a token the engine emits`).toBeTruthy()
  return hex
}

type Rendered = {cls: string[]; attrs: Record<string, string>}
function render(variant: 'primary' | 'secondary', context: Context): Rendered {
  const html = renderToStaticMarkup(<Button variant={variant} context={context}>Call</Button>)
  const attrs: Record<string, string> = {}
  for (const m of html.matchAll(/\s([a-z-]+)="([^"]*)"/g)) attrs[m[1]] = m[2]
  return {cls: attrs.class.split(' '), attrs}
}

/** The label's color while hovered, and the custom properties the class string sets on the button itself. */
function label(r: Rendered): {token: string; own: Map<string, string>} {
  const own = new Map<string, string>()
  for (const c of r.cls) {
    const m = /^\[(--[a-z0-9-]+):(var\(--[a-z0-9-]+\))\]$/.exec(c)
    if (m) own.set(m[1], m[2])
  }
  const hover = r.cls.find((c) => c.startsWith('hover:text-'))?.slice('hover:text-'.length)
  const rest = r.cls.find((c) => /^text-[a-z-]+$/.test(c) && !/^text-(xs|sm|base|lg|xl|\d)/.test(c))?.slice('text-'.length)
  const name = hover ?? rest
  expect(name, `no label color on ${r.cls.join(' ')}`).toBeTruthy()
  return {token: `--color-${name}`, own}
}

/** The fill the animation paints under this button: the `::before` rule for its variant, through `--btn-hover-fill`
 *  where the button's own context sets one. */
function fill(mode: string, r: Rendered): string {
  const variant = r.attrs['data-variant']
  const before = declarations((s) => s === `[data-button-animation="${mode}"] [data-button-animatable="true"][data-variant="${variant}"]::before`)
  const background = before.get('background')
  expect(background, `${mode} paints nothing under a ${variant}`).toBeTruthy()
  const ref = /^var\((--[a-z0-9-]+)(?:,\s*var\((--[a-z0-9-]+)\))?\)$/.exec(background!)
  expect(ref, `${mode} ${variant}: ${background}`).not.toBeNull()
  if (ref![1] !== '--btn-hover-fill') return ref![1]
  // The button's own attributes pick the declaration: every attribute selector in the rule must match.
  const set = declarations((s) => {
    const parts = [...s.matchAll(/\[([a-z-]+)="([^"]*)"\]/g)]
    return parts.length > 0 && !s.includes('::') && parts.every(([, k, v]) => r.attrs[k] === v)
  }).get('--btn-hover-fill')
  return set ? /^var\((--[a-z0-9-]+)\)$/.exec(set)![1] : ref![2]
}

function seeded(n: number, seed: number): ColorInputs[] {
  let s = seed >>> 0
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32
  const hex = () => '#' + Math.floor(rnd() * 0x1000000).toString(16).padStart(6, '0')
  return Array.from({length: n}, () => ({darkGround: hex(), lightGround: hex(), accent: hex(), action: rnd() < 0.5 ? hex() : null}))
}

const PALETTES: [string, ColorInputs][] = [
  ['placeholder', {}],
  ...PALETTE_PRESETS.map((p) => [p.id, presetInputs(p)] as [string, ColorInputs]),
  ...seeded(600, 435).map((p, i) => [`seeded #${i} ${JSON.stringify(p)}`, p] as [string, ColorInputs]),
]

describe('the sweep and fill-center hovers keep the label readable on what they paint (backlog 435)', () => {
  for (const mode of ['sweep', 'fill-center']) {
    for (const variant of ['primary', 'secondary'] as const) {
      for (const context of ['light', 'dark', 'saturated'] as const) {
        it(`${mode}, ${variant} on ${context}: the label on the fill is 4.5:1 for every preset and 600 seeded palettes`, () => {
          const r = render(variant, context)
          const {token, own} = label(r)
          const under = fill(mode, r)
          const failing: string[] = []
          for (const [name, inputs] of PALETTES) {
            const tokens = resolvePalette(inputs).tokens
            const fg = hexOf(token, own, context, tokens)
            const bg = hexOf(under, own, context, tokens)
            const ratio = wcagContrast(fg, bg) as number
            if (ratio < 4.5) failing.push(`${name}: ${token} ${fg} on ${under} ${bg} = ${ratio.toFixed(2)}`)
          }
          expect(failing.slice(0, 5), `${failing.length} failing`).toEqual([])
        })
      }
    }
  }
})
