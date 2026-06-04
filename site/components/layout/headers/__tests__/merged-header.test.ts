import {describe, it, expect} from 'vitest'
import {
  headerPositionClass,
  schemeBg,
  resolveScheme,
  isDarkSurface,
  solidScheme,
} from '../shared'
import {resolveHeroSurface, resolveMergedHeaderScheme, type HeroSiteDefaults} from '@/lib/heroSurface'

// Merge-ON rendering lock. These are the exact decisions that make a merged
// header OVERLAY the hero (transparent, fixed, bg extends up behind it) rather
// than render as a solid bar above it. If a future layout change flips any of
// them, this fails loudly instead of silently breaking merge.

describe('merged header — positioning (overlay vs solid bar)', () => {
  it('heroMerge ON → header is FIXED (lifted out of flow, overlays the hero)', () => {
    expect(headerPositionClass(true, true)).toContain('fixed')
    expect(headerPositionClass(true, false)).toContain('fixed')
  })

  it('heroMerge OFF → header is in flow (sticky/relative) = a solid bar above the hero', () => {
    expect(headerPositionClass(false, true)).toContain('sticky')
    expect(headerPositionClass(false, false)).toContain('relative')
    expect(headerPositionClass(false, true)).not.toContain('fixed')
  })
})

describe('merged header — transparent overlay scheme at the top of the hero', () => {
  it('at the top (not scrolled), a transparent-dark default stays transparent + white text', () => {
    const scheme = resolveScheme('transparent-dark', 'light', false)
    expect(scheme).toBe('transparent-dark')
    // bg-transparent → the dark hero behind shows through (bg extends up).
    expect(schemeBg(scheme, false, false)).toBe('bg-transparent')
    // dark surface → white text/logo over the dark hero.
    expect(isDarkSurface(scheme)).toBe(true)
  })

  it('transparent-light default → transparent + dark text (light hero overlay)', () => {
    const scheme = resolveScheme('transparent-light', 'light', false)
    expect(schemeBg(scheme, false, false)).toBe('bg-transparent')
    expect(isDarkSurface(scheme)).toBe(false)
  })

  it('scrolled away from the hero → solid scheme (header gains a background)', () => {
    const scrolled = resolveScheme('transparent-dark', 'light', true)
    expect(scrolled).toBe('light')
    expect(schemeBg('light', true, false)).toContain('bg-background')
    // mobile (no hero behind the header) collapses the transparent scheme to solid.
    expect(solidScheme('transparent-dark')).toBe('dark')
  })
})

describe('merged header — contrast guardrail follows the EFFECTIVE hero scheme', () => {
  const darkHero: HeroSiteDefaults = {scheme: 'dark', bgImage: null, foreground: null, scrimOpacity: 80}
  const lightHero: HeroSiteDefaults = {scheme: 'light', bgImage: null, foreground: null, scrimOpacity: 80}

  it('dark hero → merged transparent header stays transparent-dark (white text)', () => {
    expect(resolveMergedHeaderScheme('transparent-dark', true, resolveHeroSurface(darkHero).isDark)).toBe('transparent-dark')
  })

  it('light hero → merged transparent header flips to transparent-light (dark text)', () => {
    expect(resolveMergedHeaderScheme('transparent-dark', true, resolveHeroSurface(lightHero).isDark)).toBe('transparent-light')
  })

  it('heroMerge OFF leaves the operator scheme untouched (no overlay coupling)', () => {
    expect(resolveMergedHeaderScheme('transparent-dark', false, true)).toBe('transparent-dark')
  })
})
