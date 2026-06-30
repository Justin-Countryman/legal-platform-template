import {describe, it, expect, vi} from 'vitest'
import {render} from '@testing-library/react'

vi.mock('next/image', () => ({
  default: vi.fn(({src, alt, fill, className, sizes}) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img data-testid="hero-bg" src={src} alt={alt ?? ''} data-fill={fill ? 'true' : 'false'} data-sizes={sizes} className={className} />
  )),
}))

import {InternalPageHeader} from '../InternalPageHeader'
import {HeroSchemeProvider} from '@/lib/heroSchemeContext'
import {HeroSurfaceProvider} from '@/lib/heroSurfaceContext'

// Trust-platform-utilities strategy (same posture as PortableText for next-
// sanity, DialogPanel for Radix): use the real HeroSchemeProvider rather than
// mocking the hook. The hook is a thin createContext + useContext wrapper
// (lib/heroSchemeContext.tsx), and the contract under test is "InternalPage-
// Header reacts correctly to whatever scheme its consumer provides."

// ─── Render shape ─────────────────────────────────────────────────────────────

describe('InternalPageHeader — render shape', () => {
  it('renders a <header> as the root element', () => {
    const {container} = render(<InternalPageHeader title="Family Law" />)
    const root = container.firstChild as HTMLElement
    expect(root.tagName).toBe('HEADER')
  })

  it('renders an <h1> with the title text and marketing-h1 utility class', () => {
    const {container} = render(<InternalPageHeader title="Family Law" />)
    const h1 = container.querySelector('h1') as HTMLElement
    expect(h1).not.toBeNull()
    expect(h1.textContent).toBe('Family Law')
    expect(h1.className).toContain('marketing-h1')
    expect(h1.className).toContain('font-bold')
  })

  it('applies the inline padding-top style that mirrors InternalHero spacing', () => {
    const {container} = render(<InternalPageHeader title="X" />)
    const header = container.firstChild as HTMLElement
    // The inline style uses CSS calc() with custom-property fallbacks.
    expect(header.style.paddingTop).toContain('calc(')
    expect(header.style.paddingTop).toContain('--header-height')
    expect(header.style.paddingTop).toContain('--hero-pt')
  })

  it('is always vertically centered (the fallback band is title-only)', () => {
    const {container} = render(<InternalPageHeader title="X" />)
    // Centering lives on the band-filling content container, not the section.
    const content = (container.firstChild as HTMLElement).firstChild as HTMLElement
    expect(content.className).toContain('grow')
    expect(content.className).toContain('justify-center')
  })
})

// ─── useHeroScheme hook integration (the new anchor pattern) ──────────────────
//
// Locked pattern for primitives that consume context via a custom hook: render
// twice — once without a provider (asserts default-context behavior) and once
// inside the provider with the matrix of scheme values. This mirrors a mini
// variant matrix scoped to context-driven dispatch.

describe('InternalPageHeader — useHeroScheme integration', () => {
  it('without a provider, falls back to the createContext default ("dark")', () => {
    const {container} = render(<InternalPageHeader title="X" />)
    const header = container.firstChild as HTMLElement
    // Default context value is 'dark' (per heroSchemeContext.tsx).
    expect(header.className).toContain('bg-brand-dark')
    expect(header.getAttribute('data-ring-context')).toBe('dark')
  })

  it('scheme="dark" via HeroSchemeProvider applies bg-brand-dark + data-ring-context="dark"', () => {
    const {container} = render(
      <HeroSchemeProvider scheme="dark">
        <InternalPageHeader title="X" />
      </HeroSchemeProvider>,
    )
    const header = container.firstChild as HTMLElement
    expect(header.className).toContain('bg-brand-dark')
    expect(header.className).not.toContain('bg-background')
    expect(header.getAttribute('data-ring-context')).toBe('dark')
  })

  it('scheme="light" via HeroSchemeProvider applies neutral bg-hero-tint + omits data-ring-context', () => {
    const {container} = render(
      <HeroSchemeProvider scheme="light">
        <InternalPageHeader title="X" />
      </HeroSchemeProvider>,
    )
    const header = container.firstChild as HTMLElement
    // Light-tint fix: neutral hero tint, NOT bg-background (#fff) or bg-muted (accent-tinted).
    expect(header.className).toContain('bg-hero-tint')
    expect(header.className).not.toContain('bg-background')
    expect(header.className).not.toContain('bg-muted')
    expect(header.className).not.toContain('bg-brand-dark')
    // Component renders data-ring-context only when isDark === true.
    expect(header.hasAttribute('data-ring-context')).toBe(false)
  })

  it('the scheme-driven className flips deterministically across providers in the same suite', () => {
    // Sanity check that one render does not pollute the next via shared
    // module-level state (the hook is purely context-driven).
    const dark = render(
      <HeroSchemeProvider scheme="dark">
        <InternalPageHeader title="A" />
      </HeroSchemeProvider>,
    )
    const light = render(
      <HeroSchemeProvider scheme="light">
        <InternalPageHeader title="B" />
      </HeroSchemeProvider>,
    )
    expect((dark.container.firstChild as HTMLElement).className).toContain('bg-brand-dark')
    expect((light.container.firstChild as HTMLElement).className).toContain('bg-hero-tint')
  })

  it('renders the shared site background image + scrim when provided via HeroSurfaceProvider', () => {
    const {getByTestId} = render(
      <HeroSchemeProvider scheme="light">
        <HeroSurfaceProvider value={{bgImage: {src: '/site-hero.jpg', alt: 'Skyline', fit: 'cover'}, foreground: null, scrimOpacity: 60, scrimStyle: 'flat', scrimColor: 'auto', scrimDirection: 'auto', sectionBg: null, defaultButtons: []}}>
          <InternalPageHeader title="X" />
        </HeroSurfaceProvider>
      </HeroSchemeProvider>,
    )
    // No-hero band inherits the site image — shared surface, no divergence.
    expect(getByTestId('hero-backdrop')).not.toBeNull()
    expect((getByTestId('hero-scrim') as HTMLElement).style.opacity).toBe('0.6')
  })

  it('renders the shared site FOREGROUND (two-column) on the no-hero band', () => {
    const {getByTestId} = render(
      <HeroSchemeProvider scheme="light">
        <HeroSurfaceProvider value={{bgImage: null, foreground: {src: '/partner.png', alt: 'Partner', width: 800, height: 1200}, scrimOpacity: 80, scrimStyle: 'flat', scrimColor: 'auto', scrimDirection: 'auto', sectionBg: null, defaultButtons: []}}>
          <InternalPageHeader title="X" />
        </HeroSurfaceProvider>
      </HeroSchemeProvider>,
    )
    const fg = getByTestId('hero-foreground') as HTMLElement
    expect(fg.className).toContain('hidden')
    expect(fg.className).toContain('lg:block')
    expect(fg.querySelector('img')?.getAttribute('src')).toBe('/partner.png')
  })

  it('omits the foreground on the band when no site foreground is set', () => {
    const {queryByTestId} = render(
      <HeroSchemeProvider scheme="light">
        <InternalPageHeader title="X" />
      </HeroSchemeProvider>,
    )
    expect(queryByTestId('hero-foreground')).toBeNull()
  })
})

// ─── Cascade-aware contract ───────────────────────────────────────────────────

describe('InternalPageHeader — cascade-aware contract', () => {
  it('h1 uses cascade-aware text-foreground (resolves correctly under either scheme)', () => {
    const {container} = render(
      <HeroSchemeProvider scheme="dark">
        <InternalPageHeader title="X" />
      </HeroSchemeProvider>,
    )
    const h1 = container.querySelector('h1') as HTMLElement
    expect(h1.className).toContain('text-foreground')
  })

  it('does not emit anchored aliases or hex literals', () => {
    const {container} = render(
      <HeroSchemeProvider scheme="light">
        <InternalPageHeader title="X" />
      </HeroSchemeProvider>,
    )
    const html = (container.firstChild as HTMLElement).outerHTML
    expect(html).not.toMatch(/\btext-foreground-on-light\b/)
    expect(html).not.toMatch(/\btext-foreground-on-dark\b/)
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })
})
