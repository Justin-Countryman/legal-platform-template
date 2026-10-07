// @vitest-environment node
//
// THE COLOR DETAILS (monorepo WS-PREMIUM-PACKAGE-DESIGN §7.2 amendments 7 to 10, `[R-641]`): which role a heading, a color
// band, the accent on dark and the primary button on dark draw from. The guarantee test sweeps every pair they make; this
// file pins what each renders on palettes the five premium references wear, that each falls back where it would not
// read, and that a palette with none set resolves exactly as it did.

import {describe, expect, it} from 'vitest'
import {wcagContrast} from 'culori'
import {resolvePalette, type PaletteOptions} from '../designTokens'
import {saturatedFillOk} from '../flows'
import {PALETTE_PRESETS, presetInputs} from '../palettes'
import {COLOR_DETAILS, DETAILS, detailsOf} from '../details'

const NAVY_GOLD = {darkGround: '#061b2d', accent: '#b89867'}
const NAVY_GOLD_BLUE = {darkGround: '#0f2340', accent: '#c9a227', action: '#0056a6'}
const contrast = (a: string, b: string) => wcagContrast(a, b) as number
const DETAIL_TOKENS = [
  '--color-heading-on-fade', '--color-accent-on-dark-raw', '--color-accent-fill', '--color-saturated-decor',
  '--color-btn-dark', '--color-btn-dark-on-scrim',
]

describe('a palette with no detail set resolves exactly as before', () => {
  it.each([['placeholder', {}], ...PALETTE_PRESETS.map((p) => [p.id, presetInputs(p)])])('%s', (_id, inputs) => {
    const before = resolvePalette(inputs as never).tokens
    expect(resolvePalette(inputs as never, {}).tokens).toEqual(before)
    for (const k of DETAIL_TOKENS) expect(before[k], k).toBeUndefined()
    // A value the table does not name reads as absent, as the site reads a stored value.
    expect(resolvePalette(inputs as never, {headingInk: 'nonsense', buttonOnDark: 7, accentOnDark: 'RAW'}).tokens).toEqual(before)
  })
})

describe('heading color: the button color', () => {
  it('a button color that reads on every light ground is the heading as chosen', () => {
    const t = resolvePalette(NAVY_GOLD_BLUE, {headingInk: 'action'}).tokens
    expect(t['--color-heading']).toBe('#0056a6')
    expect(t['--color-heading-on-light']).toBe('#0056a6')
  })

  it('a gold button color is stepped darker until it reads, and the ghost photographs keep their strength', () => {
    const inputs = {darkGround: '#0f2340', accent: '#c9a227', action: '#c9a227'}
    const plain = resolvePalette(inputs).tokens
    const t = resolvePalette(inputs, {headingInk: 'action'}).tokens
    expect(t['--color-heading']).toBe('#846700')
    expect(contrast(t['--color-heading'], t['--color-background'])).toBeGreaterThanOrEqual(4.5)
    // ADV-PP-A: solved for the action the ghost's opacity fell to 0.03 or less; it stays where today's heading puts it.
    expect(t['--fade-opacity-on-light']).toBe(plain['--fade-opacity-on-light'])
    expect(t['--color-heading-on-fade']).toBe('#705700')
  })
})

describe('the color band in the button color', () => {
  const blueOnTeal = {darkGround: '#14213d', lightGround: '#f7f3ea', accent: '#c9a227', action: '#1f7a8c'}

  it('re-points the fill and its text where the button color makes a band of its own, and the walk follows it', () => {
    const t = resolvePalette(blueOnTeal, {saturatedFrom: 'action'}).tokens
    expect(t['--color-accent-fill']).toBe(t['--color-action'])
    expect(t['--color-accent-fg']).toBe(t['--color-action-fg'])
    expect(contrast(t['--color-accent-fg'], t['--color-accent-fill'])).toBeGreaterThanOrEqual(4.5)
    expect(saturatedFillOk({...blueOnTeal, saturatedFrom: 'action'})).toBe(true)
  })

  it('falls back to the accent where the button color sits too close to the dark ground (brandilaw: blue on navy)', () => {
    const t = resolvePalette(NAVY_GOLD_BLUE, {saturatedFrom: 'action'}).tokens
    expect(t['--color-accent-fill']).toBeUndefined()
    expect(t['--color-accent-fg']).toBe(resolvePalette(NAVY_GOLD_BLUE).tokens['--color-accent-fg'])
  })

  it('does nothing where there is no button color of its own', () => {
    expect(resolvePalette(NAVY_GOLD, {saturatedFrom: 'action'}).tokens['--color-accent-fill']).toBeUndefined()
  })
})

describe('the accent as chosen on a plain dark band', () => {
  it('keeps a gold that reads on its navy (nguyenandmaliklaw: #b89867 drew #ebd4b1), and moves no solve', () => {
    const plain = resolvePalette(NAVY_GOLD).tokens
    const t = resolvePalette(NAVY_GOLD, {accentOnDark: 'raw'}).tokens
    expect(t['--color-accent-on-dark-raw']).toBe('#b89867')
    expect(t['--color-accent-on-dark']).toBe(plain['--color-accent-on-dark'])
    for (const k of ['--color-glow', '--color-gradient-start', '--color-gradient-stop', '--color-texture-ink-on-dark', '--section-texture-opacity-on-dark', '--fade-opacity-on-light']) {
      expect(t[k], k).toBe(plain[k])
    }
  })

  it('keeps the lightened accent where the accent does not read on the dark ground', () => {
    expect(resolvePalette({darkGround: '#14213d', accent: '#5a3e8c'}, {accentOnDark: 'raw'}).tokens['--color-accent-on-dark-raw']).toBeUndefined()
  })
})

describe('buttons on dark sections', () => {
  it('accent: brandilaw’s gold fills the button on its navy, plain and on a photo', () => {
    const t = resolvePalette(NAVY_GOLD_BLUE, {buttonOnDark: 'accent'}).tokens
    expect(t['--color-btn-dark']).toBe('#c9a227')
    expect(t['--color-btn-dark-on-scrim']).toBe('#c9a227')
    expect(contrast(t['--color-btn-dark-fg'], t['--color-btn-dark'])).toBeGreaterThanOrEqual(4.5)
    expect(t['--color-btn-dark-edge']).toBe('transparent')
  })

  it('button color: a blue that does not stand 3:1 off the navy keeps today’s light button (ADV-PP-C)', () => {
    const t = resolvePalette(NAVY_GOLD_BLUE, {buttonOnDark: 'action'}).tokens
    const plain = resolvePalette(NAVY_GOLD_BLUE).tokens
    expect(t['--color-btn-dark']).toBe(plain['--color-background'])
    expect(t['--color-btn-dark-fg']).toBe(plain['--color-foreground'])
    expect(t['--color-btn-dark-hover']).toBe(plain['--color-muted'])
  })

  it('outline: the on-dark text inside a keyline of the gold, filling with it on hover', () => {
    const t = resolvePalette(NAVY_GOLD, {buttonOnDark: 'outline'}).tokens
    expect(t['--color-btn-dark']).toBe('transparent')
    expect(t['--color-btn-dark-edge']).toBe('#b89867')
    expect(t['--color-btn-dark-fg']).toBe(t['--color-foreground-on-dark'])
    expect(t['--color-btn-dark-hover']).toBe(t['--color-accent'])
    expect(contrast(t['--color-btn-dark-hover-fg'], t['--color-btn-dark-hover'])).toBeGreaterThanOrEqual(4.5)
  })
})

describe('the details table', () => {
  it('names the four fields, three of them palette details a palette choice clears', () => {
    expect(DETAILS.map((d) => d.field)).toEqual(['headingInk', 'saturatedFrom', 'accentOnDark', 'buttonOnDark'])
    expect(COLOR_DETAILS).toEqual(['headingInk', 'saturatedFrom', 'accentOnDark'])
  })

  it('reads a stored document in words, a value it does not name as unset', () => {
    expect(detailsOf({headingInk: 'action', buttonOnDark: 'outline', accentOnDark: 'bogus'})).toEqual([
      {field: 'headingInk', label: 'Heading color', value: 'the button color'},
      {field: 'buttonOnDark', label: 'Buttons on dark sections', value: 'accent outline'},
    ])
    expect(detailsOf(null)).toEqual([])
  })

  it('every option the engine takes is a detail', () => {
    const options: (keyof PaletteOptions)[] = ['headingInk', 'saturatedFrom', 'accentOnDark', 'buttonOnDark']
    expect(options.every((o) => DETAILS.some((d) => d.field === o))).toBe(true)
  })
})
