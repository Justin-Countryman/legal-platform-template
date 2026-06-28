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
  default: vi.fn(({src, alt, fill, priority, className, sizes, style}) => (
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
      style={style}
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
import {HeroSurfaceProvider, type HeroSurfaceDefaults} from '@/lib/heroSurfaceContext'
import {
  HERO_BAND_MIN_H_LG,
  HERO_BAND_BASE_MIN_H_LG,
  HERO_FOREGROUND_HEIGHT,
  HERO_FOREGROUND_MAX_WIDTH,
  HERO_FOREGROUND_GAP,
  HERO_FOREGROUND_RIGHT_INSET,
} from '@/lib/heroLayout'
import type {NapTokens} from '@/lib/tokens'

const BASE_DATA = {
  heading: 'Family Law Services',
  description: 'Compassionate guidance through difficult times.',
}

// Bare h1 — no description, no buttons.
const HEADING_ONLY = {heading: 'About Our Firm'}

const WITH_BUTTONS = {
  ...BASE_DATA,
  buttons: [
    {title: 'Schedule a call', url: '/contact', variant: 'primary' as const},
    {title: 'Learn more', url: '/about', variant: 'secondary' as const},
  ],
}

// A per-page background image — uploading overrides automatically (no mode flip).
const WITH_IMAGE = {
  ...BASE_DATA,
  backgroundImage: {
    src: '/hero.jpg',
    alt: 'Office exterior',
    width: 1920,
    height: 1080,
  },
}

const WITH_FOREGROUND = {
  ...BASE_DATA,
  foregroundImage: {
    src: '/attorney.png',
    alt: 'Attorney portrait',
    width: 800,
    height: 1200,
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

// ─── Vertical alignment (bare h1 centers; with content it stacks from top) ────

describe('InternalHero — vertical alignment', () => {
  // The content container (not the section) carries justify-center, so the
  // foreground figure (anchored to the container top, which fills the band)
  // stays at the band top regardless of how the heading is aligned.
  const contentContainer = (container: HTMLElement) =>
    (container.firstChild as HTMLElement).firstChild as HTMLElement

  it('a bare h1 (no description, no buttons) centers in a base-height band', () => {
    const {container} = render(<InternalHero data={HEADING_ONLY} />)
    const section = container.firstChild as HTMLElement
    // Band height on the section; centering on the (band-filling) container.
    expect(section.className).toContain(HERO_BAND_BASE_MIN_H_LG)
    expect(section.className).toContain('flex flex-col')
    const content = contentContainer(container)
    expect(content.className).toContain('grow')
    expect(content.className).toContain('justify-center')
    // No trailing margin under the lone h1 (keeps it optically centered).
    expect((container.querySelector('h1') as HTMLElement).className).not.toContain('mb-5')
  })

  it('a bare h1 WITH a foreground centers in the tall foreground band', () => {
    const {container} = render(<InternalHero data={{...HEADING_ONLY, foregroundImage: WITH_FOREGROUND.foregroundImage}} />)
    const section = container.firstChild as HTMLElement
    expect(section.className).toContain(HERO_BAND_MIN_H_LG)
    expect(section.className).not.toContain(HERO_BAND_BASE_MIN_H_LG)
    expect(contentContainer(container).className).toContain('justify-center')
  })

  it('a description present → top-aligned (no centering, no base band, h1 keeps its margin)', () => {
    const {container} = render(<InternalHero data={BASE_DATA} />)
    const section = container.firstChild as HTMLElement
    expect(section.className).not.toContain(HERO_BAND_BASE_MIN_H_LG)
    expect(contentContainer(container).className).not.toContain('justify-center')
    expect((container.querySelector('h1') as HTMLElement).className).toContain('mb-5')
  })

  it('buttons present (no description) → top-aligned (no centering)', () => {
    const {container} = render(<InternalHero data={{heading: 'X', buttons: WITH_BUTTONS.buttons}} />)
    expect(contentContainer(container).className).not.toContain('justify-center')
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

  it('renders a configurable scrim above the image (bg-brand-dark, default opacity 0.8)', () => {
    const {getByTestId} = render(<InternalHero data={WITH_IMAGE} />)
    const scrim = getByTestId('hero-scrim') as HTMLElement
    expect(scrim.className).toContain('bg-brand-dark')
    // Scrim opacity is now an inline style driven by the resolver (was hardcoded /80).
    expect(scrim.style.opacity).toBe('0.8')
  })

  it('honors a per-page scrimOpacityOverride on the scrim layer', () => {
    const {getByTestId} = render(
      <InternalHero data={{...WITH_IMAGE, scrimOpacityOverride: 40}} />,
    )
    expect((getByTestId('hero-scrim') as HTMLElement).style.opacity).toBe('0.4')
  })

  it('renders a tiled backdrop (no next/image) when custom fit is "tile"', () => {
    const {getByTestId, queryByTestId} = render(
      <InternalHero data={{...WITH_IMAGE, backgroundImage: {...WITH_IMAGE.backgroundImage, fit: 'tile'}}} />,
    )
    expect(getByTestId('hero-bg-tile')).not.toBeNull()
    expect(queryByTestId('hero-bg')).toBeNull()
  })

  it('renders a gradient scrim when scrimStyleOverride is "gradient"', () => {
    const {getByTestId} = render(<InternalHero data={{...WITH_IMAGE, scrimStyleOverride: 'gradient'}} />)
    const scrim = getByTestId('hero-scrim') as HTMLElement
    expect(scrim.style.backgroundImage).toContain('linear-gradient')
    expect(scrim.className).not.toContain('bg-brand-dark')
  })
})

// ─── Section background (textured ground behind a scheme-colored hero) ────────
const WITH_SECTION = {
  ...BASE_DATA,
  sectionBackgroundImage: {src: '/pattern.png', alt: 'Subtle pattern', width: 1200, height: 800, fit: 'cover' as const},
}

describe('InternalHero — section background', () => {
  it('renders the section backdrop + scrim when set and there is no focal image', () => {
    const {getByTestId} = render(<InternalHero data={WITH_SECTION} />)
    expect(getByTestId('hero-backdrop')).not.toBeNull()
    expect(getByTestId('hero-scrim')).not.toBeNull()
  })

  it('does not render a section backdrop when there is none', () => {
    const {queryByTestId} = render(<InternalHero data={BASE_DATA} />)
    expect(queryByTestId('hero-backdrop')).toBeNull()
  })

  it('a focal background image takes precedence over the section background', () => {
    // Both set → the focal image wins; the rendered backdrop image is /hero.jpg.
    const {getByTestId} = render(<InternalHero data={{...WITH_IMAGE, sectionBackgroundImage: WITH_SECTION.sectionBackgroundImage}} />)
    expect((getByTestId('hero-bg') as HTMLImageElement).getAttribute('src')).toBe('/hero.jpg')
  })
})

// ─── Foreground image (InternalHero only) ────────────────────────────────────
//
// Right-aligned, bottom-anchored subject that bleeds off the bottom, full color
// ABOVE the scrim (z-10). Two-column with the left text at lg+; hidden < lg so
// mobile is text-first. InternalPageHeader never renders one (covered there).

describe('InternalHero — foreground image', () => {
  it('renders the foreground wrapper + image when foregroundImage.src is present', () => {
    const {getByTestId} = render(<InternalHero data={WITH_FOREGROUND} />)
    const fg = getByTestId('hero-foreground') as HTMLElement
    const img = fg.querySelector('img') as HTMLImageElement
    expect(img.getAttribute('src')).toBe('/attorney.png')
    expect(img.getAttribute('alt')).toBe('Attorney portrait')
  })

  it('omits the foreground when foregroundImage is absent', () => {
    const {queryByTestId} = render(<InternalHero data={BASE_DATA} />)
    expect(queryByTestId('hero-foreground')).toBeNull()
  })

  it('is a box in the content container sized from the shared CSS vars, top-anchored, above the scrim (z-10), hidden below lg', () => {
    const {getByTestId} = render(<InternalHero data={WITH_FOREGROUND} />)
    const fg = getByTestId('hero-foreground') as HTMLElement
    expect(fg.className).toContain('absolute')
    expect(fg.className).toContain('top-0') // anchored to the band top (head near top)
    expect(fg.className).toContain('z-10')
    expect(fg.className).toContain('hidden')
    expect(fg.className).toContain('lg:block')
    // Box geometry comes from the shared vars (kept in sync with the heading reserve).
    expect(fg.style.width).toBe('var(--hero-fg-col)')
    expect(fg.style.height).toBe('var(--hero-fg-h)')
    expect(fg.style.right).toBe('var(--hero-fg-inset)')
    // The foreground lives INSIDE the content container (same frame as the heading).
    const container = fg.parentElement as HTMLElement
    expect(container.className).toContain('container')
    expect(container.style.getPropertyValue('--hero-fg-col')).toBe(HERO_FOREGROUND_MAX_WIDTH)
    expect(container.style.getPropertyValue('--hero-fg-h')).toBe(HERO_FOREGROUND_HEIGHT)
    expect(container.style.getPropertyValue('--hero-fg-gap')).toBe(HERO_FOREGROUND_GAP)
    expect(container.style.getPropertyValue('--hero-fg-inset')).toBe(HERO_FOREGROUND_RIGHT_INSET)
    // Image is contained + grounded bottom-right inside the box (aspect-robust).
    const img = fg.querySelector('img') as HTMLElement
    expect(img.className).toContain('object-contain')
    expect(img.className).toContain('object-right-bottom')
    expect(img.className).toContain('h-full')
    expect(img.className).toContain('w-full')
  })

  it('stays boxed (constant box vars) across aspect ratios (narrow / portrait / wide)', () => {
    const ASPECTS = [
      {label: 'narrow head-to-chest', width: 600, height: 640},
      {label: 'head-to-thigh (portrait)', width: 800, height: 1200},
      {label: 'wide full-body cut-out', width: 1600, height: 900},
    ]
    for (const a of ASPECTS) {
      const {getByTestId, unmount} = render(
        <InternalHero data={{...BASE_DATA, foregroundImage: {src: '/fg.png', alt: a.label, width: a.width, height: a.height}}} />,
      )
      const fg = getByTestId('hero-foreground') as HTMLElement
      const container = fg.parentElement as HTMLElement
      // Box dimensions are constant regardless of the uploaded aspect ratio —
      // the image can never exceed the box (no heading crowding / right overflow).
      expect(container.style.getPropertyValue('--hero-fg-col')).toBe(HERO_FOREGROUND_MAX_WIDTH)
      expect(container.style.getPropertyValue('--hero-fg-h')).toBe(HERO_FOREGROUND_HEIGHT)
      // Contained + grounded bottom-right, so tall→height-wins, wide→width-capped.
      const img = fg.querySelector('img') as HTMLElement
      expect(img.className).toContain('object-contain')
      expect(img.className).toContain('object-right-bottom')
      unmount()
    }
  })

  it('reserves the heading column so a long heading never slides under the foreground (zero overlap)', () => {
    const LONG = 'Comprehensive Estate Planning, Probate, and Trust Administration Services for Minnesota Families'
    const {getByTestId, getByRole} = render(
      <InternalHero data={{...BASE_DATA, heading: LONG, foregroundImage: WITH_FOREGROUND.foregroundImage}} />,
    )
    const fg = getByTestId('hero-foreground') as HTMLElement
    const container = fg.parentElement as HTMLElement
    // Heading column carries the reservation flag + sits in the same container
    // whose vars cap its max-width before the foreground zone (globals.css rule).
    const headingCol = getByRole('heading', {level: 1}).parentElement as HTMLElement
    expect(headingCol.hasAttribute('data-hero-heading-reserve')).toBe(true)
    expect(headingCol.parentElement).toBe(container) // heading + foreground are siblings (true two-column)
    expect(container.style.getPropertyValue('--hero-fg-col')).toBe(HERO_FOREGROUND_MAX_WIDTH)
    expect(container.style.getPropertyValue('--hero-fg-gap')).toBe(HERO_FOREGROUND_GAP)
  })

  it('does NOT reserve the heading column when there is no foreground', () => {
    const {getByRole} = render(<InternalHero data={BASE_DATA} />)
    const headingCol = getByRole('heading', {level: 1}).parentElement as HTMLElement
    expect(headingCol.hasAttribute('data-hero-heading-reserve')).toBe(false)
  })

  it('gives the section the band min-height (lg+) only when a foreground is present', () => {
    const withFg = render(<InternalHero data={WITH_FOREGROUND} />)
    expect((withFg.container.firstChild as HTMLElement).className).toContain(HERO_BAND_MIN_H_LG)
    // No foreground → no forced min-height.
    const noFg = render(<InternalHero data={BASE_DATA} />)
    expect((noFg.container.firstChild as HTMLElement).className).not.toContain(HERO_BAND_MIN_H_LG)
  })

  it('coexists with a background image (full-color subject over the scrim)', () => {
    const {getByTestId} = render(
      <InternalHero data={{...WITH_IMAGE, foregroundImage: WITH_FOREGROUND.foregroundImage}} />,
    )
    // Both layers present: backdrop+scrim AND the foreground subject.
    expect(getByTestId('hero-scrim')).not.toBeNull()
    expect(getByTestId('hero-foreground')).not.toBeNull()
  })

  it('enables overflow-hidden on the section so the subject bleeds off the bottom', () => {
    const {container} = render(<InternalHero data={WITH_FOREGROUND} />)
    expect((container.firstChild as HTMLElement).className).toContain('overflow-hidden')
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

  it('hasImage=false + scheme="light" → isDark=false (neutral bg-hero-tint, NOT bg-background/#fff or bg-muted)', () => {
    const {container} = render(
      <HeroSchemeProvider scheme="light">
        <InternalHero data={BASE_DATA} />
      </HeroSchemeProvider>,
    )
    const section = container.firstChild as HTMLElement
    // No override fires; data-ring-context omitted entirely.
    expect(section.hasAttribute('data-ring-context')).toBe(false)
    // Light-tint fix: neutral hero tint, not stark white, not the accent-tinted bg-muted.
    expect(section.className).toContain('bg-hero-tint')
    expect(section.className).not.toContain('bg-background')
    expect(section.className).not.toContain('bg-muted')
    expect(section.className).not.toContain('bg-brand-dark')
  })

  it('page schemeOverride="light" beats a dark site scheme (page > site)', () => {
    const {container} = render(
      <HeroSchemeProvider scheme="dark">
        <InternalHero data={{...BASE_DATA, schemeOverride: 'light'}} />
      </HeroSchemeProvider>,
    )
    const section = container.firstChild as HTMLElement
    expect(section.className).toContain('bg-hero-tint')
    expect(section.hasAttribute('data-ring-context')).toBe(false)
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

  it('drops an unknown key to nothing when napTokens is present (no {{key}} leak)', () => {
    const {container} = render(
      <InternalHero
        data={{...BASE_DATA, heading: 'Hello {{unknownKey}}'}}
        napTokens={NAP_TOKENS}
      />,
    )
    const h1 = container.querySelector('h1')?.textContent ?? ''
    expect(h1).not.toContain('{{')
    expect(h1).toContain('Hello')
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

// ─── Buttons cascade (site default → per-page override → "none" toggle) ───────
const SITE_DEFAULT_BTNS = [{title: 'Free Consultation', url: '/contact', variant: 'primary' as const}]

function surfaceValue(defaultButtons: HeroSurfaceDefaults['defaultButtons']): HeroSurfaceDefaults {
  return {bgImage: null, foreground: null, scrimOpacity: 80, scrimStyle: 'flat', sectionBg: null, defaultButtons}
}

function renderWithDefaultButtons(data: Parameters<typeof InternalHero>[0]['data'], defaultButtons = SITE_DEFAULT_BTNS) {
  return render(
    <HeroSurfaceProvider value={surfaceValue(defaultButtons)}>
      <InternalHero data={data} />
    </HeroSurfaceProvider>,
  )
}

describe('InternalHero — buttons cascade', () => {
  it('per-page buttons override the site default', () => {
    const {getByTestId, getAllByTestId} = renderWithDefaultButtons(WITH_BUTTONS)
    expect(getByTestId('button-group').getAttribute('data-item-count')).toBe('2')
    const titles = getAllByTestId('bg-item').map((s) => s.textContent)
    expect(titles).toEqual(['Schedule a call', 'Learn more'])
    expect(titles).not.toContain('Free Consultation')
  })

  it('no per-page buttons → the site default renders (unset falls through)', () => {
    const {getByTestId, getAllByTestId} = renderWithDefaultButtons({heading: 'X'})
    expect(getByTestId('button-group').getAttribute('data-item-count')).toBe('1')
    expect(getAllByTestId('bg-item').map((s) => s.textContent)).toEqual(['Free Consultation'])
  })

  it('"no buttons here" suppresses even when a default is set (explicit-none ≠ unset)', () => {
    const {queryByTestId} = renderWithDefaultButtons({heading: 'X', buttonsNone: true})
    expect(queryByTestId('button-group')).toBeNull()
  })

  it('with no per-page buttons AND no site default → nothing renders', () => {
    const {queryByTestId} = renderWithDefaultButtons({heading: 'X'}, [])
    expect(queryByTestId('button-group')).toBeNull()
  })
})
