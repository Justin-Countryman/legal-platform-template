import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {render, fireEvent} from '@testing-library/react'
import {BackToTop} from '../BackToTop'

// Scroll-listener client behavior anchor:
// - Mock window.scrollY via Object.defineProperty so the component's scroll
//   handler reads a controlled value.
// - Dispatch fireEvent.scroll(window) to trigger the listener.
// - Spy on add/removeEventListener to verify mount/unmount cleanup.
//
// Standard jsdom + RTL infrastructure — no @testing-library/user-event or
// other new packages required.

const setScrollY = (y: number) => {
  Object.defineProperty(window, 'scrollY', {configurable: true, value: y})
}

beforeEach(() => {
  setScrollY(0)
})

afterEach(() => {
  setScrollY(0)
})

// ─── Render shape ─────────────────────────────────────────────────────────────

describe('BackToTop — render shape', () => {
  it('renders a <button> as the root element', () => {
    const {container} = render(<BackToTop />)
    const root = container.firstChild as HTMLElement
    expect(root.tagName).toBe('BUTTON')
  })

  it('button is discoverable via aria-label="Back to top"', () => {
    const {getByLabelText} = render(<BackToTop />)
    expect(getByLabelText('Back to top')).not.toBeNull()
  })

  it('contains a decorative chevron <svg> with aria-hidden="true"', () => {
    const {container} = render(<BackToTop />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
  })
})

// ─── Initial state (scrollY = 0 → invisible) ──────────────────────────────────

describe('BackToTop — initial state', () => {
  it('starts invisible (scrollY = 0 ≤ 400 threshold) with hide-state classes', () => {
    const {container} = render(<BackToTop />)
    const button = container.firstChild as HTMLElement
    expect(button.className).toContain('opacity-0')
    expect(button.className).toContain('translate-y-4')
    expect(button.className).toContain('pointer-events-none')
    expect(button.className).not.toContain('opacity-100')
  })

  it('starts inert (so AT and tab navigation skip it while hidden)', () => {
    const {container} = render(<BackToTop />)
    const button = container.firstChild as HTMLElement
    // React's `inert` attribute is reflected on the DOM node.
    expect(button.hasAttribute('inert')).toBe(true)
  })
})

// ─── Scroll-listener client behavior (the new anchor pattern) ─────────────────
//
// Locked pattern for scroll-driven primitives:
//   1. setScrollY(value) controls window.scrollY at the property level
//      (jsdom doesn't update scrollY in response to fireEvent.scroll alone).
//   2. fireEvent.scroll(window) triggers the registered listener.
//   3. Assert observable state changes (className / inert) — not the listener
//      reference itself.
// Plus mount/unmount lifecycle assertions via add/removeEventListener spies.

describe('BackToTop — scroll-listener client behavior', () => {
  it('shows when window.scrollY exceeds 400, hides when it drops back', () => {
    const {container} = render(<BackToTop />)
    const button = container.firstChild as HTMLElement

    setScrollY(500)
    fireEvent.scroll(window)
    expect(button.className).toContain('opacity-100')
    expect(button.className).toContain('translate-y-0')
    expect(button.className).not.toContain('opacity-0')
    expect(button.hasAttribute('inert')).toBe(false)

    setScrollY(100)
    fireEvent.scroll(window)
    expect(button.className).toContain('opacity-0')
    expect(button.className).toContain('translate-y-4')
    expect(button.hasAttribute('inert')).toBe(true)
  })

  it('uses 400 as the threshold (> 400 visible, ≤ 400 hidden)', () => {
    const {container} = render(<BackToTop />)
    const button = container.firstChild as HTMLElement

    setScrollY(400)
    fireEvent.scroll(window)
    expect(button.className).toContain('opacity-0')

    setScrollY(401)
    fireEvent.scroll(window)
    expect(button.className).toContain('opacity-100')
  })

  it('registers the scroll listener on mount and removes it on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    const {unmount} = render(<BackToTop />)

    const addedHandler = addSpy.mock.calls.find(([type]) => type === 'scroll')?.[1]
    expect(addedHandler).toBeTruthy()

    unmount()

    const removedHandler = removeSpy.mock.calls.find(([type]) => type === 'scroll')?.[1]
    expect(removedHandler).toBe(addedHandler)

    addSpy.mockRestore()
    removeSpy.mockRestore()
  })

  it('runs the threshold check once on mount (initial state reflects current window.scrollY)', () => {
    // If the user navigates to a page with scroll already past the threshold,
    // the button should appear immediately — not wait for the next scroll.
    setScrollY(500)
    const {container} = render(<BackToTop />)
    const button = container.firstChild as HTMLElement
    expect(button.className).toContain('opacity-100')
  })
})

// ─── Click behavior ───────────────────────────────────────────────────────────

describe('BackToTop — click behavior', () => {
  it('clicking the button invokes window.scrollTo with smooth behavior to top', () => {
    const scrollToSpy = vi.fn()
    // jsdom doesn't implement scrollTo with options; install a spy.
    Object.defineProperty(window, 'scrollTo', {configurable: true, value: scrollToSpy})

    const {container} = render(<BackToTop />)
    const button = container.firstChild as HTMLElement
    fireEvent.click(button)

    expect(scrollToSpy).toHaveBeenCalledWith({top: 0, behavior: 'smooth'})
  })
})

// ─── Cascade-aware contract ───────────────────────────────────────────────────

describe('BackToTop — cascade-aware contract', () => {
  it('uses platform tokens for surface/border/text and the cascade-aware focus-ring', () => {
    const {container} = render(<BackToTop />)
    const button = container.firstChild as HTMLElement
    expect(button.className).toContain('bg-background')
    expect(button.className).toContain('border-brand-dark')
    expect(button.className).toContain('text-brand-dark')
    expect(button.className).toContain('focus-visible:ring-focus')
  })

  it('does not emit anchored aliases or hex literals', () => {
    const {container} = render(<BackToTop />)
    const html = (container.firstChild as HTMLElement).outerHTML
    expect(html).not.toMatch(/\btext-foreground-on-light\b/)
    expect(html).not.toMatch(/\btext-foreground-on-dark\b/)
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })
})
