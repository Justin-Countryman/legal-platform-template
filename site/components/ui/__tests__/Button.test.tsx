import {describe, it, expect, vi} from 'vitest'
import {createRef, forwardRef, type Ref} from 'react'
import {render, screen} from '@testing-library/react'
import {Button} from '../Button'

// next/link is jsdom-friendly in recent Next versions, but mocking it to a
// passthrough <a> sidesteps router context the tests don't need.
// forwardRef variant per WS9.4 Commit 9 CardLink precedent — required so the
// Button forwardRef tests (below) can verify ref attachment through the
// internal-link branch (next/link is the underlying element on internal hrefs).
vi.mock('next/link', () => ({
  default: forwardRef(function MockLink(
    {href, children, ...rest}: {href: string; children: React.ReactNode},
    ref: Ref<HTMLAnchorElement>,
  ) {
    return <a ref={ref} href={href} {...rest}>{children}</a>
  }),
}))

// ─── Variant class strings ────────────────────────────────────────────────────

describe('Button — variant class strings', () => {
  it('primary.light renders bg-action and text-action-fg', () => {
    render(<Button variant="primary" context="light">Click</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-action')
    expect(btn.className).toContain('text-action-fg')
    expect(btn.className).toContain('hover:bg-action-hover')
    expect(btn.className).toContain('active:brightness-95')
  })

  it('primary.dark renders bg-background (white-fill flip) with cascade-reset text-foreground', () => {
    render(<Button variant="primary" context="dark">Click</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-background')
    expect(btn.className).toContain('text-foreground')
    // White-flip escape hatch: locally resets --color-foreground to the
    // on-light value so text reads dark even inside a dark cascade parent.
    expect(btn.className).toContain('[--color-foreground:var(--color-foreground-on-light)]')
    // Confirms the Phase 2 flip — primary.dark no longer uses bg-action.
    expect(btn.className).not.toContain('bg-action')
  })

  it('secondary.light renders border-action and cascade-aware text-action-text', () => {
    render(<Button variant="secondary" context="light">Click</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('border-action')
    // Post-WS5: cascade-aware text-action-text resolves to AA-safe action-on-light value here.
    expect(btn.className).toContain('text-action-text')
    // Hover fills to action color.
    expect(btn.className).toContain('hover:bg-action')
    expect(btn.className).toContain('hover:text-action-fg')
    // active:brightness-95 is symmetric on primary AND secondary as of Phase 2.
    expect(btn.className).toContain('active:brightness-95')
  })

  it('secondary.dark renders border-action and cascade-aware text-action-text', () => {
    render(<Button variant="secondary" context="dark">Click</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('border-action')
    // Post-WS5: cascade-aware text-action-text resolves to raw action color on dark surfaces.
    expect(btn.className).toContain('text-action-text')
    expect(btn.className).toContain('hover:bg-action')
    expect(btn.className).toContain('active:brightness-95')
  })

  it('tertiary does not include opacity-hover (removed in Phase 2)', () => {
    render(<Button variant="tertiary" context="light">Read more</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).not.toContain('hover:opacity-70')
    expect(btn.className).not.toContain('transition-opacity')
    // Tertiary still uses transition-colors (kept for future token-color hovers).
    expect(btn.className).toContain('transition-colors')
  })

  // Tertiary on light must use text-action-text (cascade-aware AA-safe
  // fallback) — vivid-accent palettes (e.g., a warm-accent) fail 4.5:1 contrast
  // on light surfaces with raw text-accent. Regression guard so this can't
  // silently revert again.
  it('tertiary.light renders text-action-text and never text-accent (AA contrast guard)', () => {
    render(<Button variant="tertiary" context="light">Read more</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('text-action-text')
    expect(btn.className).not.toContain('text-accent')
  })

  it('tertiary.dark renders text-action-text (cascade resolves to raw action color on dark)', () => {
    render(<Button variant="tertiary" context="dark">Read more</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('text-action-text')
    expect(btn.className).not.toContain('text-accent')
  })
})

// ─── Element-type dispatch ────────────────────────────────────────────────────

describe('Button — element-type dispatch', () => {
  it('href starting with https renders <a> with target+rel', () => {
    render(<Button href="https://example.com" target="_blank">Visit</Button>)
    const a = screen.getByRole('link')
    expect(a.tagName).toBe('A')
    expect(a.getAttribute('target')).toBe('_blank')
    expect(a.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('external href without explicit target auto-injects target="_blank" and rel="noopener noreferrer"', () => {
    render(<Button href="https://example.com">Visit</Button>)
    const a = screen.getByRole('link')
    expect(a.tagName).toBe('A')
    expect(a.getAttribute('target')).toBe('_blank')
    expect(a.getAttribute('rel')).toBe('noopener noreferrer')
  })

  // ── A11y bake-in: announce new-tab behavior on http(s) external links ─────
  // When the auto-target="_blank" injection fires, the button must also
  // announce "(opens in new tab)" to screen readers. Two branches:
  //   - no consumer aria-label → sr-only span suffix in children
  //     (lets React's accessible-name computation fold the suffix
  //      naturally into the button's text content)
  //   - consumer aria-label    → override aria-label with consumer's
  //     value + " (opens in new tab)" suffix appended
  //                              (ARIA name-computation prefers aria-label
  //                               over text content; sr-only span would be
  //                               ignored in that case)

  it('external http href without consumer aria-label appends sr-only "(opens in new tab)" suffix to children', () => {
    render(<Button href="https://example.com">Visit</Button>)
    const a = screen.getByRole('link')
    expect(a.getAttribute('aria-label')).toBeNull()
    const srOnly = a.querySelector('.sr-only')
    expect(srOnly?.textContent).toBe(' (opens in new tab)')
  })

  it('external http href WITH consumer aria-label overrides aria-label with suffix and omits the sr-only span', () => {
    render(
      <Button href="https://example.com" aria-label="View report">
        Visit
      </Button>,
    )
    const a = screen.getByRole('link')
    expect(a.getAttribute('aria-label')).toBe('View report (opens in new tab)')
    expect(a.querySelector('.sr-only')).toBeNull()
  })

  it('internal href does NOT inject aria-label and renders no sr-only "opens in new tab" suffix', () => {
    render(<Button href="/about">About</Button>)
    const link = screen.getByRole('link')
    expect(link.getAttribute('aria-label')).toBeNull()
    expect(link.querySelector('.sr-only')).toBeNull()
  })

  it('href starting with / renders Next.js Link (rendered as <a> after the mock)', () => {
    render(<Button href="/about">About</Button>)
    const link = screen.getByRole('link')
    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toBe('/about')
  })

  it('no href renders <button type="button"> by default', () => {
    render(<Button>Click</Button>)
    const btn = screen.getByRole('button')
    expect(btn.tagName).toBe('BUTTON')
    expect(btn.getAttribute('type')).toBe('button')
  })
})

// ─── New Phase 2 props ────────────────────────────────────────────────────────

describe('Button — new Phase 2 props', () => {
  it('fullWidth prop adds w-full class', () => {
    render(<Button fullWidth>Wide</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('w-full')
  })

  it('fullWidth + className="w-1/2" — className wins (last in joined string)', () => {
    render(<Button fullWidth className="w-1/2">Half</Button>)
    const btn = screen.getByRole('button')
    // Both classes present, but className appears later in the string per
    // Tailwind last-class-wins, so the consumer's w-1/2 takes effect at runtime.
    expect(btn.className).toContain('w-full')
    expect(btn.className).toContain('w-1/2')
    expect(btn.className.indexOf('w-1/2')).toBeGreaterThan(btn.className.indexOf('w-full'))
  })

  it('size="compact" produces px-5 py-2.5 text-sm', () => {
    render(<Button size="compact">Compact</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('px-5')
    expect(btn.className).toContain('py-2.5')
    expect(btn.className).toContain('text-sm')
  })

  it('size="small" produces px-4 py-1.5 text-xs', () => {
    render(<Button size="small">Small</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('px-4')
    expect(btn.className).toContain('py-1.5')
    expect(btn.className).toContain('text-xs')
  })

  it('arrowPosition="leading" puts arrow before label', () => {
    const {container} = render(
      <Button variant="tertiary" arrowPosition="leading">Back to list</Button>,
    )
    const html = container.innerHTML
    const arrowIndex = html.indexOf('→')
    const labelIndex = html.indexOf('Back to list')
    expect(arrowIndex).toBeGreaterThanOrEqual(0)
    expect(labelIndex).toBeGreaterThanOrEqual(0)
    expect(arrowIndex).toBeLessThan(labelIndex)
  })

  it('arrowPosition="trailing" (default) puts arrow after label', () => {
    const {container} = render(
      <Button variant="tertiary">Read more</Button>,
    )
    const html = container.innerHTML
    const arrowIndex = html.indexOf('→')
    const labelIndex = html.indexOf('Read more')
    expect(arrowIndex).toBeGreaterThan(labelIndex)
  })
})

// ─── noArrow + arrowGlyph (WS-Sidebar Phase 2.5 additive props) ───────────────
//
// Phase 2.5 added two opt-in props to Button. The first two tests in this
// block are regression locks — calling Button with the default props (no
// `noArrow`, no `arrowGlyph`) must render the existing TertiaryArrow exactly
// as before. This proves Option B (additive props) is purely additive.

describe('Button — noArrow + arrowGlyph (Phase 2.5)', () => {
  it('REGRESSION: default tertiary still renders the TertiaryArrow `→` glyph', () => {
    const {container} = render(<Button variant="tertiary">Read more</Button>)
    expect(container.textContent).toContain('→')
    expect(container.querySelector('svg')).toBeNull()
  })

  it('REGRESSION: default tertiary with arrowPosition="leading" places `→` before label', () => {
    const {container} = render(
      <Button variant="tertiary" arrowPosition="leading">Family Law</Button>,
    )
    const html = container.innerHTML
    expect(html.indexOf('→')).toBeLessThan(html.indexOf('Family Law'))
  })

  it('noArrow=true suppresses the TertiaryArrow entirely', () => {
    const {container} = render(
      <Button variant="tertiary" arrowPosition="leading" noArrow>
        Family Law
      </Button>,
    )
    expect(container.textContent).not.toContain('→')
    expect(container.querySelector('svg')).toBeNull()
    expect(container.textContent).toContain('Family Law')
  })

  it('noArrow=true works with trailing arrowPosition too (arrow simply not rendered)', () => {
    const {container} = render(
      <Button variant="tertiary" noArrow>
        Family Law
      </Button>,
    )
    expect(container.textContent).not.toContain('→')
    expect(container.textContent).toContain('Family Law')
  })

  it('arrowGlyph="chevron" renders the chevron SVG (not the `→` character)', () => {
    const {container} = render(
      <Button variant="tertiary" arrowPosition="leading" arrowGlyph="chevron">
        Family Law
      </Button>,
    )
    expect(container.querySelector('svg')).not.toBeNull()
    expect(container.textContent).not.toContain('→')
  })

  it('arrowGlyph="arrow" (default) renders the `→` character', () => {
    const {container} = render(
      <Button variant="tertiary" arrowPosition="leading" arrowGlyph="arrow">
        Family Law
      </Button>,
    )
    expect(container.textContent).toContain('→')
    expect(container.querySelector('svg')).toBeNull()
  })

  it('noArrow takes precedence over arrowGlyph (neither glyph renders)', () => {
    const {container} = render(
      <Button variant="tertiary" arrowGlyph="chevron" noArrow>
        Family Law
      </Button>,
    )
    expect(container.querySelector('svg')).toBeNull()
    expect(container.textContent).not.toContain('→')
  })

  it('noArrow is ignored on primary + secondary variants (only tertiary renders TertiaryArrow)', () => {
    // Primary / secondary never rendered TertiaryArrow in the first place,
    // so noArrow is a no-op for them. Confirm no regression.
    const {container: primary} = render(
      <Button variant="primary" noArrow>Click</Button>,
    )
    const {container: secondary} = render(
      <Button variant="secondary" noArrow>Click</Button>,
    )
    expect(primary.textContent).toBe('Click')
    expect(secondary.textContent).toBe('Click')
  })
})

// ─── Animation hookup ─────────────────────────────────────────────────────────

describe('Button — animation hookup', () => {
  it('primary renders data-button-animatable and data-variant', () => {
    render(<Button variant="primary">Click</Button>)
    const btn = screen.getByRole('button')
    expect(btn.getAttribute('data-button-animatable')).toBe('true')
    expect(btn.getAttribute('data-variant')).toBe('primary')
  })

  it('secondary renders data-button-animatable and data-variant', () => {
    render(<Button variant="secondary">Click</Button>)
    const btn = screen.getByRole('button')
    expect(btn.getAttribute('data-button-animatable')).toBe('true')
    expect(btn.getAttribute('data-variant')).toBe('secondary')
  })

  it('tertiary does NOT render data-button-animatable (excluded from animation modes)', () => {
    render(<Button variant="tertiary">Read more</Button>)
    const btn = screen.getByRole('button')
    expect(btn.getAttribute('data-button-animatable')).toBeNull()
  })
})

// ─── forwardRef ───────────────────────────────────────────────────────────────
//
// Button has 6 render branches across 2 variant families × 3 href shapes.
// The ref-attachment matrix covers the 3 distinct DOM endpoints:
//   - no-href     → <button> (HTMLButtonElement)
//   - external    → <a>       (HTMLAnchorElement)
//   - internal    → next/link → <a> via forwardRef mock (HTMLAnchorElement)
// Same DOM endpoint regardless of variant (primary/secondary/tertiary), so
// one test per endpoint suffices.

describe('Button — forwardRef', () => {
  it('attaches the forwarded ref to <button> when no href is set', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<Button ref={ref}>Click</Button>)
    expect(ref.current).not.toBeNull()
    expect(ref.current?.tagName).toBe('BUTTON')
  })

  it('attaches the forwarded ref to <a> on external href (mailto:)', () => {
    const ref = createRef<HTMLAnchorElement>()
    render(<Button ref={ref} href="mailto:hello@example.com">Email us</Button>)
    expect(ref.current).not.toBeNull()
    expect(ref.current?.tagName).toBe('A')
  })

  it('attaches the forwarded ref through next/link to <a> on internal href', () => {
    const ref = createRef<HTMLAnchorElement>()
    render(<Button ref={ref} href="/contact/">Contact</Button>)
    expect(ref.current).not.toBeNull()
    expect(ref.current?.tagName).toBe('A')
  })
})
