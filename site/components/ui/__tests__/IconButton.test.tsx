import {describe, it, expect} from 'vitest'
import {createRef} from 'react'
import {render} from '@testing-library/react'
import {IconButton} from '../IconButton'

// All <svg /> fixtures below are decorative icons paired with the IconButton's
// aria-label (the source of truth for screen readers). Add aria-hidden="true"
// on each to satisfy the platform/no-svg-without-aria-decision rule and to
// model real production usage.

// ─── Render shape ─────────────────────────────────────────────────────────────

describe('IconButton — render shape', () => {
  it('renders a <button> as the root', () => {
    const {container} = render(
      <IconButton icon={<svg data-testid="icon" aria-hidden="true" />} aria-label="Close" />,
    )
    const el = container.firstChild as HTMLElement
    expect(el.tagName).toBe('BUTTON')
  })

  it('renders the icon node inside the button', () => {
    const {container} = render(
      <IconButton icon={<svg data-testid="icon" aria-hidden="true" />} aria-label="Close" />,
    )
    expect(container.querySelector('[data-testid="icon"]')).not.toBeNull()
  })

  it('renders icon-only button (no <span> wrapper for label) when children is omitted', () => {
    const {container} = render(
      <IconButton icon={<svg data-testid="icon" aria-hidden="true" />} aria-label="Close" />,
    )
    const button = container.firstChild as HTMLElement
    // No label span; only the icon as a direct child.
    expect(button.querySelector('span')).toBeNull()
  })

  it('renders <span> for visible label BEFORE the icon when children is provided', () => {
    const {container} = render(
      <IconButton icon={<svg data-testid="icon" aria-hidden="true" />} aria-label="Close drawer">
        Close
      </IconButton>,
    )
    const button = container.firstChild as HTMLElement
    expect(button.firstElementChild?.tagName).toBe('SPAN')
    expect(button.firstElementChild?.textContent).toBe('Close')
  })
})

// ─── A11y — required aria-label ───────────────────────────────────────────────

describe('IconButton — A11y aria-label requirement', () => {
  it('applies aria-label on the button (required for icon-only buttons)', () => {
    const {container} = render(
      <IconButton icon={<svg aria-hidden="true" />} aria-label="Open menu" />,
    )
    const button = container.firstChild as HTMLElement
    expect(button.getAttribute('aria-label')).toBe('Open menu')
  })
})

// ─── surface prop ─────────────────────────────────────────────────────────────
//
// surface affects ONLY the focus-ring offset color (light = default white,
// dark = brand-dark offset to prevent white halo against dark scrim). Text
// color, hover bg, and ring color all auto-resolve via the cascade rule.

describe('IconButton — surface prop', () => {
  it('defaults to surface="light" (no explicit ring-offset-* class)', () => {
    const {container} = render(<IconButton icon={<svg aria-hidden="true" />} aria-label="x" />)
    const button = container.firstChild as HTMLElement
    expect(button.className).not.toContain('focus-visible:ring-offset-brand-dark')
  })

  it('applies focus-visible:ring-offset-brand-dark when surface="dark"', () => {
    const {container} = render(
      <IconButton icon={<svg aria-hidden="true" />} aria-label="x" surface="dark" />,
    )
    const button = container.firstChild as HTMLElement
    expect(button.className).toContain('focus-visible:ring-offset-brand-dark')
  })
})

// ─── disabled state ───────────────────────────────────────────────────────────

describe('IconButton — disabled state', () => {
  it('forwards disabled attribute and applies disabled-state classes', () => {
    const {container} = render(
      <IconButton icon={<svg aria-hidden="true" />} aria-label="x" disabled />,
    )
    const button = container.firstChild as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(button.className).toContain('opacity-40')
    expect(button.className).toContain('cursor-not-allowed')
    expect(button.className).toContain('pointer-events-none')
  })

  it('omits disabled-state classes when not disabled', () => {
    const {container} = render(<IconButton icon={<svg aria-hidden="true" />} aria-label="x" />)
    const button = container.firstChild as HTMLElement
    expect(button.className).not.toContain('opacity-40')
    expect(button.className).not.toContain('cursor-not-allowed')
  })
})

// ─── Focus-ring contract (per Input pattern) ──────────────────────────────────

describe('IconButton — focus-ring contract', () => {
  it('emits focus-visible ring classes', () => {
    const {container} = render(<IconButton icon={<svg aria-hidden="true" />} aria-label="x" />)
    const button = container.firstChild as HTMLElement
    expect(button.className).toContain('focus-visible:outline-none')
    expect(button.className).toContain('focus-visible:ring-2')
    expect(button.className).toContain('focus-visible:ring-focus')
    expect(button.className).toContain('focus-visible:ring-offset-2')
  })

  it('receives focus and becomes document.activeElement', () => {
    const {container} = render(<IconButton icon={<svg aria-hidden="true" />} aria-label="x" />)
    const button = container.firstChild as HTMLButtonElement
    button.focus()
    expect(document.activeElement).toBe(button)
  })
})

// ─── forwardRef ───────────────────────────────────────────────────────────────

describe('IconButton — forwardRef', () => {
  it('attaches the forwarded ref to the underlying <button> element', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<IconButton ref={ref} icon={<svg aria-hidden="true" />} aria-label="x" />)
    expect(ref.current).not.toBeNull()
    expect(ref.current?.tagName).toBe('BUTTON')
  })
})

// ─── Cascade-aware contract (direct-token primitive) ──────────────────────────

describe('IconButton — cascade-aware contract', () => {
  it('uses cascade-aware tokens; no anchored or hardcoded color tokens leak', () => {
    const {container} = render(<IconButton icon={<svg aria-hidden="true" />} aria-label="x" />)
    const button = container.firstChild as HTMLElement
    // Cascade-aware tokens — resolve correctly on dark surfaces via globals.css cascade rule.
    expect(button.className).toContain('text-foreground-muted')
    expect(button.className).toContain('hover:bg-hover-wash')
    expect(button.className).toContain('hover:text-foreground')
    expect(button.className).toContain('focus-visible:ring-focus')
    // No anchored aliases.
    expect(button.className).not.toMatch(/\btext-foreground-on-light\b/)
    expect(button.className).not.toMatch(/\btext-foreground-on-dark\b/)
    // No hex literals.
    expect(button.className).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })
})
