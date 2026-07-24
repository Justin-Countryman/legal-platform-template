import {describe, it, expect} from 'vitest'
import {render} from '@testing-library/react'
import {StarRating} from '../StarRating'

// ─── Render shape ─────────────────────────────────────────────────────────────

describe('StarRating — render shape', () => {
  it('renders a flex wrapper <div> containing svg stars', () => {
    const {container} = render(<StarRating count={3} />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.tagName).toBe('DIV')
    expect(wrapper.className).toContain('flex')
    expect(wrapper.querySelectorAll('svg').length).toBeGreaterThan(0)
  })

  it('renders 5 stars by default (total prop omitted)', () => {
    const {container} = render(<StarRating count={3} />)
    expect(container.querySelectorAll('svg').length).toBe(5)
  })

  it('renders the requested total when total prop is provided', () => {
    const {container} = render(<StarRating count={2} total={10} />)
    expect(container.querySelectorAll('svg').length).toBe(10)
  })
})

// ─── Rating-semantics A11y dimension (the new anchor pattern) ─────────────────
//
// Locked pattern for rating semantics: a single accessible name on the wrapper
// communicates the rating ("N out of M stars"); the underlying star glyphs are
// decorative SVGs hidden from AT (aria-hidden). One announcement, no glyph
// noise. Transferable to any future rating-style widget.

describe('StarRating — rating-semantics A11y', () => {
  it('exposes the rating via aria-label on the wrapper ("N out of M stars")', () => {
    const {container} = render(<StarRating count={3} total={5} />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.getAttribute('aria-label')).toBe('3 out of 5 stars')
  })

  it('aria-label reflects the actual total when overridden', () => {
    const {container} = render(<StarRating count={7} total={10} />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.getAttribute('aria-label')).toBe('7 out of 10 stars')
  })

  it('every star <svg> is aria-hidden="true" (decorative — wrapper carries the announcement)', () => {
    const {container} = render(<StarRating count={3} total={5} />)
    const svgs = container.querySelectorAll('svg')
    svgs.forEach((svg) => expect(svg.getAttribute('aria-hidden')).toBe('true'))
  })

  it('handles count=0 (all empty) without breaking the announcement', () => {
    const {container} = render(<StarRating count={0} total={5} />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.getAttribute('aria-label')).toBe('0 out of 5 stars')
  })

  it('handles count=total (all filled) without breaking the announcement', () => {
    const {container} = render(<StarRating count={5} total={5} />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.getAttribute('aria-label')).toBe('5 out of 5 stars')
  })
})

// ─── Shape outline (WCAG SC 1.4.11 — OUTSTANDING item 13) ─────────────────────
//
// Filled stars carry the derived outline that makes the star SHAPE meet the
// 3:1 non-text contrast threshold; the fill stays the dedicated anchored
// star-fill token (stars-are-gold convention). Empty stars are unoutlined
// border-color glyphs. The outline's contrast guarantees are pinned in
// lib/__tests__/designTokens.test.ts (starOutline derivation); this block
// pins the component's wiring to those tokens.

describe('StarRating — SC 1.4.11 shape outline', () => {
  it('filled stars use text-star-fill (not raw text-action) and carry the outline stroke', () => {
    const {container} = render(<StarRating count={2} total={5} />)
    const svgs = Array.from(container.querySelectorAll('svg'))
    svgs.slice(0, 2).forEach((svg) => {
      expect(svg.classList.contains('text-star-fill')).toBe(true)
      expect(svg.classList.contains('text-action')).toBe(false)
      expect(svg.getAttribute('stroke')).toBe('var(--color-star-outline)')
      expect(svg.getAttribute('stroke-width')).toBe('1.5')
      expect(svg.getAttribute('stroke-linejoin')).toBe('round')
    })
  })

  it('empty stars stay unoutlined text-border glyphs', () => {
    const {container} = render(<StarRating count={2} total={5} />)
    const svgs = Array.from(container.querySelectorAll('svg'))
    svgs.slice(2).forEach((svg) => {
      expect(svg.classList.contains('text-border')).toBe(true)
      expect(svg.getAttribute('stroke')).toBeNull()
    })
  })
})

// ─── Size prop ────────────────────────────────────────────────────────────────

describe('StarRating — size prop', () => {
  it('defaults to size="sm" (h-4 w-4 stars, gap-0.5 wrapper)', () => {
    const {container} = render(<StarRating count={3} />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('gap-0.5')
    const firstSvg = container.querySelector('svg') as SVGElement
    expect(firstSvg.classList.contains('h-4')).toBe(true)
    expect(firstSvg.classList.contains('w-4')).toBe(true)
  })

  it('size="md" produces h-5 w-5 stars and gap-1 wrapper', () => {
    const {container} = render(<StarRating count={3} size="md" />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('gap-1')
    const firstSvg = container.querySelector('svg') as SVGElement
    expect(firstSvg.classList.contains('h-5')).toBe(true)
    expect(firstSvg.classList.contains('w-5')).toBe(true)
  })
})

// ─── className composition ────────────────────────────────────────────────────

describe('StarRating — className composition', () => {
  it('appends custom className to the wrapper', () => {
    const {container} = render(<StarRating count={3} className="my-class" />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('my-class')
    expect(wrapper.className).toContain('flex')  // base still present
  })
})

// ─── Token contract (filled vs empty colors) ──────────────────────────────────

describe('StarRating — token contract', () => {
  it('first `count` stars use anchored text-star-fill; remaining use text-border', () => {
    const {container} = render(<StarRating count={3} total={5} />)
    const svgs = container.querySelectorAll('svg')
    // Stars 0..2 filled, 3..4 empty.
    expect(svgs[0].classList.contains('text-star-fill')).toBe(true)
    expect(svgs[1].classList.contains('text-star-fill')).toBe(true)
    expect(svgs[2].classList.contains('text-star-fill')).toBe(true)
    expect(svgs[3].classList.contains('text-border')).toBe(true)
    expect(svgs[4].classList.contains('text-border')).toBe(true)
  })

  it('count=0 → all stars use text-border', () => {
    const {container} = render(<StarRating count={0} total={5} />)
    const svgs = container.querySelectorAll('svg')
    svgs.forEach((svg) => expect(svg.classList.contains('text-border')).toBe(true))
  })

  it('count=total → all stars use text-star-fill', () => {
    const {container} = render(<StarRating count={5} total={5} />)
    const svgs = container.querySelectorAll('svg')
    svgs.forEach((svg) => expect(svg.classList.contains('text-star-fill')).toBe(true))
  })

  it('does not emit anchored aliases or hex literals', () => {
    const {container} = render(<StarRating count={3} total={5} />)
    const wrapper = container.firstChild as HTMLElement
    const html = wrapper.outerHTML
    expect(html).not.toMatch(/\btext-foreground-on-light\b/)
    expect(html).not.toMatch(/\btext-foreground-on-dark\b/)
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })
})
