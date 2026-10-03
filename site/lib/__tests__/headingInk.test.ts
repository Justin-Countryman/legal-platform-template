// @vitest-environment node
//
// ─── Headings follow the dark ground (the roster eye of 2026-10-03, `[R-631]`) ───────────────────────────────────────
//
// Justin, of Quiet beside bdgfirm.com: "notice how some of the text is in blue to align with the color palette in the
// bdgfirm.com vs ours is black and gold"; and, asked what follows what: "the headings follow the dark ground, and the
// dark ground follows the logo". So on a light ground (the page, the hero's tint, the muted step, the wash, a textured
// band) a heading's ink is the palette's dark ground, `--color-heading`; on a dark ground it is the on-dark text as
// before, and on the accent fill the fill's one text color. A token rule, the palette's: no theme or style set moves it.
//
// THE GUARANTEE. `validateWcag` holds the dark ground as ink on every light ground, blocking, which it never did (it
// held the dark ground under white and the on-dark tiers only; the layout record's §8.3 found the gap), and the heading
// token beside it. The accepted dark ground (white at 7:1 on it) passes 4.5:1 on every accepted light ground, so the
// token is the dark ground itself on every preset; were a palette ever to fail, the engine steps the ink darker at its
// own hue, as `accent-text` is stepped, and the sweep in `colorGuarantee.test.ts` says so.

import {describe, expect, it} from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {converter, wcagContrast} from 'culori'
import {resolvePalette, validateWcag, type ColorInputs} from '../designTokens'
import {PALETTE_PRESETS, presetInputs} from '../palettes'
import {SECTION_HEADER_H2_CLASS} from '@/components/ui/SectionHeader'
import {HEADING_UNIT_TIER_CLASS} from '@/components/ui/HeadingUnit'

const toOklch = converter('oklch')
const GROUNDS = ['background', 'hero-tint', 'muted', 'wash', 'section-texture'] as const
const SITE = path.resolve(__dirname, '../..')
const CSS = fs.readFileSync(path.join(SITE, 'app/globals.css'), 'utf8')

function seeded(n: number, seed: number): ColorInputs[] {
  let s = seed >>> 0
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32
  const hex = () => '#' + Math.floor(rnd() * 0x1000000).toString(16).padStart(6, '0')
  return Array.from({length: n}, () => ({darkGround: hex(), lightGround: hex(), accent: hex(), action: rnd() < 0.5 ? hex() : null}))
}

describe('the heading ink on a light ground is the dark ground', () => {
  it('validateWcag holds the dark ground, and the heading, as ink on all five light grounds, blocking', () => {
    const results = validateWcag(resolvePalette({}))
    for (const g of GROUNDS) {
      for (const ink of ['brand-dark', 'heading']) {
        const r = results.find((x) => x.pair === `${ink} on ${g}`)
        expect(r, `${ink} on ${g}`).toBeDefined()
        expect(r!.blocking).toBe(true)
        expect(r!.min).toBe(4.5)
      }
    }
  })

  it('on every preset the heading is the dark ground itself, and reads at 4.5:1 on every light ground', () => {
    for (const p of PALETTE_PRESETS) {
      const t = resolvePalette(presetInputs(p)).tokens
      expect(t['--color-heading'], p.id).toBe(t['--color-brand-dark'])
      expect(t['--color-heading-on-light'], p.id).toBe(t['--color-heading'])
      for (const r of validateWcag(resolvePalette(presetInputs(p))).filter((x) => /^heading on /.test(x.pair))) expect(r.passes, `${p.id}: ${r.pair} = ${r.ratio}`).toBe(true)
    }
    const t = resolvePalette({}).tokens
    expect(t['--color-heading']).toBe(t['--color-brand-dark'])
  })

  it('for any palette the heading is the dark ground or that ground stepped darker at its own hue, never another color', () => {
    for (const inputs of seeded(1000, 20261003)) {
      const t = resolvePalette(inputs).tokens
      const heading = toOklch(t['--color-heading'])!
      const dark = toOklch(t['--color-brand-dark'])!
      expect(heading.l, JSON.stringify(inputs)).toBeLessThanOrEqual((dark.l ?? 0) + 1e-9)
      if (t['--color-heading'] !== t['--color-brand-dark']) expect(Math.abs(((heading.h ?? 0) - (dark.h ?? 0) + 180) % 360 - 180), JSON.stringify(inputs)).toBeLessThan(2)
      for (const r of validateWcag(resolvePalette(inputs)).filter((x) => /^heading on /.test(x.pair))) expect(r.passes, `${JSON.stringify(inputs)}: ${r.pair} = ${r.ratio}`).toBe(true)
    }
  }, 60_000)

  it('the cascade blocks swap it: the on-dark text on a dark band, the fill’s text on the accent, the dark ground again on a light island', () => {
    const block = (selector: string) => {
      const at = CSS.indexOf(selector)
      expect(at, selector).toBeGreaterThan(-1)
      return CSS.slice(CSS.indexOf('{', at), CSS.indexOf('}', at))
    }
    expect(block('.bg-brand-dark,\n[data-ring-context="dark"]')).toMatch(/--color-heading:\s*var\(--color-foreground-on-dark\);/)
    expect(block('[data-ring-context="light"]')).toMatch(/--color-heading:\s*var\(--color-heading-on-light\);/)
    expect(block('[data-ring-context="saturated"]')).toMatch(/--color-heading:\s*var\(--color-accent-fg\);/)
    expect(CSS).toMatch(/@theme[\s\S]*--color-heading:\s*#[0-9a-f]{6};/)
  })

  it('every section heading and page heading reads it: text-heading, not the body text’s token', () => {
    for (const [tier, cls] of Object.entries(SECTION_HEADER_H2_CLASS)) {
      expect(cls.split(' '), `SectionHeader ${tier}`).toContain('text-heading')
      expect(cls.split(' '), `SectionHeader ${tier}`).not.toContain('text-foreground')
    }
    for (const [tier, cls] of Object.entries(HEADING_UNIT_TIER_CLASS)) {
      expect(cls.split(' '), `HeadingUnit ${tier}`).toContain('text-heading')
      expect(cls.split(' '), `HeadingUnit ${tier}`).not.toContain('text-foreground')
    }
    // The headings written out by hand: the hero's h1, the two interior page h1s, the three h2s off SectionHeader.
    const files = ['components/layout/homeHero/shared.tsx', 'components/layout/InternalPageHeader.tsx', 'components/layout/InternalHero.tsx',
      'components/sections/FeaturedTestimonialSection.tsx', 'components/sections/CtaSectionBlock.tsx', 'components/layout/HomepageCta.tsx']
    for (const f of files) {
      const src = fs.readFileSync(path.join(SITE, f), 'utf8')
      // A literal, a template up to its first `${`, or the first string of an array the component joins (`shared.tsx`'s h1).
      const headings = [...src.matchAll(/<h[12]\b[^>]*className=\{?\[?[`'"]([^`'"$]*)/g)].map((m) => m[1])
      expect(headings.length, f).toBeGreaterThan(0)
      for (const cls of headings) {
        expect(cls.split(/\s+/), `${f}: ${cls}`).toContain('text-heading')
        expect(cls.split(/\s+/), `${f}: ${cls}`).not.toContain('text-foreground')
      }
    }
  })

  it('the pair the guarantee adds is the one the page draws: the dark ground on the page at 4.5:1 for every preset', () => {
    for (const p of PALETTE_PRESETS) {
      const t = resolvePalette(presetInputs(p)).tokens
      expect(wcagContrast(t['--color-heading'], t['--color-background']), p.id).toBeGreaterThanOrEqual(4.5)
    }
  })
})
