import {describe, it, expect} from 'vitest'
import {render} from '@testing-library/react'
import {SectionHeader, SECTION_HEADER_H2_CLASS, stripTrailingGap} from '../SectionHeader'

// ─── Render shape ─────────────────────────────────────────────────────────────

describe('SectionHeader — render shape', () => {
  it('renders a <div> root', () => {
    const {container} = render(<SectionHeader heading="x" />)
    const el = container.firstChild as HTMLElement
    expect(el.tagName).toBe('DIV')
  })

  it('renders the heading as an <h2>', () => {
    const {container} = render(<SectionHeader heading="My section" />)
    const h2 = container.querySelector('h2')
    expect(h2).not.toBeNull()
    expect(h2?.textContent).toBe('My section')
  })

  it('omits the Tagline when no tagline prop', () => {
    const {container} = render(<SectionHeader heading="x" />)
    // Tagline renders with the `tagline` utility class
    expect(container.querySelector('.tagline')).toBeNull()
  })

  it('renders Tagline as <p> when tagline prop present', () => {
    const {container} = render(<SectionHeader tagline="Eyebrow" heading="x" />)
    const tagline = container.querySelector('.tagline')
    expect(tagline).not.toBeNull()
    expect(tagline?.tagName).toBe('P')
    expect(tagline?.textContent).toBe('Eyebrow')
  })

  it('omits the description when no description prop', () => {
    const {container} = render(<SectionHeader heading="x" />)
    // Only the h2 — no sibling <p> for description
    expect(container.querySelector('div > p')).toBeNull()
  })

  it('renders description as <p> when description prop present', () => {
    const {container} = render(<SectionHeader heading="x" description="Body copy here." />)
    const ps = container.querySelectorAll('p')
    expect(ps.length).toBe(1)
    expect(ps[0].textContent).toBe('Body copy here.')
  })

  it('renders Tagline > h2 > description in DOM order', () => {
    const {container} = render(
      <SectionHeader tagline="t" heading="h" description="d" />
    )
    const wrapper = container.firstChild as HTMLElement
    const children = Array.from(wrapper.children)
    expect(children[0].tagName).toBe('P')
    expect(children[0].className).toContain('tagline')
    expect(children[1].tagName).toBe('H2')
    expect(children[2].tagName).toBe('P')
    expect(children[2].className).toContain('text-foreground-muted')
  })

  it('treats null tagline and description as absent', () => {
    const {container} = render(
      <SectionHeader heading="x" tagline={null} description={null} />
    )
    expect(container.querySelector('.tagline')).toBeNull()
    expect(container.querySelector('div > p')).toBeNull()
  })
})

// ─── Scale prop ───────────────────────────────────────────────────────────────

describe('SectionHeader — scale prop', () => {
  it('defaults to scale="md" (mb-4 + text-3xl md:text-4xl)', () => {
    const {container} = render(<SectionHeader heading="x" />)
    const h2 = container.querySelector('h2') as HTMLElement
    expect(h2.className).toBe(SECTION_HEADER_H2_CLASS.md)
    expect(h2.className).toContain('mb-4')
    expect(h2.className).toContain('text-3xl')
    expect(h2.className).toContain('md:text-4xl')
  })

  it('applies the lg tier classes when scale="lg"', () => {
    const {container} = render(<SectionHeader heading="x" scale="lg" />)
    const h2 = container.querySelector('h2') as HTMLElement
    expect(h2.className).toBe(SECTION_HEADER_H2_CLASS.lg)
    expect(h2.className).toContain('mb-5')
    expect(h2.className).toContain('lg:text-5xl')
  })

  it('applies the xl tier classes when scale="xl"', () => {
    const {container} = render(<SectionHeader heading="x" scale="xl" />)
    const h2 = container.querySelector('h2') as HTMLElement
    expect(h2.className).toBe(SECTION_HEADER_H2_CLASS.xl)
    expect(h2.className).toContain('text-4xl')
    expect(h2.className).toContain('md:mb-6')
    expect(h2.className).toContain('md:text-5xl')
    // xl caps at text-5xl (48px); the former lg:text-6xl (60px) overshot the
    // compressed display ceiling and is intentionally gone.
    expect(h2.className).not.toContain('lg:text-6xl')
  })

  it('h2 always carries the scale-paired mb-X (idempotent regardless of description presence)', () => {
    // The "h2 owns its trailing gap" convention from skill-typography:
    // mb-X stays on the h2 whether or not a description renders below.
    const withoutDesc = render(<SectionHeader heading="x" scale="md" />)
    const withDesc = render(<SectionHeader heading="x" description="d" scale="md" />)
    const h2A = withoutDesc.container.querySelector('h2') as HTMLElement
    const h2B = withDesc.container.querySelector('h2') as HTMLElement
    expect(h2A.className).toBe(h2B.className)
    expect(h2A.className).toContain('mb-4')
  })
})

// ─── noTrailingGap prop ───────────────────────────────────────────────────────
//
// Opt-in suppression of the h2's scale-paired trailing gap, for column-only
// headers (CtaSectionBlock TextOnlyCta) that place their own content beneath
// the header rather than below the description. Default off — the canonical
// gap is unchanged for every consumer that does not pass it.

describe('SectionHeader — noTrailingGap prop', () => {
  it('defaults to off — the h2 carries its canonical mb-X when the prop is absent', () => {
    const {container} = render(<SectionHeader heading="x" scale="lg" />)
    const h2 = container.querySelector('h2') as HTMLElement
    expect(h2.className).toBe(SECTION_HEADER_H2_CLASS.lg)
    expect(h2.className).toContain('mb-5')
  })

  it('is identical to the default when passed explicitly false', () => {
    const {container} = render(<SectionHeader heading="x" scale="lg" noTrailingGap={false} />)
    const h2 = container.querySelector('h2') as HTMLElement
    expect(h2.className).toBe(SECTION_HEADER_H2_CLASS.lg)
  })

  it('drops mb-5 from the lg tier and keeps the full type scale', () => {
    const {container} = render(<SectionHeader heading="x" scale="lg" noTrailingGap />)
    const h2 = container.querySelector('h2') as HTMLElement
    expect(h2.className).toBe('text-3xl font-bold text-foreground md:text-4xl lg:text-5xl')
    expect(h2.className).not.toContain('mb-')
  })

  it('drops mb-4 from the md tier', () => {
    const {container} = render(<SectionHeader heading="x" noTrailingGap />)
    const h2 = container.querySelector('h2') as HTMLElement
    expect(h2.className).toBe('text-3xl font-bold text-foreground md:text-4xl')
  })

  it('drops the responsive md:mb-6 as well as mb-5 from the xl tier', () => {
    // xl is the only tier carrying a breakpoint-prefixed margin — a naive
    // `mb-X` strip would leave md:mb-6 behind and the gap would survive at md+.
    const {container} = render(<SectionHeader heading="x" scale="xl" noTrailingGap />)
    const h2 = container.querySelector('h2') as HTMLElement
    expect(h2.className).toBe('text-4xl font-bold text-foreground md:text-5xl')
    expect(h2.className).not.toContain('mb-5')
    expect(h2.className).not.toContain('md:mb-6')
  })

  it('leaves the canonical tier table itself untouched', () => {
    // The prop derives a variant; it must not mutate the shared lookup map.
    render(<SectionHeader heading="x" scale="lg" noTrailingGap />)
    expect(SECTION_HEADER_H2_CLASS.md).toContain('mb-4')
    expect(SECTION_HEADER_H2_CLASS.lg).toContain('mb-5')
    expect(SECTION_HEADER_H2_CLASS.xl).toContain('mb-5')
    expect(SECTION_HEADER_H2_CLASS.xl).toContain('md:mb-6')
  })

  it('changes nothing outside the h2 — wrapper, tagline and description are unaffected', () => {
    const withGap = render(
      <SectionHeader tagline="t" heading="h" description="d" scale="lg" className="max-w-lg" />
    )
    const without = render(
      <SectionHeader tagline="t" heading="h" description="d" scale="lg" className="max-w-lg" noTrailingGap />
    )
    const wrapperA = withGap.container.firstChild as HTMLElement
    const wrapperB = without.container.firstChild as HTMLElement
    expect(wrapperA.className).toBe(wrapperB.className)
    expect(wrapperA.querySelector('.tagline')?.className)
      .toBe(wrapperB.querySelector('.tagline')?.className)
    const descA = wrapperA.querySelectorAll('p')[1] as HTMLElement
    const descB = wrapperB.querySelectorAll('p')[1] as HTMLElement
    expect(descA.className).toBe(descB.className)
  })

  it('stripTrailingGap removes only margin-bottom tokens, preserving order', () => {
    expect(stripTrailingGap('mb-5 text-3xl md:mb-6 md:text-4xl')).toBe('text-3xl md:text-4xl')
    // Sibling spacing utilities that merely start with `m` are not margin-bottom.
    expect(stripTrailingGap('mx-auto mt-4 mb-2 max-w-2xl')).toBe('mx-auto mt-4 max-w-2xl')
    expect(stripTrailingGap('text-3xl font-bold')).toBe('text-3xl font-bold')
  })
})

// ─── Alignment prop ───────────────────────────────────────────────────────────

describe('SectionHeader — alignment prop', () => {
  it('defaults to alignment="center" (wrapper has text-center)', () => {
    const {container} = render(<SectionHeader heading="x" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('text-center')
  })

  it('omits text-center when alignment="left"', () => {
    const {container} = render(<SectionHeader heading="x" alignment="left" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).not.toContain('text-center')
  })
})

// ─── className composition ────────────────────────────────────────────────────

describe('SectionHeader — className composition', () => {
  it('appends custom className to the wrapper after the alignment class', () => {
    const {container} = render(
      <SectionHeader heading="x" className="mx-auto max-w-2xl mb-12" />
    )
    const el = container.firstChild as HTMLElement
    expect(el.className).toBe('text-center mx-auto max-w-2xl mb-12')
  })

  it('emits only custom className (no alignment class) when alignment="left"', () => {
    const {container} = render(
      <SectionHeader heading="x" alignment="left" className="max-w-lg" />
    )
    const el = container.firstChild as HTMLElement
    expect(el.className).toBe('max-w-lg')
  })

  it('does not leak custom className onto the h2 or description', () => {
    const {container} = render(
      <SectionHeader
        heading="x"
        description="d"
        className="custom-wrapper-class"
      />
    )
    const h2 = container.querySelector('h2') as HTMLElement
    const desc = container.querySelectorAll('p')[0] as HTMLElement
    expect(h2.className).not.toContain('custom-wrapper-class')
    expect(desc.className).not.toContain('custom-wrapper-class')
  })

  it('emits no className attribute when alignment="left" and no className prop', () => {
    const {container} = render(<SectionHeader heading="x" alignment="left" />)
    const el = container.firstChild as HTMLElement
    // No alignment class, no custom class — wrapper has no className attribute
    expect(el.hasAttribute('class')).toBe(false)
  })
})

// ─── Cascade-aware + design-system contract ───────────────────────────────────
//
// SectionHeader emits cascade-aware tokens (text-foreground, text-foreground-muted)
// so the same component renders correctly on light and dark surfaces. Raw color
// tokens (anchored on-light / on-dark, hex literals) must NOT appear — that
// would bypass the cascade rule.

describe('SectionHeader — cascade-aware + design-system contract', () => {
  it('h2 uses text-foreground (cascade-aware) — never an anchored or hex color', () => {
    const {container} = render(<SectionHeader heading="x" />)
    const h2 = container.querySelector('h2') as HTMLElement
    expect(h2.className).toContain('text-foreground')
    expect(h2.className).not.toMatch(/\btext-foreground-on-light\b/)
    expect(h2.className).not.toMatch(/\btext-foreground-on-dark\b/)
    expect(h2.className).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })

  it('description uses text-foreground-muted (cascade-aware) — never an anchored variant', () => {
    const {container} = render(<SectionHeader heading="x" description="d" />)
    const desc = container.querySelectorAll('p')[0] as HTMLElement
    expect(desc.className).toBe('text-foreground-muted')
    expect(desc.className).not.toMatch(/\btext-foreground-muted-on-light\b/)
    expect(desc.className).not.toMatch(/\btext-foreground-muted-on-dark\b/)
  })

  it('does not emit raw color tokens (hex / on-light / on-dark) on any element', () => {
    const {container} = render(
      <SectionHeader tagline="t" heading="h" description="d" />
    )
    const html = container.innerHTML
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}/)
    expect(html).not.toMatch(/text-foreground-on-light/)
    expect(html).not.toMatch(/text-foreground-on-dark/)
    expect(html).not.toMatch(/\bbg-white\b/)
    expect(html).not.toMatch(/\bbg-black\b/)
  })

  it('consumes the Tagline primitive (rendered tagline carries the `tagline` utility class)', () => {
    // SectionHeader does not re-implement tagline visuals — it consumes the
    // canonical primitive. The `tagline` utility class is the assertion that
    // the Tagline component (not a hand-rolled span) produced this output.
    const {container} = render(<SectionHeader tagline="Eyebrow" heading="x" />)
    const tagline = container.querySelector('.tagline')
    expect(tagline).not.toBeNull()
    expect(tagline?.tagName).toBe('P')
  })
})
