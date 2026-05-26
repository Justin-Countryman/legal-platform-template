import {describe, it, expect, vi} from 'vitest'
import {createRef, forwardRef} from 'react'
import {render, screen} from '@testing-library/react'

// next/link mock — refined from Button.test.tsx's passthrough variant to
// support ref forwarding. CardLink uses `<Link ref={ref} ... />`, so the
// mock must be a forwardRef component for the ref test to attach correctly.
// Future tests with forwardRef'd Next links can copy this shape.
vi.mock('next/link', () => ({
  // Inline forwardRef — vi.mock factories are hoisted, so we can't reference a
  // module-level variable here. displayName is purely a DevTools nicety and
  // doesn't affect test correctness, so the lint rule is disabled at this site.
  // eslint-disable-next-line react/display-name
  default: forwardRef<HTMLAnchorElement, {href: string; children: React.ReactNode; className?: string}>(
    ({href, children, ...rest}, ref) => (
      <a ref={ref} href={href} {...rest}>{children}</a>
    ),
  ),
}))

import {CardLink} from '../CardLink'

// ─── Render shape ─────────────────────────────────────────────────────────────

describe('CardLink — render shape', () => {
  it('renders an <a> (via the mocked next/link) as the root', () => {
    const {container} = render(<CardLink href="/about">card</CardLink>)
    const root = container.firstChild as HTMLElement
    expect(root.tagName).toBe('A')
  })

  it('forwards href to the underlying link', () => {
    render(<CardLink href="/practice-areas/family-law">card</CardLink>)
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/practice-areas/family-law')
  })

  it('renders children inside the link', () => {
    render(
      <CardLink href="/x">
        <span data-testid="inner">card body</span>
      </CardLink>,
    )
    expect(screen.getByTestId('inner').textContent).toBe('card body')
  })
})

// ─── forwardRef contract (extension of Input/Select pattern) ──────────────────

describe('CardLink — forwardRef', () => {
  it('attaches the forwarded ref to the underlying <a> element', () => {
    const ref = createRef<HTMLAnchorElement>()
    render(<CardLink ref={ref} href="/x">card</CardLink>)
    expect(ref.current).not.toBeNull()
    expect(ref.current?.tagName).toBe('A')
  })
})

// ─── Focus-ring contract (extension of Input's anchor pattern) ────────────────
//
// Copies Input.test.tsx's locked focus-ring contract verbatim:
//   1. Assert focus-visible:* classes present in className (intent, since
//      jsdom can't render focus pseudo-classes to actual rings).
//   2. Assert the element accepts focus and becomes document.activeElement.
//   3. Assert the cascade-aware ring-focus token is used (not anchored).

describe('CardLink — focus-ring contract', () => {
  it('emits focus-visible ring + offset classes', () => {
    render(<CardLink href="/x">card</CardLink>)
    const link = screen.getByRole('link')
    expect(link.className).toContain('focus-visible:outline-none')
    expect(link.className).toContain('focus-visible:ring-2')
    expect(link.className).toContain('focus-visible:ring-focus')
    expect(link.className).toContain('focus-visible:ring-offset-2')
  })

  it('receives focus and becomes document.activeElement', () => {
    render(<CardLink href="/x">card</CardLink>)
    const link = screen.getByRole('link') as HTMLAnchorElement
    link.focus()
    expect(document.activeElement).toBe(link)
  })
})

// ─── Native attribute pass-through ────────────────────────────────────────────

describe('CardLink — native attribute pass-through', () => {
  it('forwards aria-label to the underlying link', () => {
    render(<CardLink href="/x" aria-label="Read the family law page">card</CardLink>)
    const link = screen.getByRole('link')
    expect(link.getAttribute('aria-label')).toBe('Read the family law page')
  })

  it('forwards target via the rest spread', () => {
    render(<CardLink href="https://example.com" target="_blank">card</CardLink>)
    const link = screen.getByRole('link')
    expect(link.getAttribute('target')).toBe('_blank')
  })
})

// ─── className composition ────────────────────────────────────────────────────

describe('CardLink — className composition', () => {
  it('emits the BASE card-chrome classes', () => {
    render(<CardLink href="/x">card</CardLink>)
    const link = screen.getByRole('link')
    expect(link.className).toContain('block')
    expect(link.className).toContain('bg-background')
    expect(link.className).toContain('border-border')
    expect(link.className).toContain('rounded-ui')
    expect(link.className).toContain('shadow-card-rest')
  })

  it('appends custom className AFTER the base (Tailwind last-class-wins ordering)', () => {
    render(<CardLink href="/x" className="my-custom">card</CardLink>)
    const link = screen.getByRole('link')
    expect(link.className).toContain('my-custom')
    expect(link.className).toContain('rounded-ui')  // base still present
    expect(link.className.indexOf('my-custom')).toBeGreaterThan(
      link.className.indexOf('rounded-ui'),
    )
  })

  it('emits the `group` class so inner <TertiaryArrow> nudges on hover', () => {
    render(<CardLink href="/x">card</CardLink>)
    const link = screen.getByRole('link')
    expect(link.className).toContain('group')
  })

  it('emits hover-state chrome (shadow lift + border accent)', () => {
    render(<CardLink href="/x">card</CardLink>)
    const link = screen.getByRole('link')
    expect(link.className).toContain('hover:shadow-card-hover')
    expect(link.className).toContain('hover:card-lift')
    expect(link.className).toContain('hover:border-action')
  })
})

// ─── Cascade-aware contract (direct-token primitive) ──────────────────────────

describe('CardLink — cascade-aware contract', () => {
  it('uses cascade-aware tokens for surface, border, and focus ring', () => {
    render(<CardLink href="/x">card</CardLink>)
    const link = screen.getByRole('link')
    expect(link.className).toContain('bg-background')
    expect(link.className).toContain('border-border')
    expect(link.className).toContain('hover:border-action')
    expect(link.className).toContain('focus-visible:ring-focus')
  })

  it('does not emit anchored aliases or hex literals', () => {
    render(<CardLink href="/x">card</CardLink>)
    const link = screen.getByRole('link')
    const html = link.outerHTML
    expect(html).not.toMatch(/\btext-foreground-on-light\b/)
    expect(html).not.toMatch(/\btext-foreground-on-dark\b/)
    expect(html).not.toMatch(/\bborder-border-light\b/)
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })
})
