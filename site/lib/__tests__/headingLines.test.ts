import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'
import {HEADING_LINES, HEADING_LINE_DESIGNS, LINE_USE_ORDER, headingLineVars, lineSvg} from '../headingLines'

// The heading-line library (Phase 16C, `[R-484]`, `[R-489]`): twenty-three designs plus
// none. Every design but Flanking and the vertical rule is a one-color SVG the site
// paints as a mask and the Studio's picker draws as itself, so there is one source.
//
// What these hold: the library equals what the Studio offers; `line` keeps its stored
// value, so no client's heading line changes under them; Monogram is not here (it is the
// firm's mark, which `[R-488]` refuses above a heading and whose CDN mask is refused by
// CORS on a live domain); every SVG is one color, fits its own box and sits on whole
// pixels (a 1px rule on a half pixel renders as a 2px half-tone).

const fieldMap = JSON.parse(readFileSync(resolve(__dirname, '../../../studio/field-map.json'), 'utf8'))
const optionsOf = (field: string): string[] =>
  fieldMap.types.designSettings.fields.find((r: {path: string}) => r.path === field)?.options?.list ?? []
const globals = readFileSync(resolve(__dirname, '../../app/globals.css'), 'utf8')

describe('the heading-line library', () => {
  it('is twenty-three designs plus none, and is what the Studio offers', () => {
    expect(HEADING_LINES).toHaveLength(24)
    expect(HEADING_LINES[0]).toBe('none')
    expect([...HEADING_LINES].sort()).toEqual([...optionsOf('headingRule')].sort())
  })

  it('keeps the four values Phase 16B shipped, so no client’s line changes ([R-484]: `line` becomes the Bar)', () => {
    for (const value of ['none', 'line', 'double', 'hatched']) expect(HEADING_LINES).toContain(value)
    expect(HEADING_LINE_DESIGNS.line.label).toBe('Bar')
  })

  it('carries Justin’s two additions and the vertical rule, and not the monogram ([R-488], [R-489])', () => {
    expect(HEADING_LINES).toContain('leadDot')
    expect(HEADING_LINES).toContain('leadDiamond')
    expect(HEADING_LINES).toContain('vertical')
    expect(HEADING_LINES).not.toContain('monogram')
  })

  it('draws every design but the two that are not masks', () => {
    const drawn = Object.keys(HEADING_LINE_DESIGNS).sort()
    expect(drawn).toEqual(HEADING_LINES.filter((l) => !['none', 'flanking', 'vertical'].includes(l)).sort())
  })

  it.each(Object.entries(HEADING_LINE_DESIGNS))('%s is one color, fits its box and sits on whole pixels', (id, design) => {
    const svg = lineSvg(design)
    expect(svg, id).toContain(`viewBox='0 0 ${design.w} ${design.h}'`)
    // One color: a mask reads alpha only, so nothing here may name a color but the
    // stroke placeholder the mask ignores.
    expect(svg.replace(/stroke='#000'/g, ''), id).not.toMatch(/#[0-9a-f]{3,6}/i)
    expect(design.w, id).toBeLessThanOrEqual(120)
    expect(design.h, id).toBeLessThanOrEqual(16)
    // Every geometry number inside the box.
    for (const m of svg.matchAll(/(?:x|width)='([\d.]+)'/g)) expect(Number(m[1]), `${id} x`).toBeLessThanOrEqual(design.w)
    for (const m of svg.matchAll(/(?:y|height)='([\d.]+)'/g)) expect(Number(m[1]), `${id} y`).toBeLessThanOrEqual(design.h)
    // Whole pixels for the rectangles that make the fine rules.
    for (const m of svg.matchAll(/<rect[^>]*y='([\d.]+)'/g)) expect(Number(m[1]) % 1, `${id} rect y`).toBe(0)
  })

  it('groups the designs by how often law-firm sites use them, so the picker leads with those', () => {
    expect([...LINE_USE_ORDER]).toEqual(['common', 'ornamental', 'decorative'])
    const common = Object.entries(HEADING_LINE_DESIGNS).filter(([, d]) => d.use === 'common').map(([id]) => id)
    expect(common.sort()).toEqual(['double', 'fade', 'hairline', 'line', 'slab'])
    for (const [id, design] of Object.entries(HEADING_LINE_DESIGNS)) expect(LINE_USE_ORDER, id).toContain(design.use)
  })
})

describe('what the engine emits', () => {
  it('emits one design as a mask with its own size', () => {
    const css = headingLineVars('leadDiamond')
    expect(css).toContain('--heading-line-mask:url("data:image/svg+xml,')
    expect(css).toMatch(/--heading-line-w:[\d.]+rem/)
    expect(css).toMatch(/--heading-line-h:[\d.]+rem/)
  })

  it('emits nothing for none, for the two that are not masks, and for an unknown value', () => {
    for (const value of ['none', 'flanking', 'vertical', '', null, undefined, 'nope']) {
      expect(headingLineVars(value), String(value)).toBe('')
    }
  })
})

describe('the stylesheet draws them', () => {
  it('has one rule for every mask design, not one rule each', () => {
    expect(globals).toContain('[data-heading-rule]:not([data-heading-rule="none"])')
    expect(globals).toContain('mask: var(--heading-line-mask) center / 100% 100% no-repeat')
    // The old per-design rules are gone with the three values they drew.
    expect(globals).not.toContain('[data-heading-rule="double"] .section-heading::after')
  })

  it('paints in the decor role resolved on the heading, never an alias at :root (16B amendment 9)', () => {
    const rule = globals.slice(globals.indexOf('[data-heading-rule]:not('), globals.indexOf('/* The vertical rule'))
    expect(rule).toContain('background-color: --theme(--color-decor)')
    expect(rule).not.toContain('var(--color-rule')
  })

  it('falls back to one plain line in forced colors and without mask support', () => {
    const forced = globals.slice(globals.indexOf('@media (forced-colors: active) {'))
    expect(forced).toContain('border-top: 1px solid CanvasText')
    expect(globals).toContain('@supports not (mask-image: none)')
  })

  it('draws Flanking inside the heading’s own padding, and only from md', () => {
    const flank = globals.slice(globals.indexOf('/* Flanking:'), globals.indexOf('/* The vertical rule'))
    expect(flank).toContain('@media (min-width: 768px)')
    expect(flank).toContain('padding-inline: 4.5rem')
    // Absolutely placed lines outside a wrapping heading scrolled the page sideways at
    // 390 and 768 (ADV-P16C-A measured 435px and 794px), so they live inside the box.
    expect(flank).not.toContain('position: absolute')
  })
})
