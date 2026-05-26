import {describe, it, expect} from 'vitest'
import {render} from '@testing-library/react'
import {TertiaryArrow} from '../TertiaryArrow'

// ─── Render shape ─────────────────────────────────────────────────────────────

describe('TertiaryArrow — render shape', () => {
  it('renders a <span> element', () => {
    const {container} = render(<TertiaryArrow />)
    const el = container.firstChild as HTMLElement
    expect(el.tagName).toBe('SPAN')
  })

  it('contains the right-arrow glyph "→"', () => {
    const {container} = render(<TertiaryArrow />)
    expect(container.textContent).toBe('→')
  })

  it('has aria-hidden="true" (decorative; not part of accessible name)', () => {
    const {container} = render(<TertiaryArrow />)
    const el = container.firstChild as HTMLElement
    expect(el.getAttribute('aria-hidden')).toBe('true')
  })
})

// ─── className composition ────────────────────────────────────────────────────

describe('TertiaryArrow — className composition', () => {
  it('emits base nudge-animation classes', () => {
    const {container} = render(<TertiaryArrow />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('inline-block')
    expect(el.className).toContain('transition-transform')
    expect(el.className).toContain('duration-ui-fast')
    expect(el.className).toContain('group-hover:translate-x-')
  })

  it('appends custom className', () => {
    const {container} = render(<TertiaryArrow className="ml-2" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('ml-2')
    // Base classes still present alongside the custom addition.
    expect(el.className).toContain('inline-block')
  })

  it('omits undefined custom className', () => {
    const {container} = render(<TertiaryArrow />)
    const el = container.firstChild as HTMLElement
    expect(el.className).not.toContain('undefined')
    expect(el.className).not.toMatch(/\s{2,}/)
  })
})

// ─── position prop (API-symmetric, behaviorally inert) ────────────────────────
//
// Per source comment at TertiaryArrow.tsx, the `position` prop is retained for
// API symmetry with Button's arrowPosition prop. The glyph and nudge direction
// are identical regardless — placement is the caller's responsibility. This
// test locks the no-op behavior.

describe('TertiaryArrow — position prop', () => {
  it('produces identical output for position="leading" and position="trailing"', () => {
    const {container: leading} = render(<TertiaryArrow position="leading" />)
    const {container: trailing} = render(<TertiaryArrow position="trailing" />)
    expect(leading.firstElementChild?.outerHTML).toBe(trailing.firstElementChild?.outerHTML)
  })
})

// ─── A11y semantics ───────────────────────────────────────────────────────────

describe('TertiaryArrow — A11y semantics', () => {
  it('contributes nothing to accessible name (aria-hidden + decorative glyph)', () => {
    // The arrow's textContent is "→" but aria-hidden removes it from the
    // accessibility tree. Consumers must provide their own accessible name
    // (e.g., the parent button's label).
    const {container} = render(<TertiaryArrow />)
    const el = container.firstChild as HTMLElement
    expect(el.getAttribute('aria-hidden')).toBe('true')
  })
})

// ─── Cascade-aware contract (currentColor inheritance) ────────────────────────
//
// TertiaryArrow uses currentColor inheritance — no color tokens on the
// primitive at all. Color comes from the parent's text-* utility (e.g.,
// Button's text-action-text). This is a third valid cascade pattern alongside
// Tagline's utility-class approach and Chip's direct-token approach.

describe('TertiaryArrow — cascade-aware contract', () => {
  it('does not emit any color tokens (relies on currentColor inheritance from parent)', () => {
    const {container} = render(<TertiaryArrow />)
    const el = container.firstChild as HTMLElement
    // No cascade-aware color tokens
    expect(el.className).not.toMatch(/\btext-foreground\b/)
    expect(el.className).not.toMatch(/\btext-foreground-muted\b/)
    expect(el.className).not.toMatch(/\btext-accent\b/)
    expect(el.className).not.toMatch(/\btext-action\b/)
    expect(el.className).not.toMatch(/\btext-action-text\b/)
    // No anchored aliases
    expect(el.className).not.toMatch(/\btext-foreground-on-light\b/)
    expect(el.className).not.toMatch(/\btext-foreground-on-dark\b/)
    // No hex literals
    expect(el.className).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })
})

// ─── glyph prop (WS-Sidebar Phase 2.5) ────────────────────────────────────────
//
// Added in Phase 2.5 to support `sidebarNavIconStyle: 'chevrons'`. Default
// `'arrow'` preserves the existing `→` glyph (regression-locked above);
// `'chevron'` swaps to an inline SVG chevron-right.

describe('TertiaryArrow — glyph prop', () => {
  it('default glyph is "arrow" — renders the `→` character', () => {
    const {container} = render(<TertiaryArrow />)
    expect(container.textContent).toBe('→')
    expect(container.querySelector('svg')).toBeNull()
  })

  it('glyph="arrow" matches the default render exactly', () => {
    const {container: a} = render(<TertiaryArrow />)
    const {container: b} = render(<TertiaryArrow glyph="arrow" />)
    expect(a.firstElementChild?.outerHTML).toBe(b.firstElementChild?.outerHTML)
  })

  it('glyph="chevron" renders an inline SVG (no `→` character)', () => {
    const {container} = render(<TertiaryArrow glyph="chevron" />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(container.textContent).not.toContain('→')
  })

  it('glyph="chevron" SVG uses currentColor stroke (cascade-aware contract preserved)', () => {
    const {container} = render(<TertiaryArrow glyph="chevron" />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('stroke')).toBe('currentColor')
    expect(svg?.getAttribute('fill')).toBe('none')
  })

  it('glyph="chevron" SVG is aria-hidden via the wrapper span (no double announcement)', () => {
    const {container} = render(<TertiaryArrow glyph="chevron" />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.getAttribute('aria-hidden')).toBe('true')
  })

  it('preserves the group-hover nudge animation regardless of glyph', () => {
    const {container: a} = render(<TertiaryArrow glyph="arrow" />)
    const {container: c} = render(<TertiaryArrow glyph="chevron" />)
    const arrowWrapper = a.firstChild as HTMLElement
    const chevronWrapper = c.firstChild as HTMLElement
    expect(arrowWrapper.className).toContain('group-hover:translate-x-')
    expect(chevronWrapper.className).toContain('group-hover:translate-x-')
  })
})
