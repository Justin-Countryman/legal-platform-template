// @vitest-environment node
//
// THE PRIMARY BUTTON ON A DARK BAND (monorepo WS-PREMIUM-PACKAGE-DESIGN §7.2 amendment 8, `[R-641]`). Design Settings may
// fill it with the accent or the button color, or draw it as an accent outline. The stylesheet draws it from the
// `--color-btn-dark*` tokens, under the shell's `data-button-on-dark` only, and a photo or glowing band re-declares
// them; the engine emits values that pass or today's light button. This file reads the rule, the re-declaration and the
// rendered button, and holds what a visitor sees over every preset and every mode.

import fs from 'node:fs'
import path from 'node:path'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it} from 'vitest'
import {wcagContrast} from 'culori'
import {Button} from '../Button'
import {resolvePalette} from '@/lib/designTokens'
import {PALETTE_PRESETS, presetInputs} from '@/lib/palettes'

const CSS = fs.readFileSync(path.resolve(__dirname, '../../../app/globals.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const rules = (selector: string) => [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => m[1].trim() === selector).map((m) => m[2])
const decl = (body: string, prop: string) => new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(body)?.[1].trim()
const THEME = new Map([...CSS.matchAll(/@theme(?:\s+inline)?\s*\{([^}]*)\}/g)].flatMap((b) => [...b[1].matchAll(/(--color-btn-dark[a-z-]*)\s*:\s*([^;]+);/g)]).map((m) => [m[1], m[2].trim()]))

const SELECTOR = '[data-button-on-dark] [data-variant="primary"][data-context="dark"]'
const MODES = ['accent', 'action', 'outline'] as const
const contrast = (a: string, b: string) => wcagContrast(a, b) as number

describe('the primary button on a dark band', () => {
  it('is drawn from the tokens only under the shell’s attribute, on the button’s own context', () => {
    const [rest] = rules(SELECTOR)
    expect(decl(rest, 'background-color')).toBe('var(--color-btn-dark)')
    expect(decl(rest, 'color')).toBe('var(--color-btn-dark-fg)')
    // The keyline is an inset shadow: the button keeps its size (ADV-PP-A, ADV-PP-B).
    expect(decl(rest, 'box-shadow')).toBe('inset 0 0 0 1px var(--color-btn-dark-edge)')
    expect(decl(rest, 'border')).toBeUndefined()
    const [hover] = rules(`${SELECTOR}:hover`)
    expect(decl(hover, 'background-color')).toBe('var(--color-btn-dark-hover)')
    expect(decl(hover, 'color')).toBe('var(--color-btn-dark-hover-fg)')
    const html = renderToStaticMarkup(<Button context="dark">Call</Button>)
    expect(html).toContain('data-variant="primary"')
    expect(html).toContain('data-context="dark"')
  })

  it('a photo or glowing band re-declares every token to its own values', () => {
    const body = rules('[data-scrim="true"],\n[data-glow="true"],\n[data-hero-image="true"]').join(';')
    for (const k of ['', '-fg', '-edge', '-hover', '-hover-fg']) expect(decl(body, `--color-btn-dark${k}`), k).toBe(`var(--color-btn-dark${k}-on-scrim)`)
  })

  it('its defaults are today’s light button, so a site that sets nothing draws what it always did', () => {
    expect(THEME.get('--color-btn-dark')).toBe('var(--color-background)')
    expect(THEME.get('--color-btn-dark-fg')).toBe('var(--color-foreground-on-light)')
    expect(THEME.get('--color-btn-dark-edge')).toBe('transparent')
    expect(THEME.get('--color-btn-dark-hover')).toBe('var(--color-muted)')
  })

  for (const mode of MODES) {
    it(`${mode}: the label reads and the button stands out on a plain dark band and on a photo, for every preset`, () => {
      const failing: string[] = []
      for (const p of [{id: 'placeholder', inputs: {}}, ...PALETTE_PRESETS.map((x) => ({id: x.id, inputs: presetInputs(x)}))]) {
        const t = resolvePalette(p.inputs, {buttonOnDark: mode}).tokens
        for (const [suffix, ground] of [['', t['--color-brand-dark']], ['-on-scrim', t['--color-glow']]] as const) {
          const fill = t[`--color-btn-dark${suffix}`], fg = t[`--color-btn-dark-fg${suffix}`], edge = t[`--color-btn-dark-edge${suffix}`]
          const under = fill === 'transparent' ? ground : fill
          if (contrast(fg, under) < 4.5) failing.push(`${p.id}${suffix}: label ${fg} on ${under}`)
          if (fill === 'transparent' && contrast(edge, ground) < 3) failing.push(`${p.id}${suffix}: keyline ${edge} on ${ground}`)
          if (fill !== 'transparent' && fill !== t['--color-background'] && contrast(fill, ground) < 3) failing.push(`${p.id}${suffix}: fill ${fill} on ${ground}`)
          if (contrast(t[`--color-btn-dark-hover-fg${suffix}`], t[`--color-btn-dark-hover${suffix}`]) < 4.5) failing.push(`${p.id}${suffix}: hover`)
        }
      }
      expect(failing).toEqual([])
    })
  }
})
