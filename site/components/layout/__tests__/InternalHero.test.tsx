import {describe, it, expect, vi} from 'vitest'
import {render} from '@testing-library/react'

// Multi-child composition (extends FormModal's 3-child mocking from Commit 3
// + TestimonialCard's per-mock data-attr capture from Commit 6):
//   - next/image — passthrough <img>
//   - ButtonGroup — passthrough capturing items + context
// lib/tokens is NOT mocked — resolveTokenString is integration-tested with
// real napTokens (same trust-platform-utilities posture as PortableText
// using real resolveToken in Commit 7).

vi.mock('next/image', () => ({
  default: vi.fn(({src, alt, fill, priority, className, sizes}) => (
    // The mock returns a plain <img>; we're isolating away next/image's
    // optimization layer which isn't this file's contract.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-testid="hero-bg"
      src={src}
      alt={alt ?? ''}
      data-fill={fill ? 'true' : 'false'}
      data-priority={priority ? 'true' : 'false'}
      data-sizes={sizes}
      className={className}
    />
  )),
}))

vi.mock('@/components/ui/ButtonGroup', () => ({
  ButtonGroup: vi.fn(({items, context, className}) => (
    <div
      data-testid="button-group"
      data-context={context}
      data-classname={className ?? ''}
      data-item-count={items?.length ?? 0}
    >
      {items?.map((item: {title: string}, i: number) => (
        <span key={i} data-testid="bg-item">{item.title}</span>
      ))}
    </div>
  )),
  toCtaItems: vi.fn((buttons) => buttons),
}))

import {InternalHero} from '../InternalHero'
import {HeroSchemeProvider} from '@/lib/heroSchemeContext'
import type {NapTokens} from '@/lib/tokens'

const BASE_DATA = {
  heading: 'Family Law Services',
  description: 'Compassionate guidance through difficult times.',
}

const WITH_BUTTONS = {
  ...BASE_DATA,
  buttons: [
    {title: 'Schedule a call', url: '/contact', variant: 'primary' as const},
    {title: 'Learn more', url: '/about', variant: 'secondary' as const},
  ],
}

const WITH_IMAGE = {
  ...BASE_DATA,
  backgroundImage: {
    src: '/hero.jpg',
    alt: 'Office exterior',
    width: 1920,
    height: 1080,
  },
}

const NAP_TOKENS: NapTokens = {
  firmName: 'Sample Firm',
  primaryPhone: '0800 555 0123',
}

// ─── Render shape ─────────────────────────────────────────────────────────────

describe('InternalHero — render shape', () => {
  it('renders a <section> as the root element', () => {
    const {container} = render(<InternalHero data={BASE_DATA} />)
    const root = container.firstChild as HTMLElement
    expect(root.tagName).toBe('SECTION')
  })

  it('renders an <h1> with the heading text', () => {
    const {container} = render(<InternalHero data={BASE_DATA} />)
    const h1 = container.querySelector('h1') as HTMLElement
    expect(h1.textContent).toBe('Family Law Services')
    expect(h1.className).toContain('text-foreground')
  })

  it('applies the inline padding-top style mirroring InternalPageHeader spacing', () => {
    const {container} = render(<InternalHero data={BASE_DATA} />)
    const section = container.firstChild as HTMLElement
    expect(section.style.paddingTop).toContain('calc(')
    expect(section.style.paddingTop).toContain('--header-height')
    expect(section.style.paddingTop).toContain('--hero-pt')
  })
})

// ─── Description rendering ────────────────────────────────────────────────────

describe('InternalHero — description', () => {
  it('renders the description <p> when provided', () => {
    const {container} = render(<InternalHero data={BASE_DATA} />)
    const p = container.querySelector('p')
    expect(p?.textContent).toBe('Compassionate guidance through difficult times.')
  })

  it('omits the description <p> when null', () => {
    const {container} = render(
      <InternalHero data={{heading: 'Only heading', description: null}} />,
    )
    expect(container.querySelector('p')).toBeNull()
  })
})

// ─── Button group composition (extends FormModal 3-child + PracticeAreaList iterative) ─

describe('InternalHero — button group composition', () => {
  it('renders <ButtonGroup> when buttons array is non-empty, forwarding items', () => {
    const {getByTestId, getAllByTestId} = render(<InternalHero data={WITH_BUTTONS} />)
    const group = getByTestId('button-group')
    expect(group.getAttribute('data-item-count')).toBe('2')
    const items = getAllByTestId('bg-item')
    expect(items[0].textContent).toBe('Schedule a call')
    expect(items[1].textContent).toBe('Learn more')
  })

  it('omits <ButtonGroup> when buttons is null', () => {
    const {queryByTestId} = render(<InternalHero data={BASE_DATA} />)
    expect(queryByTestId('button-group')).toBeNull()
  })

  it('omits <ButtonGroup> when buttons is an empty array', () => {
    const {queryByTestId} = render(
      <InternalHero data={{...BASE_DATA, buttons: []}} />,
    )
    expect(queryByTestId('button-group')).toBeNull()
  })
})

// ─── Background image composition ─────────────────────────────────────────────

describe('InternalHero — background image composition', () => {
  it('renders the <Image> background when backgroundImage.src is present', () => {
    const {getByTestId} = render(<InternalHero data={WITH_IMAGE} />)
    const img = getByTestId('hero-bg') as HTMLImageElement
    expect(img.getAttribute('src')).toBe('/hero.jpg')
    expect(img.getAttribute('alt')).toBe('Office exterior')
    expect(img.getAttribute('data-fill')).toBe('true')
    expect(img.getAttribute('data-priority')).toBe('true')
  })

  it('omits the <Image> + overlay when backgroundImage is null', () => {
    const {queryByTestId} = render(<InternalHero data={BASE_DATA} />)
    expect(queryByTestId('hero-bg')).toBeNull()
  })

  it('renders a darkening overlay div above the image (bg-brand-dark/80)', () => {
    const {container} = render(<InternalHero data={WITH_IMAGE} />)
    const overlay = container.querySelector('.absolute.inset-0 .absolute.inset-0') as HTMLElement
    expect(overlay).not.toBeNull()
    expect(overlay.className).toContain('bg-brand-dark/80')
  })
})

// ─── data-hero-image attribute (image-backed secondary Button signal) ────────
//
// The `data-hero-image="true"` ancestor attribute is the platform's signal
// that secondary Buttons inside the hero should render with the cream-on-dark
// treatment (cream border + cream text + translucent brand-dark fill) rather
// than the default action-color outline. Drives globals.css cascade rule:
//   [data-hero-image="true"] [data-variant="secondary"] { ... }
// Behavior is purely DOM-attribute-driven; the CSS rule itself is outside
// jsdom's render scope. The visual gate covers the rendered appearance.

describe('InternalHero — data-hero-image attribute', () => {
  it('sets data-hero-image="true" on the <section> when backgroundImage.src is truthy', () => {
    const {container} = render(<InternalHero data={WITH_IMAGE} />)
    const section = container.firstChild as HTMLElement
    expect(section.getAttribute('data-hero-image')).toBe('true')
  })

  it('omits the data-hero-image attribute when no background image is set', () => {
    const {container} = render(<InternalHero data={BASE_DATA} />)
    const section = container.firstChild as HTMLElement
    expect(section.hasAttribute('data-hero-image')).toBe(false)
  })
})

// ─── Scheme matrix (4-case: hasImage × scheme) — the key behavioral surface ───
//
// InternalHero's scheme integration is conditional consumption with a local
// override:
//   isDark = hasImage || globalScheme === 'dark'
//
// The override case (hasImage=true with scheme=light → still dark) is the
// critical assertion that the local override actually fires as designed.
// This is an EXTENSION of InternalPageHeader's pure-consumption useHeroScheme
// anchor — same hook, same provider, one additional axis (image presence).

describe('InternalHero — scheme matrix (hasImage × useHeroScheme)', () => {
  it('hasImage=true + scheme="dark" → isDark=true (consistent with provider)', () => {
    const {container} = render(
      <HeroSchemeProvider scheme="dark">
        <InternalHero data={WITH_IMAGE} />
      </HeroSchemeProvider>,
    )
    const section = container.firstChild as HTMLElement
    expect(section.getAttribute('data-ring-context')).toBe('dark')
    // When an image is present, the section omits any bg-* class (image+overlay
    // provide the surface).
    expect(section.className).not.toContain('bg-brand-dark')
    expect(section.className).not.toContain('bg-background')
  })

  it('hasImage=true + scheme="light" → isDark=true (override fires — the critical case)', () => {
    const {container} = render(
      <HeroSchemeProvider scheme="light">
        <InternalHero data={WITH_IMAGE} />
      </HeroSchemeProvider>,
    )
    const section = container.firstChild as HTMLElement
    // Override: image presence promotes scheme to dark regardless of provider value.
    expect(section.getAttribute('data-ring-context')).toBe('dark')
    expect(section.className).not.toContain('bg-background')
  })

  it('hasImage=false + scheme="dark" → isDark=true (consistent with provider, bg-brand-dark applied)', () => {
    const {container} = render(
      <HeroSchemeProvider scheme="dark">
        <InternalHero data={BASE_DATA} />
      </HeroSchemeProvider>,
    )
    const section = container.firstChild as HTMLElement
    expect(section.getAttribute('data-ring-context')).toBe('dark')
    expect(section.className).toContain('bg-brand-dark')
    expect(section.className).not.toContain('bg-background')
  })

  it('hasImage=false + scheme="light" → isDark=false (override absent, bg-background applied)', () => {
    const {container} = render(
      <HeroSchemeProvider scheme="light">
        <InternalHero data={BASE_DATA} />
      </HeroSchemeProvider>,
    )
    const section = container.firstChild as HTMLElement
    // No override fires; data-ring-context omitted entirely.
    expect(section.hasAttribute('data-ring-context')).toBe(false)
    expect(section.className).toContain('bg-background')
    expect(section.className).not.toContain('bg-brand-dark')
  })

  it('button-group context follows the resolved isDark (dark when image overrides light scheme)', () => {
    const {getByTestId} = render(
      <HeroSchemeProvider scheme="light">
        <InternalHero data={{...WITH_IMAGE, buttons: WITH_BUTTONS.buttons}} />
      </HeroSchemeProvider>,
    )
    expect(getByTestId('button-group').getAttribute('data-context')).toBe('dark')
  })
})

// ─── NAP-token resolution via resolveTokenString (extends PortableText anchor) ─
//
// PortableText (Commit 7) anchored single-key resolveToken via contentToken
// blocks. InternalHero extends to plain-string resolveTokenString — replaces
// every {{key}} match in heading / description / button.title. Same posture:
// don't mock lib/tokens; pass real napTokens; assert resolved output.

describe('InternalHero — resolveTokenString integration', () => {
  it('replaces {{key}} placeholders in the heading when napTokens is provided', () => {
    const {container} = render(
      <InternalHero
        data={{...BASE_DATA, heading: 'Welcome to {{firmName}}'}}
        napTokens={NAP_TOKENS}
      />,
    )
    expect(container.querySelector('h1')?.textContent).toBe('Welcome to Sample Firm')
  })

  it('replaces {{key}} placeholders in the description', () => {
    const {container} = render(
      <InternalHero
        data={{...BASE_DATA, description: 'Call us on {{primaryPhone}} today.'}}
        napTokens={NAP_TOKENS}
      />,
    )
    expect(container.querySelector('p')?.textContent).toBe('Call us on 0800 555 0123 today.')
  })

  it('replaces {{key}} placeholders inside button titles before forwarding to ButtonGroup', () => {
    const {getAllByTestId} = render(
      <InternalHero
        data={{
          ...BASE_DATA,
          buttons: [{title: 'Call {{firmName}}', url: '/contact', variant: 'primary'}],
        }}
        napTokens={NAP_TOKENS}
      />,
    )
    expect(getAllByTestId('bg-item')[0].textContent).toBe('Call Sample Firm')
  })

  it('leaves {{key}} placeholders intact when napTokens prop is absent', () => {
    const {container} = render(
      <InternalHero data={{...BASE_DATA, heading: 'Welcome to {{firmName}}'}} />,
    )
    // No napTokens → no resolution → literal placeholder survives.
    expect(container.querySelector('h1')?.textContent).toBe('Welcome to {{firmName}}')
  })

  it('falls back to the literal {{key}} placeholder when the key is unknown', () => {
    const {container} = render(
      <InternalHero
        data={{...BASE_DATA, heading: 'Hello {{unknownKey}}'}}
        napTokens={NAP_TOKENS}
      />,
    )
    expect(container.querySelector('h1')?.textContent).toBe('Hello {{unknownKey}}')
  })
})

// ─── Cascade-aware contract ───────────────────────────────────────────────────

describe('InternalHero — cascade-aware contract', () => {
  it('h1 + description use cascade-aware text-foreground', () => {
    const {container} = render(<InternalHero data={BASE_DATA} />)
    const h1 = container.querySelector('h1') as HTMLElement
    const p = container.querySelector('p') as HTMLElement
    expect(h1.className).toContain('text-foreground')
    expect(p.className).toContain('text-foreground')
  })

  it('does not emit anchored aliases or hex literals across the rendered tree', () => {
    const {container} = render(
      <HeroSchemeProvider scheme="dark">
        <InternalHero data={{...WITH_IMAGE, buttons: WITH_BUTTONS.buttons}} />
      </HeroSchemeProvider>,
    )
    const html = (container.firstChild as HTMLElement).outerHTML
    expect(html).not.toMatch(/\btext-foreground-on-light\b/)
    expect(html).not.toMatch(/\btext-foreground-on-dark\b/)
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })
})
