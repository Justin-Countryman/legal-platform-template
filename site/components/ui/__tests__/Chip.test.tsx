import {describe, it, expect} from 'vitest'
import {render} from '@testing-library/react'
import {Chip} from '../Chip'
import type {ChipIcon} from '../icons'

// ─── Render shape ─────────────────────────────────────────────────────────────

describe('Chip — render shape', () => {
  it('renders a <span> element as the root', () => {
    const {container} = render(<Chip icon="phone">555-1234</Chip>)
    const el = container.firstChild as HTMLElement
    expect(el.tagName).toBe('SPAN')
  })

  it('renders an <svg> icon child', () => {
    const {container} = render(<Chip icon="phone">555-1234</Chip>)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
  })

  it('renders children text verbatim', () => {
    const {container} = render(<Chip icon="phone">555-1234</Chip>)
    expect(container.textContent).toBe('555-1234')
  })

  it('renders icon BEFORE children in DOM order', () => {
    const {container} = render(<Chip icon="phone">555-1234</Chip>)
    const span = container.firstChild as HTMLElement
    // First child element of the span should be the SVG; text content follows.
    expect(span.firstElementChild?.tagName).toBe('svg')
  })
})

// ─── Icon prop ────────────────────────────────────────────────────────────────

describe('Chip — icon prop', () => {
  it('renders an svg for every supported icon value', () => {
    const icons: ChipIcon[] = [
      'calendar', 'clock', 'map-pin', 'phone', 'mail', 'video', 'link', 'users', 'bookmark',
    ]
    for (const icon of icons) {
      const {container, unmount} = render(<Chip icon={icon}>x</Chip>)
      expect(container.querySelector('svg')).not.toBeNull()
      unmount()
    }
  })

  it('produces visibly different SVG content for different icon values', () => {
    const {container: a, unmount: unmountA} = render(<Chip icon="calendar">x</Chip>)
    const calendarPaths = a.querySelectorAll('svg *').length
    const calendarHTML = a.querySelector('svg')?.innerHTML ?? ''
    unmountA()

    const {container: b} = render(<Chip icon="phone">x</Chip>)
    const phonePaths = b.querySelectorAll('svg *').length
    const phoneHTML = b.querySelector('svg')?.innerHTML ?? ''

    // Each icon component renders unique SVG path data; if the registry returned
    // the same component for both keys, this assertion would fail.
    expect(phoneHTML).not.toBe(calendarHTML)
    expect(phonePaths).toBeGreaterThan(0)
    expect(calendarPaths).toBeGreaterThan(0)
  })
})

// ─── className composition ────────────────────────────────────────────────────

describe('Chip — className composition', () => {
  it('emits all base utility classes on the span', () => {
    const {container} = render(<Chip icon="phone">x</Chip>)
    const el = container.firstChild as HTMLElement
    // Layout
    expect(el.className).toContain('inline-flex')
    expect(el.className).toContain('items-center')
    expect(el.className).toContain('gap-1.5')
    // Shape
    expect(el.className).toContain('rounded-ui')
    expect(el.className).toContain('border')
    // Spacing + typography
    expect(el.className).toContain('px-4')
    expect(el.className).toContain('py-1.5')
    expect(el.className).toContain('text-xs')
    // Cursor
    expect(el.className).toContain('cursor-default')
  })

  it('appends custom className after base classes', () => {
    const {container} = render(<Chip icon="phone" className="cursor-pointer">x</Chip>)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('cursor-pointer')
    // Base classes still present alongside the custom override.
    expect(el.className).toContain('inline-flex')
  })

  it('omits custom className when undefined', () => {
    const {container} = render(<Chip icon="phone">x</Chip>)
    const el = container.firstChild as HTMLElement
    // No trailing whitespace, no leftover undefined token.
    expect(el.className).not.toContain('undefined')
    expect(el.className).not.toMatch(/\s{2,}/)
  })

  it('omits custom className when empty string', () => {
    const {container} = render(<Chip icon="phone" className="">x</Chip>)
    const el = container.firstChild as HTMLElement
    expect(el.className).not.toMatch(/\s{2,}/)
  })
})

// ─── A11y semantics ───────────────────────────────────────────────────────────

describe('Chip — A11y semantics', () => {
  it('icon is aria-hidden (decorative; accessible name comes from children)', () => {
    const {container} = render(<Chip icon="phone">555-1234</Chip>)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
  })

  it("Chip's accessible name is the children text", () => {
    const {container} = render(<Chip icon="phone">555-1234</Chip>)
    // textContent is the platform's accessible-name source for non-interactive
    // spans; the aria-hidden icon contributes nothing.
    expect(container.textContent).toBe('555-1234')
  })
})

// ─── Cascade-aware contract (per-primitive adaptation) ────────────────────────
//
// Chip's cascade pattern differs from Tagline's: Chip emits cascade-aware tokens
// directly on its className (no wrapping utility class). The contract here
// asserts cascade-aware tokens ARE present on the primitive AND on the icon,
// AND that no anchored / hardcoded color tokens leak through.

describe('Chip — cascade-aware contract', () => {
  it('span uses cascade-aware text and border tokens', () => {
    const {container} = render(<Chip icon="phone">x</Chip>)
    const el = container.firstChild as HTMLElement
    // Cascade-aware: resolve correctly on dark surfaces via globals.css cascade rule.
    expect(el.className).toContain('text-foreground-muted')
    expect(el.className).toContain('border-border')
  })

  it('icon uses cascade-aware text-accent', () => {
    const {container} = render(<Chip icon="phone">x</Chip>)
    const svg = container.querySelector('svg') as SVGElement
    expect(svg.getAttribute('class')).toContain('text-accent')
  })

  it('does not emit anchored or hardcoded color tokens', () => {
    const {container} = render(<Chip icon="phone">x</Chip>)
    const el = container.firstChild as HTMLElement
    // Anchored aliases (these don't cascade — would render wrong on dark surfaces).
    expect(el.className).not.toMatch(/\btext-foreground-on-light\b/)
    expect(el.className).not.toMatch(/\btext-foreground-on-dark\b/)
    expect(el.className).not.toMatch(/\bborder-border-light\b/)
    expect(el.className).not.toMatch(/\bborder-on-dark\b/)
    // Hex literals (jsdom won't resolve cascade, but hardcoded hex would be a regression).
    expect(el.className).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })
})
