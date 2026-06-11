import {describe, it, expect} from 'vitest'
import {footerSurface, footerLogo} from '../shared'

// The footer scheme contract: every layout flips dark↔light off footerSettings.
// footerScheme by swapping ONE surface (bg + ring-context) and deriving button
// context — the cascade-aware text utilities do the rest.

const DARK_LOGO = {src: '/dark.png', alt: 'd', width: 10, height: 10}
const LIGHT_LOGO = {src: '/light.png', alt: 'l', width: 10, height: 10}

describe('footerSurface — dark default, light opt-in', () => {
  it('undefined/null → dark (brand bg, ring-context dark, dark button context)', () => {
    for (const s of [undefined, null] as const) {
      const surface = footerSurface(s)
      expect(surface.footerClass).toContain('bg-brand-dark')
      expect(surface.ringContext).toBe('dark')
      expect(surface.buttonContext).toBe('dark')
    }
  })

  it("'dark' → brand surface", () => {
    expect(footerSurface('dark').footerClass).toContain('bg-brand-dark')
    expect(footerSurface('dark').ringContext).toBe('dark')
  })

  it("'light' → neutral hero-tint surface, NO ring-context, light button context", () => {
    const surface = footerSurface('light')
    expect(surface.footerClass).toContain('bg-hero-tint')
    expect(surface.footerClass).not.toContain('bg-brand-dark')
    // bg-muted is accent-tinted + eslint-banned in tint bands — must not be used.
    expect(surface.footerClass).not.toContain('bg-muted')
    expect(surface.ringContext).toBeUndefined()
    expect(surface.buttonContext).toBe('light')
  })
})

describe('footerLogo — scheme-appropriate mark with fallback', () => {
  it('light scheme prefers logoOnLight', () => {
    expect(footerLogo({logo: DARK_LOGO, logoLight: LIGHT_LOGO}, 'light')).toBe(LIGHT_LOGO)
  })
  it('dark scheme prefers logoOnDark', () => {
    expect(footerLogo({logo: DARK_LOGO, logoLight: LIGHT_LOGO}, 'dark')).toBe(DARK_LOGO)
  })
  it('falls back to the other logo when the preferred one is missing', () => {
    expect(footerLogo({logo: DARK_LOGO, logoLight: null}, 'light')).toBe(DARK_LOGO)
    expect(footerLogo({logo: null, logoLight: LIGHT_LOGO}, 'dark')).toBe(LIGHT_LOGO)
  })
  it('returns null when no logo is set', () => {
    expect(footerLogo({logo: null, logoLight: null}, 'dark')).toBeNull()
  })
})
