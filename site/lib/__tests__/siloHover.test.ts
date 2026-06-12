import {describe, it, expect} from 'vitest'
import {siloHover, resolveHovers, defaultHoverForStyle, SILO_HOVER_EFFECTS} from '../siloHover'

// The hover preset system is a composable axis every silo layout inherits. Effects
// are independent layers, so ANY combination stacks. Tests also lock the Tailwind-v4
// fix: a translate/scale layer uses the standard `transition-transform` (whose
// property list includes translate + scale), never the arbitrary `transition-[…]`.

describe('siloHover — each effect activates only its own layer', () => {
  it('imageZoom → image scales + arrow shifts; nothing else', () => {
    const fx = siloHover(['imageZoom'])
    expect(fx.image).toContain('group-hover:scale-105')
    expect(fx.arrow).toContain('group-hover:translate-x-1')
    expect(fx.container).toBe('')
    expect(fx.glow).toBe('')
    expect(fx.border).toBe('')
  })

  it('lift → eases the translate via the STANDARD transition-transform (the bug fix)', () => {
    const fx = siloHover(['lift'])
    expect(fx.container).toContain('transition-transform')
    expect(fx.container).not.toContain('transition-[transform')
    expect(fx.container).toContain('hover:-translate-y-1')
    expect(fx.container).toContain('before:shadow-elevation-md')
    expect(fx.container).toContain('hover:before:opacity-100')
    expect(fx.arrow).toContain('group-hover:translate-x-1')
  })

  it('glow → only the accent glow overlay fades in', () => {
    const fx = siloHover(['glow'])
    expect(fx.glow).toBe('group-hover:opacity-100')
    expect(fx.container).toBe('')
    expect(fx.arrow).toBe('')
    expect(fx.border).toBe('')
  })

  it('accentBorder → accent border on the TOP overlay (not the occluded container)', () => {
    const fx = siloHover(['accentBorder'])
    expect(fx.border).toContain('group-hover:border-action')
    expect(fx.container).toBe('')
    expect(fx.image).toBe('')
    expect(fx.glow).toBe('')
    expect(fx.arrow).toBe('')
  })

  it('grayscale → image is B&W at rest, colours on hover (image filter layer)', () => {
    const fx = siloHover(['grayscale'])
    expect(fx.image).toContain('grayscale')
    expect(fx.image).toContain('group-hover:grayscale-0')
    expect(fx.image).not.toContain('scale-105') // no zoom unless also selected
    expect(fx.underline).toBe('')
  })

  it('accentUnderline → the label underline scales in (its own layer)', () => {
    const fx = siloHover(['accentUnderline'])
    expect(fx.underline).toBe('group-hover:scale-x-100')
    expect(fx.image).toBe('')
    expect(fx.container).toBe('')
  })

  it('iconPop → the icon chip lifts + scales (its own layer)', () => {
    const fx = siloHover(['iconPop'])
    expect(fx.icon).toContain('group-hover:scale-110')
    expect(fx.icon).toContain('group-hover:-translate-y-0.5')
    expect(fx.image).toBe('')
    expect(fx.underline).toBe('')
  })
})

describe('siloHover — composition (multiple effects stack)', () => {
  it('lift + glow + accentBorder all apply together', () => {
    const fx = siloHover(['lift', 'glow', 'accentBorder'])
    expect(fx.container).toContain('hover:-translate-y-1') // lift
    expect(fx.glow).toBe('group-hover:opacity-100') // glow
    expect(fx.border).toContain('group-hover:border-action') // accent border
    expect(fx.arrow).toContain('group-hover:translate-x-1') // arrow from lift
    expect(fx.image).toBe('') // no zoom (not selected)
  })

  it('imageZoom + accentBorder compose on different layers', () => {
    const fx = siloHover(['imageZoom', 'accentBorder'])
    expect(fx.image).toContain('group-hover:scale-105')
    expect(fx.border).toContain('group-hover:border-action')
  })

  it('imageZoom + grayscale stack on the image (zoom AND colour reveal)', () => {
    const fx = siloHover(['imageZoom', 'grayscale'])
    expect(fx.image).toContain('group-hover:scale-105')
    expect(fx.image).toContain('group-hover:grayscale-0')
  })

  it('empty array → fully static (every layer empty)', () => {
    const fx = siloHover([])
    expect(fx).toEqual({container: '', image: '', glow: '', arrow: '', border: '', underline: '', icon: ''})
  })

  it('the arrow shifts when EITHER movement effect is present', () => {
    expect(siloHover(['imageZoom']).arrow).not.toBe('')
    expect(siloHover(['lift']).arrow).not.toBe('')
    expect(siloHover(['glow', 'accentBorder']).arrow).toBe('')
    expect(siloHover([]).arrow).toBe('')
  })

  it('never uses the front-loaded ease-smooth; container transitions use ease-gentle', () => {
    for (const e of SILO_HOVER_EFFECTS) {
      if (e === 'none') continue
      const fx = siloHover([e])
      const all = `${fx.container} ${fx.image} ${fx.glow} ${fx.arrow} ${fx.border}`
      expect(all).not.toContain('ease-smooth')
      if (fx.container.includes('transition')) expect(fx.container).toContain('ease-gentle')
    }
  })
})

describe('resolveHovers — selection → applied effects', () => {
  it('unset / empty falls back to the per-style default (single effect)', () => {
    expect(resolveHovers(null, 'indexCards')).toEqual(['imageZoom'])
    expect(resolveHovers([], 'tile')).toEqual(['glow'])
    expect(resolveHovers(undefined, 'inline')).toEqual(['accentBorder'])
  })

  it('a non-empty selection is applied as-is (all of them)', () => {
    expect(resolveHovers(['lift', 'glow'], 'tile')).toEqual(['lift', 'glow'])
  })

  it("'none' overrides the rest → fully static ([])", () => {
    expect(resolveHovers(['lift', 'glow', 'none'], 'tile')).toEqual([])
    expect(resolveHovers(['none'], 'spotlight')).toEqual([])
  })

  it('unknown values are filtered out (never throws)', () => {
    expect(resolveHovers(['lift', 'bogus'], 'tile')).toEqual(['lift'])
  })

  it('photo styles default to Image Zoom; fill/icon to Glow; horizontal to Accent Border', () => {
    expect(defaultHoverForStyle('spotlight')).toBe('imageZoom')
    expect(defaultHoverForStyle('tile')).toBe('glow')
    expect(defaultHoverForStyle('inline')).toBe('accentBorder')
  })
})
